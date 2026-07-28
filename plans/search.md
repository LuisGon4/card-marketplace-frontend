# Plan — Card-name search on the browse page (`/`)

Extends the shipped homepage cycle (`plans/homepage.md`). Every convention there —
zinc + `blue-700`, one container, clamp-on-read URL state, the single `role="status"`
region, `useFetch` as the only read path — still applies and is not re-litigated here.

---

## 1. Goal & scope

**Goal.** Add a card-name search to `/` that filters `GET /api/listings` by the
`cardName` query param, committed on Enter, held in the URL, and reflected in the
results summary and the empty state.

`plans/homepage.md` §1 scoped all six filters out of that cycle and said the
URL-state decision was made *so that* filters drop in cleanly here. This is the
first filter, so this cycle also pays the one-time structural cost: a control row
that can hold more than one control, and an empty state that can tell "nothing
matched your search" apart from "nothing exists yet."

### In scope

1. Read + clamp `cardName` from the URL; include it in the request only when non-empty.
2. Results summary line reflects the active query.
3. Three distinct empty states: empty catalogue, page past the end, no search matches.
4. A filter-bar row holding the search form and the existing sort control.
5. The search form itself: local draft state, `<form onSubmit>`, trim, page reset,
   delete-on-empty, a Clear affordance, focus management.
6. Draft ↔ URL synchronisation so back/forward can never leave the box contradicting
   the results.

### Explicitly NOT this cycle

- **The other five filters** (`setName`, `condition`, `printing`, `minPrice`,
  `maxPrice`). They exist in BACKEND.md line 11; they are not designed, not stubbed,
  and not referenced in the UI. §3.6 records *where* they attach and nothing more.
- Search suggestions, autocomplete, typeahead, recent searches, `GET /api/cards`
  (that endpoint belongs to the card-search/valuation screen, not here).
- Per-keystroke or debounced querying. Ruled out by Luis; see §3.1.
- Sort direction, page size, listing detail, any mutation.
- Step 6 of `plans/homepage.md` (the root auth probe) remains pending and untouched.
- Tests, CI, any new dependency.

---

## 2. Verified facts (checked against this repo — do not re-derive)

| Fact | Verified how |
|---|---|
| `react-hooks/set-state-in-render` **is** enabled here (it's in the plugin's `Recommended` preset, which `eslint.config.js` extends) | `node_modules/eslint-plugin-react-hooks/cjs/eslint-plugin-react-hooks.development.js:18241-18248` |
| …but it only errors when the `setState` call sits in an **unconditional** block: the diagnostic is guarded by `else if (unconditionalBlocks.has(block.id))` | same file, line 45428 |
| …and the rule's own error text prescribes the pattern this plan uses: *"To reset state when other state/props change, store the previous value in state and update conditionally: https://react.dev/reference/react/useState#storing-information-from-previous-renders"* | same file, line 45449 |
| **Net:** the guarded adjust-state-during-render sync in §3.3 is lint-clean with **no** `eslint-disable` comment | follows from the two rows above |
| Tailwind v4 preflight resets `::-webkit-search-decoration` **only** — not `::-webkit-search-cancel-button` | `node_modules/tailwindcss/preflight.css:315` |
| **Net:** `type="search"` keeps its native clear "✕" in Chrome/Safari (absent in Firefox) | follows from the row above |
| Preflight sets `::placeholder { color: color-mix(in oklab, currentcolor 50%, transparent) }` — i.e. placeholder contrast is derived, not guaranteed | `node_modules/tailwindcss/preflight.css:296-301` |
| **Net:** set `placeholder:text-zinc-500` explicitly (≈4.8:1 on white) rather than inheriting a 50%-of-`zinc-900` mix | follows from the row above |
| `setSearchParams` accepts a functional updater; the shipped handlers already copy `prev` and set one key, so unrelated params survive | `src/pages/BrowsePage.jsx:85-101`, and `plans/homepage.md` §2 |
| `useFetch(path)` re-runs on any `path` change and aborts the in-flight request | `src/hooks/useFetch.js:54-90` — no manual refetch is needed when the query changes |

