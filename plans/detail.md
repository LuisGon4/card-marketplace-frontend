# Plan: Listing detail page (`/listings/:id`)

## Context

The browse/homepage cycle is merged. Every listing on the grid is currently a dead
end: `ListingCard` renders a card's facts but links nowhere, and its own header
comment says so — *"Not a `<Link>` this cycle: listing detail doesn't exist yet…
The detail cycle converts this to a `<Link>`."* This is that cycle.

`CLAUDE.md`'s coverage goal names "listing detail with images" as a required
surface. `GET /api/listings/{id}` returns `imageUrls`, which no screen in the app
renders today — the grid shows a single `thumbnailUrl` and nothing else. So a
listing's images are, right now, invisible in the frontend.

Luis's stated constraint on this cycle: *"Keep all of the criteria that caused the
refactor. I don't want to have to refactor each step again. Code should be clean
and reusable. The codebase shouldn't be unreadable and full of repeated work."*
That is why roughly half of this plan is de-duplication of `ListingCard` and
`BrowsePage` rather than new-page work. Four presentational pieces gain a second
consumer the moment detail exists; they get extracted **before** the second copy is
written, not after.

Outcome: a plain, complete detail screen, and a `ListingCard` that owns no price,
image, or condition rule of its own.

## Scope

**In:** route `/listings/:id`; `GET /api/listings/{id}`; main-image + thumbnail-strip
gallery; two-column desktop layout; filter-preserving back link; `ListingCard`
becomes a link.

**Out — do not plan, stub, or leave dead code for:** `POST /api/conversations` /
"Message seller"; owner actions (PATCH / DELETE / reactivate); **any mutation at
all** — `apiPost`/`apiPatch`/`apiDelete` stay unexercised and their `TODO(Luis)`
stays; image upload; valuation; card search; chat; new dependencies.

**Not rendered, deliberately:** `isActive` (absent from `ListingDetailsResponse` —
nothing to render); `sellerId` and `cardId` (bare UUIDs with no route to point at).

## Decisions locked with Luis

| # | Decision |
|---|---|
| 1 | **Read-only cycle.** "Message seller" belongs to the messaging cycle — `POST /api/conversations` returns a conversation id whose only sensible destination is a chat screen that doesn't exist, and the 422 self-conversation case can't be detected without a `/api/users/me`. |
| 2 | **Gallery:** main image + clickable thumbnail strip. |
| 3 | **Layout:** two columns at desktop (images left, facts right), one column on mobile. |
| 4 | **Back link preserves filters** via router state, falling back to `/` when state is absent. |
| 5 | **Action-row slot** is a documented ordering comment in the JSX — no placeholder, no disabled button, no empty div. |
| 6 | **404 renders the verbatim server message through `ErrorNotice`, exactly like every other status.** No per-status branching. Accepted consequence: "Try again" on a delisted listing re-404s; it still earns its place for network failures and 500s. |
| 7 | **Card title stays `text-zinc-900`**, underline on hover — not app-blue. |
| 8 | **Whole card clickable** via a stretched overlay on the title link. |
| 9 | **`aspect-square` everywhere**, including detail. Tailwind default scale; `object-contain` letterboxes portrait cards, and that is accepted. |

Locked by me, stated for the record: `PriceBlock` takes **no size variant**
(`CLAUDE.md` ranks cross-screen consistency above any one screen looking good);
`<h1>` is `cardName ?? 'Listing'` (a stable focus target that exists in every
state); `TextLink` **is** extracted now, at two copies, because catching it at two
instead of six is this plan's whole point; a null description renders a muted
**"No description"**, matching the existing "No market price" precedent.

## Reuse decisions

The test throughout is `plans/refactor.md` §2: *would a change to one copy have to
be made to the other? If yes, it was never two things.*

