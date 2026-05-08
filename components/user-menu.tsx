"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function UserMenu() {
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
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
      <div className="text-sm text-zinc-500">Checking session…</div>
    );
  }

  if (!email) {
    return (
      <Link href="/auth" className={buttonVariants({ variant: "outline" })}>
        Sign in
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
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
