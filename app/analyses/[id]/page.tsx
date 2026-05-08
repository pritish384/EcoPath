"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const PathwayBars = dynamic(
  () => import("@/components/pathway-bars").then((mod) => mod.PathwayBars),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[220px] w-full items-center justify-center rounded-md border border-dashed border-zinc-200 text-sm text-zinc-500">
        Loading chart…
      </div>
    ),
  }
);
const PathwaySankey = dynamic(
  () => import("@/components/pathway-sankey").then((mod) => mod.PathwaySankey),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[280px] w-full items-center justify-center rounded-md border border-dashed border-zinc-200 text-sm text-zinc-500">
        Loading chart…
      </div>
    ),
  }
);

export default function AnalysisDetailPage() {
  const params = useParams();
  const analysisId = params?.id as string;
  const [title, setTitle] = useState("Analysis");
  const [notes, setNotes] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [pathways, setPathways] = useState<
    { name: string; probability: number; loss: string | null }[]
  >([]);
  const [status, setStatus] = useState("Loading analysis…");

  const barData = useMemo(() => {
    return pathways.map((row) => ({
      name: row.name.split(" ")[0],
      value: row.probability,
    }));
  }, [pathways]);

  const sankeyData = useMemo(() => {
    if (!pathways.length) return undefined;
    return {
      nodes: [{ name: title }, ...pathways.map((row) => ({ name: row.name }))],
      links: pathways.map((row, index) => ({
        source: 0,
        target: index + 1,
        value: row.probability,
      })),
    };
  }, [pathways, title]);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) {
          setStatus("Sign in to view this analysis.");
          return;
        }

        const analysisRes = await supabase
          .from("analyses")
          .select("id,notes,updated_at,product_id,region_id")
          .eq("id", analysisId)
          .single();

        if (analysisRes.error) throw analysisRes.error;

        const [productRes, regionRes, pathwayRes] = await Promise.all([
          supabase.from("products").select("id,name"),
          supabase.from("regions").select("id,name"),
          supabase
            .from("analysis_pathways")
            .select("probability,loss_hotspot,pathway_id")
            .eq("analysis_id", analysisId),
        ]);

        if (productRes.error) throw productRes.error;
        if (regionRes.error) throw regionRes.error;
        if (pathwayRes.error) throw pathwayRes.error;

        const productMap = new Map(
          (productRes.data ?? []).map((row) => [row.id, row.name])
        );
        const regionMap = new Map(
          (regionRes.data ?? []).map((row) => [row.id, row.name])
        );

        const productName = productMap.get(analysisRes.data.product_id) ?? "Product";
        const regionName = regionMap.get(analysisRes.data.region_id) ?? "Region";

        setTitle(`${productName} · ${regionName}`);
        setNotes(analysisRes.data.notes ?? null);
        setUpdatedAt(
          analysisRes.data.updated_at
            ? new Date(analysisRes.data.updated_at).toLocaleString()
            : null
        );

        const pathwayLookup = new Map(
          (await supabase.from("pathways").select("id,name")).data?.map(
            (row) => [row.id, row.name]
          ) ?? []
        );

        setPathways(
          (pathwayRes.data ?? []).map((row) => ({
            name: pathwayLookup.get(row.pathway_id) ?? "Pathway",
            probability: row.probability,
            loss: row.loss_hotspot,
          }))
        );

        setStatus("");
      } catch (error) {
        setStatus("Unable to load analysis.");
      }
    };

    if (analysisId) load();
  }, [analysisId]);

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
              Ecopath
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {updatedAt ? (
              <p className="text-sm text-zinc-500">Updated {updatedAt}</p>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/analyses"
              className={buttonVariants({ variant: "outline" })}
            >
              Back
            </Link>
            <Link href="/" className={buttonVariants({ variant: "default" })}>
              New analysis
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-6 py-10">
        {status ? (
          <Card>
            <CardContent className="py-8 text-sm text-zinc-600">
              {status}
            </CardContent>
          </Card>
        ) : (
          <>
            {notes ? (
              <Card>
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-zinc-700">
                  {notes}
                </CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>Pathway outcomes</CardTitle>
                <CardDescription>
                  Saved probability split for this analysis.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {pathways.length ? (
                  pathways
                    .sort((a, b) => b.probability - a.probability)
                    .map((row) => (
                      <div
                        key={row.name}
                        className="flex items-center justify-between rounded-md border border-zinc-200 px-4 py-3"
                      >
                        <div>
                          <p className="font-medium text-zinc-900">{row.name}</p>
                          {row.loss ? (
                            <p className="text-sm text-zinc-500">
                              Loss hotspot: {row.loss}
                            </p>
                          ) : null}
                        </div>
                        <Badge variant="secondary">{row.probability}%</Badge>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-zinc-600">
                    No pathway data saved.
                  </p>
                )}
              </CardContent>
            </Card>

            <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Pathway flow</CardTitle>
                  <CardDescription>Visual pathway split.</CardDescription>
                </CardHeader>
                <CardContent>
                  <PathwaySankey data={sankeyData} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Probability breakdown</CardTitle>
                  <CardDescription>Outcome distribution.</CardDescription>
                </CardHeader>
                <CardContent>
                  <PathwayBars data={barData} />
                </CardContent>
              </Card>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
