"use client";

import { useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ShieldCheckIcon, Sparkles } from "lucide-react";
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
        const nextPath =
          new URLSearchParams(window.location.search).get("next") ?? "/";
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
              nextPath
            )}`,
          },
        });

        if (error) throw error;
      } catch (err) {
        setMessage("Unable to sign in with Google. Please try again.");
      }
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-slate-50 to-blue-50 px-6 py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-5xl items-center justify-center">
        <Card className="w-full overflow-hidden shadow-xl p-0">
          <div className="grid items-stretch md:grid-cols-[1.05fr_0.95fr]">
            <CardHeader className="gap-4 p-10">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
                    EcoPath
                  </p>
                  <p className="text-xs text-zinc-500">
                    Lifecycle intelligence
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                <CardTitle className="text-3xl">Get Started with EcoPath</CardTitle>
                <CardDescription className="text-base text-zinc-600">
                  Sign in to build lifecycle pathway models and save reports.
                </CardDescription>
              </div>
              <CardContent className="grid gap-4 p-0">
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={isPending}
                  className="h-12 w-full gap-3"
                >
                  <span className="flex size-5 items-center justify-center rounded-full bg-white">
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 48 48"
                      className="size-4"
                    >
                      <path
                        fill="#EA4335"
                        d="M24 9.5c3.54 0 6.71 1.22 9.2 3.61l6.86-6.86C35.82 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.2C12.5 13.09 17.77 9.5 24 9.5z"
                      />
                      <path
                        fill="#4285F4"
                        d="M46.5 24.5c0-1.64-.15-3.22-.43-4.75H24v9h12.7c-.55 2.96-2.2 5.47-4.7 7.16l7.18 5.58C43.99 37.15 46.5 31.4 46.5 24.5z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M10.54 28.42c-.48-1.45-.76-2.99-.76-4.57s.27-3.12.76-4.57l-7.98-6.2C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.92l7.98-6.2z"
                      />
                      <path
                        fill="#34A853"
                        d="M24 48c6.48 0 11.93-2.14 15.9-5.81l-7.18-5.58c-2 1.35-4.56 2.16-8.72 2.16-6.23 0-11.5-3.59-13.46-8.92l-7.98 6.2C6.51 42.62 14.62 48 24 48z"
                      />
                    </svg>
                  </span>
                  Continue with Google
                </Button>
                <Badge className="w-fit bg-primary/10 text-primary" variant="secondary">
                  <ShieldCheckIcon className="size-4" />
                  Secure Google OAuth
                </Badge>
                {message ? (
                  <p className="text-sm text-zinc-600">{message}</p>
                ) : null}
              </CardContent>
            </CardHeader>

            <div className="flex h-full flex-col justify-center gap-6 bg-gradient-to-br from-blue-50 via-sky-100 to-indigo-100 p-10">
              <div className="space-y-2">
                <h2 className="text-xl font-semibold text-zinc-900">
                  Track lifecycle performance. <span className="text-primary">Act faster.</span>
                </h2>
                <p className="text-sm text-zinc-600">
                  Build regional pathway models with clean visuals, scenario
                  insights, and export-ready reports.
                </p>
              </div>
              <div className="rounded-2xl bg-white/70 p-4 shadow-sm">
                <div className="text-xs text-zinc-500">This month</div>
                <div className="text-2xl font-semibold text-zinc-900">
                  72% recovery
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
                  <span className="rounded-full bg-white px-3 py-1">
                    Formal 38%
                  </span>
                  <span className="rounded-full bg-white px-3 py-1">
                    Informal 22%
                  </span>
                  <span className="rounded-full bg-white px-3 py-1">
                    Loss 12%
                  </span>
                </div>
              </div>
              <div className="grid gap-3">
                {[
                  "Regional pathway summaries",
                  "AI insights in minutes",
                  "Team-ready exports",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 rounded-xl bg-white/70 px-3 py-2 text-sm text-zinc-700"
                  >
                    <CheckCircle2 className="size-4 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
