"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Info } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip as UiTooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const Explanation = ({
  plain,
  technical,
}: {
  plain: string;
  technical: string;
}) => (
  <UiTooltip>
    <TooltipTrigger
      className="mt-3 inline-flex items-center justify-center rounded-full border border-border/70 bg-background/80 p-1 text-muted-foreground shadow-sm transition hover:border-primary/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20"
      aria-label="Explanation"
    >
      <Info className="size-3.5 text-primary" />
    </TooltipTrigger>
    <TooltipContent className="max-w-xs text-xs">
      <p>
        <span className="font-semibold">Plain:</span> {plain}
      </p>
      <p className="mt-1">
        <span className="font-semibold">Technical:</span> {technical}
      </p>
    </TooltipContent>
  </UiTooltip>
);

const PathwayBars = dynamic(
  () => import("@/components/pathway-bars").then((mod) => mod.PathwayBars),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[220px] w-full items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/40 text-sm text-muted-foreground">
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
      <div className="flex h-[280px] w-full items-center justify-center rounded-md border border-dashed border-border/70 bg-muted/40 text-sm text-muted-foreground">
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
  const [report, setReport] = useState<Record<string, unknown> | null>(null);
  const [activePathway, setActivePathway] = useState(0);
  const [activeMetric, setActiveMetric] = useState<
    "eco" | "circularity" | "leakage" | "community" | "impact" | null
  >(null);

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

  const circularityScore =
    typeof report?.circularity_score === "number"
      ? report.circularity_score
      : null;
  const leakagePercent =
    typeof report?.waste_leakage_detector?.leakage_percent === "number"
      ? report.waste_leakage_detector.leakage_percent
      : null;
  const communityScore =
    typeof report?.community_waste_score?.score === "number"
      ? report.community_waste_score.score
      : null;
  const impactRecycle = report?.impact_simulator?.recycle?.co2_kg ?? null;
  const impactLandfill = report?.impact_simulator?.landfill?.co2_kg ?? null;
  const impactDelta = report?.impact_simulator?.delta_kg ?? null;

  const ecoOverall =
    typeof report?.eco_score?.overall === "number"
      ? report.eco_score.overall
      : null;
  const ecoRecyclability =
    typeof report?.eco_score?.recyclability_score === "number"
      ? report.eco_score.recyclability_score
      : null;
  const ecoImpact =
    typeof report?.eco_score?.environmental_impact_score === "number"
      ? report.eco_score.environmental_impact_score
      : null;
  const ecoToxicity =
    typeof report?.eco_score?.toxicity_score === "number"
      ? report.eco_score.toxicity_score
      : null;

  const metricCardClass = (key: string) =>
    `transition-all duration-300 ${
      activeMetric === key
        ? "ring-2 ring-primary/30 bg-primary/5"
        : "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10"
    }`;


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

  const safeActivePathway = sortedPathways.length
    ? Math.min(activePathway, sortedPathways.length - 1)
    : 0;

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
          (pathwayRes.data ?? []).map((row) => {
            const pathwayName = Array.isArray(row.pathways)
              ? row.pathways[0]?.name
              : (row.pathways as { name?: string } | null)?.name;
            return {
              id: row.pathway_id,
              name: pathwayName ?? "Pathway",
              probability: row.probability,
              loss: row.loss_hotspot,
            };
          })
        );

        setStatus("");
      } catch {
        setStatus("Unable to load analysis.");
      }
    };

    if (analysisId) load();
  }, [analysisId]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              EcoPath
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
            {updatedAt ? (
              <p className="text-sm text-muted-foreground">Updated {updatedAt}</p>
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
                      } catch {
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

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">

        {status ? (
          <Card>
            <CardContent className="py-8 text-sm text-muted-foreground">
              {status}
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-6 grid w-full grid-cols-3 rounded-2xl bg-muted/60 p-1 shadow-sm">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="insights">Insights</TabsTrigger>
              <TabsTrigger value="pathways">Pathways</TabsTrigger>
            </TabsList>
            <TabsContent value="overview" className="space-y-6">
              <section className="grid gap-4 lg:grid-cols-4">
              <Card>
                <CardHeader>
                  <CardTitle>Eco score</CardTitle>
                  <CardDescription>Weighted sustainability index.</CardDescription>
                </CardHeader>
                <CardContent
                  onClick={() => setActiveMetric(activeMetric === "eco" ? null : "eco")}
                  className={`cursor-pointer flex min-h-[260px] flex-col items-center justify-between ${metricCardClass("eco")}`}
                >
                  <div className="h-[140px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          dataKey="value"
                          data={[
                            { name: "Score", value: ecoOverall ?? 0 },
                            {
                              name: "Remaining",
                              value: 100 - (ecoOverall ?? 0),
                            },
                          ]}
                          innerRadius={50}
                          outerRadius={70}
                          startAngle={90}
                          endAngle={-270}
                        >
                          <Cell fill="#1d7e5f" />
                          <Cell fill="#e2e8f0" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-center text-sm font-medium text-foreground">
                    {ecoOverall ?? "–"}/100
                  </p>
                  <Progress value={ecoOverall ?? 0} className="w-full" />
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                    <Badge variant="secondary">
                      Recyclability: {report?.eco_score?.recyclability_label ?? "–"}
                    </Badge>
                    <Badge variant="secondary">
                      Impact: {report?.eco_score?.impact_label ?? "–"}
                    </Badge>
                    <Badge variant="secondary">
                      Toxicity: {report?.eco_score?.toxicity_label ?? "–"}
                    </Badge>
                  </div>
                  <Explanation
                    plain="Quick combined score of recyclability, impact, and toxicity."
                    technical="Overall = 40% recyclability + 35% environmental impact + 25% toxicity."
                  />
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>AI summary</CardTitle>
                  <CardDescription>
                    Executive overview generated from the model inputs.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {report?.summary ??
                    "Run an analysis to generate the AI summary report."}
                  <Explanation
                    plain="A short story of what likely happens to this product after use."
                    technical="Narrative summary distilled from predicted pathway probabilities."
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Circularity score</CardTitle>
                  <CardDescription>0–100 sustainability index.</CardDescription>
                </CardHeader>
                <CardContent
                  onClick={() => setActiveMetric(activeMetric === "circularity" ? null : "circularity")}
                  className={`cursor-pointer flex min-h-[260px] flex-col items-center justify-between ${metricCardClass("circularity")}`}
                >
                  <div className="h-[140px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          dataKey="value"
                          data={[
                            { name: "Score", value: circularityScore ?? 0 },
                            {
                              name: "Remaining",
                              value: 100 - (circularityScore ?? 0),
                            },
                          ]}
                          innerRadius={50}
                          outerRadius={70}
                          startAngle={90}
                          endAngle={-270}
                        >
                          <Cell fill="#0891b2" />
                          <Cell fill="#e2e8f0" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-center text-sm font-medium text-foreground">
                    {circularityScore ?? "–"}
                  </p>
                  <Progress value={circularityScore ?? 0} className="w-full" />
                  <Explanation
                    plain="Higher score means more material stays in reuse or recycling loops."
                    technical="Composite index derived from predicted recovery vs loss pathways."
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Waste leakage</CardTitle>
                  <CardDescription>Estimated leakage to landfill.</CardDescription>
                </CardHeader>
                <CardContent
                  onClick={() => setActiveMetric(activeMetric === "leakage" ? null : "leakage")}
                  className={`cursor-pointer flex min-h-[260px] flex-col items-center justify-between ${metricCardClass("leakage")}`}
                >
                  <div className="h-[140px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          dataKey="value"
                          data={[
                            { name: "Leakage", value: leakagePercent ?? 0 },
                            {
                              name: "Captured",
                              value: 100 - (leakagePercent ?? 0),
                            },
                          ]}
                          innerRadius={50}
                          outerRadius={70}
                          startAngle={90}
                          endAngle={-270}
                        >
                          <Cell fill="#ea580c" />
                          <Cell fill="#e2e8f0" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-center text-sm font-medium text-foreground">
                    {leakagePercent ?? "–"}%
                  </p>
                  <Progress value={leakagePercent ?? 0} className="w-full" />
                  <Explanation
                    plain="Share of waste likely ending up in landfill or loss."
                    technical="Leakage percent inferred from loss-heavy pathways."
                  />
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle>Eco score components</CardTitle>
                  <CardDescription>Underlying metric values.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm text-muted-foreground">
                  <div className="rounded-lg border border-border/40 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span>Recyclability</span>
                      <Badge variant="secondary">{ecoRecyclability ?? "–"}/100</Badge>
                    </div>
                    <Progress value={ecoRecyclability ?? 0} className="mt-2" />
                  </div>
                  <div className="rounded-lg border border-border/40 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span>Environmental impact</span>
                      <Badge variant="secondary">{ecoImpact ?? "–"}/100</Badge>
                    </div>
                    <Progress value={ecoImpact ?? 0} className="mt-2" />
                  </div>
                  <div className="rounded-lg border border-border/40 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span>Toxicity safety</span>
                      <Badge variant="secondary">{ecoToxicity ?? "–"}/100</Badge>
                    </div>
                    <Progress value={ecoToxicity ?? 0} className="mt-2" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Community score</CardTitle>
                  <CardDescription>
                    Local efficiency score and rationale.
                  </CardDescription>
                </CardHeader>
                <CardContent
                  onClick={() => setActiveMetric(activeMetric === "community" ? null : "community")}
                  className={`cursor-pointer flex min-h-[260px] flex-col items-center justify-between ${metricCardClass("community")}`}
                >
                  <div className="h-[140px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          dataKey="value"
                          data={[
                            { name: "Score", value: communityScore ?? 0 },
                            { name: "Remaining", value: 100 - (communityScore ?? 0) },
                          ]}
                          innerRadius={50}
                          outerRadius={70}
                          startAngle={90}
                          endAngle={-270}
                        >
                          <Cell fill="#15803d" />
                          <Cell fill="#e2e8f0" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-center text-sm font-medium text-foreground">
                    {communityScore ?? "–"}/100
                  </p>
                  <Progress value={communityScore ?? 0} className="w-full" />
                  <Explanation
                    plain="Overall local waste system effectiveness score."
                    technical="Heuristic score combining recovery and leakage indicators."
                  />
                </CardContent>
              </Card>
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>Impact simulator</CardTitle>
                  <CardDescription>CO₂ impact comparison.</CardDescription>
                </CardHeader>
                <CardContent className="flex h-[260px] flex-col">
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: "Recycle", value: impactRecycle ?? 0 },
                          { name: "Landfill", value: impactLandfill ?? 0 },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#0891b2" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Delta: {impactDelta ?? "–"} kg CO₂
                  </p>
                  <Explanation
                    plain="Compares emissions if recycled vs sent to landfill."
                    technical="LCA-style CO₂ estimate using typical factors."
                  />
                </CardContent>
              </Card>
            </section>

            <Card className="bg-background">
              <CardHeader>
                <CardTitle>Executive summary</CardTitle>
                <CardDescription>
                  High-level highlights and coverage for this lifecycle model.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between rounded-lg border border-border/40 px-4 py-3">
                  <span>Total modeled outcomes</span>
                  <Badge variant="secondary">{sortedPathways.length}</Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/40 px-4 py-3">
                  <span>Probability coverage</span>
                  <Badge variant="secondary">
                    {Math.min(100, Math.round(totalProbability))}%
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/40 px-4 py-3">
                  <span>Top pathway</span>
                  <Badge variant="secondary">
                    {sortedPathways[0]?.name ?? "–"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border/40 px-4 py-3">
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
                <CardContent className="text-sm text-muted-foreground">
                  {notes}
                </CardContent>
              </Card>
            ) : null}
            </TabsContent>

            <TabsContent value="insights" className="space-y-6">
              <Accordion className="space-y-4">
                <AccordionItem value="insights-key" className="border-none">
                  <AccordionTrigger className="rounded-xl border border-border/40 px-4">
                    Key insights & hotspots
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Key insights</CardTitle>
                  <CardDescription>
                    Summary observations from the probability mix.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 text-sm text-muted-foreground">
                  <div className="rounded-lg border border-border/40 px-4 py-3">
                    {sortedPathways[0]
                      ? `The leading pathway is ${sortedPathways[0].name} at ${sortedPathways[0].probability}%.`
                      : "No dominant pathway identified yet."}
                  </div>
                  <div className="rounded-lg border border-border/40 px-4 py-3">
                    {sortedPathways.length > 1
                      ? `The top two pathways account for ~${Math.round(
                          (sortedPathways[0]?.probability ?? 0) +
                            (sortedPathways[1]?.probability ?? 0)
                        )}% of outcomes.`
                      : "Add more pathways to compare distribution."}
                  </div>
                  <div className="rounded-lg border border-border/40 px-4 py-3">
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
                        className="rounded-lg border border-border/40 px-4 py-3 text-sm text-muted-foreground"
                      >
                        <p className="font-medium text-foreground">
                          {row.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          Loss hotspot: {row.loss}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No loss hotspots captured.
                    </p>
                  )}
                </CardContent>
              </Card>
            </section>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>

            <Card>
              <CardHeader>
                <CardTitle>Recommended actions</CardTitle>
                <CardDescription>
                  Prioritized follow-ups to improve recovery.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-muted-foreground">
                <div className="rounded-lg border border-border/40 px-4 py-3">
                  Validate top pathway assumptions with regional collection data.
                </div>
                <div className="rounded-lg border border-border/40 px-4 py-3">
                  Focus interventions on the highest-probability loss hotspot.
                </div>
                <div className="rounded-lg border border-border/40 px-4 py-3">
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
                <CardContent className="grid gap-3 text-sm text-muted-foreground">
                  <div className="grid gap-2 rounded-lg border border-border/40 px-4 py-3">
                    <span className="text-xs uppercase text-zinc-400">Day</span>
                    <p>
                      {report?.waste_future_predictor?.day ??
                        "Day-level outlook will appear after AI analysis."}
                    </p>
                  </div>
                  <div className="grid gap-2 rounded-lg border border-border/40 px-4 py-3">
                    <span className="text-xs uppercase text-zinc-400">Week</span>
                    <p>
                      {report?.waste_future_predictor?.week ??
                        "Week-level outlook will appear after AI analysis."}
                    </p>
                  </div>
                  <div className="grid gap-2 rounded-lg border border-border/40 px-4 py-3">
                    <span className="text-xs uppercase text-zinc-400">Year</span>
                    <p>
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
                <CardContent className="grid gap-3 text-sm text-muted-foreground">
                  <div className="rounded-lg border border-border/40 px-4 py-3">
                    <p className="text-xs uppercase text-zinc-400">Observed habits</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {(report?.behavior_based_suggestion?.habits ?? []).map(
                        (item: string) => (
                          <Badge key={item} variant="secondary">
                            {item}
                          </Badge>
                        )
                      )}
                      {!report?.behavior_based_suggestion?.habits?.length ? (
                        <span className="text-xs text-zinc-500">
                          Habits will appear after AI analysis.
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/40 px-4 py-3">
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
                <CardContent className="grid gap-3 text-sm text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    {(report?.waste_flow_map?.steps ?? []).map(
                      (step: string, idx: number, arr: string[]) => (
                        <div key={step} className="flex items-center gap-2">
                          <Badge variant="secondary">{step}</Badge>
                          {idx < arr.length - 1 ? (
                            <span className="text-zinc-400">→</span>
                          ) : null}
                        </div>
                      )
                    )}
                    {!report?.waste_flow_map?.steps?.length ? (
                      <span className="text-xs text-zinc-500">
                        Flow steps will appear after AI analysis.
                      </span>
                    ) : null}
                  </div>
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
                <CardContent className="grid gap-3 text-sm text-muted-foreground">
                  <div className="rounded-lg border border-border/40 px-4 py-3">
                    <p className="text-xs uppercase text-zinc-400">Recycle</p>
                    <p className="mt-1 text-sm">
                      {(report?.impact_simulator?.recycle?.co2_kg ?? "–")} kg CO₂
                    </p>
                    <p className="text-xs text-zinc-500">
                      {report?.impact_simulator?.recycle?.notes ?? ""}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/40 px-4 py-3">
                    <p className="text-xs uppercase text-zinc-400">Landfill</p>
                    <p className="mt-1 text-sm">
                      {(report?.impact_simulator?.landfill?.co2_kg ?? "–")} kg CO₂
                    </p>
                    <p className="text-xs text-zinc-500">
                      {report?.impact_simulator?.landfill?.notes ?? ""}
                    </p>
                  </div>
                  <div className="rounded-lg border border-border/40 px-4 py-3">
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
                <CardContent className="grid gap-2 text-sm text-muted-foreground">
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
                <CardContent className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: "Low",
                          value: report?.uncertainty_output?.range_low ?? 0,
                        },
                        {
                          name: "High",
                          value: report?.uncertainty_output?.range_high ?? 0,
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#64748b" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  {report?.uncertainty_output?.notes ? (
                    <p className="text-xs text-zinc-500">
                      {report.uncertainty_output.notes}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Waste leakage detector</CardTitle>
                  <CardDescription>
                    Inefficiencies driving landfill leakage.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm text-muted-foreground">
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
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Product-aware prediction</CardTitle>
                  <CardDescription>
                    How brand/type influences outcomes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
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
                <CardContent className="text-sm text-muted-foreground">
                  {report?.explainable_ai_output ??
                    "Explainability notes will appear after AI analysis."}
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <Card>
                <CardHeader>
                  <CardTitle>Reverse supply chain suggestions</CardTitle>
                  <CardDescription>
                    Resale, repair, and reuse opportunities.
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-2 text-sm text-muted-foreground">
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
            </TabsContent>

            <TabsContent value="pathways" className="space-y-6">
              <section className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
                <Card>
                  <CardHeader>
                    <CardTitle>Pathway flow view</CardTitle>
                    <CardDescription>
                      Step through the most likely pathway outcomes.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3">
                    {sortedPathways.length ? (
                      <ol className="space-y-2">
                        {sortedPathways.map((row, index) => {
                          const isActive = index === safeActivePathway;
                          return (
                            <li key={`${row.id}-${index}`}>
                              <button
                                type="button"
                                onClick={() => setActivePathway(index)}
                                className={`flex w-full items-start gap-3 rounded-md border px-3 py-2 text-left transition ${
                                  isActive
                                    ? "border-primary/60 bg-primary/5"
                                    : "border-border/40 hover:border-primary/30"
                                }`}
                              >
                                <span
                                  className={`mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                                    isActive
                                      ? "bg-primary text-white"
                                      : "bg-zinc-100 text-muted-foreground"
                                  }`}
                                >
                                  {index + 1}
                                </span>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between gap-3">
                                    <p className="font-medium text-foreground">
                                      {row.name}
                                    </p>
                                    <Badge variant="secondary">
                                      {row.probability}%
                                    </Badge>
                                  </div>
                                  {row.loss ? (
                                    <p className="text-xs text-zinc-500">
                                      Loss hotspot: {row.loss}
                                    </p>
                                  ) : null}
                                </div>
                              </button>
                            </li>
                          );
                        })}
                      </ol>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        No pathway data saved.
                      </p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Selected pathway</CardTitle>
                    <CardDescription>
                      Details for the currently highlighted step.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 text-sm text-muted-foreground">
                    {sortedPathways.length ? (
                      <>
                        <div className="rounded-lg border border-border/40 px-4 py-3">
                          <p className="text-xs uppercase text-zinc-400">
                            Pathway
                          </p>
                          <p className="mt-1 text-base font-semibold text-foreground">
                            {sortedPathways[safeActivePathway]?.name}
                          </p>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-lg border border-border/40 px-4 py-3">
                            <p className="text-xs uppercase text-zinc-400">
                              Probability
                            </p>
                            <p className="mt-1 text-sm font-medium text-foreground">
                              {sortedPathways[safeActivePathway]?.probability ?? "–"}%
                            </p>
                          </div>
                          <div className="rounded-lg border border-border/40 px-4 py-3">
                            <p className="text-xs uppercase text-zinc-400">
                              Loss hotspot
                            </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {sortedPathways[safeActivePathway]?.loss ?? "None flagged"}
                            </p>
                          </div>
                        </div>
                        <div className="rounded-lg border border-border/40 px-4 py-3">
                          <p className="text-xs uppercase text-zinc-400">
                            Notes
                          </p>
                          <p className="mt-1 text-sm text-muted-foreground">
                            Use this step to review assumptions for this pathway
                            and confirm if the probability aligns with field
                            observations.
                          </p>
                        </div>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Select a pathway to see details.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </section>

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
            </TabsContent>
          </Tabs>
        )}
      </main>
    </div>
  );
}
