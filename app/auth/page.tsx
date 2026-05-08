"use client";

import { useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function AuthPage() {
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleGoogleSignIn = () => {
    setMessage("");
    startTransition(async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback`,
          },
        });

        if (error) throw error;
      } catch (err) {
        setMessage("Unable to sign in with Google. Please try again.");
      }
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-6 py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign in to Ecopath</CardTitle>
          <CardDescription>
            We’ll email you a magic link to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Button onClick={handleGoogleSignIn} disabled={isPending}>
            Continue with Google
          </Button>
          {message ? (
            <p className="text-sm text-zinc-600">{message}</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
