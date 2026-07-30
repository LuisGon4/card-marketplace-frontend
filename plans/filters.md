# Plan — The five remaining browse filters (`setName`, `condition`, `printing`, `minPrice`, `maxPrice`)

Extends `plans/homepage.md` and `plans/search.md`. Every convention shipped there —
zinc + `blue-700`, one `mx-auto max-w-5xl px-4` container, clamp-on-read URL state that
never rewrites the address bar, the single `role="status"` region, `useFetch` as the
only read path, draft-vs-committed state — still applies and is **not re-litigated here**.

This is the cycle `plans/search.md` §3.6 deferred to:

> When the second filter lands, the natural move is extracting a `FilterBar` component
> and lifting the draft into one object — do that then, with the information that cycle has.

Confirmed below (§6, decisions 2 and 3), with the correctness walkthrough §3.3 demanded.

**Written against BACKEND.md as amended 2026-07-28**, after Luis pasted the backend's price
filter and specification source, and against his locked decision that **`setName` is a text
input** (§6, LOCKED). Five questions that were open when this plan was started — currency, the
min/max pairing rule, inclusivity, the crossed-range behaviour, and the `setName` control shape
— are now answered, and this plan is designed on the answers rather than around them. §2 cites
every one.

**No step in this cycle is gated.** Two narrow, non-blocking `TODO(Luis)` items remain
(`setName` matching semantics; `priceAbove` inclusivity). Both affect copy and expectations
only — neither changes a control, a request, or a line of logic. §4.6 scopes each precisely.

---

## 1. Goal & scope

**Goal.** Complete the `GET /api/listings` filter surface. After this cycle every filter
BACKEND.md:11 documents has a visible, exercisable control, a URL param, a clamp, a place in
the results summary, and a place in the empty state — which is the coverage goal CLAUDE.md
states for the whole project.

Two things make this more than "add five inputs":

1. **Six filters is a different UI problem from one.** One text field wraps into a flex row;
   six controls plus sort is a layout, a state-shape, a commit-model, and a
   "what's-currently-applied" problem all at once. §3.2, §3.3, §3.6 and §3.7 handle those.
2. **`setName`'s matching semantics are still unverified, and the risk is now a copy risk.**
   Luis's locked decision settles the control (a text input). It does not settle whether the
   backend does a partial or an exact match (`BACKEND.md:49-51`). §4.2 states the assumption in
   bold, makes the failure mode concrete, and puts the mitigation in the empty-state copy.

### In scope

1. Read + clamp all five from the URL; send each only when non-empty.
2. Extract `src/components/FilterBar.jsx`; lift draft state into one object with a
   generalized, still lint-clean adjust-during-render sync.
3. One commit gesture for all six filters (Apply); sort keeps its on-change gesture.
4. `setName` as a text input **sharing one code path with `cardName`**, not a parallel
   implementation (§4.2).
5. `condition` and `printing` as single-select `<select>`s over the pinned enum values.
6. `minPrice` / `maxPrice` as an **independent optional pair** — either side alone is a valid
   submission — with a defined clamp, a submit-time format guard, and crossed-range copy in two
   places.
7. Generalize `hasSearch` → `hasFilters` across the empty states, the summary line, and the
   clear affordance. `clearSearch` becomes `clearAllFilters`.
8. `src/lib/listings.js` — the shared enum labels and price formatter, promoted out of
   `ListingCard.jsx` now that a second consumer exists.

### Explicitly NOT this cycle

- **A `<select>` for `setName`.** Locked out by Luis's decision, and unbuildable anyway — no
  endpoint returns a set list (§4.2).
- **Multi-select on `condition` / `printing`.** BACKEND.md documents neither repeated-param nor
  comma-joined semantics for them. See §4.3 and `TODO(Luis)` C — a contract question, not a
  design preference.
- **A price slider.** It needs catalogue min/max bounds; no aggregate endpoint exists, and
  inventing bounds is inventing data.
- **Filter chips / an "active filters" row.** Rejected with reasoning in §3.6 — the bar is
  always visible and always shows committed values, so chips would be a second rendering of
  state already on screen.
- **Copy that asserts an inclusive boundary for a min-only range** (e.g. "$10 and up"). See
  §4.4 and `TODO(Luis)` B — `priceAbove` is the one predicate nobody has read.
- **Any frontend compensation for an exact-match `setName`** — no wildcard wrapping, no
  lower-casing, no substring splitting. §4.2 says why that would be the wrong fix.
- Debounced or per-keystroke querying. Ruled out by Luis in `plans/search.md` §3.1.
- Sort direction beyond the three shipped options, page size, listing detail, any mutation.
- Tests, CI, any new dependency, any change to `client.js`, `useFetch.js`, `Header.jsx`,
  `AppLayout.jsx`, or any auth / CORS / cookie / CSRF code.

---

## 2. Verified facts (checked against this repo and the amended BACKEND.md — do not re-derive)

| Fact | Verified how |
|---|---|
| The endpoint accepts exactly `cardName?`, `setName?`, `condition?`, `printing?`, `minPrice?`, `maxPrice?`, flattened — no other filter param exists | `BACKEND.md:11` |
| Enum wire values are exact strings: `NM\|LP\|MP\|HP\|DMG` and `NORMAL\|HOLOFOIL\|REVERSE_HOLOFOIL` | `BACKEND.md:221`, echoed in the response shape at `BACKEND.md:70-71` |
| `cardName` is a **verified** case-insensitive partial contains-match, sent verbatim and edge-trimmed only | `BACKEND.md:21-24` |
| **`setName`, `condition` and `printing` matching semantics are explicitly unverified** — in particular whether `setName` is partial like `cardName` or exact | `BACKEND.md:49-51`. **Narrow and non-blocking now that the control shape is locked — §4.2.** |
| A space in a filter value may be `+`- or `%20`-encoded; both decode to a space. `URLSearchParams.toString()` emits `+` | `BACKEND.md:25-28`. **Directly relevant: `setName` values contain spaces far more often than `cardName` does. No hand-rolled encoding is needed.** |
| An empty value (`cardName=`) is undocumented and untested; omit the param instead | `BACKEND.md:29-30`. §4.4 extends this precedent to the price fields. |
| **`minPrice` / `maxPrice` are an independent optional pair.** Both → between-bounds; min only → lower bound only; max only → upper bound only; neither → no price predicate. Each is independently omittable and **a one-sided range is first-class** | `BACKEND.md:31-35`, confirmed from the backend filter source 2026-07-28 |
| **A crossed range (`min > max`) is not guarded server-side** — it returns **0 rows, not a 400**. An empty result is indistinguishable from a genuine no-match | `BACKEND.md:36-40`. *(Inferred from the absence of a guard; not yet exercised — Step 1 exercises it.)* **This is what decides §4.4's crossed-range design.** |
| **Price bounds are inclusive on both ends.** `cb.between(askingPrice, min, max)` and `cb.lessThanOrEqualTo(askingPrice, max)`. A listing priced exactly at a bound is included | `BACKEND.md:41-46` |
| …**including `priceAbove` (the min-only path) — verified 2026-07-29.** With five listings priced exactly $65.00, `?minPrice=65` returned all five plus the 3 above; `?minPrice=65.01` returned only the 3. All three predicates agree | `BACKEND.md`, price-bounds bullet. `TODO(Luis)` B **CLOSED** (§4.6); copy stays neutral by Luis's decision (§4.4). |
| **`minPrice` / `maxPrice` are `BigDecimal`** — decimals accepted, not just integers. **The `askingPrice` column's enforced scale is not documented; do not assume 2** | `BACKEND.md:47-48`. **This is why §4.4's clamp does not cap decimal places and why no `step` attribute is used.** |
| **Currency is USD**, a property of the deployment rather than the payload. Frontends format with `Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })`. No multi-currency support exists or is planned | `BACKEND.md:220`, confirmed by Luis 2026-07-28. **Closes `plans/homepage.md` §4 TODO #6 — no longer an assumption.** |
| No maximum filter-value length is documented or enforced client-side | `BACKEND.md:52` |
| The shipped price formatter already matches the documented convention, built once at module load | `src/components/ListingCard.jsx:11-14` |
| `ListingCard.jsx:6-8` still carries a stale `TODO(Luis)` saying currency is assumed and unconfirmed | `src/components/ListingCard.jsx:6-8` — now factually wrong; §5 Step 4 rewrites it |
| `PRINTING_LABELS` + `printingLabel` (with raw-string fallback) already exist and are used to render a listing's printing | `src/components/ListingCard.jsx:23-31`, consumed at `:77` |
| `condition` is deliberately rendered as the **raw code** on the card, not humanized | `src/components/ListingCard.jsx:77`, decided in `plans/homepage.md` §4 |
| The shipped `readCardName` already implements edge-trim, collapse-empty-to-`''`, clamp-on-read, no case change, no interior-whitespace change | `src/pages/BrowsePage.jsx:46-51`. **`setName` reuses this function rather than copying it — §4.2.** |
| `react-hooks/set-state-in-render` only fires when the `setState` sits in an **unconditional** block — the diagnostic is guarded by `else if (unconditionalBlocks.has(block.id))` | `node_modules/eslint-plugin-react-hooks/cjs/eslint-plugin-react-hooks.development.js:45428` (re-checked this cycle). **Net: the generalized guard in §3.3 stays lint-clean with no `eslint-disable`.** |
| `reactRefresh.configs.vite` is in the lint config and sets `allowConstantExport: true` | `eslint.config.js:14`; `node_modules/eslint-plugin-react-refresh/index.js:301` |
| …but `allowConstantExport` only exempts variable exports whose initializer is in `constantExportExpressions` | `node_modules/eslint-plugin-react-refresh/index.js:136`. **Net: `export function formatPrice()` and `export const currencyFormatter = new Intl.NumberFormat(...)` from `ListingCard.jsx` are not safely exempt. The shared vocabulary needs a non-component module — §6 decision 3.** |
| Tailwind v4 preflight **does not** neutralize number-input spinners; it only sets `height: auto` on `::-webkit-inner-spin-button` / `::-webkit-outer-spin-button` to correct the Safari cursor | `node_modules/tailwindcss/preflight.css:387-390`. **Net: `type="number"` ships visible steppers unless we add an arbitrary variant — §4.4.** |
| `::placeholder` contrast is a derived `color-mix`, not a fixed value | `node_modules/tailwindcss/preflight.css:296-301` — so every new input keeps `placeholder:text-zinc-500` explicitly, as the shipped field does (`BrowsePage.jsx:253`) |
| `useFetch(path)` re-runs on any `path` change and aborts the in-flight request; no manual refetch is needed | `src/hooks/useFetch.js:54-90` |
| `setSearchParams` functional updater copies `prev`, so unrelated params survive | `src/pages/BrowsePage.jsx:168-172`, `:176-184`, `:189-195` |
| The shipped guarded sync (the thing this cycle generalizes) | `src/pages/BrowsePage.jsx:115-134` |
| The shipped error block renders `error.message` verbatim with a Try again button | `src/pages/BrowsePage.jsx:306-319` — unchanged this cycle |
| The results summary is `break-words` and lives inside the page's only live region | `src/pages/BrowsePage.jsx:297-304` |

