# CLAUDE.md — ML Trading Business Ops

**This is the master context document for the ML Trading Business Ops project.**
**Every Claude Code session must read this file first before doing any work.**

---

## 1. Project Identity

- **Project name:** ML Trading Business Ops
- **Short name:** MLT Ops
- **Business owner:** ML Trading International Ltd (UK-registered)
- **System owner / Super Admin:** Muhammad Daood — `daoodtaxexpertllc@gmail.com`
- **Production URL:** `https://ml-trading-ops.pages.dev`
- **GitHub repo:** `https://github.com/david-agentic/ml-trading-ops`
- **Language:** English only
- **Base currency:** GBP (£)
- **Timezone:** Europe/London
- **Date format:** DD/MM/YYYY (UK convention)
- **VAT:** Out of scope currently. Design with VAT-ready hooks (toggleable module) so it can be enabled later without a rebuild if turnover crosses the threshold.

---

## 2. Business Context

ML Trading International Ltd is a UK-based B2B supplier of **research-use-only compounds and peptides** (research chemicals sold to labs and resellers). Key operational realities:

- Products are shipped from UK warehouse to UK customers and resellers
- Resellers place bulk orders; direct customers occasionally order too
- Payment happens **before** shipping (verified by Finance)
- Multiple payment methods, most commonly bank transfer and cash
- Multiple couriers (Royal Mail, DHL) plus personal delivery and customer pickup
- Warehouse staff print picking sheets automatically when Finance releases an order
- Currently operated via a Google Sheets + App Script system called SARMS — that system stays running in parallel until this new system is fully complete. **This is a fresh-start rebuild, not a migration.**
- The new system must be commercial-grade — potential future SaaS product for similar businesses

### Legal / Compliance guardrails

- Every product record has a **`is_research_use_only`** flag (default `true`) and every reseller must accept a **Research Use Only Terms** acknowledgement during onboarding
- Product pages, invoices, and picking sheets must display: **"For Research Use Only — Not for Human Consumption"**
- No medical claims, no dosing guidance, no health advice anywhere in the UI
- Reseller registration captures business name, contact, address, and research-use acknowledgement timestamp (stored in audit log)

---

## 3. Technical Stack (locked)

### Frontend
- **Next.js 14+** (App Router) with **React 18+**
- **TypeScript** (strict mode)
- **Tailwind CSS** for styling
- **shadcn/ui** for component primitives
- **Lucide React** for icons
- **TanStack Query** for server state
- **Zod** for schema validation
- **React Hook Form** for forms
- **PWA-ready** (installable on mobile for resellers and warehouse staff)

### Backend
- **Hono** framework running on **Cloudflare Workers**
- **TypeScript** (strict mode)
- **Drizzle ORM** for database access
- **Zod** for API input validation
- **JWT** for authentication (custom, using `jose` library)
- **bcrypt** (or `@node-rs/bcrypt` for Workers compatibility) for password hashing

### Database
- **Neon PostgreSQL** (serverless Postgres, free tier initially)
- Connection via pooled endpoint
- Drizzle migrations, checked into repo

### File storage
- **Cloudflare R2** (free tier) for payment proofs, product images, picking sheet PDFs, invoice PDFs

### Job queue & background work
- **Cloudflare Queues** for print jobs, email notifications, QBO sync (when enabled), retries
- **Cloudflare Cron Triggers** for scheduled reports and daily tasks

### Deployment
- **GitHub → Cloudflare** (auto-deploy on push to `main`). Web (`apps/web`) deploys via the **OpenNext Cloudflare adapter** (`@opennextjs/cloudflare`) as a Cloudflare Worker with Workers Static Assets — not the literal "Pages" product, since its Next.js adapter (`@cloudflare/next-on-pages`) is deprecated. Same GitHub-connected auto-deploy on push to `main` and per-PR preview URLs are preserved (via Cloudflare Workers Builds); only the underlying product name changed. *(Amended Phase 1, owner-approved.)*
- **Cloudflare Workers** for API (deployed via `wrangler`)
- Environment variables stored as **Cloudflare secrets**, never in the repo

### Observability
- **Cloudflare Analytics** for basic traffic
- **Structured logging** via Workers logs (JSON format)
- **Error tracking** — Sentry free tier (add when Phase 10 arrives)

