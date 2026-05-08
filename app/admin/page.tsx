"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
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

type Product = { id: string; name: string };
type Region = { id: string; name: string; code?: string };
type Pathway = { id: string; name: string; category?: string | null };
type ProbabilityRow = {
  id: string;
  product_id: string;
  region_id: string;
  pathway_id: string;
  probability: number;
  confidence: number | null;
  source: string | null;
};
type LossHotspot = {
  id: string;
  pathway_probability_id: string;
  label: string;
};

export default function AdminPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [regions, setRegions] = useState<Region[]>([]);
  const [pathways, setPathways] = useState<Pathway[]>([]);
  const [probabilities, setProbabilities] = useState<ProbabilityRow[]>([]);
  const [lossHotspots, setLossHotspots] = useState<LossHotspot[]>([]);

  const [productName, setProductName] = useState("");
  const [regionName, setRegionName] = useState("");
  const [regionCode, setRegionCode] = useState("");
  const [pathwayName, setPathwayName] = useState("");
  const [pathwayCategory, setPathwayCategory] = useState("");

  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedRegion, setSelectedRegion] = useState("");
  const [selectedPathway, setSelectedPathway] = useState("");
  const [probabilityValue, setProbabilityValue] = useState("");
  const [confidenceValue, setConfidenceValue] = useState("");
  const [sourceValue, setSourceValue] = useState("");

  const [selectedProbability, setSelectedProbability] = useState("");
  const [lossLabel, setLossLabel] = useState("");

  const [editProductId, setEditProductId] = useState("");
  const [editProductName, setEditProductName] = useState("");
  const [editRegionId, setEditRegionId] = useState("");
  const [editRegionName, setEditRegionName] = useState("");
  const [editRegionCode, setEditRegionCode] = useState("");
  const [editPathwayId, setEditPathwayId] = useState("");
  const [editPathwayName, setEditPathwayName] = useState("");
  const [editPathwayCategory, setEditPathwayCategory] = useState("");
  const [editProbabilityId, setEditProbabilityId] = useState("");
  const [editProbabilityValue, setEditProbabilityValue] = useState("");
  const [editConfidenceValue, setEditConfidenceValue] = useState("");
  const [editSourceValue, setEditSourceValue] = useState("");
  const [editLossId, setEditLossId] = useState("");
  const [editLossLabel, setEditLossLabel] = useState("");

  const [status, setStatus] = useState("");

  const loadData = async () => {
    const supabase = createSupabaseBrowserClient();
    const [productsRes, regionsRes, pathwaysRes, probsRes, lossRes] =
      await Promise.all([
        supabase.from("products").select("id,name").order("name"),
        supabase.from("regions").select("id,name,code").order("name"),
        supabase.from("pathways").select("id,name,category").order("name"),
        supabase
          .from("pathway_probabilities")
          .select(
            "id,product_id,region_id,pathway_id,probability,confidence,source"
          ),
        supabase
          .from("loss_hotspots")
          .select("id,pathway_probability_id,label"),
      ]);

    if (productsRes.data) setProducts(productsRes.data);
    if (regionsRes.data) setRegions(regionsRes.data);
    if (pathwaysRes.data) setPathways(pathwaysRes.data);
    if (probsRes.data) setProbabilities(probsRes.data);
    if (lossRes.data) setLossHotspots(lossRes.data);

    if (!selectedProduct && productsRes.data?.length) {
      setSelectedProduct(productsRes.data[0].id);
    }
    if (!selectedRegion && regionsRes.data?.length) {
      setSelectedRegion(regionsRes.data[0].id);
    }
    if (!selectedPathway && pathwaysRes.data?.length) {
      setSelectedPathway(pathwaysRes.data[0].id);
    }
  };

  useEffect(() => {
    const init = async () => {
      const supabase = createSupabaseBrowserClient();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) {
        setStatus("Sign in to manage reference data.");
        return;
      }
      setUserId(userData.user.id);
      await loadData();
    };

    init().catch(() => {
      setStatus("Unable to load reference data. Check Supabase config.");
    });
  }, []);

  const probabilityOptions = useMemo(() => {
    const productMap = new Map(products.map((p) => [p.id, p.name]));
    const regionMap = new Map(regions.map((r) => [r.id, r.name]));
    const pathwayMap = new Map(pathways.map((p) => [p.id, p.name]));

    return probabilities.map((row) => ({
      id: row.id,
      label: `${productMap.get(row.product_id) ?? "Product"} · ${
        regionMap.get(row.region_id) ?? "Region"
      } · ${pathwayMap.get(row.pathway_id) ?? "Pathway"} (${row.probability}%)`,
    }));
  }, [pathways, probabilities, products, regions]);

  const handleInsert = async (table: string, payload: Record<string, unknown>) => {
    setStatus("");
    if (!userId) {
      setStatus("Sign in to add data.");
      return;
    }
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from(table).insert(payload);
      if (error) throw error;
      setStatus("Saved.");
      await loadData();
    } catch (error) {
      setStatus("Insert failed.");
    }
  };

  const handleUpdate = async (table: string, id: string, payload: Record<string, unknown>) => {
    setStatus("");
    if (!userId) {
      setStatus("Sign in to update data.");
      return;
    }
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from(table).update(payload).eq("id", id);
      if (error) throw error;
      setStatus("Updated.");
      await loadData();
    } catch (error) {
      setStatus("Update failed.");
    }
  };

  const handleDelete = async (table: string, id: string) => {
    setStatus("");
    if (!userId) {
      setStatus("Sign in to delete data.");
      return;
    }
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
      setStatus("Deleted.");
      await loadData();
    } catch (error) {
      setStatus("Delete failed.");
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
              Admin data entry
            </h1>
          </div>
          <Link href="/" className={buttonVariants({ variant: "outline" })}>
            Back to dashboard
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
        {status ? (
          <Card>
            <CardContent className="py-4 text-sm text-zinc-600">
              {status}
              {!userId ? (
                <div className="mt-2">
                  <Link
                    href="/auth"
                    className={buttonVariants({ variant: "secondary" })}
                  >
                    Sign in
                  </Link>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ) : null}

        <section className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Add product</CardTitle>
              <CardDescription>Product type name</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Label htmlFor="product-name">Name</Label>
              <Input
                id="product-name"
                value={productName}
                onChange={(event) => setProductName(event.target.value)}
                placeholder="Smartphone"
              />
              <Button
                onClick={() =>
                  handleInsert("products", { name: productName.trim() })
                }
                disabled={!productName.trim()}
              >
                Save product
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add region</CardTitle>
              <CardDescription>Region name + code</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Label htmlFor="region-name">Name</Label>
              <Input
                id="region-name"
                value={regionName}
                onChange={(event) => setRegionName(event.target.value)}
                placeholder="India"
              />
              <Label htmlFor="region-code">Code</Label>
              <Input
                id="region-code"
                value={regionCode}
                onChange={(event) => setRegionCode(event.target.value)}
                placeholder="IN"
              />
              <Button
                onClick={() =>
                  handleInsert("regions", {
                    name: regionName.trim(),
                    code: regionCode.trim().toUpperCase(),
                  })
                }
                disabled={!regionName.trim() || !regionCode.trim()}
              >
                Save region
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Add pathway</CardTitle>
              <CardDescription>Outcome category</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Label htmlFor="pathway-name">Name</Label>
              <Input
                id="pathway-name"
                value={pathwayName}
                onChange={(event) => setPathwayName(event.target.value)}
                placeholder="Formal Recycling"
              />
              <Label htmlFor="pathway-category">Category</Label>
              <Input
                id="pathway-category"
                value={pathwayCategory}
                onChange={(event) => setPathwayCategory(event.target.value)}
                placeholder="recycling"
              />
              <Button
                onClick={() =>
                  handleInsert("pathways", {
                    name: pathwayName.trim(),
                    category: pathwayCategory.trim(),
                  })
                }
                disabled={!pathwayName.trim()}
              >
                Save pathway
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Edit product</CardTitle>
              <CardDescription>Update name or delete</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Select
                value={editProductId}
                onValueChange={(value) => {
                  setEditProductId(value);
                  const product = products.find((item) => item.id === value);
                  setEditProductName(product?.name ?? "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select product" />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={editProductName}
                onChange={(event) => setEditProductName(event.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() =>
                    handleUpdate("products", editProductId, {
                      name: editProductName.trim(),
                    })
                  }
                  disabled={!editProductId || !editProductName.trim()}
                >
                  Update
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete("products", editProductId)}
                  disabled={!editProductId}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Edit region</CardTitle>
              <CardDescription>Update name/code or delete</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Select
                value={editRegionId}
                onValueChange={(value) => {
                  setEditRegionId(value);
                  const region = regions.find((item) => item.id === value);
                  setEditRegionName(region?.name ?? "");
                  setEditRegionCode(region?.code ?? "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map((region) => (
                    <SelectItem key={region.id} value={region.id}>
                      {region.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={editRegionName}
                onChange={(event) => setEditRegionName(event.target.value)}
              />
              <Input
                value={editRegionCode}
                onChange={(event) => setEditRegionCode(event.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() =>
                    handleUpdate("regions", editRegionId, {
                      name: editRegionName.trim(),
                      code: editRegionCode.trim().toUpperCase(),
                    })
                  }
                  disabled={!editRegionId || !editRegionName.trim()}
                >
                  Update
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete("regions", editRegionId)}
                  disabled={!editRegionId}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Edit pathway</CardTitle>
              <CardDescription>Update name/category or delete</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Select
                value={editPathwayId}
                onValueChange={(value) => {
                  setEditPathwayId(value);
                  const pathway = pathways.find((item) => item.id === value);
                  setEditPathwayName(pathway?.name ?? "");
                  setEditPathwayCategory(pathway?.category ?? "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pathway" />
                </SelectTrigger>
                <SelectContent>
                  {pathways.map((pathway) => (
                    <SelectItem key={pathway.id} value={pathway.id}>
                      {pathway.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={editPathwayName}
                onChange={(event) => setEditPathwayName(event.target.value)}
              />
              <Input
                value={editPathwayCategory}
                onChange={(event) => setEditPathwayCategory(event.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() =>
                    handleUpdate("pathways", editPathwayId, {
                      name: editPathwayName.trim(),
                      category: editPathwayCategory.trim(),
                    })
                  }
                  disabled={!editPathwayId || !editPathwayName.trim()}
                >
                  Update
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete("pathways", editPathwayId)}
                  disabled={!editPathwayId}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Add pathway probability</CardTitle>
              <CardDescription>Connect product + region + pathway</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid gap-2">
                <Label>Product</Label>
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select product" />
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
                <Label>Region</Label>
                <Select value={selectedRegion} onValueChange={setSelectedRegion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select region" />
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
              <div className="grid gap-2">
                <Label>Pathway</Label>
                <Select value={selectedPathway} onValueChange={setSelectedPathway}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select pathway" />
                  </SelectTrigger>
                  <SelectContent>
                    {pathways.map((pathway) => (
                      <SelectItem key={pathway.id} value={pathway.id}>
                        {pathway.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="probability">Probability %</Label>
                <Input
                  id="probability"
                  type="number"
                  min="0"
                  max="100"
                  value={probabilityValue}
                  onChange={(event) => setProbabilityValue(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="confidence">Confidence %</Label>
                <Input
                  id="confidence"
                  type="number"
                  min="0"
                  max="100"
                  value={confidenceValue}
                  onChange={(event) => setConfidenceValue(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  value={sourceValue}
                  onChange={(event) => setSourceValue(event.target.value)}
                  placeholder="Report, dataset, etc."
                />
              </div>
              <Button
                onClick={() =>
                  handleInsert("pathway_probabilities", {
                    product_id: selectedProduct,
                    region_id: selectedRegion,
                    pathway_id: selectedPathway,
                    probability: Number(probabilityValue || 0),
                    confidence: confidenceValue
                      ? Number(confidenceValue)
                      : null,
                    source: sourceValue || null,
                  })
                }
                disabled={
                  !selectedProduct ||
                  !selectedRegion ||
                  !selectedPathway ||
                  !probabilityValue
                }
              >
                Save probability
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Edit probability</CardTitle>
              <CardDescription>Update % or delete row</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Select
                value={editProbabilityId}
                onValueChange={(value) => {
                  setEditProbabilityId(value);
                  const row = probabilities.find((item) => item.id === value);
                  setEditProbabilityValue(row?.probability?.toString() ?? "");
                  setEditConfidenceValue(row?.confidence?.toString() ?? "");
                  setEditSourceValue(row?.source ?? "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select probability" />
                </SelectTrigger>
                <SelectContent>
                  {probabilityOptions.map((row) => (
                    <SelectItem key={row.id} value={row.id}>
                      {row.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min="0"
                max="100"
                value={editProbabilityValue}
                onChange={(event) => setEditProbabilityValue(event.target.value)}
              />
              <Input
                type="number"
                min="0"
                max="100"
                value={editConfidenceValue}
                onChange={(event) => setEditConfidenceValue(event.target.value)}
              />
              <Input
                value={editSourceValue}
                onChange={(event) => setEditSourceValue(event.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() =>
                    handleUpdate("pathway_probabilities", editProbabilityId, {
                      probability: Number(editProbabilityValue || 0),
                      confidence: editConfidenceValue
                        ? Number(editConfidenceValue)
                        : null,
                      source: editSourceValue || null,
                    })
                  }
                  disabled={!editProbabilityId || !editProbabilityValue}
                >
                  Update
                </Button>
                <Button
                  variant="destructive"
                  onClick={() =>
                    handleDelete("pathway_probabilities", editProbabilityId)
                  }
                  disabled={!editProbabilityId}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <CardHeader>
              <CardTitle>Add loss hotspot</CardTitle>
              <CardDescription>Attach loss note to a probability</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="grid gap-2">
                <Label>Probability row</Label>
                <Select
                  value={selectedProbability}
                  onValueChange={setSelectedProbability}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select probability" />
                  </SelectTrigger>
                  <SelectContent>
                    {probabilityOptions.map((row) => (
                      <SelectItem key={row.id} value={row.id}>
                        {row.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="loss-label">Loss label</Label>
                <Input
                  id="loss-label"
                  value={lossLabel}
                  onChange={(event) => setLossLabel(event.target.value)}
                  placeholder="Sorting losses"
                />
              </div>
              <Button
                onClick={() =>
                  handleInsert("loss_hotspots", {
                    pathway_probability_id: selectedProbability,
                    label: lossLabel.trim(),
                  })
                }
                disabled={!selectedProbability || !lossLabel.trim()}
              >
                Save loss hotspot
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Edit loss hotspot</CardTitle>
              <CardDescription>Update label or delete</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Select
                value={editLossId}
                onValueChange={(value) => {
                  setEditLossId(value);
                  const row = lossHotspots.find((item) => item.id === value);
                  setEditLossLabel(row?.label ?? "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select loss hotspot" />
                </SelectTrigger>
                <SelectContent>
                  {lossHotspots.map((row) => (
                    <SelectItem key={row.id} value={row.id}>
                      {row.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={editLossLabel}
                onChange={(event) => setEditLossLabel(event.target.value)}
              />
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  onClick={() =>
                    handleUpdate("loss_hotspots", editLossId, {
                      label: editLossLabel.trim(),
                    })
                  }
                  disabled={!editLossId || !editLossLabel.trim()}
                >
                  Update
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleDelete("loss_hotspots", editLossId)}
                  disabled={!editLossId}
                >
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <Separator />

        <section className="grid gap-3">
          <Card>
            <CardHeader>
              <CardTitle>Current reference counts</CardTitle>
              <CardDescription>Quick sanity check</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Badge variant="secondary">Products: {products.length}</Badge>
              <Badge variant="secondary">Regions: {regions.length}</Badge>
              <Badge variant="secondary">Pathways: {pathways.length}</Badge>
              <Badge variant="secondary">
                Probabilities: {probabilities.length}
              </Badge>
              <Badge variant="secondary">Loss hotspots: {lossHotspots.length}</Badge>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
