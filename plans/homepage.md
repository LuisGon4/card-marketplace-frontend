# Plan — Homepage (Listings Browse at `/`)

> **Intended destination: `/Users/luis/Desktop/card-marketplace-frontend/plans/homepage.md`.**
> Plan mode restricted writes to this scratch path. Copy this file to `plans/homepage.md`
> before handing it to the Coder.

---

## 1. Goal & scope

**Goal.** Stand up the app's foundation and the first exercisable backend surface:
a publicly viewable listings browse page at `/` that calls `GET /api/listings` with
paging and sort, plus an auth-aware header.

This cycle establishes four things every later component inherits: the Tailwind
baseline, `src/api/client.js`, `src/hooks/useFetch.js`, and the page-shell/container
rhythm. Those are precedent-setting; the browse page itself is the smaller half of
the work.

### In scope
1. Wire Tailwind v4; delete the 295 lines of starter CSS.
2. Align the Vite dev port with the backend's CORS origin (see Open Decision 1).
3. `src/api/client.js` — sole fetch module.
4. `src/hooks/useFetch.js` — sole read pattern.
5. Router shell (`react-router` v8, declarative mode), `AppLayout`, `Header`.
6. Root auth probe via `GET /api/listings/mine`, 401 → signed out.
7. `BrowsePage` at `/`: grid of `ListingSummaryResponse`, four distinct states,
   fixed sort `<select>`, prev/next paging driven by `hasNext`.

### Explicitly NOT this cycle
- The six filters (`cardName`, `setName`, `condition`, `printing`, `minPrice`, `maxPrice`).
  The URL-state decision below is made *so that* filters drop in cleanly next cycle.
- Listing detail, create/edit/delete/reactivate, image upload, card search, chat.
- A `/login` route or login form. None can exist — login is a full-page redirect.
- Page-size control, a "my listings" page, sort direction control (see TODO(Luis)).
- Tests, CI, analytics, component library, any new dependency.

---

## 2. Verified stack facts (checked, do not re-derive)

| Fact | Verified how |
|---|---|
| `BrowserRouter`, `Routes`, `Route`, `Link`, `useSearchParams` all import from **`"react-router"`** | Read `node_modules/react-router/dist/production/dom-export.d.ts` — the `react-router/dom` subpath exports **only** `HydratedRouter`, `RouterProvider`, and RSC helpers. It does **not** export `BrowserRouter`. `react-router/dom` is for framework/data mode only. |
| v8 removed `react-router-dom` entirely | v8 release notes. Package is correctly absent here. |
| v8 made no breaking change to declarative-mode components | v8 release notes — breaking changes are ESM-only publishing, Node 22.22+/React 19.2.7+/Vite 7+ floors, middleware default, `data`→`loaderData` in meta. None touch us. |
| `useSearchParams()` → `[URLSearchParams, setSearchParams]`, setter accepts a functional updater and a `{ replace }` nav option | `node_modules/react-router/dist/production/lib/dom/lib.d.ts:1538,1567` |
| Tailwind v4 needs **no** `tailwind.config.js`, **no** PostCSS chain, **no** content globs | Tailwind v4 Vite install docs |
| `@tailwindcss/vite@4.3.3` supports Vite 8 | its `package.json` peerDeps: `^5.2.0 \|\| ^6 \|\| ^7 \|\| ^8` |

**Do not** create `tailwind.config.js`, `postcss.config.js`, or import from `react-router/dom`.

---

## 3. Design direction

CLAUDE.md is unambiguous: *"Optimize for endpoint coverage and clarity, not visual
polish."* So the direction is deliberately utilitarian. The discipline goes into
consistency and into one place where emphasis genuinely earns its keep.

### Palette — neutral `zinc` ramp + one accent

- **Neutrals:** Tailwind `zinc`. Chosen over `gray`/`slate` because it is a true
  neutral with no blue cast, which keeps the single blue accent unambiguously
  readable as "interactive."
- **Accent:** `blue-700`. Used **only** for interactive affordances — primary
  button, links, focus rings. The reasoning is constraint-driven, not taste: the
  accent must not collide with price semantics. Green would read as "good price"
  and red/amber as "bad price," both of which would fight the `priceFlagged`
  badge. Blue is the only family that stays semantically inert here.
