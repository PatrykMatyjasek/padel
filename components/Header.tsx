"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function Header() {
  const { data: session, status } = useSession();

  return (
    <header className="sticky top-0 z-50 bg-primary text-primary-foreground shadow-md">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2.5 mr-auto">
          <div className="w-7 h-7 rounded-lg bg-primary-foreground/15 flex items-center justify-center shrink-0">
            <span className="text-primary-foreground text-xs font-bold">P</span>
          </div>
          <span className="font-semibold tracking-tight text-primary-foreground">Padel Manager</span>
        </Link>

        {status !== "loading" && (
          session ? (
            <div className="flex items-center gap-3">
              <span className="text-sm text-primary-foreground/70 hidden sm:block">{session.user.name}</span>
              {(session.user as any).isAdmin && (
                <Link href="/admin" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors hidden sm:block">
                  Admin
                </Link>
              )}
              <button
                onClick={() => signOut({ callbackUrl: "/" })}
                className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-sm text-primary-foreground/80 hover:text-primary-foreground transition-colors">
                Sign in
              </Link>
              <Link href="/register">
                <Button size="sm" variant="secondary" className="text-xs font-medium">
                  Register
                </Button>
              </Link>
            </div>
          )
        )}
      </div>
    </header>
  );
}
