import { createClient } from '@/lib/supabase/server';

export type Notification = {
  id: string;
  user_id: string;
  type: 'email_reply' | 'system';
  title: string;
  message: string;
  read: boolean;
  created_at: string;
  metadata: Record<string, any>;
  email_id?: string;
  thread_id?: string;
};

export async function createNotification({
  userId,
  type,
  title,
  message,
  metadata = {},
  emailId,
  threadId
}: {
  userId: string;
  type: 'email_reply' | 'system';
  title: string;
  message: string;
  metadata?: Record<string, any>;
  emailId?: string;
  threadId?: string;
}) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('notifications')
    .insert({
      user_id: userId,
      type,
      title,
      message,
      metadata,
      email_id: emailId,
      thread_id: threadId
    });

  if (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

export async function markNotificationAsRead(notificationId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('id', notificationId);

  if (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

export async function markAllNotificationsAsRead(userId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('notifications')
    .update({ read: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}
