import { useNavigate } from 'react-router-dom'

export function TermsPage() {
  const navigate = useNavigate()

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <button onClick={() => navigate(-1)} style={backStyle}>← Back</button>

        <h1 style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 800 }}>Terms of Service</h1>
        <p style={{ margin: '0 0 32px', color: 'var(--color-text-muted)', fontSize: 14 }}>
          Effective Date: March 27, 2026 · Last Updated: March 27, 2026
        </p>

        <Section heading="1. Acceptance of Terms">
          <p>By creating an account or using Puzzle Shelf ("the App"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the App.</p>
        </Section>

        <Section heading="2. Description of Service">
          <p>Puzzle Shelf is a collaborative puzzle application currently in beta. The App allows users to work on puzzles together in real time. Features, functionality, and availability may change at any time without notice.</p>
        </Section>

        <Section heading="3. Beta Status">
          <p>The App is provided as a <strong>beta product</strong>. This means:</p>
          <ul>
            <li>Features may be incomplete, unstable, or subject to change.</li>
            <li>Data may be lost, reset, or corrupted without warning.</li>
            <li>The App may experience downtime or be discontinued at any time.</li>
            <li>You use the App at your own risk.</li>
          </ul>
        </Section>

        <Section heading="4. User Accounts">
          <ul>
            <li>You must provide accurate information when creating an account.</li>
            <li>You are responsible for maintaining the security of your account credentials.</li>
            <li>You may not share your account with others or create multiple accounts.</li>
            <li>We reserve the right to suspend or terminate accounts at our discretion.</li>
          </ul>
        </Section>

        <Section heading="5. Acceptable Use">
          <p>You agree <strong>not</strong> to:</p>
          <ul>
            <li>Redistribute, scrape, copy, or republish any puzzle content accessed through the App.</li>
            <li>Use the App for any commercial purpose without written permission.</li>
            <li>Attempt to reverse-engineer, decompile, or tamper with the App.</li>
            <li>Harass, abuse, or harm other users.</li>
            <li>Use automated tools, bots, or scripts to interact with the App.</li>
            <li>Circumvent any access controls or security measures.</li>
          </ul>
        </Section>

        <Section heading="6. Intellectual Property">
          <ul>
            <li>All original code, design, and branding of Puzzle Shelf are the property of the App's creator(s) and are protected by copyright law.</li>
            <li>Puzzle content displayed within the App may be the intellectual property of third-party publishers. You may not copy, redistribute, or reproduce this content outside of the App.</li>
            <li>You retain ownership of any content you create (e.g., chat messages), but grant us a limited license to display it within the App as part of normal functionality.</li>
          </ul>
        </Section>

        <Section heading="7. Disclaimer of Warranties">
          <p style={{ textTransform: 'uppercase', fontSize: 13, lineHeight: 1.6 }}>
            The App is provided "as is" and "as available" without warranties of any kind, express or implied. We do not guarantee that the App will be uninterrupted, error-free, or secure. Use of the App is at your sole risk.
          </p>
        </Section>

        <Section heading="8. Limitation of Liability">
          <p style={{ textTransform: 'uppercase', fontSize: 13, lineHeight: 1.6 }}>
            To the maximum extent permitted by law, the creators of Puzzle Shelf shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the App.
          </p>
        </Section>

        <Section heading="9. Changes to Terms">
          <p>We may update these Terms at any time. Continued use of the App after changes are posted constitutes acceptance of the updated Terms. We will make reasonable efforts to notify users of material changes.</p>
        </Section>

        <Section heading="10. Termination">
          <p>We reserve the right to terminate or suspend your access to the App at any time, for any reason, without notice or liability.</p>
        </Section>

        <Section heading="11. Governing Law">
          <p>These Terms shall be governed by the laws of the Commonwealth of Pennsylvania, without regard to conflict of law principles.</p>
        </Section>

        <Section heading="12. Contact">
          <p>For questions about these Terms, contact: <a href="mailto:[YOUR EMAIL ADDRESS]" style={{ color: 'var(--color-accent)' }}>[YOUR EMAIL ADDRESS]</a></p>
        </Section>
      </div>
    </div>
  )
}

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 28 }}>
      <h2 style={{ margin: '0 0 10px', fontSize: 17, fontWeight: 700 }}>{heading}</h2>
      <div style={{ color: 'var(--color-text)', fontSize: 15, lineHeight: 1.65 }}>{children}</div>
    </section>
  )
}

const pageStyle: React.CSSProperties = {
  minHeight: '100vh',
  padding: '40px 24px 60px',
  display: 'flex',
  justifyContent: 'center',
}

const containerStyle: React.CSSProperties = {
  width: '100%',
  maxWidth: 680,
}

const backStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: 'var(--color-accent)',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  padding: '0 0 24px',
  display: 'block',
}
