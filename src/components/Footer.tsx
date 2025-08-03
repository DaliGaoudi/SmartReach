'use client';

export default function Footer() {
  return (
    <footer style={{ 
      backgroundColor: '#27272a', 
      padding: '20px 0', 
      marginTop: 'auto',
      borderTop: '1px solid #3f3f46'
    }}>
      <div style={{ 
        maxWidth: 1200, 
        margin: '0 auto', 
        padding: '0 20px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16
      }}>
        <div style={{ color: '#a1a1aa', fontSize: 14, textAlign: 'center' }}>
          © 2024 SmartSendr. All rights reserved.
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
          <a 
            href="/privacy" 
            style={{ color: '#a1a1aa', textDecoration: 'none' }}
            onMouseOver={(e) => e.currentTarget.style.color = '#ec4899'}
            onMouseOut={(e) => e.currentTarget.style.color = '#a1a1aa'}
          >
            Privacy Policy
          </a>
          <a 
            href="/terms" 
            style={{ color: '#a1a1aa', textDecoration: 'none' }}
            onMouseOver={(e) => e.currentTarget.style.color = '#ec4899'}
            onMouseOut={(e) => e.currentTarget.style.color = '#a1a1aa'}
          >
            Terms of Service
          </a>
        </div>
      </div>
    </footer>
  );
} 