- **Status (not a second accent):** `amber-100` bg / `amber-900` text, reserved
  exclusively for the `priceFlagged` badge.
- Surfaces: `bg-white` page, `bg-zinc-50` for the header bar and image placeholders,
  `border-zinc-200` hairlines.

### Typography

Tailwind's default system stack — no custom font (that's both a new dependency
and a decorative flourish).

| Role | Utilities |
|---|---|
| Page title | `text-2xl font-semibold text-zinc-900` |
| Section / card title | `text-base font-medium text-zinc-900` |
| Body | `text-sm text-zinc-700` |
| Meta / secondary | `text-sm text-zinc-600` |
| Micro label | `text-xs uppercase tracking-wide text-zinc-600` |
| **Prices** | `tabular-nums` (a default Tailwind utility) |

`tabular-nums` is the one craft detail that directly serves the subject: prices
align down the grid column, so a scan reads as a price list rather than ragged text.

### Layout

- One container, everywhere, forever: `mx-auto max-w-5xl px-4`.
- `AppLayout` owns it so no page can drift. `<main className="mx-auto max-w-5xl px-4 py-8">`.
- Vertical rhythm: `space-y-6` between page-level blocks, `gap-4` inside the grid.
- Grid: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`. One column on phones.
- Header: `border-b border-zinc-200 bg-zinc-50`, inner div uses the same container.

### The one place emphasis is spent — the price pair

The most characteristic thing in this domain is *asking price vs. market price*.
That is the card's visual anchor: asking price large and `tabular-nums`, market
price directly beneath in muted text, badge only when it's meaningful. Everything
else on the card — card name, condition, printing, location, seller — is quiet
and uniform. No shadows, no gradients, no hover animation. Border + rounded corner
(`rounded border border-zinc-200`) and nothing more.

### The four states

| State | Treatment |
|---|---|
| **Loading** | Plain text `Loading listings…` inside the shared `role="status"` region. **No skeleton pulse** — animations are banned by CLAUDE.md, and a `animate-pulse` skeleton is an animation. |
| **Error** | `role="alert"`, `border border-red-300 bg-red-50 p-4`, renders `error.message` **verbatim** (the server's plain text), plus a "Try again" button. |
| **Empty** | Visually distinct from loading: a bordered `border-dashed border-zinc-300` block, heading "No listings yet", one line of direction. If `page > 0`, additionally offer "Back to first page" — a legitimately empty page 3 is a different situation from an empty catalogue. |
| **Populated** | The grid, preceded by the results summary line. |

Empty-state copy follows the writing guidance: an empty screen is an invitation,
not an apology. "No listings yet. When sellers post cards, they'll appear here."

### Accessibility (WCAG 2.2 AA)

- Sort `<select>` gets a **visible** `<label htmlFor="sort">Sort by</label>`.
- One `role="status" aria-live="polite"` region holds loading text *and*, when
  loaded, the results summary ("Showing page 2 of 5 · 87 listings"). Paging then
  announces itself without a second live region fighting the first.
- Error block is `role="alert"`.
- Focus: every interactive element gets
  `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700`.
  Never strip `outline` without a replacement in the same rule.
- **Contrast:** secondary text is `text-zinc-600` (~7:1 on white). `zinc-500` is
  ~4.6:1 — passes, but has no margin; **`zinc-400` fails AA and must never be used
  for text.**
- **`priceFlagged` must not be color-only** (WCAG 1.4.1). The badge carries a text
  label, not just an amber swatch.
- Thumbnails: `alt={cardName}`, `loading="lazy"`, in a fixed `aspect-square`
  `object-contain bg-zinc-100` box so the grid never shifts as images arrive.
  (`aspect-square` deliberately over an arbitrary `aspect-[5/7]` — stays on the
  default scale, and `object-contain` preserves the real card proportions.)
- Missing thumbnail → a `<div>` reading "No image", not an `<img>` with empty `alt`.
- Paging buttons use the native `disabled` attribute, and stay rendered (not hidden)
  so the control row doesn't jump.
- Semantic structure: `<header>`, `<main>`, `<h1>` once, listing grid is a `<ul>`
  of `<li>`, each card an `<article>`.
- *Optional refinement, not a required step:* on page change, move focus to the
  results heading. Better than `window.scrollTo` for keyboard/SR users.

---

## 4. Data & contracts

### The only endpoints this cycle touches

| Call | Purpose | Notes |
|---|---|---|
| `GET /api/listings?page&size&sort` | The grid | Public. 400 on an invalid `sort`. |
| `GET /api/listings/mine` | Auth probe only | 200 → signed in (possibly `[]`), 401 → signed out. The response body is **discarded** this cycle. |
| `GET /oauth2/authorization/google` | Login | `window.location.href` assignment. Never fetch. |

### Query construction rules

- Always send all three params explicitly: `page`, `size=20`, `sort`. Explicit beats
  relying on server defaults — the URL then fully describes what's on screen.
- **`sort` carries the bare field name only — `createdAt` or `askingPrice`.**
  Do **not** append a Spring-style direction (`createdAt,desc`); BACKEND.md says
  anything outside those two literals is a 400.
- Values not in `['createdAt', 'askingPrice']` are clamped client-side before the
  request is built. A hand-edited URL must not be able to force a 400.

### `ListingSummaryResponse` → card rendering rules

| Field | Rendering |
|---|---|
| `cardName` | Card title. |
| `askingPrice` | Primary. `Intl.NumberFormat` currency. `tabular-nums`. |
| `marketPrice` | If `null` → muted "No market price". Else "Market $X". |
| `priceFlagged` | **Badge renders only when `marketPrice !== null && priceFlagged === true`.** Never on a null market price. |
| `condition` | Rendered as the raw code (`NM`/`LP`/`MP`/`HP`/`DMG`). This is collector vernacular — humanizing it would be less clear to the audience, not more. |
| `printing` | Mapped: `NORMAL`→"Normal", `HOLOFOIL`→"Holofoil", `REVERSE_HOLOFOIL`→"Reverse holofoil". **Lookup must fall back to the raw string** for an unrecognized value, so a future backend enum addition degrades to readable rather than blank. |
| `thumbnailUrl` | `null` → placeholder div. Otherwise `<img>`. URLs are public S3, no auth. |
| `sellerUsername` | Shown as meta. (Note: this is the *seller's* name — it is **not** a source for the current user's name.) |
| `location` | Shown as meta. |
| `description` | Optional; if present, `line-clamp-2`. |
| `id`, `cardId`, `sellerId` | Not rendered. `id` is the `key`. |
| `isActive` | Not rendered — `GET /api/listings` returns active listings only. |

**A card is not a link this cycle.** Listing detail doesn't exist yet, so the card
is a plain `<article>`. Do not create an anchor to a route that 404s. The detail
cycle converts it to a `<Link>`.

### `PageResponse` handling

- Forward availability comes from `hasNext` **only** — never compute it from
  `totalPages`, and never treat this as a cursor.
- Backward availability is `page > 0` (client-side; the response has no `hasPrevious`).
- `totalPages` and `totalElements` are used for the human-readable summary line.
- `content` is an array, never null.

### `TODO(Luis)` — backend / human-owned

1. **`TODO(Luis)` — Dev-server origin vs CORS.** BACKEND.md documents local dev as
   `localhost:3000` → `localhost:8080`. **Vite defaults to 5173.** Unless one side
   moves, every request is CORS-blocked on day one. Either the Coder sets
   `server: { port: 3000, strictPort: true }` in `vite.config.js`, or you add 5173
   to the backend's allowed origins. Decide before Step 3 ships. (Note: WS CORS is
   `http://localhost:*` so it's unaffected either way.)
