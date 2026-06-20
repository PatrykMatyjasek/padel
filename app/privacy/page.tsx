import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
      <h1 className="text-3xl font-bold">Privacy Policy</h1>

      <section>
        <h2 className="text-xl font-semibold mt-6">Who we are</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Padel Manager is a tournament management platform operated by Patryk Matyjasek.
          We are committed to protecting your personal data and being transparent about how
          we collect, use, and store information.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-6">What data we collect</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We collect the following data to provide our service:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground leading-relaxed mt-2 space-y-1">
          <li><strong>Account information:</strong> name, email address, and password (hashed with bcryptjs)</li>
          <li><strong>Tournament data:</strong> tournament names, player names, match results, and scores</li>
          <li><strong>Session data:</strong> NextAuth.js session tokens stored in HTTP-only cookies</li>
          <li><strong>Technical logs:</strong> IP addresses and HTTP request logs from Vercel hosting</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-6">How we use your data</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Your data is used exclusively to:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground leading-relaxed mt-2 space-y-1">
          <li>Authenticate you when you log in</li>
          <li>Create and manage your tournaments</li>
          <li>Display tournament information to you and invited players</li>
          <li>Maintain the security and functionality of the service</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-6">Third-party services</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We use the following third-party services:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground leading-relaxed mt-2 space-y-2">
          <li>
            <strong>Vercel Inc.</strong> — Application hosting and serverless compute. Servers are
            located in the EU (Frankfurt region). Vercel processes IP addresses and HTTP request
            logs as part of hosting.
          </li>
          <li>
            <strong>Neon</strong> — PostgreSQL database hosting. Stores tournament and player
            data. Servers in EU.
          </li>
          <li>
            <strong>NextAuth.js</strong> — Authentication library (credentials provider).
            Handles session cookies.
          </li>
          <li>
            <strong>bcryptjs</strong> — Client-side password hashing before storage.
          </li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed mt-4">
          <strong>Email service:</strong> None — we do not send emails.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <strong>Stripe:</strong> None — we do not process payments.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <strong>Analytics:</strong> None — we do not use Google Analytics, PostHog, or any
          other tracking service.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-6">Your rights (GDPR)</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          If you are located in the European Economic Area, you have the following rights
          regarding your personal data:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground leading-relaxed mt-2 space-y-1">
          <li><strong>Right of access:</strong> request a copy of your personal data</li>
          <li><strong>Right to rectification:</strong> request correction of inaccurate data</li>
          <li><strong>Right to erasure:</strong> request deletion of your account and data</li>
          <li><strong>Right to data portability:</strong> request your data in a machine-readable format</li>
          <li><strong>Right to object:</strong> object to processing of your personal data</li>
        </ul>
        <p className="text-sm text-muted-foreground leading-relaxed mt-4">
          To exercise any of these rights, contact us at the email address below.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-6">Data retention</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We retain your account data for as long as your account remains active. If you
          delete your account, we will delete your personal data within 30 days. Tournament
          data may be retained longer for legal compliance purposes.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-6">Contact</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          For any questions about this Privacy Policy or to exercise your data rights,
          contact Patryk Matyjasek at{" "}
          <a
            href="https://fredsonthecode.pl"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            fredsonthecode.pl
          </a>
          .
        </p>
      </section>
    </div>
  );
}