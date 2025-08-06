'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { EmailTrackingEvent } from '@/lib/email/types';

interface EmailTrackingProps {
  contactId: string;
}

export default function EmailTracking({ contactId }: EmailTrackingProps) {
  const [loading, setLoading] = useState(true);
  const [emails, setEmails] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchEmails = async () => {
      const { data: sentEmails, error: emailsError } = await supabase
        .from('sent_emails')
        .select(`
          *,
          email_tracking_events (*),
          email_responses (*)
        `)
        .eq('contact_id', contactId)
        .order('sent_at', { ascending: false });

      if (emailsError) {
        console.error('Error fetching emails:', emailsError);
        return;
      }

      setEmails(sentEmails || []);
      setLoading(false);
    };

    fetchEmails();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('email-tracking')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'email_tracking_events',
        filter: `contact_id=eq.${contactId}`
      }, payload => {
        // Update the UI when new events come in
        fetchEmails();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [contactId]);

  const getEventIcon = (eventType: string) => {
    switch (eventType) {
      case 'open':
        return '👁️';
      case 'click':
        return '🖱️';
      case 'reply':
        return '↩️';
      case 'bounce':
        return '❌';
      default:
        return '📧';
    }
  };

  const formatEventTime = (date: string) => {
    return format(new Date(date), 'MMM d, yyyy h:mm a');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {emails.map(email => (
        <div key={email.id} className="bg-white rounded-lg shadow p-4 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="font-medium text-gray-900">{email.subject}</h3>
              <p className="text-sm text-gray-500">
                Sent {formatEventTime(email.sent_at)}
              </p>
            </div>
            <span className={`px-2 py-1 rounded text-sm ${
              email.email_responses.length > 0 
                ? 'bg-green-100 text-green-800'
                : 'bg-gray-100 text-gray-800'
            }`}>
              {email.email_responses.length > 0 ? 'Replied' : 'No Reply'}
            </span>
          </div>

          <div className="space-y-2">
            {email.email_tracking_events.map((event: EmailTrackingEvent) => (
              <div key={event.id} className="flex items-center text-sm text-gray-600">
                <span className="mr-2">{getEventIcon(event.eventType)}</span>
                <span className="flex-1">
                  {event.eventType.charAt(0).toUpperCase() + event.eventType.slice(1)}
                </span>
                <span className="text-gray-400">
                  {formatEventTime(event.occurredAt.toString())}
                </span>
              </div>
            ))}
          </div>

          {email.email_responses.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Responses</h4>
              {email.email_responses.map((response: any) => (
                <div key={response.id} className="bg-gray-50 rounded p-3 text-sm">
                  <div className="flex justify-between text-gray-600 mb-1">
                    <span>{response.response_subject}</span>
                    <span>{formatEventTime(response.received_at)}</span>
                  </div>
                  <p className="text-gray-800 whitespace-pre-wrap">
                    {response.response_body}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
