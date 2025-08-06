export interface EmailOptions {
  to: string;
  from: string;
  subject: string;
  html?: string;
  text?: string;
  replyTo?: string;
  references?: string[];
  userId: string;
  contactId: string;
  templateId?: string;
  variables?: Record<string, any>;
}

export interface EmailResponse {
  messageId: string;
  threadId?: string;
  subject: string;
  body: string;
  headers: Record<string, string>;
  from: string;
  to: string;
  receivedAt: Date;
}

export interface EmailTrackingEvent {
  id: string;
  emailId: string;
  eventType: 'open' | 'click' | 'reply' | 'bounce' | 'spam' | 'unsubscribe';
  occurredAt: Date;
  metadata: Record<string, any>;
}
