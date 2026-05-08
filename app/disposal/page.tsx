"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  AlertTriangle,
  Factory,
  FileDown,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { UserMenu } from "@/components/user-menu";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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

type RecoveryPotential = "Low" | "Medium" | "High" | "Very High";
type DisposalCategory =
  | "Recyclable"
  | "Specialized Recycling"
  | "Hazardous Waste"
  | "Reusable"
  | "Landfill"
  | "E-waste Recovery";

type BreakdownComponent = {
  name: string;
  materials: string[];
  estimatedMassShare: number;
  disposalCategory: DisposalCategory;
  recoveryPotential: RecoveryPotential;
  notes: string;
};

type BreakdownResponse = {
  productName: string;
  region: string;
  components: BreakdownComponent[];
  overallCircularityScore: number;
  riskFlags: string[];
};

const categoryColor: Record<DisposalCategory, string> = {
  Recyclable: "bg-emerald-100 text-emerald-800 border-emerald-200",
  "Specialized Recycling": "bg-sky-100 text-sky-800 border-sky-200",
  "Hazardous Waste": "bg-rose-100 text-rose-800 border-rose-200",
  Reusable: "bg-violet-100 text-violet-800 border-violet-200",
  Landfill: "bg-zinc-200 text-zinc-800 border-zinc-300",
  "E-waste Recovery": "bg-amber-100 text-amber-800 border-amber-200",
};

const piePalette = ["#10b981", "#0ea5e9", "#f43f5e", "#8b5cf6", "#71717a", "#f59e0b"];

const compareSamples = ["Smartphone", "Laptop", "Plastic water bottle", "Headphones"];

