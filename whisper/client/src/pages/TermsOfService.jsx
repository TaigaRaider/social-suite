export default function TermsOfService() {
  return (
    <div style={{ padding: '24px 16px', maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Terms of Service</h1>
      <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Last updated: January 2026</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20, color: 'var(--text-secondary)', lineHeight: 1.6, fontSize: 14 }}>
        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>1. Acceptance of Terms</h2>
          <p>By accessing or using this application, you agree to be bound by these Terms of Service. If you do not agree, do not use the service.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>2. User Conduct</h2>
          <p>You agree not to misuse the service, impersonate others, distribute spam, or engage in any activity that violates applicable laws or harms other users.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>3. Content Ownership</h2>
          <p>You retain ownership of content you create. By posting content, you grant us a non-exclusive license to display and distribute it within the platform.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>4. Account Termination</h2>
          <p>We reserve the right to suspend or terminate accounts that violate these terms. You may delete your account at any time through settings.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>5. Limitation of Liability</h2>
          <p>The service is provided "as is" without warranties. We are not liable for any damages arising from your use of the service.</p>
        </section>

        <section>
          <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>6. Changes to Terms</h2>
          <p>We may update these terms periodically. Continued use after changes constitutes acceptance of the updated terms.</p>
        </section>
      </div>
    </div>
  );
}
