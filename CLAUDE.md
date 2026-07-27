# CLAUDE.md — ML Trading Business Ops

**This is the master context document for the ML Trading Business Ops project.**
**Every Claude Code session must read this file first before doing any work.**

---

## 1. Project Identity

- **Project name:** ML Trading Business Ops
- **Short name:** MLT Ops
- **Business owner:** ML Trading International Ltd (UK-registered)
- **System owner / Super Admin:** Muhammad Daood — `daoodtaxexpertllc@gmail.com`
- **Production URL:** *(not yet deployed — pending owner-approved merge of `phase-1/foundation` to `main`)*. Will be `https://ml-trading-ops-api.business-portal.workers.dev` for the API once merged. The web worker's URL is not yet known — `apps/web` is still a stub (Stage E not started).
- **Live preview URL (current, Phase 1 canary — verified 12/07/2026):** API — `https://ml-trading-ops-api-preview.business-portal.workers.dev`. See Section 17 for the full preview/production naming convention.
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

## 15. Design System (Locked, applies to every page)

This section is the single source of truth for visual design across MLT Ops. Every page, every component, every state must follow these rules. Deviations require explicit owner approval and a CLAUDE.md update.

### 15.1 Design philosophy

**Aesthetic:** Precise, industrial, premium. Trustworthy without being cold. Modern without being trendy. Serious without being boring.

**Benchmarks (references, not templates to copy):** Stripe Dashboard, Linear, Vercel, Shopify Admin, Notion. Study them for restraint, hierarchy, and refinement — not for direct visual copying.

**Anti-patterns to avoid at all times:**
- Cartoony status pills (bright candy colors, huge rounded rectangles)
- Generic Bootstrap-era shadows (blur too high, opacity too heavy)
- AI-generated hero illustrations (fake people, generic isometric shapes)
- Overuse of gradients (one hero gradient per page maximum)
- Emojis in UI (unless a user explicitly typed one)
- Bouncy animations or elastic transitions
- Multiple accent colors (one accent only, everywhere)
- Flat single-color backgrounds without depth or texture

### 15.2 Color system

All colors defined as CSS custom properties (design tokens). Component code must reference tokens, never hex values directly.

**Brand core:**
```
--brand-navy-950:   #0A1628   /* Deepest navy — auth left panel, sidebar */
--brand-navy-900:   #101E36   /* Deep navy — hover states on dark surfaces */
--brand-navy-800:   #152845   /* Elevated dark — top of dark gradients */
--brand-navy-700:   #1E3357   /* Mid dark — dark mode card surfaces */
--brand-navy-500:   #3A4551   /* Original locked navy — kept for continuity */
```

**Brand accent (single accent color, used everywhere for CTAs, links, focus):**
```
--accent-500:       #3E7BFA   /* Primary — CTA buttons, links, focus rings */
--accent-600:       #2563EB   /* Hover state on primary CTAs */
--accent-400:       #6996FB   /* Muted uses on dark backgrounds */
--accent-50:        #EEF3FF   /* Very light — subtle accent backgrounds */
```

**Surface colors:**
```
--surface-canvas:   #FAFBFC   /* Warm off-white — main background, NEVER pure white */
--surface-card:     #FFFFFF   /* Pure white — cards, elevated surfaces */
--surface-muted:    #F1F5F9   /* Very light slate — inset backgrounds, disabled */
--surface-hover:    #F8FAFC   /* Row hover in tables */
```

**Text (light mode):**
```
--text-primary:     #0A1628   /* Headings, body text */
--text-secondary:   #5A6478   /* Labels, helper text, meta */
--text-tertiary:    #94A3B8   /* Disabled, timestamps, low emphasis */
--text-inverse:     #FFFFFF   /* Text on dark surfaces */
```

**Text (dark mode):**
```
--text-primary-dark:    #F1F5F9
--text-secondary-dark:  #94A3B8
--text-tertiary-dark:   #64748B
```

