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

export default function ProfileManager({ session }) {
  const supabase = createClient();
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const [profile, setProfile] = useState<{ full_name: string | null, resume_path: string | null } | null>(null);
  const [resumeFiles, setResumeFiles] = useState<ResumeFile[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [gmailStatus, setGmailStatus] = useState<{ connected: boolean; loading: boolean }>({ connected: false, loading: true });
  const [savingName, setSavingName] = useState(false);
  const [nameChanged, setNameChanged] = useState(false);

  useEffect(() => {
    const getOrCreateProfile = async () => {
      if (!session?.user?.id) return;

      let { data, error } = await supabase
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
      <div className="max-w-4xl mx-auto">

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
        <div className="mt-8 bg-black border border-zinc-700/50 rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white">Billing</h2>
            <p className="mt-1 text-zinc-300">Manage your subscription and view payment history.</p>
          </div>
          <div className="border-t border-zinc-700/50 p-6 flex justify-end">
            <button onClick={handleManageBilling} className="inline-flex items-center justify-center h-10 px-6 rounded-xl bg-pink-500 text-zinc-50 font-semibold text-base shadow-md hover:bg-pink-600 transition-colors duration-200">
              Manage Billing
            </button>
          </div>
        </div>

        {/* Gmail Connection Card */}
        <div className="mt-8 bg-black border border-zinc-700/50 rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white">Gmail Connection</h2>
            <p className="mt-1 text-zinc-300">Connect your Gmail account to send emails directly.</p>
          </div>
          <div className="border-t border-zinc-700/50 p-6">
            {gmailStatus.loading ? (
              <p className="text-zinc-300">Checking status...</p>
            ) : gmailStatus.connected ? (
              <div className="flex items-center justify-between">
                <p className="text-green-400">Gmail Connected Successfully</p>
                <button onClick={connectGmail} className="font-semibold text-pink-500 hover:text-pink-400">Reconnect</button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-yellow-400">Gmail Not Connected</p>
                <button onClick={connectGmail} className="inline-flex items-center justify-center h-10 px-6 rounded-xl bg-pink-500 text-zinc-50 font-semibold text-base shadow-md hover:bg-pink-600 transition-colors duration-200">
                  Connect Gmail
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Resume Management Card */}
        <div className="mt-8 bg-black border border-zinc-700/50 rounded-xl shadow-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-white">Resume Management</h2>
            <p className="mt-1 text-zinc-300">Upload and manage your resumes to personalize your outreach.</p>
            <div className="mt-4">
              <label htmlFor="resume" className="inline-flex items-center justify-center h-10 px-6 rounded-xl bg-zinc-600 text-zinc-50 font-semibold text-base shadow-md hover:bg-zinc-700 transition-colors duration-200 cursor-pointer">
                {uploading ? 'Uploading...' : 'Upload New Resume'}
              </label>
              <input type="file" id="resume" className="hidden" onChange={uploadResume} disabled={uploading} accept=".pdf" />
              <p className="text-xs text-zinc-500 mt-2">Selected Resume: {profile?.resume_path ? getResumeFileName(profile.resume_path) : 'None'}</p>
            </div>
          </div>
          {loadingResumes ? (
            <div className="border-t border-zinc-700/50 p-6 text-zinc-300">Loading resumes...</div>
          ) : resumeFiles.length > 0 && (
            <div className="border-t border-zinc-700/50">
              <ul className="divide-y divide-zinc-700/50">
                {resumeFiles.map((file) => (
                  <li key={file.id} className="p-6 flex items-center justify-between hover:bg-zinc-800/30">
                    <div>
                      <p className="font-medium text-white">{file.name}</p>
                      <p className="text-sm text-zinc-300">Uploaded on {formatDate(file.created_at)}</p>
                    </div>
                    <div className="space-x-2">
                      <button onClick={() => selectResume(file.name)} disabled={profile?.resume_path?.endsWith(file.name)} className="px-3 py-1 text-sm font-semibold text-white bg-pink-500 rounded-md disabled:bg-zinc-600 disabled:cursor-not-allowed hover:bg-pink-600">
                        {profile?.resume_path?.endsWith(file.name) ? 'Selected' : 'Select'}
                      </button>
                      <button onClick={() => deleteResume(file.name)} className="px-3 py-1 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700">
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

      </div>
    </div>
  );
} 