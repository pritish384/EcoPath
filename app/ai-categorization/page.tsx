"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, ImageIcon, Loader2, Sparkles, Type } from "lucide-react";
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

type Mode = "text" | "image";
type Category = "Recyclable" | "Hazardous" | "Compostable" | "Mixed";

type CategorizationResult = {
  category: Category;
  confidence: number;
  reason: string;
  nextAction: string;
  materialHints: string[];
};

const badgeStyles: Record<Category, string> = {
  Recyclable: "bg-emerald-100 text-emerald-900 border-emerald-200",
  Hazardous: "bg-rose-100 text-rose-900 border-rose-200",
  Compostable: "bg-lime-100 text-lime-900 border-lime-200",
  Mixed: "bg-stone-200 text-stone-800 border-stone-300",
};

export default function AiCategorizationPage() {
  const [mode, setMode] = useState<Mode>("text");
  const [region, setRegion] = useState("India");
  const [text, setText] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CategorizationResult | null>(null);

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImageDataUrl(dataUrl);
      setImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const onAnalyze = async () => {
    setError(null);
    setResult(null);

    if (mode === "text" && !text.trim()) {
      setError("Please enter item text to classify.");
      return;
    }

    if (mode === "image" && !imageDataUrl) {
      setError("Please upload an image to classify.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("/api/ai-categorization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          text: mode === "text" ? text : undefined,
          imageDataUrl: mode === "image" ? imageDataUrl : undefined,
          region,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error ?? "Classification failed");
      }

      setResult(data as CategorizationResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">EcoPath</p>
            <h1 className="text-2xl font-semibold tracking-tight">AI-Powered Categorization</h1>
            <p className="text-sm text-muted-foreground">Automatic waste classification from image or text.</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className={buttonVariants({ variant: "outline" })}>Back</Link>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-5xl gap-6 px-6 py-10 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Classify an item</CardTitle>
            <CardDescription>Pick input mode and run AI categorization.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label>Input mode</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={mode === "text" ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => setMode("text")}
                >
                  <Type className="size-4" /> Text
                </Button>
                <Button
                  type="button"
                  variant={mode === "image" ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => setMode("image")}
                >
                  <ImageIcon className="size-4" /> Image
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Region</Label>
              <Select
                value={region}
                onValueChange={(value) => setRegion(value ?? "India")}
              >
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

            {mode === "text" ? (
              <div className="grid gap-2">
                <Label htmlFor="item-text">Item description</Label>
                <Input
                  key="text-input"
                  id="item-text"
                  placeholder="e.g., used battery, banana peel, PET bottle"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                />
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="item-image">Upload image</Label>
                <Input
                  key="image-input"
                  id="item-image"
                  type="file"
                  accept="image/*"
                  onChange={onFileChange}
                />
                {imagePreview ? (
                  <Image
                    src={imagePreview}
                    alt="Uploaded preview"
                    width={320}
                    height={208}
                    unoptimized
                    className="mt-2 max-h-52 w-auto rounded-lg border border-border object-contain"
                  />
                ) : null}
              </div>
            )}

            <Button onClick={onAnalyze} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Classifying...
                </>
              ) : (
                "Classify"
              )}
            </Button>

            {error ? (
              <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="size-4" />
                {error}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-5 text-primary" /> Classification result
            </CardTitle>
            <CardDescription>Category, confidence, and what to do next.</CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="grid gap-4">
                <div className="flex items-center justify-between rounded-lg border border-border p-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Predicted category</p>
                    <Badge variant="outline" className={badgeStyles[result.category]}>
                      {result.category}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Confidence</p>
                    <p className="text-xl font-semibold">{result.confidence}%</p>
                  </div>
                </div>

                <div className="rounded-lg border border-border p-4 text-sm">
                  <p className="font-medium">Reason</p>
                  <p className="mt-1 text-muted-foreground">{result.reason}</p>
                </div>

                <div className="rounded-lg border border-border p-4 text-sm">
                  <p className="font-medium">Next action</p>
                  <p className="mt-1 text-muted-foreground">{result.nextAction}</p>
                </div>

                <div className="rounded-lg border border-border p-4 text-sm">
                  <p className="font-medium">Material hints</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {result.materialHints.length ? (
                      result.materialHints.map((hint) => (
                        <Badge key={hint} variant="secondary">{hint}</Badge>
                      ))
                    ) : (
                      <p className="text-muted-foreground">No specific material hints.</p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border px-4 py-8 text-sm text-muted-foreground">
                Run classification to view results.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
