# Inbound Email Domain Setup Demo

This is a demo application that shows how to set up domains for receiving emails using the [Inbound Email API](https://docs.inbound.new/). 

## Overview

This application demonstrates the complete domain setup workflow:

1. **Add Domain** - Submit a domain to be configured for email receiving
2. **Configure DNS** - View the required DNS records that need to be added
3. **Verify Records** - Check DNS propagation and domain verification status  
4. **Complete Setup** - Confirm the domain is ready to receive emails

## Prerequisites

Before running this demo, you'll need:

1. An Inbound Email API account - [Sign up here](https://dashboard.inbound.new)
2. Your Inbound API key from the dashboard
3. A domain that you control and can modify DNS records for

## Getting Started

### 1. Environment Setup

Create a `.env.local` file in the project root and add your Inbound API key:

```bash
INBOUND_API_KEY=your_inbound_api_key_here
```

**Note:** The API key is now stored securely on the server-side and not exposed to the client.

### 2. Install Dependencies

```bash
bun install
```

### 3. Run the Development Server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the domain setup dashboard.

## Features

### Progressive Dashboard
- Visual progress cards showing the 4 main setup steps
- Dynamic status updates based on domain verification progress
- Clear visual indicators for completed, current, and pending steps

### Domain Management
- Form validation with proper domain format checking
- Integration with Inbound's Create Domain API endpoint
- Real-time status updates and error handling

### DNS Configuration Display
- Tabbed interface showing DNS records and domain status
- Copy-friendly DNS record display with clear formatting
- Required vs. recommended record indicators
- Provider detection and confidence scoring

### Verification & Monitoring
- Refresh functionality to check domain verification status
- Automatic step progression based on verification results
- Detailed status information including timestamps

## API Integration

This demo integrates with the following Inbound API endpoints:

- **POST `https://inbound.new/api/v2/domains`** - Creates a new domain
- **GET `https://inbound.new/api/v2/domains/{id}?check=true`** - Verifies domain status

Learn more about these endpoints in the [Inbound API Documentation](https://docs.inbound.new/api-reference/domains/create-domain).

## Domain Setup Process

1. **Enter your domain** in the form (e.g., `example.com`)
2. **Copy the DNS records** shown in the DNS Configuration tab
3. **Add the records** to your domain's DNS settings via your DNS provider
4. **Wait for propagation** (typically 1-2 hours, up to 24 hours)
5. **Click "Refresh Status"** to check verification progress
6. **Domain ready!** Once verified, you can start receiving emails

## DNS Records Explained

The API provides 4 types of DNS records:

- **TXT Record** (Required) - For AWS SES domain verification
- **MX Record** (Required) - Routes emails to Inbound's servers  
- **SPF Record** (Recommended) - Improves email deliverability
- **DMARC Record** (Recommended) - Sets email authentication policy

## Technology Stack

- **Next.js 15** with App Router
- **React 19** with Server Components
- **Tailwind CSS 4** for styling
- **shadcn/ui** components
- **TypeScript** for type safety
- **React Hook Form** with Zod validation
- **Inbound Email API** for domain management

## Learn More

- [Inbound Email Documentation](https://docs.inbound.new/) - Complete API documentation
- [Domain Setup Guide](https://docs.inbound.new/api-reference/domains/create-domain) - Detailed domain configuration guide
- [Next.js Documentation](https://nextjs.org/docs) - Learn about Next.js features and API

## License

This demo is provided as-is for educational and demonstration purposes.
