# Refactor: Browse + filters readability and de-duplication

## 1. Goal & scope

`src/pages/BrowsePage.jsx` is 502 lines and carries three jobs at once: reading and
writing the URL, composing every string the page announces, and rendering. This
cycle splits those apart, removes the dead `setName` wiring, collapses duplicated
rules into single definitions, strips the `plans/*.md §x` citation trails, and ends
by updating `CLAUDE.md` so pages built after this one start in the resulting shape.

**Pure refactor.** No new features, no new endpoints, no request-shape changes, no
`BACKEND.md` reading required. Rendered output and DOM must be identical at every
step, with exactly two deliberate exceptions, both called out below:

- **Step 1** stops reading and sending `setName` (locked decision — the only
  behaviour change in the plan).
- **Step 7** is a visual change. Locked in on 2026-07-29, but it stays the last commit
  and touches nothing else, so it reverts on its own.

Explicitly not in scope: `src/api/client.js` behaviour, `useFetch`'s logic, the auth
probe, the sort options themselves, and any change to what the API is asked for
beyond dropping `setName`.

## 2. Locked ground rules the Coder must follow

**Helper layout is two-tier.**

- `src/lib/` — genuinely shared vocabulary. Already holds `formatPrice`,
  `PRINTING_LABELS`, `printingLabel`, the enum options/value sets, `readPrice`,
  `isPriceRangeCrossed`. Do not flatten anything else into it during this refactor
  except where a step says so.
- `src/helpers/<feature>/` — feature-local pure logic: URL readers and clamps, copy
  builders. Created by this refactor as `src/helpers/browse/`.
- Promotion to `src/lib/` happens on the second consumer, where "second consumer"
  means a consumer **outside the feature**. `src/components/FilterBar.jsx` is part of
  the browse feature even though it sits in `src/components/`, so FilterBar importing
  from `src/helpers/browse/` does not trigger promotion. (See open decision C.)
- `src/helpers/browse/` files are pure: no JSX, no React imports, no `fetch`.

**The de-duplication test, applied everywhere:** would a change to one copy have to
be made to the other? If yes, it was never two things. Three patterns to hunt:

1. Two copies of one rule that can drift. `readPrice` — one definition, clamp-on-read
   and guard-on-submit as two call sites — is the model of doing this right.
2. Near-identical JSX pasted instead of parameterized. `TextFilterField` taking
   `type`/`inputMode` is the model.
3. A new `if` that names a single filter where a loop over `FILTER_KEYS` would do.

**Comments: prevent a specific mistake, do not narrate.** This is not a blanket
density cut. Delete narration of code that already reads clearly; keep every comment
that stops a plausible "fix" from breaking something, that records an external
constraint invisible at that line, or that marks a deliberate omission. Where a
comment's content is load-bearing but it carries a plan citation, keep the fact and
drop the citation.

**These comments are load-bearing and must survive (rewritten, not swept):**

- `FilterBar.jsx` ~120–137 — the guarded adjust-during-render sync. Keep the "do NOT
  convert this to `useEffect`", the "do NOT key a field on a changing value", the
  reason the comparison uses a JSON signature rather than `!==` on the object, and the
  note that the `if` is what keeps it clean under `react-hooks/set-state-in-render`.
- `src/lib/listings.js` ~49–51 — `readPrice`'s note that it deliberately does not cap
  decimal places, because the column's enforced scale is undocumented. Stops someone
  inventing a digit cap.
- `BrowsePage.jsx` ~351–353 — the `tabIndex={-1}` note on the `<h1>`. Deleting the
  attribute silently restores a focus-to-`<body>` bug.
- `FilterBar.jsx` ~255–260 — plain text + `inputMode="decimal"` rather than a numeric
  input, and no `step`.
- `FilterBar.jsx` ~221–226 — the grid note about the price pair. **Content is now
  factually wrong and must be corrected, not just de-cited** (Step 1).
- `useFetch.js` — the error-shape block. Trim the citation on line 8 and tighten the
  prose, but the "stored exactly as thrown, two shapes both guarantee `.message`"
  decision stays; it exists to stop someone adding a wrapper type.
- `useFetch.js` ~46–52 — why the `set-state-in-effect` disable is scoped here.
- `ListingCard.jsx` ~20–23 — `priceFlagged` is only meaningful when `marketPrice` is
  non-null, and the `TODO(Luis)` about its direction.
- `clampPage`'s `Number.isSafeInteger` note — explains why the obvious
  `Number.isFinite` is wrong. Keep it wherever `clampPage` lands.

## 3. Regression checklist