### Testing
- **Vitest** for unit tests
- **Playwright** for end-to-end tests (later phases)

---

## 4. Repository Structure (monorepo)

```
ml-trading-ops/
├── CLAUDE.md                    # This file — always read first
├── README.md                    # Human-facing overview
├── .gitignore
├── .env.example                 # Template only — never commit real .env
├── package.json                 # Root workspace config
├── turbo.json                   # Turborepo pipeline
├── tsconfig.base.json
│
├── apps/
│   ├── web/                     # Next.js frontend (all portals)
│   │   ├── app/
│   │   │   ├── (auth)/          # Login, password reset
│   │   │   ├── (reseller)/      # Reseller portal
│   │   │   ├── (admin)/         # Admin portal
│   │   │   ├── (finance)/       # Finance portal
│   │   │   └── (shipping)/      # Shipping portal
│   │   ├── components/
│   │   ├── lib/
│   │   └── public/
│   │       └── brand/           # Logos (light + dark)
│   │
│   └── api/                     # Hono API on Cloudflare Workers
│       ├── src/
│       │   ├── routes/
│       │   ├── middleware/
│       │   ├── services/
│       │   └── index.ts
│       └── wrangler.toml
│
├── packages/
│   ├── db/                      # Drizzle schema + migrations
│   │   ├── schema/
│   │   ├── migrations/
│   │   └── seed/
│   ├── shared/                  # Types, constants, utilities
│   │   ├── types/
│   │   ├── constants/
│   │   └── validators/          # Zod schemas shared web ↔ api
│   └── ui/                      # Shared React components
│
└── docs/
    ├── architecture.md
    ├── api.md
    └── phases/
        ├── phase-01-foundation.md
        ├── phase-02-products.md
        └── ...
```

---

## 5. User Roles & Permissions

Seven roles. All permissions **enforced on the backend** (never frontend-only).

| Role | Scope |
|---|---|
| **Super Admin** (Owner) | Full access. User/role management, system settings, all portals, all data. Cannot be deleted. |
| **Finance Manager** | Full Finance portal. Can approve edge cases, override with reason. Views Finance reports. |
| **Finance Team** | Payment review queue, cash confirmation. Cannot approve overrides. |
| **Shipping Manager** | Full Shipping portal. Manages courier setup, printer config, resolves shipping issues. |
| **Shipping Team** | Ready-to-pack and packed queues, tracking entry. Cannot change courier config or reprint audit. |
| **Reseller** | Own orders, own payments, own reports, own profile. Never sees other resellers' data. |
| **Admin / Support** | Order and customer management as configured by Super Admin. Cannot override Finance or Shipping unless granted. |

Permissions model: **Role-Based Access Control with per-permission overrides** (RBAC + fine-grained flags). Each user has a role + optional permission overrides map. Backend middleware checks `user.permissions.canDo(action, resource)` on every protected endpoint.

**Implementation shape (Phase 1, owner-approved):** a `permissions` table holds each role's default grants as (resource, action) pairs; a `user_permissions` table holds per-user overrides as (resource, action, granted) rows, where `granted` may be `true` (explicit grant beyond the role default) or `false` (explicit deny, even if the role would otherwise allow it). An override always wins over the role default. `resource`/`action` are plain text columns, not fixed Postgres enums, so later phases can introduce new resources without a migration.

**Users list pagination:** `GET /users` is unpaginated in Phase 1 (Super Admin only, small user count). Server-side pagination is added when the Admin Portal's broader list-page pattern is built in Phase 4.

---

## 6. Portals & Modules

### A. Reseller Portal
- Login, profile, password change
- Product catalog with search, filters (category, in-stock), sort
- Cart / order builder
- Direct customer order option (reseller places on behalf of end customer)
- Reseller self-order option
- Payment method selection + payment proof upload
- Order submission → confirmation screen
- Order history + status tracking + courier/tracking visibility
- Downloadable order summary (PDF)
- My Reports (weekly/monthly/custom): orders, payments, balances, shipping status
- **PWA installable** — works like a mobile app

