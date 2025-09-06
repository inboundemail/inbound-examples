import express, { Express, request, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Inbound, InboundWebhookPayload, isInboundWebhook } from 'inbnd';

// Load environment variables
dotenv.config();

const inbound = new Inbound(process.env.INBOUND_API_KEY!);

// Create Express app
const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    message: 'Welcome to Replies API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      emails: '/api/emails',
      replies: '/api/replies'
    }
  });
});

app.post('/api/replytothis', async (req: Request, res: Response) => {
  const payload: InboundWebhookPayload = await req.body;
  if (!isInboundWebhook(payload)) {
    return res.status(400).json({ error: 'Invalid webhook' });
  }
  const { email } = payload;
  const fromEmail = email.from?.addresses[0]?.address || email.from?.text;
  console.log('Email from ', fromEmail);
  const { data, error } = await inbound.email.sent.reply(email.id, {
    to: fromEmail,
    from: 'Support <support@inbound.new>',
    text: 'Thank you for your email. We have received your request and will respond shortly.',
    simple: true
  });
  if (error) {
    return res.status(500).json({ error: error });
  }
  return res.status(200).json({ message: 'Email replied successfully', data: data });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.path} not found`
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: Function) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✨ Server is running on http://localhost:${PORT}`);
  console.log(`📧 Replies API ready to handle email operations`);
});