There is no test suite (`CLAUDE.md`: do not add tests). Verification is manual against
the dev server. Run the rows a step names; run all of them once before Step 6.

| # | Action | Expected |
|---|---|---|
| R1 | `/?cardName=Charizard&condition=NM&printing=HOLOFOIL&minPrice=10&maxPrice=50` | Request sends exactly those five plus `page`, `size=20`, `sort`; summary reads "… matching card name "Charizard", condition NM, printing Holofoil, price from $10.00 to $50.00" |
| R2 | `/?page=-3&sort=bogus` | Renders page 0, "Newest first"; address bar unchanged |
| R3 | `/?page=99999999999999999999` | Falls back to page 0, no request with `1e+20` |
| R4 | `/?minPrice=50&maxPrice=10` | Empty state heading "Min price is higher than max price"; FilterBar hint "Min price cannot be higher than max price" |
| R5 | `/?page=5` on a short result set | "Nothing on this page" + "Back to first page" button; clicking it moves focus to the `<h1>` |
| R6 | `/` with an empty catalogue | "No listings yet"; pager reads "Page 1 of —" |
| R7 | `/?cardName=zzzzz` | "No listings match "zzzzz"" + "Clear all filters" |
| R8 | `/?cardName=zzzzz&condition=NM` | Generic "No listings match these filters" + "Filters: …" body |
| R9 | Type a price of `12,50`, press Apply | Blocked, hint "Enter a plain amount, like 12.50.", focus lands in that price box; no navigation |
| R10 | Apply the identical query twice | Second Apply adds no history entry (back button returns to the pre-filter URL, not the same URL) |
| R11 | Click "Clear all" in the bar, then again from the empty state | All five filters gone, `page=0`, `sort` preserved, focus in the card-name input both times |
| R12 | Change sort while on page 3 | `page` resets to 0, filters preserved |
| R13 | Edit a filter box, press back/forward | Boxes resync to the URL in one paint, no flash of the stale draft, focus not lost |
| R14 | Trigger an error (stop the backend), click "Try again" | Server's plain-text message rendered verbatim; focus lands on the `<h1>` |
| R15 | 375 / 640 / 1024 widths | Grid columns, sort alignment, and the pager row unchanged from before the step |

Each step is one commit. If any row fails, the step is wrong — do not adjust the row.

## 4. Steps

### Step 1 — Strip `setName` down to nothing, and correct the grid comment

Files: `src/pages/BrowsePage.jsx`, `src/components/FilterBar.jsx`.

Remove, in `BrowsePage.jsx`: the `setName` entry in `FILTER_KEYS` (leaving
`['cardName', 'condition', 'printing', 'minPrice', 'maxPrice']`), the `setName` read
and its key in `committed`, its `describeFilters` descriptor, and its dedicated
`isOnly('setName')` empty-state row with the whole "unverified matching semantics"
comment above it.

Remove, in `FilterBar.jsx`: the "all six filter keys, including `setName`" comment on
the draft state, the `setName: draft.setName.trim()` line in `normalized` and its
justifying comment. Nothing else in FilterBar needs a key list — `signature`,
`hasFilters`, and the draft all derive from `committed`'s own keys, so they follow
automatically. Sweep "six filters" wording to "five" wherever it appears in prose.

Correct the grid comment. It currently claims the grid "gains its sixth without a
layout change once that control is re-enabled" and calls the price-pair row break
"temporary". Both are false now. Replace with the standing fact: five cells is the
indefinite state, the price pair straddles a row boundary at `sm:grid-cols-2`, the pair
is deliberately **not** nested or given a span because the flat layout is what encodes
that the two bounds are independent filters rather than one compound control.

`readTrimmed` drops to a single call site. **Keep it as a named helper**, still taking
`(searchParams, key)`: it names the trim-on-read rule that FilterBar's trim-on-write
mirrors, and it keeps `cardName` from becoming the one URL param read by inline code in
an otherwise uniform table of readers.

Do **not** add anything that deletes a stray `?setName=` from the URL. It is now an
unrecognized param: not read, not sent, and left alone, exactly as this page already
leaves `?page=-3` alone rather than rewriting it. Say nothing about it in code.

Verify: R1, R7, R8, R11, R15, plus `/?setName=Base%20Set&cardName=Charizard` — the
outgoing request carries `cardName` only, the summary mentions only the card name, and
the `setName` param stays in the address bar untouched.

### Step 2 — Extract the URL layer to `src/helpers/browse/searchParams.js`

Files: new `src/helpers/browse/searchParams.js`, `src/pages/BrowsePage.jsx`.

