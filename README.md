# Ecopath

Ecopath is a Next.js application for mapping post-use material pathways by product and region. It combines Supabase-backed reference data, probability estimates, loss hotspots, and saved analyses into a simple dashboard for exploring lifecycle outcomes.

## What it does

- Select a product and region to inspect likely post-use pathways.
- Visualize pathway splits with a Sankey diagram and probability bars.
- Save analyses to your Supabase account and revisit them later.
- Manage reference data and probability inputs from an admin screen.
- Seeded sample data is included for products, regions, pathways, probabilities, and loss hotspots.

## Tech Stack

- Next.js 16 with the App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Supabase for authentication, database access, and persistence
- Recharts for chart rendering

## Project Structure

- `app/page.tsx` - main dashboard and analysis builder
- `app/admin/page.tsx` - admin data entry for products, regions, pathways, probabilities, and hotspots
- `app/analyses/page.tsx` - saved analyses list
- `app/analyses/[id]/page.tsx` - analysis detail view
- `app/auth/page.tsx` - Google sign-in entry point
- `app/auth/callback/route.ts` - OAuth callback handler
- `lib/supabase/` - browser and server Supabase clients
- `components/` - UI and chart components
- `supabase/schema.sql` - database schema and row-level security policies
- `supabase/seed.sql` - sample reference data

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Create a local environment file named `.env.local` and add your Supabase values:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

3. Apply the schema and optional seed data in Supabase:

```sql
-- run supabase/schema.sql first
-- then run supabase/seed.sql if you want sample data
```

4. Start the development server:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Scripts

- `npm run dev` - start the local development server
- `npm run build` - build the production app
- `npm run start` - run the production build
- `npm run lint` - run ESLint

## Supabase Setup

This app expects two public environment variables in both browser and server code:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The database schema defines these core tables:

- `products`
- `regions`
- `pathways`
- `pathway_probabilities`
- `loss_hotspots`
- `analyses`
- `analysis_pathways`

Row-level security is enabled in `supabase/schema.sql`.

## Sample Data

`supabase/seed.sql` includes example records for:

- Smartphone in India
- Plastic bottle in the European Union
- EV battery in the United States

These seeds make the dashboard usable immediately after the schema is applied.

## Main User Flow

1. Open the dashboard and select a product and region.
2. Review the pathway probabilities, Sankey flow, and loss hotspots.
3. Sign in with Google to save an analysis.
4. Use the admin page to manage reference data and probability inputs.
5. Open saved analyses from the analyses page or the detail view.

## Deployment

This is a standard Next.js app and can be deployed to Vercel or any platform that supports Node.js builds.

Before deploying, make sure your Supabase project is configured with the schema, seed data if desired, and the environment variables above.