2. **`TODO(Luis)` — Credentialed CORS preconditions.** `credentials: 'include'`
   requires the backend to send `Access-Control-Allow-Credentials: true` and a
   *specific* origin (a `*` wildcard is rejected by the browser with credentials).
   Backend-owned; the frontend only guarantees the flag is set.
3. **`TODO(Luis)` — There is no username source.** No `/api/users/me` exists. The
   probe reveals *whether* someone is signed in, never *who*. The header therefore
   says a generic "Signed in". Do not let anyone "fix" this by scraping
   `sellerUsername` off a listing — a signed-in user with zero listings returns `[]`.
   If a display name is wanted, it needs a backend endpoint.
4. **`TODO(Luis)` — Sort direction is undefined.** BACKEND.md names the sort
   *fields* but not the direction, and exposes no way to control it. If `createdAt`
   sorts ascending, the homepage's default view is the *oldest* listings — a bad
   default for a marketplace. Confirm the direction; if it's ascending, that's a
   backend change, not a frontend workaround.
5. **`TODO(Luis)` — `priceFlagged` semantics are undefined.** The contract doesn't
   say whether it means above market, below market, or a deviation threshold. The
   badge therefore reads a neutral **"Price flagged"** and the card shows both
   numbers so the reader can compare. Once the meaning is confirmed, the label
   should state it. **Do not guess a direction in the copy.**
