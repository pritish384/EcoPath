"use client";

import { useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowUpRight,
  Cpu,
  Factory,
  HeartHandshake,
  Leaf,
  LocateFixed,
  Recycle,
} from "lucide-react";
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
import type { LocationResult } from "@/components/location-map";

type LocationResultWithDistance = LocationResult & { distanceKm?: number };

const LocationMap = dynamic(
  () => import("@/components/location-map").then((mod) => mod.LocationMap),
  { ssr: false }
);

type Category = "recycling" | "e-waste" | "scrap" | "donation" | "compost";

type CachedEntry = {
  results: LocationResultWithDistance[];
  center: { lat: number; lon: number };
  ts: number;
};

const categoryLabels: Record<Category, string> = {
  recycling: "Recycling centers",
  "e-waste": "E-waste facilities",
  scrap: "Scrap dealers",
  donation: "Donation centers",
  compost: "Compost units",
};

const categoryQueries: Record<Category, string[]> = {
  recycling: [
    "amenity=recycling",
    "amenity=waste_transfer_station",
    "recycling_type=centre",
  ],
  "e-waste": [
    "amenity=recycling",
    "recycling:electronic_waste=yes",
    "recycling:electronics=yes",
  ],
  scrap: ["shop=scrap_metal", "industrial=scrap_yard", "recycling:metal=yes"],
  donation: ["amenity=social_facility", "amenity=charity", "shop=charity"],
  compost: ["amenity=recycling", "recycling:organic=yes", "compost=yes"],
};

const defaultCenter = { lat: 28.6139, lon: 77.209 };

const categoryIcons: Record<Category, React.ElementType> = {
  recycling: Recycle,
  "e-waste": Cpu,
  scrap: Factory,
  donation: HeartHandshake,
  compost: Leaf,
};

const CACHE_TTL_MS = 15 * 60 * 1000;

const cacheStorageKey = "ecopath.locations.cache";

function toOverpassQuery(
  lat: number,
  lon: number,
  radiusMeters: number,
  tags: string[]
) {
  const tagFilter = tags
    .map((tag) => `node[${tag}](around:${radiusMeters},${lat},${lon});`)
    .join("");
  return `[out:json][timeout:25];(${tagFilter});out center tags;`;
}

function mapOverpassToResults(items: any[], category: string): LocationResult[] {
  return items
    .filter((item) => item.lat && item.lon)
    .map((item) => ({
      id: String(item.id),
      name: item.tags?.name ?? "Unnamed facility",
      category,
      lat: item.lat,
      lon: item.lon,
      address: [
        item.tags?.["addr:street"],
        item.tags?.["addr:city"],
        item.tags?.["addr:state"],
      ]
        .filter(Boolean)
        .join(", "),
      hours: item.tags?.opening_hours,
    }));
}

const toRadians = (value: number) => (value * Math.PI) / 180;

