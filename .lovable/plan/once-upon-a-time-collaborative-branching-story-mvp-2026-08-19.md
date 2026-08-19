# Once Upon a Time — collaborative branching story MVP

A magical, mobile-first storybook where one public story branches endlessly. Readers browse free; signed-in users pay a small fee to add the next sentence, upvote branches, and earn royalties when others build on their words.

## What gets built

### Pages
- **Landing (`/`)** — Hero "Once upon a time…", subtitle "One story. Infinite possibilities.", CTA "Start Reading", an animated example branch, the three steps (Read → Choose → Continue), and the earning explanation.
- **Story reader (`/story`)** — The current path rendered as flowing prose, ending at a fork. Fork continuations shown as story cards (text, author, upvotes, descendants, current fork price, Continue). Sort tabs: Top / New / Trending. Deep-linkable to any node (`/story/$nodeId`).
- **Contribute flow** — From any node: write myself / polish with AI / write with AI → preview → price shown → pay → published, with a gentle celebratory reveal.
- **Profile (`/profile`)** — Contributions, upvotes received, total + pending earnings, story value generated, best branches, and the line "Your stories earn when people build on them."
- **Auth (`/auth`)** — Email sign-in/sign-up, styled as part of the storybook.

### Visual direction
Warm paper background, deep ink text, a serif display face for story prose and a clean sans for UI. Large readable line lengths, soft page-edge shadows, hairline branch connectors between cards, restrained fade/slide animations. No dashboards, charts, tickers, or crypto aesthetics — money appears as small quiet type.

## Backend (Lovable Cloud)

Tables: `stories`, `story_nodes`, `votes` (unique on node+user), `contributions`, `royalty_distributions`, `earnings_ledger` (append-only), `profiles`, plus a `pricing_config` table holding tunable parameters.

Seeded with one story whose root node is "Once upon a time…" and a handful of demo branches so the app is alive on first load.

### Pricing
`price = BASE_PRICE × (1 + log2(1 + subtree_size))^1.5`, BASE_PRICE = $0.10, rounded to cents. Computed server-side; `current_fork_price` on each node is refreshed whenever a descendant is added. Nodes store `original_price_paid` so no one pays retroactively. Base price, exponent, and rounding live in `pricing_config`.

### Royalties
30% of each payment to the creator pool, 50% platform, 20% treasury (all configurable). Nearest 5 ancestors are eligible:
- `ancestry_weight = e^(-0.5 × distance)`
- `popularity_weight = 1 + ln(1 + upvotes)`
- `economic_weight = 1 + ln(1 + downstream_revenue)`
- `raw_weight` = product; payouts normalized across eligible ancestors.

Every distribution row records all weights and the payout, and writes a matching immutable ledger entry. All of this runs in a server-side transaction — never in the browser.

### Payments
Stripe via Lovable's built-in payments. Server recomputes the authoritative price at checkout time; browser-supplied prices are ignored. Node creation, royalty distribution, ancestor stat updates, and ledger writes happen only on verified payment confirmation, guarded by an idempotency key so retries cannot double-publish.

### AI writing
Lovable AI powers "Polish with AI" (rewrite the user's rough text into story prose, preserving meaning) and "Write with AI" (continue from the current path). Output is always attributed to the signed-in user, with `ai_generated` / `ai_polished` flags stored.

### Voting
Authenticated only, one vote per node enforced by a database constraint. Votes drive ranking and royalty weighting, never price.

## Technical notes
- TanStack Start routes with server functions for all pricing, payment, royalty, and vote logic; RLS on every table (public read of story content, writes scoped to the authenticated user, ledger/royalty tables insert-only via server role).
- Ancestor `descendant_count` / `downstream_revenue` updated via a recursive server-side walk on publish.
- Schema is story-scoped from day one, so more stories can be added later without migration churn.
- Per-route SEO metadata on landing, story, and profile.

## Build order
1. Cloud + schema + seed story, design system and landing page.
2. Story reader, path prose, fork cards, sorting.
3. Auth, voting, profiles.
4. AI write/polish flow with preview.
5. Stripe payments, pricing engine, royalties, ledger.
6. Mobile polish and animation pass.

Enabling Stripe payments requires a Pro plan; if it's unavailable, steps 1–4 still ship and contributions run in a free/test mode until payments are switched on.
