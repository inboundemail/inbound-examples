# Replies API - Express.js Example

A simple Express.js API demonstrating email reply functionality using the Inbound TypeScript SDK.

## Features

- 📧 Email management endpoints (CRUD operations)
- 💬 Reply sending functionality
- 📝 Template-based replies
- 🏥 Health check endpoints
- 🔄 Integration with Inbound SDK (optional)

## Prerequisites

- [Bun](https://bun.sh/) runtime installed
- Node.js 18+ (if not using Bun)
- Inbound API key (optional, for SDK integration)

## Installation

1. Install dependencies:
```bash
bun install
```

2. Create a `.env` file:
```bash
# Copy the sample environment variables
cp .env.sample .env
# Edit .env and add your Inbound API key if you have one
```

## Running the Application

### Development Mode (with auto-reload)
```bash
bun run dev
```

### Production Mode
```bash
bun run build
bun run start
```

The server will start on `http://localhost:3000` (or the port specified in your `.env` file).

## API Endpoints

### Root
- `GET /` - Welcome message and API information

### Health Check
- `GET /api/health` - Basic health check
- `GET /api/health/detailed` - Detailed health information with memory usage

### Email Management
- `GET /api/emails` - Get all emails
  - Query params: `?replied=true` or `?replied=false`
- `GET /api/emails/:id` - Get a specific email
- `POST /api/emails` - Create a new email (simulate receiving)
  - Body: `{ from, to, subject, body }`
- `DELETE /api/emails/:id` - Delete an email

### Reply Management
- `GET /api/replies` - Get all replies
  - Query params: `?emailId=1` or `?status=sent`
- `GET /api/replies/:id` - Get a specific reply
- `POST /api/replies/send` - Send a reply
  - Body: `{ emailId, from, to, subject, body, useInboundSDK?: boolean }`
- `POST /api/replies/template` - Send a template-based reply
  - Body: `{ emailId, from, to, templateType, variables }`
  - Available templates: `welcome`, `support`, `followup`

## Example Usage

### 1. Create an Email
```bash
curl -X POST http://localhost:3000/api/emails \
  -H "Content-Type: application/json" \
  -d '{
    "from": "customer@example.com",
    "to": "support@company.com",
    "subject": "Question about pricing",
    "body": "Hi, I wanted to know more about your pricing plans."
  }'
```

### 2. Send a Reply
```bash
curl -X POST http://localhost:3000/api/replies/send \
  -H "Content-Type: application/json" \
  -d '{
    "emailId": "1",
    "from": "support@company.com",
    "to": "customer@example.com",
    "subject": "Re: Question about pricing",
    "body": "Thank you for your interest! Our pricing starts at $9/month.",
    "useInboundSDK": false
  }'
```

### 3. Send a Template Reply
```bash
curl -X POST http://localhost:3000/api/replies/template \
  -H "Content-Type: application/json" \
  -d '{
    "emailId": "1",
    "from": "support@company.com",
    "to": "customer@example.com",
    "templateType": "support",
    "variables": {
      "name": "John",
      "ticketId": "TICKET-123"
    }
  }'
```

### 4. Check Health
```bash
curl http://localhost:3000/api/health/detailed
```

## Project Structure

```
replies-api/
├── src/
│   ├── index.ts           # Main Express server
│   └── routes/
│       ├── health.ts      # Health check endpoints
│       ├── emails.ts      # Email management endpoints
│       └── replies.ts     # Reply management endpoints
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
├── .env.sample            # Environment variables template
└── README.md              # This file
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment mode (development/production)
- `INBOUND_API_KEY` - Your Inbound API key for SDK integration
- `INBOUND_BASE_URL` - Inbound API base URL (default: https://api.inbound.email)

## Notes

- This example uses in-memory storage for demonstration purposes
- In production, you would typically use a database (PostgreSQL, MongoDB, etc.)
- The Inbound SDK integration is optional - set `useInboundSDK: true` in the request to use it
- Make sure to set your `INBOUND_API_KEY` in the `.env` file for SDK features

## Extending the API

You can extend this API by:
1. Adding database integration (e.g., Prisma, TypeORM)
2. Implementing authentication/authorization
3. Adding webhook endpoints for incoming emails
4. Creating more sophisticated email templates
5. Adding email tracking and analytics
6. Implementing rate limiting and caching

## License

MIT
