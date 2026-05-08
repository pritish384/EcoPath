"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
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

type Product = { id: string; name: string };
type Region = { id: string; name: string };
type Pathway = { id: string; name: string };
type PathwayProbability = {
  id: string;
  product_id: string;
  region_id: string;
  pathway_id: string;
  probability: number;
  confidence: number | null;
};
type LossHotspot = {
  pathway_probability_id: string;
  label: string;
};

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [pathways, setPathways] = useState<Pathway[]>([]);
  const [probabilities, setProbabilities] = useState<PathwayProbability[]>([]);
  const [lossHotspots, setLossHotspots] = useState<LossHotspot[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [savedAnalyses, setSavedAnalyses] = useState<
    { id: string; title: string; updated: string; tag: string }[]
  >([]);

  useEffect(() => {
    const load = async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const [productsRes, regionsRes, pathwaysRes, probsRes, lossRes] =
          await Promise.all([
            supabase.from("products").select("id,name").order("name"),
            supabase.from("regions").select("id,name").order("name"),
            supabase.from("pathways").select("id,name").order("name"),
            supabase
              .from("pathway_probabilities")
              .select("id,product_id,region_id,pathway_id,probability,confidence"),
            supabase
              .from("loss_hotspots")
              .select("pathway_probability_id,label"),
          ]);

        if (productsRes.error) throw productsRes.error;
        if (regionsRes.error) throw regionsRes.error;
        if (pathwaysRes.error) throw pathwaysRes.error;
        if (probsRes.error) throw probsRes.error;
        if (lossRes.error) throw lossRes.error;

        setProducts(productsRes.data ?? []);
        setRegions(regionsRes.data ?? []);
        setPathways(pathwaysRes.data ?? []);
        setProbabilities(probsRes.data ?? []);
        setLossHotspots(lossRes.data ?? []);

        if (productsRes.data?.length) {
          setSelectedProduct((prev) => prev || productsRes.data[0].id);
        }
        if (regionsRes.data?.length) {
          setSelectedRegion((prev) => prev || regionsRes.data[0].id);
        }
      } catch (error) {
        setStatus(
          "Add Supabase env vars and seed data to see results in the UI."
        );
      }
    };

    load();
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

        const productMap = new Map(products.map((p) => [p.id, p.name]));
        const regionMap = new Map(regions.map((r) => [r.id, r.name]));

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

    if (products.length && regions.length) {
      loadAnalyses();
    }
  }, [products, regions]);

  const lossMap = useMemo(() => {
    return new Map(
      lossHotspots.map((loss) => [loss.pathway_probability_id, loss.label])
    );
  }, [lossHotspots]);

  const currentPathways = useMemo(() => {
    if (!selectedProduct || !selectedRegion) return [];
    const pathwayMap = new Map(pathways.map((pathway) => [pathway.id, pathway]));

    return probabilities
      .filter(
        (row) =>
          row.product_id === selectedProduct &&
          row.region_id === selectedRegion
      )
      .map((row) => {
        const pathway = pathwayMap.get(row.pathway_id);
        return {
          id: row.id,
          pathwayId: row.pathway_id,
          name: pathway?.name ?? "Pathway",
          probability: Number(row.probability),
          confidence: row.confidence,
          loss: lossMap.get(row.id) ?? "Not captured",
        };
      })
      .sort((a, b) => b.probability - a.probability);
  }, [lossMap, pathways, probabilities, selectedProduct, selectedRegion]);

  const barData = useMemo(() => {
    return currentPathways.map((pathway) => ({
      name: pathway.name.replace(/\s+.*/, ""),
      value: pathway.probability,
    }));
  }, [currentPathways]);

  const sankeyData = useMemo(() => {
    if (!currentPathways.length) return undefined;
    const productName =
      products.find((product) => product.id === selectedProduct)?.name ??
      "Product";
    const nodes = [
      { name: productName },
      ...currentPathways.map((pathway) => ({ name: pathway.name })),
    ];
    const links = currentPathways.map((pathway, index) => ({
      source: 0,
      target: index + 1,
      value: pathway.probability,
    }));
    return { nodes, links };
  }, [currentPathways, products, selectedProduct]);

  const selectedProductName =
    products.find((product) => product.id === selectedProduct)?.name ??
    "Product";
  const selectedRegionName =
    regions.find((region) => region.id === selectedRegion)?.name ?? "Region";

  const handleSaveAnalysis = async () => {
    setStatus("");
    try {
      const supabase = createSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        window.location.href = "/auth";
        return;
      }

      const { data: analysis, error } = await supabase
        .from("analyses")
        .insert({
          user_id: userData.user.id,
          product_id: selectedProduct,
          region_id: selectedRegion,
          notes,
        })
        .select("id")
        .single();

      if (error) throw error;

      if (analysis?.id && currentPathways.length) {
        const entries = currentPathways.map((pathway) => ({
          analysis_id: analysis.id,
          pathway_id: pathway.pathwayId,
          probability: pathway.probability,
          loss_hotspot: pathway.loss,
        }));

        await supabase.from("analysis_pathways").insert(entries);
      }

      setStatus("Analysis saved.");
    } catch (error) {
      setStatus("Unable to save analysis.");
    }
  };

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
          <Link
            href="/auth"
            className={buttonVariants({ variant: "outline" })}
          >
            Sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-10">
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Map post-use outcomes</CardTitle>
              <CardDescription>
                Enter a product type and region to estimate where materials go
                next.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <p className="text-sm font-medium text-zinc-700">
                    Product type
                  </p>
                  <Select
                    value={selectedProduct}
                    onValueChange={setSelectedProduct}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a product" />
                    </SelectTrigger>
                    <SelectContent>
                      {products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <p className="text-sm font-medium text-zinc-700">Region</p>
                  <Select
                    value={selectedRegion}
                    onValueChange={setSelectedRegion}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a region" />
                    </SelectTrigger>
                    <SelectContent>
                      {regions.map((region) => (
                        <SelectItem key={region.id} value={region.id}>
                          {region.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-2">
                <p className="text-sm font-medium text-zinc-700">
                  Notes (optional)
                </p>
                <textarea
                  className="min-h-[96px] rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500"
                  placeholder="E.g., mid-tier Android handset, 2021 release"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>
              <Button className="w-full" onClick={handleSaveAnalysis}>
                Save analysis
              </Button>
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
              {selectedProductName} · {selectedRegionName}
            </Badge>
          </div>
          {currentPathways.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {currentPathways.map((pathway) => (
                <Card key={pathway.id}>
                  <CardHeader>
                    <CardTitle className="text-base">
                      {pathway.name}
                    </CardTitle>
                    <CardDescription>
                      Estimated probability: {pathway.probability}%
                      {pathway.confidence
                        ? ` · Confidence ${pathway.confidence}%`
                        : ""}
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
                No pathway data found. Seed the Supabase tables to see results.
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
