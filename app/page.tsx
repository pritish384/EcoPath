"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Bot,
  Brain,
  ChevronRight,
  MapPinned,
  MessageSquare,
  Recycle,
  Sparkles,
  UploadCloud,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FeatureIconStack } from "@/components/eco-illustrations";

type AnalysisPathway = {
  name: string;
  probability: number;
  loss: string;
};

const featureCards = [
  {
    title: "Smart Disposal Pathway Generator",
    description: "Guided steps tailored to any item.",
    body: "Recycle, reuse, donate, sell, compost, or hazardous disposal pathways as a guided flow.",
    href: "/disposal",
    icon: Recycle,
    gradient: "from-emerald-500/15 to-teal-400/10",
  },
  {
    title: "Location-Based Suggestions",
    description: "Nearby drop-offs and facilities.",
    body: "Recycling centers, e-waste facilities, scrap dealers, donation centers, and compost units with maps, hours, and directions.",
    href: "/locations",
    icon: MapPinned,
    gradient: "from-teal-500/15 to-cyan-400/10",
  },
  {
    title: "Eco Score",
    description: "Instant sustainability rating.",
    body: "Recyclability score, environmental impact level, and toxicity rating for quick decisions.",
    icon: Sparkles,
    gradient: "from-amber-500/20 to-lime-400/10",
  },
  {
    title: "Quick Actions",
    description: "One-tap decisions.",
    body: "Recycle, reuse, donate, sell, compost, or hazardous disposal — each generates a full action pathway.",
    href: "/quick-actions",
    icon: Zap,
    gradient: "from-amber-500/20 to-orange-400/10",
  },
  {
    title: "AI Chat Assistant",
    description: "Conversational guidance.",
    body: "Ask questions like “Can I recycle pizza boxes?” and get personalized answers.",
    href: "/ai-chat",
    icon: Bot,
    gradient: "from-stone-500/15 to-emerald-400/10",
  },
  {
    title: "Reuse Suggestions",
    description: "“Can this be reused?” ideas.",
    body: "DIY reuse ideas, upcycling suggestions, donation options, and resale platforms.",
    href: "/reuse-suggestions",
    icon: Wrench,
    gradient: "from-lime-500/15 to-emerald-400/10",
  },
  {
    title: "Community Forum",
    description: "Local answers and discussions.",
    body: "Ask disposal questions, share collection updates, review facilities, and coordinate reuse with neighbors.",
    href: "/community-uploads",
    icon: MessageSquare,
    gradient: "from-rose-500/10 to-amber-400/10",
  },
  {
    title: "Multi-Material Breakdown",
    description: "Component-level disposal.",
    body: "Breaks items into components and assigns disposal categories per part.",
    href: "/disposal",
    icon: Brain,
    gradient: "from-teal-500/15 to-lime-400/10",
  },
  {
    title: "AI-Powered Categorization",
    description: "Automatic waste classification.",
    body: "Labels items as recyclable, hazardous, compostable, or mixed from image/text input.",
    href: "/ai-categorization",
    icon: Sparkles,
    gradient: "from-stone-500/15 to-emerald-300/10",
  },
];

