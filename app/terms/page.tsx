import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
      <h1 className="text-3xl font-bold">Terms of Service</h1>

      <section>
        <h2 className="text-xl font-semibold mt-6">1. Acceptance of Terms</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          By accessing or using Padel Manager, you agree to be bound by these Terms of
          Service. If you do not agree to these terms, please do not use our service.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-6">2. Use of Service</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Padel Manager provides a platform for creating and managing padel tournaments.
          You may use the service for lawful purposes only. You agree not to:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground leading-relaxed mt-2 space-y-1">
          <li>Use the service for any illegal or unauthorized purpose</li>
          <li>Attempt to gain unauthorized access to any part of the service</li>
          <li>Interfere with or disrupt the service or servers connected to the service</li>
          <li>Use automated systems to access the service without permission</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-6">3. User Accounts</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          To create tournaments, you must create an account. You are responsible for
          maintaining the confidentiality of your account credentials and for all
          activities that occur under your account. You agree to notify us immediately
          of any unauthorized use of your account.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-6">4. User Content</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          You retain ownership of any content you create on Padel Manager, including
          tournament data and player information. By using the service, you grant us
          a license to use, store, and process this content as necessary to provide
          the service to you.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2">
          You represent that you have the right to share any player information you
          enter into the service and that such content does not violate any third
          party&apos;s rights.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-6">5. Limitation of Liability</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Padel Manager is provided &quot;as is&quot; without warranties of any kind. We do
          not guarantee that the service will be uninterrupted, secure, or error-free.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed mt-2">
          To the fullest extent permitted by law, we shall not be liable for any
          indirect, incidental, special, consequential, or punitive damages resulting
          from your use of or inability to use the service.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-6">6. Changes to Terms</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          We reserve the right to modify these terms at any time. We will notify users
          of significant changes by posting a notice on the website. Continued use of
          the service after changes constitutes acceptance of the modified terms.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-6">7. Contact</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          For questions about these Terms of Service, contact Patryk Matyjasek at{" "}
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