6. **`TODO(Luis)` — Currency is assumed USD.** `askingPrice`/`marketPrice` are bare
   numbers with no currency field. Formatting hardcodes `en-US`/`USD`. Confirm.
7. **`TODO(Luis)` — Auth flow is human-owned.** The redirect URL, cookie handling,
   and CSRF pattern are built exactly as BACKEND.md specifies and must not be
   modified. The CSRF write path is implemented in `client.js` this cycle but is
   **unexercised** (no writes on the homepage) — it needs your review when the first
   mutation ships.
8. **Expected-noise note (not a bug):** every anonymous page load fires one
   `GET /api/listings/mine` that returns 401. That's the documented probe. A code
   comment will say so.

---

## 5. Step-by-step build order

Each step is a separate Coder invocation and a separate Reviewer pass.

---

### Step 1 — Tailwind baseline; remove the scaffold

- `vite.config.js`: add `import tailwindcss from '@tailwindcss/vite'` and register
  `tailwindcss()` alongside `react()`.
- **Replace** `src/index.css` with exactly `@import "tailwindcss";` — the 111 lines
  of custom properties, purple accent, and `color-scheme: light dark` are deleted,
  not layered over. They conflict with preflight.
- Delete `src/App.css` and `src/assets/react.svg`. Remove their imports.
- `src/App.jsx`: reduce to a minimal component rendering a Tailwind-styled
  placeholder. No counter, no logos.
- `index.html`: `<title>Card Marketplace</title>`. Leave `public/favicon.svg` and
  its `<link>` alone.
- Do **not** create `tailwind.config.js` or `postcss.config.js`.

**Acceptance:** `npm run dev` starts clean. A Tailwind utility (e.g. `text-blue-700`)
visibly applies. No purple remains, no dark-mode flip. `src/App.css` and
`src/assets/react.svg` are gone. `src/index.css` is one line. `npm run build` succeeds.

---

### Step 2 — Dev-server origin (gated on Open Decision 1)

If Luis chooses the frontend side: add `server: { port: 3000, strictPort: true }`
to `vite.config.js`. If he chooses the backend side: **no code change** — skip and
record the decision in this plan.

**Acceptance:** dev server serves on the origin the backend's CORS config allows.

---

### Step 3 — `src/api/client.js`

The only module in the app that calls `fetch`. Must implement, exactly:

- Base URL read from `import.meta.env.VITE_API_BASE_URL` **once at module load**,
  and **throw a clear error immediately if it's missing** — otherwise requests
  silently resolve against the Vite dev origin and 404 in a confusing way. Never
  hardcode `localhost:8080`.
- `credentials: 'include'` on **every** request.
- For `POST`/`PATCH`/`DELETE`: read the `XSRF-TOKEN` cookie **fresh at call time**
  (a `document.cookie` parse helper) and send it as `X-XSRF-TOKEN`. **Never** store
  it in a module variable — it rotates after login. GETs are exempt.
- **Error path: `await response.text()`, never `response.json()`.** Throw an
  `ApiError extends Error` carrying `.status` (number) and `.message` (the plain-text
  body). If the body is empty, fall back to a message including the status code so
  the UI never renders a blank error.
