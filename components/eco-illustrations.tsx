import { Leaf, Recycle, Sparkles } from "lucide-react";

export function HeroIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -left-8 top-8 h-24 w-24 rounded-full bg-emerald-300/30 blur-2xl" />
      <div className="absolute -right-8 bottom-8 h-24 w-24 rounded-full bg-cyan-300/30 blur-2xl" />

      <svg
        viewBox="0 0 520 360"
        className="h-auto w-full"
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
            <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.85" />
          </linearGradient>
        </defs>

        <rect x="20" y="20" width="480" height="320" rx="28" fill="#ecfdf5" />

        <circle cx="150" cy="95" r="52" fill="url(#ecoGradA)" opacity="0.95" />
        <circle cx="370" cy="95" r="52" fill="url(#ecoGradB)" opacity="0.95" />
        <circle cx="260" cy="255" r="62" fill="url(#ecoGradA)" opacity="0.9" />

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

      <div className="pointer-events-none absolute left-10 top-8 rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm">
        Collection
      </div>
      <div className="pointer-events-none absolute right-8 top-10 rounded-full border border-cyan-200 bg-white/90 px-3 py-1 text-xs font-medium text-cyan-700 shadow-sm">
        Recovery
      </div>
      <div className="pointer-events-none absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-emerald-200 bg-white/90 px-3 py-1 text-xs font-medium text-emerald-700 shadow-sm">
        Circular outcomes
      </div>
    </div>
  );
}

export function FeatureIconStack() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/70 bg-white/90 px-3 py-1 text-emerald-700 shadow-sm">
      <Recycle className="size-4" />
      <Leaf className="size-4" />
      <Sparkles className="size-4" />
    </div>
  );
}
