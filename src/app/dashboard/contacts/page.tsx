'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Contact = {
  id: string;
  name: string;
  email: string;
  company?: string;
  created_at: string;
  sent_at?: string;
};

export default function ContactsListPage() {
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
  const [previewContent, setPreviewContent] = useState('');
  const [editedContent, setEditedContent] = useState('');
  const [isPreviewLoading, setPreviewLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [hasResume, setHasResume] = useState(false);
  
  // New state for multiple previews
  const [emailPreviews, setEmailPreviews] = useState<Array<{
    contactId: string;
    contactName: string;
    contactEmail: string;
    contactCompany?: string;
    preview: string;
    isPersonalized: boolean;
  }>>([]);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [globalMessage, setGlobalMessage] = useState('');

  // State for add contact modal
  const [isAddContactModalOpen, setAddContactModalOpen] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    company: ''
  });

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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Could not get current user. Please log in again.');
      }

      const { error: deleteError } = await supabase
        .from('contacts')
        .delete()
        .in('id', selectedContacts)
        .eq('user_id', user.id);

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
    
    if (!newContact.name.trim() || !newContact.email.trim()) {
      alert('Name and email are required.');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newContact.email)) {
      alert('Please enter a valid email address.');
      return;
    }

    setIsAddingContact(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Could not get current user. Please log in again.');
      }

      const { data, error } = await supabase
        .from('contacts')
        .insert({
          name: newContact.name.trim(),
          email: newContact.email.trim().toLowerCase(),
          company: newContact.company.trim() || null,
          user_id: user.id
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Error adding contact: ${error.message}`);
      }

      // Add new contact to local state
      setContacts(prev => [data as Contact, ...prev]);
      
      // Reset form and close modal
      setNewContact({ name: '', email: '', company: '' });
      setAddContactModalOpen(false);
      setSendStatus('Contact added successfully!');
      
      // Clear status after 3 seconds
      setTimeout(() => setSendStatus(null), 3000);
    } catch (error: any) {
      setSendStatus(`Error: ${error.message}`);
    } finally {
      setIsAddingContact(false);
    }
  };
  
  // Opens the modal and generates previews for all selected contacts
  const handleOpenAndPreview = async () => {
    if (selectedContacts.length === 0) return;
    setModalOpen(true);
    setPreviewContent('');
    setEditedContent('');
    setSendStatus(null);
    setPreviewLoading(true);
    setIsEditing(false);
    setHasResume(false);
    setEmailPreviews([]);
    setCurrentPreviewIndex(0);
    setGlobalMessage('');
    
    try {
      // Get the selected contacts data
      const selectedContactsData = contacts.filter(c => selectedContacts.includes(c.id));
      
      // Generate previews for all selected contacts
      const previews = [];
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
            isPersonalized: data.hasResume || false
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
            isPersonalized: false
          });
        }
      }
      
      setEmailPreviews(previews);
      setHasResume(hasAnyResume);
      
      // Set the first preview as the current one
      if (previews.length > 0) {
        setPreviewContent(previews[0].preview);
        setEditedContent(previews[0].preview);
        setGlobalMessage(previews[0].preview);
      }
    } catch (error: any) {
      setPreviewContent(`Error: ${error.message}`);
      setEditedContent(`Error: ${error.message}`);
    }
    setPreviewLoading(false);
  };
  
  // Navigate to a specific preview
  const goToPreview = (index: number) => {
    if (index >= 0 && index < emailPreviews.length) {
      setCurrentPreviewIndex(index);
      setPreviewContent(emailPreviews[index].preview);
      setEditedContent(emailPreviews[index].preview);
    }
  };

  // Update global message and apply to all previews
  const updateGlobalMessage = (newMessage: string) => {
    setGlobalMessage(newMessage);
    setEditedContent(newMessage);
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
      const response = await fetch('/api/send-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          contactIds: selectedContacts,
          customMessage: globalMessage || editedContent // Use global message if available
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
    const fetchContacts = async () => {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        setError('Could not get current user. Please log in again.');
        setLoading(false);
        return;
      }
      const { data, error } = await supabase
        .from('contacts')
        .select('id, name, email, company, created_at, sent_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) {
        setError('Error fetching contacts: ' + error.message);
      } else {
        setContacts(data as Contact[]);
      }
      setLoading(false);
    };
    fetchContacts();
  }, []);

  useEffect(() => {
    const checkGmailStatus = async () => {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      try {
        const { data: tokens, error: tokenError } = await supabase
          .from('user_tokens')
          .select('access_token, refresh_token, expires_at')
          .eq('user_id', user.id)
          .single();

        if (tokens && tokens.access_token) {
          // Check if token is still valid (not expired)
          const isExpired = tokens.expires_at && new Date(tokens.expires_at) < new Date();
          setGmailConnected(!isExpired);
        } else {
          setGmailConnected(false);
        }
      } catch (error) {
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

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
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
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-4 text-sm">
            <span className="font-medium text-blue-800">
              {selectedContacts.length} contact(s) selected
            </span>
            {(() => {
              const { sentCount, unsentCount } = getSelectedStats();
              return (
                <>
                  {sentCount > 0 && (
                    <span className="text-blue-600">
                      {sentCount} already emailed
                    </span>
                  )}
                  {unsentCount > 0 && (
                    <span className="text-green-600">
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
                    setAddContactModalOpen(false);
                    setNewContact({ name: '', email: '', company: '' });
                  }}
                  className="px-4 py-2 text-zinc-600 bg-zinc-200 rounded-md hover:bg-zinc-300 transition-colors"
                >
                  Cancel
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
                    <span className="text-sm font-medium text-green-700">Resume-based personalization available</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                    <span className="text-sm font-medium text-yellow-700">Generic email templates</span>
                  </>
                )}
              </div>
              <p className="text-xs text-zinc-600">
                {hasResume 
                  ? "Some emails were personalized using your uploaded resume for better relevance."
                  : "No resume uploaded. Upload one in your profile for personalized emails."
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
                    <h3 className="text-sm font-medium text-zinc-700 mb-3">Preview Navigation</h3>
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
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Current Preview Info */}
                {emailPreviews.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="text-sm text-blue-800">
                      <strong>Previewing for:</strong> {emailPreviews[currentPreviewIndex]?.contactName} 
                      ({emailPreviews[currentPreviewIndex]?.contactEmail})
                      {emailPreviews[currentPreviewIndex]?.contactCompany && (
                        <span> at {emailPreviews[currentPreviewIndex]?.contactCompany}</span>
                      )}
                    </div>
                    {emailPreviews.length > 1 && (
                      <div className="text-xs text-blue-600 mt-1">
                        {currentPreviewIndex + 1} of {emailPreviews.length} previews
                      </div>
                    )}
                  </div>
                )}

                {/* Global Message Editor */}
                <div>
                  <label className="block text-sm font-medium text-zinc-700 mb-2">
                    Global Message {isEditing && <span className="text-pink-500">(Editing)</span>}
                  </label>
                  <p className="text-xs text-zinc-500 mb-2">
                    Edit this message to customize it for all selected contacts. The same message will be sent to everyone.
                  </p>
                  <div className="space-y-2">
                    {!isEditing ? (
                      <div className="bg-zinc-100 p-4 rounded-md border border-zinc-200 min-h-[150px] whitespace-pre-wrap text-zinc-700">
                        {globalMessage || previewContent}
                      </div>
                    ) : (
                      <textarea
                        value={globalMessage || editedContent}
                        onChange={(e) => updateGlobalMessage(e.target.value)}
                        className="w-full p-4 rounded-md border border-zinc-300 min-h-[150px] resize-y focus:border-pink-500 focus:ring-pink-500"
                        placeholder="Edit your email content here..."
                      />
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setIsEditing(!isEditing)}
                        className="px-3 py-1 text-sm rounded border border-zinc-300 hover:bg-zinc-50"
                      >
                        {isEditing ? 'Cancel Edit' : 'Edit Message'}
                      </button>
                      {isEditing && (
                        <button
                          onClick={() => updateGlobalMessage(previewContent)}
                          className="px-3 py-1 text-sm rounded border border-zinc-300 hover:bg-zinc-50"
                        >
                          Reset to Original
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Individual Preview Display */}
                {emailPreviews.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 mb-2">
                      Current Preview
                    </label>
                    <div className="bg-zinc-100 p-4 rounded-md border border-zinc-200 min-h-[100px] whitespace-pre-wrap text-zinc-700">
                      {emailPreviews[currentPreviewIndex]?.preview}
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
                disabled={!previewContent || isPreviewLoading || !(globalMessage || editedContent).trim() || !gmailConnected} 
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
        <div className="overflow-x-auto border border-zinc-800 rounded-lg">
          <table className="min-w-full border-collapse">
            <thead className="bg-zinc-800 text-white">
              <tr>
                <th className="px-4 py-2 text-left">
                  <input 
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedContacts.length === contacts.length && contacts.length > 0}
                  />
                </th>
                <th className="px-4 py-2 text-left">Name</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Company</th>
                <th className="px-4 py-2 text-left">Added</th>
                <th className="px-4 py-2 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((contact) => (
                <tr key={contact.id} className={selectedContacts.includes(contact.id) ? 'bg-pink-100' : ''}>
                  <td className="px-4 py-2">
                    <input 
                      type="checkbox"
                      checked={selectedContacts.includes(contact.id)}
                      onChange={(e) => handleSelectOne(e, contact.id)}
                    />
                  </td>
                  <td className="px-4 py-2">{contact.name}</td>
                  <td className="px-4 py-2">{contact.email}</td>
                  <td className="px-4 py-2">{contact.company}</td>
                  <td className="px-4 py-2">{formatDate(contact.created_at)}</td>
                  <td className="px-4 py-2">
                    {contact.sent_at ? (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                        <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                        Sent {formatDate(contact.sent_at)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                        <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                        Not sent
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
} 