| Thing | Decision | Why |
|---|---|---|
| **Price block** (`ListingCard.jsx:56-75`) | Extract `src/components/PriceBlock.jsx`, props `{ askingPrice, marketPrice, priceFlagged, className }`. `className` is a passthrough appended to its own `space-y-1`, using `TextFilterField`'s existing `[...].filter(Boolean).join(' ')` idiom; `ListingCard` passes `mt-3` so its DOM stays byte-identical. | Three facts, one rule, two renderers. The null-market fallback and the badge condition change together in both places the moment the `priceFlagged` TODO is answered. |
| **`showFlagBadge`** (`marketPrice !== null && priceFlagged === true`) | **Do not promote to `lib/`.** It moves *into* `PriceBlock` and keeps exactly one consumer. | Extracting the component removes the second consumer, so the promotion rule never fires. Promoting *and* extracting would be two solutions to one problem. The `TODO(Luis)` about flag direction moves with the badge, once. |
| **`{condition} · {printingLabel(printing)}`** | Promote as a function: `conditionPrintingLabel(condition, printing)` in `src/lib/listings.js`. Each caller wraps it in its own `<p>`. | Second consumer *outside* the browse feature → promotion rule fires. Three things depend on this decision: `ListingCard`, detail, and `helpers/browse/copy.js`'s `condition` descriptor, whose comment cites `ListingCard` as the reason it uses the raw code — Step 1 repoints that comment. A function, not a component: the shared thing is the string; the wrappers differ. |
| **"No image" placeholder** | Extract `src/components/ListingImage.jsx`, props `{ src, alt, loading }` — `null` src renders the placeholder, otherwise the `<img>`. | The whole conditional is the shared thing, not just the placeholder. The `bg-zinc-50` (nothing here) vs `bg-zinc-100` (letterbox) distinction is one fact that would otherwise exist twice. Different triggers (`thumbnailUrl === null` vs `imageUrls.length === 0`) are the *caller's* business; the component knows one rule. **Thumbnails deliberately do not use this** — never null, differently sized, plain `<img>`. |
| **Error box** (`BrowsePage.jsx:157-171`) | Extract `src/components/ErrorNotice.jsx`, props `{ message, onRetry }`. Owns the `role="alert"` box, the verbatim-message comment, the "Try again" `SecondaryButton`. **Focus management stays in the caller**: `onRetry={() => { refetch(); focusPageHeading() }}`. | Second consumer, identical treatment, and a palette or `role` change would have to be made twice. Focus stays out because each page owns its own heading ref — burying `.focus()` inside would make the target ambiguous. |
| **Live region** | **Do not extract.** Detail renders its own `<div role="status" aria-live="polite">` holding only "Loading listing…". | Contents differ entirely — browse's also carries `summaryText`. A wrapper whose whole body is two ARIA attributes hides the attributes without removing a rule. Coincidental parallel, not one rule in two copies. The convention (one live region per page) is documented here, not componentized. |
| **Inline link style** (`NotFoundPage.jsx:11`) | Extract `src/components/TextLink.jsx` and **update `NotFoundPage` in the same commit**. | Detail's back link would be the second byte-for-byte copy of a ~100-character class string. `SecondaryButton` was extracted for exactly this reason at six copies. The card title link is **not** a `TextLink` — different colour, plus the stretched-overlay classes. |
| **`:id` validation** | **Forward verbatim, no client-side UUID check.** Encode with `encodeURIComponent`. | `BACKEND.md` documents 404 for the id path but **says nothing about a malformed UUID** — a regex would invent contract behaviour, which `CLAUDE.md` forbids. The clamp-on-read precedent doesn't transfer: `clampPage`/`clampSort` clamp because there's a documented bad outcome *and* a neutral default. There is no "listing 0." `encodeURIComponent` is load-bearing, not decorative: `useParams()` returns **decoded** values, so re-encoding is what stops a decoded value restructuring the request URL. Earns a comment. |
| **Back-link source** | `BrowsePage` computes `` `${pathname}${search}` `` from `useLocation()` and passes `backTo` as a prop; `ListingCard` puts it in `<Link state={{ backTo }}>`. `ListingCard` does **not** call `useLocation()`. | Preserves `ListingCard`'s declared purity. Using `location.search` rather than `searchParams.toString()` round-trips the address bar byte-for-byte — including params the page ignores — consistent with the standing rule that the address bar is never rewritten. |
| **`src/helpers/detail/`** | Create it. `copy.js` → `imageAlt(cardName, index, total)`, `thumbnailLabel(index, total)`. `backTo.js` → `readBackTo(state)`. | Not ceremony: `imageAlt` and `thumbnailLabel` are **the same numbering rule expressed twice** — drift means a button announcing "Show image 3 of 5" swaps in an image whose alt says "image 4 of 5." `readBackTo` is the clamp-on-read for untrusted navigation state. Pure, no JSX, no React, no fetch. |