**Do not use React 19's `<form action={fn}>` here.** React resets the form after an
action completes; with a controlled input that reset is a no-op today, but it is a
trap the moment anyone converts the field to uncontrolled. Use `onSubmit` +
`event.preventDefault()`, which is also what makes the native Enter behaviour ours
to handle. (Locked decision 1 already requires a real `<form onSubmit>` rather than
an `onKeyDown === 'Enter'` handler — a keydown handler misses the mobile keyboard's
"search" action key and gives assistive tech no search landmark to announce.)

---

## 3. Design direction

### 3.1 The interaction model (locked by Luis — recorded, not re-opened)

Two pieces of state, deliberately separate:

| | Lives in | Changes when | Triggers a request |
|---|---|---|---|
| **Draft** | `useState` in `BrowsePage` | every keystroke | never |
| **Committed** | `?cardName=` in the URL | Enter / Search / Clear | yes, via `useFetch`'s `path` |

Binding the input straight to `searchParams.get('cardName')` would make every
keystroke a navigation and therefore a request — precisely the database load Luis
is avoiding. Debounce is *also* out: it still issues requests for prefixes nobody
asked to search for, it just issues fewer of them. Draft state is the only shape
that guarantees exactly one request per deliberate submit.

A pleasant consequence worth knowing: re-submitting an unchanged query produces an
identical `path`, and `useFetch` keys on `[path]`, so it fires **zero** requests.
(§5 Step 4 additionally guards against the duplicate history entry that would create.)

### 3.2 Where the control sits

The page currently has one control row (`flex items-center gap-2`, label + select).
This cycle promotes that row to a **filter bar**: a wrapper that holds independent
control groups, each owning its own commit behaviour.

```
375px                                  ≥640px
┌───────────────────────────┐          ┌──────────────────────────────────────────────┐
│ Card name                 │          │ Card name                         Sort by    │
│ [___________________]     │          │ [_____________] (Search)(Clear)   [ select ▾]│
│ (Search) (Clear)          │          └──────────────────────────────────────────────┘
│                           │
│ Sort by                   │
│ [ select              ▾]  │
└───────────────────────────┘
```

- Bar: `flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between`.
- Each group: `flex flex-col gap-1` — **label above control**, so a 375px viewport
  gives the input the full 343px of container width instead of ~180px beside an
  inline label.
- Search group inner row: `flex flex-wrap items-center gap-2`, input `w-full sm:w-64`.
  Below `sm` the buttons wrap onto their own line rather than squeezing the field;
  at `sm`+ everything is inline. All default-scale utilities, no arbitrary values.
- Search sits **left**, sort **right** — the conventional reading order for
  "narrow the set" then "order the set," and it leaves the left edge free for the
  five future filters to wrap into.

Moving sort's label from beside the select to above it is the only change to shipped
UI, and it exists purely so all controls share one shape. See **Open decision 1** if
you'd rather leave sort untouched.

### 3.3 Keeping the box honest on back/forward (locked requirement 3)

Three candidate mechanisms; one is right.

| Option | Behaviour | Verdict |
|---|---|---|
| `useEffect` mirroring the URL value into state | Works, but paints the stale value first, then re-renders. The React docs' canonical anti-pattern. | **Rejected** — the smell Luis named. |
| `key={cardName}` on an extracted `<SearchField>` | Idiomatic and short. **But the key changes on submit too**, so pressing Enter unmounts the focused input and remounts it: focus falls to `<body>`, and the next Tab starts from the top of the document. In a search box — where refining a query is the common next action — that is a real keyboard/SR regression, not a nitpick. | **Rejected** on focus loss. |
| **Guarded adjust-during-render** | Compare the committed URL value against a `useState` copy of the last value we reconciled; when they differ, set both during render. React re-runs the component immediately, before any DOM is committed, so there is no stale paint and no remount — the input keeps focus. | **Chosen.** |

```jsx
const [draft, setDraft] = useState(cardName)
const [reconciled, setReconciled] = useState(cardName)
if (reconciled !== cardName) {
  setReconciled(cardName)   // conditional → lint-clean (§2)
  setDraft(cardName)
}
```

Three properties this buys, each of which the plan depends on:

1. **Back/forward, bookmarks, and Clear all snap the box to the URL.** The box can
   never show `charizard` above results for `pikachu`.
