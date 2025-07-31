import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import ContactManager from './contact-manager';

export default async function Dashboard() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options })
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: '', ...options })
        },
      },
    }
  );
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 40 }}>
      {/* Hero Section */}
      <section style={{ borderRadius: 32, background: 'linear-gradient(135deg, #0c4a6e 0%, #18181b 60%, #831843 100%)', padding: 32, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', gap: 32 }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: 40, fontWeight: 800, color: '#ec4899', marginBottom: 16 }}>Welcome to SmartSendr</h1>
          <p style={{ fontSize: 20, color: '#e4e4e7', marginBottom: 24, maxWidth: 600 }}>
            Effortlessly manage your contacts and launch personalized cold email campaigns at scale. Let our AI do the heavy lifting so you can focus on closing deals.
          </p>
        </div>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <img src="/globe.svg" alt="SmartSendr Dashboard" style={{ width: 256, height: 256, objectFit: 'contain' }} />
        </div>
      </section>

      {/* Contact Management Section */}
      <section>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#ec4899', marginBottom: 24 }}>Manage Your Contacts</h2>
        <ContactManager />
      </section>

      {/* Features Grid */}
      <section>
        <h2 style={{ fontSize: 28, fontWeight: 700, color: '#ec4899', marginBottom: 24 }}>Key Features</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24, maxWidth: 1200 }}>
          <div style={{ background: '#27272a', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', border: '1px solid #27272a' }}>
            <div style={{ width: 48, height: 48, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(14,165,233,0.1)' }}>
              <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: '#38bdf8' }}><path d="M21 15V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10"/><rect width="20" height="8" x="2" y="15" rx="2"/><path d="M6 18h.01M10 18h.01"/></svg>
            </div>
            <h3 style={{ fontWeight: 600, fontSize: 20, color: '#38bdf8', marginBottom: 8 }}>Contact Management</h3>
            <p style={{ color: '#a1a1aa', fontSize: 16 }}>Easily upload, organize, and manage your contacts in one place.</p>
          </div>
          <div style={{ background: '#27272a', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', border: '1px solid #27272a' }}>
            <div style={{ width: 48, height: 48, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(236,72,153,0.1)' }}>
              <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: '#ec4899' }}><path d="M21 10.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v4.5"/><rect width="20" height="8" x="2" y="15" rx="2"/><path d="M6 18h.01M10 18h.01"/></svg>
            </div>
            <h3 style={{ fontWeight: 600, fontSize: 20, color: '#ec4899', marginBottom: 8 }}>AI-Powered Emails</h3>
            <p style={{ color: '#a1a1aa', fontSize: 16 }}>Generate unique, personalized cold emails for every contact with a single click.</p>
          </div>
          <div style={{ background: '#27272a', borderRadius: 16, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', border: '1px solid #27272a' }}>
            <div style={{ width: 48, height: 48, marginBottom: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: 'rgba(234,179,8,0.1)' }}>
              <svg width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" style={{ color: '#eab308' }}><path d="M12 20h9"/><path d="M12 4v16"/><path d="M3 4h9"/><path d="M3 20h9"/></svg>
            </div>
            <h3 style={{ fontWeight: 600, fontSize: 20, color: '#eab308', marginBottom: 8 }}>Analytics & Tracking</h3>
            <p style={{ color: '#a1a1aa', fontSize: 16 }}>Track open rates, responses, and campaign performance in real time.</p>
          </div>
        </div>
      </section>
    </div>
  );
} 