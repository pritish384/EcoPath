"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
    { id: string; name: string; probability: number; loss: string | null }[]
  >([]);
  const [status, setStatus] = useState("Loading analysis…");
  const [isDeleting, setIsDeleting] = useState(false);
  const [report, setReport] = useState<Record<string, any> | null>(null);

  const sortedPathways = useMemo(() => {
    return [...pathways].sort((a, b) => b.probability - a.probability);
  }, [pathways]);

  const totalProbability = useMemo(() => {
    return sortedPathways.reduce((sum, row) => sum + row.probability, 0);
  }, [sortedPathways]);

  const topLosses = useMemo(() => {
    return sortedPathways.filter((row) => row.loss).slice(0, 3);
  }, [sortedPathways]);

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
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.user) {
          setStatus("Sign in to view this analysis.");
          return;
        }

        const analysisRes = await supabase
          .from("analyses")
          .select("id,notes,updated_at,product_id,region_id,report")
          .eq("id", analysisId)
          .single();

        if (analysisRes.error) throw analysisRes.error;

        const [productRes, regionRes, pathwayRes] = await Promise.all([
          supabase.from("products").select("id,name"),
          supabase.from("regions").select("id,name"),
          supabase
            .from("analysis_pathways")
            .select("probability,loss_hotspot,pathways(name),pathway_id")
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
        setReport(analysisRes.data.report ?? null);

        setPathways(
          (pathwayRes.data ?? []).map((row) => ({
            id: row.pathway_id,
            name: row.pathways?.name ?? "Pathway",
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
              EcoPath
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
            <AlertDialog>
              <AlertDialogTrigger
                className={buttonVariants({ variant: "destructive" })}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete analysis</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete this analysis and its pathways.
                    This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={async () => {
                      setIsDeleting(true);
                      try {
                        const supabase = createSupabaseBrowserClient();
                        const { data: sessionData } =
                          await supabase.auth.getSession();
                        if (!sessionData?.session?.user) {
                          setStatus("Sign in to manage analyses.");
                          return;
                        }

                        const { error } = await supabase
                          .from("analyses")
                          .delete()
                          .eq("id", analysisId);

                        if (error) throw error;

                        window.location.href = "/analyses";
                      } catch (error) {
                        setStatus("Unable to delete analysis.");
                      } finally {
                        setIsDeleting(false);
                      }
                    }}
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
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
            {report?.summary ? (
              <Card>
                <CardHeader>
                  <CardTitle>AI summary</CardTitle>
                  <CardDescription>
                    Executive overview generated from the model inputs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-zinc-700">
                  {report.summary}
                </CardContent>
              </Card>
            ) : null}

            <Card className="bg-white">
              <CardHeader>
                <CardTitle>Executive summary</CardTitle>
                <CardDescription>
                  High-level highlights and coverage for this lifecycle model.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-zinc-700">
                <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3">
                  <span>Total modeled outcomes</span>
                  <Badge variant="secondary">{sortedPathways.length}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3">
                  <span>Probability coverage</span>
                  <Badge variant="secondary">
                    {Math.min(100, Math.round(totalProbability))}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3">
                  <span>Top pathway</span>
                  <Badge variant="secondary">
                    {sortedPathways[0]?.name ?? "–"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-zinc-200 px-4 py-3">
                  <span>Circularity score</span>
                  <Badge variant="secondary">
                    {report?.circularity_score ?? "–"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

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

            <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Key insights</CardTitle>
                  <CardDescription>
                    Summary observations from the probability mix.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm text-zinc-700">
                  <div className="rounded-lg border border-zinc-200 px-4 py-3">
                    {sortedPathways[0]
                      ? `The leading pathway is ${sortedPathways[0].name} at ${sortedPathways[0].probability}%.`
                      : "No dominant pathway identified yet."}
                  </div>
                  <div className="rounded-lg border border-zinc-200 px-4 py-3">
                    {sortedPathways.length > 1
                      ? `The top two pathways account for ~${Math.round(
                          (sortedPathways[0]?.probability ?? 0) +
                            (sortedPathways[1]?.probability ?? 0)
                        )}% of outcomes.`
                      : "Add more pathways to compare distribution."}
                  </div>
                  <div className="rounded-lg border border-zinc-200 px-4 py-3">
                    {topLosses.length
                      ? `Key loss hotspots flagged in ${topLosses.length} pathway(s).`
                      : "No loss hotspots flagged yet."}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Top loss hotspots</CardTitle>
                  <CardDescription>
                    Where material loss is most likely to occur.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {topLosses.length ? (
                    topLosses.map((row, index) => (
                      <div
                        key={`${row.id}-loss-${index}`}
                        className="rounded-lg border border-zinc-200 px-4 py-3 text-sm text-zinc-700"
                      >
                        <p className="font-medium text-zinc-900">
                          {row.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Loss hotspot: {row.loss}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-zinc-600">
                      No loss hotspots captured.
                    </p>
                  )}
                </CardContent>
              </Card>
            </section>

            <Card>
              <CardHeader>
                <CardTitle>Recommended actions</CardTitle>
                <CardDescription>
                  Prioritized follow-ups to improve recovery.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-zinc-700">
                <div className="rounded-lg border border-zinc-200 px-4 py-3">
                  Validate top pathway assumptions with regional collection data.
                </div>
                <div className="rounded-lg border border-zinc-200 px-4 py-3">
                  Focus interventions on the highest-probability loss hotspot.
                </div>
                <div className="rounded-lg border border-zinc-200 px-4 py-3">
                  Capture informal recovery signals to improve model confidence.
                </div>
              </CardContent>
            </Card>

            <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Waste future predictor</CardTitle>
                  <CardDescription>
                    Timeline outlook after disposal.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm text-zinc-700">
                  <div className="rounded-lg border border-zinc-200 px-4 py-3">
                    <span className="text-xs uppercase text-zinc-400">Day</span>
                    <p className="mt-1">
                      {report?.waste_future_predictor?.day ??
                        "Day-level outlook will appear after AI analysis."}
                    </p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 px-4 py-3">
                    <span className="text-xs uppercase text-zinc-400">Week</span>
                    <p className="mt-1">
                      {report?.waste_future_predictor?.week ??
                        "Week-level outlook will appear after AI analysis."}
                    </p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 px-4 py-3">
                    <span className="text-xs uppercase text-zinc-400">Year</span>
                    <p className="mt-1">
                      {report?.waste_future_predictor?.year ??
                        "Year-level outlook will appear after AI analysis."}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Behavior-based suggestion</CardTitle>
                  <CardDescription>
                    How habits shift the outcome.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm text-zinc-700">
                  <div className="rounded-lg border border-zinc-200 px-4 py-3">
                    <p className="text-xs uppercase text-zinc-400">Observed habits</p>
                    <ul className="mt-2 list-disc space-y-1 pl-4">
                      {(report?.behavior_based_suggestion?.habits ?? []).map(
                        (item: string) => (
                          <li key={item}>{item}</li>
                        )
                      )}
                      {!report?.behavior_based_suggestion?.habits?.length ? (
                        <li>Habits will appear after AI analysis.</li>
                      ) : null}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-zinc-200 px-4 py-3">
                    <p className="text-xs uppercase text-zinc-400">Suggestions</p>
                    <ul className="mt-2 list-disc space-y-1 pl-4">
                      {(report?.behavior_based_suggestion?.suggestions ?? []).map(
                        (item: string) => (
                          <li key={item}>{item}</li>
                        )
                      )}
                      {!report?.behavior_based_suggestion?.suggestions?.length ? (
                        <li>Suggestions will appear after AI analysis.</li>
                      ) : null}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Waste flow map</CardTitle>
                  <CardDescription>
                    Visual chain from user to final stage.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm text-zinc-700">
                  <ol className="list-decimal space-y-2 pl-5">
                    {(report?.waste_flow_map?.steps ?? []).map((step: string) => (
                      <li key={step}>{step}</li>
                    ))}
                    {!report?.waste_flow_map?.steps?.length ? (
                      <li>Flow steps will appear after AI analysis.</li>
                    ) : null}
                  </ol>
                  {report?.waste_flow_map?.notes ? (
                    <p className="text-xs text-zinc-500">
                      {report.waste_flow_map.notes}
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Impact simulator</CardTitle>
                  <CardDescription>
                    CO₂ impact of recycling vs landfill.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm text-zinc-700">
                  <div className="rounded-lg border border-zinc-200 px-4 py-3">
                    <p className="text-xs uppercase text-zinc-400">Recycle</p>
                    <p className="mt-1 text-sm">
                      {(report?.impact_simulator?.recycle?.co2_kg ?? "–")} kg CO₂
                    </p>
                    <p className="text-xs text-zinc-500">
                      {report?.impact_simulator?.recycle?.notes ?? ""}
                    </p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 px-4 py-3">
                    <p className="text-xs uppercase text-zinc-400">Landfill</p>
                    <p className="mt-1 text-sm">
                      {(report?.impact_simulator?.landfill?.co2_kg ?? "–")} kg CO₂
                    </p>
                    <p className="text-xs text-zinc-500">
                      {report?.impact_simulator?.landfill?.notes ?? ""}
                    </p>
                  </div>
                  <div className="rounded-lg border border-zinc-200 px-4 py-3">
                    <p className="text-xs uppercase text-zinc-400">Delta</p>
                    <p className="mt-1 text-sm">
                      {(report?.impact_simulator?.delta_kg ?? "–")} kg CO₂ saved
                    </p>
                  </div>
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Hidden material flow</CardTitle>
                  <CardDescription>
                    Informal or unseen pathways.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm text-zinc-700">
                  <ul className="list-disc space-y-1 pl-4">
                    {(report?.hidden_material_flow ?? []).map((item: string) => (
                      <li key={item}>{item}</li>
                    ))}
                    {!report?.hidden_material_flow?.length ? (
                      <li>Hidden flows will appear after AI analysis.</li>
                    ) : null}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Uncertainty output</CardTitle>
                  <CardDescription>
                    Probabilistic range from Monte Carlo style estimate.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm text-zinc-700">
                  <p>
                    Range: {report?.uncertainty_output?.range_low ?? "–"}% to {""}
                    {report?.uncertainty_output?.range_high ?? "–"}%
                  </p>
                  {report?.uncertainty_output?.notes ? (
                    <p className="text-xs text-zinc-500">
                      {report.uncertainty_output.notes}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Waste leakage detector</CardTitle>
                  <CardDescription>
                    Inefficiencies driving landfill leakage.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm text-zinc-700">
                  <p>
                    Leakage: {report?.waste_leakage_detector?.leakage_percent ?? "–"}%
                  </p>
                  <ul className="list-disc space-y-1 pl-4">
                    {(report?.waste_leakage_detector?.drivers ?? []).map(
                      (item: string) => (
                        <li key={item}>{item}</li>
                      )
                    )}
                    {!report?.waste_leakage_detector?.drivers?.length ? (
                      <li>Leakage drivers will appear after AI analysis.</li>
                    ) : null}
                  </ul>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>What-if scenario engine</CardTitle>
                  <CardDescription>
                    Simulated changes under different interventions.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm text-zinc-700">
                  {(report?.what_if_scenario_engine ?? []).map(
                    (scenario: { scenario: string; expected_change: string }, idx: number) => (
                      <div
                        key={`${scenario.scenario}-${idx}`}
                        className="rounded-lg border border-zinc-200 px-4 py-3"
                      >
                        <p className="font-medium text-zinc-900">
                          {scenario.scenario}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {scenario.expected_change}
                        </p>
                      </div>
                    )
                  )}
                  {!report?.what_if_scenario_engine?.length ? (
                    <div className="rounded-lg border border-zinc-200 px-4 py-3">
                      Scenario impacts will appear after AI analysis.
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Product-aware prediction</CardTitle>
                  <CardDescription>
                    How brand/type influences outcomes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-zinc-700">
                  {report?.product_aware_prediction ??
                    "Product-aware prediction will appear after AI analysis."}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Explainable AI output</CardTitle>
                  <CardDescription>
                    Why the model reached these results.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-zinc-700">
                  {report?.explainable_ai_output ??
                    "Explainability notes will appear after AI analysis."}
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Community waste score</CardTitle>
                  <CardDescription>
                    Local efficiency score and rationale.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm text-zinc-700">
                  <p>
                    Score: {report?.community_waste_score?.score ?? "–"}/100
                  </p>
                  {report?.community_waste_score?.rationale ? (
                    <p className="text-xs text-zinc-500">
                      {report.community_waste_score.rationale}
                    </p>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Reverse supply chain suggestions</CardTitle>
                  <CardDescription>
                    Resale, repair, and reuse opportunities.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm text-zinc-700">
                  <ul className="list-disc space-y-1 pl-4">
                    {(report?.reverse_supply_chain_suggestion ?? []).map(
                      (item: string) => (
                        <li key={item}>{item}</li>
                      )
                    )}
                    {!report?.reverse_supply_chain_suggestion?.length ? (
                      <li>Suggestions will appear after AI analysis.</li>
                    ) : null}
                  </ul>
                </CardContent>
              </Card>
            </section>

            <Card>
              <CardHeader>
                <CardTitle>Pathway outcomes</CardTitle>
                <CardDescription>
                  Saved probability split for this analysis.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {pathways.length ? (
                  sortedPathways.map((row, index) => (
                    <div
                      key={`${row.id}-${index}`}
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