### B. Admin Portal
- Dashboard (KPIs, recent orders, alerts)
- All Orders center (filter, search, bulk actions)
- Order detail view (full edit with audit protection on historical fields)
- Finance overview (link to Finance portal)
- Shipping overview (link to Shipping portal)
- Product Management (catalog, categories, discount-tier assignment, "exclude from discount" flag)
- Discount Tier Management (create/edit tiers, assign users to tiers)
- User Management (create, edit, deactivate; role + permission overrides)
- Reports Centre (all reports, filter presets, exports: CSV, XLSX, PDF)
- Audit Log (filter, search, detail view, export)
- Settings (business info, brand, couriers, payment methods, printer config, notification settings)
- System Health (DB status, queue depth, recent errors)

### C. Finance Portal
- Payment Review queue (claimed vs verified amount, proof viewer)
- Cash Confirmation queue
- Partial Payment handling with balance calculation
- Approve → Release to Shipping
- Hold / Issue orders with reason
- Finance notes per order
- Finance audit trail
- Finance reports

**Guardrail:** Finance cannot release an order to shipping unless one of: (a) verified full payment, (b) approved cash confirmation, (c) explicit manager override with reason logged.

### D. Shipping Portal
- Ready-to-pack queue (auto-populated when Finance releases)
- Packed queue
- Dispatched queue
- Delivered / Collected / Completed queue
- Issue / Hold queue
- Picking sheet view + reprint
- Courier selection + tracking number entry
- Dispatch confirmation
- Delivery / collection completion
- Shipping notes + audit trail

---

## 7. Product Model

Fields (aligned with existing product data):

| Field | Type | Notes |
|---|---|---|
| `product_code` | string, unique | e.g. `RTP40`, `RT05`, `BP05` |
| `product_name` | string | Display name |
| `category` | FK → categories | 14 initial categories |
| `qbo_item_name` | string | For future QBO sync (matches product_code by default) |
| `qbo_category_path` | string | For future QBO sync |
| `retail_price` | decimal(10,2) | GBP, list price |
| `reseller_price` | decimal(10,2) | Legacy field, kept for reference during transition; tier system supersedes it |
| `cost_per_unit` | decimal(10,2) | Internal cost for margin reports (not visible to resellers) |
| `status` | enum: `available`, `inactive`, `out_of_stock` | Only `available` shows to resellers |
| `is_research_use_only` | boolean, default `true` | Legal flag |
| `exclude_from_discount` | boolean, default `false` | If true, discount tiers do NOT apply |
| `image_url` | string, nullable | Optional product image |
| `notes` | text, nullable | Internal admin notes |
| `created_at`, `updated_at` | timestamps | |

**Historical integrity:** When a product price or name changes, existing orders retain a **snapshot** of the product data at the moment the order was placed (order_items table stores `product_code`, `product_name_snapshot`, `unit_price_snapshot`, `discount_applied_snapshot`). Editing a product never mutates historical order data.

### Initial categories (from existing catalog)
Cognitive / Mood · GHK-CU · Growth Hormones & Secretagogues · Healing & Recovery · Longevity / Metabolic · MOTS-C · NAD+ · Nasals · Pens · Retatrutide · Tablets / Capsules · Tanning & Libido · Tirzepatide · Water 10ml

---

## 8. Discount Tier System

- Admin creates **Discount Tiers**: name + discount percentage (e.g. Tier 1 = 5%, Tier 2 = 10%, Tier 3 = 15%, Tier 4 = 20%). Unlimited tiers.
- Each user (reseller or customer) is assigned to **one tier** (or no tier).
- On order calculation:
  - For each line: if `product.exclude_from_discount == false`, apply `user.tier.discount_pct`; else use `product.retail_price` unchanged.
  - `line_total = unit_price × (1 - discount_pct) × quantity`
- Admin can also apply a **manual per-order override discount** with reason (logged in audit).
- Future extension slot: **per-product tier overrides** (Tier 2 gets 15% on Product X specifically). Schema should support this without a rebuild — add `product_tier_overrides` table but leave empty for now.

---

## 9. Order Workflow (state machine)

