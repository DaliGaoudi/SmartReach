'use client';

import { useEffect, useState } from 'react';

export default function TestEnvPage() {
  const [envInfo, setEnvInfo] = useState<any>(null);

  useEffect(() => {
    // Only show in development
    if (process.env.NODE_ENV === 'development') {
      setEnvInfo({
        hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30),
        anonKeyPrefix: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 30),
        anonKeyType: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.includes('service_role') ? 'SERVICE_ROLE' : 'ANON'
      });
    }
  }, []);

  if (process.env.NODE_ENV !== 'development') {
    return <div>This page is only available in development mode.</div>;
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Test</h1>
      <pre className="bg-gray-100 p-4 rounded">
        {JSON.stringify(envInfo, null, 2)}
      </pre>
    </div>
  );
} 