Move out of `BrowsePage.jsx`, unchanged in logic: `SORT_OPTIONS`, `DEFAULT_SORT`,
`VALID_SORT_VALUES`, `FILTER_KEYS`, `clampPage`, `clampSort`, `readTrimmed`,
`clampEnum`. Add one reader that returns the whole clamped URL state, so the page body
has a single call instead of eight lines of parsing:

```
readBrowseParams(searchParams) -> { page, sort, committed }
```

Then de-duplicate the four `setSearchParams` handlers. Today `goToPage`,
`handleSortChange`, `clearAllFilters`, and `applyFilters` each copy
`new URLSearchParams(prev)`, mutate, and return — four copies of one shape. Replace with
four pure transforms in the same module, each taking a `URLSearchParams` and returning a
new one:

- `withPage(params, page)`
- `withSort(params, sortValue)` — sets `sort`, resets `page` to `0`
- `withoutFilters(params)` — deletes every `FILTER_KEYS` entry, resets `page` to `0`, never touches `sort`
- `withFilters(params, next)` — per `FILTER_KEYS`, sets non-empty and deletes empty, resets `page` to `0`

`BrowsePage`'s handlers become one or two lines each. `applyFilters` keeps its
skip-if-identical bail-out and keeps comparing against the outer `searchParams` rather
than using a functional updater — that comparison is what makes the bail-out possible
at all, and the comment saying so must survive.

`SORT_OPTIONS` continues to be passed to `FilterBar` as a prop, not imported there, so
the page and the bar still cannot disagree about valid sort values. Keep the comment
explaining why each option carries the `,asc`/`,desc` suffix — it exists to stop
someone "simplifying" it to a bare field name.

Verify: R1, R2, R3, R10, R11, R12, plus a network-tab diff of the request URL before
and after on `/?cardName=Charizard&minPrice=10&sort=askingPrice,asc&page=2`.

### Step 3 — Extract the copy layer to `src/helpers/browse/copy.js`, and unify `hasFilters`

Files: new `src/helpers/browse/copy.js`, `src/helpers/browse/searchParams.js`,
`src/pages/BrowsePage.jsx`, `src/components/FilterBar.jsx`.

Move `describeFilters`, `emptyStateCopy`, and `summaryText` into `copy.js`. While
moving:

- Split the three price branches out of `describeFilters` into
  `priceDescriptor(minPrice, maxPrice)` returning a string or `null`. `describeFilters`
  then reads as "single-value descriptors, then the price descriptor".
- Replace the three near-identical `if (committed.x !== '') parts.push(…)` blocks with a
  descriptor table keyed by filter, iterated in order:
  `{ cardName: v => \`card name “${v}”\`, condition: v => \`condition ${v}\`, printing: v => \`printing ${printingLabel(v)}\` }`.
  Declaration order must stay `cardName, condition, printing` so the announced order is
  unchanged. Keep the note that `condition` is shown as the raw code because
  `ListingCard` renders it that way, and keep the note explaining the neutral
  "from"/"to" wording (no en dash, no "and up") as Luis's deliberate choice.
- Keep `emptyStateCopy`'s precedence exactly as it is — crossed range, then `page > 0`,
  then no filters, then cardName-only, then generic — and keep the comment stating that
  each branch runs only if the ones above it did not match, plus the reason crossed
  range outranks everything (the backend answers a crossed range with 0 rows, not a
  400, so nothing else can explain the empty page).
- Keep the committed-vs-draft comment: `emptyStateCopy` is keyed on committed values
  because it explains the results on screen, while FilterBar's price hint is keyed on the
  draft because it describes what is about to be applied. Two questions, not an
  inconsistency. State it once, in `copy.js`, and have FilterBar's side not repeat it.

Then unify the `hasFilters` rule, which currently exists in three places: computed
inside `emptyStateCopy`, again in the `BrowsePage` body for the empty-state buttons, and
a third time in `FilterBar` as `Object.values(committed).some(...)`. Export one
`hasAnyFilter(committed)` from `src/helpers/browse/searchParams.js` (it belongs with
`FILTER_KEYS`) and call it from all three sites. Delete the FilterBar comment claiming
these are "two call sites, same definition, not shared code" — under the de-duplication
test they were one rule in three copies. `isOnly(key)` stays inside `copy.js`, checked
against `FILTER_KEYS` so a future sixth filter cannot silently break it.

Verify: R1, R4, R5, R6, R7, R8, R11, and one string-level check: the summary line and
the generic empty-state body are character-identical to before on
`/?cardName=Pikachu&condition=LP&printing=NORMAL&minPrice=1&maxPrice=2`.

### Step 4 — Extract the repeated presentational pieces

