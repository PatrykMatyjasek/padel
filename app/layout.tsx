import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import SessionProvider from "@/components/SessionProvider";
import Header from "@/components/Header";
import PageTracker from "@/components/PageTracker";
import FeedbackWidget from "@/components/FeedbackWidget";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Padel Manager",
  description: "Manage padel tournaments",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground min-h-screen`}>
        <SessionProvider>
          <Header />
          <PageTracker />
          <main className="max-w-5xl mx-auto px-2 sm:px-4 lg:px-6 py-4 sm:py-8">
            {children}
          </main>
          <FeedbackWidget />
          <footer className="border-t mt-16 py-6 text-center text-xs text-muted-foreground space-y-2">
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