---

## 3. Design direction

### 3.1 One commit gesture for the filters, on-change for sort

**All six filters commit on submit. Sort keeps committing on change.**

Luis's `setName`-is-a-text-input decision makes this cleaner than it was: the bar now holds
**three** free-text fields (`cardName`, `setName`, and — as text inputs — the two price fields
make it four) against **two** selects. A model where the majority gesture is submit and two
controls behave differently is a worse story than one gesture for all six.

But the decisive argument is a defect, not a headcount. Suppose selects committed on change
while text fields committed on submit, over a shared draft object. The user types `Base Set`
into `setName`, then picks `NM` from the condition select. Two possible behaviours, both wrong:

- The select's commit writes **only** `condition`. The request now filters by condition alone,
  while `Base Set` sits visibly in the set-name box. The bar contradicts the results — precisely
  the failure `plans/search.md` §3.3 built the sync to prevent, now reintroduced field-by-field.
- The select's commit writes **the whole draft**. Picking a condition silently submits a
  half-typed set name the user had not finished. A gesture with an invisible side effect.

There is no third option, so mixed commit is out. One gesture for all six it is, and it must be
submit, because four of the six are free-text fields that cannot commit on change without
per-keystroke requests (ruled out by Luis).

**Sort stays on-change and stays outside the `<form>`.** The boundary is semantic, not
arbitrary: filters *narrow* the set and are composed before being applied together; sort
*reorders* the same set, is a single control with no draft, and has no companion to compose
with. Making sort require an Apply click would regress shipped behaviour for zero gain. §3.2
gives the two a visible boundary so the asymmetry is legible rather than surprising.

Consequences worth naming plainly:

- The shipped **"Search" button becomes "Apply filters."** It is still visible, still the form's
  only `type="submit"`, still commits on Enter from any field — Luis's locked decision
  (`plans/search.md` §6, "Visible Search button") is honoured, not re-opened. The *label* has to
  change because the button now applies six things.
- The shipped **"Clear" becomes "Clear all"** and clears all six. §3.6 covers what that means.
- A user who only wants "condition = NM" now clicks a select and then Apply — one more click
  than an instant-apply facet. That is the price of the coherence above, and it buys a user
  composing three filters exactly one request instead of three.

| | Lives in | Changes when | Triggers a request |
|---|---|---|---|
| **Draft** (6 filter values) | one `useState` object in `FilterBar` | every keystroke / select change | never |
| **Committed** (6 filter values) | the URL query string | Apply / Enter / Clear all / back-forward | yes, via `useFetch`'s `path` |
| **Sort** | the URL query string | select change | yes, immediately |
| **Page** | the URL query string | pager buttons; reset to 0 on any Apply / Clear / sort | yes, immediately |

### 3.2 Layout — six controls, one grid

The shipped bar (`BrowsePage.jsx:237`) is `flex flex-col gap-4 sm:flex-row sm:items-end
sm:justify-between`. Two flex children do not become six equal columns, so this cycle replaces
it with a **grid**, which is what actually aligns labels and controls across rows. The earlier
note — "it leaves the left edge free for the five future filters to wrap into" — was right that
they'd need room. They need a grid.

**All six filter groups share one shape**: `flex flex-col gap-1`, visible `<label>` above a
`w-full` control. No nesting, no `<fieldset>`, no special case for the price pair. Min and max
are two ordinary cells that happen to sit next to each other — which is exactly what
BACKEND.md:31-35 says they are: **an independent optional pair, not a compound control.** The
layout encodes the contract. `setName` being a text input means it too is just another cell,
identical in shape to `cardName`.

```
375px  (1 col)                640px  (2 cols)                        1024px+ (3 cols, container caps at max-w-5xl)
┌────────────────────────┐  ┌──────────────────────────────────┐  ┌──────────────────────────────────────────────────┐
│ ┌ filters ───────────┐ │  │ ┌ filters ─────────────────────┐ │  │ ┌ filters ─────────────────────────────────────┐ │
│ │ Card name          │ │  │ │ Card name    │ Set name      │ │  │ │ Card name   │ Set name    │ Condition        │ │
│ │ [________________] │ │  │ │ [__________] │ [___________] │ │  │ │ [_________] │ [_________] │ [Any          ▾] │ │
│ │ Set name           │ │  │ │ Condition    │ Printing      │ │  │ │ Printing    │ Min price   │ Max price        │ │
│ │ [________________] │ │  │ │ [Any      ▾] │ [Any        ▾]│ │  │ │ [Any     ▾] │ [_________] │ [_______________]│ │
│ │ Condition          │ │  │ │ Min price(USD)│Max price(USD)│ │  │ │                                              │ │
│ │ [______________ ▾] │ │  │ │ [__________] │ [___________] │ │  │ │ Min price is higher than max price, so        │ │
│ │ Printing           │ │  │ │                              │ │  │ │ nothing will match.        (only when crossed)│ │
│ │ [______________ ▾] │ │  │ │ (Apply filters) (Clear all)  │ │  │ │ (Apply filters) (Clear all)                   │ │
│ │ Min price (USD)    │ │  │ └──────────────────────────────┘ │  │ └──────────────────────────────────────────────┘ │
│ │ [________________] │ │  │                Sort by [_____ ▾] │  │                            Sort by [__________ ▾]│
│ │ Max price (USD)    │ │  └──────────────────────────────────┘  └──────────────────────────────────────────────────┘
│ │ [________________] │ │
│ │                    │ │
│ │ (Apply filters)    │ │
│ │ (Clear all)        │ │
│ └────────────────────┘ │
│ Sort by                │
│ [__________________ ▾] │
└────────────────────────┘
```

Concretely:

- Outer wrapper: `space-y-4`. Two children — the `<form>`, then the sort row.
- `<form role="search" onSubmit={…} className="space-y-4 rounded border border-zinc-200 p-4">`.
  The border does a communication job, not decoration: it draws the "these apply together, on
  Apply" boundary that makes sort's different gesture legible. It reuses `ListingCard`'s exact
  treatment (`rounded border border-zinc-200`, `ListingCard.jsx:54`), so no new visual
  vocabulary is introduced.
- Grid: `grid gap-4 sm:grid-cols-2 lg:grid-cols-3`. Same breakpoints as the results grid
  (`BrowsePage.jsx:371`), so the page has one column rhythm rather than two.
- Every control: `w-full` — the grid cell owns the width. **The shipped `sm:w-64` on the
  card-name input is dropped**; inside a grid cell it would leave dead space at ≥640px.
- Button row: `flex flex-wrap items-center gap-2`, after the grid, full width.
- Price hints (§4.4), when shown: between the grid and the button row, `text-sm text-zinc-700`,
  `id="priceHint"`.
- Sort row: `<div className="flex justify-start sm:justify-end">` wrapping the shipped sort
  group unchanged (`flex flex-col gap-1`, label above select). Right-aligned from 640px,
  full-width at 375px.

**375px is the honest case, and it is tall** — six stacked groups plus a button row plus the
sort row. Accepted deliberately. CLAUDE.md: *"Optimize for endpoint coverage and clarity, not
visual polish"* and *"A plain screen that clearly demonstrates a feature is a success."* Hiding
half the backend's documented filter surface behind a `<details>` disclosure to save vertical
space works directly against the stated purpose of the project. If Luis finds it intolerable in
practice, `<details>`/`<summary>` around the last four groups is the escape hatch — zero JS,
zero dependency, keyboard-accessible — but it is not the default, and it comes with a real
cost: an active filter can then be invisible.

### 3.3 Draft state becomes one object — and the sync stays correct

Six filters means six drafts. Twelve `useState` calls (six drafts + six `reconciled` copies) is
not a design, it is an omission. One object each.

The shipped guard (`BrowsePage.jsx:130-134`) compares two **strings**. An object cannot be
compared by identity — `committed` is rebuilt every render, so `!==` would always be true and
the guard would fire forever. It must be compared by value, and six chained `||`s is exactly the
kind of thing that rots when a seventh filter appears.

Instead, collapse the committed values to a single primitive **signature** and keep the
comparison a `!==` on a primitive — structurally identical to what shipped:

```jsx
// Fixed order, matching BACKEND.md:11's own ordering, so the signature is canonical.
const FILTER_KEYS = ['cardName', 'setName', 'condition', 'printing', 'minPrice', 'maxPrice']

// In BrowsePage: built from the clamped URL values, passed to FilterBar as `committed`.
const committed = { cardName, setName, condition, printing, minPrice, maxPrice }

// In FilterBar:
// JSON.stringify over a fixed key order is injective — two different filter sets can
// never collide. A naive join('|') can: setName 'a|b' with no condition produces the
// same string as setName 'a' with condition 'b'.
const signature = JSON.stringify(FILTER_KEYS.map((key) => committed[key]))

const [draft, setDraft] = useState(committed)
const [reconciledSignature, setReconciledSignature] = useState(signature)
if (reconciledSignature !== signature) {
  setReconciledSignature(signature)   // conditional → lint-clean (§2)
  setDraft(committed)
}
```

**Correctness, at the same level of detail `plans/search.md` §3.3 used.**

1. **Termination.** React re-runs the component synchronously after a render-phase `setState`,
   before committing anything to the DOM. On the re-run, `reconciledSignature` equals
   `signature` (we just set it) and `signature` is derived purely from `searchParams`, which
   cannot change during the re-run. The branch fires at most once per committed change. Exactly
   one extra render, same as shipped. No loop.
2. **No stale paint, no remount, no focus loss.** Nothing is committed to the DOM before the
   corrected render, so there is no flash of the old value — the `useEffect` anti-pattern
   `plans/search.md` §3.3 rejected. And no element is keyed on a changing value, so the focused
   input is never unmounted — the `key={cardName}` option it also rejected. Both rejections
   still hold, for the same reasons, at six fields instead of one.
3. **Back / forward / bookmark / Clear all snap every box to the URL.** Any committed value
   differing changes the signature, so all six drafts reset together. The bar can never show
   `condition = NM` above results filtered by `LP`.
4. **Changing only `page` or `sort` leaves every draft alone.** Neither is in `FILTER_KEYS`, so
   the signature is unchanged. A half-typed refinement survives paging and survives a sort
   change — which is the case that makes sort's different gesture (§3.1) safe.
