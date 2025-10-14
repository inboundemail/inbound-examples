# PDF Generator from Email

Converts email content to PDF using Browserless.io and the Inbound email API.

## Features

- ✅ Converts HTML emails to PDF
- ✅ Wraps plain text emails in clean HTML before conversion
- ✅ **Removes forwarded message headers** from multiple email clients:
  - Gmail (`gmail_quote`, `gmail_attr`)
  - Outlook (`OutlookMessageHeader`, "-----Original Message-----")
  - Apple Mail (blockquote elements)
  - Yahoo Mail (`yahoo_quoted`)
  - Thunderbird (`moz-cite-prefix`)
  - Generic quote/forward patterns
- ✅ Automatically replies with PDF attachment
- ✅ Built with Hono for Cloudflare Workers

## Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- [Bun](https://bun.sh) for local development
- Environment variables:
  - `INBOUND_API_KEY` - Your Inbound API key
  - `BROWSERLESS_TOKEN` - Your Browserless.io token

## Development

Install dependencies:
```bash
bun install
```

Run locally with Bun:
```bash
bun run dev
```

Or test with Cloudflare Workers locally:
```bash
bun run cf:dev
```

Server will be available at `http://localhost:3000` (Bun) or `http://localhost:8787` (Wrangler)

## Environment Variables Setup

Before deploying, set your environment variables:

```bash
npx wrangler secret put INBOUND_API_KEY
npx wrangler secret put BROWSERLESS_TOKEN
```

## Deploy to Cloudflare Workers

Deploy to production:
```bash
bun run deploy
```

Or using npx directly:
```bash
npx wrangler deploy
```

Your worker will be deployed to `https://pdf-gen.<your-subdomain>.workers.dev`

## How It Works

1. Receives webhook from Inbound when email arrives
2. Extracts HTML content (or wraps text in HTML)
3. **Removes forwarded message headers and quote blocks**
4. Converts cleaned HTML to PDF using Browserless.io
5. Replies to original email with PDF attached

## API Endpoints

- `POST /api/inbound` - Webhook endpoint for Inbound email webhooks