## Files

**New**

| Path | Responsibility |
|---|---|
| `src/components/ListingImage.jsx` | An `<img>` in the listing frame, or the "No image" placeholder when `src` is null. |
| `src/components/PriceBlock.jsx` | Asking price, market price or "No market price", flag badge — one definition of the badge rule. |
| `src/components/ErrorNotice.jsx` | The `role="alert"` box with the server's verbatim message and a "Try again" button. |
| `src/components/TextLink.jsx` | The app's standard inline text link. |
| `src/components/ImageGallery.jsx` | Main image + thumbnail strip; owns the selected index; degrades to 0 and 1 image. |
| `src/pages/ListingDetailPage.jsx` | The route: reads the param, fetches, renders loading / error / loaded, two-column layout. |
| `src/helpers/detail/copy.js` | `imageAlt`, `thumbnailLabel`. |
| `src/helpers/detail/backTo.js` | `readBackTo(state)` — clamps to a same-app path, defaults to `/`. |

**Modified**

| Path | Change |
|---|---|
| `src/lib/listings.js` | Add `conditionPrintingLabel`. |
| `src/components/ListingCard.jsx` | Use the three extractions; then become a stretched link; accept `id` and `backTo`; delete the "Not a `<Link>` this cycle" comment. |
| `src/pages/BrowsePage.jsx` | Use `ErrorNotice`; compute and pass `backTo`. |
| `src/pages/NotFoundPage.jsx` | Use `TextLink` (DOM-identical). |
| `src/helpers/browse/copy.js` | Repoint the `condition` descriptor comment at `conditionPrintingLabel`. |
| `src/App.jsx` | Add the `/listings/:id` route above `*`. |

## Layout

```
[ Back to browse ]                      <- TextLink, first focusable element
h1  Charizard ex                        <- text-2xl font-semibold, tabIndex={-1}
role=status live region                 <- "Loading listing…" only

grid gap-6 md:grid-cols-2
+-------------------------+  +--------------------------+
| ImageGallery            |  | NM · Holofoil            |
|  main ListingImage      |  | PriceBlock               |
|  aspect-square          |  | { action row goes here } <- comment only
|  [t][t][t][t]  strip    |  | Description / Seller /   |
+-------------------------+  | Location  (Fact rows)    |
                             +--------------------------+
```