**Borders:**
```
--border-subtle:    #F1F5F9   /* Card internal dividers, barely visible */
--border-default:   #E5E7EB   /* Input fields, standard dividers */
--border-strong:    #CBD5E1   /* Emphasized borders, table headers */
--border-dark:      #2A3B57   /* Dark mode borders */
```

**Semantic colors (business status — refined, not cartoony):**
```
--success-500:      #10B981   /* Emerald, finance-appropriate */
--success-100:      #D1FAE5   /* Badge background */
--success-700:      #047857   /* Badge text */

--warning-500:      #F59E0B   /* Amber */
--warning-100:      #FEF3C7
--warning-700:      #B45309

--danger-500:       #EF4444   /* Red */
--danger-100:       #FEE2E2
--danger-700:       #B91C1C

--info-500:         #3E7BFA   /* Same as accent — info = brand accent */
--info-100:         #DBEAFE
--info-700:         #1E40AF
```

### 15.3 Typography

**Font family:** Inter (400, 500, 600, 700 weights), loaded via `next/font` with `display: swap`. Numeric variant `tabular-nums` on all money/date/count displays.

**Scale:**
```
--text-display:     32px / weight 700 / letter-spacing -0.03em / line-height 1.1
--text-h1:          28px / weight 600 / letter-spacing -0.02em / line-height 1.2
--text-h2:          24px / weight 600 / letter-spacing -0.02em / line-height 1.25
--text-h3:          18px / weight 600 / letter-spacing -0.01em / line-height 1.35
--text-body-lg:     16px / weight 400 / line-height 1.55
--text-body:        15px / weight 400 / line-height 1.5
--text-body-sm:     14px / weight 400 / line-height 1.5
--text-label:       13px / weight 500 / letter-spacing +0.02em / line-height 1.4
--text-eyebrow:     12px / weight 600 / letter-spacing +0.08em / text-transform uppercase
--text-micro:       12px / weight 500 / line-height 1.4
```

**Usage:**
- `display` — landing/marketing hero titles only
- `h1` — page titles
- `h2` — major section titles
- `h3` — card titles, subsections
- `body-lg` — welcoming intro text on auth pages
- `body` — default body text everywhere
- `body-sm` — dense tables, dense lists
- `label` — form labels, table column headers
- `eyebrow` — section markers ("ACCESS PORTALS", "ACCOUNT DETAILS")
- `micro` — timestamps, help text, small metadata

### 15.4 Spacing system

Base unit: 4px. All spacing multiples of 4.
```
--space-1:  4px    --space-2:  8px    --space-3:  12px   --space-4:  16px
--space-5:  20px   --space-6:  24px   --space-8:  32px   --space-10: 40px
--space-12: 48px   --space-16: 64px   --space-20: 80px   --space-24: 96px
```

**Rules:**
- Card internal padding: `space-6` (24px) desktop, `space-5` (20px) mobile
- Gap between cards in a grid: `space-5` (20px)
- Page horizontal padding: `space-6` (24px) mobile, `space-8` (32px) tablet, `space-10` (40px) desktop
- Form field vertical spacing: `space-5` (20px) between fields
- Icon-to-text spacing in buttons/badges: `space-2` (8px)

### 15.5 Radius, shadows, and depth

**Border radius:**
```
--radius-sm:  6px    /* Buttons, badges, inputs */
--radius-md:  8px    /* Small cards */
--radius-lg:  12px   /* Standard cards */
--radius-xl:  16px   /* Feature cards, modals */
--radius-full: 999px /* Pills, avatars */
```

**Shadows (layered for depth, subtle for premium feel):**
```
--shadow-xs:  0 1px 2px rgba(10, 22, 40, 0.04);
--shadow-sm:  0 1px 2px rgba(10, 22, 40, 0.04), 0 2px 4px rgba(10, 22, 40, 0.04);
--shadow-md:  0 1px 2px rgba(10, 22, 40, 0.04), 0 8px 24px rgba(10, 22, 40, 0.06);
--shadow-lg:  0 4px 6px rgba(10, 22, 40, 0.05), 0 20px 40px rgba(10, 22, 40, 0.10);
--shadow-focus: 0 0 0 3px rgba(62, 123, 250, 0.15);
```