```
DRAFT
  → SUBMITTED           (reseller/admin submits)
    → PAYMENT_REVIEW    (auto — awaiting Finance)
      → PAYMENT_HOLD    (Finance flags issue)
      → PAYMENT_VERIFIED (Finance confirms full/partial/cash)
        → READY_TO_SHIP  (Finance releases; picking sheet auto-prints)
          → PACKED       (Shipping packs)
            → DISPATCHED (Shipping adds courier + tracking)
              → DELIVERED / COLLECTED / COMPLETED
                → QBO_QUEUED (auto-queued for accounting)
                  → QBO_RECORDED (Accounting marks recorded)
                  → QBO_MANUAL  (Accounting handles outside QBO)
      → CANCELLED (allowed only in PAYMENT_REVIEW / PAYMENT_HOLD by Finance Manager+ with reason)
```

Every state transition:
1. Requires a permission check
2. Writes an audit log entry (actor, timestamp, old_state, new_state, reason if provided)
3. Fires a domain event (for queue jobs: print, notify, sync)

---

## 10. Payment Logic

Payment methods supported (toggleable per business):
- Cash
- Bank Transfer
- Digital Wallet (generic — placeholder for any wallet, admin names it)
- Stripe (card) — build the integration, disable until API keys added
- Extendable (plugin-style so more can be added)

Per-order payment record captures:
- `claimed_amount` (what the buyer says they paid)
- `verified_amount` (what Finance confirms)
- `method`
- `proof_url` (uploaded document/screenshot, if applicable)
- `reference` (bank ref, wallet txn ID, etc.)
- `status`: `pending`, `partial`, `full`, `held`, `refunded`
- `balance_due` (auto-calculated)

**Guardrail rules Finance UI must enforce:**
- Cannot mark `verified_amount > claimed_amount` without Finance Manager approval
- Cannot release to shipping if `verified_amount < order_total` without Finance Manager override + reason
- Cash confirmations require Finance Manager approval
- Every override writes to audit log with reason

---

## 11. Shipping & Printing

### Couriers (pre-loaded, toggleable in Settings)
Royal Mail · DHL · Evri · DPD · Parcelforce · UPS · Personal Delivery · Customer Pickup · Other (free-text)

### Automatic printing on Release-to-Shipping
- When Finance releases an order → picking sheet PDF generated → sent to configured warehouse printer via **PrintNode API** (Phase 6+ integration; degrades gracefully if not configured)
- **Duplicate print prevention:** each (order_id, print_type) pair can only print once automatically. Manual reprint requires Shipping Manager+ role and writes to audit log.
- **Print failures do NOT block the workflow.** If PrintNode fails, the order still enters `READY_TO_SHIP`; the print job is queued for retry (Cloudflare Queues, 3 retries with exponential backoff) and the UI shows a red "Print failed — reprint" badge.
- **Print job history:** every print attempt (success or fail) logged with timestamp, printer, user, and result.

### Picking sheet format
- A5 half-page layout by default (fits most warehouse thermal printers)
- Shows: order ID, reseller/customer, date, items (code + name + qty), shipping address, courier, notes
- ML Trading logo top-left
- "Research Use Only" disclaimer footer

---

## 12. Reports Centre

All admin reports listed in blueprint Section 8. Must support:
- Date range filters + presets (Today, This Week, This Month, This Quarter, Last Month, Custom)
- Multi-select filters (reseller, product, category, courier, payment status, shipping status)
- Search by order ID, customer, reseller, tracking number, reference
- Sortable columns
- Pagination (server-side, 50 rows default)
- **Exports:** CSV, XLSX, PDF (printable)
- **Export menu is a single dropdown**, not multiple buttons

Reports are computed **on-demand from live data** (no pre-aggregation initially). If specific reports become slow (>2 seconds), add a materialized view or scheduled cache. Do not prematurely optimize.

---

## 13. Audit Log

Every write to a protected resource creates an audit entry.

Schema:
- `id` (uuid)
- `timestamp` (utc)
- `actor_user_id`, `actor_role`, `actor_email` (denormalized for historical accuracy)
- `action` (enum: `login`, `logout`, `create`, `update`, `delete`, `state_change`, `override`, `print`, `export`, `permission_change`, etc.)
- `resource_type` (`order`, `product`, `user`, `payment`, `shipment`, etc.)
- `resource_id`
- `old_value` (jsonb, snapshot of relevant fields before)
- `new_value` (jsonb, snapshot of relevant fields after)
- `reason` (text, required for overrides and cancellations)
- `ip_address`, `user_agent`
- `related_module` (`finance`, `shipping`, `admin`, `reseller`, `system`)

