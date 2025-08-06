import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

export async function setupGmailNotifications(userId: string, credentials: {
  access_token: string;
  refresh_token: string;
}) {
  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: credentials.access_token,
    refresh_token: credentials.refresh_token
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
  try {
    // First, stop any existing watch
    try {
      await gmail.users.stop({
        userId: 'me'
      });
    } catch (error) {
      // Ignore errors from stop - might not have an existing watch
      console.log('No existing watch to stop');
    }

    // Start new watch
    const response = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        // Your Google Cloud project and Pub/Sub topic
        topicName: `projects/${process.env.GOOGLE_CLOUD_PROJECT}/topics/email-notifications`,
        labelIds: ['INBOX', 'SENT'],
        labelFilterAction: 'include'
      }
    });

    console.log('Gmail watch setup successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error setting up Gmail watch:', error);
    throw error;
  }
}

export async function handleGmailNotification(
  message: any,
  subscription: string
) {
  // Verify the message came from Google Cloud Pub/Sub
  if (!verifyPubSubMessage(message)) {
    throw new Error('Invalid Pub/Sub message');
  }

  const data = message.data ? JSON.parse(Buffer.from(message.data, 'base64').toString()) : null;
  
  if (!data?.emailId) {
    console.log('No email ID in notification');
    return;
  }

  const oauth2Client = new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  // Get user credentials based on subscription
  const userCreds = await getUserCredentialsForSubscription(subscription);
  
  oauth2Client.setCredentials({
    access_token: userCreds.access_token,
    refresh_token: userCreds.refresh_token
  });

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  try {
    // Get the email details
    const email = await gmail.users.messages.get({
      userId: 'me',
      id: data.emailId,
      format: 'full'
    });

    // Process the email (handle replies, etc.)
    await processEmail(email.data);
  } catch (error) {
    console.error('Error processing Gmail notification:', error);
    throw error;
  }
}

function verifyPubSubMessage(message: any): boolean {
  // Implement verification logic here
  // Check message format, signatures, etc.
  return true;
}

async function getUserCredentialsForSubscription(subscription: string) {
  // Implement logic to get user credentials based on subscription
  // This would typically involve looking up in your database
  return {
    access_token: '',
    refresh_token: ''
  };
}

async function processEmail(email: any) {
  // Implement email processing logic
  // - Check if it's a reply to one of your sent emails
  // - Extract relevant information
  // - Update your database
  // - Trigger any necessary notifications
}
