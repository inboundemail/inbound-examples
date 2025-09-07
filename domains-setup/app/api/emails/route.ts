import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { from, fromName, to, subject, html, text } = body;

    // Validate required fields
    if (!from || !to || !subject) {
      return NextResponse.json(
        { error: 'Missing required fields: from, to, and subject are required' },
        { status: 400 }
      );
    }

    if (!html && !text) {
      return NextResponse.json(
        { error: 'Either html or text content must be provided' },
        { status: 400 }
      );
    }

    const apiKey = process.env.INBOUND_API_KEY;
    if (!apiKey) {
      console.error('INBOUND_API_KEY environment variable is not set');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    const fromFormatted = fromName.charAt(0).toUpperCase() + fromName.slice(1) + " <" + from + ">";

    const response = await fetch('https://inbound.new/api/v2/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: fromFormatted,
        to,
        subject,
        html,
        text,
        tags: body.tags || []
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Inbound API error:', response.status, errorText);

      let errorMessage = 'Failed to send email';
      try {
        const errorData = JSON.parse(errorText);
        errorMessage = errorData.error || errorMessage;
      } catch {
        // If error response is not JSON, use default message
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Email sending error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
