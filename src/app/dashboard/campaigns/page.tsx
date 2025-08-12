'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { Campaign } from '@/types/campaign';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const fetchCampaigns = async () => {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCampaigns(data);
    }
  };

  const createCampaign = async (formData: FormData) => {
    setIsLoading(true);
    
    try {
      const name = formData.get('name') as string;
      const description = formData.get('description') as string;
      const resumeFile = formData.get('resume') as File;

      // Upload resume if provided
      let resume_url = null;
      if (resumeFile && resumeFile.size > 0) {
        const { data: uploadData, error: uploadError } = await supabase
          .storage
          .from('resumes')
          .upload(`campaigns/${Date.now()}-${resumeFile.name}`, resumeFile);

        if (uploadError) throw uploadError;
        resume_url = uploadData?.path;
      }

      // Create campaign
      const { data, error } = await supabase
        .from('campaigns')
        .insert({
          name,
          description,
          resume_url,
          status: 'active'
        })
        .select()
        .single();

      if (error) throw error;

      // Navigate to campaign detail page
      router.push(`/dashboard/campaigns/${data.id}`);
    } catch (error) {
      console.error('Error creating campaign:', error);
      // Show error notification
    } finally {
      setIsLoading(false);
      setIsCreateModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          Create Campaign
        </button>
      </div>

      {/* Campaign List */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            className="bg-white p-6 rounded-lg shadow-sm border hover:shadow-md transition-shadow"
            onClick={() => router.push(`/dashboard/campaigns/${campaign.id}`)}
          >
            <h3 className="font-semibold text-lg mb-2">{campaign.name}</h3>
            {campaign.description && (
              <p className="text-gray-600 text-sm mb-4">{campaign.description}</p>
            )}
            <div className="flex justify-between items-center">
              <span className={`px-2 py-1 rounded-full text-xs ${
                campaign.status === 'active' ? 'bg-green-100 text-green-800' :
                campaign.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {campaign.status}
              </span>
              <span className="text-xs text-gray-500">
                {new Date(campaign.created_at).toLocaleDateString()}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Create Campaign Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-4">Create New Campaign</h2>
            <form action={createCampaign} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Campaign Name
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Resume (PDF)
                </label>
                <input
                  type="file"
                  name="resume"
                  accept=".pdf"
                  className="mt-1 block w-full text-sm text-gray-500
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-full file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
              </div>

              <div className="flex justify-end gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Creating...' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
