import { createClient } from '@/lib/supabase/server';
import { Subscription } from '@/types';

export interface SubscriptionLimits {
  maxEmailsPerMonth: number;
  maxContactsPerUpload: number;
  canUseAIGeneration: boolean;
  canUseDirectGmailSending: boolean;
  canUseBulkOperations: boolean;
  planName: string;
}

export interface UsageStats {
  emailsUsed: number;
  emailsRemaining: number;
  contactsUploaded: number;
  contactsRemaining: number;
  isPremium: boolean;
}

export const SUBSCRIPTION_LIMITS = {
  FREE: {
    maxEmailsPerMonth: 25,
    maxContactsPerUpload: 50,
    canUseAIGeneration: true,
    canUseDirectGmailSending: true,
    canUseBulkOperations: true,
    planName: 'Free'
  },
  PREMIUM: {
    maxEmailsPerMonth: -1, // Unlimited
    maxContactsPerUpload: -1, // Unlimited
    canUseAIGeneration: true,
    canUseDirectGmailSending: true,
    canUseBulkOperations: true,
    planName: 'Premium'
  }
} as const;

export async function getUserSubscriptionLimits(userId: string): Promise<SubscriptionLimits> {
  const supabase = await createClient();
  
  // Get user's subscription status
  const { data: subscription, error: subscriptionError } = await supabase
    .from('subscriptions')
    .select('status, prices(products(name))')
    .eq('user_id', userId)
    .in('status', ['trialing', 'active'])
    .single();

  if (subscriptionError || !subscription) {
    return SUBSCRIPTION_LIMITS.FREE;
  }

  // If user has an active subscription, they get premium limits
  return SUBSCRIPTION_LIMITS.PREMIUM;
}

export async function getUserUsageStats(userId: string): Promise<UsageStats> {
  const supabase = await createClient();
  
  // Get user's profile for usage data
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email_count')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('Error fetching user profile:', profileError);
    return {
      emailsUsed: 0,
      emailsRemaining: 25,
      contactsUploaded: 0,
      contactsRemaining: 50,
      isPremium: false
    };
  }

  const limits = await getUserSubscriptionLimits(userId);
  const emailsUsed = profile?.email_count || 0;
  const emailsRemaining = limits.maxEmailsPerMonth === -1 
    ? -1 
    : Math.max(0, limits.maxEmailsPerMonth - emailsUsed);

  return {
    emailsUsed,
    emailsRemaining,
    contactsUploaded: 0, // TODO: Add contact count tracking
    contactsRemaining: limits.maxContactsPerUpload === -1 ? -1 : limits.maxContactsPerUpload,
    isPremium: limits.planName === 'Premium'
  };
}

export async function checkEmailLimit(userId: string, emailCount: number = 1): Promise<{
  allowed: boolean;
  error?: string;
  usageStats?: UsageStats;
}> {
  const limits = await getUserSubscriptionLimits(userId);
  const usageStats = await getUserUsageStats(userId);

  // Premium users have unlimited emails
  if (limits.maxEmailsPerMonth === -1) {
    return { allowed: true, usageStats };
  }

  // Check if user has enough emails remaining
  if (usageStats.emailsRemaining < emailCount) {
    return {
      allowed: false,
      error: `You have reached your limit of ${limits.maxEmailsPerMonth} emails per month. Please upgrade to a premium plan to continue.`,
      usageStats
    };
  }

  return { allowed: true, usageStats };
}

export async function incrementEmailUsage(userId: string, count: number = 1): Promise<void> {
  const supabase = await createClient();
  
  // Only increment for free users
  const limits = await getUserSubscriptionLimits(userId);
  if (limits.maxEmailsPerMonth === -1) {
    return; // Premium users don't need usage tracking
  }

  const { error } = await supabase
    .from('profiles')
    .update({ 
      email_count: supabase.sql`email_count + ${count}` 
    })
    .eq('id', userId);

  if (error) {
    console.error('Error incrementing email usage:', error);
    throw error;
  }
}

export async function resetMonthlyUsage(): Promise<void> {
  const supabase = await createClient();
  
  // Reset email_count for all users (this should be run monthly via cron job)
  const { error } = await supabase
    .from('profiles')
    .update({ email_count: 0 });

  if (error) {
    console.error('Error resetting monthly usage:', error);
    throw error;
  }
}

export function formatUsageMessage(usageStats: UsageStats): string {
  if (usageStats.isPremium) {
    return 'Unlimited emails available';
  }

  if (usageStats.emailsRemaining === -1) {
    return `${usageStats.emailsUsed} emails used this month`;
  }

  return `${usageStats.emailsUsed}/${usageStats.emailsUsed + usageStats.emailsRemaining} emails used this month`;
} 