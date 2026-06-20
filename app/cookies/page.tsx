import type { Metadata } from "next";

export const metadata: Metadata = { title: "Cookies" };

export default function CookiesPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-12 space-y-8">
      <h1 className="text-3xl font-bold">Cookie Policy</h1>

      <section>
        <h2 className="text-xl font-semibold mt-6">What are cookies</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Cookies are small text files stored on your device when you visit a website.
          They help websites remember your preferences and understand how you interact
          with the site.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-6">What we use</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Padel Manager uses only essential cookies required for the service to function
          properly. We do not use any analytics, marketing, or preference cookies.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-6">Essential cookies</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Essential cookies are necessary for the website to function. Without them,
          core features like authentication would not work.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm text-muted-foreground">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 font-semibold text-foreground">Cookie</th>
                <th className="text-left py-2 font-semibold text-foreground">Purpose</th>
                <th className="text-left py-2 font-semibold text-foreground">Duration</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2">next-auth.session-token</td>
                <td className="py-2">Maintains your logged-in session</td>
                <td className="py-2">Session / 30 days</td>
              </tr>
              <tr className="border-b">
                <td className="py-2">csrf-token</td>
                <td className="py-2">Protects against cross-site request forgery</td>
                <td className="py-2">Session</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mt-4">
          These cookies are set by NextAuth.js and are essential for authentication.
          They are HTTP-only, meaning they cannot be accessed by client-side JavaScript,
          providing an additional layer of security.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-6">Analytics cookies</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <strong>We do not use any analytics cookies.</strong> Padel Manager does not
          use Google Analytics, PostHog, Mixpanel, or any other analytics or tracking
          service. We do not track your browsing behavior across websites.
        </p>
      </section>

      <section>
        <h2 className="text-xl font-semibold mt-6">Managing cookies</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Since we only use essential cookies required for authentication, you cannot
          opt out of cookies without deleting your account. You can manage or delete
          cookies through your browser settings. Note that disabling essential cookies
          will prevent you from logging in.
        </p>
      </section>
    </div>
  );
}