export default function DisposalGeneratorPage() {
  const [product, setProduct] = useState("");
  const [region, setRegion] = useState("India");
  const [compareProduct, setCompareProduct] = useState("Laptop");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BreakdownResponse | null>(null);

  const breakdownByCategory = useMemo(() => {
    if (!result) return [] as Array<{ name: string; value: number }>;
    const map = new Map<string, number>();
    result.components.forEach((component) => {
      map.set(
        component.disposalCategory,
        (map.get(component.disposalCategory) ?? 0) + component.estimatedMassShare
      );
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [result]);

  const recoveryBarData = useMemo(() => {
    if (!result) return [] as Array<{ component: string; score: number }>;
    const points: Record<RecoveryPotential, number> = {
      Low: 25,
      Medium: 50,
      High: 75,
      "Very High": 90,
    };
    return result.components.map((component) => ({
      component: component.name,
      score: points[component.recoveryPotential],
    }));
  }, [result]);

  async function generateBreakdown() {
    if (!product.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/multi-material-breakdown", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          product: product.trim(),
          region,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Failed to generate breakdown");
      }

      setResult(data as BreakdownResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  function exportJson() {
    if (!result) return;
    const blob = new Blob([JSON.stringify(result, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.productName.toLowerCase().replace(/\s+/g, "-")}-breakdown.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    if (!result) return;
    const header = [
      "Component",
      "Materials",
      "Mass Share (%)",
      "Disposal Category",
      "Recovery Potential",
      "Notes",
    ];
    const rows = result.components.map((c) => [
      c.name,
      c.materials.join(" + "),
      String(c.estimatedMassShare),
      c.disposalCategory,
      c.recoveryPotential,
      c.notes,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${cell.replaceAll("\"", "\"\"")}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${result.productName.toLowerCase().replace(/\s+/g, "-")}-breakdown.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              EcoPath
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Multi-Material Breakdown
            </h1>
            <p className="text-sm text-muted-foreground">
              Component-level disposal intelligence with recovery potential.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className={buttonVariants({ variant: "outline" })}>
              Back
            </Link>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
        <section className="grid gap-6 lg:grid-cols-[1.05fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Analyze a product</CardTitle>
              <CardDescription>
                Enter any product and get a component-by-component disposal pathway.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="product">Product name</Label>
                <Input
                  id="product"
                  placeholder="e.g., Smartphone"
                  value={product}
                  onChange={(event) => setProduct(event.target.value)}
                />
              </div>

              <div className="grid gap-2">
                <Label>Region</Label>
                <Select value={region} onValueChange={setRegion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="India">India</SelectItem>
                    <SelectItem value="Global">Global</SelectItem>
                    <SelectItem value="EU">EU</SelectItem>
                    <SelectItem value="US">US</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={generateBreakdown} disabled={!product.trim() || loading}>
                {loading ? (
                  <>
                    <RefreshCw className="mr-2 size-4 animate-spin" />
                    Analyzing components...
                  </>
                ) : (
                  "Generate breakdown"
                )}
              </Button>

              {error ? (
                <div className="flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                  <AlertTriangle className="size-4" /> {error}
                </div>
              ) : null}

              <p className="text-xs text-muted-foreground">
                AI-first with deterministic fallback for resilient output.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Factory className="size-5 text-primary" />
                Circularity snapshot
              </CardTitle>
              <CardDescription>
                High-level score for recovery and disposal quality.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {result ? (
                <>
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-sm text-muted-foreground">Product</p>
                    <p className="text-xl font-semibold">{result.productName}</p>
                    <p className="text-xs text-muted-foreground">Region: {result.region}</p>
                  </div>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-sm text-emerald-700">Overall circularity score</p>
                    <p className="text-3xl font-bold text-emerald-800">
                      {result.overallCircularityScore}/100
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.riskFlags.map((flag) => (
                      <Badge key={flag} variant="outline" className="text-xs">
                        {flag}
                      </Badge>
                    ))}
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                  Generate a breakdown to view circularity and risk indicators.
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <Separator />

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Component-level disposal matrix</CardTitle>
              <CardDescription>
                Breakdown by component, materials, disposal category, and recovery potential.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {result ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="px-2 py-2 font-medium">Component</th>
                        <th className="px-2 py-2 font-medium">Materials</th>
                        <th className="px-2 py-2 font-medium">Mass %</th>
                        <th className="px-2 py-2 font-medium">Disposal</th>
                        <th className="px-2 py-2 font-medium">Recovery</th>
                        <th className="px-2 py-2 font-medium">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.components.map((component) => (
                        <tr key={component.name} className="border-b border-border/60 align-top">
                          <td className="px-2 py-2 font-medium">{component.name}</td>
                          <td className="px-2 py-2 text-muted-foreground">
                            {component.materials.join(" + ")}
                          </td>
                          <td className="px-2 py-2">{component.estimatedMassShare}%</td>
                          <td className="px-2 py-2">
                            <Badge
                              variant="outline"
                              className={categoryColor[component.disposalCategory]}
                            >
                              {component.disposalCategory}
                            </Badge>
                          </td>
                          <td className="px-2 py-2">{component.recoveryPotential}</td>
                          <td className="px-2 py-2 text-muted-foreground">{component.notes}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                  Your component matrix will appear here.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Export</CardTitle>
              <CardDescription>
                Download this analysis for reporting or sharing.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Button variant="outline" onClick={exportJson} disabled={!result} className="justify-start gap-2">
                <FileDown className="size-4" /> Export JSON
              </Button>
              <Button variant="outline" onClick={exportCsv} disabled={!result} className="justify-start gap-2">
                <FileDown className="size-4" /> Export CSV
              </Button>
              <p className="text-xs text-muted-foreground">
                PDF export can be added next using the same payload.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Disposal category mix</CardTitle>
              <CardDescription>
                Material share grouped by disposal destination.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              {breakdownByCategory.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={breakdownByCategory}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={100}
                      label={({ name, value }) => `${name}: ${value}%`}
                    >
                      {breakdownByCategory.map((entry, index) => (
                        <Cell key={entry.name} fill={piePalette[index % piePalette.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                  Generate a product to view chart.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Recovery potential by component</CardTitle>
              <CardDescription>
                Relative recovery score for each component.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-72">
              {recoveryBarData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={recoveryBarData} margin={{ left: 0, right: 10, top: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="component" tick={{ fontSize: 11 }} interval={0} angle={-20} height={60} textAnchor="end" />
                    <YAxis domain={[0, 100]} />
                    <Tooltip />
                    <Bar dataKey="score" fill="#14b8a6" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
                  Generate a product to view chart.
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>Compare products (bonus)</CardTitle>
              <CardDescription>
                Quick side-by-side circularity comparison (sample-based for MVP).
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-muted-foreground">Current:</span>
              <Badge variant="secondary">{result?.productName || "—"}</Badge>
              <span className="text-muted-foreground">vs</span>
              <Select value={compareProduct} onValueChange={setCompareProduct}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {compareSamples.map((sample) => (
                    <SelectItem key={sample} value={sample}>
                      {sample}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" className="gap-2" disabled>
                Compare (next iteration)
                <ArrowRight className="size-4" />
              </Button>
            </CardContent>
          </Card>
        </section>

        <section>
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                What’s included in this MVP
              </CardTitle>
              <CardDescription>
                Product input, AI decomposition, color-coded disposal tags, recovery scoring,
                visual charts, region selector, and JSON/CSV export.
              </CardDescription>
            </CardHeader>
          </Card>
        </section>
      </main>
    </div>
  );
}
