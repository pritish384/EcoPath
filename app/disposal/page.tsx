"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
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

type DisposalStep = {
  title: string;
  detail: string;
  type: "recycle" | "reuse" | "donate" | "sell" | "compost" | "hazard" | "prep";
};

const typeLabels: Record<DisposalStep["type"], string> = {
  recycle: "Recycle",
  reuse: "Reuse",
  donate: "Donate",
  sell: "Sell",
  compost: "Compost",
  hazard: "Hazardous / E-waste",
  prep: "Prepare",
};

export default function DisposalGeneratorPage() {
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [generated, setGenerated] = useState(false);

  const steps = useMemo<DisposalStep[]>(() => {
    if (!generated) return [];

    const name = itemName.trim().toLowerCase();
    const categoryLower = category?.toLowerCase();

    const isElectronics =
      categoryLower === "electronics" ||
      /phone|laptop|charger|battery|tablet|earbud|headphone|tv|monitor/.test(name);
    const isOrganic =
      categoryLower === "organic" || /food|banana|apple|vegetable|garden/.test(name);
    const isTextile =
      categoryLower === "textile" || /shirt|jeans|clothes|fabric/.test(name);
    const isGlass = categoryLower === "glass" || /glass|bottle|jar/.test(name);
    const isMetal = categoryLower === "metal" || /can|metal|aluminium|steel/.test(name);
    const isPaper = categoryLower === "paper" || /paper|cardboard|box|newspaper/.test(name);
    const isPlastic = categoryLower === "plastic" || /plastic|container|wrapper/.test(name);

    const result: DisposalStep[] = [
      {
        title: "Prepare the item",
        detail:
          "Remove obvious contaminants, separate accessories, and keep packaging or labels if helpful.",
        type: "prep",
      },
    ];

    if (isElectronics) {
      result.push(
        {
          title: "Back up data & reset",
          detail: "Wipe personal data and remove SIM/storage cards before disposal.",
          type: "reuse",
        },
        {
          title: "Reuse or sell first",
          detail: "Check resale platforms or local refurbishers for a second life.",
          type: "sell",
        },
        {
          title: "Donate if functional",
          detail: "Schools, NGOs, or repair cafés often accept working electronics.",
          type: "donate",
        },
        {
          title: "E-waste drop-off",
          detail: "Use authorized e-waste collection points for safe handling.",
          type: "hazard",
        }
      );
    } else if (isOrganic) {
      result.push(
        {
          title: "Compost",
          detail: "Add to home compost or community composting units.",
          type: "compost",
        },
        {
          title: "Reuse as feedstock",
          detail: "Some organic waste can be used for animal feed or gardening.",
          type: "reuse",
        }
      );
    } else if (isTextile) {
      result.push(
        {
          title: "Reuse or upcycle",
          detail: "Turn into cleaning cloths, bags, or DIY projects.",
          type: "reuse",
        },
        {
          title: "Donate",
          detail: "Local shelters or donation centers often accept textiles.",
          type: "donate",
        },
        {
          title: "Sell",
          detail: "Use resale platforms if the item is in good condition.",
          type: "sell",
        }
      );
    } else if (isGlass || isMetal || isPaper || isPlastic) {
      result.push(
        {
          title: "Recycle",
          detail: "Sort by material type and drop at a recycling center.",
          type: "recycle",
        },
        {
          title: "Reuse if possible",
          detail: "Glass jars, boxes, and containers can be reused at home.",
          type: "reuse",
        }
      );
    } else {
      result.push(
        {
          title: "Reuse first",
          detail: "If the item is still useful, prioritize reuse or donation.",
          type: "reuse",
        },
        {
          title: "Check local recycling rules",
          detail: "Some mixed items need a special drop-off point.",
          type: "recycle",
        }
      );
    }

    result.push({
      title: "Confirm local guidance",
      detail: "Verify pickup days or drop-off hours near you before visiting.",
      type: "prep",
    });

    return result;
  }, [category, generated, itemName]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              EcoPath
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Smart Disposal Pathway Generator
            </h1>
            <p className="text-sm text-muted-foreground">
              Turn any item into a guided disposal flow.
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
        <section className="grid gap-6 lg:grid-cols-[1fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Describe the item</CardTitle>
              <CardDescription>
                Add an item name and pick the closest category.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-5">
              <div className="grid gap-2">
                <Label htmlFor="item">Item name</Label>
                <Input
                  id="item"
                  placeholder="E.g., old smartphone, pizza box, jeans"
                  value={itemName}
                  onChange={(event) => setItemName(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="electronics">Electronics / E-waste</SelectItem>
                    <SelectItem value="organic">Organic / Food</SelectItem>
                    <SelectItem value="textile">Textile / Clothing</SelectItem>
                    <SelectItem value="plastic">Plastic</SelectItem>
                    <SelectItem value="paper">Paper / Cardboard</SelectItem>
                    <SelectItem value="metal">Metal</SelectItem>
                    <SelectItem value="glass">Glass</SelectItem>
                    <SelectItem value="mixed">Mixed / Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => setGenerated(true)}
                disabled={!itemName.trim()}
              >
                Generate pathway
              </Button>
              <p className="text-xs text-muted-foreground">
                This is a rule-based MVP. We can swap in AI categorization later.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge className="bg-primary/10 text-primary" variant="secondary">
                  Guided flow
                </Badge>
              </div>
              <CardTitle>Your disposal pathway</CardTitle>
              <CardDescription>
                Follow the steps below to handle this item responsibly.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              {steps.length ? (
                <ol className="grid gap-3">
                  {steps.map((step, index) => (
                    <li key={`${step.title}-${index}`}>
                      <div className="flex items-start gap-3 rounded-lg border border-border bg-background px-4 py-3">
                        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium text-foreground">
                              {step.title}
                            </p>
                            <Badge variant="outline">{typeLabels[step.type]}</Badge>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {step.detail}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                  Enter an item to see a step-by-step disposal pathway.
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <Separator />

        <section className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Quick actions</CardTitle>
              <CardDescription>
                Jump straight to a disposal action if you already know your path.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {[
                "Recycle",
                "Reuse",
                "Donate",
                "Sell",
                "Compost",
                "Hazardous disposal",
              ].map((label) => (
                <Button key={label} variant="outline" className="gap-2">
                  {label}
                  <ArrowRight className="size-4" />
                </Button>
              ))}
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4">
          <Card className="bg-muted/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                Next steps
              </CardTitle>
              <CardDescription>
                Want this to be smarter? We can wire in AI classification, maps,
                and local pickup schedules.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              This page is ready to plug into your other features: location-based
              suggestions, eco scoring, and the AI chat assistant.
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