const getDistanceKm = (
  from: { lat: number; lon: number },
  to: { lat: number; lon: number }
) => {
  const earthRadiusKm = 6371;
  const dLat = toRadians(to.lat - from.lat);
  const dLon = toRadians(to.lon - from.lon);
  const lat1 = toRadians(from.lat);
  const lat2 = toRadians(to.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusKm * c;
};

export default function LocationsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("recycling");
  const [center, setCenter] = useState(defaultCenter);
  const [results, setResults] = useState<LocationResultWithDistance[]>([]);
  const [status, setStatus] = useState("");
  const [radius, setRadius] = useState("5000");
  const cacheRef = useRef<Record<string, CachedEntry>>({});

  const mapCenter = useMemo(() => [center.lat, center.lon] as [number, number], [
    center.lat,
    center.lon,
  ]);

  const handleLocate = () => {
    setStatus("Locating you…");
    if (!navigator.geolocation) {
      setStatus("Geolocation not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCenter({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setStatus("Location updated. Search nearby facilities.");
      },
      () => setStatus("Unable to access location."),
      { enableHighAccuracy: true }
    );
  };

  const handleSearch = async () => {
    try {
      setStatus("Searching locations…");

      let searchCenter = center;
      if (query.trim()) {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query.trim()
          )}`
        );
        const data = await res.json();
        if (!data?.length) {
          setStatus("No matching place found.");
          return;
        }
        searchCenter = { lat: Number(data[0].lat), lon: Number(data[0].lon) };
        setCenter(searchCenter);
      }

      const cacheKey = [
        category,
        Math.round(searchCenter.lat * 1000) / 1000,
        Math.round(searchCenter.lon * 1000) / 1000,
        radius,
        query.trim().toLowerCase(),
      ].join(":" );

      const now = Date.now();
      const persisted = (() => {
        try {
          const raw = window.localStorage.getItem(cacheStorageKey);
          return raw ? (JSON.parse(raw) as Record<string, CachedEntry>) : {};
        } catch {
          return {};
        }
      })();

      const inMemory = cacheRef.current[cacheKey] ?? persisted[cacheKey];
      if (inMemory && now - inMemory.ts < CACHE_TTL_MS) {
        setResults(inMemory.results);
        setStatus(`Loaded ${inMemory.results.length} cached locations.`);
        return;
      }

      const queryTags = categoryQueries[category];
      const overpassQuery = toOverpassQuery(
        searchCenter.lat,
        searchCenter.lon,
        Number(radius) || 5000,
        queryTags
      );

      const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: overpassQuery,
      });
      const overpassData = await overpassRes.json();
      const mapped = mapOverpassToResults(
        overpassData.elements ?? [],
        categoryLabels[category]
      ).map((item) => ({
        ...item,
        distanceKm: getDistanceKm(searchCenter, { lat: item.lat, lon: item.lon }),
      }));

      const entry: CachedEntry = { results: mapped, center: searchCenter, ts: now };
      cacheRef.current[cacheKey] = entry;
      try {
        const nextCache = { ...persisted, [cacheKey]: entry };
        window.localStorage.setItem(cacheStorageKey, JSON.stringify(nextCache));
      } catch {
        // ignore storage failures
      }

      setResults(mapped);
      setStatus(mapped.length ? `Found ${mapped.length} locations.` : "No locations found.");
    } catch (error) {
      setStatus("Unable to fetch locations. Try again in a moment.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-primary">
              EcoPath
            </p>
            <h1 className="text-2xl font-semibold tracking-tight">
              Location-Based Suggestions
            </h1>
            <p className="text-sm text-muted-foreground">
              Find nearby recycling, donation, and disposal locations.
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
        <section className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
          <Card>
            <CardHeader>
              <CardTitle>Search area</CardTitle>
              <CardDescription>
                Enter a city or use your current location.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="place">Location</Label>
                <Input
                  id="place"
                  placeholder="Mumbai, Bengaluru, Delhi…"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={category} onValueChange={(value) => setCategory(value as Category)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="recycling">Recycling centers</SelectItem>
                    <SelectItem value="e-waste">E-waste facilities</SelectItem>
                    <SelectItem value="scrap">Scrap dealers</SelectItem>
                    <SelectItem value="donation">Donation centers</SelectItem>
                    <SelectItem value="compost">Compost units</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Search radius (meters)</Label>
                <Select value={radius} onValueChange={setRadius}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select radius" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2000">2 km</SelectItem>
                    <SelectItem value="5000">5 km</SelectItem>
                    <SelectItem value="10000">10 km</SelectItem>
                    <SelectItem value="20000">20 km</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={handleSearch}>Find locations</Button>
                <Button variant="outline" onClick={handleLocate} className="gap-2">
                  <LocateFixed className="size-4" />
                  Use my location
                </Button>
              </div>
              {status ? (
                <p className="text-xs text-muted-foreground">{status}</p>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nearby map</CardTitle>
              <CardDescription>
                Showing {categoryLabels[category]} near your selected area.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[420px]">
              <LocationMap center={mapCenter} results={results} />
            </CardContent>
          </Card>
        </section>

        <Separator />

        <section className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Results</h2>
              <p className="text-sm text-muted-foreground">
                {results.length
                  ? "Click for directions in your maps app."
                  : "Search a location to populate results."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{results.length} found</Badge>
              <Link
                href={`https://www.openstreetmap.org/note/new?text=${encodeURIComponent(
                  `Missing ${categoryLabels[category]} near ${query || "my area"}`
                )}`}
                target="_blank"
                className={buttonVariants({ variant: "outline", size: "sm" })}
              >
                Report missing place
              </Link>
            </div>
          </div>
          {results.length ? (
            <div className="grid gap-3 md:grid-cols-2">
              {results.map((result) => {
                const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${result.lat},${result.lon}`;
                const Icon = categoryIcons[category];
                return (
                  <Card key={result.id} className="transition-transform hover:-translate-y-0.5">
                    <CardHeader className="flex flex-row items-start gap-3">
                      <div className="rounded-lg border border-border bg-background p-2 text-primary">
                        <Icon className="size-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{result.name}</CardTitle>
                        <CardDescription>{result.category}</CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm text-muted-foreground">
                      {result.address ? <p>{result.address}</p> : null}
                      {result.hours ? <p>Hours: {result.hours}</p> : null}
                      {result.distanceKm ? (
                        <p>Distance: {result.distanceKm.toFixed(1)} km</p>
                      ) : null}
                      <Link
                        href={mapsUrl}
                        target="_blank"
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        Directions <ArrowUpRight className="ml-1 size-4" />
                      </Link>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-sm text-muted-foreground">
                No locations loaded yet.
              </CardContent>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}
