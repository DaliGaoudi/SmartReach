export default function TermsOfService() {
  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: 40, color: '#e4e4e7' }}>
      <h1 style={{ color: '#ec4899', marginBottom: 32 }}>Terms of Service</h1>
      
      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#38bdf8', marginBottom: 16 }}>Acceptance of Terms</h2>
        <p style={{ marginBottom: 16 }}>
          By accessing and using SmartSendr, you accept and agree to be bound by the terms and provision of this agreement.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#38bdf8', marginBottom: 16 }}>Description of Service</h2>
        <p style={{ marginBottom: 16 }}>
          SmartSendr is an AI-powered email automation platform that helps users:
        </p>
        <ul style={{ marginLeft: 20, marginBottom: 16 }}>
          <li>Manage and organize contact lists</li>
          <li>Generate personalized cold emails using AI</li>
          <li>Send emails through Gmail integration</li>
          <li>Track email campaign performance</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#38bdf8', marginBottom: 16 }}>User Responsibilities</h2>
        <p style={{ marginBottom: 16 }}>
          You agree to:
        </p>
        <ul style={{ marginLeft: 20, marginBottom: 16 }}>
          <li>Provide accurate and complete information</li>
          <li>Maintain the security of your account</li>
          <li>Comply with all applicable laws and regulations</li>
          <li>Not use the service for spam or illegal activities</li>
          <li>Respect email sending limits and best practices</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#38bdf8', marginBottom: 16 }}>Gmail Integration</h2>
        <p style={{ marginBottom: 16 }}>
          Our service integrates with Gmail to send emails on your behalf. By using this feature, you:
        </p>
        <ul style={{ marginLeft: 20, marginBottom: 16 }}>
          <li>Grant us permission to access your Gmail account</li>
          <li>Understand that emails are sent from your Gmail address</li>
          <li>Are responsible for the content of emails sent through our service</li>
          <li>Can revoke access at any time through your Google account settings</li>
        </ul>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#38bdf8', marginBottom: 16 }}>Data and Privacy</h2>
        <p style={{ marginBottom: 16 }}>
          Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the service.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#38bdf8', marginBottom: 16 }}>Service Availability</h2>
        <p style={{ marginBottom: 16 }}>
          We strive to maintain high availability but cannot guarantee uninterrupted service. We may temporarily suspend the service for maintenance or updates.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#38bdf8', marginBottom: 16 }}>Limitation of Liability</h2>
        <p style={{ marginBottom: 16 }}>
          SmartSendr is provided "as is" without warranties of any kind. We are not liable for any damages arising from your use of the service.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#38bdf8', marginBottom: 16 }}>Termination</h2>
        <p style={{ marginBottom: 16 }}>
          We may terminate or suspend your account at any time for violations of these terms. You may also terminate your account at any time.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#38bdf8', marginBottom: 16 }}>Changes to Terms</h2>
        <p style={{ marginBottom: 16 }}>
          We reserve the right to modify these terms at any time. Continued use of the service constitutes acceptance of any changes.
        </p>
      </section>

      <section style={{ marginBottom: 32 }}>
        <h2 style={{ color: '#38bdf8', marginBottom: 16 }}>Contact Information</h2>
        <p style={{ marginBottom: 16 }}>
          If you have questions about these terms, please contact us at:
          <br />
          <a href="mailto:legal@smartsendr.com" style={{ color: '#ec4899' }}>legal@smartsendr.com</a>
        </p>
      </section>

      <footer style={{ marginTop: 40, paddingTop: 20, borderTop: '1px solid #27272a', fontSize: 14, color: '#a1a1aa' }}>
        <p>Last updated: {new Date().toLocaleDateString()}</p>
      </footer>
    </div>
  );
} 