- `204` → return `null`, no body parse. Otherwise `response.json()`.
- Accept an optional `{ signal }` and pass it to `fetch`, so `useFetch` can abort.
- Export at minimum `apiGet(path, { signal })` and `ApiError`. Write helpers may be
  exported now or deferred to the first mutation cycle — Coder's call, but the CSRF
  helper must exist and be correct either way.

**Acceptance:** every rule above is present. No `response.json()` anywhere on a
non-2xx branch. No cached CSRF token. No hardcoded host. No component imports `fetch`.

---

### Step 4 — `src/hooks/useFetch.js`

The single read pattern for the whole app. Signature:

```
useFetch(path)  // path is a single string, query string included; null = skip
```

**Why a single string arg, not `(path, options)`:** the effect can then depend on
`[path]`, a primitive. An inline options object would be a new reference every
render and re-trigger the effect forever, and the fix (`useMemo`/`useCallback`)
is exactly the "clever" a junior reader shouldn't have to decode. The caller
builds the query with `URLSearchParams`.

Returns `{ data, loading, error, refetch }` (see Open Decision 3 on `refetch`).

**Race/unmount handling — spell these transitions out and follow them exactly:**

- Create an `AbortController` per effect run; pass `controller.signal` to `apiGet`.
- Effect cleanup calls `controller.abort()`.
- On a new request: `loading = true`, `error = null`, `data = null`.
- On success: `data = json`, `error = null`, `loading = false`.
- On failure: **first check `controller.signal.aborted` and, if true, `return`
  without touching any state.** Check the signal, not `err.name === 'AbortError'` —
  the signal is the authoritative source and doesn't depend on error-shape guesses.
- Only on a genuine failure: `data = null`, `error = err`, `loading = false`.

This matters concretely: React 19 StrictMode double-invokes effects in dev, and a
user clicking Next twice quickly can have page 2's response land after page 3's.
Aborting both cancels the in-flight request *and* guarantees the stale response
can never write state.

**Acceptance:** aborting sets no state and leaves `loading` untouched. Fast
double-paging always ends showing the last-requested page. StrictMode dev mode
shows no flicker or doubled error. `path === null` performs no fetch.

---

### Step 5 — Router shell, `AppLayout`, `Header`

- `src/main.jsx`: wrap `<App />` in `<BrowserRouter>` — **imported from
  `"react-router"`**, not `"react-router/dom"`.
- `src/App.jsx`: `<Routes>` with `/` → `BrowsePage`, and `*` → a minimal not-found
  element. Both from `"react-router"`.
- `src/components/AppLayout.jsx`: renders `<Header>` + `<main className="mx-auto max-w-5xl px-4 py-8">{children}</main>`.
  This is the container every future page inherits.
- `src/components/Header.jsx`: site name on the left, auth slot on the right.
  Right side this step is a static `<button>` "Sign in with Google" whose handler is
  `window.location.href = \`${base}/oauth2/authorization/google\``. A **`<button>`**,
  not an `<a>`, because it triggers a scripted navigation. Full-page redirect only —
  no fetch, no XHR, no `/login` route, no form.
- `src/pages/BrowsePage.jsx`: placeholder heading for now.

**Acceptance:** `/` renders through the layout; an unknown path renders not-found;
the sign-in button navigates to the OAuth URL; imports come from `"react-router"`.

---

### Step 6 — Root auth probe

- A small `useAuthStatus()` hook (or an inline effect in `App`) that calls
  `GET /api/listings/mine` **exactly once** on mount.
- State is three-valued: `'checking' | 'signedIn' | 'signedOut'`. Three, not a
  boolean, so the header doesn't flash "Sign in with Google" and then swap.
- 200 → `'signedIn'` (the body is discarded; `[]` still means signed in).
- 401 → `'signedOut'`. **Do not retry. Do not surface it as an error.** A 401 here
  is the normal anonymous path, which is precisely why this probe must **not** go
  through `useFetch` — `useFetch` would populate `error` and risk an error banner
  for a perfectly healthy anonymous visit.
- Any other failure → `'signedOut'`. Client gating is cosmetic; the server enforces.
  A real outage will surface through the browse page's own error state.