2. **Submitting self-corrects the box.** Type `"  charizard  "`, press Enter; the URL
   commits the trimmed `charizard`, the guard fires, the box redraws as `charizard`.
   The field ends up showing exactly what was searched.
3. **Changing only `page` or `sort` leaves the draft alone** — `cardName` is unchanged,
   so the guard doesn't fire and a half-typed refinement survives paging.

The Coder must carry a comment saying *do not convert this to `useEffect`*, because
the next reader's instinct will be to "fix" it.

### 3.4 The three empty situations

`BrowsePage.jsx:152-175` currently renders one heading, "No listings yet", for every
empty result, with the body text swapped when `page > 0`. That heading is an
invitation ("When sellers post cards, they'll appear here") and it is actively wrong
when the truth is "your search matched nothing" — it tells the user the marketplace
is empty when it isn't. Same defect class as the "Page 1 of 0" bug: a message that
states something false about the data. This is required work.

| Search active | Page | Heading | Body | Actions |
|---|---|---|---|---|
| no | 0 | **No listings yet** | When sellers post cards, they'll appear here. | — |
| no | > 0 | **Nothing on this page** | This page is past the end of the results. | Back to first page |
| yes | 0 | **No listings match “{query}”** | Check the spelling, or search a shorter part of the name. | Clear search |
| yes | > 0 | **Nothing on this page** | No more results for “{query}” past this page. | Back to first page · Clear search |

Notes:
- The `page > 0` cases take precedence on the heading because "you are past the end"
  is the more actionable fact — the query may be fine.
- Copy follows the writing guidance: an empty screen is an invitation to act, and it
  never apologises. "Check the spelling" is direction; "Sorry, no results found" is mood.
- The echoed query renders inside a `break-words` heading so a single 300-character
  token wraps instead of forcing horizontal scroll at 375px. React escapes the text,
  so echoing user input is safe.
- **No length cap on the input.** BACKEND.md defines no maximum, and inventing one
  would silently truncate a legitimate query.
- The block stays outside the live region (§3.5) and keeps its existing
  `border-dashed border-zinc-300 p-8 text-center` treatment — visually distinct from
  loading, which is plain text.

### 3.5 Accessibility (WCAG 2.2 AA)

- `<form role="search" onSubmit={…}>`. The landmark is what lets a screen-reader user
  jump straight to the search, and it is the semantic pairing for `type="search"`.
- Visible `<label htmlFor="cardName">Card name</label>`, `id="cardName"`,
  `name="cardName"`. Never a placeholder-as-label.
- `type="search"`, `enterKeyHint="search"` (mobile keyboards label the action key
  "search" and it submits the form), `spellCheck={false}` (card names are proper
  nouns; red squiggles under "Blastoise" are noise).
- `placeholder="Charizard"` — an example, not a label, and `placeholder:text-zinc-500`
  for contrast (§2).
- **Both non-submit buttons must carry `type="button"`.** A bare `<button>` inside a
  form defaults to `type="submit"`; a Clear button that silently submits the draft is
  the kind of bug that survives a demo and dies in review.
- **Focus management.** The Clear button only renders while a search is committed, so
  activating it destroys the element that has focus. The handler therefore moves focus
  to the search input (`useRef` + `.focus()` in the handler — never a ref read during
  render, which `react-hooks/refs` forbids). This is also simply the right next place
  to be: cleared box, cursor ready. The empty state's "Clear search" button shares the
  handler and the behaviour.
- **One live region, still.** The existing `role="status" aria-live="polite"` block
  holds loading text and the summary line. Adding a second (on the form, or on the
  empty state) would produce two announcements racing after each submit. Nothing new
  gets `aria-live`, `role="status"`, or `role="alert"` this cycle. `aria-controls` is
  deliberately not used — support across screen readers is poor enough that it buys
  nothing.
- Target size (SC 2.5.8): `px-3 py-1.5 text-sm` yields a 32px-tall control; the input
  matches. Above the 24px minimum.
- Focus ring: the existing
  `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700`
  on every new interactive element, input included.

### 3.6 The seam (noted, not built)

