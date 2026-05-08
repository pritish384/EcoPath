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
import { Sparkles, UploadCloud, Wrench, X } from "lucide-react";
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

type AnalysisPathway = {
  name: string;
  probability: number;
  loss: string;
};

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
      } catch (error) {
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
    regionName: string
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
          .insert({ name: regionLabel, code: regionLabel.slice(0, 3).toUpperCase() })
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

      setStatus("Analysis ready. Saving report…");

      const analysisId = await saveAnalysis(
        pathways,
        resolvedProduct,
        resolvedRegion
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

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">
              EcoPath
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Lifecycle Pathway Reconstructor
            </h1>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
          <Card className="shadow-sm">
            <CardHeader className="space-y-2">
              <Badge className="w-fit bg-primary/10 text-primary" variant="secondary">
                Analysis Builder
              </Badge>
              <CardTitle className="text-2xl">Map post-use outcomes</CardTitle>
              <CardDescription>
                Start an analysis to model recycling, resale, and loss pathways by region.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid gap-3">
                <Button
                  className="w-full"
                  size="lg"
                  onClick={() => {
                    setModalStep("mode");
                    setShowModeDialog(true);
                  }}
                >
                  Start analysis
                </Button>
                <p className="text-xs text-zinc-500">
                  Choose quick AI mode (image-first) or manual mode for full control.
                </p>
              </div>

              <Dialog open={showModeDialog} onOpenChange={setShowModeDialog}>
                <DialogContent className="sm:max-w-[640px]">
                  <DialogHeader>
                    <DialogTitle>
                      {modalStep === "mode"
                        ? "Choose analysis mode"
                        : "Provide inputs"}
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
                          className="h-14 w-full gap-2 rounded-md"
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
                          className="h-14 w-full gap-2 rounded-md"
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
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setModalStep("mode")}
                          >
                            Back
                          </Button>
                          <span className="text-xs uppercase tracking-[0.2em] text-zinc-400">
                            Step 2 of 2
                          </span>
                        </div>

                        {mode === "manual" ? (
                      <>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="grid gap-2">
                            <Label className="text-sm text-zinc-700" htmlFor="product-type">
                              Product type
                            </Label>
                            <Input
                              id="product-type"
                              placeholder="Smartphone, PET bottle, EV battery"
                              value={productType}
                              onChange={(event) => setProductType(event.target.value)}
                            />
                          </div>
                          <div className="grid gap-2">
                            <Label className="text-sm text-zinc-700">Region</Label>
                            <Select
                              value={region}
                              onValueChange={(value) => setRegion(value ?? "")}
                            >
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
                          <Label className="text-sm text-zinc-700" htmlFor="description">
                            Product description
                          </Label>
                          <textarea
                            id="description"
                            className="min-h-[120px] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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
                            <Label className="text-sm text-zinc-700">Region</Label>
                            <Select
                              value={region}
                              onValueChange={(value) => setRegion(value ?? "")}
                            >
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
                          <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/60 p-6 transition hover:border-primary/40">
                            <Label className="flex cursor-pointer flex-col items-center gap-3 text-sm text-zinc-600">
                              <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <UploadCloud className="size-5" />
                              </div>
                              <div className="text-center">
                                <p className="font-medium text-zinc-900">
                                  Drop a product photo or click to upload
                                </p>
                                <p className="text-xs text-zinc-500">
                                  PNG/JPG up to 10MB
                                </p>
                              </div>
                              <Input
                                id="product-image"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleImageChange}
                              />
                            </Label>
                          </div>
                          {imagePreview ? (
                            <div className="flex items-center gap-4 rounded-xl border border-zinc-200 bg-white p-3">
                              <div className="relative h-16 w-16 overflow-hidden rounded-lg border border-zinc-200">
                                <Image
                                  src={imagePreview}
                                  alt="Product preview"
                                  fill
                                  unoptimized
                                  className="object-cover"
                                />
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-medium text-zinc-900">
                                  Image uploaded
                                </p>
                                <p className="text-xs text-zinc-500">
                                  Ready for AI analysis
                                </p>
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
                      <Label className="text-sm text-zinc-700" htmlFor="notes">
                        Notes (optional)
                      </Label>
                      <textarea
                        id="notes"
                        className="min-h-[120px] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
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

                    {status ? (
                      <p className="text-sm text-zinc-500">{status}</p>
                    ) : null}
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card className="bg-emerald-950 text-emerald-50">
            <CardHeader>
              <CardTitle className="text-emerald-50">
                What this will show
              </CardTitle>
              <CardDescription className="text-emerald-100/80">
                A regional view of where materials end up post-use, plus key
                loss points.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm">
              <div className="flex items-start gap-3">
                <Badge className="bg-emerald-500/20 text-emerald-100">
                  01
                </Badge>
                <p>All possible pathways (formal, informal, reuse, landfill)</p>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="bg-emerald-500/20 text-emerald-100">
                  02
                </Badge>
                <p>Probability estimates per region</p>
              </div>
              <div className="flex items-start gap-3">
                <Badge className="bg-emerald-500/20 text-emerald-100">
                  03
                </Badge>
                <p>Where and why materials get lost</p>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        <section className="grid gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Saved analyses</h2>
            <Link
              href="/analyses"
              className={buttonVariants({ variant: "secondary" })}
            >
              View all
            </Link>
          </div>
          {savedAnalyses.length ? (
            <div className="grid gap-4 md:grid-cols-3">
              {savedAnalyses.map((analysis) => (
                <Card key={analysis.id}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {analysis.title}
                    </CardTitle>
                    <CardDescription>Updated {analysis.updated}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <Badge variant="outline">{analysis.tag}</Badge>
                    <Link
                      href={`/analyses/${analysis.id}`}
                      className={buttonVariants({ variant: "ghost", size: "sm" })}
                    >
                      Open
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-sm text-zinc-600">
                Sign in to save analyses and view recent work.
              </CardContent>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}
