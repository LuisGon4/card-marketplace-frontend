import { useState } from 'react'

// One shape for every free-text filter control (plans/filters.md §5 Step
// 2). cardName is the only caller today — setName's control is deferred
// and the price fields don't land until Step 5 — but this exists so Step
// 5's price inputs (type="text", inputMode="decimal" per §4.4, deliberately
// not type="number") and a re-enabled setName can both use it without a
// second implementation. `ref` is a plain prop
// (React 19 — no forwardRef needed) forwarded straight to the <input>, so
// a caller can call `.focus()` on the real DOM node.
function TextFilterField({ id, name, label, placeholder, value, onChange, ref }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-zinc-700">
        {label}
      </label>
      <input
        ref={ref}
        type="search"
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        enterKeyHint="search"
        spellCheck={false}
        placeholder={placeholder}
        className="w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      />
    </div>
  )
}

// `committed` is BrowsePage's six clamped filter values, straight off the
// URL. `onApply(normalized)` and `onClearAll()` are BrowsePage's
// `applyFilters` and `clearAllFilters`. `sort` / `onSortChange` are the
// existing sort control, unchanged in behaviour, just relocated here.
// `sortOptions` is passed down rather than duplicated locally, so the page
// and the bar can never disagree on which sort values are valid.
// `firstFieldRef` is created in BrowsePage (not here), so `clearAllFilters`
// can call `.focus()` on it after either Clear-all entry point — this
// component's own button, or the empty state's — has already unmounted
// itself (plans/filters.md §5 Step 2).
function FilterBar({
  committed,
  onApply,
  onClearAll,
  sort,
  sortOptions,
  onSortChange,
  firstFieldRef,
}) {
  // Derived from `committed`'s own values rather than a separate key list:
  // `committed`'s keys are always the full filter set, in BrowsePage's
  // fixed order, so this can't drift out of sync the way a duplicated key
  // list could. JSON.stringify over Object.values is injective — two
  // different filter sets can never produce the same signature. A naive
  // join('|') can collide: setName 'a|b' with no condition and setName 'a'
  // with condition 'b' both join to 'a|b' (plans/filters.md §3.3).
  const signature = JSON.stringify(Object.values(committed))

  // All six filter keys, including `setName`, even though no control below
  // edits it — the setName control is deferred, not removed (setName came
  // back exact and case-sensitive, unlike cardName's partial match, so no
  // control ships yet). `setName` stays in the draft/signature/normalized
  // shapes anyway so a value set by hand-editing the URL survives an
  // unrelated Apply untouched, rather than getting silently dropped
  // because it wasn't part of the tracked shape. Do not "tidy" it out.
  const [draft, setDraft] = useState(committed)
  const [reconciledSignature, setReconciledSignature] = useState(signature)
  // Guarded adjust-during-render sync (plans/filters.md §3.3), generalized
  // from the single-field version Step 1 shipped in BrowsePage.jsx: keeps
  // all six boxes honest against back/forward, bookmarks, and Clear all.
  // `committed` is a fresh object every render — BrowsePage rebuilds it
  // from searchParams each time — so comparing it by `!==` directly would
  // always be true and this would loop forever. Collapsing it to a JSON
  // signature turns the comparison back into a primitive `!==`,
  // structurally identical to the shipped single-field guard.
  //
  // Do NOT convert this to a useEffect: an effect would paint the stale
  // draft first and correct it a tick later — the documented anti-pattern
  // plans/search.md §3.3 rejected, which still applies at six fields.
  // Do NOT key any field on a changing value either: the key would also
  // change on Apply, which would unmount the focused input and drop focus
  // to <body> — the same failure that option was rejected for.
  // The `if` here is what keeps this lint-clean under
  // react-hooks/set-state-in-render, which only flags *unconditional*
  // setState-in-render.
  if (reconciledSignature !== signature) {
    setReconciledSignature(signature)
    setDraft(committed)
  }

  function handleApply(event) {
    event.preventDefault()
    // Edge-trim on write, the same rule readTrimmed applies on read
    // (plans/filters.md §4.2) — applied uniformly to both text filters.
    // setName has no control yet (deferred), so its draft value never
    // diverges from committed.setName and this trim is a no-op for it —
    // but trimming it unconditionally here means Apply never needs a
    // special case for "the filter nothing edits," and a filter set only
    // by hand-editing the URL round-trips through an unrelated Apply
    // unchanged rather than silently vanishing.
    const normalized = {
      ...draft,
      cardName: draft.cardName.trim(),
      setName: draft.setName.trim(),
    }
    // Unconditional, not just when something changed (plans/filters.md
    // §3.3 property 5): if `committed` doesn't change, the guard above
    // never fires, so this is the only thing that trims a whitespace-only
    // edit back into the box.
    setDraft(normalized)
    onApply(normalized)
  }

  // Drives this component's own "Clear all" button. BrowsePage's
  // empty-state button of the same name computes its own equivalent from
  // the same `committed` values it already has — two call sites, same
  // definition, not shared code.
  const hasFilters = Object.values(committed).some((value) => value !== '')

  return (
    <div className="space-y-4">
      <form
        role="search"
        onSubmit={handleApply}
        className="space-y-4 rounded border border-zinc-200 p-4"
      >
        {/* Six-filter grid (plans/filters.md §3.2). Only cardName exists
            this step — setName is deferred, condition/printing/minPrice/
            maxPrice land in Steps 4-5 — so the grid holds one cell today
            and gains cells later without a layout change. */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <TextFilterField
            id="cardName"
            name="cardName"
            label="Card name"
            placeholder="ex: Charizard"
            value={draft.cardName}
            onChange={(value) => setDraft((prev) => ({ ...prev, cardName: value }))}
            ref={firstFieldRef}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="rounded bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Apply filters
          </button>
          {/* Only while a filter is committed — clearing an already-empty
              bar has nothing to do (plans/search.md §5 Step 4 / §6 decision
              2, generalized to all six filters in plans/filters.md §5 Step
              1). */}
          {hasFilters && (
            <button
              type="button"
              onClick={onClearAll}
              className="rounded border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
            >
              Clear all
            </button>
          )}
        </div>
      </form>

      {/* Sort orders the set rather than narrowing it, and has no draft to
          compose with — it commits on change and stays outside the form
          (plans/filters.md §3.1, §3.2). Right-aligned from 640px, full
          width at 375px. */}
      <div className="flex justify-start sm:justify-end">
        <div className="flex flex-col gap-1">
          <label htmlFor="sort" className="text-sm text-zinc-700">
            Sort by
          </label>
          <select
            id="sort"
            value={sort}
            onChange={onSortChange}
            className="rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}

export default FilterBar
