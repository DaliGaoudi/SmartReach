'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { CampaignWithContacts } from '@/types/campaign';
import type { Contact } from '@/types';

export default function CampaignPage({ params }: { params: { id: string } }) {
  const [campaign, setCampaign] = useState<CampaignWithContacts | null>(null);
  const [availableContacts, setAvailableContacts] = useState<Contact[]>([]);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchCampaignData();
  }, [params.id]);

  const fetchCampaignData = async () => {
    setIsLoading(true);
    try {
      // Fetch campaign details
      const { data: campaignData, error: campaignError } = await supabase
        .from('campaigns')
        .select(`
          *,
          campaign_contacts (
            *,
            contact:contacts (*)
          )
        `)
        .eq('id', params.id)
        .single();

      if (campaignError) throw campaignError;

      // Fetch available contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('contacts')
        .select('*')
        .not('id', 'in', (campaignData?.campaign_contacts || []).map(cc => cc.contact_id));

      if (contactsError) throw contactsError;

      setCampaign(campaignData);
      setAvailableContacts(contactsData);
    } catch (error) {
      console.error('Error fetching campaign:', error);
      router.push('/dashboard/campaigns');
    } finally {
      setIsLoading(false);
    }
  };

  const addContactsToCampaign = async () => {
    if (!selectedContacts.length) return;

    const { error } = await supabase
      .from('campaign_contacts')
      .insert(
        selectedContacts.map(contactId => ({
          campaign_id: params.id,
          contact_id: contactId,
          status: 'pending'
        }))
      );

    if (error) {
      console.error('Error adding contacts:', error);
      return;
    }

    // Refresh data
    fetchCampaignData();
    setSelectedContacts([]);
  };

  const removeContactFromCampaign = async (contactId: string) => {
    const { error } = await supabase
      .from('campaign_contacts')
      .delete()
      .match({ campaign_id: params.id, contact_id: contactId });

    if (error) {
      console.error('Error removing contact:', error);
      return;
    }

    fetchCampaignData();
  };

  const updateCampaignStatus = async (status: 'active' | 'paused' | 'completed') => {
    const { error } = await supabase
      .from('campaigns')
      .update({ status })
      .eq('id', params.id);

    if (error) {
      console.error('Error updating campaign status:', error);
      return;
    }

    setCampaign(prev => prev ? { ...prev, status } : null);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!campaign) {
    return <div>Campaign not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">{campaign.name}</h1>
        <div className="flex gap-4">
          <select
            value={campaign.status}
            onChange={(e) => updateCampaignStatus(e.target.value as any)}
            className="rounded-md border-gray-300"
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {campaign.description && (
        <p className="text-gray-600">{campaign.description}</p>
      )}

      {campaign.resume_url && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-2">Campaign Resume</h3>
          <a
            href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/resumes/${campaign.resume_url}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            View Resume
          </a>
        </div>
      )}

      {/* Add Contacts Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-lg font-semibold mb-4">Add Contacts</h2>
        <div className="space-y-4">
          <select
            multiple
            value={selectedContacts}
            onChange={(e) => setSelectedContacts(Array.from(e.target.selectedOptions, option => option.value))}
            className="w-full rounded-md border-gray-300 h-32"
          >
            {availableContacts.map((contact) => (
              <option key={contact.id} value={contact.id}>
                {contact.name} ({contact.email})
              </option>
            ))}
          </select>
          <button
            onClick={addContactsToCampaign}
            disabled={!selectedContacts.length}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Add Selected Contacts
          </button>
        </div>
      </div>

      {/* Campaign Contacts List */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h2 className="text-lg font-semibold mb-4">Campaign Contacts</h2>
        <div className="space-y-4">
          {campaign.campaign_contacts?.map((cc) => (
            <div
              key={cc.id}
              className="flex justify-between items-center p-4 bg-gray-50 rounded-lg"
            >
              <div>
                <p className="font-medium">{cc.contact?.name}</p>
                <p className="text-sm text-gray-600">{cc.contact?.email}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`px-2 py-1 rounded-full text-xs ${
                  cc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  cc.status === 'sent' ? 'bg-blue-100 text-blue-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {cc.status}
                </span>
                <button
                  onClick={() => removeContactFromCampaign(cc.contact?.id || '')}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