- Page root `<div className="space-y-6">`, matching `BrowsePage`. Fact column `space-y-4`.
- `<h1>` reuses `BrowsePage`'s exact classes and keeps the load-bearing `tabIndex={-1}` comment.
- `Fact({ label, children })` is defined **inside** `ListingDetailPage.jsx` — precedent is `FilterBar`, which defines its field components locally. Used for Description, Seller, Location. The condition/printing line and `PriceBlock` are unlabelled headline facts, as on the card.
- Description: `whitespace-pre-line break-words`, no clamp — it's the only seller-typed free text on the page and collapsing their line breaks loses information.
- Strip renders **only when `imageUrls.length > 1`**. Each thumbnail is a real `<button type="button">` with `aria-label={thumbnailLabel(i, total)}` ("Show image 2 of 5") and an `<img alt="" loading="lazy">`.
- Selection is two-signal: `aria-pressed` plus `border-2 border-blue-700` vs `border-2 border-zinc-200`. Both `border-2` so selection never shifts layout. Not colour-alone (WCAG 1.4.1). Focus ring uses the codebase's exact existing string.
- `aria-pressed`, **not** `aria-selected` — the latter is only valid in a tablist, and the full APG tabs pattern would demand roving tabindex and arrow keys for a handful of images. Every thumbnail stays an ordinary tab stop.
- One image → **no strip** (a strip of one is a tab stop whose only effect is re-selecting what's selected). Zero images → placeholder, no strip, no `<img>`.
- No `role="region"` around the strip and no live region on the main image — the button names carry the context, and announcing every swap is chatter. Deliberate omission, gets one comment.

## Steps

Each step is one commit, independently verifiable against the dev server via the
`run-app` skill. Row IDs refer to the checklist below.

**Step 1 — Extract `ListingImage`, `PriceBlock`, `conditionPrintingLabel`; rewrite `ListingCard`.**
Pure refactor, no route, no behaviour change. The `bg-zinc-50`/`bg-zinc-100` comment moves
into `ListingImage`; the `priceFlagged`-is-only-meaningful comment and its `TODO(Luis)` move
into `PriceBlock`. Repoint `copy.js`'s comment.
*Accept:* every element's `class` on a populated browse page is byte-identical (DOM diff);
lint and build clean. Rows D4, D5.

*Outcome (2026-07-30):* met in substance, with two deviations found and accepted rather than
fixed. (a) `conditionPrintingLabel` returns one string where the JSX previously produced three
text nodes — same serialized markup, different live child-node count. (b) `PriceBlock`'s wrapper
renders `"space-y-1 mt-3"` where the original was `"mt-3 space-y-1"`; preserving the exact order
would have meant inverting the established base-first `[...].filter(Boolean).join(' ')` passthrough
idiom to satisfy a string comparison with no CSS consequence. Neither has any rendered,
CSS, or accessibility effect; an independent review found no third deviation. The criterion's
purpose — prove no behaviour changed — holds.

**Step 2 — Extract `ErrorNotice`; `BrowsePage` uses it.**
The verbatim-message comment moves into it. `BrowsePage` keeps `focusPageHeading` and
composes it into `onRetry`.
*Accept:* stop the backend, load `/` — box byte-identical, "Try again" refetches and moves
focus to the `<h1>`. Row D10.

**Step 3 — The route and the page, without the strip.**
`TextLink` back to `readBackTo(useLocation().state)`; the `<h1>`; the live region;
`ErrorNotice` for **every** error status; on success the two-column layout with a single
`ListingImage src={imageUrls[0] ?? null}` and the full fact column, including the
action-row omission comment. `NotFoundPage` swaps to `TextLink`. Test by typing a URL —
nothing links here yet.
*Accept:* rows D1 (as single image), D6-D11, D13-D17.

**Step 4 — `ImageGallery`.**
Owns `useState(0)` and **clamps on read**: `Math.min(selectedIndex, imageUrls.length - 1)`,
with a one-line comment saying why — a "Try again" refetch can return a shorter list, and
clamping on read beats an effect or a `key`, matching `searchParams.js`'s philosophy.
*Accept:* rows D1, D2, D3, D12, D16.

**Step 5 — `ListingCard` becomes a link; `BrowsePage` supplies `backTo`.**
`<article className="relative …">`; the `<h2>` wraps
`<Link to={...} state={{ backTo }} className="… after:absolute after:inset-0">`. Delete the
"Not a `<Link>` this cycle" comment — the omission it marked has ended. Add a comment at
`after:absolute after:inset-0` explaining it is what makes the card clickable while keeping
the link's accessible name to just the title, and that **removing `relative` from the
`<article>` silently spreads the hit area to the nearest positioned ancestor.**
*Accept:* rows D11, D12, D14, D16, plus the round trip — filter, click a card, click back,
land on the identical URL with the filter boxes repopulated.

## Verification

No test suite (`CLAUDE.md` forbids adding one). Manual against the dev server. Run the rows
a step names; run all of them once before Step 5 merges. **If a row fails, the step is
wrong — do not adjust the row.**

| # | Action | Expected |
|---|---|---|
| D1 | Listing with several images | Main image; strip with one button per image; first is `aria-pressed="true"` and visually selected |
| D2 | Click / Enter each thumbnail | Main image swaps; exactly one `aria-pressed="true"`; nothing shifts a pixel; main `alt` reads "…, image N of M" |
| D3 | Tab through the strip | Every thumbnail a tab stop with a visible focus ring, in DOM order; no trap; Space and Enter both activate |
| D4 | Listing with exactly one image | Main image, **no strip**; `alt` is just the card name (no ", image 1 of 1") |
| D5 | Listing with `imageUrls: []` | "No image" placeholder on `bg-zinc-50`; no strip; no `<img>` in the main slot |
| D6 | `marketPrice: null` | "No market price"; **no flag badge**, even if `priceFlagged` is `true` |
| D7 | `marketPrice` set, `priceFlagged: true` | Both prices and the neutral "Price flagged" badge; wording identical to the card |
| D8 | `description: null` | Muted "No description"; layout does not collapse |
| D9 | 250-char description, and one with newlines | Full text, no clamp; line breaks preserved; long unbroken strings wrap and never widen the page |
| D10 | Backend stopped, then "Try again" | `ErrorNotice` with the message verbatim; retry refetches and moves focus to the `<h1>`, which reads "Listing" |
| D11 | `/listings/<valid-but-unknown-uuid>` | `ErrorNotice` with the server's verbatim 404 text — the handler's `ex.getMessage()`, a raw unquoted string. Content-Type may be labeled `application/json` anyway; `client.js` already reads with `.text()`. Recorded in `BACKEND.md` §2 |
| D12 | `/listings/not-a-uuid` | **400, not 404** — never reaches `GlobalExceptionHandler`, falls to Boot's `/error`, whose JSON body carries no `message`. Renders `client.js`'s synthesized "Request failed with status 400". Address bar unchanged, no client-side rejection. Recorded in `BACKEND.md` §2 |
| D13 | `/listings/` (empty segment) | Falls through to `NotFoundPage` — `:id` does not match an empty segment |
| D14 | From `/?cardName=Charizard&condition=NM&page=2` → card → "Back to browse" | That exact URL byte-for-byte, including params the page ignores; filter boxes repopulated; pager shows page 3 |
| D15 | Paste a detail URL into a new tab, then refresh | "Back to browse" points at `/` and works; no crash, no empty `href` |
| D16 | 375 / 640 / 1024 widths | 375 and 640 single column; 1024 two columns; container and rhythm identical to `BrowsePage`; strip wraps rather than overflowing at 375 |
| D17 | Heading audit (loading, loaded, error) | Exactly one `<h1>`; no level skipped |
| D18 | Browse page after Steps 1-2 | DOM diff clean vs. before, on populated / empty / error pages; focus order unchanged |

## Open questions

All five closed or deferred by Luis on 2026-07-30, from backend source — no empirical
verification needed. D11 and D12 became assertions rather than investigations.

1. **CLOSED.** A 404 from `GET /api/listings/{id}` carries the handler's `ex.getMessage()` as a raw unquoted string. The response may be labeled `application/json` despite not being valid JSON, because `StringHttpMessageConverter` advertises `*/*`. The message is present and usable, so `ErrorNotice` always has real text to show. Recorded in `BACKEND.md` §2.
2. **CLOSED.** A malformed (non-UUID) `{id}` returns **400**, not 404 — it never reaches `GlobalExceptionHandler` (a plain `@RestControllerAdvice` that doesn't extend `ResponseEntityExceptionHandler`), falling instead to Boot's `/error`: JSON `{timestamp, status, error, path}` with no `message`. `client.js` synthesizes the text. Confirms the "forward verbatim, no client-side UUID check" decision — the 400 is the documented outcome, not a gap to patch. Recorded in `BACKEND.md` §2.
3. **CLOSED.** `priceFlagged` means **above** market: `askingPrice > marketPrice * 1.5`, an anti-scam signal for buyer protection. The `TODO(Luis)` is deleted and the badge reads "Above market value" (done in a follow-up commit after Step 1, deliberately kept out of Step 1 so its DOM-identity guarantee stayed reviewable). **Live caveat:** the 1.5× threshold means a listing 20% over market shows no badge, so the copy is directionally right but implies a lower trigger than the rule has.
4. **DEFERRED — current approach stands.** `ListingDetailsResponse` carries bare URL strings, so alt text is derived from `cardName` + position. Generic but honest; no backend change.
5. **DEFERRED.** `cardId` / `sellerId` stay omitted this cycle. Revisit when card search ships and there is a route to click through to.
