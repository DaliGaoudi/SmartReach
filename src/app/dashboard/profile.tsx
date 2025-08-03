'use client';

import { createClient } from '@/lib/supabase/client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { stripeRedirect } from '@/app/pricing/actions';

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
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null, resume_path: string | null } | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [resumeFiles, setResumeFiles] = useState<ResumeFile[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [gmailStatus, setGmailStatus] = useState<{ connected: boolean; loading: boolean }>({ connected: false, loading: true });
  const [savingName, setSavingName] = useState(false);
  const [nameChanged, setNameChanged] = useState(false);

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
    const fetchSubscription = async () => {
      if (!session?.user?.id) return;

      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (data && !error) {
        setSubscription(data);
      }
    };
    fetchSubscription();
  }, [session?.user?.id, supabase]);

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
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
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

  const handleManageBilling = async () => {
    try {
      const { url } = await stripeRedirect('/dashboard/profile');
      if (url) window.location.href = url;
    } catch (error) {
      alert(`Error redirecting to billing: ${(error as Error).message}`);
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
              <button onClick={handleManageBilling} className="w-full inline-flex items-center justify-center h-10 px-6 rounded-xl bg-pink-500 text-zinc-50 font-semibold text-base shadow-md hover:bg-pink-600 transition-colors duration-200">
                {subscription ? 'Manage Billing' : 'Upgrade Plan'}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section: Integration & Personalization */}
        <div className="bg-black border border-zinc-700/50 rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white">Integration & Personalization</h2>
            <p className="mt-1 text-zinc-300">Connect your Gmail account and manage your resume for personalized outreach.</p>
          </div>
          
          <div className="border-t border-zinc-700/50">
            
            {/* Gmail Connection Section */}
            <div className="p-6 border-b border-zinc-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Gmail Connection</h3>
                    <p className="text-sm text-zinc-300">Connect your Gmail account to send emails directly</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {gmailStatus.loading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-zinc-300">Checking...</span>
                    </div>
                  ) : gmailStatus.connected ? (
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-sm text-green-400 font-medium">Connected</span>
                      </div>
                      <button onClick={connectGmail} className="text-sm text-pink-500 hover:text-pink-400 font-medium">
                        Reconnect
                      </button>
                    </div>
                  ) : (
                    <button onClick={connectGmail} className="inline-flex items-center justify-center h-10 px-6 rounded-xl bg-pink-500 text-zinc-50 font-semibold text-sm shadow-md hover:bg-pink-600 transition-colors duration-200">
                      Connect Gmail
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Resume Management Section */}
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Resume Management</h3>
                    <p className="text-sm text-zinc-300">Upload and manage your resumes for personalized outreach</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label htmlFor="resume" className="inline-flex items-center justify-center h-10 px-6 rounded-xl bg-zinc-600 text-zinc-50 font-semibold text-sm shadow-md hover:bg-zinc-700 transition-colors duration-200 cursor-pointer">
                    {uploading ? 'Uploading...' : 'Upload Resume'}
                  </label>
                  <input type="file" id="resume" className="hidden" onChange={uploadResume} disabled={uploading} accept=".pdf" />
                </div>
              </div>

              {/* Current Resume Status */}
              <div className="bg-zinc-800/30 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-300">Selected Resume</p>
                    <p className="text-white font-medium">
                      {profile?.resume_path ? getResumeFileName(profile.resume_path) : 'None selected'}
                    </p>
                  </div>
                  {profile?.resume_path && (
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-sm text-green-400">Active</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Resume Files List */}
              {loadingResumes ? (
                <div className="text-center py-8">
                  <div className="w-6 h-6 border-2 border-zinc-600 border-t-pink-500 rounded-full animate-spin mx-auto mb-2"></div>
                  <p className="text-sm text-zinc-300">Loading resumes...</p>
                </div>
              ) : resumeFiles.length > 0 ? (
                <div>
                  <h4 className="text-sm font-medium text-zinc-300 mb-3">Uploaded Resumes</h4>
                  <div className="space-y-2">
                    {resumeFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 bg-zinc-800/20 rounded-lg hover:bg-zinc-800/40 transition-colors">
                        <div className="flex items-center gap-3">
                          <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-white">{file.name}</p>
                            <p className="text-xs text-zinc-400">Uploaded {formatDate(file.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => selectResume(file.name)} 
                            disabled={profile?.resume_path?.endsWith(file.name)} 
                            className="px-3 py-1 text-xs font-medium text-white bg-pink-500 rounded-md disabled:bg-zinc-600 disabled:cursor-not-allowed hover:bg-pink-600 transition-colors"
                          >
                            {profile?.resume_path?.endsWith(file.name) ? 'Selected' : 'Select'}
                          </button>
                          <button 
                            onClick={() => deleteResume(file.name)} 
                            className="px-3 py-1 text-xs font-medium text-white bg-red-600 rounded-md hover:bg-red-700 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-zinc-600 rounded-lg">
                  <svg className="w-12 h-12 text-zinc-500 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-sm text-zinc-400">No resumes uploaded yet</p>
                  <p className="text-xs text-zinc-500 mt-1">Upload your first resume to get started with personalized outreach</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
} 