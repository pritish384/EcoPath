"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AnalysisRow = {
  id: string;
  title: string;
  updated: string;
  tag: string;
};

export default function AnalysesPage() {
  const [analyses, setAnalyses] = useState<AnalysisRow[]>([]);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          setStatus("Sign in to view saved analyses.");
          return;
        }

        const [analysisRes, productRes, regionRes] = await Promise.all([
          supabase
            .from("analyses")
            .select("id,updated_at,product_id,region_id")
            .order("updated_at", { ascending: false }),
          supabase.from("products").select("id,name"),
          supabase.from("regions").select("id,name"),
        ]);

        if (analysisRes.error) throw analysisRes.error;
        if (productRes.error) throw productRes.error;
        if (regionRes.error) throw regionRes.error;

        const productMap = new Map(
          (productRes.data ?? []).map((row) => [row.id, row.name])
        );
        const regionMap = new Map(
          (regionRes.data ?? []).map((row) => [row.id, row.name])
        );

        setAnalyses(
          (analysisRes.data ?? []).map((row) => ({
            id: row.id,
            title: `${productMap.get(row.product_id) ?? "Product"} · ${
              regionMap.get(row.region_id) ?? "Region"
            }`,
            updated: new Date(row.updated_at).toLocaleDateString(),
            tag: "Saved",
          }))
        );
      } catch (error) {
        setStatus("Unable to load analyses.");
      }
    };

    load();
  }, []);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Ecopath
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Saved analyses
            </h1>
          </div>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Recent</h2>
            <p className="text-sm text-zinc-600">
              Saved runs tied to your account.
            </p>
          </div>
          <Link href="/" className={buttonVariants({ variant: "default" })}>
            New analysis
          </Link>
        </div>

        {analyses.length ? (
          <div className="grid gap-4 md:grid-cols-3">
            {analyses.map((analysis) => (
              <Card key={analysis.id}>
                <CardHeader>
                  <CardTitle className="text-base">{analysis.title}</CardTitle>
                  <CardDescription>Updated {analysis.updated}</CardDescription>
                </CardHeader>
                <CardContent className="flex items-center justify-between">
                  <Badge variant="outline">{analysis.tag}</Badge>
                  <Button size="sm" variant="ghost">
                    Open
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-sm text-zinc-600">
              {status || "No analyses saved yet."}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
