export default function PrivacyPolicy() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 40, color: '#e4e4e7' }}>
      <h1 style={{ color: '#ec4899', marginBottom: 32 }}>Privacy Policy</h1>
      
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#38bdf8', marginBottom: 16 }}>Information We Collect</h2>
        <p style={{ marginBottom: 16 }}>
          SmartSendr collects the following information to provide our email automation services:
        </p>
        <ul style={{ marginLeft: 20, marginBottom: 16 }}>
          <li>Email address and basic profile information when you sign up</li>
          <li>Contact information you upload or manually add</li>
          <li>Resume files you upload for personalization</li>
          <li>Gmail access tokens (stored securely) for sending emails</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#38bdf8', marginBottom: 16 }}>How We Use Your Information</h2>
        <p style={{ marginBottom: 16 }}>
          We use your information to:
        </p>
        <ul style={{ marginLeft: 20, marginBottom: 16 }}>
          <li>Generate personalized email content using AI</li>
          <li>Send emails on your behalf through Gmail</li>
          <li>Track email delivery and engagement</li>
          <li>Provide customer support</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#38bdf8', marginBottom: 16 }}>Data Security</h2>
        <p style={{ marginBottom: 16 }}>
          We implement industry-standard security measures to protect your data:
        </p>
        <ul style={{ marginLeft: 20, marginBottom: 16 }}>
          <li>All data is encrypted in transit and at rest</li>
          <li>Gmail tokens are stored securely in our database</li>
          <li>We use Supabase for secure data storage</li>
          <li>Access is restricted to authorized personnel only</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#38bdf8', marginBottom: 16 }}>Third-Party Services</h2>
        <p style={{ marginBottom: 16 }}>
          We use the following third-party services:
        </p>
        <ul style={{ marginLeft: 20, marginBottom: 16 }}>
          <li><strong>Supabase:</strong> Database and authentication</li>
          <li><strong>Google Gemini API:</strong> AI email generation</li>
          <li><strong>Gmail API:</strong> Email sending functionality</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#38bdf8', marginBottom: 16 }}>Your Rights</h2>
        <p style={{ marginBottom: 16 }}>
          You have the right to:
        </p>
        <ul style={{ marginLeft: 20, marginBottom: 16 }}>
          <li>Access your personal data</li>
          <li>Request deletion of your data</li>
          <li>Revoke Gmail access at any time</li>
          <li>Export your contact data</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#38bdf8', marginBottom: 16 }}>Contact Us</h2>
        <p style={{ marginBottom: 16 }}>
          If you have questions about this privacy policy, please contact us at:
          <br />
          <a href="mailto:privacy@smartsendr.org" style={{ color: '#ec4899' }}>privacy@smartsendr.org</a>
        </p>
      </section>

      <footer style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid #27272a', fontSize: 14, color: '#a1a1aa' }}>
        <p>Last updated: {new Date().toLocaleDateString()}</p>
      </footer>
    </div>
  );
} 