Audit log is **append-only**. No delete endpoint. Search, filter, and export in Admin portal.

---

## 14. Authentication & Security

### Authentication
- Email + password login
- Passwords hashed with **bcrypt** (cost factor 12) or Argon2id
- **Password rule (Phase 1, owner-approved):** minimum 10 characters, at least one letter and one digit. No forced composition rules beyond that (NIST 800-63B favors length over composition complexity).
- **Chosen for Phase 1:** Argon2id via `hash-wasm` (bcrypt's native bindings don't work in the Workers V8 isolate runtime). Parameters are tuned to fit the Workers Free plan's 10ms CPU budget — see the `SECURITY-TODO` comment in `packages/shared/src/crypto/password.ts` and `docs/phases/phase-01-report.md` for the exact values and the measurement caveat.
- **JWT sessions** (short-lived access token 15min + refresh token 7 days, rotated on refresh)
- Refresh tokens stored **hashed** in DB, with device/session tracking
- Password reset flow: email a signed one-time token (15-min expiry), single use
- **Self-service password change** (`POST /auth/change-password`, authenticated) is part of the standard auth surface alongside the reset flow — required by the Admin/Reseller "My Profile: change password" deliverable.
- **Rate limiting** on login (5 attempts / 15 min per IP + per email; lockout after)
- Login history recorded (last 20 sessions per user, visible to Super Admin)
- **2FA (TOTP)** — build the schema and flow, disable by default. Enable in Phase 10.

### Backend security
- Every endpoint requires auth unless explicitly public
- Every write endpoint validates input with Zod
- Role + permission check on every protected endpoint via middleware
- SQL injection: not possible via Drizzle ORM parameterized queries
- CSRF: JWT in `Authorization` header, no cookie-based auth → CSRF-safe
- CORS: locked to production origin only
- File uploads: type check + size limit (10MB) + malware scan (add in Phase 10)
- **Never** log passwords, JWT payloads, or full DB rows containing PII in production logs

### Secrets
- **All secrets** (DB URL, JWT signing key, Stripe key, PrintNode key, etc.) live in **Cloudflare Workers secrets** and Cloudflare Pages env vars
- `.env.example` in repo lists names only, never values
- `.env` is in `.gitignore`
- Rotate JWT signing key on any suspected compromise

---

## 15. UI / UX Standards

### Design language
- **Benchmarks:** QuickBooks Online · Xero · Shopify Admin · ShipStation · Linear
- Clean, professional, business-grade
- **Not** flashy, gamified, or AI-dashboard-looking

### Layout
- Left sidebar navigation (collapsible on mobile)
- Top bar: business logo, portal switcher (for users with multi-portal access), user menu, notifications bell
- Main content area with breadcrumbs
- Consistent page structure: title + action bar + filters + content + pagination

### Components
- Tables: sticky headers, sticky action column on wide tables, responsive card layout on mobile
- Filter bar: chips + dropdowns + search, "Clear all" link
- Summary cards / KPI chips at top of list pages
- Status badges with consistent colors (see palette below)
- Actions menu (kebab / three-dot) for row-level actions — not multiple buttons per row
- Confirmations for destructive/irreversible actions (dialog with typed confirmation for high-risk actions)

### Color palette
- **Primary:** ML Trading navy `#0B2545` (from logo background)
- **Accent:** subtle blue-gray for secondary actions
- **Success:** `#16A34A` · **Warning:** `#F59E0B` · **Danger:** `#DC2626` · **Info:** `#2563EB`
- **Neutral text:** `#0F172A` on `#FFFFFF` background (light mode)
- **Dark mode** supported end-to-end from day 1

### Typography
- **Inter** as the primary font (system font stack fallback)
- Sizes: 12/14/16/20/24/32 px scale, generous line-height

### Brand assets
- Logo files live in `apps/web/public/brand/`
- `logo-dark.svg` (for light backgrounds — dark navy text version) — needs to be produced from the source PNG
- `logo-light.svg` (original white-on-navy for dark backgrounds)
- `icon-1024.png` (favicon, PWA icon)
- Login screen uses full logo on a subtle brand gradient