5. **Submitting self-corrects the boxes.** `handleApply` computes the normalized draft (§4.5)
   and calls `setDraft(normalized)` **unconditionally** before calling `onApply`. Two paths,
   both correct: if the committed values change, the URL updates, the guard fires and sets
   `draft = committed`, which equals `normalized`; if they do not change (a whitespace-only
   edit, e.g. `"  Base Set  "` → `"Base Set"`), the guard never fires and this line is the only
   thing that trims the box. This *replaces* the shipped early-return-plus-`setDraft(q)` special
   case at `BrowsePage.jsx:212-215` with one unconditional line — simpler, and it removes
   FilterBar's need to know `page`.
6. **`react-hooks/set-state-in-render`.** Both `setState` calls remain inside `if (…)`, so the
   block is not in `unconditionalBlocks` and the diagnostic at
   `eslint-plugin-react-hooks.development.js:45428` does not fire. No `eslint-disable`.

The shipped "do NOT convert this to a `useEffect` / do NOT use `key=`" comment
(`BrowsePage.jsx:115-129`) moves with the code and gains one line about why the comparison is a
JSON signature rather than object identity.

### 3.4 The controls

| Filter | Control | Wire value | User sees |
|---|---|---|---|
| `cardName` | `type="search"` input *(shipped, unchanged)* | verbatim, edge-trimmed | label "Card name", placeholder `Charizard` |
| `setName` | `type="search"` input — **LOCKED by Luis; same code path as `cardName` (§4.2)** | verbatim, edge-trimmed | label "Set name", placeholder `Base Set` |
| `condition` | single `<select>`, 6 options | `''` \| `NM` \| `LP` \| `MP` \| `HP` \| `DMG` | "Any condition", then `NM — Near Mint`, `LP — Lightly Played`, `MP — Moderately Played`, `HP — Heavily Played`, `DMG — Damaged` |
| `printing` | single `<select>`, 4 options | `''` \| `NORMAL` \| `HOLOFOIL` \| `REVERSE_HOLOFOIL` | "Any printing", then `Normal`, `Holofoil`, `Reverse holofoil` |
| `minPrice` | `type="text" inputMode="decimal"` — **§4.4** | plain decimal string, verbatim | label "Min price (USD)", placeholder `ex: 0` |
| `maxPrice` | `type="text" inputMode="decimal"` — **§4.4** | plain decimal string, verbatim | label "Max price (USD)", placeholder `ex: 100` |

**`cardName` and `setName` are visually and behaviourally identical.** Same element, same
attributes, same styling, same handlers, same normalization. The only differences are `id`,
`name`, label text, and placeholder. §4.2 specifies this as one code path rather than two
parallel ones, which is also what makes it a Reviewer-checkable property rather than a
convention someone has to remember.

**The placeholder is `Base Set`, a full set name, not a fragment.** Deliberate: under a partial
match it is a perfectly good example, and under an exact match it is the *only* kind of input
that works. The placeholder hedges the open question at zero cost (§4.2).

**Neither price field is ever required, disabled, or defaulted.** BACKEND.md:31-35 makes a
one-sided range first-class — min-only and max-only each have their own server code path — so
the UI must treat each bound as an independently omittable filter that happens to sit beside its
sibling. No "you must fill both", no auto-filling the empty side with 0 or a catalogue maximum,
no disabling max until min is set.

**Why `NM — Near Mint` and not one or the other.** `plans/homepage.md` §4 decided the card
renders the raw code because it is collector vernacular, and that shipped (`ListingCard.jsx:77`).
If the filter said "Near Mint" and every result said "NM", the user would have to translate. But
a bare "NM" in a dropdown, with no price or card beside it for context, is an acronym quiz for
anyone who is not already a collector. Leading with the code keeps it consistent with the
results; the expansion teaches it once. *(If Luis prefers `NM (Near Mint)`, that is a one-line
change in `src/lib/listings.js`.)*

**Printing labels are not re-typed.** `PRINTING_LABELS` already exists at `ListingCard.jsx:23-27`.
Duplicating a three-entry map into the filter options is the exact two-sources-of-truth drift the
shipped `emptyStateCopy` comment argues against (`BrowsePage.jsx:53-56`). It moves to
`src/lib/listings.js` and both consumers import it — §6 decision 3.

**Why "Any condition" and not "All conditions".** The option removes the filter; the results then
contain every condition. "Any" is what the user is expressing ("I don't care"), which is the
interface's job to name.

### 3.5 Accessibility (WCAG 2.2 AA)

Everything in `plans/search.md` §3.5 still applies. New this cycle:

- **Still exactly one live region.** The `role="status" aria-live="polite"` block at
  `BrowsePage.jsx:297` remains the only one. Nothing added here gets `aria-live`,
  `role="status"`, or `role="alert"`. `plans/search.md` §3.5 is emphatic and the reason scales
  badly with six filters: a second region would race the summary on every Apply.
- **Every control has a visible `<label htmlFor>`**, `id`, and `name`. Five new label/control
  pairs. Never a placeholder-as-label — which matters doubly for `setName`, whose placeholder is
  carrying an example, not a name.
- **`role="search"` stays on the form.** The ARIA definition is "a landmark region that contains
  a collection of items and objects that, as a whole, combine to create a search facility" — a
  six-field filter form for a catalogue is squarely that.
- **Implicit submission works from every field** because the form contains a `type="submit"`
  button. Enter in the max-price field applies the filters, same as Enter in card name.
  `enterKeyHint="search"` on both text-search fields.
- **Every non-submit button carries `type="button"`.** Same trap as last cycle: a bare `<button>`
  in a form defaults to submit. Clear all, the pager, Try again, and both empty-state buttons all
  need it.
- **The price hints are wired with `aria-describedby="priceHint"` on both price inputs**, not a
  live region. A screen-reader user hears the hint on focus, which is where they can act on it.
  When no hint is rendered the dangling `aria-describedby` is inert and harmless.
- **Focus after Clear all.** Clear all only renders while ≥1 filter is committed, so activating it
  unmounts the focused element — and the empty-state "Clear all filters" button unmounts its whole
  block. Both share one handler that moves focus to the card-name input, extending the shipped
  precedent at `BrowsePage.jsx:199`. Mechanism in §6 decision 3.
- **Focus after a blocked Apply** (unparseable price, §4.4): focus moves to the first offending
  field, so the hint that just appeared is the field's own description.
- **Focus after a successful Apply.** Nothing unmounts; focus stays on the Apply button. No
  intervention.
- **Contrast.** Labels `text-zinc-700`, secondary `text-zinc-600`, placeholders explicitly
  `placeholder:text-zinc-500` (§2). Nothing at `zinc-400`.
- **Target size (SC 2.5.8).** `px-2 py-1.5 text-sm` / `px-3 py-1.5 text-sm` gives ~32px, matching
  every shipped control. Above the 24px minimum.
- **Focus ring** on every new element:
  `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700`.
- **Tab order is DOM order is visual order** — the grid uses no `order-*` utilities, so source
  order and reading order match at every breakpoint.
- No `aria-controls` (poor SR support, buys nothing — unchanged from last cycle).

### 3.6 What's applied, and clearing it

Six filters can be silently active while the user sees only a short list. Three things handle
that, and one tempting thing is deliberately rejected.

**Rejected: a filter-chip row.** It is the standard e-commerce pattern, and it is wrong *here*,
for a structural reason rather than a taste one. On Amazon the facet controls are collapsed or
off-screen, so chips are the only visible record of what's applied. Our filter bar is always
visible, and §3.3's sync guarantees every control displays its committed value at all times.
**The controls already are the active-filter display.** A chip reading "Condition: NM" directly
below a select reading "NM — Near Mint" is a second rendering of state already on screen — more
DOM, more accessible names to get right, more to keep in sync, for zero information gained.

