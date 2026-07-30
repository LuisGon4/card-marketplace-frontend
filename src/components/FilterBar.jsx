import { useRef, useState } from 'react'
import { CONDITION_OPTIONS, PRINTING_OPTIONS, isPriceRangeCrossed, readPrice } from '../lib/listings'
import { hasAnyFilter } from '../helpers/browse/searchParams'

// One shape for every free-text filter control. cardName is the only
// search-style caller, and the price fields also use this, passing
// type="text" + inputMode="decimal" instead of the default `type="search"`.
// `ref` is a plain prop (React 19 — no forwardRef needed) forwarded
// straight to the <input>, so a caller can call `.focus()` on the real DOM
// node. `aria-describedby` is a passthrough — undefined for callers that
// don't need it, which renders no attribute at all.
function TextFilterField({
  id,
  name,
  label,
  placeholder,
  value,
  onChange,
  ref,
  type = 'search',
  inputMode,
  'aria-describedby': ariaDescribedBy,
}) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-zinc-700">
        {label}
      </label>
      <input
        ref={ref}
        type={type}
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        enterKeyHint="search"
        spellCheck={false}
        placeholder={placeholder}
        inputMode={inputMode}
        aria-describedby={ariaDescribedBy}
        className="w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      />
    </div>
  )
}