### States
- Loading skeletons (not spinners) for lists and cards
- Empty states with illustration + helpful action
- Error states with plain-English messages: "What went wrong. What to do next."
- Success toasts, dismissible

### Mobile
- All portals mobile-responsive
- Reseller portal is **mobile-first PWA**
- Shipping portal usable on a warehouse tablet

### Accessibility
- WCAG AA color contrast
- Keyboard navigation on all interactive elements
- Focus rings visible
- Semantic HTML + ARIA where needed

---

### 15.1 Mobile-First & PWA Standards

The system is delivered as ONE Progressive Web App at ml-trading-ops.pages.dev covering all four portals. Users install once; after login they land in the portal(s) their role grants them. Super Admin can switch portals via a top-bar switcher.

Design principle per portal:

- Reseller portal: MOBILE-FIRST. Design phone-first, then progressively enhance for desktop. Style benchmark: Shopify-style storefront browsing — clean product cards, image-forward, cart drawer, sticky action buttons. Simplicity over cleverness. The target user is a non-technical person placing orders quickly on their phone. No complex interactions, no hidden gestures beyond standard tap and swipe-to-close-sheet.
- Shipping portal: MOBILE-FIRST for warehouse staff on phones/tablets. Big touch targets (min 44px), one-tap primary actions, bottom action sheets for tracking entry, scrollable card queues. Desktop view for shipping managers gives denser table layouts.
- Finance portal: ADAPTIVE. Approval queue works as swipeable/tappable cards on mobile with one-tap approve/hold and full-screen payment proof viewer. Desktop shows side-by-side proof + form layouts for deeper review sessions.
- Admin portal: DESKTOP-FIRST but fully mobile-capable. Dense tables and multi-column dashboards on desktop; on mobile, tables collapse to cards, dashboards stack, actions move into bottom sheets.

Adaptive component rules (apply everywhere):

- Tables on desktop become cards on mobile. Never horizontal-scroll a wide table on a phone.
- Dropdowns and select menus become bottom sheets on mobile.
- Modals become full-screen sheets on mobile (dismiss by swipe-down or explicit close).
- Navigation: sidebar on desktop, bottom tab bar on mobile for user-facing portals (Reseller, Shipping, Finance). Admin gets a hamburger + drawer on mobile since it has more sections than fit in a tab bar.
- Sticky bottom action buttons on mobile for primary actions (Place Order, Confirm Dispatch, Approve Payment).
- Loading skeletons match the target layout — do not show a desktop-shaped skeleton on a phone.

PWA requirements:

- Single manifest.json at the root serving the "MLT Ops" installable app.
- Optional second manifest served conditionally at /ship path so Shipping staff can install a dedicated "MLT Shipping" icon on warehouse tablets — same codebase, separate PWA identity. Build the plumbing; do not require its use.
- Service worker with offline shell (login screen and static assets cacheable; API calls network-first).
- Install prompt shown contextually — after successful login, on second visit, dismissible and remembered.
- iOS-compatible install (Safari): correct apple-touch-icon, splash screens, status bar theming.
- Push notifications: schema-ready but disabled by default. Enable in Phase 9.

Reseller portal specific UX (Shopify-simple style):

- Home: greeting, "Reorder from history" quick tiles, category chips, featured/new products.
- Catalog: category tabs at top, product cards in a 2-column grid on mobile, filter/search icon in top bar, "Add" button on each card (one tap adds default quantity, tap the quantity to adjust).
- Product detail: full-screen sheet with image, description, price after discount clearly shown, quantity stepper, sticky "Add to Cart" at bottom.
- Cart: full-screen on mobile, itemized list, edit quantity inline, sticky total + "Place Order" button at bottom.
- Checkout: simple stepper — Delivery address → Payment method + proof upload → Review → Submit.
- Order history: scrollable list of order cards with clear status badges, tap to expand for details and tracking.
- No infinite dropdowns, no nested modals, no hidden features. Every action must be reachable in at most two taps from a portal's home screen.

---

## 16. Development Phases

Each phase produces a **working, deployed, testable slice**. Owner tests → approves or requests changes → next phase begins.