export default function Home() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"manual" | "ai">("ai");
  const [showModeDialog, setShowModeDialog] = useState(false);
  const [modalStep, setModalStep] = useState<"mode" | "inputs">("mode");
  const [productType, setProductType] = useState("");
  const [region, setRegion] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [savedAnalyses, setSavedAnalyses] = useState<
    { id: string; title: string; updated: string; tag: string }[]
  >([]);

  const regions = [
    "India",
    "European Union",
    "United States",
    "SE Asia",
    "Africa",
  ];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  useEffect(() => {
    const loadAnalyses = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session?.user) return;

        const { data, error } = await supabase
          .from("analyses")
          .select("id,updated_at,product_id,region_id")
          .order("updated_at", { ascending: false })
          .limit(3);

        if (error) throw error;

        const [productRes, regionRes] = await Promise.all([
          supabase.from("products").select("id,name"),
          supabase.from("regions").select("id,name"),
        ]);

        const productMap = new Map(
          (productRes.data ?? []).map((p) => [p.id, p.name])
        );
        const regionMap = new Map(
          (regionRes.data ?? []).map((r) => [r.id, r.name])
        );

        setSavedAnalyses(
          (data ?? []).map((row) => ({
            id: row.id,
            title: `${productMap.get(row.product_id) ?? "Product"} · ${
              regionMap.get(row.region_id) ?? "Region"
            }`,
            updated: new Date(row.updated_at).toLocaleDateString(),
            tag: "Saved",
          }))
        );
      } catch {
        setSavedAnalyses([]);
      }
    };

    loadAnalyses();
  }, []);

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setImagePreview(result);
      setImageDataUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const saveAnalysis = async (
    pathways: AnalysisPathway[],
    productName: string,
    regionName: string,
    report: Record<string, unknown>
  ) => {
    const supabase = createSupabaseBrowserClient();
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData?.session?.user) {
      window.location.href = "/auth";
      return null;
    }

    const productLabel = productName.trim();
    const regionLabel = regionName.trim();

    if (!productLabel || !regionLabel) {
      setStatus("Add product type and region before saving.");
      return null;
    }

    const { data: productRow } = await supabase
      .from("products")
      .select("id")
      .eq("name", productLabel)
      .maybeSingle();
    const { data: regionRow } = await supabase
      .from("regions")
      .select("id")
      .eq("name", regionLabel)
      .maybeSingle();

    const productId =
      productRow?.id ??
      (
        await supabase
          .from("products")
          .insert({ name: productLabel })
          .select("id")
          .single()
      ).data?.id;
    const regionId =
      regionRow?.id ??
      (
        await supabase
          .from("regions")
          .insert({
            name: regionLabel,
            code: regionLabel.slice(0, 3).toUpperCase(),
          })
          .select("id")
          .single()
      ).data?.id;

    if (!productId || !regionId) {
      setStatus("Unable to save analysis metadata.");
      return null;
    }

    const { data: analysis, error } = await supabase
      .from("analyses")
      .insert({
        user_id: sessionData.session.user.id,
        product_id: productId,
        region_id: regionId,
        notes,
        report,
      })
      .select("id")
      .single();

    if (error) throw error;

    if (analysis?.id && pathways.length) {
      const pathwayEntries = await Promise.all(
        pathways.map(async (pathway) => {
          const { data: existing } = await supabase
            .from("pathways")
            .select("id")
            .eq("name", pathway.name)
            .maybeSingle();
          const pathwayId =
            existing?.id ??
            (
              await supabase
                .from("pathways")
                .insert({ name: pathway.name })
                .select("id")
                .single()
            ).data?.id;
          return {
            analysis_id: analysis.id,
            pathway_id: pathwayId,
            probability: pathway.probability,
            loss_hotspot: pathway.loss,
          };
        })
      );

      await supabase.from("analysis_pathways").insert(pathwayEntries);
    }

    return analysis?.id ?? null;
  };

  const handleAnalyze = async () => {
    setStatus("");
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          productType: productType || undefined,
          region: region || undefined,
          description: description || undefined,
          notes,
          imageDataUrl: imageDataUrl || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        const detail = data?.detail ? JSON.stringify(data.detail) : "";
        throw new Error(data.error || detail || "Analysis failed");
      }

      const pathways = (data.pathways ?? []) as AnalysisPathway[];
      const resolvedProduct =
        mode === "ai" ? data.product || productType : productType;
      const resolvedRegion = mode === "ai" ? data.region || region : region;

      const report = {
        summary: data.summary ?? "",
        product: resolvedProduct,
        region: resolvedRegion,
        pathways,
        waste_future_predictor: data.waste_future_predictor ?? null,
        behavior_based_suggestion: data.behavior_based_suggestion ?? null,
        circularity_score: data.circularity_score ?? null,
        waste_flow_map: data.waste_flow_map ?? null,
        impact_simulator: data.impact_simulator ?? null,
        hidden_material_flow: data.hidden_material_flow ?? null,
        uncertainty_output: data.uncertainty_output ?? null,
        waste_leakage_detector: data.waste_leakage_detector ?? null,
        what_if_scenario_engine: data.what_if_scenario_engine ?? null,
        product_aware_prediction: data.product_aware_prediction ?? null,
        explainable_ai_output: data.explainable_ai_output ?? null,
        community_waste_score: data.community_waste_score ?? null,
        reverse_supply_chain_suggestion:
          data.reverse_supply_chain_suggestion ?? null,
        eco_score: data.eco_score ?? null,
      };

      setStatus("Analysis ready. Saving report…");

      const analysisId = await saveAnalysis(
        pathways,
        resolvedProduct,
        resolvedRegion,
        report
      );

      if (analysisId) {
        setShowModeDialog(false);
        router.push(`/analyses/${analysisId}`);
        return;
      }

      setStatus("Analysis ready, but saving failed.");
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to run analysis. Check AI credentials.";
      setStatus(message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_12%_8%,rgba(16,185,129,0.12),transparent_38%),radial-gradient(circle_at_90%_12%,rgba(245,158,11,0.12),transparent_38%),var(--background)] text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
              EcoPath
            </p>
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              Lifecycle Pathway Reconstructor
            </h1>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-10">
        <section className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-emerald-50/60 via-white to-amber-50/60 p-6 shadow-[0_18px_40px_-28px_rgba(10,45,33,0.35)] sm:p-8">
          <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <FeatureIconStack />
              <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Turn product waste into clear circular pathways
              </h2>
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                Upload an image or enter product details to predict regional post-use outcomes,
                identify loss hotspots, and act on practical disposal options.
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  size="lg"
                  className="gap-2 rounded-xl"
                  onClick={() => {
                    setModalStep("mode");
                    setShowModeDialog(true);
                  }}
                >
                  Start analysis
                  <ChevronRight className="size-4" />
                </Button>
                <Link
                  href="/analyses"
                  className={buttonVariants({ variant: "secondary", size: "lg" }) + " rounded-xl"}
                >
                  View saved analyses
                </Link>
              </div>
              <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-3">
                {[
                  ["12+", "Pathway types"],
                  ["Global", "Region-aware logic"],
                  ["AI + Manual", "Flexible input modes"],
                ].map(([value, label]) => (
                  <div key={label} className="rounded-xl border border-border/60 bg-card/80 p-3">
                    <p className="text-lg font-semibold text-foreground">{value}</p>
                    <p className="text-xs text-muted-foreground">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-slate-950/80 p-2 shadow-[0_18px_40px_-28px_rgba(10,45,33,0.35)]">
              <Image
                src="/illustration.png"
                alt="Circular pathway dashboard illustration"
                width={1200}
                height={800}
                className="h-auto w-full rounded-2xl"
                priority
              />
            </div>
          </div>
        </section>

        <Dialog open={showModeDialog} onOpenChange={setShowModeDialog}>
          <DialogContent className="sm:max-w-[680px]">
            <DialogHeader>
              <DialogTitle>
                {modalStep === "mode" ? "Choose analysis mode" : "Provide inputs"}
              </DialogTitle>
              <DialogDescription>
                {modalStep === "mode"
                  ? "We’ll guide you step-by-step."
                  : mode === "ai"
                  ? "Upload a product image and pick a region."
                  : "Enter the product details and region."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-5">
              {modalStep === "mode" ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <Button
                    type="button"
                    className="h-14 w-full gap-2 rounded-lg"
                    onClick={() => {
                      setMode("ai");
                      setModalStep("inputs");
                    }}
                  >
                    <Sparkles className="size-4" />
                    Quick AI mode
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-14 w-full gap-2 rounded-lg"
                    onClick={() => {
                      setMode("manual");
                      setModalStep("inputs");
                    }}
                  >
                    <Wrench className="size-4" />
                    Manual mode
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <Button type="button" variant="ghost" onClick={() => setModalStep("mode")}>Back</Button>
                    <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground/70">Step 2 of 2</span>
                  </div>

                  {mode === "manual" ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label className="text-muted-foreground" htmlFor="product-type">Product type</Label>
                          <Input
                            id="product-type"
                            placeholder="Smartphone, PET bottle, EV battery"
                            value={productType}
                            onChange={(event) => setProductType(event.target.value)}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-muted-foreground">Region</Label>
                          <Select value={region} onValueChange={(value) => setRegion(value ?? "") }>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a region" />
                            </SelectTrigger>
                            <SelectContent>
                              {regions.map((regionName) => (
                                <SelectItem key={regionName} value={regionName}>
                                  {regionName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label className="text-muted-foreground" htmlFor="description">Product description</Label>
                        <textarea
                          id="description"
                          className="min-h-[120px] rounded-xl border border-border/70 bg-card/80 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20"
                          placeholder="Materials, typical use, disposal behavior, etc."
                          value={description}
                          onChange={(event) => setDescription(event.target.value)}
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="grid gap-2">
                          <Label className="text-muted-foreground">Region</Label>
                          <Select value={region} onValueChange={(value) => setRegion(value ?? "") }>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a region" />
                            </SelectTrigger>
                            <SelectContent>
                              {regions.map((regionName) => (
                                <SelectItem key={regionName} value={regionName}>
                                  {regionName}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid gap-3">
                        <div className="rounded-2xl border border-dashed border-border/70 bg-muted/50 p-6 transition hover:border-primary/40">
                          <Label className="flex cursor-pointer flex-col items-center gap-3 text-sm text-muted-foreground">
                            <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                              <UploadCloud className="size-5" />
                            </div>
                            <div className="text-center">
                              <p className="font-medium text-foreground">Drop a product photo or click to upload</p>
                              <p className="text-xs text-muted-foreground">PNG/JPG up to 10MB</p>
                            </div>
                            <Input id="product-image" type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                          </Label>
                        </div>
                        {imagePreview ? (
                          <div className="flex items-center gap-4 rounded-xl border border-border/70 bg-card/80 p-3">
                            <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-border/70">
                              <Image src={imagePreview} alt="Product preview" fill unoptimized className="object-cover" />
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-medium text-foreground">Image uploaded</p>
                              <p className="text-xs text-muted-foreground">Ready for AI analysis</p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setImagePreview(null);
                                setImageDataUrl(null);
                              }}
                            >
                              <X className="size-4" />
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    </>
                  )}

                  <div className="grid gap-2">
                    <Label className="text-muted-foreground" htmlFor="notes">Notes (optional)</Label>
                    <textarea
                      id="notes"
                      className="min-h-[120px] rounded-xl border border-border/70 bg-card/80 px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/20"
                      placeholder="Extra context, intended market, disposal behavior"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </div>

                  <div className="grid gap-3">
                    <Button
                      className="w-full"
                      size="lg"
                      onClick={handleAnalyze}
                      disabled={
                        isAnalyzing ||
                        (mode === "manual"
                          ? !productType || !region || !description
                          : !imageDataUrl || !region)
                      }
                    >
                      {isAnalyzing ? "Analyzing…" : "Analyze pathways"}
                    </Button>
                  </div>

                  {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}
                </>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Separator />

        <section className="grid gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Smart disposal platform features</h2>
            <Badge variant="secondary" className="hidden sm:inline-flex">Built for circular ops</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featureCards.map((feature) => {
              const Icon = feature.icon;
              const content = (
                <Card className="group h-full border-border/60 transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
                  <CardHeader className="flex flex-row items-start gap-3">
                    <div className={`rounded-xl border border-border bg-gradient-to-br p-2 text-primary ${feature.gradient}`}>
                      <Icon className="size-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{feature.title}</CardTitle>
                      <CardDescription>{feature.description}</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">{feature.body}</CardContent>
                </Card>
              );

              return feature.href ? (
                <Link key={feature.title} href={feature.href} className="block">{content}</Link>
              ) : feature.title === "Eco Score" ? (
                <button
                  key={feature.title}
                  type="button"
                  className="block w-full text-left"
                  onClick={() => {
                    setShowModeDialog(true);
                    setModalStep("mode");
                  }}
                >
                  {content}
                </button>
              ) : (
                <div key={feature.title}>{content}</div>
              );
            })}
          </div>
        </section>

        <Separator />

        <section className="grid gap-4 pb-8">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Saved analyses</h2>
            <Link href="/analyses" className={buttonVariants({ variant: "secondary" })}>View all</Link>
          </div>
          {savedAnalyses.length ? (
            <div className="grid gap-4 md:grid-cols-3">
              {savedAnalyses.map((analysis) => (
                <Card key={analysis.id} className="border-border/60">
                  <CardHeader>
                    <CardTitle className="text-base">{analysis.title}</CardTitle>
                    <CardDescription>Updated {analysis.updated}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <Badge variant="outline">{analysis.tag}</Badge>
                    <Link href={`/analyses/${analysis.id}`} className={buttonVariants({ variant: "ghost", size: "sm" })}>
                      Open
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-sm text-muted-foreground">
                Sign in to save analyses and view recent work.
              </CardContent>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}
