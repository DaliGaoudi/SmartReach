import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { recordEmailResponse } from '@/lib/email/tracking';
import crypto from 'crypto';

// Verify webhook signatures
function verifyWebhookSignature(req: Request): boolean {
  const signature = req.headers.get('x-webhook-signature');
  const timestamp = req.headers.get('x-webhook-timestamp');
  
  if (!signature || !timestamp) {
    return false;
  }

  const secret = process.env.WEBHOOK_SECRET!;
  const payload = `${timestamp}.${req.body}`;
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

export async function POST(req: Request) {
  try {
    // Verify webhook signature
    if (!verifyWebhookSignature(req)) {
      return new NextResponse('Invalid signature', { status: 401 });
    }

    const payload = await req.json();
    const supabase = createRouteHandlerClient({ cookies });

    // Basic spam check
    if (isPotentialSpam(payload)) {
      console.warn('Potential spam detected:', payload.messageId);
      await recordEmailResponse(payload.inReplyTo, {
        ...payload,
        spam_score: 1
      });
      return new NextResponse('OK', { status: 200 });
    }

    // Record the response
    await recordEmailResponse(payload.inReplyTo, {
      messageId: payload.messageId,
      threadId: payload.threadId,
      subject: payload.subject,
      body: payload.textContent || payload.htmlContent,
      headers: payload.headers,
      from: payload.from,
      to: payload.to,
      receivedAt: new Date()
    });

    // Send notification if enabled
    const { data: settings } = await supabase
      .from('user_settings')
      .select('notification_preferences')
      .eq('user_id', payload.userId)
      .single();

    if (settings?.notification_preferences?.emailReplies) {
      await sendNotification(payload);
    }

    return new NextResponse('OK', { status: 200 });
  } catch (error) {
    console.error('Error processing email webhook:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

function isPotentialSpam(payload: any): boolean {
  // Check common spam indicators
  const spamPatterns = [
    /buy.{0,20}(viagra|cialis)/i,
    /lottery.{0,20}winner/i,
    /cryptocurrency.{0,20}investment/i,
    /million.{0,20}dollars/i,
    /urgent.{0,20}business.{0,20}proposal/i
  ];

  const content = `${payload.subject} ${payload.textContent}`.toLowerCase();
  
  // Check content against spam patterns
  if (spamPatterns.some(pattern => pattern.test(content))) {
    return true;
  }

  // Check email headers
  const headers = payload.headers || {};
  if (!headers['dkim-signature'] || !headers['spf']) {
    return true;
  }

  // Check sender reputation (implement your own logic)
  if (isBlockedSender(payload.from)) {
    return true;
  }

  return false;
}

function isBlockedSender(email: string): boolean {
  // Implement sender reputation check
  // This could check against a blocklist or reputation service
  return false;
}

async function sendNotification(payload: any) {
  // Implement your notification logic here
  // This could be email, push notification, Slack, etc.
}
