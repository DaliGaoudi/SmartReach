export type Campaign = {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  resume_url?: string;
  status: 'active' | 'paused' | 'completed';
  created_at: string;
  updated_at: string;
};

export type CampaignContact = {
  id: string;
  campaign_id: string;
  contact_id: string;
  status: 'pending' | 'sent' | 'replied';
  sent_at?: string;
  replied_at?: string;
  created_at: string;
  contact?: Contact;
};

export type CampaignWithContacts = Campaign & {
  contacts: CampaignContact[];
};
