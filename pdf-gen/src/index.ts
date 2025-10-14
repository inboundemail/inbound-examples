import { Hono } from "hono";
import type { InboundWebhookPayload } from "inbnd";
import { Inbound } from "inbnd";

// Define environment variables type for Cloudflare Workers
type Bindings = {
  INBOUND_API_KEY: string;
  BROWSERLESS_TOKEN: string;
};

const app = new Hono<{ Bindings: Bindings }>();

interface PDFOptions {
  displayHeaderFooter?: boolean;
  printBackground?: boolean;
  format?: string;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  landscape?: boolean;
  scale?: number;
}

/**
 * Removes forwarded message headers and quoted content from HTML emails
 * Supports Gmail, Outlook, Apple Mail, Yahoo, Thunderbird, and other common email clients
 * @param html - The HTML email content
 * @returns Cleaned HTML with forwarded content removed
 */
function removeForwardedContent(html: string): string {
  let cleaned = html;

  // Gmail: Remove gmail_quote and gmail_quote_container divs
  cleaned = cleaned.replace(
    /<div[^>]*class="[^"]*gmail_quote[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    ''
  );

  // Gmail: Remove individual gmail_attr divs (forwarded message header)
  cleaned = cleaned.replace(
    /<div[^>]*class="[^"]*gmail_attr[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    ''
  );

  // Yahoo Mail: Remove yahoo_quoted divs
  cleaned = cleaned.replace(
    /<div[^>]*class="[^"]*yahoo_quoted[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    ''
  );

  // Outlook: Remove OutlookMessageHeader
  cleaned = cleaned.replace(
    /<div[^>]*class="[^"]*OutlookMessageHeader[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    ''
  );

  // Thunderbird: Remove moz-cite-prefix
  cleaned = cleaned.replace(
    /<div[^>]*class="[^"]*moz-cite-prefix[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    ''
  );

  // Generic: Remove blockquote elements (used by many email clients for quotes)
  cleaned = cleaned.replace(
    /<blockquote[^>]*>[\s\S]*?<\/blockquote>/gi,
    ''
  );

  // Remove divs with "quote" in the class name
  cleaned = cleaned.replace(
    /<div[^>]*class="[^"]*quote[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    ''
  );

  // Remove divs with "forward" in the class name
  cleaned = cleaned.replace(
    /<div[^>]*class="[^"]*forward[^"]*"[^>]*>[\s\S]*?<\/div>/gi,
    ''
  );

  // Remove common forwarded message text patterns
  cleaned = cleaned.replace(
    /[-]{5,}\s*Forwarded\s+message\s*[-]{5,}/gi,
    ''
  );

  // Remove "From: ... Sent: ... To: ... Subject:" pattern (Outlook style)
  cleaned = cleaned.replace(
    /From:[\s\S]*?Sent:[\s\S]*?To:[\s\S]*?Subject:[\s\S]*?(?=<)/gi,
    ''
  );

  // Remove "-----Original Message-----" (Outlook)
  cleaned = cleaned.replace(
    /[-]{5,}\s*Original\s+Message\s*[-]{5,}/gi,
    ''
  );

  // Remove "On ... wrote:" pattern
  cleaned = cleaned.replace(
    /On\s+.+?\s+wrote:/gi,
    ''
  );

  // Clean up empty divs and extra whitespace
  cleaned = cleaned.replace(/<div[^>]*>\s*<\/div>/gi, '');
  cleaned = cleaned.replace(/<p[^>]*>\s*<\/p>/gi, '');
  cleaned = cleaned.replace(/\s{2,}/g, ' ');
  cleaned = cleaned.replace(/>\s+</g, '><');

  return cleaned.trim();
}

/**
 * Adds an Inbound branding banner to the bottom of HTML content
 * @param html - The HTML content to add banner to
 * @returns HTML with banner appended
 */
