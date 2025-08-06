import { createClient } from '@/lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';
import type { EmailOptions } from './types';

export interface TrackingOptions {
  enableOpens?: boolean;
  enableClicks?: boolean;
  enableReplies?: boolean;
}

export async function addTrackingToEmail(
  emailOptions: EmailOptions,
  trackingOptions: TrackingOptions = { enableOpens: true, enableClicks: true, enableReplies: true }
) {
  const messageId = uuidv4();
  const threadId = uuidv4();
  const trackingId = uuidv4();

  // Add tracking headers
  const headers = {
    'Message-ID': `<${messageId}@smartreach.app>`,
    'X-Thread-ID': threadId,
    'X-Smart-Reach-Track': trackingId,
    'In-Reply-To': emailOptions.replyTo ? `<${emailOptions.replyTo}@smartreach.app>` : undefined,
    'References': emailOptions.references ? emailOptions.references.join(' ') : undefined,
  };

  // Add tracking pixel if open tracking is enabled
  let htmlContent = emailOptions.html || '';
  if (trackingOptions.enableOpens) {
    const trackingPixel = `<img src="${process.env.NEXT_PUBLIC_APP_URL}/api/track/open/${trackingId}" width="1" height="1" />`;
    htmlContent = htmlContent.replace('</body>', `${trackingPixel}</body>`);
  }

  // Add click tracking if enabled
  if (trackingOptions.enableClicks) {
    htmlContent = addClickTracking(htmlContent, trackingId);
  }

  // Store email in database for tracking
  const supabase = createClient();
  const { error } = await supabase.from('sent_emails').insert({
    message_id: messageId,
    thread_id: threadId,
    tracking_id: trackingId,
    user_id: emailOptions.userId,
    contact_id: emailOptions.contactId,
    subject: emailOptions.subject,
    status: 'queued'
  });

  if (error) {
    console.error('Failed to store email tracking info:', error);
    throw new Error('Failed to set up email tracking');
  }

  return {
    ...emailOptions,
    html: htmlContent,
    headers,
    messageId,
    threadId,
    trackingId
  };
}

function addClickTracking(html: string, trackingId: string): string {
  return html.replace(
    /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/g,
    `<a href="$1${process.env.NEXT_PUBLIC_APP_URL}/api/track/click/${trackingId}?url=$2$1`
  );
}

export async function recordEmailEvent(trackingId: string, eventType: string, metadata: any = {}) {
  const supabase = createClient();
  
  // Get the email record
  const { data: email, error: emailError } = await supabase
    .from('sent_emails')
    .select('id')
    .eq('tracking_id', trackingId)
    .single();

  if (emailError) {
    console.error('Failed to find email for tracking event:', emailError);
    throw new Error('Email not found');
  }

  // Record the event
  const { error } = await supabase.from('email_tracking_events').insert({
    email_id: email.id,
    event_type: eventType,
    metadata
  });

  if (error) {
    console.error('Failed to record email event:', error);
    throw new Error('Failed to record email event');
  }
}

export async function recordEmailResponse(messageId: string, responseData: any) {
  const supabase = createClient();
  
  // Find the original email
  const { data: originalEmail, error: emailError } = await supabase
    .from('sent_emails')
    .select('id, user_id, contact_id')
    .eq('message_id', messageId)
    .single();

  if (emailError) {
    console.error('Failed to find original email:', emailError);
    throw new Error('Original email not found');
  }

  // Record the response
  const { error } = await supabase.from('email_responses').insert({
    original_email_id: originalEmail.id,
    user_id: originalEmail.user_id,
    contact_id: originalEmail.contact_id,
    message_id: responseData.messageId,
    thread_id: responseData.threadId,
    response_subject: responseData.subject,
    response_body: responseData.body,
    response_headers: responseData.headers,
    spam_score: calculateSpamScore(responseData)
  });

  if (error) {
    console.error('Failed to record email response:', error);
    throw new Error('Failed to record email response');
  }
}

function calculateSpamScore(emailData: any): number {
  let score = 0;
  const spamIndicators = [
    'viagra', 'replica', 'lottery', 'winner', 'cryptocurrency',
    'bitcoin', 'investment', 'forex', 'million dollar'
  ];

  // Check subject and body for spam words
  const content = `${emailData.subject} ${emailData.body}`.toLowerCase();
  spamIndicators.forEach(word => {
    if (content.includes(word)) score += 0.2;
  });

  // Check headers
  if (!emailData.headers['dkim-signature']) score += 0.3;
  if (!emailData.headers['spf']) score += 0.3;
  if (!emailData.headers['dmarc']) score += 0.3;

  return Math.min(score, 1); // Normalize to 0-1
}
