# MoodFlow — Bilingual Emotional Intelligence & Wellness Companion

MoodFlow is a privacy-first, bilingual (`English` & `العربية`) emotional intelligence web application built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS v4**, and **Supabase (PostgreSQL + RLS + Vault)**.

---

## Key Capabilities

### 1. Vision Crystal Design & Nile Sapphire × Gold Theme (`src/lib/theme.ts`)
- **Default Palette (`#4 Nile Sapphire × Gold`)**: Coherent multi-hue Dark (`#060C1A`) and Light (`#EFF6FF`) palettes with 8 selectable themes in Settings.
- **Tactile Component Materials**:
  - **Mood Buttons**: `Hybrid Orb-Keycaps` (default), `3D Keycaps`, or `Glowing Orbs`.
  - **Intensity Slider**: `Thick Capsule` recessed-well slider (`1%–100%`).
  - **Cursor Spotlight**: `Vision Crystal` / `Crystal Pearl` surface refraction (`@media (pointer: fine)` on desktop, battery-safe disable on mobile touchscreens).
- **Automatic Mode-Aware Aura Rule**: `moodReactive` automatically defaults to **OFF (`false`)** in Dark Mode (preserving deep Nile Sapphire contrast) and **ON (`true`)** in Light Mode (giving warm pastel mood-reactive ambiance), with a manual override toggle in Settings.

### 2. Option A — Real Mathematical Trait & Massive Bilingual Lexicon Engine (`src/lib/lexicon.ts`, `src/lib/sentiment.ts`)
- **Deterministic Composite Formula**:
  $$\text{MoodScore} = \text{clamp}_{[-1, 1]}\left(0.45 \cdot \left(\text{MoodVector}(m) \cdot \frac{\text{Intensity}}{100}\right) + 0.20 \cdot \sum_{t \in \text{Tags}} w_t + 0.35 \cdot \text{LexiconScore}(\text{Text})\right)$$
  $$\text{WellnessIndex} = \text{round}\left(50 \cdot (\text{MoodScore} + 1)\right) \in [0, 100]$$
- **8 Emotional Dimensions**: `happy`, `calm`, `motivated`, `tired`, `sad`, `frustrated`, `anxious`, `confused`.
- **Trilingual Vocabulary Coverage**:
  - **English (`EN`)**: Unigrams + multi-word idioms (`on cloud nine`, `burned out`, `panic attack`, `fed up`, `at peace`).
  - **Modern Standard Arabic (`الفصحى`)**: Full morphological normalization (diacritic/tashkeel stripping, hamza/alif unification, elongation collapsing, and prefix stripping for `وال`, `بال`, `فال`, `كال`, `ال`, `لل`, `و`, `ب`, `ف`, `ك`, `ل`).
  - **Egyptian Colloquial (`عامية مصرية`)**: Authentic Egyptian expressions (`مبسوط`, `فرحان`, `رايق`, `الحمدلله`, `مخنوق`, `مفرهد`, `هلكان`, `دمي محروق`, `قرفان`, `زهقان`, `مفروس`, `شايل الهم`, `مزنوق`, `متلخبط`, `مش طايق`, `فصلت شحن`, `زي الفل`).
- **Context-Aware Modifiers**: 3-token lookback negation window (`not`, `never`, `مش`, `مبقتش`, `ليس`, `غير`) and intensity amplifiers/dampeners (`very`, `extremely`, `جداً`, `أوي`, `خالص`, `شوية`).

### 3. Readable Mood Heatmap & Editable Lifts vs. Drains (`src/components/ui/MoodHeatmap.tsx`, `src/lib/factors.ts`)
- **Readable Mood Heatmap**: Always-visible top color legend (swatch + emoji + mood name + day count + no-entry indicator), `Sat–Fri` weekday labels, month headers, `30D / 90D / 365D` range switcher, and click-to-filter day drill-down.
- **Editable "What Lifts vs. Drains Your Mood"**: Combines auto-computed tag correlation deltas (`+pts` / `-pts`) with full user customization (add custom factor, rename, pin to top, hide/restore, or reset).
- **3D BiDi Chart Flip**: Smooth horizontal 3D flip animation (`chart-flip-active`) when switching between English (`LTR`) and Arabic (`RTL`), plus `Today | Yesterday` 1-tap backfill.

### 4. Defense-in-Depth Security Architecture
- **Password Hashing**: `bcryptjs` (12 salt rounds) with constant-time `DUMMY_BCRYPT_HASH` missing-user equalization and automatic zero-downtime upgrade from legacy SHA-256 hashes (`src/lib/server-auth.ts`).
- **Session Management**: `HS256` signed JWTs stored in `HttpOnly; Secure; SameSite=Lax` cookies (`src/lib/jwt.ts`) verified in Edge Middleware (`src/middleware.ts`) with strict CSRF `Origin === Host` enforcement on all mutating `/api/*` requests.
- **Client-Side End-to-End Encryption (`E2EE`)**: Journal notes (`text`) are encrypted client-side using WebCrypto `PBKDF2-HMAC-SHA256` (`100,000` iterations) + `AES-256-GCM` with random 96-bit IVs (`enc:v1:<iv>:<ciphertext>`) before leaving the browser (`src/lib/crypto-vault.ts`).
- **Database Security & Supabase Vault**: Row-Level Security (`ENABLE` + `FORCE ROW LEVEL SECURITY`) with `REVOKE ALL FROM anon, authenticated` on all tables, plus `supabase_vault` encrypted secrets support (`supabase/schema.sql`).
- **Rate Limiting & Sanitization**: Sliding-window rate limiting across all API routes (`src/lib/rate-limit.ts`), Zod schema validation, HTML escaping (`escapeHtml`), and RFC-4180 + OWASP CSV formula injection sanitization (`sanitizeCsvCell`).

---

## Development & Verification Gates

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run the 5 Verification Gates
npx tsc --noEmit          # TypeScript strict typecheck
npm run lint              # ESLint static analysis
npm test -- --run         # Vitest unit & security test suite (52 tests)
npm audit                 # Dependency vulnerability audit
npm run build             # Production Next.js build
```
