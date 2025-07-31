'use client';

import { useState } from 'react';
import Papa from 'papaparse';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// Only use name, email, and company fields
interface Contact {
  name: string;
  email: string;
  company?: string;
}

export default function UploadContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [fileName, setFileName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
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
          setContacts(filtered);
        },
      });
    }
  };

  const handleUpload = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const supabase = createClient();
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      console.log('Current user:', user);
      if (userError || !user) {
        setMessage('Could not get current user. Please log in again.');
        setLoading(false);
        return;
      }
      console.log('Contacts to upload:', contacts);
      // Insert contacts with user_id
      const { error } = await supabase.from('contacts').insert(
        contacts.map(c => ({ ...c, user_id: user.id }))
      );
      if (error) {
        console.error('Supabase insert error:', error);
        setMessage('Error uploading contacts: ' + error.message);
      } else {
        setMessage('Contacts uploaded successfully!');
        setContacts([]);
        setFileName('');
      }
    } catch (err: any) {
      setMessage('Unexpected error: ' + err.message);
      console.error('Unexpected error:', err);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto py-10 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-pink-500">Upload Contacts</h1>
        <Link
          href="/dashboard/contacts"
          className="inline-flex h-10 items-center justify-center rounded-lg bg-pink-500 px-4 text-sm font-medium text-white shadow hover:bg-pink-600 transition-colors"
        >
          Back to Contacts
        </Link>
      </div>
      <div className="border border-zinc-800 rounded-xl bg-white p-8 text-center mb-6">
        <p className="text-zinc-600 mb-4">Upload a CSV file of your contacts. Only <b>name</b>, <b>email</b>, and <b>company</b> columns will be used.</p>
        <form onSubmit={handleUpload}>
          <input type="file" accept=".csv" className="mb-4" onChange={handleFileChange} />
          <br />
          <button type="submit" disabled={contacts.length === 0 || loading} className="h-10 px-6 text-sm font-medium text-white bg-pink-500 rounded-lg disabled:opacity-50">
            {loading ? 'Uploading...' : 'Upload'}
          </button>
        </form>
        {message && <div className="mt-4 text-sm text-center text-pink-700">{message}</div>}
      </div>
      {contacts.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-pink-500 mb-2">Preview</h2>
          <div className="overflow-x-auto border border-zinc-800 rounded-lg">
            <table className="min-w-full border-collapse">
              <thead className="bg-zinc-800 text-white">
                <tr>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Company</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact, rowIndex) => (
                  <tr key={rowIndex}>
                    <td className="px-4 py-2">{contact.name}</td>
                    <td className="px-4 py-2">{contact.email}</td>
                    <td className="px-4 py-2">{contact.company}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
} 