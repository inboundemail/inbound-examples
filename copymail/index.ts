import express from 'express';
import { type InboundWebhookPayload } from '@inboundemail/sdk';
import { encoding_for_model } from 'tiktoken';
import fs from 'fs';
import * as cheerio from 'cheerio';

const app = express();
const port = process.env.PORT || 3000;

// Function to clean HTML by removing gmail_attr divs
function cleanHtmlBody(htmlBody: string): string {
  if (!htmlBody) return '';
  
  try {
    const $ = cheerio.load(htmlBody);
    // Remove all divs with class gmail_attr
    $('.gmail_attr').remove();
    return $.html();
  } catch (error) {
    console.error('Error cleaning HTML:', error);
    return htmlBody; // Return original if cleaning fails
  }
}

// Add request logging middleware
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  // console.log('Headers:', req.headers);
  // console.log('Content-Type:', req.get('Content-Type'));
  next();
});

// Configure JSON parsing with error handling
app.use(express.json({
  limit: '10mb',
}));

// Add error handling middleware for JSON parsing
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof SyntaxError && 'body' in error) {
    console.error('JSON Parse Error:', error.message);
    console.error('Request body that caused error:', error);
    return res.status(400).json({ error: 'Invalid JSON in request body' });
  }
  next();
});

app.post('/api/inbound', (req, res) => {
  try {    
    // Check if body exists and has expected structure
    if (!req.body) {
      return res.status(400).json({ error: 'Request body is empty' });
    }
    
    const { email } = req.body as InboundWebhookPayload;
    
    if (!email) {
      return res.status(400).json({ error: 'Email data not found in request body' });
    }
    
    console.log('New CopyMail email received from:', email.from?.addresses[0]);
    // console.log('```html')
    // console.log(email.parsedData?.htmlBody || 'No HTML body found');
    // console.log('```')
    
    const originalHtmlBody = email.parsedData?.htmlBody || '';
    const originalBodySize = originalHtmlBody.length;
    
    // Clean HTML by removing gmail_attr divs
    const cleanedHtmlBody = cleanHtmlBody(originalHtmlBody);
    const cleanedBodySize = cleanedHtmlBody.length;
    
    // Calculate tokens using tiktoken (GPT-5 encoding)
    let originalTokenCount = 0;
    let cleanedTokenCount = 0;
    
    if (originalHtmlBody) {
      try {
        const encoder = encoding_for_model('gpt-5');
        
        // Calculate tokens for original HTML
        const originalTokens = encoder.encode(originalHtmlBody);
        originalTokenCount = originalTokens.length;
        
        // Calculate tokens for cleaned HTML
        const cleanedTokens = encoder.encode(cleanedHtmlBody);
        cleanedTokenCount = cleanedTokens.length;
        
        encoder.free(); // Clean up the encoder
      } catch (error) {
        console.error('Error calculating tokens:', error);
      }
    }
    
    console.log("Original HTML body size:", originalBodySize, "bytes");
    console.log("Original token count:", originalTokenCount, "tokens");
    console.log("Cleaned HTML body size:", cleanedBodySize, "bytes");
    console.log("Cleaned token count:", cleanedTokenCount, "tokens");
    console.log("Token reduction:", originalTokenCount - cleanedTokenCount, "tokens");
    
    // Save both versions to files for comparison
    fs.writeFileSync('html_body_original.html', originalHtmlBody);
    fs.writeFileSync('html_body_cleaned.html', cleanedHtmlBody);
    res.status(200).json({ message: 'Inbound data received successfully' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});