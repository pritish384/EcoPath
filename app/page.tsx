"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
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

type AnalysisPathway = {
  name: string;
  probability: number;
  loss: string;
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<"manual" | "ai">("ai");
  const [productType, setProductType] = useState("");
  const [region, setRegion] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [inferredProduct, setInferredProduct] = useState<string>("");
  const [inferredRegion, setInferredRegion] = useState<string>("");
  const [currentPathways, setCurrentPathways] = useState<AnalysisPathway[]>([]);
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
    setMounted(true);
  }, []);

  useEffect(() => {
    const loadAnalyses = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) return;

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

  const barData = useMemo(() => {
    return currentPathways.map((pathway) => ({
      name: pathway.name.replace(/\s+.*/, ""),
      value: pathway.probability,
    }));
  }, [currentPathways]);

  const sankeyData = useMemo(() => {
    if (!currentPathways.length) return undefined;
    const nodes = [
      { name: productType || "Product" },
      ...currentPathways.map((pathway) => ({ name: pathway.name })),
    ];
    const links = currentPathways.map((pathway, index) => ({
      source: 0,
      target: index + 1,
      value: pathway.probability,
    }));
    return { nodes, links };
  }, [currentPathways, productType]);

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

      setSummary(data.summary ?? "");
      setInferredProduct(data.product ?? "");
      setInferredRegion(data.region ?? "");
      setCurrentPathways(data.pathways ?? []);
      setStatus("Analysis ready.");
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

  const handleSaveAnalysis = async () => {
    setStatus("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        window.location.href = "/auth";
        return;
      }

      const productName = productType.trim();
      const regionName = region.trim();

      if (!productName || !regionName) {
        setStatus("Add product type and region before saving.");
        return;
      }

      const { data: productRow } = await supabase
        .from("products")
        .select("id")
        .eq("name", productName)
        .maybeSingle();
      const { data: regionRow } = await supabase
        .from("regions")
        .select("id")
        .eq("name", regionName)
        .maybeSingle();

      const productId =
        productRow?.id ??
        (
          await supabase
            .from("products")
            .insert({ name: productName })
            .select("id")
            .single()
        ).data?.id;
      const regionId =
        regionRow?.id ??
        (
          await supabase
            .from("regions")
            .insert({ name: regionName, code: regionName.slice(0, 3).toUpperCase() })
            .select("id")
            .single()
        ).data?.id;

      if (!productId || !regionId) {
        setStatus("Unable to save analysis metadata.");
        return;
      }

      const { data: analysis, error } = await supabase
        .from("analyses")
        .insert({
          user_id: userData.user.id,
          product_id: productId,
          region_id: regionId,
          notes,
        })
        .select("id")
        .single();

      if (error) throw error;

      if (analysis?.id && currentPathways.length) {
        const pathwayEntries = await Promise.all(
          currentPathways.map(async (pathway) => {
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

      setStatus("Analysis saved.");
    } catch (error) {
      setStatus("Unable to save analysis.");
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
              Ecopath
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Lifecycle Pathway Reconstructor
            </h1>
          </div>
          <UserMenu />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Map post-use outcomes</CardTitle>
              <CardDescription>
                Upload a product image and specify the region for AI analysis.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
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
                  <Select value={region} onValueChange={setRegion}>
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
                <Label className="text-sm text-zinc-700" htmlFor="product-image">
                  Product image (optional)
                </Label>
                <Input
                  id="product-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Product preview"
                    className="h-32 w-32 rounded-md border border-zinc-200 object-cover"
                  />
                ) : null}
              </div>
              <div className="grid gap-2">
                <Label className="text-sm text-zinc-700" htmlFor="notes">
                  Notes (optional)
                </Label>
                <textarea
                  id="notes"
                  className="min-h-[96px] rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                  placeholder="E.g., mid-tier Android handset, 2021 release"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <Button
                  className="w-full"
                  onClick={handleAnalyze}
                  disabled={!productType || !region || isAnalyzing}
                >
                  {isAnalyzing ? "Analyzing…" : "Analyze pathways"}
                </Button>
                <Button
                  className="w-full"
                  onClick={handleSaveAnalysis}
                  variant="secondary"
                  disabled={!currentPathways.length}
                >
                  Save analysis
                </Button>
              </div>
              {status ? <p className="text-sm text-zinc-500">{status}</p> : null}
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
            <h2 className="text-xl font-semibold">Results</h2>
            <Badge variant="secondary">
              {productType || "Product"} · {region || "Region"}
            </Badge>
          </div>
          {summary ? (
            <Card>
              <CardContent className="py-4 text-sm text-zinc-600">
                {summary}
              </CardContent>
            </Card>
          ) : null}
          {currentPathways.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {currentPathways.map((pathway) => (
                <Card key={pathway.name}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {pathway.name}
                    </CardTitle>
                    <CardDescription>
                      Estimated probability: {pathway.probability}%
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <span className="text-sm text-zinc-600">Loss hotspot</span>
                    <Badge variant="outline">{pathway.loss}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-sm text-zinc-600">
                Run an AI analysis to see pathway results.
              </CardContent>
            </Card>
          )}
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Pathway flow</CardTitle>
              <CardDescription>
                Visualize how materials move through the system.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PathwaySankey data={sankeyData} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Probability breakdown</CardTitle>
              <CardDescription>
                Distribution of outcomes for the selected region.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PathwayBars data={barData} />
            </CardContent>
          </Card>
        </section>

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