The five remaining filters attach as **additional control groups inside the filter
bar**, and as additional `next.set(...)`/`next.delete(...)` lines in the same commit
handler. Two things this cycle deliberately does *not* decide for them: whether they
commit on change (like sort) or on submit (like search), and whether the draft state
becomes an object. When the second filter lands, the natural move is extracting a
`FilterBar` component and lifting the draft into one object — do that then, with the
information that cycle has. Building it now would be guessing.

### 3.7 The results summary line

Currently `Showing page 1 of 5 · 87 listings` (or `87 listings` when `totalPages === 0`).
**It should reflect the active search**, for a reason that is structural rather than
cosmetic: this line *is* the announcement. It lives in the only live region on the
page, so it is what a screen-reader user hears after pressing Enter. "Showing page 1
of 2 · 23 listings" announces a number change with no confirmation that the query was
applied, and no way to tell a filtered count from the whole catalogue. Including the
query makes the announcement self-describing — and guarantees the string changes even
in the rare case where two different queries return identical counts, which is what
`aria-live` needs in order to fire at all.

| Case | Text |
|---|---|
| no search, `totalPages > 0` | `Showing page 1 of 5 · 87 listings` *(unchanged)* |
| no search, `totalPages === 0` | `0 listings` *(unchanged)* |
| search, `totalPages > 0` | `Showing page 1 of 2 · 23 listings matching “charizard”` |
| search, `totalPages === 0` | `0 listings matching “charizard”` |

The singular/plural guard already in `summaryText` stays. The zero-result line is
mildly redundant with the empty-state block below it, which is fine and intentional:
the empty block is *not* in the live region, so this line is the only thing announced.

### 3.8 The pager during a search miss

The pager row stays rendered unconditionally — `plans/homepage.md` §3 calls it
"chrome, not a fifth state" so the row never jumps. On a search miss it reads
`Page 1 of —` with both buttons disabled, which the existing `totalPages === 0`
guard already produces. **No change, and not a review finding.** Recorded here so
nobody "fixes" it.

---

## 4. Data & contracts

### The request

Unchanged endpoint, one added param:

```
GET /api/listings?page={n}&size=20&sort={sort}[&cardName={q}]
```

- `cardName` is documented in BACKEND.md §1, line 11. No other param is added, and
  the five sibling filters are not sent.
- The param is **omitted entirely** when there is no query. `cardName=` is never sent:
  its behaviour is undocumented, and "empty string" is not a filter the user asked for.
- `page` and `sort` keep their existing clamp-on-read treatment. `cardName` gets the
  same treatment (§ below) — the URL is untrusted input.
- Built with the existing `URLSearchParams` block in `BrowsePage`. No new fetch call
  site, no change to `client.js`, no change to `useFetch`.

### Reading `cardName` from the URL

```
const cardName = (searchParams.get('cardName') ?? '').trim()
```

- `null` (absent) and `''` and `'   '` all collapse to `''` = "no search". A
  hand-edited `?cardName=%20%20` therefore renders the unfiltered catalogue and sends
  no `cardName` param.
- Clamping happens on read; the address bar is **not** rewritten to "correct" itself.
  Same precedent as `clampPage`/`clampSort`.

### Whitespace

- **Trim the edges, on both write and read.** A leading space the user can't see would
  silently break a partial match, and no user means to search for a space.
- **Never collapse or alter interior whitespace.** `dark   magician` goes to the server
  exactly as typed. Rewriting the interior would be the frontend guessing at matching
  semantics it doesn't own (see TODO(Luis) 1).
- **Never change case.** Same reason, and specifically not as a workaround for the
  open case-sensitivity question.
- A whitespace-only query is identical to an empty one: the param is removed.

### Encoding note (test in Step 1, do not pre-solve)

`URLSearchParams.toString()` serialises a space as `+`, so a two-word query appears as
`?cardName=dark+magician`. The servlet layer decodes query strings as
form-urlencoded, so `+` should arrive as a space. **Verify with a real two-word search
in Step 1.** If results come back as though the `+` were literal, that is a report to
Luis, not a frontend workaround — do not hand-roll `%20` encoding to paper over it.

### `TODO(Luis)` — backend / human-owned