- Pass the status down as a prop to `Header`. No context, no global store.
- Header renders: `checking` → neutral placeholder; `signedOut` → "Sign in with
  Google"; `signedIn` → generic "Signed in" text. **No username** (TODO(Luis) #3).
- Add the code comment explaining the expected 401 (TODO(Luis) #8).

**Acceptance:** anonymous load shows the sign-in button and exactly one 401, no
error UI. Authenticated load shows "Signed in". No retry loop. No username invented.

---

### Step 7 — `ListingCard` (presentational only)

`src/components/ListingCard.jsx`. Pure, props-driven, zero data loading.

Implements every rule in §4's rendering table. Specifically:

- Fixed `aspect-square object-contain bg-zinc-100` image box; `alt={cardName}`;
  `loading="lazy"`; `null` → a "No image" div.
- Asking price primary, `tabular-nums`, `Intl.NumberFormat`.
- Market price beneath, or "No market price" when `null`.
- **Badge only when `marketPrice !== null && priceFlagged === true`.** Label:
  "Price flagged" — neutral, because the direction isn't in the contract.
- Printing lookup with a raw-string fallback; condition rendered as the raw code.
- `<article>`, `rounded border border-zinc-200 p-4`. No shadow, no hover animation.
- Not a link this cycle.
- `formatPrice` colocated in this file for now (single consumer). Promote to a
  shared module when the detail page needs it — see Open Decision 4.

**Acceptance:** all four of {thumbnail present/absent} × {marketPrice present/absent}
render correctly. A `priceFlagged: true` with `marketPrice: null` shows **no badge**.
An unknown printing string renders raw, not blank.

---

### Step 8 — `BrowsePage` list + four states

- `useFetch('/api/listings?page=0&size=20&sort=createdAt')` with values still fixed
  (controls arrive in Step 9). Build the query with `URLSearchParams`.
- `<h1>Browse listings</h1>`.
- Render the four states from §3. Error shows `error.message` verbatim plus a
  "Try again" button.
- Grid is `<ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">` of `<li>`
  wrapping `<ListingCard>`, keyed on `listing.id`.
- Results summary line inside the `role="status" aria-live="polite"` region.

**Acceptance:** all four states reachable and visually distinct — empty must not
look like loading. Error text is the server's, unmodified. No `fetch` in this file.

---

### Step 9 — Sort control + paging, via URL state

(Assumes Open Decision 2 resolves to URL state. If it resolves to `useState`, the
same control behavior applies with local state.)

- `const [searchParams, setSearchParams] = useSearchParams()` from `"react-router"`.
- **Read + clamp** (never trust the URL):
  - `page`: `Number.parseInt`; if not finite or `< 0` → `0`.
  - `sort`: must be `'createdAt'` or `'askingPrice'`; otherwise → `'createdAt'`.
    A hand-edited `?sort=bogus` must be impossible to send to the API.
  - Clamping happens on read. Don't rewrite the address bar.
- Sort `<select id="sort">` with a visible `<label>`, exactly two `<option>`s.
  Fixed list — never a text input.
- **Changing sort resets `page` to 0.** (Classic bug; call it out in review.)
- Prev/Next `<button>`s: Prev `disabled={page === 0}`, Next `disabled={!hasNext}`.
  `hasNext` comes from the response — do not derive it from `totalPages`.
- Between them, "Page N of `totalPages`".
- The `path` string passed to `useFetch` is derived from the clamped values, so any
  change re-triggers the fetch through the `[path]` dependency — no manual refetch.

**Acceptance:** paging forward/back works and the buttons disable at both ends;
sort change resets to page 0; reload preserves page and sort; back button steps
through pages; `?page=-3&sort=bogus` renders page 0 sorted by `createdAt` and sends
no invalid request; fast double-clicking Next always lands on the last-requested page.

---

### Step 10 — Accessibility & consistency pass

Walk the checklist, fix what's off, change nothing else:

- Keyboard-only traversal of the whole page; focus ring visible at every stop.
- Sort select has a real associated visible label.
- Live region announces on page change; error is `role="alert"`.
- No text lighter than `zinc-500`; secondary text is `zinc-600`.
- `priceFlagged` conveyed by text, not color alone.
- Single `<h1>`; `<header>`/`<main>` landmarks present.
- Responsive at 375px / 768px / 1280px; no horizontal scroll; no layout shift as
  thumbnails load.
- No custom CSS file, no inline `style`, no arbitrary Tailwind values, no
  animations or gradients anywhere.

**Acceptance:** all boxes pass; no functional change introduced by this step.

---

## 6. Open decisions for Luis

**1. Dev-server origin: move Vite to 3000, or add 5173 to backend CORS?**
- *Vite → 3000:* one line in `vite.config.js`, purely frontend, matches BACKEND.md
  as written, and anyone cloning the repo works immediately. Costs a non-default
  Vite port that may surprise a reader.
- *Backend allows 5173:* keeps Vite's default, but it's a backend change (yours),
  and the repo won't work out of the box until it's deployed everywhere.
- **Blocking.** Nothing talks to the API until this is settled.

**2. Page + sort state: URL query string, or `useState`?**
- *URL (`useSearchParams`):* shareable/bookmarkable, back button steps through
  pages, reload preserves position — and the six filters land next cycle and will
  want the same treatment, so this sets the precedent once instead of forcing a
  rewrite. Costs ~15 lines of parse-and-clamp, plus the obligation to treat URL
  input as untrusted.
- *`useState`:* fewer lines, nothing to validate. Costs: back button leaves the
  page entirely, reload resets to page 0, no shareable link — and the filter cycle
  likely migrates to the URL anyway, making this throwaway work.
- **My recommendation: URL**, mainly for the precedent. Your call.
- *Sub-question if URL:* push a history entry per page change (back = previous page,
  which is what users expect) or `{ replace: true }` (back = leave the page)?
  Recommend push.

**3. Does `useFetch` return a `refetch`?**
- CLAUDE.md specifies `{ data, loading, error }` literally — but it also says
  mutations "re-invoke the relevant fetch to refresh," which needs *some* handle.
- *Add `refetch`:* the error state's "Try again" needs it now, and every mutation
  screen needs it soon. Deviates from the letter of CLAUDE.md.
- *Omit it:* stays literal, but forces a refresh-counter-in-dependency trick later,
  or a second hook variant — which CLAUDE.md forbids ("do not invent variants").
- **My recommendation: add `refetch`**, and amend CLAUDE.md's line so the doc and
  code agree. That's a CLAUDE.md edit, so it's explicitly yours to make.

**4. Where does `formatPrice` live?**
- *Colocated in `ListingCard.jsx`:* honest for one consumer, no new directory.
- *`src/utils/format.js`:* ready for the detail page, but adds a directory the
  CLAUDE.md structure doesn't list.
- **Recommendation: colocate now, promote when the second consumer appears.** Low stakes.

**5. Does `useFetch` clear `data` while a new request is in flight?**
- *Clear (recommended):* the loading state always shows on page change — simple,
  honest, and matches "render all three states." Costs a brief content flicker
  while paging.
- *Keep stale data with a loading marker:* smoother paging, but adds a fourth
  visual state ("stale + loading") that every future screen inherits.
- **Recommendation: clear.** Simplicity compounds across the ten screens ahead.

**6. Sort direction (also TODO(Luis) #4).** If `createdAt` sorts ascending, `/`
shows the oldest listings first. That's a backend answer, not something the
frontend should paper over — but you should know before the plan is approved, since
it may change what the default sort *should* be.

---

## 7. Files this cycle creates or modifies

```
vite.config.js                    modify  (tailwind plugin; maybe server.port)
index.html                        modify  (title)
src/index.css                     replace (→ @import "tailwindcss";)
src/App.css                       DELETE
src/assets/react.svg              DELETE
src/main.jsx                      modify  (BrowserRouter)
src/App.jsx                       rewrite (Routes + auth probe)
src/api/client.js                 new
src/hooks/useFetch.js             new
src/hooks/useAuthStatus.js        new
src/components/AppLayout.jsx      new
src/components/Header.jsx         new
src/components/ListingCard.jsx    new
src/pages/BrowsePage.jsx          new
src/pages/NotFoundPage.jsx        new  (minimal)
```

No dependency added. No backend file touched. No auth/CORS/cookie config touched.
