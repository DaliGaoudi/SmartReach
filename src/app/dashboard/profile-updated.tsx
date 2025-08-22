'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { stripeRedirect } from '@/app/pricing/actions';
import { getProducts } from '@/lib/supabase/db';
import PlanSelectionModal from '@/components/plan-selection-modal';
const isSoftLaunch = process.env.SOFT_LAUNCH === 'true';
import { formatUsageMessage } from '@/lib/subscription-limits-client';
import { getUsageStats } from './actions';
import { ProductWithPrice } from '@/types';

type ResumeFile = {
  name: string;
  id: string;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
  metadata: any;
};

export default function ProfileManager({ session }: { session: any }) {
  const supabase = createClient();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null, resume_path: string | null } | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [usageStats, setUsageStats] = useState<any>(null);
  const [resumeFiles, setResumeFiles] = useState<ResumeFile[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [gmailStatus, setGmailStatus] = useState<{ connected: boolean; loading: boolean }>({ connected: false, loading: true });
  const [savingName, setSavingName] = useState(false);
  const [nameChanged, setNameChanged] = useState(false);
  
  // New state for plan selection modal
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [products, setProducts] = useState<ProductWithPrice[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    const getOrCreateProfile = async () => {
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, resume_path')
        .eq('id', session.user.id)
        .single();

      if (data) {
        setProfile(data);
        return;
      }

      if (error && error.code === 'PGRST116') {
        const newProfile = {
          id: session.user.id,
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'New User'
        };

        const { error: createError } = await supabase.from('profiles').insert(newProfile);
        if (createError) {
          alert(`Error creating profile: ${createError.message}`);
        } else {
          setProfile({ ...newProfile, resume_path: null });
        }
      } else if (error) {
        alert(`Error fetching profile: ${error.message}`);
      }
    };
    getOrCreateProfile();
  }, [session?.user?.id, supabase]);

  useEffect(() => {
    const fetchSubscriptionAndUsage = async () => {
      if (!session?.user?.id) return;

      try {
        const [subscriptionData, usageData] = await Promise.all([
          supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', session.user.id)
            .single(),
          getUsageStats()
        ]);

        if (subscriptionData.data && !subscriptionData.error) {
          setSubscription(subscriptionData.data);
        }
        
        if (usageData) {
          setUsageStats(usageData);
        }
      } catch (error) {
        console.error('Error fetching subscription and usage:', error);
      }
    };
    fetchSubscriptionAndUsage();
  }, [session?.user?.id, supabase]);

  // New effect to fetch products when needed
  useEffect(() => {
    const fetchProducts = async () => {
      if (showPlanModal && products.length === 0) {
        setLoadingProducts(true);
        try {
          const productsData = await getProducts();
          setProducts(productsData);
        } catch (error) {
          console.error('Error fetching products:', error);
        } finally {
          setLoadingProducts(false);
        }
      }
    };
    fetchProducts();
  }, [showPlanModal, products.length]);

  useEffect(() => {
    const checkGmailStatus = async () => {
      if (!session?.user?.id) return;
      try {
        setGmailStatus(prev => ({ ...prev, loading: true }));
        const { data, error } = await supabase
          .from('user_tokens')
          .select('access_token, refresh_token, expires_at')
          .eq('user_id', session.user.id)
          .single();

        if (error && error.code !== 'PGRST116') console.error('Error checking Gmail status:', error);

        if (data && data.access_token) {
          const isExpired = data.expires_at && new Date(data.expires_at) < new Date();
          setGmailStatus({ connected: !isExpired, loading: false });
        } else {
          setGmailStatus({ connected: false, loading: false });
        }
      } catch (error) {
        console.error('Error in Gmail status check:', error);
        setGmailStatus({ connected: false, loading: false });
      }
    };
    checkGmailStatus();
    const timeoutId = setTimeout(checkGmailStatus, 2000);
    return () => clearTimeout(timeoutId);
  }, [session?.user?.id, supabase]);

  useEffect(() => {
    const fetchResumeFiles = async () => {
      if (!session?.user?.id) return;
      try {
        setLoadingResumes(true);
        const { data, error } = await supabase.storage.from('resumes').list(`${session.user.id}/`);
        if (error) console.error('Error fetching resume files:', error);
        else setResumeFiles(data || []);
      } catch (error) {
        console.error('Error fetching resume files:', error);
      } finally {
        setLoadingResumes(false);
      }
    };
    fetchResumeFiles();
  }, [session?.user?.id, supabase]);

  const connectGmail = async () => {
    try {
      // Use the site URL from environment variable instead of window.location.origin
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.smartsendr.org';
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          redirectTo: `${siteUrl}/auth/callback?next=/dashboard`,
          queryParams: { access_type: 'offline', prompt: 'consent' }
        },
      });
      if (error) throw error;
      if (data.url) window.location.href = data.url;
      else throw new Error('Failed to get OAuth URL');
    } catch (error) {
      alert(`Error connecting Gmail: ${(error as Error).message}`);
    }
  };

  const uploadResume = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!event.target.files || event.target.files.length === 0) throw new Error('You must select a file to upload.');
      const file = event.target.files[0];
      const filePath = `${session.user.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage.from('resumes').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { error: updateError } = await supabase.from('profiles').upsert({ id: session.user.id, resume_path: filePath, full_name: profile?.full_name || '' });
      if (updateError) throw updateError;
      alert('Resume uploaded successfully!');
      router.refresh();
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const selectResume = async (fileName: string) => {
    try {
      const filePath = `${session.user.id}/${fileName}`;
      const { error: updateError } = await supabase.from('profiles').upsert({ id: session.user.id, resume_path: filePath, full_name: profile?.full_name || '' });
      if (updateError) throw updateError;
      setProfile(prev => prev ? { ...prev, resume_path: filePath } : null);
      alert('Resume selected successfully!');
    } catch (error) {
      alert(`Error selecting resume: ${(error as Error).message}`);
    }
  };

  const deleteResume = async (fileName: string) => {
    if (!confirm(`Are you sure you want to delete "${fileName}"?`)) return;
    try {
      const filePath = `${session.user.id}/${fileName}`;
      const { error: deleteError } = await supabase.storage.from('resumes').remove([filePath]);
      if (deleteError) throw deleteError;
      if (profile?.resume_path === filePath) {
        const { error: updateError } = await supabase.from('profiles').upsert({ id: session.user.id, resume_path: null, full_name: profile?.full_name || '' });
        if (updateError) throw updateError;
        setProfile(prev => prev ? { ...prev, resume_path: null } : null);
      }
      setResumeFiles(prev => prev.filter(file => file.name !== fileName));
      alert('Resume deleted successfully!');
    } catch (error) {
      alert(`Error deleting resume: ${(error as Error).message}`);
    }
  };

  // Updated handleManageBilling function
  const handleManageBilling = () => {
    if (isSoftLaunch) {
      // During soft launch, redirect to waitlist instead of Stripe
      window.location.href = '/waitlist';
      return;
    }

    // If user already has a subscription, go to Stripe billing portal
    if (subscription) {
      startTransition(async () => {
        try {
          const { url } = await stripeRedirect('/dashboard/profile');
          if (url) window.location.href = url;
        } catch (error) {
          alert(`Error redirecting to billing: ${(error as Error).message}`);
        }
      });
    } else {
      // If no subscription, show plan selection modal
      setShowPlanModal(true);
    }
  };

  const getResumeFileName = (path: string) => path.split('/').pop();
  const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString();

  const saveFullName = async () => {
    if (!profile?.full_name || !session?.user?.id) return;
    
    try {
      setSavingName(true);
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: profile.full_name })
        .eq('id', session.user.id);
      
      if (error) throw error;
      
      setNameChanged(false);
      alert('Name saved successfully!');
    } catch (error) {
      alert(`Error saving name: ${(error as Error).message}`);
    } finally {
      setSavingName(false);
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfile(prev => prev ? { ...prev, full_name: e.target.value } : null);
    setNameChanged(true);
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-8 bg-black min-h-screen">
      <div className="max-w-7xl mx-auto">

        {/* Top Section: Account Settings and Billing */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          
          {/* Account Settings Card */}
          <div className="bg-black border border-zinc-700/50 rounded-xl shadow-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white">Account Settings</h2>
              <p className="mt-1 text-zinc-300">Manage your profile and connection settings.</p>
            </div>
            <div className="border-t border-zinc-700/50 p-6 space-y-6">
              <div>
                <label htmlFor="full_name" className="block text-sm font-medium text-zinc-300">Full Name</label>
                <div className="mt-1 flex gap-2">
                  <input 
                    type="text" 
                    id="full_name" 
                    value={profile?.full_name || ''} 
                    onChange={handleNameChange}
                    className="flex-1 bg-zinc-700/50 border-zinc-600 rounded-md shadow-sm focus:ring-pink-500 focus:border-pink-500 sm:text-sm text-white" 
                  />
                  {nameChanged && (
                    <button
                      onClick={saveFullName}
                      disabled={savingName}
                      className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                    >
                      {savingName ? 'Saving...' : 'Save'}
                    </button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300">Email</label>
                <p className="mt-1 text-sm text-zinc-300">{session.user.email}</p>
              </div>
            </div>
          </div>

          {/* Billing Settings Card */}
          <div className="bg-black border border-zinc-700/50 rounded-xl shadow-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white">Billing & Subscription</h2>
              <p className="mt-1 text-zinc-300">Manage your subscription and view payment history.</p>
            </div>
            <div className="border-t border-zinc-700/50 p-6 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-zinc-300">Current Plan</p>
                  <p className="text-white font-medium">{subscription ? 'Pro Plan' : 'Free Plan'}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-zinc-300">Status</p>
                  <p className="text-green-400 font-medium">{subscription ? 'Active' : 'Free'}</p>
                </div>
              </div>
              <button 
                onClick={handleManageBilling} 
                disabled={isPending}
                className="w-full inline-flex items-center justify-center h-10 px-6 rounded-xl bg-pink-500 text-zinc-50 font-semibold text-base shadow-md hover:bg-pink-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isPending ? 'Loading...' : (subscription ? 'Manage Billing' : 'Upgrade Plan')}
              </button>
            </div>
          </div>
        </div>

        {/* Usage Statistics Card */}
        {usageStats && (
          <div className="bg-black border border-zinc-700/50 rounded-xl shadow-lg overflow-hidden">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-white">Usage Statistics</h2>
              <p className="mt-1 text-zinc-300">Track your email usage and plan limits.</p>
            </div>
            <div className="border-t border-zinc-700/50 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-zinc-300">Email Usage</h3>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      usageStats.isPremium 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-blue-500/20 text-blue-400'
                    }`}>
                      {usageStats.isPremium ? 'Premium' : 'Free'}
                    </span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-400">Used this month:</span>
                      <span className="text-white font-medium">{usageStats.emailsUsed}</span>
                    </div>
                    {!usageStats.isPremium && (
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Remaining:</span>
                        <span className="text-white font-medium">{usageStats.emailsRemaining}</span>
                      </div>
                    )}
                    <div className="text-xs text-zinc-500">
                      {formatUsageMessage(usageStats)}
                    </div>
                  </div>
                </div>
                
                <div className="bg-zinc-800/50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-zinc-300">Plan Features</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-zinc-300">AI Email Generation</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-zinc-300">Direct Gmail Sending</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-zinc-300">Contact Management</span>
                    </div>
                    {usageStats.isPremium && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
                        <span className="text-pink-400 font-medium">Unlimited Emails</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Gmail Connection Card */}
        <div className="bg-black border border-zinc-700/50 rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white">Gmail Connection</h2>
            <p className="mt-1 text-zinc-300">Connect your Gmail account to send personalized emails directly.</p>
          </div>
          <div className="border-t border-zinc-700/50 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`w-3 h-3 rounded-full mr-3 ${gmailStatus.connected ? 'bg-green-400' : 'bg-red-400'}`}></div>
                <div>
                  <p className="text-white font-medium">
                    {gmailStatus.loading ? 'Checking...' : gmailStatus.connected ? 'Connected' : 'Not Connected'}
                  </p>
                  <p className="text-sm text-zinc-400">
                    {gmailStatus.connected ? 'Your Gmail account is connected and ready to use.' : 'Connect your Gmail to start sending emails.'}
                  </p>
                </div>
              </div>
              {!gmailStatus.connected && !gmailStatus.loading && (
                <button 
                  onClick={connectGmail}
                  className="inline-flex items-center justify-center h-10 px-6 rounded-xl bg-blue-500 text-zinc-50 font-semibold text-base shadow-md hover:bg-blue-600 transition-colors duration-200"
                >
                  Connect Gmail
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Resume Management Card */}
        <div className="bg-black border border-zinc-700/50 rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white">Resume Management</h2>
            <p className="mt-1 text-zinc-300">Upload and manage your resume for personalized email generation.</p>
          </div>
          <div className="border-t border-zinc-700/50 p-6 space-y-6">
            <div>
              <label htmlFor="resume" className="block text-sm font-medium text-zinc-300 mb-2">Upload New Resume</label>
              <input 
                type="file" 
                id="resume" 
                accept=".pdf,.doc,.docx" 
                onChange={uploadResume} 
                disabled={uploading}
                className="block w-full text-sm text-zinc-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pink-500 file:text-white hover:file:bg-pink-600 file:cursor-pointer cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" 
              />
              {uploading && <p className="mt-2 text-sm text-zinc-400">Uploading...</p>}
            </div>
            
            {loadingResumes ? (
              <p className="text-zinc-400">Loading resumes...</p>
            ) : resumeFiles.length > 0 ? (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Your Resumes</h3>
                <div className="space-y-3">
                  {resumeFiles.map((file) => (
                    <div key={file.name} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-white font-medium">{file.name}</p>
                        <p className="text-sm text-zinc-400">
                          Uploaded: {formatDate(file.created_at)}
                          {profile?.resume_path === `${session.user.id}/${file.name}` && (
                            <span className="ml-2 px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded-full">Active</span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {profile?.resume_path !== `${session.user.id}/${file.name}` && (
                          <button
                            onClick={() => selectResume(file.name)}
                            className="px-3 py-1 bg-pink-500 text-white text-sm rounded-md hover:bg-pink-600 transition-colors"
                          >
                            Select
                          </button>
                        )}
                        <button
                          onClick={() => deleteResume(file.name)}
                          className="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-zinc-400">No resumes uploaded yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Plan Selection Modal */}
      <PlanSelectionModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        products={products}
        currentSubscription={subscription}
      />
    </div>
  );
}

