# Inbound Mail Client

A simple email client built with Next.js that connects to the Inbound Email API. This client demonstrates how to build a threaded email interface using the Inbound v2 API.

## Features

- 📧 **Thread-based email view** - Emails are organized into conversation threads
- 📝 **Compose new emails** - Send emails using your verified Inbound domains  
- 💬 **Reply functionality** - Reply to individual messages or reply-all to threads
- 🔍 **Search and filtering** - Filter by unread status and search threads
- 📱 **Responsive design** - Works on desktop and mobile devices
- ⚡ **Real-time updates** - Automatically refreshes with new emails

## Setup

### 1. Environment Variables

Create a `.env.local` file in the project root:

```bash
# Required: Your Inbound API key
NEXT_PUBLIC_INBOUND_API_KEY=your_api_key_here

# Required: Email address for sending (must be from a verified domain)
NEXT_PUBLIC_INBOUND_EMAIL=user@yourdomain.com

# Optional: API URL (defaults to localhost:3000 for development)
NEXT_PUBLIC_API_URL=http://localhost:3000/api/v2
```

### 2. Install Dependencies

```bash
bun install
```

### 3. Start Development Server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000) to view the client.

## API Integration

This client uses the Inbound Email v2 API endpoints:

- `GET /api/v2/threads` - List email threads
- `GET /api/v2/threads/{id}` - Get thread details with messages
- `POST /api/v2/emails` - Send new emails
- `POST /api/v2/emails/{id}/reply-new` - Reply to emails
- `POST /api/v2/threads/{id}/actions` - Thread actions (mark as read, archive)

## Architecture

### Components

- **AppSidebar** - Main navigation and threads list
- **ThreadsList** - Displays email threads with preview
- **ThreadDetail** - Shows messages in a selected thread
- **ComposeDialog** - Modal for composing/replying to emails

### Data Management

- **React Query** - Handles API calls, caching, and state management
- **InboundClient** - Custom API client class for Inbound v2 API
- **Auto-refresh** - Threads and messages update every 30 seconds

### Key Files

- `lib/inbound.ts` - API client and TypeScript types
- `components/query-provider.tsx` - React Query configuration
- `app/page.tsx` - Main application layout and state

## Usage

1. **View Threads** - The left sidebar shows your email threads
2. **Select Thread** - Click any thread to view its messages
3. **Reply** - Click "Reply" or "Reply All" on any inbound message
4. **Compose** - Click the "Compose" button to send a new email
5. **Filters** - Toggle "Unreads" to show only unread threads

## Development

The client automatically connects to your local Inbound API server. Make sure you have:

1. Inbound API server running on `localhost:3000`
2. Valid API key in environment variables
3. At least one verified domain for sending emails

## Customization

To customize the client:

- **Styling** - Modify Tailwind classes in components
- **API endpoints** - Update `lib/inbound.ts` for different API versions
- **Features** - Add new components for additional functionality
- **Themes** - Update `app/globals.css` for custom color schemes
