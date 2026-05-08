"use client";

import { ChangeEvent, useState } from "react";
import Link from "next/link";
import { Camera, Lightbulb, Loader2, Recycle, Sparkles } from "lucide-react";
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

type ReuseResult = {
  detected_item: string;
  condition_assumption: string;
  reuse_ideas: string[];
  diy_upcycling: string[];
  donation_options: string[];
  resale_platforms: string[];
  safety_notes: string[];
};

const SectionList = ({ title, items }: { title: string; items: string[] }) => (
  <div className="rounded-lg border border-border bg-background p-4">
    <h3 className="mb-2 text-sm font-semibold text-foreground">{title}</h3>
    {items.length ? (
      <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
        {items.map((item, index) => (
          <li key={`${item}-${index}`}>{item}</li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-muted-foreground">No suggestions available yet.</p>
    )}
  </div>
);

export default function ReuseSuggestionsPage() {
  const [itemName, setItemName] = useState("");
  const [notes, setNotes] = useState("");
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ReuseResult | null>(null);

  const onImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || "");
      setImageDataUrl(value);
      setImagePreview(value);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!imageDataUrl) {
      setError("Please upload an image first.");
      return;
    }

    setError("");
    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/reuse-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemName: itemName || undefined,
          notes: notes || undefined,
          imageDataUrl,
        }),
      });

      const data = (await response.json()) as ReuseResult & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate suggestions");
      }

      setResult({
        detected_item: data.detected_item,
        condition_assumption: data.condition_assumption,
        reuse_ideas: data.reuse_ideas ?? [],
        diy_upcycling: data.diy_upcycling ?? [],
        donation_options: data.donation_options ?? [],
        resale_platforms: data.resale_platforms ?? [],
        safety_notes: data.safety_notes ?? [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              EcoPath
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">Reuse Suggestions</h1>
            <p className="text-sm text-muted-foreground">
              Upload a photo and get AI-powered reuse ideas instantly.
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
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                <Sparkles className="mr-1 size-3" />
                AI suggestions
              </Badge>
            </div>
            <CardTitle>Can this be reused?</CardTitle>
            <CardDescription>
              Add an image, optional item name, and context. We’ll return practical ideas for reuse,
              upcycling, donation, and resale.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-[1fr_1fr]">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="reuse-image">Upload photo</Label>
                <Input id="reuse-image" type="file" accept="image/*" onChange={onImageChange} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reuse-item">Item name (optional)</Label>
                <Input
                  id="reuse-item"
                  placeholder="E.g., old chair, plastic bottle, broken lamp"
                  value={itemName}
                  onChange={(event) => setItemName(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="reuse-notes">Notes (optional)</Label>
                <Input
                  id="reuse-notes"
                  placeholder="Condition, material, what you want to do"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                />
              </div>
              <Button onClick={handleGenerate} disabled={isLoading || !imageDataUrl} className="gap-2">
                {isLoading ? <Loader2 className="size-4 animate-spin" /> : <Lightbulb className="size-4" />}
                {isLoading ? "Generating..." : "Generate reuse suggestions"}
              </Button>
              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </div>

            <div className="rounded-xl border border-dashed border-border p-4">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="Uploaded item" className="h-72 w-full rounded-lg object-cover" />
              ) : (
                <div className="flex h-72 flex-col items-center justify-center gap-2 rounded-lg bg-muted/30 text-muted-foreground">
                  <Camera className="size-8" />
                  <p className="text-sm">Image preview will appear here.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {result ? (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="gap-1">
                  <Recycle className="size-3" /> {result.detected_item}
                </Badge>
              </div>
              <CardTitle>Suggested reuse pathways</CardTitle>
              <CardDescription>{result.condition_assumption}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <SectionList title="Reuse ideas" items={result.reuse_ideas} />
              <SectionList title="DIY upcycling" items={result.diy_upcycling} />
              <SectionList title="Donation options" items={result.donation_options} />
              <SectionList title="Resale platforms" items={result.resale_platforms} />
              <div className="md:col-span-2">
                <SectionList title="Safety notes" items={result.safety_notes} />
              </div>
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
