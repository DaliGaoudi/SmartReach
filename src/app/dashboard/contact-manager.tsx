'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Papa from 'papaparse';

type Contact = {
  name: string;
  email: string;
  company?: string;
};

export default function ContactManager() {
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // CSV upload state
  const [fileName, setFileName] = useState('');
  const [contacts, setContacts] = useState<Contact[]>([]);
  
  // Manual contact state
  const [newContact, setNewContact] = useState({
    name: '',
    email: '',
    company: ''
  });
  const [isAddingContact, setIsAddingContact] = useState(false);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setMessage(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedContacts = results.data as Contact[];
        const validContacts = parsedContacts.filter(contact => 
          contact.name && contact.email && contact.email.includes('@')
        );
        
        if (validContacts.length === 0) {
          setMessage({ type: 'error', text: 'No valid contacts found. Please check your CSV format.' });
          return;
        }

        setContacts(validContacts);
        setMessage({ 
          type: 'success', 
          text: `Found ${validContacts.length} valid contacts. Ready to upload!` 
        });
      },
      error: (error) => {
        setMessage({ type: 'error', text: `Error parsing CSV: ${error.message}` });
      }
    });
  };

  const handleUpload = async () => {
    if (contacts.length === 0) return;
    
    setLoading(true);
    setMessage(null);
    
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Could not get current user. Please log in again.');
      }

      const { error } = await supabase.from('contacts').insert(
        contacts.map(c => ({ 
          ...c, 
          user_id: user.id,
          name: c.name.trim(),
          email: c.email.trim().toLowerCase(),
          company: c.company?.trim() || null
        }))
      );

      if (error) {
        throw new Error(`Error uploading contacts: ${error.message}`);
      }

      setMessage({ type: 'success', text: `${contacts.length} contacts uploaded successfully!` });
      setContacts([]);
      setFileName('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!newContact.name.trim() || !newContact.email.trim()) {
      setMessage({ type: 'error', text: 'Name and email are required.' });
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newContact.email)) {
      setMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setIsAddingContact(true);
    setMessage(null);
    
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Could not get current user. Please log in again.');
      }

      const { error } = await supabase
        .from('contacts')
        .insert({
          name: newContact.name.trim(),
          email: newContact.email.trim().toLowerCase(),
          company: newContact.company.trim() || null,
          user_id: user.id
        });

      if (error) {
        throw new Error(`Error adding contact: ${error.message}`);
      }

      setNewContact({ name: '', email: '', company: '' });
      setMessage({ type: 'success', text: 'Contact added successfully!' });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message });
    } finally {
      setIsAddingContact(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-zinc-200 p-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-zinc-200 mb-6">
        <button
          onClick={() => setActiveTab('upload')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'upload'
              ? 'border-pink-500 text-pink-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}
        >
          Upload CSV
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
            activeTab === 'manual'
              ? 'border-pink-500 text-pink-600'
              : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}
        >
          Add Manually
        </button>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`mb-4 p-3 rounded-md ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-700' 
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      {/* CSV Upload Tab */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-800 mb-2">Upload Contacts from CSV</h3>
            <p className="text-sm text-zinc-600 mb-4">
              Upload a CSV file with columns: name, email, company (optional)
            </p>
            
            <div className="border-2 border-dashed border-zinc-300 rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label
                htmlFor="csv-upload"
                className="cursor-pointer inline-flex items-center px-4 py-2 bg-pink-500 text-white rounded-md hover:bg-pink-600 transition-colors"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Choose CSV File
              </label>
              {fileName && (
                <p className="mt-2 text-sm text-zinc-600">Selected: {fileName}</p>
              )}
            </div>
          </div>

          {contacts.length > 0 && (
            <div className="bg-zinc-50 rounded-lg p-4">
              <h4 className="font-medium text-zinc-800 mb-2">Preview ({contacts.length} contacts)</h4>
              <div className="max-h-40 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-zinc-600">
                      <th className="py-1">Name</th>
                      <th className="py-1">Email</th>
                      <th className="py-1">Company</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contacts.slice(0, 5).map((contact, index) => (
                      <tr key={index} className="border-t border-zinc-200">
                        <td className="py-1">{contact.name}</td>
                        <td className="py-1">{contact.email}</td>
                        <td className="py-1">{contact.company || '-'}</td>
                      </tr>
                    ))}
                    {contacts.length > 5 && (
                      <tr>
                        <td colSpan={3} className="py-1 text-zinc-500 text-center">
                          ... and {contacts.length - 5} more
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <button
                onClick={handleUpload}
                disabled={loading}
                className="mt-4 w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Uploading...' : `Upload ${contacts.length} Contacts`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Manual Contact Tab */}
      {activeTab === 'manual' && (
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold text-zinc-800 mb-2">Add Contact Manually</h3>
            <p className="text-sm text-zinc-600 mb-4">
              Add individual contacts one by one
            </p>
            
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
              
              <button
                type="submit"
                disabled={isAddingContact}
                className="w-full bg-pink-500 text-white py-2 px-4 rounded-md hover:bg-pink-600 disabled:opacity-50 transition-colors"
              >
                {isAddingContact ? 'Adding...' : 'Add Contact'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-zinc-200">
        <div className="flex gap-3">
          <a
            href="/dashboard/contacts"
            className="flex-1 bg-zinc-100 text-zinc-700 py-2 px-4 rounded-md hover:bg-zinc-200 transition-colors text-center text-sm font-medium"
          >
            View All Contacts
          </a>
          <a
            href="/dashboard/contacts/upload"
            className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 transition-colors text-center text-sm font-medium"
          >
            Advanced Upload
          </a>
        </div>
      </div>
    </div>
  );
} 