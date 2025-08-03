'use client';

import { useEffect, useState, useTransition } from 'react';
import { createClient } from '@/lib/supabase/client';
import Papa from 'papaparse';
import { stripeRedirect } from '@/app/pricing/actions';

type Contact = {
  id: string;
  name: string;
  email: string;
  company?: string;
  created_at: string;
  sent_at?: string;
};

type EmailPreview = {
  contactId: string;
  contactName: string;
  contactEmail: string;
  contactCompany?: string;
  preview: string;
  editedContent: string;
  isPersonalized: boolean;
  isEditing: boolean;
};

export default function ContactsListPage() {
  const [isPending, startTransition] = useTransition();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedContacts, setSelectedContacts] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [sendStatus, setSendStatus] = useState<string | null>(null);
  const [gmailConnected, setGmailConnected] = useState(false);
  
  // State for the modal
  const [isModalOpen, setModalOpen] = useState(false);
  const [isPreviewLoading, setPreviewLoading] = useState(false);
  const [hasResume, setHasResume] = useState(false);
  
  // Enhanced state for multiple previews with individual editing
  const [emailPreviews, setEmailPreviews] = useState<EmailPreview[]>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);

  // State for add contact modal
  const [isAddContactModalOpen, setAddContactModalOpen] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    company: ''
  });
  const [addContactMode, setAddContactMode] = useState<'choice' | 'manual' | 'csv'>('choice');

  // CSV upload state
  const [csvContacts, setCsvContacts] = useState<{ name: string; email: string; company?: string }[]>([]);
  const [csvFileName, setCsvFileName] = useState('');
  const [csvMessage, setCsvMessage] = useState<string | null>(null);
  const [csvLoading, setCsvLoading] = useState(false);

  // State for tabs
  const [activeTab, setActiveTab] = useState<'contacts' | 'settings'>('contacts');
  
  // Settings state
  const [profile, setProfile] = useState<{ full_name: string | null, resume_path: string | null } | null>(null);
  const [subscription, setSubscription] = useState<any>(null);
  const [resumeFiles, setResumeFiles] = useState<any[]>([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [nameChanged, setNameChanged] = useState(false);

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedContacts(contacts.map(c => c.id));
    } else {
      setSelectedContacts([]);
    }
  };

  const handleSelectOne = (event: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (event.target.checked) {
      setSelectedContacts([...selectedContacts, id]);
    } else {
      setSelectedContacts(selectedContacts.filter(contactId => contactId !== id));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedContacts.length === 0) return;
    
    if (!confirm(`Are you sure you want to delete ${selectedContacts.length} contact(s)? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        throw new Error('Could not get current user. Please log in again.');
      }

      const { error: deleteError } = await supabase
        .from('contacts')
        .delete()
        .in('id', selectedContacts)
        .eq('user_id', session.user.id);

      if (deleteError) {
        throw new Error(`Error deleting contacts: ${deleteError.message}`);
      }

      // Remove deleted contacts from local state
      setContacts(prev => prev.filter(contact => !selectedContacts.includes(contact.id)));
      setSelectedContacts([]);
      setSendStatus(`${selectedContacts.length} contact(s) deleted successfully!`);
      
      // Clear status after 3 seconds
      setTimeout(() => setSendStatus(null), 3000);
    } catch (error: any) {
      setSendStatus(`Error: ${error.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddContact = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newContact.name || !newContact.email) {
      setError('Name and email are required.');
      return;
    }

    setIsAddingContact(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setError('Could not get current user. Please log in again.');
        setIsAddingContact(false);
        return;
      }

      const { error } = await supabase.from('contacts').insert({
        name: newContact.name,
        email: newContact.email,
        company: newContact.company || null,
        user_id: session.user.id
      });

      if (error) {
        setError('Error adding contact: ' + error.message);
      } else {
        setNewContact({ name: '', email: '', company: '' });
        setAddContactModalOpen(false);
        setAddContactMode('choice');
        await fetchContacts();
      }
    } catch (err: any) {
      setError('Unexpected error: ' + err.message);
    }
    setIsAddingContact(false);
  };

  // CSV upload handling functions
  const fetchContacts = async () => {
    const supabase = createClient();
    
    // Debug: Log environment variables (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('Environment check:', {
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20),
        anonKeyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20)
      });
    }
    
    // First, try to get the session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Session error:', sessionError);
      setError('Could not get current user. Please log in again.');
      setLoading(false);
      return;
    }

    // If no session, try to get user (for backward compatibility)
    if (!session) {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError('Could not get current user. Please log in again.');
        setLoading(false);
        return;
      }
      
      // Use user.id if session is not available
      const userId = user.id;
      
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, email, company, created_at, sent_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      if (error) {
        console.error('Database error:', error);
        setError('Error fetching contacts: ' + error.message);
      } else {
        setContacts(data as Contact[]);
      }
      setLoading(false);
      return;
    }

    // Use session user
    const { data, error } = await supabase
      .from('contacts')
      .select('id, name, email, company, created_at, sent_at')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Database error:', error);
      setError('Error fetching contacts: ' + error.message);
    } else {
      setContacts(data as Contact[]);
    }
    setLoading(false);
  };

  const handleCsvFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setCsvFileName(file.name);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          // Only keep name, email, and company columns
          const filtered = (results.data as any[]).map(row => ({
            name: row.name || '',
            email: row.email || '',
            company: row.company || '',
          })).filter(row => row.name && row.email);
          setCsvContacts(filtered);
          setCsvMessage(null);
        },
      });
    }
  };

  const handleCsvUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (csvContacts.length === 0) {
      setCsvMessage('No valid contacts found in CSV file.');
      return;
    }

    setCsvLoading(true);
    setCsvMessage(null);
    try {
      const supabase = createClient();
      // Get current user
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        setCsvMessage('Could not get current user. Please log in again.');
        setCsvLoading(false);
        return;
      }

      // Insert contacts with user_id
      const { error } = await supabase.from('contacts').insert(
        csvContacts.map(c => ({ ...c, user_id: session.user.id }))
      );
      if (error) {
        console.error('Supabase insert error:', error);
        setCsvMessage('Error uploading contacts: ' + error.message);
      } else {
        setCsvMessage('Contacts uploaded successfully!');
        setCsvContacts([]);
        setCsvFileName('');
        
        // Refresh contacts list
        await fetchContacts();
        
        // Close modal after successful upload
        setTimeout(() => {
          setAddContactModalOpen(false);
          setAddContactMode('choice');
          setCsvMessage(null);
        }, 2000);
      }
    } catch (err: any) {
      setCsvMessage('Unexpected error: ' + err.message);
      console.error('Unexpected error:', err);
    }
    setCsvLoading(false);
  };
  
  // Opens the modal and generates previews for all selected contacts
  const handleOpenAndPreview = async () => {
    if (selectedContacts.length === 0) return;
    setModalOpen(true);
    setPreviewLoading(true);
    setEmailPreviews([]);
    setCurrentPreviewIndex(0);
    
    try {
      // Get the selected contacts data
      const selectedContactsData = contacts.filter(c => selectedContacts.includes(c.id));
      
      // Generate previews for all selected contacts
      const previews: EmailPreview[] = [];
      let hasAnyResume = false;
      
      for (const contact of selectedContactsData) {
        try {
          const response = await fetch('/api/generate-preview', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              contactId: contact.id
            }),
          });
          
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || 'Failed to generate preview.');
          
          previews.push({
            contactId: contact.id,
            contactName: contact.name,
            contactEmail: contact.email,
            contactCompany: contact.company,
            preview: data.preview,
            editedContent: data.preview, // Initialize editedContent with preview
            isPersonalized: data.hasResume || false,
            isEditing: false // Not editing initially
          });
          
          if (data.hasResume) {
            hasAnyResume = true;
          }
        } catch (error: any) {
          // If preview generation fails for a contact, add a placeholder
          previews.push({
            contactId: contact.id,
            contactName: contact.name,
            contactEmail: contact.email,
            contactCompany: contact.company,
            preview: `Error generating preview: ${error.message}`,
            editedContent: `Error generating preview: ${error.message}`, // Placeholder for error
            isPersonalized: false,
            isEditing: false
          });
        }
      }
      
      setEmailPreviews(previews);
      setHasResume(hasAnyResume);
      
      // Set the first preview as the current one
      if (previews.length > 0) {
        setCurrentPreviewIndex(0);
      }
    } catch (error: any) {
      // setPreviewContent(`Error: ${error.message}`); // This line is no longer needed
      // setEditedContent(`Error: ${error.message}`); // This line is no longer needed
    }
    setPreviewLoading(false);
  };
  
  // Navigate to a specific preview
  const goToPreview = (index: number) => {
    if (index >= 0 && index < emailPreviews.length) {
      setCurrentPreviewIndex(index);
    }
  };



  // This function sends all emails after confirmation
  const handleConfirmAndSend = async () => {
    if (!gmailConnected) {
      alert('Gmail is not connected. Please connect your Gmail account in your profile first.');
      return;
    }
    
    setModalOpen(false);
    setIsSending(true);
    setSendStatus('Sending emails, please wait...');
    try {
      // Create individual messages object
      const individualMessages: { [key: string]: string } = {};
      emailPreviews.forEach(preview => {
        individualMessages[preview.contactId] = preview.editedContent || preview.preview;
      });

      const response = await fetch('/api/send-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contactIds: selectedContacts,
          individualMessages: individualMessages
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to send emails.');
      
      const successfulSends = data.results.filter((r: any) => r.success).length;
      
      // Update local state to mark contacts as sent
      if (successfulSends > 0) {
        const now = new Date().toISOString();
        setContacts(prev => prev.map(contact => 
          selectedContacts.includes(contact.id) 
            ? { ...contact, sent_at: now }
            : contact
        ));
      }
      
      setSendStatus(`${successfulSends} of ${selectedContacts.length} emails sent successfully!`);
      setSelectedContacts([]);
    } catch (error: any) {
      setSendStatus(`Error: ${error.message}`);
    }
    setIsSending(false);
  };

  useEffect(() => {
    const loadContacts = async () => {
      // Add a small delay to allow session to sync after OAuth redirect
      await new Promise(resolve => setTimeout(resolve, 100));
      await fetchContacts();
    };
    
    loadContacts();
  }, []);

  useEffect(() => {
    const checkGmailStatus = async () => {
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) return;

      try {
        const { data: tokens, error: tokenError } = await supabase
          .from('user_tokens')
          .select('access_token, refresh_token, expires_at')
          .eq('user_id', session.user.id)
          .eq('provider', 'google')
          .single();

        if (tokens && tokens.access_token) {
          // Check if token is still valid (not expired)
          const isExpired = tokens.expires_at && new Date(tokens.expires_at) < new Date();
          
          if (isExpired && tokens.refresh_token) {
            // Token is expired but we have a refresh token - try to refresh it
            try {
              const response = await fetch('/api/refresh-gmail-token', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ user_id: session.user.id }),
              });
              
              if (response.ok) {
                setGmailConnected(true);
                return;
              }
            } catch (refreshError) {
              console.error('Failed to refresh Gmail token:', refreshError);
            }
          }
          
          setGmailConnected(!isExpired);
        } else {
          setGmailConnected(false);
        }
      } catch (error) {
        console.error('Error checking Gmail status:', error);
        setGmailConnected(false);
      }
    };

    checkGmailStatus();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getSelectedStats = () => {
    const selected = contacts.filter(c => selectedContacts.includes(c.id));
    const sentCount = selected.filter(c => c.sent_at).length;
    const unsentCount = selected.length - sentCount;
    return { sentCount, unsentCount };
  };

  // Settings functions
  const connectGmail = async () => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/gmail.send https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/contacts`,
          queryParams: { 
            access_type: 'offline', 
            prompt: 'consent',
            include_granted_scopes: 'true'
          }
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
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');
      
      const filePath = `${user.id}/${file.name}`;
      const { error: uploadError } = await supabase.storage.from('resumes').upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { error: updateError } = await supabase.from('profiles').upsert({ id: user.id, resume_path: filePath, full_name: profile?.full_name || '' });
      if (updateError) throw updateError;
      alert('Resume uploaded successfully!');
      window.location.reload();
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const selectResume = async (fileName: string) => {
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');
      
      const filePath = `${user.id}/${fileName}`;
      const { error: updateError } = await supabase.from('profiles').upsert({ id: user.id, resume_path: filePath, full_name: profile?.full_name || '' });
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
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');
      
      const filePath = `${user.id}/${fileName}`;
      const { error: deleteError } = await supabase.storage.from('resumes').remove([filePath]);
      if (deleteError) throw deleteError;
      if (profile?.resume_path === filePath) {
        const { error: updateError } = await supabase.from('profiles').upsert({ id: user.id, resume_path: null, full_name: profile?.full_name || '' });
        if (updateError) throw updateError;
        setProfile(prev => prev ? { ...prev, resume_path: null } : null);
      }
      setResumeFiles(prev => prev.filter(file => file.name !== fileName));
      alert('Resume deleted successfully!');
    } catch (error) {
      alert(`Error deleting resume: ${(error as Error).message}`);
    }
  };

  const saveFullName = async () => {
    if (!profile?.full_name) return;
    
    try {
      setSavingName(true);
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('User not authenticated');
      
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: profile.full_name })
        .eq('id', user.id);
      
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

  const handleManageBilling = () => {
    startTransition(async () => {
      try {
        const { url } = await stripeRedirect('/dashboard/contacts');
        if (url) window.location.href = url;
      } catch (error) {
        alert(`Error redirecting to billing: ${(error as Error).message}`);
      }
    });
  };

  const getResumeFileName = (path: string) => path.split('/').pop();

  // Add useEffect for loading profile and resume data
  useEffect(() => {
    const loadProfileData = async () => {
      const supabase = createClient();
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) return;

      // Load profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, resume_path')
        .eq('id', session.user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
      }

      // Load subscription
      const { data: subscriptionData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (subscriptionData) {
        setSubscription(subscriptionData);
      }

      // Load resume files
      try {
        setLoadingResumes(true);
        const { data: resumeData } = await supabase.storage.from('resumes').list(`${session.user.id}/`);
        setResumeFiles(resumeData || []);
      } catch (error) {
        console.error('Error loading resumes:', error);
      } finally {
        setLoadingResumes(false);
      }
    };

    loadProfileData();
  }, []);

  return (
    <div className="max-w-7xl mx-auto py-10 px-4">
      
      {/* Tab Navigation */}
      <div className="flex border-b border-zinc-200 mb-8">
        <button
          onClick={() => setActiveTab('contacts')}
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'contacts'
              ? 'border-pink-500 text-pink-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Contacts
          </div>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-6 py-3 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'settings'
              ? 'border-pink-500 text-pink-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </div>
        </button>
      </div>

      {/* Contacts Tab Content */}
      {activeTab === 'contacts' && (
        <>
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold text-pink-500">Your Contacts</h1>
            <div className="flex gap-2">
              <button 
                onClick={() => setAddContactModalOpen(true)}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-blue-500 px-4 text-sm font-medium text-white shadow hover:bg-blue-600 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Contact
              </button>
              {selectedContacts.length > 0 && (
                <>
                  <button 
                    onClick={handleDeleteSelected}
                    disabled={isDeleting}
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-red-500 px-4 text-sm font-medium text-white shadow hover:bg-red-600 transition-colors disabled:opacity-50"
                  >
                    {isDeleting ? 'Deleting...' : `Delete ${selectedContacts.length} contact(s)`}
                  </button>
                  <button 
                    onClick={handleOpenAndPreview}
                    disabled={isSending}
                    className="inline-flex h-10 items-center justify-center rounded-lg bg-green-500 px-4 text-sm font-medium text-white shadow hover:bg-green-600 transition-colors disabled:opacity-50"
                  >
                    {isSending ? 'Sending...' : `Preview Email for ${selectedContacts.length} contact(s)`}
                  </button>
                </>
              )}
            </div>
          </div>
      
             {/* Selection Stats */}
       {selectedContacts.length > 0 && (
         <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg shadow-sm">
           <div className="flex items-center gap-6 text-sm">
             <span className="font-semibold text-blue-800">
               {selectedContacts.length} contact(s) selected
             </span>
             {(() => {
               const { sentCount, unsentCount } = getSelectedStats();
               return (
                 <>
                   {sentCount > 0 && (
                     <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-blue-100 text-blue-700 rounded-full font-medium">
                       <div className="w-1 h-1 bg-blue-500 rounded-full"></div>
                       {sentCount} already emailed
                     </span>
                   )}
                   {unsentCount > 0 && (
                     <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs bg-green-100 text-green-700 rounded-full font-medium">
                       <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                       {unsentCount} ready to email
                     </span>
                   )}
                 </>
               );
             })()}
           </div>
         </div>
       )}
      
      {/* Gmail Status Alert */}
      {!gmailConnected && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
            <span className="text-yellow-800 font-medium">Gmail not connected</span>
          </div>
          <p className="text-sm text-yellow-700 mt-1">
            Connect your Gmail account in your profile to send emails.
          </p>
        </div>
      )}
      
      {sendStatus && <div className="mb-4 text-center text-sm">{sendStatus}</div>}
      
      {/* Add Contact Modal */}
      {isAddContactModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-zinc-800">Add New Contact</h2>
            
            {addContactMode === 'choice' && (
              <div className="space-y-4">
                <p className="text-sm text-zinc-600 mb-4">Choose how you&apos;d like to add contacts:</p>
                
                <button
                  onClick={() => setAddContactMode('manual')}
                  className="w-full p-4 border-2 border-zinc-200 rounded-lg hover:border-pink-300 hover:bg-pink-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-800">Add Manually</h3>
                      <p className="text-sm text-zinc-600">Enter contact details one by one</p>
                    </div>
                  </div>
                </button>
                
                <button
                  onClick={() => setAddContactMode('csv')}
                  className="w-full p-4 border-2 border-zinc-200 rounded-lg hover:border-pink-300 hover:bg-pink-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-pink-100 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="font-semibold text-zinc-800">Upload CSV</h3>
                      <p className="text-sm text-zinc-600">Import multiple contacts from a CSV file</p>
                    </div>
                  </div>
                </button>
                
                <div className="flex justify-end pt-4">
                  <button
                    onClick={() => {
                      setAddContactModalOpen(false);
                      setAddContactMode('choice');
                      setNewContact({ name: '', email: '', company: '' });
                      setCsvContacts([]);
                      setCsvFileName('');
                      setCsvMessage(null);
                    }}
                    className="px-4 py-2 text-zinc-600 bg-zinc-200 rounded-md hover:bg-zinc-300 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            
            {addContactMode === 'manual' && (
              <form onSubmit={handleAddContact} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-zinc-700 mb-1">
                    Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={newContact.name}
                    onChange={(e) => setNewContact(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    placeholder="Enter full name"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-zinc-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={newContact.email}
                    onChange={(e) => setNewContact(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    placeholder="Enter email address"
                    required
                  />
                </div>
                
                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-zinc-700 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    id="company"
                    value={newContact.company}
                    onChange={(e) => setNewContact(prev => ({ ...prev, company: e.target.value }))}
                    className="w-full px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    placeholder="Enter company name (optional)"
                  />
                </div>
                
                <div className="flex justify-end gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setAddContactMode('choice');
                      setNewContact({ name: '', email: '', company: '' });
                    }}
                    className="px-4 py-2 text-zinc-600 bg-zinc-200 rounded-md hover:bg-zinc-300 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isAddingContact}
                    className="px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 disabled:opacity-50 transition-colors"
                  >
                    {isAddingContact ? 'Adding...' : 'Add Contact'}
                  </button>
                </div>
              </form>
            )}
            
            {addContactMode === 'csv' && (
              <div className="space-y-4">
                <form onSubmit={handleCsvUpload}>
                  <div className="text-center p-6 border-2 border-dashed border-zinc-300 rounded-lg">
                    <svg className="w-12 h-12 text-zinc-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <h3 className="text-lg font-semibold text-zinc-800 mb-2">Upload CSV File</h3>
                    <p className="text-sm text-zinc-600 mb-4">
                      Upload a CSV file with columns: <strong>name</strong>, <strong>email</strong>, and optionally <strong>company</strong>
                    </p>
                    <input 
                      type="file" 
                      accept=".csv" 
                      onChange={handleCsvFileChange}
                      className="mb-4"
                    />
                    {csvFileName && (
                      <p className="text-sm text-zinc-600 mb-4">Selected file: {csvFileName}</p>
                    )}
                    <button 
                      type="submit" 
                      disabled={csvContacts.length === 0 || csvLoading}
                      className="inline-flex items-center px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 disabled:opacity-50 transition-colors"
                    >
                      {csvLoading ? 'Uploading...' : 'Upload Contacts'}
                    </button>
                  </div>
                  
                  {csvMessage && (
                    <div className={`mt-4 p-3 rounded-lg text-sm ${
                      csvMessage.includes('successfully') 
                        ? 'bg-green-50 border border-green-200 text-green-700' 
                        : 'bg-red-50 border border-red-200 text-red-700'
                    }`}>
                      {csvMessage}
                    </div>
                  )}
                  
                  {csvContacts.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-700 mb-2">Preview ({csvContacts.length} contacts)</h4>
                      <div className="max-h-40 overflow-y-auto border border-zinc-200 rounded-lg">
                        <table className="min-w-full text-xs">
                          <thead className="bg-zinc-50">
                            <tr>
                              <th className="px-3 py-2 text-left">Name</th>
                              <th className="px-3 py-2 text-left">Email</th>
                              <th className="px-3 py-2 text-left">Company</th>
                            </tr>
                          </thead>
                          <tbody>
                            {csvContacts.map((contact, index) => (
                              <tr key={index} className="border-t border-zinc-100">
                                <td className="px-3 py-2 text-blue-900">{contact.name}</td>
                                <td className="px-3 py-2 text-blue-700">{contact.email}</td>
                                <td className="px-3 py-2 text-blue-600">{contact.company || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end gap-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setAddContactMode('choice');
                        setCsvContacts([]);
                        setCsvFileName('');
                        setCsvMessage(null);
                      }}
                      className="px-4 py-2 text-zinc-600 bg-zinc-200 rounded-md hover:bg-zinc-300 transition-colors"
                    >
                      Back
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Enhanced Preview Modal with Multiple Previews */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4 text-zinc-800">Email Previews & Edit</h2>
            
            {/* Gmail Connection Warning */}
            {!gmailConnected && (
              <div className="mb-4 p-3 rounded-lg border border-red-200 bg-red-50">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-sm font-medium text-red-700">Gmail not connected</span>
                </div>
                <p className="text-xs text-red-600">
                  You need to connect your Gmail account to send emails. Go to your profile to connect Gmail.
                </p>
              </div>
            )}
            
            {/* Personalization Status */}
            <div className="mb-4 p-3 rounded-lg border border-zinc-200 bg-zinc-50">
              <div className="flex items-center gap-2 mb-1">
                {hasResume ? (
                  <>
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm font-medium text-green-700">AI-enhanced personalization active</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium text-yellow-700">Basic AI personalization</span>
                  </>
                )}
              </div>
              <p className="text-xs text-zinc-600">
                {hasResume 
                  ? "Emails are personalized using your resume and company research for maximum relevance."
                  : "Emails are personalized using company research. Upload a resume for enhanced personalization."
                }
              </p>
            </div>

            {isPreviewLoading ? (
              <div className="text-center py-8">
                <div className="text-lg text-zinc-600 mb-2">Generating previews for {selectedContacts.length} contacts...</div>
                <div className="text-sm text-zinc-500">This may take a few moments</div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Preview Navigation */}
                {emailPreviews.length > 1 && (
                  <div className="border border-zinc-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-zinc-700 mb-3">Email Previews</h3>
                    <div className="flex flex-wrap gap-2">
                      {emailPreviews.map((preview, index) => (
                        <button
                          key={preview.contactId}
                          onClick={() => goToPreview(index)}
                          className={`px-3 py-2 text-xs rounded-lg border transition-colors ${
                            currentPreviewIndex === index
                              ? 'bg-pink-100 border-pink-300 text-pink-700'
                              : 'bg-zinc-50 border-zinc-200 text-zinc-600 hover:bg-zinc-100'
                          }`}
                        >
                          <div className="font-medium">{preview.contactName}</div>
                          <div className="text-xs opacity-75">{preview.contactEmail}</div>
                          {preview.isPersonalized && (
                            <div className="text-xs text-green-600 mt-1">✓ Personalized</div>
                          )}
                          {preview.editedContent !== preview.preview && (
                            <div className="text-xs text-blue-600 mt-1">✏️ Edited</div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Preview Info */}
                {emailPreviews.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-sm text-blue-800">
                      <strong>Email for:</strong> {emailPreviews[currentPreviewIndex]?.contactName} 
                      ({emailPreviews[currentPreviewIndex]?.contactEmail})
                      {emailPreviews[currentPreviewIndex]?.contactCompany && (
                        <span> at {emailPreviews[currentPreviewIndex]?.contactCompany}</span>
                      )}
                    </div>
                    {emailPreviews.length > 1 && (
                      <div className="text-xs text-blue-600 mt-1">
                        {currentPreviewIndex + 1} of {emailPreviews.length} emails
                      </div>
                    )}
                    {emailPreviews[currentPreviewIndex]?.isPersonalized && (
                      <div className="text-xs text-green-600 mt-1">
                        ✓ AI-researched and personalized for this contact
                      </div>
                    )}
                  </div>
                )}

                {/* Individual Email Editor */}
                {emailPreviews.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-2">
                      Email Content {emailPreviews[currentPreviewIndex]?.isEditing && <span className="text-pink-500">(Editing)</span>}
                    </label>
                    <p className="text-xs text-zinc-500 mb-2">
                      Edit this email specifically for {emailPreviews[currentPreviewIndex]?.contactName}. Each contact can have a unique message.
                    </p>
                    <div className="space-y-2">
                      {!emailPreviews[currentPreviewIndex]?.isEditing ? (
                        <div className="bg-zinc-100 p-4 rounded-md border border-zinc-200 min-h-[150px] whitespace-pre-wrap text-zinc-700">
                          {emailPreviews[currentPreviewIndex]?.editedContent || emailPreviews[currentPreviewIndex]?.preview}
                        </div>
                      ) : (
                        <textarea
                          value={emailPreviews[currentPreviewIndex]?.editedContent || emailPreviews[currentPreviewIndex]?.preview}
                          onChange={(e) => {
                            const updatedPreviews = emailPreviews.map((p, i) => 
                              i === currentPreviewIndex ? { ...p, editedContent: e.target.value } : p
                            );
                            setEmailPreviews(updatedPreviews);
                          }}
                          className="w-full p-4 rounded-md border border-zinc-300 min-h-[150px] resize-y focus:border-pink-500 focus:ring-pink-500"
                          placeholder="Edit your email content here..."
                        />
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const updatedPreviews = emailPreviews.map((p, i) => 
                              i === currentPreviewIndex ? { ...p, isEditing: !p.isEditing } : p
                            );
                            setEmailPreviews(updatedPreviews);
                          }}
                          className="px-3 py-1 text-sm rounded border border-zinc-300 hover:bg-zinc-50"
                        >
                          {emailPreviews[currentPreviewIndex]?.isEditing ? 'Save & Close' : 'Edit This Email'}
                        </button>
                        {emailPreviews[currentPreviewIndex]?.isEditing && (
                          <button
                            onClick={() => {
                              const updatedPreviews = emailPreviews.map((p, i) => 
                                i === currentPreviewIndex ? { ...p, editedContent: p.preview, isEditing: false } : p
                              );
                              setEmailPreviews(updatedPreviews);
                            }}
                            className="px-3 py-1 text-sm rounded border border-zinc-300 hover:bg-zinc-50"
                          >
                            Reset to AI Generated
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Global Actions */}
                {emailPreviews.length > 1 && (
                  <div className="border border-zinc-200 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-zinc-700 mb-3">Global Actions</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const updatedPreviews = emailPreviews.map(p => ({ ...p, isEditing: true }));
                          setEmailPreviews(updatedPreviews);
                        }}
                        className="px-3 py-2 text-sm rounded border border-zinc-300 hover:bg-zinc-50"
                      >
                        Edit All Emails
                      </button>
                      <button
                        onClick={() => {
                          const updatedPreviews = emailPreviews.map(p => ({ ...p, isEditing: false }));
                          setEmailPreviews(updatedPreviews);
                        }}
                        className="px-3 py-2 text-sm rounded border border-zinc-300 hover:bg-zinc-50"
                      >
                        Close All Editors
                      </button>
                      <button
                        onClick={() => {
                          const updatedPreviews = emailPreviews.map(p => ({ ...p, editedContent: p.preview }));
                          setEmailPreviews(updatedPreviews);
                        }}
                        className="px-3 py-2 text-sm rounded border border-zinc-300 hover:bg-zinc-50"
                      >
                        Reset All to AI Generated
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-4 mt-6">
              <button onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-zinc-600 bg-zinc-200 hover:bg-zinc-300">
                Cancel
              </button>
              <button 
                onClick={handleConfirmAndSend} 
                disabled={!emailPreviews.length || isPreviewLoading || emailPreviews.some(p => !p.editedContent.trim()) || !gmailConnected} 
                className="px-4 py-2 rounded-lg text-white bg-green-500 hover:bg-green-600 disabled:opacity-50"
              >
                Confirm & Send to All ({selectedContacts.length} contacts)
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : contacts.length === 0 ? (
        <div className="text-zinc-600">No contacts found. Add some contacts to get started!</div>
      ) : (
        <div className="border border-zinc-200 rounded-lg shadow-sm">
          <table className="w-full border-collapse table-fixed">
            <thead className="bg-gradient-to-r from-zinc-700 to-zinc-800 text-white">
              <tr>
                <th className="w-12 px-4 py-3 text-left font-medium">
                  <input 
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedContacts.length === contacts.length && contacts.length > 0}
                    className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="w-1/5 px-4 py-3 text-left font-medium">Name</th>
                <th className="w-1/4 px-4 py-3 text-left font-medium">Email</th>
                <th className="w-1/5 px-4 py-3 text-left font-medium">Company</th>
                <th className="w-20 px-4 py-3 text-left font-medium">Added</th>
                <th className="w-32 px-4 py-3 text-left font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white">
              {contacts.map((contact) => (
                <tr key={contact.id} className={`${selectedContacts.includes(contact.id) ? 'bg-blue-50/50 border-l-4 border-blue-400' : 'hover:bg-zinc-50'} transition-colors duration-150`}>
                  <td className="w-12 px-4 py-3">
                    <input 
                      type="checkbox"
                      checked={selectedContacts.includes(contact.id)}
                      onChange={(e) => handleSelectOne(e, contact.id)}
                      className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="w-1/5 px-4 py-3 font-medium text-blue-900 truncate" title={contact.name}>{contact.name}</td>
                  <td className="w-1/4 px-4 py-3 text-blue-700 truncate" title={contact.email}>{contact.email}</td>
                  <td className="w-1/5 px-4 py-3 text-blue-600 truncate" title={contact.company || '-'}>{contact.company || '-'}</td>
                  <td className="w-20 px-4 py-3 text-blue-600">{formatDate(contact.created_at)}</td>
                  <td className="w-32 px-4 py-3">
                    {contact.sent_at ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-50 text-green-700 rounded-full border border-green-200 font-medium">
                        <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                        Sent
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-zinc-50 text-zinc-600 rounded-full border border-zinc-200 font-medium">
                        <div className="w-1 h-1 bg-zinc-400 rounded-full"></div>
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
        </>
      )}

      {/* Settings Tab Content */}
      {activeTab === 'settings' && (
        <div className="space-y-8">
          {/* Top Section: Account Settings and Billing */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            
            {/* Account Settings Card */}
            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-zinc-800">Account Settings</h2>
                <p className="mt-1 text-zinc-600">Manage your profile and connection settings.</p>
              </div>
              <div className="border-t border-zinc-200 p-6 space-y-6">
                <div>
                  <label htmlFor="full_name" className="block text-sm font-medium text-zinc-700">Full Name</label>
                  <div className="mt-1 flex gap-2">
                    <input 
                      type="text" 
                      id="full_name" 
                      value={profile?.full_name || ''} 
                      onChange={handleNameChange}
                      className="flex-1 px-3 py-2 border border-zinc-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500" 
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
                  <label className="block text-sm font-medium text-zinc-700">Email</label>
                  <p className="mt-1 text-sm text-zinc-600">user@example.com</p>
                </div>
              </div>
            </div>

            {/* Billing Settings Card */}
            <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-zinc-800">Billing & Subscription</h2>
                <p className="mt-1 text-zinc-600">Manage your subscription and view payment history.</p>
              </div>
              <div className="border-t border-zinc-200 p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-zinc-600">Current Plan</p>
                    <p className="text-zinc-800 font-medium">{subscription ? 'Pro Plan' : 'Free Plan'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-zinc-600">Status</p>
                    <p className="text-green-600 font-medium">{subscription ? 'Active' : 'Free'}</p>
                  </div>
                </div>
                <button 
                  onClick={handleManageBilling} 
                  disabled={isPending}
                  className="w-full inline-flex items-center justify-center h-10 px-6 rounded-xl bg-pink-500 text-white font-semibold text-base shadow-md hover:bg-pink-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPending ? 'Loading...' : (subscription ? 'Manage Billing' : 'Upgrade Plan')}
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Section: Integration & Personalization */}
          <div className="bg-white border border-zinc-200 rounded-xl shadow-sm overflow-hidden">
            <div className="p-6">
              <h2 className="text-2xl font-bold text-zinc-800">Integration & Personalization</h2>
              <p className="mt-1 text-zinc-600">Connect your Gmail account and manage your resume for personalized outreach.</p>
            </div>
            
            <div className="border-t border-zinc-200">
              
              {/* Gmail Connection Section */}
              <div className="p-6 border-b border-zinc-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-red-500/10 rounded-lg flex items-center justify-center">
                      <svg className="w-6 h-6 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-800">Gmail Connection</h3>
                      <p className="text-sm text-zinc-600">Connect your Gmail account to send emails directly</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {gmailConnected ? (
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="text-sm text-green-600 font-medium">Connected</span>
                        </div>
                        <button onClick={connectGmail} className="text-sm text-pink-500 hover:text-pink-600 font-medium">
                          Reconnect
                        </button>
                      </div>
                    ) : (
                      <button onClick={connectGmail} className="inline-flex items-center justify-center h-10 px-6 rounded-xl bg-pink-500 text-white font-semibold text-sm shadow-md hover:bg-pink-600 transition-colors duration-200">
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
                      <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-zinc-800">Resume Management</h3>
                      <p className="text-sm text-zinc-600">Upload and manage your resumes for personalized outreach</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label htmlFor="resume" className="inline-flex items-center justify-center h-10 px-6 rounded-xl bg-zinc-600 text-white font-semibold text-sm shadow-md hover:bg-zinc-700 transition-colors duration-200 cursor-pointer">
                      {uploading ? 'Uploading...' : 'Upload Resume'}
                    </label>
                    <input type="file" id="resume" className="hidden" onChange={uploadResume} disabled={uploading} accept=".pdf" />
                  </div>
                </div>

                {/* Current Resume Status */}
                <div className="bg-zinc-50 rounded-lg p-4 mb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-zinc-600">Selected Resume</p>
                      <p className="text-zinc-800 font-medium">
                        {profile?.resume_path ? getResumeFileName(profile.resume_path) : 'None selected'}
                      </p>
                    </div>
                    {profile?.resume_path && (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-green-600">Active</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Resume Files List */}
                {loadingResumes ? (
                  <div className="text-center py-8">
                    <div className="w-6 h-6 border-2 border-zinc-300 border-t-pink-500 rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-zinc-500">Loading resumes...</p>
                  </div>
                ) : resumeFiles.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-medium text-zinc-700 mb-3">Uploaded Resumes</h4>
                    <div className="space-y-2">
                      {resumeFiles.map((file) => (
                        <div key={file.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg hover:bg-zinc-100 transition-colors">
                          <div className="flex items-center gap-3">
                            <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <div>
                              <p className="text-sm font-medium text-zinc-800">{file.name}</p>
                              <p className="text-xs text-zinc-500">Uploaded {formatDate(file.created_at)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button 
                              onClick={() => selectResume(file.name)} 
                              disabled={profile?.resume_path?.endsWith(file.name)} 
                              className="px-3 py-1 text-xs font-medium text-white bg-pink-500 rounded-md disabled:bg-zinc-400 disabled:cursor-not-allowed hover:bg-pink-600 transition-colors"
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
                  <div className="text-center py-8 border border-dashed border-zinc-300 rounded-lg">
                    <svg className="w-12 h-12 text-zinc-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-sm text-zinc-500">No resumes uploaded yet</p>
                    <p className="text-xs text-zinc-400 mt-1">Upload your first resume to get started with personalized outreach</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 