Files: new `src/components/SecondaryButton.jsx`, new `src/components/EmptyState.jsx`,
new `src/components/Pager.jsx`, `src/pages/BrowsePage.jsx`,
`src/components/FilterBar.jsx`.

The bordered-white button class string is pasted six times (Try again, Back to first
page, Clear all filters, Previous, Next, and FilterBar's Clear all) — 200 characters
that must change in six places at once. Extract `SecondaryButton({ disabled, onClick,
children })`, `type="button"` always, carrying the exact current class string
**including** the `disabled:cursor-not-allowed disabled:opacity-50` pair (harmless on
the four buttons that are never disabled, required by the pager's two). The primary
"Apply filters" button has one call site and its class string is duplicated nowhere, so
it stays inline — there is nothing to de-duplicate.

`EmptyState` and `Pager` also have one consumer each, and are extracted anyway. That is
not in tension with leaving the Apply button inline: the promote-on-second-consumer rule
governs where shared *vocabulary* lives, while these two come out because `BrowsePage` is
too long. Length alone is a sufficient reason to split a component; do not cite the
promotion rule for or against either one.

`EmptyState({ heading, body, children })` owns the dashed-border, centered wrapper and
the wrapped action row; `children` is the buttons, and the row renders only when
`children` is present. Keep the note that this block stays outside the live region and
gets no `aria-live`/`role`. Collapse the long "seven distinct situations" comment in
`BrowsePage` to a one-line pointer at `emptyStateCopy` as the source of truth for the
table — the table itself is now visible in that one function and does not need
restating at the call site.

`Pager({ page, totalPages, hasNext, onGoToPage })` owns the Previous / "Page X of Y" /
Next row. Keep both facts that live there: it renders unconditionally so the row never
appears, disappears, or jumps as loading/error/empty/populated toggle; and
`totalPages === 0` falls back to the em dash because "Page 1 of 0" is nonsense, the same
guard `summaryText` applies. `hasNext` continues to come from the response's own field,
never derived from `totalPages` — keep that comment at the point where `hasNext` is read.

`BrowsePage`'s `return` should end up as: `<h1>`, `FilterBar`, the single live region,
the error block (stays inline — one instance, and its `role="alert"` and
render-the-server-message-verbatim comment stay with it), `EmptyState`, the grid, `Pager`.

**Carried over from Step 3's review — decide here, don't skip it.** `page > 0` currently
exists twice: as `isPastEnd` in `BrowsePage` and open-coded in `copy.js`'s `page > 0`
branch. Step 3's unification was scoped to `hasFilters` and never named `isPastEnd`, so
this was correctly left alone then — but this step rewrites the JSX that consumes it, so
it is the cheap moment. Apply the plan's own test: would a change to one have to be made
to the other? Note the two are not obviously the same question — `isPastEnd` gates the
action buttons, while `copy.js`'s branch selects which message explains an empty page.
Raise the call rather than making it silently: if they unify, the shared definition goes
next to `hasAnyFilter` in `searchParams.js`; if they don't, say why in one line at
`isPastEnd` so the next reader doesn't "fix" it.

Verify: R5, R6, R7, R11, R14, R15, and a DOM diff — every element's `class` attribute
must be byte-identical to before on a populated page, an empty page, and an error page.
Tab through all three states and confirm the focus ring order is unchanged.

### Step 5 — Sweep the citation trails

Files: `src/main.jsx`, `src/hooks/useFetch.js`, `src/App.jsx`,
`src/hooks/useAuthStatus.js`, `src/components/AppLayout.jsx`,
`src/components/Header.jsx`, `src/components/ListingCard.jsx`, **and whatever citations
remain in `src/pages/BrowsePage.jsx` and `src/components/FilterBar.jsx`.**

Steps 1–4 drop a citation as each comment they touch moves, so this step is not a second
pass over those same lines. But **do not assume Steps 1–4 got all of them.** Comments that
stay where they are — FilterBar's guarded adjust-during-render sync and its sort-alignment
note are the known cases — are never edited by an earlier step and so keep their citations
until this one. This step is the backstop for the whole of `src/`: run the grep, fix
whatever it finds, wherever it is.

Rules for the sweep:

- Remove every `plans/<file>.md §x`, `plan §x`, `Step N`, and bare `§x` reference that
  points at a plan document. Sweep width is **all of `src/`**, confirmed — the files
  listed above violate the same rule for the same reason, and a comments-only diff
  carries no behaviour risk. `grep -rn "plans/" src/` must come back empty; `grep -rn "§"
  src/` may only return `BACKEND.md` section references.
- **Keep** `BACKEND.md` and `CLAUDE.md` references. They name an external constraint the
  reader cannot see from the code, which is exactly what a comment is for.
- Where the citation is the whole comment, delete the comment. Where the comment carries
  a fact, keep the fact and drop the parenthetical: `main.jsx` must keep *why*
  `BrowserRouter` comes from `react-router` and not `react-router/dom`, and
  `useFetch.js` must keep why `path` is a single primitive string — both stop a
  plausible wrong "fix".
- Do not change any code in this step. It is comments only, so the diff is trivially
  reviewable.

Verify: `npm run lint`, `npm run build`, and a click-through of the app. The diff must
contain no non-comment lines.

### Step 6 — Update `CLAUDE.md`'s Structure section (required final step)

File: `CLAUDE.md`.

The Structure tree still shows four directories and predates both `src/lib/` and
`src/helpers/`. Every page built after this one should land in the resulting shape
instead of being refactored into it later. Replace the tree with:

```
src/
  api/client.js      # all fetch calls, CSRF, error handling
  hooks/             # useFetch and friends
  pages/             # one per route
  components/        # presentational pieces, shared or feature-local
  lib/               # cross-feature vocabulary: formatters, enum tables, validators
  helpers/<feature>/ # feature-local pure logic: URL readers/clamps, copy builders
```

Add, as short bullets under it:

- `lib/` is for vocabulary more than one feature speaks. `helpers/<feature>/` is for
  logic only one feature needs. Both hold pure functions — no JSX, no React, no `fetch`.
- Promote from `helpers/<feature>/` to `lib/` on the second consumer, where the second
  consumer is one **outside** the feature. A feature's own components importing its
  helpers is not a promotion trigger.
- Copy the user reads — summaries, empty-state headings and bodies, hints — is built in
  `helpers/<feature>/copy.js`, not inline in JSX, so one function is the single source of
  truth for a table of cases.
- URL params are clamped on read in `helpers/<feature>/searchParams.js` and the address
  bar is never rewritten to "correct" an invalid value.

Verify: reread the tree against the actual `src/` after Steps 1–4; every directory
listed exists and every directory that exists is listed.

### Step 7 — Make the price pair adjacent at every breakpoint (visual change, separate commit)

File: `src/components/FilterBar.jsx`.

Add `sm:col-span-2` to the card-name cell, making the grid `1 + 1 + 1 + 1 + 1` cells
where the first spans two columns at `sm`. The price pair then lands adjacent at both
`sm:grid-cols-2` and `lg:grid-cols-3`, without nesting the pair and without giving the
pair a span — the two fixes `plans/filters.md` §3.2 rules out, because the flat layout
is what encodes that the two bounds are independent filters rather than one compound
control.

**Locked: take it, as the last commit.** It buys the pair's adjacency at every breakpoint
for one utility class. The accepted cost is that the card-name field becomes visually
dominant (full width at `sm`, two-thirds at `lg`) rather than one of five equal peers —
defensible, since it is the primary filter and holds the widest value. It stays its own
commit because it is a visual change riding along with a refactor, and so it reverts
without disturbing Steps 1–6.

Step 1's corrected grid comment must be updated again here: the pair no longer straddles a
row boundary, so the comment's standing fact becomes *why the pair is still flat* — not
nested, not spanned, because the flat layout is what encodes that the two bounds are
independent filters. Do not leave Step 1's "straddles a row boundary at `sm:grid-cols-2`"
sentence in place once this step lands; it would be false.

Verify: 375 / 640 / 1024 widths; min and max price adjacent at 640 and 1024; label/input
association and focus order unchanged.

## 5. Decisions — all locked 2026-07-29, no open questions

Nothing in this plan is awaiting a ruling. The Coder implements it as written.

- **`setName` is stripped, not kept.** `FILTER_KEYS` is five. The scratched control's
  leftover URL wiring goes with it (Step 1).
- **`FILTER_KEYS` and `hasAnyFilter` live in `src/helpers/browse/`**, imported by both
  `BrowsePage` and `FilterBar`. The promotion rule is settled as *second consumer
  **outside** the feature* — a feature's own components importing its helpers is not a
  trigger. `src/lib/` stays cross-feature vocabulary only. This wording goes into
  `CLAUDE.md` in Step 6, because the next feature will hit the same question.
- **All three presentational components come out in Step 4** — `SecondaryButton`,
  `EmptyState`, `Pager`. See Step 4 for why one-consumer extraction is not in tension
  with the promotion rule.
- **The citation sweep covers all of `src/`**, homepage-cycle files included.
  `BACKEND.md` and `CLAUDE.md` references survive; they point at contracts, not plans.
- **Step 7 is in**, as the final and separately revertible commit.
