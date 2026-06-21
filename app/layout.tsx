import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import Script from "next/script";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import Header from "@/components/Header";
import PageTracker from "@/components/PageTracker";
import FeedbackWidget from "@/components/FeedbackWidget";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

export const metadata: Metadata = {
  title: {
    template: "%s | Padel Manager",
    default: "Padel Manager — Create & Track Padel Tournaments",
  },
  description:
    "Create, manage and share padel tournaments with friends. Americano, Mexicano and Classic formats.",
  keywords: [
    "padel",
    "tournament",
    "padel tournament",
    "americano",
    "mexicano",
    "padel manager",
  ],
  authors: [{ name: "Patryk Matyjasek", url: "https://fredsonthecode.pl" }],
  metadataBase: new URL(siteUrl),
  openGraph: {
    type: "website",
    siteName: "Padel Manager",
    title: "Padel Manager — Create & Track Padel Tournaments",
    description:
      "Create, manage and share padel tournaments with friends. Americano, Mexicano and Classic formats.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Padel Manager",
    description: "Create & Track Padel Tournaments",
  },
  alternates: { canonical: "/" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script
          id="gtm-script"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-NXGR8BPM');`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}>
        <noscript>
          <iframe
            src="https://www.googletagmanager.com/ns.html?id=GTM-NXGR8BPM"
            height="0"
            width="0"
            style={{ display: "none", visibility: "hidden" }}
          />
        </noscript>
        <SessionProvider>
          <Header />
          <PageTracker />
          <main className="max-w-5xl mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-8">
            {children}
          </main>
          <FeedbackWidget />
          <footer className="border-t mt-16 py-6 text-center text-xs text-muted-foreground space-y-2">
            <p>
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
              <span className="mx-1">·</span>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <span className="mx-1">·</span>
              <Link href="/cookies" className="hover:text-foreground transition-colors">Cookies</Link>
            </p>
            <p>
              Built by{" "}
              <a
                href="https://fredsonthecode.pl"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground hover:text-primary transition-colors"
              >
                Patryk Matyjasek
              </a>
            </p>
            <p>
              <a
                href="https://buy.stripe.com/5kQdR8cHdgUOfAjaRxa3u00"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-3 py-1.5 rounded-full border border-border hover:border-primary hover:text-primary transition-colors font-medium"
              >
                ☕ Support this project
              </a>
            </p>
          </footer>
        </SessionProvider>
      </body>
    </html>
  );
}