1. **`TODO(Luis)` — `cardName` matching semantics are underspecified in BACKEND.md.**
   Luis has confirmed the backend listing specification does a **partial** match, but
   **case-sensitivity is not stated anywhere**. Whether `charizard` matches "Charizard"
   is the difference between a search that feels normal and one that feels broken —
   users type lowercase. The frontend sends the query **verbatim** (trimmed only) and
   must not compensate by lower-casing, title-casing, or wrapping in wildcards; that
   would hide a backend behaviour behind frontend magic and break the moment the
   backend changes. **BACKEND.md line 11 should be amended** to state both facts
   (partial match; case-(in)sensitive) once confirmed. Not build-blocking — the code
   is identical either way — but it must be answered before the cycle closes, because
   the answer may be a backend change.
2. **`TODO(Luis)` — no documented maximum query length or invalid-character behaviour.**
   The frontend imposes none. If the backend has a limit, an over-long query will
   surface as a 4xx in the existing error block, verbatim, which is the correct
   behaviour — report it rather than adding client-side validation.
3. Carried forward, unchanged and still open, from `plans/homepage.md` §4: sort
   direction (#4), `priceFlagged` semantics (#5), currency (#6), CORS/dev origin
   (#1, #2), no username source (#3).

---

## 5. Step-by-step build order

Six steps. Each is a separate Coder invocation and a separate Reviewer pass.
Nothing outside `src/pages/BrowsePage.jsx` is touched by any of them.

---

### Step 1 — `cardName` from the URL into the request and the summary

No UI control yet. This isolates the contract from the control, exactly as Step 8 of
the homepage cycle shipped fixed params before Step 9 added the controls.

- Add a `readCardName(searchParams)` helper alongside `clampPage`/`clampSort`, with
  the trim-and-collapse-to-empty rule from §4.
- Add `cardName` to the `URLSearchParams` block **only when non-empty**.
- Extend `summaryText` to take the query and produce the four strings in §3.7.

**Acceptance:**
- `?cardName=charizard` returns a filtered set; the network tab shows exactly one
  request, with `cardName=charizard` present.
- No `cardName` param at all → request contains no `cardName` key (check the network
  tab, not the code).
- `?cardName=` and `?cardName=%20%20` behave identically to no search, send no
  `cardName`, and do not rewrite the address bar.
- `?cardName=charizard&sort=askingPrice,asc&page=1` sends all three; paging and
  sorting still work with a query present.
- Summary reads `Showing page 1 of 2 · 23 listings matching “charizard”`, and
  `0 listings matching “zzzz”` on a miss.
- A two-word query (`?cardName=dark magician`) returns sensible results — see the
  encoding note in §4. If it doesn't, stop and report.

---

### Step 2 — Three empty states, plus the shared `clearSearch` handler

- Replace the single empty block with the §3.4 table. Heading and body both branch;
  the heading must not stay "No listings yet" for a search miss.
- Query echo wrapped so it wraps: `break-words` on the heading.
- Add `clearSearch()`: `setSearchParams` functional updater → `next.delete('cardName')`,
  `next.set('page', '0')`. (The focus-move belongs to Step 4, when the input exists.)
- Wire "Clear search" (a `type="button"`) into the two search-active rows; keep
  "Back to first page" on the two `page > 0` rows.

**Acceptance:**
- All four rows of the §3.4 table reachable by hand-editing the URL, each with the
  specified heading, body and buttons.
- A search miss never renders the words "No listings yet".
- "Clear search" removes the param and lands on page 0 with `sort` preserved.
- A 300-character query renders without horizontal scroll at 375px.
- The empty block still has no `aria-live` and no `role`.

---

### Step 3 — Filter-bar shell (layout only)

Gated on **Open decision 1**.

- Wrap the control area in the §3.2 bar and move the existing sort control into it as
  a group, label above the select.
- Zero behaviour change: same `id`, same `<label htmlFor>`, same options, same handler.

**Acceptance:** sort still works and still resets `page` to 0; no visual regression at
375 / 640 / 768 / 1280px; no horizontal scroll; no arbitrary Tailwind values; the diff
contains no logic change.

---

### Step 4 — The search form

- `const [draft, setDraft] = useState(cardName)` (the sync guard arrives in Step 5 —
  do not add a `useEffect` here as a placeholder).
- `<form role="search" onSubmit={handleSearchSubmit}>` with the field, a
  `<button type="submit">Search</button>`, and a `<button type="button">Clear</button>`
  rendered **only when `cardName !== ''`**.
- `handleSearchSubmit`: `event.preventDefault()`; `const q = draft.trim()`; **return
  early when `q === cardName && page === 0`** (that navigation would be a byte-identical
  URL and would only stuff the history stack); otherwise the functional updater sets
  `cardName` to `q` — or `delete`s it when `q === ''` — and sets `page` to `'0'`.
  `sort` is never touched.
- `inputRef` + `.focus()` at the end of `clearSearch`, since the Clear button unmounts
  itself.
- Field attributes and classes per §3.5: `type="search"`, `enterKeyHint="search"`,
  `spellCheck={false}`, `placeholder="Charizard"`, `placeholder:text-zinc-500`, and the
  existing input styling (`rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm
  text-zinc-900`) plus the shared focus ring. Submit button is the page's first primary
  affordance: `bg-blue-700 text-white hover:bg-blue-800` — a static colour change, no
  transition, no animation. Clear matches the existing secondary buttons.

**Acceptance:**
- Typing fires **zero** requests. Enter fires exactly one. Verify in the network tab,
  not by reading the code.
- Enter with a trailing-space query commits the trimmed value.
- Enter on an empty or whitespace-only box removes `cardName` from the URL entirely
  (no `cardName=`) and returns to page 0.
- Submitting from page 3 lands on page 0; `sort` survives every submit and every clear.
- Pressing Enter twice on an unchanged query adds no history entry and fires no
  second request.
- Clicking Clear moves focus to the search input.
- Both Clear buttons and the pager buttons carry `type="button"`; only Search is
  `type="submit"`.
- Tab order through the bar is label-order; every stop shows a focus ring.

---

### Step 5 — Draft ↔ URL synchronisation

- Add the guarded adjust-during-render pattern from §3.3, with the comment explaining
  why it is not a `useEffect` and why the conditional matters (both for correctness and
  for `react-hooks/set-state-in-render`, §2).

**Acceptance:**
- Search `charizard`, then `pikachu`, then press Back: the box reads `charizard` and
  the results are charizard's. Forward: both flip to pikachu. At no point do the box
  and the results disagree.
- Loading a bookmarked `?cardName=blastoise` shows `blastoise` in the box on first paint.
- Pressing Enter does **not** blur the input (this is the whole reason for the pattern).
- Typing a half-finished refinement, then paging or changing sort, leaves the typed
  text in the box.
- `npm run lint` is clean with no new `eslint-disable`.

---

### Step 6 — Accessibility and consistency pass

Verify only; change only what fails.

- Keyboard-only: reach and operate the field, Search, Clear, sort, and the pager;
  focus ring visible at every stop; focus never lands on `<body>` after an action.
- Screen reader (VoiceOver is enough): the field announces as a labelled search field
  inside a search landmark; after a submit, the status region announces the new summary
  **once**; the error block still announces as an alert.
- Exactly one `aria-live`/`role="status"` region exists on the page. Grep for it.
- Contrast: placeholder, labels, and all secondary text at `zinc-600`/`zinc-500` or
  darker. Nothing at `zinc-400`.
- Responsive at 375 / 640 / 768 / 1280px: no horizontal scroll, no overlap, no wrapping
  that orphans a button from its field.
- No arbitrary Tailwind values, no custom CSS, no inline `style`, no transitions or
  animations, no new dependency, no new `fetch` call site.

**Acceptance:** every box above passes; no functional change introduced by this step.

---

## 6. Decisions — LOCKED by Luis

All open decisions below were resolved before the build started. Recorded verbatim
so the Coder and Reviewer read the same answers; **do not re-open any of them.**

| # | Decision | Resolution |
|---|---|---|
| — | **Step granularity** | **Six steps merged to three.** Step A = old 1+2 (contract + summary + empty states). Step B = old 3+4+5 (filter bar + search form + draft/URL sync). Step C = old 6 (a11y pass). Rationale: old Step 4 would have shipped a knowingly desynced input for Step 5 to repair — not a reviewable increment. Acceptance criteria of the merged steps are the union of their parts; none are dropped. |
| — | **Visible Search button** | **Yes, include it.** Enter remains the primary commit gesture exactly as specified; the button is an additional affordance for mobile and discoverability. It is the page's first filled-accent button — an intentional departure from the all-white button set, justified as the one primary action on the screen. |
| 1 | Sort label above the select | **Yes, move it.** One control shape across the bar. |
| 2 | One Clear affordance or two | **Two, sharing one handler** — beside the field (only while a search is live) and in the empty state. |
| 3 | `type="search"` vs `type="text"` | **`type="search"`**, per the Planner's recommendation. One attribute; flip if the native ✕ proves confusing. |
| 4 | `cardName` case-sensitivity | **Still open — `TODO(Luis)` 1.** Not build-blocking; the code is identical either way. Must be answered before the cycle closes, and BACKEND.md line 11 needs amending regardless. |
| 5 | History model | **Confirmed: each submit pushes an entry.** Accepted consequence: five refinements = five Backs to leave the page. |

---

## 6b. Original decision text (for the reasoning behind each)

**1. Does the sort control's label move above the select (Step 3)?**
- *Move it (recommended):* every control in the bar shares one shape, so at 375px each
  gets the full container width instead of competing with an inline label — and the five
  future filters wrap into the same grid without a second layout. Cost: a small visual
  change to UI you already approved.
- *Leave sort exactly as-is:* zero diff on shipped code; the search form goes on its own
  row above the sort row. Cost: two control shapes in one bar, and the filter cycle
  almost certainly unifies them anyway — which makes this throwaway work, the same
  argument that decided URL state last cycle.

**2. One Clear affordance or two?**
- *Two (recommended):* Clear beside the Search button (visible only while a search is
  committed) **and** "Clear search" as the empty state's call to action. They share one
  handler, so there is no logic duplication — only two entry points to the same action.
  The empty-state one matters most: a search miss is a dead end, and an empty screen
  should be an invitation to act.
- *One:* only the empty-state button, on the grounds that emptying the box and pressing
  Enter already clears a search. Cost: that gesture is discoverable only to people who
  already know it, and on a phone it means select-all, delete, then find the Go key —
  three fiddly steps to undo one.
- *(Rejected outright: no Clear at all. A user who searches "charzard", gets nothing, and
  has to hand-edit the URL to get back to the catalogue is a broken product.)*

**3. `type="search"` or `type="text"`?**
- *`type="search"` (recommended):* announced as a search field, pairs with the search
  landmark, and gives Chrome/Safari a native "✕". That ✕ clears the **draft only** — the
  results don't change until Enter. I read that as consistent rather than confusing:
  typing doesn't commit either, and the ✕ means "erase what I typed," which is exactly
  what draft state is. Our own Clear button (right beside it, visible whenever a search
  is live) is the one that commits.
- *`type="text"` + `enterKeyHint="search"`:* no native ✕ at all, so there is exactly one
  clearing gesture in the UI and zero chance of the ambiguity above. Cost: loses the
  "search field" role announcement, and Firefox users never saw the ✕ anyway, so the
  inconsistency exists in reverse.
- Cheap to flip either way; it's one attribute.

**4. `cardName` case-sensitivity (also TODO(Luis) 1).** Not a build decision — the code
is identical either way — but you should have the answer before this cycle closes, since
"case-sensitive" is a backend change rather than something the frontend should paper
over, and BACKEND.md needs amending regardless.

**5. Confirming the history model.** Each submit pushes a history entry, matching the
`page`/`sort` precedent. This is implied by your locked requirement that Back/Forward
sync the box — with `{ replace: true }` there would be nothing to navigate back to.
Consequence worth naming: refining a query five times means five Backs to leave the
page. Recorded as decided-by-implication; say so if you'd rather revisit it.

---

## 7. Files this cycle touches

```
src/pages/BrowsePage.jsx     modify   (all six steps)
plans/search.md              this plan
```

No new file. No new dependency. No change to `client.js`, `useFetch.js`, `ListingCard.jsx`,
`Header.jsx`, or `AppLayout.jsx`. No backend, auth, CORS, cookie, or CSRF code touched.
