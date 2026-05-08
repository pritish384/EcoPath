import { Leaf, Recycle, Sparkles } from "lucide-react";

export function HeroIllustration() {
  return (
    <div className="group relative mx-auto w-full max-w-lg">
      <div className="absolute -left-10 top-6 h-28 w-28 rounded-full bg-emerald-300/30 blur-3xl" />
      <div className="absolute -right-10 bottom-6 h-28 w-28 rounded-full bg-amber-300/30 blur-3xl" />

      <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-emerald-50/80 via-white to-amber-50/80 p-6 shadow-[0_24px_60px_-32px_rgba(10,45,33,0.4)]">
        <svg
          viewBox="0 0 520 360"
          className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.02]"
          role="img"
          aria-label="Circular material pathways illustration"
        >
          <defs>
            <linearGradient id="ecoGradA" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#059669" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#14b8a6" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="ecoGradB" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="#22c55e" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          <circle
            cx="150"
            cy="95"
            r="52"
            fill="url(#ecoGradA)"
            opacity="0.95"
            className="transition-transform duration-500 group-hover:-translate-y-1"
          />
          <circle
            cx="370"
            cy="95"
            r="52"
            fill="url(#ecoGradB)"
            opacity="0.95"
            className="transition-transform duration-500 group-hover:-translate-y-1"
          />
          <circle
            cx="260"
            cy="255"
            r="62"
            fill="url(#ecoGradA)"
            opacity="0.9"
            className="transition-transform duration-500 group-hover:translate-y-1"
          />

          <path
            d="M198 102 C238 68, 292 68, 322 102"
            stroke="#065f46"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            opacity="0.8"
          />
          <path
            d="M330 140 C325 200, 302 222, 285 233"
            stroke="#0f766e"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            opacity="0.8"
          />
          <path
            d="M235 233 C198 212, 184 188, 182 140"
            stroke="#0f766e"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
            opacity="0.8"
          />

          <circle cx="150" cy="95" r="10" fill="#ffffff" opacity="0.9" />
          <circle cx="370" cy="95" r="10" fill="#ffffff" opacity="0.9" />
          <circle cx="260" cy="255" r="12" fill="#ffffff" opacity="0.9" />
        </svg>
      </div>

      <div className="pointer-events-none absolute left-12 top-7 rounded-full border border-border/70 bg-background/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-foreground shadow-sm">
        Collection
      </div>
      <div className="pointer-events-none absolute right-10 top-8 rounded-full border border-border/70 bg-background/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-foreground shadow-sm">
        Recovery
      </div>
      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-border/70 bg-background/90 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-foreground shadow-sm">
        Circular outcomes
      </div>
    </div>
  );
}

export function FeatureIconStack() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 py-1 text-primary shadow-sm">
      <Recycle className="size-4" />
      <Leaf className="size-4" />
      <Sparkles className="size-4" />
    </div>
  );
}