| # | Phase | Deliverables |
|---|---|---|
| 1 | **Foundation** | Repo scaffolding, DB schema, migrations, auth (login/logout/reset), JWT + refresh, user/role management with RBAC, Super Admin seeded, base UI shell (login, sidebar, top bar, portal switcher, dark mode), deploys live |
| 2 | **Product Management** | Product CRUD, categories, discount tiers, per-user tier assignment, exclude-from-discount flag, product import CSV, 70-product seed |
| 3 | **Reseller Portal** | Catalog browsing, cart, order builder, direct-customer vs self-order, payment proof upload, order submission, order history, status tracking. Mobile-first PWA with Shopify-style simple UX, bottom tab nav, install prompt, offline shell for login screen and static assets. |
| 4 | **Admin Portal** | Dashboard KPIs, All Orders list + filters + bulk actions, order detail view + edit with audit protection, user management UI |
| 5 | **Finance Portal** | Payment review queue, cash confirmation, partial payment handling, balance calc, hold/approve/release, override rules, finance audit trail. Mobile-adaptive approval queue with swipeable cards and full-screen proof viewer; installable PWA identity. |
| 6 | **Shipping Portal + Printing** | Ready-to-pack, packed, dispatched, delivered queues; picking sheet generation; PrintNode integration (disabled until keys added); reprint audit; courier + tracking entry. Mobile/tablet-first warehouse UX with big touch targets and bottom action sheets; optional separate PWA install path at /ship for a dedicated 'MLT Shipping' home-screen icon. |
| 7 | **Reports Centre** | All admin reports; filter presets; CSV/XLSX/PDF exports; reseller reports section |
| 8 | **Audit Log** | Full audit trail viewer, filter, search, export, detail modal |
| 9 | **Integrations scaffolding** | Stripe payment integration (disabled), QBO sync queue (disabled), email notifications (SendGrid or Resend), Cloudflare Queues wiring |
| 10 | **Polish & Hardening** | 2FA, Sentry error tracking, performance passes, security audit, load test, full documentation, backup/restore runbook |

**Rule:** Do not proceed to Phase N+1 without owner approval on Phase N.

---

## 17. Deployment & DevOps

### Environments
- **Production:** *(URL pending — see note below)* served by a Cloudflare Worker via the OpenNext adapter (see Section 3) + API on Cloudflare Workers, DB = Neon `production` branch
- **Preview:** every GitHub PR gets a preview deployment automatically
- **Local dev:** `pnpm dev` runs web + api locally, connects to a Neon `dev` branch
- **Production URL note (Phase 1, owner-approved):** since `apps/web` no longer deploys to the literal Cloudflare Pages product, it will not get a `*.pages.dev` URL. It gets a free `*.workers.dev` URL instead, exact value known only after the first live deploy. All "ml-trading-ops.pages.dev" references elsewhere in this file (Section 1, Section 19, Rule 9) will be updated to the real URL once it's confirmed — do not treat them as accurate until that update lands. Custom domain to be added post-Phase-1 once the owner selects a domain name for ML Trading International Ltd (likely a UK-focused `.co.uk` domain). Migration path: add custom domain in Cloudflare, no code changes required.

