"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";

export function UserMenu() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user?.email ?? null);
      setLoading(false);
    });
  }, []);

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.href = "/auth";
  };

  if (loading) {
    return (
      <div className="flex items-center gap-3 text-sm text-zinc-500">
        <ThemeToggle />
        Checking session…
      </div>
    );
  }

  if (!email) {
    return (
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <Link href="/auth" className={buttonVariants({ variant: "outline" })}>
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <ThemeToggle />
      <Badge variant="secondary">{email}</Badge>
      <button
        type="button"
        onClick={handleSignOut}
        className={buttonVariants({ variant: "outline" })}
      >
        Sign out
      </button>
    </div>
  );
}
