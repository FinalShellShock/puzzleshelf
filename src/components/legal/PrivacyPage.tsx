import { useNavigate } from 'react-router-dom'

export function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <button onClick={() => navigate(-1)} style={backStyle}>← Back</button>

        <h1 style={{ margin: '0 0 4px', fontSize: 28, fontWeight: 800 }}>Privacy Policy</h1>
        <p style={{ margin: '0 0 32px', color: 'var(--color-text-muted)', fontSize: 14 }}>
          Effective Date: March 27, 2026 · Last Updated: March 27, 2026
        </p>

        <Section heading="1. Introduction">
          <p>Puzzle Shelf ("the App") respects your privacy. This Privacy Policy explains what information we collect, how we use it, and your rights regarding that information.</p>
        </Section>

        <Section heading="2. Information We Collect">
          <h3 style={subheadStyle}>Information You Provide</h3>
          <ul>
            <li><strong>Account Information:</strong> Email address and display name when you create an account via Firebase Authentication.</li>
            <li><strong>Chat Messages:</strong> Messages you send within puzzle rooms are stored to enable the collaborative chat feature.</li>
          </ul>
          <h3 style={subheadStyle}>Information Collected Automatically</h3>
          <ul>
            <li><strong>Usage Data:</strong> We may collect basic usage data such as puzzle rooms joined, session timestamps, and feature interactions.</li>
            <li><strong>Device Information:</strong> Browser type, operating system, and screen resolution may be collected for debugging and improving the App.</li>
          </ul>
        </Section>

        <Section heading="3. How We Use Your Information">
          <p>We use your information to:</p>
          <ul>
            <li>Provide and maintain the App's functionality.</li>
            <li>Authenticate your identity and manage your account.</li>
            <li>Display your contributions (e.g., cell fills, chat messages) to other users in shared puzzle rooms.</li>
            <li>Improve the App and fix bugs.</li>
            <li>Communicate important updates about the App or these policies.</li>
          </ul>
        </Section>

        <Section heading="4. Data Storage and Security">
          <ul>
            <li>Your data is stored using <strong>Google Firebase</strong> (Firestore and Firebase Authentication), which is hosted on Google Cloud infrastructure.</li>
            <li>We implement reasonable security measures, but no system is 100% secure. We cannot guarantee the absolute security of your data.</li>
            <li>As a beta product, data may be lost or reset. Do not rely on the App for permanent data storage.</li>
          </ul>
        </Section>

        <Section heading="5. Data Sharing">
          <p>We do <strong>not</strong>:</p>
          <ul>
            <li>Sell your personal information.</li>
            <li>Share your data with third-party advertisers.</li>
            <li>Use your data for profiling or targeted advertising.</li>
          </ul>
          <p style={{ marginTop: 12 }}>We <strong>may</strong> share data:</p>
          <ul>
            <li>With Google Firebase as our infrastructure provider (subject to Google's privacy policies).</li>
            <li>If required by law or legal process.</li>
          </ul>
        </Section>

        <Section heading="6. Your Rights">
          <p>You may:</p>
          <ul>
            <li>Request a copy of the personal data we hold about you.</li>
            <li>Request deletion of your account and associated data.</li>
            <li>Opt out of any non-essential communications.</li>
          </ul>
          <p style={{ marginTop: 12 }}>To exercise these rights, contact us at: <a href="mailto:[YOUR EMAIL ADDRESS]" style={{ color: 'var(--color-accent)' }}>[YOUR EMAIL ADDRESS]</a></p>
        </Section>

        <Section heading="7. Children's Privacy">
          <p>The App is not intended for users under 13 years of age. We do not knowingly collect information from children under 13. If you believe a child has provided us with personal information, please contact us.</p>
        </Section>

        <Section heading="8. Third-Party Services">
          <p>The App uses the following third-party services:</p>
          <ul>
            <li><strong>Firebase Authentication</strong> — for user login and identity management.</li>
            <li><strong>Cloud Firestore</strong> — for data storage.</li>
            <li><strong>Vercel</strong> — for hosting the application.</li>
          </ul>
          <p style={{ marginTop: 12 }}>Each of these services has its own privacy policy governing how they handle data.</p>
        </Section>

        <Section heading="9. Changes to This Policy">
          <p>We may update this Privacy Policy at any time. We will make reasonable efforts to notify users of material changes. Continued use of the App after changes are posted constitutes acceptance.</p>
        </Section>

        <Section heading="10. Contact">
          <p>For privacy-related questions or requests, contact: <a href="mailto:[YOUR EMAIL ADDRESS]" style={{ color: 'var(--color-accent)' }}>[YOUR EMAIL ADDRESS]</a></p>
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

const subheadStyle: React.CSSProperties = {
  margin: '12px 0 6px',
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--color-text-muted)',
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