### Branching
- `main` = production. Every push auto-deploys.
- Feature work on branches, merged via PR (Claude Code creates PRs; owner or Claude Code merges after checks pass).
- Every commit message clear and conventional (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`).

### Migrations
- Drizzle migrations in `packages/db/migrations/`
- Every schema change generates a migration file, committed to repo
- Migrations run automatically on API deploy via a startup job

### Backups
- Neon: daily automatic backups (free tier — 7 days). Weekly manual export dump committed to a private backup bucket in Phase 10.

### CI (GitHub Actions)
- Typecheck, lint, test on every PR
- Block merge on failures

---

## 18. Rules for Claude Code

**Read these rules at the start of every session. Do not skip.**

1. **Read this file first.** Every session. Even if you think you remember. The owner may have updated it.
2. **Never invent business rules.** If a rule is not in this file or has not been agreed with the owner, ask before implementing.
3. **Never break historical data.** Editing products, prices, tiers, or user assignments must never mutate existing orders' snapshot data.
4. **Never expose secrets.** No secrets in repo, no secrets in logs, no secrets in error messages returned to the client.
5. **Never skip auth or permission checks.** Every write endpoint has middleware. No exceptions.
6. **Never delete data destructively.** Prefer soft-delete (`deleted_at` timestamp). Audit log entries are append-only.
7. **Always write migrations.** Any schema change ships with a migration file in the same commit.
8. **Always write tests for business logic.** Payment calculations, discount application, order state transitions must have unit tests.
9. **Always deploy before saying "done".** A phase is not complete until it is live at `ml-trading-ops.pages.dev` and the owner can test it.
10. **Always update this CLAUDE.md** when a decision or rule changes. This file is the source of truth.
11. **Match the UI standards** in Section 15. Do not invent visual patterns. Follow the benchmark aesthetic.
12. **Ask before large refactors.** Small refactors within a phase are fine. Cross-phase refactors need owner approval.
13. **Prefer boring, proven solutions.** No exotic libraries. Stick to the stack in Section 3.
14. **Never claim "impossible to hack" or "100% secure".** Use accurate security language.
15. **Never touch the old SARMS system.** It runs in parallel and is out of scope.
16. **Every user-facing page must be designed mobile-first** with a real mobile experience (bottom nav, cards, sheets, sticky action buttons), then progressively enhanced for desktop. Never build a desktop-only layout and shrink it for mobile. The Reseller portal in particular must feel Shopify-simple: clean, image-forward, one-tap actions, no hidden complexity. Non-technical users are the target.

### Communication protocol with the owner
- When a phase is done, write a short summary in `docs/phases/phase-NN-report.md`: what was built, what to test, known limitations, next-phase preview.
- If blocked, ask **one clear question** rather than assuming.
- If a decision is reversible and small, decide and note it. If irreversible or large, ask first.
- Owner tests on live URL and replies "approved, next" or specific change list.

---

## 19. Success Criteria (per-phase gates)

A phase is **not** done unless every item is true:

- ✅ Code merged to `main` and deployed to `ml-trading-ops.pages.dev`
- ✅ All migrations applied to production Neon DB
- ✅ Zero TypeScript errors, zero lint errors
- ✅ Business logic unit tests pass
- ✅ Manually tested on desktop Chrome + mobile Safari
- ✅ No secrets in repo
- ✅ Audit log entries created for every write action in the phase's scope
- ✅ Phase report written in `docs/phases/`
- ✅ Owner has tested and given explicit "approved, next"

---

## 20. Credentials Checklist (owner-provided, one-time)

Stored as Cloudflare secrets, never in repo. Names only shown here.

| Secret name | Purpose | Required by phase |
|---|---|---|
| `DATABASE_URL` | Neon Postgres connection (pooled) | 1 |
| `JWT_SIGNING_KEY` | Access token signing (random 32-byte key, Claude Code generates) | 1 |
| `JWT_REFRESH_KEY` | Refresh token signing (random 32-byte key, Claude Code generates) | 1 |
| `RESEND_API_KEY` | Email delivery (or SendGrid) | 1 (password reset) — owner creates free Resend account |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET` | File storage | 3 (payment proof upload) |
| `PRINTNODE_API_KEY` | Warehouse printing | 6 (can be blank; integration degrades gracefully) |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Card payments | 9 (can be blank; feature disabled) |
| `QBO_CLIENT_ID`, `QBO_CLIENT_SECRET`, `QBO_REFRESH_TOKEN` | QuickBooks Online sync | 9 (can be blank; feature disabled) |
| `SENTRY_DSN` | Error tracking | 10 |

---

## 21. Non-Goals (explicitly out of scope for now)

- Multi-company / multi-tenant SaaS mode (design allows for it later; not built now)
- Public-facing e-commerce store (this is B2B / reseller-only)
- Warehouse inventory management / stock counts (only "available / out-of-stock" toggle initially)
- Loyalty points / referral programs
- Chat / messaging inside the portal
- Mobile native apps (PWA is the mobile solution)
- Any medical, health, or dosing content

---

## 22. Contact & Ownership

- **Owner:** Muhammad Daood, `daoodtaxexpertllc@gmail.com`
- **Business:** ML Trading International Ltd, UK
- **Timezone for approvals:** Owner is in Lahore (UTC+5); business timezone is UK (UTC+0/+1). Communication in English.

---

*End of CLAUDE.md — this document is the single source of truth. Any conflict between this file and other instructions is resolved in this file's favor unless the owner explicitly updates it.*
