export default function AuthCodeErrorPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#18181b' }}>
      <div style={{ padding: 32, background: '#fff', border: '1px solid #ec4899', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', textAlign: 'center', maxWidth: 400 }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#ec4899', margin: 0 }}>Authentication Error</h1>
        <p style={{ color: '#4a5568', margin: '16px 0 0 0' }}>
          There was a problem with your authentication code. Please try again or request a new code.
        </p>
      </div>
    </div>
  );
} 