import express from "express";
import type { InboundWebhookPayload, InboundWebhookEmail } from "inbnd";
import { Inbound } from "inbnd";
import { generateObject } from "ai";
import { z } from "zod";
import { waitUntil } from "@vercel/functions";
import { openai } from "@ai-sdk/openai";

const app = express();
const port = process.env.PORT || 3000;
const inbound = new Inbound(process.env.INBOUND_API_KEY!, "http://localhost:3000/api/v2");
const fromEmail = "Analysis Agent <analysis@inbound.new>";

// Functions for analysis and response.

async function analyzeEmail(email: InboundWebhookEmail) {
  const agentAnalysisPayload = {
    to: email.to?.addresses,
    from: email.from?.addresses,
    subject: email.subject,
    rawEmailContent: email.parsedData.raw || "",
    headers: email.parsedData.headers,
  };

  const agentAnalysisResponse = await generateObject({
    model: openai("gpt-5"),
    schema: z.object({
      detail_analysis: z
        .string()
        .describe(
          "A detailed analysis of the email content. A summary analysis of the email content, make sure you lay this out correctly."
        ),
      summary_analysis: z
        .string()
        .describe(
          "A summary analysis of the email content, make sure you lay this out correctly with spacing. Make sure this is personalized to " +
            email.from?.addresses?.[0]?.name || "the user"
        ),
      safety_rating: z
        .number()
        .describe("A rating from 1 to 100 of how safe the email is."),
      summarize_forwared_email_title: z
        .string()
        .describe("A summary of the forwarded email title. (3-4 words)"),
      dangerous: z.boolean().describe("Whether the email is dangerous or not."),
    }),
    prompt: `You are an email analysis agent, I have provided you with an email that has 
    been forwarded to you from ${email.from?.addresses?.[0]?.address} / ${
      email.from?.addresses?.[0]?.name
    }.
    Please analyze the email and provide a detailed analysis of the content. The analysis should be in the following format:
    - detail_analysis: A detailed analysis of the email content.
    - summary_analysis: A summary analysis of the email content.
    - safety_rating: A rating from 1 to 100 of how safe the email is.
    - summarize_forwared_email_title: A summary of the forwarded email title. (3-4 words)
    - dangerous: Whether the email is dangerous or not.

    Here is the email content:
    ${JSON.stringify(agentAnalysisPayload)}`,
  });

  const response = `

  Hi ${email.from?.addresses?.[0]?.name || "there"},
  <br /><br />
  ${
    agentAnalysisResponse.object.dangerous
      ? "WARNING: This email is dangerous. Please be careful, read more below."
      : ""
  }
  <br />
  I would rate this email a ${
    agentAnalysisResponse.object.safety_rating
  } out of 100 for safety.
  <br />
  ${agentAnalysisResponse.object.summary_analysis}

  `;

  const subject = `Re: Report of ${
    agentAnalysisResponse.object.summarize_forwared_email_title
  } from ${email.from?.addresses?.[0]?.name || "you"}`;

  console.log("Sending reply to", email.id, "with subject", subject);

  const { data, error } = await inbound.email.sent.reply(
    email.id,
    {
      from: fromEmail,
      html: response,
      text: response,
      subject: subject,
    },
    {
      idempotencyKey: "reply-analysis-agent-" + email.messageId,
    }
  );

  return { data, error };
}

app.use(express.json());
app.use(express.json({ limit: "10mb" })); // the standard inbound webhook could be larger than 1mb, so we need to set a limit

app.get("/", (req, res) => {
  res.redirect("https://inbound.new");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.post("/api/inbound", async (req, res) => {
  const { email } = req.body as InboundWebhookPayload;
  console.log(
    "Received email from",
    email.from?.addresses?.[0]?.name || email.from?.addresses?.[0]?.address
  );

  waitUntil(analyzeEmail(email));

  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
