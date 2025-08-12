import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import CampaignClient from './campaign-client';
import { CampaignWithContacts } from '@/types/campaign';
import { Contact } from '@/types';

interface Props {
  params: {
    id: string;
  };
  searchParams?: { [key: string]: string | string[] | undefined };
}

export default async function CampaignPage({ params }: Props) {
  const supabase = await createClient();

  // Fetch campaign details with contacts
  const { data: campaign, error: campaignError } = await supabase
    .from('campaigns')
    .select(`
      *,
      campaign_contacts (
        *,
        contact:contacts (*)
      )
    `)
    .eq('id', params.id)
    .single() as { data: CampaignWithContacts | null; error: any };

  if (campaignError || !campaign) {
    redirect('/dashboard/campaigns');
  }

  // Fetch contacts that aren't in the campaign
  const { data: contacts } = await supabase
    .from('contacts')
    .select('*')
    .not(
      'id', 
      'in', 
      (campaign.campaign_contacts || [])
        .map((cc: { contact_id: string }) => cc.contact_id)
    ) as { data: Contact[] | null; error: any };

  return (
    <CampaignClient 
      campaign={campaign} 
      availableContacts={contacts || []} 
    />
  );
}