function addInboundBanner(html: string): string {
  const banner = `
    <div style="margin-top: 40px; padding: 20px; border-top: 2px solid #e5e7eb; text-align: center; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
      <div style="display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
        <span style="color: #6b7280; font-size: 14px;">generated via inbound.new</span>
        <img src="https://inbound.new/inbound-logo-png.png" alt="Inbound" style="height: 20px; width: 20px; vertical-align: middle;" />
      </div>
    </div>
  `;

  // If HTML has a closing body tag, insert before it
  if (html.includes('</body>')) {
    return html.replace('</body>', `${banner}</body>`);
  }
  
  // Otherwise, just append to the end
  return html + banner;
}

/**
 * Wraps plain text in a basic HTML document structure
 * @param text - The plain text content to wrap
 * @returns HTML string with basic styling
 */
function wrapTextInHTML(text: string): string {
  // Convert line breaks to HTML paragraphs
  const paragraphs = text
    .split("\n\n")
    .filter((p) => p.trim())
    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
    .join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Document</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
    }
    p {
      margin-bottom: 1em;
    }
  </style>
</head>
<body>
  ${paragraphs}
</body>
</html>`;
}

/**
 * Generates a PDF buffer from HTML content using browserless.io
 * @param html - The HTML content to convert to PDF
 * @param browserlessToken - Browserless API token
 * @param options - Optional PDF generation options
 * @returns Promise<Buffer> - The PDF as a buffer
 */
export async function generatePDFFromHTML(
  html: string,
  browserlessToken: string,
  options: PDFOptions = {}
): Promise<Buffer> {
  const url = `https://production-sfo.browserless.io/pdf?token=${browserlessToken}`;

  const headers = {
    "Cache-Control": "no-cache",
    "Content-Type": "application/json",
  };

  const defaultOptions: PDFOptions = {
    displayHeaderFooter: false,
    printBackground: true,
    format: "A4",
  };

  const data = {
    html: html,
    options: { ...defaultOptions, ...options },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error(`Failed to generate PDF: ${response.statusText}`);
  }

  const pdfBuffer = await response.arrayBuffer();
  return Buffer.from(pdfBuffer);
}

app.post("/api/inbound", async (c) => {
  console.log("✅ POST /api/inbound");
  try {
    // Get environment variables from Cloudflare Workers context
    const { INBOUND_API_KEY, BROWSERLESS_TOKEN } = c.env;
    
    // Initialize Inbound client with API key from environment
    const inbound = new Inbound(INBOUND_API_KEY);
    
    const payload: InboundWebhookPayload = await c.req.json();

    // Determine the HTML content to convert to PDF
    let htmlContent: string;

    if (payload.email.cleanedContent.hasHtml) {
      // Remove forwarded message content
      htmlContent = removeForwardedContent(payload.email.cleanedContent.html!);
    } else if (payload.email.cleanedContent.hasText) {
      // Wrap text content in basic HTML wrapper
      htmlContent = wrapTextInHTML(payload.email.cleanedContent.text!);
    } else {
      return c.json({ error: "No content found in email" }, 400);
    }

    // Add Inbound branding banner
    htmlContent = addInboundBanner(htmlContent);

    // Generate PDF from HTML with Browserless token
    const pdfBuffer = await generatePDFFromHTML(htmlContent, BROWSERLESS_TOKEN);

    // Reply with PDF attached
    const result = await inbound.reply(payload.email.id, {
      from: "inbound pdf <pdf@inbound.new>",
      text: `see attached
      
sent from my iphone`,
      attachments: [
        {
          filename: "document.pdf",
          content: pdfBuffer.toString("base64"),
          contentType: "application/pdf",
        },
      ],
    });

    if (result.error) {
      return c.json({ error: result.error }, 500);
    }

    return c.json({
      success: true,
      messageId: result.data?.messageId,
    });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return c.json(
      {
        error: error instanceof Error ? error.message : "Unknown error",
      },
      500
    );
  }
});

// Export for Vercel
export default app;
