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

export function formatUsageMessage(usageStats: UsageStats): string {
  if (usageStats.isPremium) {
    return 'Unlimited emails available';
  }

  if (usageStats.emailsRemaining === -1) {
    return `${usageStats.emailsUsed} emails used this month`;
  }

  return `${usageStats.emailsUsed}/${usageStats.emailsUsed + usageStats.emailsRemaining} emails used this month`;
} 