// One shape for every single-select enum filter (condition, printing).
// `anyLabel` is the value="" row's text; `options` is one of the
// CONDITION_OPTIONS / PRINTING_OPTIONS arrays from src/lib/listings.js.
function SelectFilterField({ id, name, label, anyLabel, options, value, onChange }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm text-zinc-700">
        {label}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded border border-zinc-200 bg-white px-2 py-1.5 text-sm text-zinc-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >
        <option value="">{anyLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

// `committed` is BrowsePage's five clamped filter values, straight off the
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
  // join('|') can collide: cardName 'a|b' with condition 'c', and cardName
  // 'a' with condition 'b|c', both join to 'a|b|c|||'.
  const signature = JSON.stringify(Object.values(committed))

  const [draft, setDraft] = useState(committed)
  const [reconciledSignature, setReconciledSignature] = useState(signature)
  // Whether the *last* submit attempt was blocked because a price box held
  // something readPrice couldn't parse. Not derivable from the draft itself
  // — we deliberately don't validate per keystroke — so it needs its own
  // state, recomputed on every submit attempt and cleared the moment either
  // price box is edited (the hint describes what's in the box right now,
  // and would otherwise keep asserting something the user already fixed).
  const [priceFormatBlocked, setPriceFormatBlocked] = useState(false)
  const minPriceRef = useRef(null)
  const maxPriceRef = useRef(null)
  // Guarded adjust-during-render sync (plans/filters.md §3.3), generalized
  // from the single-field version Step 1 shipped in BrowsePage.jsx: keeps
  // all five boxes honest against back/forward, bookmarks, and Clear all.
  // `committed` is a fresh object every render — BrowsePage rebuilds it
  // from searchParams each time — so comparing it by `!==` directly would
  // always be true and this would loop forever. Collapsing it to a JSON
  // signature turns the comparison back into a primitive `!==`,
  // structurally identical to the shipped single-field guard.
  //
  // Do NOT convert this to a useEffect: an effect would paint the stale
  // draft first and correct it a tick later — the documented anti-pattern,
  // which still applies at five fields.
  // Do NOT key any field on a changing value either: the key would also
  // change on Apply, which would unmount the focused input and drop focus
  // to <body> — the same failure that option was rejected for.
  // The `if` here is what keeps this lint-clean under
  // react-hooks/set-state-in-render, which only flags *unconditional*
  // setState-in-render.
  if (reconciledSignature !== signature) {
    setReconciledSignature(signature)
    setDraft(committed)
    // The flag means "the last submit was blocked," which stops being true
    // the instant the draft it described is replaced by committed's values.
    setPriceFormatBlocked(false)
  }

  function handleApply(event) {
    event.preventDefault()
    // Edge-trim on write, the same rule readTrimmed applies on read.
    const normalizedMinPrice = readPrice(draft.minPrice)
    const normalizedMaxPrice = readPrice(draft.maxPrice)
    // Only an unparseable price blocks Apply — a crossed range (min > max)
    // is a legal, well-formed query with a correct 0-row answer, so it is
    // sent verbatim rather than refused. The frontend blocks only what it
    // cannot construct, never what it disagrees with.
    const minPriceInvalid = draft.minPrice.trim() !== '' && normalizedMinPrice === ''
    const maxPriceInvalid = draft.maxPrice.trim() !== '' && normalizedMaxPrice === ''
    if (minPriceInvalid || maxPriceInvalid) {
      setPriceFormatBlocked(true)
      if (minPriceInvalid) {
        minPriceRef.current?.focus()
      } else {
        maxPriceRef.current?.focus()
      }
      return
    }
    setPriceFormatBlocked(false)

    const normalized = {
      ...draft,
      cardName: draft.cardName.trim(),
      minPrice: normalizedMinPrice,
      maxPrice: normalizedMaxPrice,
    }
    // Unconditional, not just when something changed (plans/filters.md
    // §3.3 property 5): if `committed` doesn't change, the guard above
    // never fires, so this is the only thing that trims a whitespace-only
    // edit back into the box.
    setDraft(normalized)
    onApply(normalized)
  }

  function setPriceDraft(key, value) {
    setDraft((prev) => ({ ...prev, [key]: value }))
    setPriceFormatBlocked(false)
  }

  // Keyed on the draft, not committed — see src/helpers/browse/copy.js's
  // emptyStateCopy for why that row asks a different question.
  const draftMinPrice = readPrice(draft.minPrice)
  const draftMaxPrice = readPrice(draft.maxPrice)
  const isDraftPriceCrossed = isPriceRangeCrossed(draftMinPrice, draftMaxPrice)
  const priceHintMessage = priceFormatBlocked
    ? 'Enter a plain amount, like 12.50.'
    : isDraftPriceCrossed
      ? 'Min price cannot be higher than max price'
      : null

  // Drives this component's own "Clear all" button — see `hasAnyFilter`'s
  // definition in src/helpers/browse/searchParams.js for the other call sites.
  const hasFilters = hasAnyFilter(committed)

  return (
    <div className="space-y-4">
      <form
        role="search"
        onSubmit={handleApply}
        className="space-y-4 rounded border border-zinc-200 p-4"
      >
        {/* Five-cell grid — the indefinite state, not a step toward six. At
            sm:grid-cols-2, the price pair straddles a row boundary rather
            than landing side by side. The pair is deliberately not nested
            and not given a span: the flat layout is what encodes that min
            price and max price are two independent filters, not one
            compound control. */}
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
          <SelectFilterField
            id="condition"
            name="condition"
            label="Condition"
            anyLabel="Any condition"
            options={CONDITION_OPTIONS}
            value={draft.condition}
            onChange={(value) => setDraft((prev) => ({ ...prev, condition: value }))}
          />
          <SelectFilterField
            id="printing"
            name="printing"
            label="Printing"
            anyLabel="Any printing"
            options={PRINTING_OPTIONS}
            value={draft.printing}
            onChange={(value) => setDraft((prev) => ({ ...prev, printing: value }))}
          />
          {/* Plain text + inputMode="decimal", not a native numeric input:
              a numeric input reads back '' the moment the browser can't
              sanitize what was typed, destroying the draft — and no
              `step` attribute, since the askingPrice column's enforced
              scale is undocumented and a step would assert one the
              contract explicitly leaves open. */}
          <TextFilterField
            id="minPrice"
            name="minPrice"
            label="Min price (USD)"
            placeholder="ex: 0"
            value={draft.minPrice}
            onChange={(value) => setPriceDraft('minPrice', value)}
            ref={minPriceRef}
            type="text"
            inputMode="decimal"
            aria-describedby="priceHint"
          />
          <TextFilterField
            id="maxPrice"
            name="maxPrice"
            label="Max price (USD)"
            placeholder="ex: 100"
            value={draft.maxPrice}
            onChange={(value) => setPriceDraft('maxPrice', value)}
            ref={maxPriceRef}
            type="text"
            inputMode="decimal"
            aria-describedby="priceHint"
          />
        </div>
        {priceHintMessage !== null && (
          <p id="priceHint" className="text-sm text-zinc-700">
            {priceHintMessage}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="rounded bg-blue-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          >
            Apply filters
          </button>
          {/* Only while a filter is committed — clearing an already-empty
              bar has nothing to do, generalized to all five filters. */}
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