**Usage:**
- `xs` — subtle input elevation
- `sm` — dropdown items, small popovers
- `md` — standard cards
- `lg` — modals, elevated feature cards
- `focus` — focus rings on inputs, focused cards

### 15.6 Motion

```
--ease-out:      cubic-bezier(0.4, 0, 0.2, 1)
--ease-in-out:   cubic-bezier(0.4, 0, 0.6, 1)
--duration-fast: 150ms
--duration-base: 200ms
--duration-slow: 300ms
```

**Rules:**
- Hover transitions: `150ms ease-out`
- Menu/drawer open/close: `200ms ease-out`
- Modal enter: `200ms ease-out`
- Page transitions: `300ms ease-out` (rare, use sparingly)
- **Never** use spring physics, bouncing, or elastic curves
- **Never** animate the whole page on route change

### 15.7 Iconography

**Library:** Lucide React (already installed via shadcn/ui).

**Sizes:**
- 14px — inline within text, in badges
- 16px — inside buttons, table row actions
- 18px — form field icons (leading icons)
- 20px — sidebar navigation icons
- 24px — page headers, empty state top icons
- 32px+ — hero decorative icons only

**Style rules:**
- Monoline (single-weight outline) only
- Stroke width: 1.5 (Lucide's default is 2, override to 1.5 for refinement)
- No filled icons except in tightly controlled cases (checkmarks in success states)
- Color: inherits from text color; accent color for interactive elements

### 15.8 Illustrations

**Philosophy:** Used **sparingly** for meaningful moments. Empty states, auth hero, onboarding milestones, error pages. Never decoration for the sake of decoration.

**Style:**
- Monoline, matches iconography stroke weight (1.5px)
- Duotone maximum — one primary color (accent blue or dark navy) + one supporting color at reduced opacity
- Custom-made in SVG, hand-crafted, not stock/AI-generated
- Abstract or geometric metaphors preferred over literal illustrations
- Example for MLT Ops auth page: a stylized geometric composition of an isometric building/warehouse structure with subtle abstract elements suggesting logistics, roughly 200-300px wide, 40-50% opacity, sitting behind or beside the brand statement

**Never:**
- Cartoon characters
- Stock illustrations from unDraw, Storyset, etc. (recognizable style) — **unless owner-approved per-instance, see exception below**
- Illustrations with human figures (dating problem — always look off after a year)
- Emoji as illustration

**Owner-approved exception (Phase 1, 2026-07-27):** the auth-hero illustration (shared across `/login`, `/forgot-password`, `/reset-password` via the `(auth)` route group layout) uses a recolored, animated Storyset/Freepik "free-shipping" SVG export instead of the hand-crafted monoline illustration described above. Recolored to the brand palette (navy `--brand-navy-950` + accent `--accent-500`, with `--accent-400` for one minor detail color); no human figures in the source asset. This is a scoped, explicit deviation for this one illustration, not a reopening of the general rule — new illustrations elsewhere in the product still default to the hand-crafted monoline/duotone style above unless separately approved. Component: `apps/web/components/brand/AuthIllustration.tsx`; animation CSS lives in `apps/web/app/globals.css`.

### 15.9 Component specifications

#### Button

**Variants:**
- **Primary:** `bg: --brand-navy-950`, `color: white`, `hover: --brand-navy-900`
- **Accent:** `bg: --accent-500`, `color: white`, `hover: --accent-600` — used for the single most important CTA per page
- **Secondary:** `bg: transparent`, `border: 1px solid --border-default`, `color: --text-primary`, `hover: bg: --surface-muted`
- **Ghost:** `bg: transparent`, `color: --text-primary`, `hover: bg: --surface-muted`
- **Destructive:** `bg: --danger-500`, `color: white`, `hover: darken 10%`

**Sizes:**
- `sm`: 32px height, 12px horizontal padding, 13px text
- `md` (default): 40px height, 16px horizontal padding, 15px text
- `lg`: 48px height, 20px horizontal padding, 16px text

**Common:**
- Border-radius: `--radius-sm`
- Weight: 500
- Transition: `--duration-fast --ease-out`
- Focus ring: `--shadow-focus`
- Loading state: spinner replaces icon, text stays, button disabled

#### Input

- Height: 44px
- Border: `1px solid --border-default`
- Border-radius: `--radius-sm`
- Padding: `0 14px` (16px if with leading icon add left padding 40px)
- Background: `--surface-card`
- Text size: 15px
- Placeholder color: `--text-tertiary`
- **Focus:** border `--accent-500`, shadow `--shadow-focus`, no color change to background
- **Error:** border `--danger-500`, error text below in 13px `--danger-700`
- **Disabled:** background `--surface-muted`, text `--text-tertiary`, cursor not-allowed

#### Card

- Background: `--surface-card`
- Border: `1px solid --border-subtle`
- Border-radius: `--radius-lg`
- Shadow: `--shadow-md`
- Padding: `--space-6` (24px)
- **Hover (if interactive):** shadow shifts to `--shadow-lg`, transition fast

#### Badge (Status — Alternative E style, LOCKED)

Icon inside badge + text. Refined chip. Not colored dots.

- Structure: `<icon 14px><text 13px weight 500>`
- Padding: `4px 10px`
- Border-radius: `--radius-full`
- Gap between icon and text: 6px
- **Color pairings:**
  - Paid/Success: `bg: --success-100`, `text+icon: --success-700`, icon = `check-circle`
  - Pending: `bg: --warning-100`, `text+icon: --warning-700`, icon = `clock`
  - Shipped: `bg: --info-100`, `text+icon: --info-700`, icon = `truck`
  - Cancelled: `bg: --surface-muted`, `text+icon: --text-secondary`, icon = `x-circle`
  - Refunded: `bg: --surface-muted`, `text+icon: --text-secondary`, icon = `refresh-ccw`
  - Failed/Danger: `bg: --danger-100`, `text+icon: --danger-700`, icon = `alert-circle`

#### Sidebar (Admin/Finance/Shipping portals)

- Width: 240px expanded, 64px collapsed
- Background: `--brand-navy-950` (deepest navy, matches auth left panel)
- Border-right: none (contrast against `--surface-canvas` main area does the separation)
- Text color: `--text-inverse` at 70% opacity
- Active item: full opacity + `--accent-500` left border (3px wide) + slight `--brand-navy-900` background
- Hover: opacity to 90%, subtle background lift
- Logo behavior (Option C, LOCKED):
  - Collapsed: 32px mountain icon only, white version, centered
  - Expanded: full lockup in white, 28px height, positioned in top-left
- Navigation section labels (eyebrows): 12px uppercase, letter-spacing +0.08em, color: white at 40% opacity
- Icons: 20px, monoline, matches text opacity
- User section at bottom: avatar + name + role, small chevron menu

#### Mobile bottom tab bar (Reseller/Shipping/Finance)

- Height: 64px (safe area padding on iOS)
- Background: `--surface-card`
- Border-top: `1px solid --border-subtle`
- 3-5 tabs, evenly spaced
- Active tab: `--accent-500` icon + label, inactive: `--text-tertiary`
- Icons: 22px, monoline
- Label: 11px below icon, weight 500

### 15.10 Auth page layout (Login, Forgot Password, Reset Password) — LOCKED

**Desktop (≥1024px):**
- Two-column split, 45% / 55%
- Left column: 45% width, full height, `--brand-navy-950` background with subtle radial gradient overlay from top-left (slightly warmer `--brand-navy-800` at 40% opacity fading to base)
- Left column content (from top to bottom, vertically centered as a group):
  - ML Trading white logo (full lockup), 40px height, top-left area at 48px from edges
  - Space
  - Brand statement (h2 in white): "Operations that scale."
  - Sub-statement (body-lg, white at 70% opacity): "The complete B2B operations platform for modern distributors."
  - Space
  - Custom monoline duotone illustration (accent blue + white at low opacity), ~280px wide, abstract geometric/architectural
  - Space
  - Footer: "© 2026 ML Trading International Ltd" (micro text, white at 40% opacity), bottom-left at 48px from edges
- Right column: 55% width, `--surface-canvas` background
- Right column content (vertically centered):
  - Card, max-width 420px, centered
  - Card contents:
    - Eyebrow "WELCOME BACK" (or page-specific)
    - H2 title
    - Body-sm subtitle
    - Space (24px)
    - Form fields
    - Space
    - CTA button (primary variant, full-width)
    - Space (12px)
    - Secondary action link (accent color, centered below button)
- No page-level scroll; card content stays within viewport on standard heights

**Mobile (<1024px):**
- Single column, stacked
- Top: dark hero band, `--brand-navy-950`, 240px tall (or 30vh, whichever is smaller)
- Hero band content:
  - Centered logo (white lockup), 32px height
  - Below: brand statement in white h3
  - Sub-statement in body-sm white at 70%
- Below hero: form card
  - Full width minus 20px padding on each side
  - Card floats slightly above the hero-canvas seam (negative top margin -24px, shadow-lg)
  - Same content as desktop card
- No illustration on mobile (space is precious)

**Dark mode:**
- Left panel stays the same (already dark)
- Right panel canvas becomes `--brand-navy-800`, card becomes `--brand-navy-700`
- Text colors invert to dark-mode tokens

### 15.11 Applies to every future page

Every page in every phase (products, orders, dashboards, reports, everything) must be built with:
- Design tokens from this section, never inline hex or magic numbers
- Layout patterns established here (sidebar, tab bar, card grids, form structures)
- Motion tokens for all transitions
- Iconography style and sizes as specified
- Status badges in the Alternative E style
- Typography scale, no invented sizes
- Spacing scale, no invented spacings

**Enforcement:** Claude Code must reference `--token-name` in CSS, not hex values. Any deviation requires a note in the phase report explaining why and either a design-token addition or explicit owner approval.

### 15.12 Reseller portal specific UX (mobile-first, Shopify-simple)

The Reseller portal is the most user-facing and non-technical audience. It must feel Shopify-simple.

**Home:**
- Greeting with reseller name
- "Reorder from history" quick tiles (last 3-5 recent orders)
- Category chips as horizontal scroll
- Featured/new products section
- Sticky bottom tab bar

**Catalog:**
- Category tabs at top (sticky on scroll)
- Product cards in 2-column grid on mobile, 3-4 on tablet, 4-6 on desktop
- Filter/search icon in top bar
- "Add" button on each card (one tap adds default quantity, tap quantity to adjust)
- Card shows: image, name, price after discount, "Add" button

**Product detail:**
- Full-screen sheet on mobile
- Product image, name, category, discount-applied price shown clearly
- Description
- Quantity stepper
- Sticky "Add to Cart" at bottom

**Cart:**
- Full-screen on mobile
- Itemized list with inline quantity edit
- Sticky total + "Place Order" button at bottom

**Checkout:**
- Simple stepper: Delivery address → Payment method + proof upload → Review → Submit
- No hidden features, every action reachable in max two taps from portal home

**Order history:**
- Scrollable list of order cards with clear status badges
- Tap to expand for details, tracking, and downloadable summary

**Reseller portal UX principles:**
- Non-technical users are the target
- Every primary action reachable in ≤2 taps from home
- No nested modals
- No infinite dropdowns
- No hidden features
- Sticky action buttons for primary tasks

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
- **Production:** *(not yet deployed — pending owner-approved merge of `phase-1/foundation` to `main`)*. Once merged, the API deploys as the Worker named `ml-trading-ops-api` at `https://ml-trading-ops-api.business-portal.workers.dev`, via `wrangler deploy --env production` (see `apps/api/wrangler.toml`'s `[env.production]` block). DB = Neon `production` branch.
- **Preview (actual mechanism, corrected from the original assumption below):** the `Deploy` GitHub Actions workflow (`.github/workflows/deploy.yml`) triggers on push to `main` **or** `phase-1/foundation` specifically — it is a branch-based deploy we built ourselves, not a generic per-PR preview mechanism. (The "per-PR preview URLs via Cloudflare Workers Builds" wording elsewhere in this file describes Cloudflare's own Git-integration product, which this repo does not use — flagged here as a known stale reference, not yet corrected there.) Pushing to `phase-1/foundation` deploys the Worker named `ml-trading-ops-api-preview` (the top-level, unprefixed block in `wrangler.toml`) to `https://ml-trading-ops-api-preview.business-portal.workers.dev` — **currently live**, first verified 12/07/2026.
- **Web:** not yet deployed — `apps/web` is still a stub (Stage E not started). No worker name or URL exists yet; this section will be updated once Stage E ships a real deploy.
- **Local dev:** `pnpm dev` runs web + api locally, connects to a Neon `dev` branch
- **Account workers.dev subdomain:** `business-portal` (owner-configured in Cloudflare; confirmed via the live preview URL above).
- **Production URL note (Phase 1, owner-approved):** since `apps/web` no longer deploys to the literal Cloudflare Pages product, it will not get a `*.pages.dev` URL. It gets a free `*.workers.dev` URL instead (naming convention above). Custom domain to be added post-Phase-1 once the owner selects a domain name for ML Trading International Ltd (likely a UK-focused `.co.uk` domain). Migration path: add custom domain in Cloudflare, no code changes required.

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
9. **Always deploy before saying "done".** A phase is not complete until it is live at the production URL (see Section 17) and the owner can test it. During Phase 1, interim testing happens on the preview URL; the final gate is the `main`-merged production URL.
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

- ✅ Code merged to `main` and deployed to production (`https://ml-trading-ops-api.business-portal.workers.dev` — see Section 17). **Interim Phase 1 testing note:** until the owner approves the merge to `main`, verification happens against the live preview URL, `https://ml-trading-ops-api-preview.business-portal.workers.dev` (API only; web not yet deployed).
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

## 23. Long-term Product Roadmap (Post-Phase-10)

After Phase 10 ships and ML Trading is running stably on MLT Ops, the roadmap continues in stages toward a broader B2B distribution platform with integrated financial reporting. Each stage produces something shippable.

### Phase 11 — Financial reporting
Report on operational data already captured:
- P&L (sales, cost of goods, gross profit, operating profit)
- Receivables balance (money customers owe)
- Payables balance (once supplier module exists)
- Cash summary (in vs out by month)
- Not full accounting — pure reporting on ops data. Low risk, high value.

### Phase 12 — Automated invoicing
- Auto-generate customer invoices on order dispatch
- Email invoices via existing email pipeline
- Track paid / partial / overdue states
- Match incoming payments to invoices (reuse Finance portal patterns)

### Phase 13-14 — Accounting-lite
- Simplified chart of accounts (~30 default accounts)
- Journal entries auto-created from operational events
- Bank feed matching (Plaid or similar)
- VAT tracking (not filing — just tracking)
- Simple financial statements
- Export to QBO/Xero for accountant year-end work
- Positioned as "financial tracking" not "accounting software" to manage compliance liability

### Phase 15+ — Multi-tenant SaaS conversion
- Only after accounting-lite is stable and used in production for 3 months
- Add tenant_id to schema, tenant-scoped queries, per-tenant branding
- Onboard second and third customers
- Target market: UK B2B distributors with reseller networks (wholesale food, industrial supplies, cosmetics, coffee, textiles, etc.) — the workflow pattern generalizes broadly

### Design principles this roadmap implies for Phase 2-10
- Never require users to re-enter data that already exists elsewhere in the system
- Emit domain events for operationally significant actions (order.submitted, payment.verified, order.dispatched, order.completed) — accounting modules will subscribe to these later
- Keep product and order snapshots immutable once written (historical accounting integrity)
- Design schema to allow tenant_id addition later without table restructures

---

*End of CLAUDE.md — this document is the single source of truth. Any conflict between this file and other instructions is resolved in this file's favor unless the owner explicitly updates it.*
