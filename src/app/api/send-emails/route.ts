import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { google } from 'googleapis';
import { checkEmailLimit, incrementEmailUsage } from '@/lib/subscription-limits';

export async function POST(request: NextRequest) {
  try {
    const { contactIds, customMessage, individualMessages } = await request.json();
    
    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json({ error: 'Contact IDs are required' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check user's subscription and usage if AI generation is needed
    if (!customMessage && !individualMessages) {
      const limitCheck = await checkEmailLimit(user.id, contactIds.length);
      
      if (!limitCheck.allowed) {
        return NextResponse.json({ 
          error: limitCheck.error,
          usageStats: limitCheck.usageStats
        }, { status: 402 }); // Payment Required
      }
    }

    // Get user's Gmail tokens
    const { data: tokens, error: tokenError } = await supabase
      .from('user_tokens')
      .select('access_token, refresh_token, expires_at')
      .eq('user_id', user.id)
      .eq('provider', 'google')
      .single();

    if (tokenError || !tokens) {
      return NextResponse.json({ error: 'Gmail not connected. Please connect your Gmail account first.' }, { status: 400 });
    }

    // Check if token is expired
    const isExpired = tokens.expires_at && new Date(tokens.expires_at) < new Date();
    
    if (isExpired && !tokens.refresh_token) {
      return NextResponse.json({ error: 'Gmail access expired. Please reconnect your Gmail account.' }, { status: 400 });
    }

    // Get user's profile for sender name
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single();

    const senderName = profile?.full_name || user.email?.split('@')[0] || 'SmartSendr User';

    // Get contacts
    const { data: contacts, error: contactsError } = await supabase
      .from('contacts')
      .select('id, name, email, company')
      .in('id', contactIds)
      .eq('user_id', user.id);

    if (contactsError || !contacts) {
      return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
    }

    // Setup Gmail API
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
    });

    // Handle token refresh if needed
    if (isExpired) {
      try {
        const { credentials } = await oauth2Client.refreshAccessToken();
        if (credentials.access_token) {
          // Update tokens in database
          await supabase
            .from('user_tokens')
            .update({
              access_token: credentials.access_token,
              expires_at: credentials.expiry_date ? new Date(credentials.expiry_date).toISOString() : null,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('provider', 'google');
          
          // Update oauth2Client with new token
          oauth2Client.setCredentials(credentials);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        return NextResponse.json({ error: 'Gmail access expired. Please reconnect your Gmail account.' }, { status: 400 });
      }
    }

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    const results = [];
    const successfulContactIds = [];

    for (const contact of contacts) {
      try {
        // Determine email content based on available options
        let emailContent = '';
        
        if (individualMessages && individualMessages[contact.id]) {
          // Use individual message for this specific contact
          emailContent = individualMessages[contact.id];
        } else if (customMessage) {
          // Use global custom message
          emailContent = customMessage;
        } else {
          // Generate AI message if no custom message provided
          // Increment count before generating
          if (!isPremium) {
            usageCount++;
          }
          
          const aiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${process.env.GOOGLE_API_KEY}`,
            },
            body: JSON.stringify({
              contents: [{
                parts: [{
                  text: `Generate a personalized cold email for a contact named ${contact.name} at ${contact.company || 'their company'}. 
                  The email should be professional, concise (under 150 words), and include:
                  - A personalized greeting
                  - A brief introduction of the sender
                  - A clear value proposition or reason for reaching out
                  - A call to action
                  - Professional closing
                  
                  Keep it friendly but professional. Don't use generic templates.`
                }]
              }]
            })
          });

          if (!aiResponse.ok) {
            throw new Error('Failed to generate AI message');
          }

          const aiData = await aiResponse.json();
          emailContent = aiData.candidates[0].content.parts[0].text;
        }

        // Create email message
        const emailLines = [
          `To: ${contact.email}`,
          `Subject: Quick question about ${contact.company || 'your company'}`,
          '',
          emailContent,
          '',
          `Best regards,`,
          senderName
        ];

        const email = emailLines.join('\r\n');
        const base64Email = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_');

        // Send email
        await gmail.users.messages.send({
          userId: 'me',
          requestBody: {
            raw: base64Email,
          },
        });

        results.push({ contact: contact.email, success: true });
        successfulContactIds.push(contact.id);
      } catch (error: any) {
        console.error(`Failed to send email to ${contact.email}:`, error);
        
        // Handle specific Gmail API errors
        let errorMessage = error.message;
        if (error.code === 401) {
          errorMessage = 'Gmail access expired. Please reconnect your Gmail account.';
        } else if (error.code === 403) {
          errorMessage = 'Gmail access denied. Please check your Gmail permissions.';
        } else if (error.code === 429) {
          errorMessage = 'Gmail rate limit exceeded. Please try again later.';
        }
        
        results.push({ contact: contact.email, success: false, error: errorMessage });
      }
    }

    // Update email usage for free users
    if (!customMessage && successfulContactIds.length > 0) {
      try {
        await incrementEmailUsage(user.id, successfulContactIds.length);
      } catch (error) {
        console.error('Failed to update email usage:', error);
        // Don't fail the entire request if usage tracking fails
      }
    }

    // Mark successfully sent contacts as sent in the database
    if (successfulContactIds.length > 0) {
      try {
        const now = new Date().toISOString();
        await supabase
          .from('contacts')
          .update({ sent_at: now })
          .in('id', successfulContactIds)
          .eq('user_id', user.id);
      } catch (updateError) {
        console.error('Failed to update contact sent status:', updateError);
        // Don't fail the entire request if this update fails
      }
    }

    return NextResponse.json({ 
      message: 'Emails processed', 
      results 
    });

  } catch (error: any) {
    console.error('Send emails error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
} 