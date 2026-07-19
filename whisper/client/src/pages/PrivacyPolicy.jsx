export default function PrivacyPolicy() {
  return (
    <div style={{ padding: '24px 16px', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Last updated: January 2026</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: 14 }}>
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>1. Data Collection</h2>
          <p>We collect information you provide directly, including your username, email address, profile information, and any content you post. We also collect usage data such as pages visited, features used, and interaction patterns.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>2. Data Usage</h2>
          <p>We use collected data to provide and improve our services, personalize your experience, communicate with you, and ensure platform security.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>3. Data Sharing</h2>
          <p>We do not sell your personal data. We may share information with service providers who assist in operating our platform, or when required by law.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>4. Data Security</h2>
          <p>We implement industry-standard security measures including encryption, access controls, and regular security audits to protect your data.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>5. User Rights</h2>
          <p>You have the right to access, correct, delete, or export your data at any time. You may also opt out of non-essential data collection.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>6. Contact</h2>
          <p>For privacy-related inquiries, please contact us through the app's support channel.</p>
        </section>
      </div>
    </div>
  );
}