**1. The summary line enumerates.** `plans/search.md` §3.7's argument was that this line *is* the
announcement — it sits in the page's only live region, so it is what a screen-reader user hears
after every Apply. That argument gets stronger with six filters, not weaker: "23 listings" alone
tells a screen-reader user nothing about which of six filters landed. A count ("matching 3
filters") is no better — it confirms a number, not the query. So it enumerates:

| Case | Text |
|---|---|
| no filters, `totalPages > 0` | `Showing page 1 of 5 · 87 listings` *(shipped, unchanged)* |
| no filters, `totalPages === 0` | `0 listings` *(shipped, unchanged)* |
| ≥1 filter, `totalPages > 0` | `Showing page 1 of 2 · 23 listings matching card name “charizard”, condition NM, price from $10.00` |
| ≥1 filter, `totalPages === 0` | `0 listings matching set name “Base Set”, price from $10.00 to $50.00` |

Descriptors, built by one `describeFilters(committed)` returning an array in `FILTER_KEYS` order
and joined with `, `:

- `card name “charizard”`, `set name “Base Set”` — quoted; the `<p>` is already `break-words`
  (`BrowsePage.jsx:300`), so a 300-character value wraps rather than scrolling. React escapes the
  text, so echoing user input is safe.
- `condition NM` — the raw code, matching the card (`ListingCard.jsx:77`).
- `printing Holofoil` — the label, matching the card.
- Prices collapse into **one** descriptor, formatted with the shared `formatPrice`:
  `price from $10.00 to $50.00` / `price from $10.00` / `price up to $50.00`. Spelled "from"/"to"
  rather than an en dash because a screen reader's handling of `–` is inconsistent. **The wording
  deliberately asserts no boundary rule** — see §4.4.

*Note: the shipped single-filter string changes from `23 listings matching “charizard”` to
`23 listings matching card name “charizard”`. Intentional — with six filters, and specifically
with two near-identical text fields, the bare quote no longer says which field matched. It is the
only shipped copy string this cycle changes besides the two button labels.*

**2. "Clear all" replaces "Clear."** Renders only when ≥1 filter is committed. Deletes all six
`FILTER_KEYS`, sets `page=0`, **never touches `sort`** (shipped precedent,
`BrowsePage.jsx:189-195`), and moves focus to the card-name input.

**3. The empty state names the filters** — §3.7 below.

### 3.7 Empty states — generalizing the boolean, without regressing

`hasSearch = cardName !== ''` (`BrowsePage.jsx:161`) becomes:

```js
const hasFilters = FILTER_KEYS.some((key) => committed[key] !== '')
```

`plans/search.md` §3.4 names the defect class: a filtered miss must never render "No listings
yet", because it states something false about the data. That must not regress now that five more
filters can cause a miss.

**Two rows are new, and each exists because the contract forced it:**

- **The crossed-range row.** BACKEND.md:36-40: a crossed range returns 0 rows, not a 400. So the
  *only* thing that can explain it is this table. It takes top precedence, because when the range
  runs backwards no other explanation is true — the card name is fine, the page number is
  irrelevant, nothing can match at any page.
- **The `setName`-only row.** This is the mitigation for the open matching-semantics question
  (§4.2). Its body gives direction that is good advice under a partial match and *rescuing* advice
  under an exact one, without the copy asserting which is true.

| Condition (evaluated in this order) | Heading | Body | Actions |
|---|---|---|---|
| **committed `min > max`** | **Min price is higher than max price** | Nothing can match a range that runs backwards. Swap the two amounts, or clear one. | Clear all filters *(· Back to first page if `page > 0`)* |
| no filters, page 0 | **No listings yet** | When sellers post cards, they'll appear here. | — |
| no filters, `page > 0` | **Nothing on this page** | This page is past the end of the results. | Back to first page |
| only `cardName`, page 0 | **No listings match “{query}”** | Check the spelling, or search a shorter part of the name. | Clear all filters |
| only `setName`, page 0 | **No listings match set “{query}”** | Check the spelling, and try the full set name — “Base Set” rather than “Base”. | Clear all filters |
| any other set, page 0 | **No listings match these filters** | Filters: {descriptors}. Try removing one. | Clear all filters |
| any filters, `page > 0` | **Nothing on this page** | No more results for these filters past this page. | Back to first page · Clear all filters |

- **Note the deliberate asymmetry between the two text-field rows.** `cardName` is a *verified*
  partial match, so "search a shorter part of the name" is correct advice. `setName` is not
  verified, so its row says the opposite — try the *fuller* name. That is not an inconsistency to
  clean up; it is the one place in the UI where the open question is hedged, and the Coder carries
  a comment saying so. If `TODO(Luis)` A closes as "partial", this line can be relaxed to match
  `cardName`'s; if it closes as "exact", this line was already right.
- The crossed row is keyed on the **committed** values, not the draft — the empty state describes
  the result that is on screen, which was produced by what was committed. The filter-bar hint
  (§4.4) is keyed on the **draft**, because it describes what you are about to apply. Two
  different sources for two different jobs; it looks like an inconsistency and is not, so the
  Coder carries a comment saying so.
- The `cardName`-only row keeps the shipped copy **verbatim** (`BrowsePage.jsx:70-74`).
- `{descriptors}` reuses the same `describeFilters()` as §3.6. One source of truth for "what is
  applied", rendered in two places, the same discipline the shipped `emptyStateCopy` comment
  argues for (`BrowsePage.jsx:53-56`).
- "Try removing one", "Swap the two amounts", "try the full set name" are all direction, not mood
  — an empty screen is an invitation to act.
- The block stays **outside** the live region and keeps `border-dashed border-zinc-300 p-8
  text-center`. No `role`, no `aria-live` (§3.5).

### 3.8 The pager, unchanged

Still rendered unconditionally; on a filtered miss it reads `Page 1 of —` with both buttons
disabled, produced by the existing `totalPages === 0` guard (`BrowsePage.jsx:400`). **No change,
and not a review finding.** Recorded again so nobody "fixes" it.

---

## 4. Data & contracts

### 4.1 The request

```
GET /api/listings?page={n}&size=20&sort={sort}[&cardName=…][&setName=…][&condition=…][&printing=…][&minPrice=…][&maxPrice=…]
```

- Every param is documented at `BACKEND.md:11`. **No param is added that is not on that line.**
  No `sortDirection`, no `size` control, no aggregate/count endpoint, no set list.
- Each filter is **omitted entirely** when its clamped value is `''`. Never `setName=`, never
  `condition=`, never `minPrice=` — `BACKEND.md:29-30` says empty-value behaviour is undocumented
  and untested, and `BACKEND.md:31-35`'s "each bound is independently omittable" makes omission
  the documented way to disable one side of the range.
- Emission order is fixed: `page`, `size`, `sort`, then the filters in `FILTER_KEYS` order
  (BACKEND.md:11's own order). Deterministic, so the network tab is eyeball-checkable.
- Built by extending the existing `URLSearchParams` block at `BrowsePage.jsx:136-145`. No new
  fetch call site, no change to `client.js`, no change to `useFetch`.
- **Spaces need no special handling.** `URLSearchParams.toString()` emits `+`, and
  `BACKEND.md:25-28` verified `+` and `%20` both decode to a space. This matters most for
  `setName`, whose values contain spaces routinely ("Base Set", "Sword & Shield").

### 4.2 `setName` — control locked, semantics still open

**`setName` is a text input. LOCKED by Luis** (§6, decisions table). Not a select — and a select
was never buildable anyway: no endpoint in BACKEND.md returns a set list. `GET /api/cards`
(`BACKEND.md:114`) requires a `name` param and returns `Card[]`; harvesting distinct `setName`
values out of a card search would be (a) scoped to whatever card name you searched, (b) not a set
index, and (c) inventing a data source.

> ## **ASSUMPTION: `setName` is a case-insensitive partial (contains) match, like `cardName`.**
> **This is not verified. `BACKEND.md:49-51` says so, and no partial-match claim has been written
> into the contract, because recording an inference as a verified fact is exactly what this
> project's rules forbid. It is `TODO(Luis)` A — narrow, non-blocking, and it gates no step.**

**Why this is the outcome to design for:**

1. `cardName` is a *verified* case-insensitive partial match on the same endpoint
   (`BACKEND.md:21-24`), bound from the same flattened `ListingFilter` object
   (`BACKEND.md:242`). A filter class that builds `like %x%` for one string field and `equals`
   for its sibling string field is unusual.
2. The backend's documented convention for string filters is partial: `GET /api/cards` takes
   `name` and `BACKEND.md:114` calls it a partial match too.
3. A text input is what Luis chose, and a text input *implies* partial matching to anyone using
   it. That expectation is precisely what makes the risk below legible.

**The concrete stakes if the assumption is wrong.** A user types `Base` against a catalogue whose
set is named `Base Set`. Under an exact match the server returns **zero rows** — a 200, not an
error, so there is nothing for the error block to show and nothing in the request to flag. The
filter simply appears broken, and the user has no way to find out that they needed the full
string. This is a **copy-and-expectations problem, not a rebuild**: the control shape is right
under either semantics, no request changes, no logic changes. It gates nothing.

**Three cheap hedges are built in now**, so the failure mode is survivable without asserting
anything:

1. The placeholder is `Base Set` — a **full** set name. Good example under partial matching; the
   only working shape under exact matching.
2. The `setName`-only empty state (§3.7) says *"Check the spelling, and try the full set name —
   “Base Set” rather than “Base”."* Correct advice under either answer.
3. The Coder carries a comment at the control and at that copy string pointing to `TODO(Luis)` A,
   so whoever closes it knows which two lines to revisit.

**What the frontend must not do.** No wildcard wrapping, no lower-casing, no splitting the input
into tokens, no client-side filtering of the response. `BACKEND.md:23-24` states that rule for
`cardName` and it applies identically here. If verification comes back "exact match", the right
fix is a **backend** change — make it partial, or add a sets endpoint — not frontend magic that
hides a backend behaviour and breaks the moment the backend changes.

**One code path, not two.** `setName` and `cardName` share every rule, and share the
implementation of every rule:

| Rule | Where it lives |
|---|---|
| Edge-trim on read from the URL; absent / `''` / whitespace-only all collapse to `''` | `readTrimmed(searchParams, key)` — the shipped `readCardName` (`BrowsePage.jsx:46-51`) generalized to take a key. **One function, called twice.** |
| Edge-trim on write (submit normalization) | the same `readTrimmed`-equivalent trim inside `handleApply`'s `normalized` build |
| Omit the param entirely when empty | the `FILTER_KEYS` loop in the request builder — **key-driven, so it cannot treat the two differently** |
| Never collapse or alter interior whitespace (`dark   magician`, `Sword  &  Shield` go verbatim) | a consequence of trim-only; no other transform exists anywhere in the path |
| Never change case | same |
| Clamp on read only; the address bar is never rewritten | same |
| Control attributes: `type="search"`, `enterKeyHint="search"`, `spellCheck={false}`, `placeholder:text-zinc-500`, `w-full`, shared focus ring | one shared JSX shape in `FilterBar`; the two differ only in `id`, `name`, label, and placeholder |

This is specified as a shared path rather than a convention precisely so the Reviewer can check
it structurally: **if `setName` has its own read helper, its own trim, or its own request branch,
that is a finding.**

### 4.3 `condition` and `printing`

Wire values are pinned exactly at `BACKEND.md:221` and echoed in the response shape at
`BACKEND.md:70-71`. Their *matching* semantics are grouped with `setName` as unverified
(`BACKEND.md:49-51`), but unlike `setName` there is nothing an enum could plausibly be except an
equality match — there is no "partial NM". Step 1 confirms it in passing; it gates nothing.

- **Single-select, not multi-select.** BACKEND.md:11 lists `condition?` as one query param and
  documents **neither** repeated-param nor comma-joined semantics. The sibling endpoint
  `GET /api/cards/{id}/valuation` (`BACKEND.md:115`) takes `condition` as a single enum, and
  `BACKEND.md:242` describes `ListingFilter` as a flattened object — consistent with a scalar
  field. Sending `condition=NM&condition=LP` to a scalar Spring binding either takes the first
  value or 400s; in the first case **the UI would show two conditions checked while filtering by
  one** — a lie about what's on screen. Not a guess worth making. Multi-select is `TODO(Luis)` C:
  it needs a documented contract first, and possibly a backend type change.
- **Clamped case-sensitively** against the pinned sets. `?condition=nm` clamps to `''`, not to
  `NM`. `BACKEND.md:221` says "exact strings"; up-casing would be the frontend guessing that the
  server tolerates lowercase, and a hand-edited URL is not a user gesture worth rescuing. Same
  posture as `clampSort` (`BrowsePage.jsx:42-44`).
- An unknown value falls back to `''` (filter off) rather than reaching the API, where a bad enum
  is a documented 400 (`BACKEND.md:115` shows the pattern on the valuation endpoint).

### 4.4 `minPrice` / `maxPrice` — now specified, and designed on the specification

Four things that were open are now settled in the contract, and the design follows each:

| Settled | `BACKEND.md` | What the frontend does about it |
|---|---|---|
| Independent optional pair; one-sided ranges are first-class | 31-35 | Two independent inputs. Neither required, disabled, or defaulted. Each sent only when non-empty. |
| Wire type is `BigDecimal`; decimals accepted; **column scale undocumented** | 47-48 | The clamp accepts any number of decimal places and sends the value verbatim. **No rounding, no flooring, no integer coercion, no `step` attribute.** |
| Bounds inclusive (`between`, `lessThanOrEqualTo`) | 41-46 | No code change — copy *may* now assert inclusivity. It deliberately doesn't yet; see the `priceAbove` gap below. |
| Crossed range → 0 rows, **not a 400** | 36-40 | Sent verbatim, plus copy in two places. Full reasoning below. |
| Currency is USD | 220 | Labels say "(USD)"; the summary formats with the shared `formatPrice`. |

**Control: `type="text"` + `inputMode="decimal"`. Not `type="number"`, and no `step`.** Four
reasons, in order of weight — the first comes straight from the amended contract:

1. **`step` would bake in a scale the contract explicitly warns against.** `BACKEND.md:47-48` says
   the `askingPrice` column's enforced scale is *not documented* and not to assume 2. `step="0.01"`
   asserts exactly that assumption, and would mark `10.005` `:invalid`. `step="any"` avoids it but
   then the native steppers increment by 1, which is useless for prices. `step` only applies to
   `type="number"` anyway, so choosing `text` retires the question. Decimal acceptance is met by
   the clamp accepting decimals — which is where it belongs, since we must clamp untrusted URL
   input regardless.
2. **`type="number"` destroys the draft.** When a value fails the browser's sanitization algorithm,
   `input.value` reads as `''` in Chrome and Safari. The user types `12,50` and the draft receives
   an empty string — so the box cannot show what was typed, the §3.3 sync cannot round-trip it, and
   there is nothing to validate or explain. A draft that silently loses characters is not a draft.
3. **The scroll wheel mutates a focused number input.** A user who tabs into Min price and then
   scrolls to look at the results silently changes their filter.
4. **The steppers do not go away for free.** Tailwind v4 preflight only sets `height: auto` on
   `::-webkit-inner-spin-button` / `::-webkit-outer-spin-button` (verified,
   `preflight.css:387-390`) — it does not remove them. Hiding them needs an arbitrary variant like
   `[&::-webkit-outer-spin-button]:appearance-none`, against CLAUDE.md's "no arbitrary values" rule.

Cost of `text` + `inputMode="decimal"`: no native stepper, no native validation. Both fine — mobile
still gets the numeric keypad.

**Clamp on read (`readPrice`), defined exactly:**

```js
function readPrice(raw) {
  const s = (raw ?? '').trim()
  if (s === '') return ''
  // Plain non-negative decimal only: no sign, no exponent, no thousands separators.
  // Decimal places are deliberately NOT capped — BACKEND.md:47-48 says minPrice/maxPrice
  // are BigDecimal and the column's enforced scale is undocumented, so capping at 2 would
  // be the frontend inventing a constraint the contract warns against.
  // Rejects '-1', '1e5', '1,000', '10.', '.', 'abc', ''.
  if (!/^\d*(\.\d+)?$/.test(s)) return ''
  // A 400-digit string passes the regex but parses to Infinity. Same class of guard as
  // clampPage's Number.isSafeInteger note (BrowsePage.jsx:29-35).
  if (!Number.isFinite(Number(s))) return ''
  return s
}
```

- **No cap on decimal places, and no upper bound.** Both would invent constraints BACKEND.md does
  not state. `Number.isFinite` is a principled guard against a genuinely unrepresentable value, not
  an invented ceiling.
- **Returns the trimmed original string, not `String(Number(s))`.** `10.50` stays `10.50` rather
  than becoming `10.5`; `007` passes through. The URL says what the user typed, and `BigDecimal`
  parses all of it. Normalizing would be a second rule for no gain — and `BACKEND.md:47-48` says
  explicitly not to coerce.
- `.5` is accepted (`\d*` allows an empty integer part). `10.` and `.` are rejected.
- Clamped on read only. **The address bar is never rewritten** — same precedent as `clampPage` /
  `clampSort` / `readTrimmed`.

**Unparseable input blocks the submit.** If a price draft is non-empty but `readPrice` returns
`''`, Apply is blocked: `onApply` is not called, no request fires, the drafts are untouched, a hint
renders in the price-hint slot — *"Enter a plain amount, like 12.50."* — and focus moves to the
first offending field.

This is validation of **our own URL/param contract**, not a workaround for a server 4xx. CLAUDE.md
forbids mutating a request the server rejected; this never sends a request at all, and never alters
what the user typed. Same posture `BACKEND.md:29-30` prescribes for empty values: don't construct a
param whose server behaviour is undocumented.

**A crossed range is sent, not blocked — and it gets copy in two places.**

`BACKEND.md:36-40` closed the question I would otherwise have had to weigh: the server does not
guard this. There is no validation branch; the crossed bounds go into the between-predicate and it
returns **0 rows, not a 400**. So "let the server answer" is not available as a design — the
server's answer is silence, indistinguishable from a genuine no-match.

Three options, and the line between them matters:

- ***Auto-swap the bounds.*** **Rejected outright.** Silently searching for a range the user did not
  type is exactly the "work around backend behaviour by changing the request shape" instinct
  CLAUDE.md forbids, and the user would never learn what happened.
- ***Block the submit, like the unparseable case.*** Spares one pointless request and makes the
  confusing state unreachable. **Rejected**, for a reason worth stating precisely: the query is
  *legal and well-formed*, and its result is *correct* — 0 rows genuinely is the right answer to
  "price ≥ 100 AND price ≤ 10". Blocking would have the frontend refuse a valid request on a rule
  the contract does not contain. Keeping that line sharp is what makes the unparseable-input block
  defensible: **the frontend blocks only what it cannot construct, never what it disagrees with.**
  Blur that line here and the next reader has no principle to apply. It also hides a real backend
  behaviour, in a project whose stated purpose (CLAUDE.md) is making backend behaviour visible.
- ***Send it, and explain it at both moments the user could be confused.*** **Chosen.**

The mystery — the only real objection to sending it — is fully solved by copy, in two places that
answer two different questions:

1. **Before Apply**, in the filter bar's price-hint slot, keyed on the **draft**: *"Min price is
   higher than max price, so nothing will match."* Answers "what am I about to do?" Wired via
   `aria-describedby="priceHint"` on both price inputs, not a live region (§3.5).
2. **After Apply**, as the top-precedence empty-state row (§3.7), keyed on the **committed**
   values: heading *"Min price is higher than max price"*, body *"Nothing can match a range that
   runs backwards. Swap the two amounts, or clear one."* Answers "why is this screen empty?"

Neither touches the request. The cost is one wasted round-trip, which is the honest price of not
asserting a rule the contract doesn't have.

**And if the server ever does 400 a crossed range** — `BACKEND.md:36-40` marks this as inferred
from source, not yet exercised — the shipped error block at `BrowsePage.jsx:306-319` renders
`error.message` verbatim, unmodified. That is already correct and needs no new code. Step 1
exercises it; if it 400s, report it and amend BACKEND.md. Do not add client-side prevention
afterwards.

**Inclusivity: confirmed, but the copy stays neutral this cycle.** `BACKEND.md:41-46` confirms
**UPDATED 2026-07-29 — `TODO(Luis)` B is CLOSED; the original reasoning below is superseded.**
All three predicates are confirmed inclusive, including the min-only `priceAbove` path
(`BACKEND.md`, price-bounds bullet; verified with five listings priced exactly $65.00). Copy is
therefore *permitted* to assert a boundary rule — and **Luis decided on 2026-07-29 to keep the
neutral wording anyway.** Rationale: "from $10.00" and "up to $50.00" already read as inclusive
in ordinary English, and the descriptors render inside the page's only live region, so asserting
the rule adds words to an announcement that fires on every Apply in order to resolve an ambiguity
most users never felt. The value of closing B was never the copy — it was knowing the filter is
inclusive on every path, so nothing in the UI has to hedge or warn about boundary behaviour.

So: descriptors read `price from $10.00 to $50.00` / `price from $10.00` / `price up to $50.00`,
asserting no boundary rule — now a deliberate copy choice rather than a hedge against an unread
predicate. **Do not add "and up" / "or less" / "inclusive" wording.** See §4.6 item B.

*(Superseded reasoning, kept for the record: the copy was originally neutral because `priceAbove`
was unread, and asserting inclusivity for only the max-only and both-bounds cases would have
produced asymmetric copy worse than neutral copy.)*

**Currency in the UI.** Labels are "Min price (USD)" / "Max price (USD)". A `$` prefix span would
need `aria-hidden` plus a flex wrapper and would leave a screen-reader user with a label that never
mentions currency; `(USD)` in the label is one DOM node, fully announced, and unambiguous. The
summary's price descriptor uses the shared `formatPrice`, which is the convention `BACKEND.md:220`
documents, so the filter and the cards speak one format.

### 4.5 Reading everything from the URL

| Param | Helper | Rule |
|---|---|---|
| `page` | `clampPage` *(shipped, `BrowsePage.jsx:27-37`)* | unchanged |
| `sort` | `clampSort` *(shipped, `:42-44`)* | unchanged |
| `cardName` | `readTrimmed(searchParams, 'cardName')` | the shipped `readCardName` (`:46-51`) generalized to take a key |
| `setName` | `readTrimmed(searchParams, 'setName')` | **the same function, same call shape** (§4.2) |
| `condition` | `clampEnum(raw, CONDITION_VALUES)` | exact, case-sensitive; else `''` |
| `printing` | `clampEnum(raw, PRINTING_VALUES)` | exact, case-sensitive; else `''` |
| `minPrice` / `maxPrice` | `readPrice` (§4.4) | as defined; each independently |

All clamping on read; the address bar is never rewritten. `?condition=bogus&minPrice=-5` renders
the unfiltered catalogue and sends neither param.

*One deliberate consequence of §6 decision 2's dedupe:* a **submit** with a junk param in the URL
(e.g. `?condition=bogus`) does rewrite it away, because the next params are built from the clamped
drafts. That is a user gesture producing a corrected URL, not a read-time rewrite. It does not
violate the clamp-on-read rule.

### 4.6 `TODO(Luis)`

**Nothing here blocks a step.** A, B and D were closed by Step 1's verification experiment on
2026-07-28 and are recorded below as answered; `BACKEND.md` has been amended with each result.

- **A. ~~`setName` matching semantics: partial or exact?~~ CLOSED — exact and case-sensitive.**
  Verified against the running dev backend and re-verified independently by the Orchestrator:
  against `Scarlet & Violet 151`, the exact string returns 13 rows while `scarlet`,
  `SCARLET & VIOLET 151` and `151` each return 0. `cardName` remains case-insensitive partial.
  **Consequence: Luis cut the `setName` control (§6, §5 Step 3).** The predicted failure was
  real and worse than modelled — it is not just exact, it is case-sensitive, so even a correctly
  spelled full set name fails on capitalisation. The remaining decision is Luis's and is a
  **backend** one: make `setName` match `cardName`, or leave the asymmetry and keep the control
  cut. The frontend must not compensate (CLAUDE.md).
- **B. ~~`priceAbove` inclusivity.~~ CLOSED — inclusive (`>=`).** Verified: with five listings
  priced exactly $65.00, `?minPrice=65` returned 8 rows including all five; `?minPrice=65.01`
  returned only the 3 above. All three price predicates now agree. **Consequence: §4.4's
  neutral price copy may now assert a boundary rule** ("$10 and up", "or less") if desired — a
  one-line change in `describeFilters`, and the only reason it stayed neutral has gone. Not
  done automatically; it is a copy decision, not a correctness one.
- **D. ~~Crossed range: 400 or 0 rows?~~ CLOSED — HTTP 200 with 0 rows**, exactly as inferred.
  `?minPrice=100&maxPrice=10` → `{"content":[],"totalElements":0,"totalPages":0}`. **Consequence:
  §4.4's design stands unchanged** — the server will never surface a crossed range, so the
  client-side copy at both moments (draft hint in the bar, top-precedence empty-state row) is
  the only thing that can explain it. Step 1 shipped the empty-state row; the draft hint is
  Step 5.
- **C. `TODO(Luis)` — multi-select would need a documented contract first.** BACKEND.md documents
  neither repeated-param nor comma-joined semantics for `condition` / `printing`. If Luis wants
  multi-select, that is a BACKEND.md addition (and possibly a `List<Condition>` field) before any
  UI. §4.3 ships single-select and does not guess.
- **D. `TODO(Luis)` — the crossed-range 0-rows behaviour is inferred, not exercised**
  (`BACKEND.md:36-40` says so). Step 1 exercises it. §4.4's design is correct under either answer —
  0 rows gets the empty-state row, a 400 gets the shipped verbatim error block — so this gates
  nothing, but the contract should record which it is.
- **E. `TODO(Luis)` — `askingPrice`'s enforced column scale is undocumented**
  (`BACKEND.md:47-48`). The frontend caps nothing and coerces nothing. If the backend rounds or
  rejects a high-precision bound, that surfaces in the results or the verbatim error block —
  report it, do not add client-side rounding.
- **F. `TODO(Luis)` — no maximum filter-value length is documented** (`BACKEND.md:52`). The
  frontend imposes none. An over-long value surfaces as a 4xx in the existing error block,
  verbatim — report it, do not add client-side truncation.
- **G. Carried forward from `plans/homepage.md` §4, still open:** `priceFlagged` semantics (#5), no
  username source (#3), auth flow human-owned (#7). Sort direction (#4) is answered by
  `BACKEND.md:259`.

**CLOSED since this cycle began** — do not carry these forward:

- **`setName` control shape.** Text input. Locked by Luis (§6 decisions table).
- **Currency (`plans/homepage.md` §4 TODO #6).** USD, `BACKEND.md:220`. The stale comment at
  `ListingCard.jsx:6-8` is rewritten in Step 4 and **in no other step**.
- **Price pairing rule.** Independent optional pair, `BACKEND.md:31-35`.
- **Price wire type.** `BigDecimal`, decimals accepted, `BACKEND.md:47-48`.
- **Inclusivity for the both-bounds and max-only paths.** Inclusive, `BACKEND.md:41-46`. (Min-only
  remains as narrow item B.)
- **Crossed-range server behaviour.** No guard, 0 rows not a 400, `BACKEND.md:36-40`.

---

## 5. Step-by-step build order

Six steps, each a separate Coder invocation and Reviewer pass. **No step is gated.** Steps are
ordered smallest-risk-first after the two structural ones, so each Reviewer pass has a small diff.

*Merge note for Luis:* **1+2** merge cleanly if you want fewer gates (acceptance is the union), and
**2+3** would too. I would not merge Step 2 into anything larger than Step 3 — it is the risky
refactor and deserves a near-isolated diff.

---

### Step 1 — All five into the URL contract, the request, the summary, and the empty states. No UI.

The highest-value isolation in the cycle, and the verification experiment for `TODO(Luis)` A, B and
D: every filter becomes exercisable by hand-editing the URL **before** any control exists to blame.
Mirrors `plans/search.md` Step A.

- Add `FILTER_KEYS` (`BACKEND.md:11` order) and `readTrimmed` / `clampEnum` / `readPrice` alongside
  the shipped `clampPage` / `clampSort`. **`readCardName` is generalized into `readTrimmed(params,
  key)` and called for both `cardName` and `setName` — one function, not two** (§4.2).
- Build `committed` from the six clamped values; add each to the `URLSearchParams` block
  (`BrowsePage.jsx:136-145`) **only when non-empty**, via a `FILTER_KEYS` loop so no filter can be
  special-cased.
- Add `describeFilters(committed)` → array of descriptor strings (§3.6).
- `summaryText` takes `committed`; produces the four strings in §3.6's table.
- `hasSearch` → `hasFilters`; `emptyStateCopy` implements §3.7's seven-row table **including the
  crossed-range row and the `setName`-only row**, with the two comments §3.7 requires
  (draft-vs-committed; the deliberate `cardName`/`setName` advice asymmetry).
- `clearSearch` → `clearAllFilters`: deletes all six keys, sets `page=0`, leaves `sort` alone. The
  empty-state button's label becomes "Clear all filters".
- Enum value/label lists may live in `BrowsePage.jsx` for this step; Step 4 promotes them.

**Acceptance — request construction:**
- `?condition=NM` → the network tab shows **exactly one** request, containing `condition=NM` and no
  other filter key.
- `?condition=nm`, `?condition=bogus`, `?printing=FOIL` → the request contains **no** `condition` /
  `printing` key at all, the full catalogue renders, and the address bar is **not** rewritten.
- `?setName=%20%20`, `?setName=` → no `setName` key in the request, byte-for-byte the same
  treatment as the equivalent `cardName` cases.
- `?setName=  Base Set  ` → request shows `setName=Base+Set` (edge-trimmed, `+`-encoded space).
- `?setName=Sword  %26  Shield` (double interior spaces) → interior whitespace is **preserved**,
  not collapsed.
- `?minPrice=10` alone → request has `minPrice=10` and **no `maxPrice` key**. `?maxPrice=50` alone
  → the reverse. Both one-sided cases return sensible rows (`BACKEND.md:31-35`).
- `?minPrice=10.5&maxPrice=99.999` → sent verbatim as `10.5` and `99.999`; **not** rounded,
  floored, or coerced.
- `?minPrice=-5`, `?minPrice=abc`, `?minPrice=1e5`, `?minPrice=1,000`, `?minPrice=10.`,
  `?minPrice=.`, `?minPrice=`, `?minPrice=%20%20` → **no** `minPrice` key in the request, in every
  one of those cases.
- `?minPrice=.5` and `?minPrice=10.50` → sent verbatim, `.5` and `10.50`, not `0.5` / `10.5`.
- `?cardName=charizard&setName=Base Set&condition=NM&minPrice=10&sort=askingPrice,asc&page=1` → all
  keys present in `page,size,sort,cardName,setName,condition,minPrice` order; paging and sorting
  still work.

**Acceptance — verification (record the answers; do not change code to suit them):**
- **`TODO(Luis)` A:** compare `?setName=Base Set` against `?setName=base` and `?setName=BASE SET`.
  Same rows → partial and case-insensitive. Zero rows for `base` → exact. **Report either way.**
  This does not stop the build; it decides whether the §3.7 `setName` empty-state advice gets
  relaxed later and whether a backend change is needed.
- **`TODO(Luis)` D:** `?minPrice=100&maxPrice=10` → confirm **200 with zero rows**, as
  `BACKEND.md:36-40` infers. If it is a 400 instead, the shipped error block shows the message
  verbatim — record it and report; do not add prevention.
- **`TODO(Luis)` B (opportunistic):** find a listing priced exactly `X`; check `?minPrice=X`
  includes it. If it does, `priceAbove` is `>=` and item B closes.
- Enum equality confirmed in passing: `?condition=NM` returns only `NM` rows.

**Acceptance — UI (no controls yet):**
- Summary reads `Showing page 1 of 2 · 23 listings matching card name “charizard”, condition NM`.
- A filtered miss renders **“No listings match these filters”** and the words "No listings yet"
  appear nowhere.
- `?cardName=zzzz` alone still renders the shipped `No listings match “zzzz”` copy verbatim.
- `?setName=zzzz` alone renders **“No listings match set “zzzz””** with the full-set-name advice —
  not the `cardName` copy, and not the generic copy.
- `?minPrice=100&maxPrice=10` renders the crossed-range heading **"Min price is higher than max
  price"**, not the generic filters copy, and not "No listings yet".
- "Clear all filters" removes all six params, lands on page 0, and preserves `sort`.
- Grep confirms exactly one `role="status"` on the page.

---

### Step 2 — Extract `FilterBar`; draft becomes one object. No new controls.

The risky refactor, isolated. **Zero new filters. Behaviour identical to today**, apart from two
button labels.

- New `src/components/FilterBar.jsx`. Props:
  `{ committed, onApply, onClearAll, sort, onSortChange, firstFieldRef }`.
- Move the shipped `<form role="search">` and the sort group into it, laid out per §3.2 (grid,
  bordered form, sort row outside the form). Only the card-name group exists so far; the grid holds
  one cell.
- Draft becomes `useState(committed)`; the guarded sync becomes the JSON-signature version from
  §3.3, carrying the shipped "not a useEffect / not a key" comment plus the new line about why the
  comparison is a signature.
- `handleApply(event)`: `preventDefault()`; build `normalized` from the draft using the §4.5
  helpers; `setDraft(normalized)` **unconditionally** (§3.3 property 5); call `onApply(normalized)`.
- `BrowsePage.applyFilters(next)`: build a `URLSearchParams` copy of the current `searchParams`,
  `set`/`delete` each `FILTER_KEYS` entry from `next`, `set('page','0')`, and **skip the navigation
  entirely when `built.toString() === searchParams.toString()`** — this replaces the shipped
  early-return at `BrowsePage.jsx:212-215`. `sort` untouched.
- `firstFieldRef` is created in `BrowsePage`, attached to the card-name input by `FilterBar`, and
  `.focus()`ed inside `clearAllFilters` — read only in the handler, never during render
  (`react-hooks/refs`).
- Labels: **"Search" → "Apply filters"**, **"Clear" → "Clear all"**. Clear all still renders only
  when ≥1 filter is committed.
- Drop `sm:w-64` from the card-name input; it is `w-full` in a grid cell now.
- **Factor the text-filter control into one reusable JSX shape** (a small local component or a
  parameterized block), taking `id`, `name`, `label`, `placeholder`, `value`, `onChange`, and an
  optional `ref`. Step 3 adds `setName` by calling it a second time — if Step 3 has to copy-paste
  markup, Step 2 did this wrong.

**Acceptance:**
- Typing fires **zero** requests. Apply (or Enter) fires exactly one. Network tab, not code.
- Every acceptance criterion from `plans/search.md` Step 4/5 still passes verbatim: trailing-space
  commit, empty box removes the param, submit from page 3 lands on page 0, `sort` survives every
  submit and clear, back/forward keeps the box and the results in agreement, a bookmarked
  `?cardName=blastoise` shows `blastoise` on first paint, Enter does **not** blur the input, a
  half-typed refinement survives paging **and** a sort change.
- Pressing Apply twice on an unchanged query from page 0 adds **no** history entry and fires **no**
  second request.
- Clicking Clear all moves focus to the card-name input; the empty-state "Clear all filters" button
  does the same.
- Only Apply is `type="submit"`; every other button is `type="button"`.
- `npm run lint` is clean with **no new `eslint-disable`**.
- `BrowsePage.jsx` no longer contains a `<form>` or any draft state.

---

### Step 3 — `setName` (the second text field) — **DEFERRED TO THE END OF THE CYCLE.**

> **Deferred by Luis 2026-07-28, after Step 1's verification experiment; re-confirmed
> 2026-07-29 as deferred rather than abandoned.** `setName` came back **exact and
> case-sensitive** (`BACKEND.md`, `setName` bullet): against a set named
> `Scarlet & Violet 151`, only that exact string matches — `scarlet`,
> `SCARLET & VIOLET 151` and `151` all return 0 rows, while `cardName` matches `chari`
> case-insensitively. Shipping two identical-looking text fields with opposite matching
> behaviour is a trap, so no `setName` control is built **yet**.
>
> **Luis is fixing the backend to make `setName` case-insensitive.** This step is therefore
> **not cut — it is moved to the end of the cycle**, to be built after Steps 4, 5 and 6 and
> after the backend change lands. Build order becomes **1, 2, 4, 5, 6, then 3.** Steps are
> deliberately not renumbered, so this record stays legible.
>
> **Do not build this step until Luis confirms the backend change is deployed**, and re-run
> Step 1's `setName` experiment against the running backend before building — the fix must be
> verified, not assumed.
>
> **What stays in the meantime:** all of Step 1's `setName` wiring — `readTrimmed`, the
> `FILTER_KEYS` entry, the request loop, the descriptor, and the `setName`-only empty-state
> row. `?setName=<exact name>` still filters for anyone hand-editing the URL. This was chosen
> over stripping the param so that re-enabling is **purely additive** and touches no reviewed
> code. Step 2's draft object therefore carries `setName` despite it having no control — see
> Step 2's notes.
>
> **⚠ One thing to check when the backend change lands: case-insensitivity and partial
> matching are two separate properties.** `cardName` has both. Luis has specified
> case-insensitive; if `setName` becomes case-insensitive but stays an **exact** match, then
> `scarlet` will work but `151` and `Scarlet & Violet` still return 0 rows. In that case the
> `setName` empty-state advice (§3.7) must **keep** its "try the full set name" wording rather
> than relaxing to match `cardName`'s "search a shorter part of the name" — the two properties
> govern two different copy decisions. Verify both before touching that string.

The original step, preserved for whoever re-enables it:

Smallest possible increment, and it proves the shared path from Step 2. No new logic anywhere —
Step 1 already wired the read, the request, the descriptor and the empty state.

- Add the `setName` group by **calling Step 2's shared text-filter shape a second time** with
  `id="setName"`, `name="setName"`, label `Set name`, placeholder `Base Set`. No new attributes, no
  new styling, no second read helper, no second trim, no request branch.
- Carry the two `TODO(Luis)` A comments: one at the control, one at the `setName`-only empty-state
  copy string (§4.2).

**Acceptance:**
- Typing `Base Set` and applying produces exactly one request containing `setName=Base+Set`, and
  rows come back.
- `Base Set` + `charizard` together produce one request with both params and an intersected result
  set.
- `  Base Set  ` commits as `Base Set`; the box redraws trimmed.
- `Sword  &  Shield` (double interior spaces) is sent with interior whitespace intact.
- Applying with only whitespace in the box removes `setName` from the URL entirely — no `setName=`.
- Back/forward keeps both text boxes and the results in agreement, together.
- The summary reads `… matching card name “charizard”, set name “Base Set”`.
- A `setName`-only miss renders the set-specific heading and the full-set-name advice.
- **Structural check for the Reviewer:** `setName` has no read helper, no trim, no request branch,
  and no control markup of its own. Grep — if `setName` appears in more places than `cardName`
  does, something was duplicated.

---

### Step 4 — `condition` + `printing`, and the shared vocabulary module

- New `src/lib/listings.js` exporting `CONDITION_OPTIONS`, `PRINTING_OPTIONS`, `CONDITION_VALUES`,
  `PRINTING_VALUES`, `PRINTING_LABELS`, `printingLabel`, `formatPrice`. A non-component module
  because `allowConstantExport` does not exempt a function declaration or a
  `new Intl.NumberFormat(...)` initializer (§2).
- `ListingCard.jsx` imports `printingLabel` and `formatPrice` from it; its local copies are deleted.
  **The stale currency `TODO(Luis)` at `ListingCard.jsx:6-8` is rewritten** to record USD as
  documented at `BACKEND.md:220`, confirmed by Luis 2026-07-28. This is the only step allowed to
  touch that comment. The `priceFlagged` TODO at `:93-95` stays — still open.
- Two `<select>` groups in `FilterBar`, labels per §3.4, `"Any condition"` / `"Any printing"` as
  `value=""`, options in `BACKEND.md:221` order.
- `clampEnum` switches to importing `CONDITION_VALUES` / `PRINTING_VALUES`.

**Acceptance:**
- Picking `NM — Near Mint` and clicking Apply produces **exactly one** request containing
  `condition=NM`; the network tab shows `NM`, not `Near Mint`.
- Selecting "Any condition" and applying removes `condition` from the URL and from the request
  entirely — no `condition=`.
- Loading `?condition=LP&printing=HOLOFOIL` shows both selects already on those options on first
  paint.
- Back/forward flips both selects and the results together; they never disagree.
- Changing a select fires **zero** requests until Apply.
- `PRINTING_LABELS` exists in exactly one file (grep it). `ListingCard` renders printing identically
  to before, and the currency comment now cites `BACKEND.md:220`.
- `npm run lint` clean; `npm run build` succeeds.

---

### Step 5 — The price range

- Two groups per §3.4: `type="text"`, `inputMode="decimal"`, **no `step`, no `min`, no `max`**
  (§4.4), labels "Min price (USD)" / "Max price (USD)", placeholders `0` and `100`,
  `aria-describedby="priceHint"` on both, `w-full`.
- **Neither field is required, disabled, or defaulted**, per `BACKEND.md:31-35`.
- The price-hint slot between the grid and the button row, `id="priceHint"`, `text-sm
  text-zinc-700`, **no `aria-live`, no `role`**. It renders, in priority order:
  1. the unparseable-format hint, when a submit was blocked;
  2. the crossed-range hint, when the **draft** values cross.
- The submit-time format guard (§4.4): a non-empty price draft that `readPrice` rejects blocks
  `onApply`, shows the format hint, and moves focus to the first offending field.
- A crossed range is **not** blocked — it is sent verbatim (§4.4).
- `describeFilters`'s price descriptor uses `formatPrice` from `src/lib/listings.js`, with the
  neutral "from / to" wording (§4.4 — no boundary claim while `TODO(Luis)` B is open).

**Acceptance:**
- `10` / `50` + Apply → exactly one request with `minPrice=10&maxPrice=50`.
- **Min only** → request has `minPrice`, no `maxPrice` key, and returns rows. **Max only** → the
  reverse. Neither field is disabled or marked required at any point.
- `12.50` → sent as `12.50`. `99.999` → sent as `99.999`, **not** rounded to `100.00` or truncated
  to `99.99`. No spinner arrows in Chrome or Safari; scrolling the wheel over a focused price field
  does **not** change its value.
- Typing `abc` in min and clicking Apply → **zero** requests, the format hint appears, `abc` stays
  in the box, focus lands on the min field, the URL is unchanged.
- Typing `100` in min and `10` in max → the crossed hint appears **while typing**; Apply is **not**
  blocked; the request contains `minPrice=100&maxPrice=10` verbatim; the results area shows the
  crossed-range empty state from §3.7, not the generic "No listings match these filters".
- Clearing max while min still reads `100` makes the crossed hint disappear and the next Apply
  sends `minPrice=100` alone.
- Focusing either price field with a screen reader announces whichever hint is present, via
  `aria-describedby`.
- Summary reads `… matching price from $10.00 to $50.00`, and `price up to $50.00` / `price from
  $10.00` for the one-sided cases. **No copy anywhere asserts inclusive or exclusive bounds.**
- Grep confirms still exactly one `role="status"` and no `aria-live` outside it.

---

### Step 6 — Accessibility, responsive, and consistency pass

Verify only; change only what fails.

- **Keyboard-only:** reach and operate all six filters, Apply, Clear all, sort, the pager, and both
  empty-state buttons. Focus ring visible at every stop. Focus never lands on `<body>` after Clear
  all from either entry point, or after a blocked Apply. Tab order matches visual order at 375, 640,
  768 and 1280px.
- **Screen reader (VoiceOver is enough):** each control announces its visible label — including
  `setName`, whose placeholder must never be doing the label's job; the form announces as a search
  landmark; after Apply the status region announces the new summary **once**; the price hint is
  announced on focus, not as an interruption; the error block still announces as an alert.
- **Exactly one `aria-live` / `role="status"` on the page.** Grep for it.
- **Responsive at 375 / 640 / 768 / 1280px:** no horizontal scroll; no control narrower than its
  longest option label; "Reverse holofoil" not truncated; card name and set name identical in width
  and shape at every breakpoint; the price pair adjacent at every breakpoint; no button orphaned
  from its group; the results grid unchanged.
- **A 300-character `setName`** wraps in the summary and in the empty-state heading without
  horizontal scroll at 375px.
- **Contrast:** every label `zinc-700`, secondary text `zinc-600`, placeholders `zinc-500`. Nothing
  at `zinc-400`.
- **No** arbitrary Tailwind values, custom CSS, inline `style`, transitions, animations, gradients,
  new dependency, or new `fetch` call site.
- `npm run lint` clean, `npm run build` succeeds.

**Acceptance:** every box passes; no functional change introduced by this step.

---

## 6. Decisions

### LOCKED by Luis — recorded, not re-opened

| # | Decision | Resolution |
|---|---|---|
| — | **`setName` control shape** | **Text input, not a select.** *(Superseded by the row below — no control ships this cycle. Recorded because it still governs the control if `setName` is re-enabled.)* |
| — | **`setName` control is DEFERRED to the end of the cycle** | **Locked 2026-07-28 after Step 1's experiment closed `TODO(Luis)` A as exact + case-sensitive; re-confirmed 2026-07-29.** Build order is **1, 2, 4, 5, 6, then 3** — Step 3 is moved, not cut. **Luis is making `setName` case-insensitive in the backend**; the control gets built once that lands and is re-verified. Step 1's URL/request/summary/empty-state wiring stays throughout, so `?setName=<exact name>` still filters and re-enabling is purely additive. Full rationale, the re-verify requirement, and the case-insensitive-vs-partial caveat are in §5 Step 3. The frontend does not compensate for the current asymmetry (CLAUDE.md). |

Carried forward from `plans/search.md` §6 and still binding: submit-only commit for text search (no
debounce, no per-keystroke), a visible submit button, two Clear entry points sharing one handler,
`type="search"`, each submit pushes a history entry.

### Open — the four this cycle needs

### 1. Commit model — do the five commit on change, or on submit?

**Recommendation: on submit, all six, behind one "Apply filters" button. Sort stays on change and
moves outside the form.** I hold this one firmly, and your `setName` decision strengthened it — the
bar now has four free-text controls against two selects, so "one gesture" is also the majority
gesture.

- *Submit for all six (recommended).* One gesture, one request per deliberate action, and — the
  decisive part — it is the only model without the stranded-draft defect in §3.1: with mixed commit,
  changing a select either ignores a typed text draft (bar contradicts results) or silently submits
  a half-typed one (invisible side effect). Both are the class of bug the §3.3 sync exists to
  prevent. It also means composing three filters costs one request, not three.
- *On change for the selects, submit for the text fields.* Feels snappier for the two selects and
  matches how Amazon/eBay facets behave. Real cost: the defect above, which has no clean fix; plus a
  bar where identical-looking controls behave differently with nothing on screen explaining which is
  which.
- *On change for all six* is not available — four of the six are free-text, and you ruled out
  per-keystroke and debounced querying last cycle.

**Consequences you are approving:** the shipped "Search" button is relabelled **"Apply filters"** and
"Clear" becomes **"Clear all"**. Your locked decision that a visible submit button exists is
honoured; only the copy changes, because the button now applies six things. Second consequence:
picking one condition costs a click it would not cost on an instant-apply facet.

### 2. Draft state shape — does `draft` become an object, and what happens to the §3.3 sync?

**Recommendation: yes, one `draft` object plus one `reconciledSignature` string. The sync stays
structurally identical to what shipped.** Full correctness walkthrough in §3.3.

- *One object (recommended).* Six drafts + six reconciled copies is twelve `useState` calls and
  twelve places to forget one. The object collapses that to two. The subtle part — comparing a
  value-identity object — is solved by comparing a JSON signature instead, which keeps the guard a
  primitive `!==`, exactly like `BrowsePage.jsx:131`. It therefore stays lint-clean for the same
  verified reason (`eslint-plugin-react-hooks.development.js:45428`, re-checked this cycle), and all
  four properties §3.3 relied on are preserved: no stale paint, no remount, no focus loss on Enter,
  and `page`/`sort` changes leave drafts alone (neither is in `FILTER_KEYS`).
- *Six separate string pairs.* Zero new concepts and each guard is a verbatim copy of the shipped
  one. Cost: twelve hooks, six near-identical five-line blocks, and the seventh filter makes it
  fourteen. It also makes "reset everything to the URL" six statements instead of one, which is
  precisely where a Clear-all bug would hide.

**One simplification this buys:** `setDraft(normalized)` runs unconditionally on submit, which
retires the shipped early-return special case at `BrowsePage.jsx:212-215` and removes `FilterBar`'s
need to know the page number. The history-dedupe it was doing moves to `applyFilters` as a
`toString()` comparison (Step 2).

### 3. `FilterBar` extraction — confirm or reject?

**Recommendation: confirm, and put the draft state and the §3.3 sync inside it. Data loading stays
in `BrowsePage`.**

- *Extract (recommended).* `BrowsePage.jsx` is 415 lines today; six inline filter groups push it past
  650, against CLAUDE.md's "a junior reader should follow it top to bottom." The split has a clean
  seam: **the page owns everything that determines what is fetched** (URL params, clamping, `path`,
  `useFetch`, all result states); **the bar owns everything that is only about editing before
  commit** (the six controls, the draft object, the sync, Apply). CLAUDE.md's "keep components
  presentational; put data loading in the page or a hook" is satisfied — `FilterBar` performs no
  loading and holds no server data. Draft state is not data loading, and no other part of the page
  reads it, so threading it back up through props would be ceremony.
- *Keep everything in `BrowsePage`.* One file, nothing to trace across. Cost: a 650-line page where
  the sync, the request, six render states and seven controls interleave — and the §3.3 sync, the
  single subtlest thing on the page, buried in the middle of it.

**Sub-point, cheap but it needs your nod:** `PRINTING_LABELS` and `formatPrice` now have two
consumers each, so `plans/homepage.md` Open Decision 4's "promote when the second consumer appears"
triggers. They cannot simply be exported from `ListingCard.jsx` — the lint config runs
`reactRefresh.configs.vite`, whose `allowConstantExport` only exempts constant-expression variable
exports, not a function declaration or `new Intl.NumberFormat(...)`
(`eslint-plugin-react-refresh/index.js:136,301`). So they need a non-component module. **I recommend
`src/lib/listings.js`** — one new directory, holding shared domain vocabulary. Alternatives: a flat
`src/listings.js` (no new directory, less discoverable) or `src/constants.js` (vaguer name). Any is
fine; duplicating the label map is not.

### 4. All five in one cycle, or split?

**Recommendation: one cycle. Unreservedly, now.**

This decision kept getting easier while the plan was being written. It started with three of the five
filters blocked on backend verification. After your two contract amendments and the `setName`
decision, **zero steps are gated.** The case for splitting has been dismantled by the answers, not by
argument.

- *One cycle (recommended).* The structural work — the grid, the `FilterBar` extraction, the draft
  object, the generalized sync, Clear all, the empty-state and summary generalization — is the
  majority of both the effort and the risk, and it is **shared by all five**. Splitting pays it once
  and then touches the bar again anyway, which is exactly what `plans/search.md` §3.6 warned about.
  With nothing gated, a split would isolate no risk; it would just add a cycle boundary in the middle
  of one component.
- *Split into two cycles.* A cleaner narrative and a hard boundary around… nothing that is actually
  blocked. Cost: the `FilterBar` grid, the button row, and the layout get reopened and re-reviewed in
  cycle two, and the draft object would be designed for a subset then widened.

**The per-step gates still give you every stopping point a split would.** Steps 1–3 land the
structure and both text filters; Step 4 adds the enums; Step 5 adds prices. You can stop after any
of them with a coherent, shippable page.

---

## 6b. Smaller calls I made — say so if you disagree

Not gating, but each is a real choice and each is cheap to reverse:

- **`setName` and `cardName` share one code path, specified as a structural property** (§4.2) rather
  than a convention — one `readTrimmed`, one key-driven request loop, one text-control JSX shape. The
  Reviewer can grep for violations. Two text filters behaving differently is the inconsistency this
  is designed to make impossible rather than merely discouraged.
- **The `setName`-only empty state gives the *opposite* advice to `cardName`'s** — "try the full set
  name" vs. "search a shorter part of the name" (§3.7). Deliberate, and the one place the open
  matching question is hedged. Correct under either answer; relaxable to match `cardName` once
  `TODO(Luis)` A closes as partial.
- **A crossed range is sent, not blocked** (§4.4), with copy before Apply (draft-keyed, in the bar)
  and after Apply (committed-keyed, top-precedence empty-state row). The principle it protects: **the
  frontend blocks only what it cannot construct (`minPrice=abc`), never what it disagrees with (a
  legal, well-formed, correctly-answered query).** Auto-swapping is rejected outright.
- **No filter-chip row.** The bar is always visible and the sync guarantees it shows committed
  values, so the controls *are* the active-filter display; chips would render the same state twice
  (§3.6).
- **The summary line enumerates active filters rather than counting them.** It is the page's only
  announcement, so a count would confirm a number without confirming the query. Costs a longer line —
  it wraps at 375px, which the `break-words` at `BrowsePage.jsx:300` already handles. Side effect: the
  shipped `matching “charizard”` becomes `matching card name “charizard”`, which two near-identical
  text fields now make necessary rather than merely tidier.
- **All price copy stays neutral about inclusivity this cycle**, even though two of the three
  predicates are confirmed inclusive — because the third (`priceAbove`, min-only) is the one that
  would carry the most useful boundary copy, and it was unread at the time (§4.4, `TODO(Luis)` B —
  since CLOSED as inclusive; copy stays neutral by Luis's 2026-07-29 decision). Asymmetric copy
  is worse than neutral copy. One-line addition once B closes.
- **375px shows every filter, no `<details>` disclosure.** A tall bar on a phone is the cost; hiding
  half the backend's filter surface contradicts the project's stated purpose (§3.2).
- **Condition options read `NM — Near Mint`.** Code first for consistency with the cards
  (`ListingCard.jsx:77`), expansion so a non-collector can use it (§3.4).
- **Price labels say "(USD)" rather than showing a `$` prefix.** One DOM node, fully announced, no
  `aria-hidden` (§4.4). Now that `BACKEND.md:220` documents the currency, a `$` affix is a legitimate
  alternative if you prefer the look.
- **Rewriting the stale currency TODO at `ListingCard.jsx:6-8` is in scope, in Step 4 only** — the
  step that already opens that file. Not a silent drive-by.
- **The Coder does not edit `BACKEND.md`.** Steps 1 and 5 *record* what verification found; amending
  the contract document is yours, matching how `BACKEND.md:246-262` got written.

---

## 7. Files this cycle touches

```
src/pages/BrowsePage.jsx        modify   (Steps 1, 2 — URL state, request, summary, empty states, handlers)
src/components/FilterBar.jsx    new      (Step 2; grows in Steps 3, 4, 5)
src/lib/listings.js             new      (Step 4; shared enum options, labels, formatPrice)
src/components/ListingCard.jsx  modify   (Step 4 only; import shared helpers, rewrite the stale currency TODO)
plans/filters.md                this plan
```

No new dependency. No change to `client.js`, `useFetch.js`, `Header.jsx`, `AppLayout.jsx`,
`NotFoundPage.jsx`, `App.jsx`, `useAuthStatus.js`, `vite.config.js`, or `eslint.config.js`. No
backend, auth, CORS, cookie, or CSRF code touched. `BACKEND.md` is amended by Luis, not by the Coder.
