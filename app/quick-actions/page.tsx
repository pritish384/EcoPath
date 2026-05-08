"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Zap } from "lucide-react";
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

type ActionType = "recycle" | "reuse" | "donate" | "sell" | "compost" | "hazard";

type ActionOption = {
  id: ActionType;
  label: string;
  hint: string;
};

type QuickActionStep = {
  title: string;
  detail: string;
};

const actionOptions: ActionOption[] = [
  { id: "recycle", label: "Recycle", hint: "Sort and drop at approved recycler" },
  { id: "reuse", label: "Reuse", hint: "Keep in use with minor changes" },
  { id: "donate", label: "Donate", hint: "Pass on to verified NGOs/centers" },
  { id: "sell", label: "Sell", hint: "List on resale or scrap marketplace" },
  { id: "compost", label: "Compost", hint: "Organic conversion route" },
  { id: "hazard", label: "Hazardous disposal", hint: "Use safe e-waste/hazard facility" },
];

const actionSteps: Record<ActionType, QuickActionStep[]> = {
  recycle: [
    { title: "Separate by material", detail: "Split paper, plastic, metal, and glass to avoid contamination." },
    { title: "Clean and dry", detail: "Rinse residues and dry items before binning or drop-off." },
    { title: "Use authorized center", detail: "Deliver to approved recycling points for your region." },
  ],
  reuse: [
    { title: "Check condition", detail: "Confirm it is still safe and functional for another use cycle." },
    { title: "Repurpose", detail: "Assign a new role (storage, repair parts, home utility, etc.)." },
    { title: "Track lifespan", detail: "Use notes/tags so it doesn’t become hidden waste later." },
  ],
  donate: [
    { title: "Validate usability", detail: "Donate only clean, working, and complete items." },
    { title: "Choose a center", detail: "Pick local NGOs, schools, shelters, or donation drives." },
    { title: "Document handoff", detail: "Record recipient and handover date for traceability." },
  ],
  sell: [
    { title: "Assess value", detail: "Estimate fair resale/scrap value based on condition." },
    { title: "List with details", detail: "Add clear specs/photos to reduce negotiation and returns." },
    { title: "Close with proof", detail: "Keep transaction details for accountability." },
  ],
  compost: [
    { title: "Check compostability", detail: "Allow only accepted organic/compostable material." },
    { title: "Prep input", detail: "Cut into smaller pieces and remove contaminants." },
    { title: "Use local compost route", detail: "Use home bin, community compost unit, or city collection." },
  ],
  hazard: [
    { title: "Isolate safely", detail: "Keep hazardous/e-waste away from mixed household waste." },
    { title: "Pack securely", detail: "Seal batteries, liquids, and sharps to prevent leakage." },
    { title: "Drop at licensed facility", detail: "Use authorized hazardous or e-waste handlers only." },
  ],
};

export default function QuickActionsPage() {
  const [itemName, setItemName] = useState("");
  const [selectedAction, setSelectedAction] = useState<ActionType | null>(null);

  const steps = useMemo(() => {
    if (!selectedAction) return [];
    const base = actionSteps[selectedAction] ?? [];
    if (!itemName.trim()) return base;

    return base.map((step) => ({
      ...step,
      detail: step.detail.replace(/item|items|material/gi, (m) => {
        if (m.toLowerCase() === "items") return itemName.trim();
        return itemName.trim();
      }),
    }));
  }, [itemName, selectedAction]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              EcoPath
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">Quick Actions</h1>
            <p className="text-sm text-muted-foreground">
              Pick one action and get an instant, practical pathway.
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
            <CardTitle>One-tap decision</CardTitle>
            <CardDescription>
              Select the action you want, and we’ll generate the exact next steps.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="qa-item">Item (optional)</Label>
              <Input
                id="qa-item"
                placeholder="E.g., old laptop, glass bottle, food waste"
                value={itemName}
                onChange={(event) => setItemName(event.target.value)}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {actionOptions.map((action) => (
                <Button
                  key={action.id}
                  variant={selectedAction === action.id ? "default" : "outline"}
                  className="gap-2"
                  onClick={() => setSelectedAction(action.id)}
                >
                  {action.label}
                  <ArrowRight className="size-4" />
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="bg-primary/10 text-primary">
                <Zap className="mr-1 size-3" />
                Action pathway
              </Badge>
            </div>
            <CardTitle>
              {selectedAction
                ? `${actionOptions.find((a) => a.id === selectedAction)?.label} pathway`
                : "Choose an action to generate pathway"}
            </CardTitle>
            <CardDescription>
              {selectedAction
                ? actionOptions.find((a) => a.id === selectedAction)?.hint
                : "No action selected yet."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {steps.length ? (
              <ol className="grid gap-3">
                {steps.map((step, index) => (
                  <li key={`${step.title}-${index}`}>
                    <div className="flex items-start gap-3 rounded-lg border border-border bg-background px-4 py-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{step.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{step.detail}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                Pick any quick action to see instant steps.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
