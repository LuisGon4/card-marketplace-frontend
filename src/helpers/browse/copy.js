import { formatPrice, isPriceRangeCrossed, printingLabel } from '../../lib/listings'
import { FILTER_KEYS, hasAnyFilter } from './searchParams'

// Single-value descriptors, keyed by filter and iterated in this
// declaration order — cardName, condition, printing — so the announced
// order stays fixed. The price pair is handled separately by
// priceDescriptor below rather than folded into this table: it collapses
// two params into one clause, which this table (one entry per param) can't
// express without special-casing two of the five.
const FILTER_DESCRIPTORS = {
  cardName: (value) => `card name “${value}”`,
  // Raw code, not the expanded label — matches how ListingCard renders it,
  // so the summary and the card speak the same vocabulary.
  condition: (value) => `condition ${value}`,
  printing: (value) => `printing ${printingLabel(value)}`,
}

// Collapses the two price bounds into one descriptor, or null when neither
// is set — "price from $10.00 to $50.00" reads as one filter, not a pair.
// Neutral "from"/"to" wording, not an en dash (inconsistent screen-reader
// handling) and no "and up" / "or less" / "inclusive" wording — a
// deliberate choice by Luis to keep the announcement short, not a hedge
// about boundary behaviour (all three price bounds are inclusive).
function priceDescriptor(minPrice, maxPrice) {
  if (minPrice !== '' && maxPrice !== '') {
    return `price from ${formatPrice(Number(minPrice))} to ${formatPrice(Number(maxPrice))}`
  }
  if (minPrice !== '') {
    return `price from ${formatPrice(Number(minPrice))}`
  }
  if (maxPrice !== '') {
    return `price up to ${formatPrice(Number(maxPrice))}`
  }
  return null
}

// Builds the "matching …" clause for the results summary, and the
// generic-miss body ("Filters: …") in the empty state — one source of truth
// for "what is applied", rendered in both places. Single-value descriptors
// first, in FILTER_DESCRIPTORS's order, then the price descriptor.
function describeFilters(committed) {
  const parts = []
  for (const key of Object.keys(FILTER_DESCRIPTORS)) {
    if (committed[key] !== '') {
      parts.push(FILTER_DESCRIPTORS[key](committed[key]))
    }
  }
  const price = priceDescriptor(committed.minPrice, committed.maxPrice)
  if (price !== null) parts.push(price)
  return parts
}

// The single source of truth for the empty-state table (crossed range ×
// page > 0/0 × how many filters are active) — stated once here rather than
// re-derived separately by the heading, body, and action buttons, which is
// what let "No listings yet" slip through on a search miss in the first
// place. Order matters: each branch below runs only if the ones above it
// didn't match.
export function emptyStateCopy(page, committed) {
  const hasFilters = hasAnyFilter(committed)

  // Keyed on the *committed* values, not a draft — this describes the
  // result actually on screen, which was produced by what was applied.
  // FilterBar's price hint is keyed on the *draft* instead, since it
  // describes what's about to be applied — two different questions, not
  // an inconsistency.
  //
  // Crossed range takes top precedence over every other row, including
  // page > 0: the backend returns 0 rows for a crossed range, not a 400,
  // so when the bounds run backwards nothing else can explain why the
  // page is empty — not the card name, not which page this is.
  const isCrossedRange = isPriceRangeCrossed(committed.minPrice, committed.maxPrice)
  if (isCrossedRange) {
    return {
      heading: 'Min price is higher than max price',
      body: 'Nothing can match a range that runs backwards. Swap the two amounts, or clear one.',
    }
  }

  // `page > 0` takes heading precedence over active filters otherwise:
  // "you're past the end" is the more actionable fact regardless of
  // whether the filters are fine.
  if (page > 0) {
    return {
      heading: 'Nothing on this page',
      body: hasFilters
        ? 'No more results for these filters past this page.'
        : 'This page is past the end of the results.',
    }
  }

  if (!hasFilters) {
    return {
      heading: 'No listings yet',
      body: "When sellers post cards, they'll appear here.",
    }
  }

  // "Only X" means X is the single active filter among all five, checked
  // against FILTER_KEYS so a future sixth filter can't silently break this
  // test.
  const isOnly = (key) =>
    committed[key] !== '' && FILTER_KEYS.every((k) => k === key || committed[k] === '')

  if (isOnly('cardName')) {
    return {
      heading: `No listings match “${committed.cardName}”`,
      body: 'Check the spelling, or search a shorter part of the name.',
    }
  }

  return {
    heading: 'No listings match these filters',
    body: `Filters: ${describeFilters(committed).join(', ')}. Try removing one.`,
  }
}

export function summaryText(page, totalPages, totalElements, committed) {
  const listingWord = totalElements === 1 ? 'listing' : 'listings'
  // Enumerates the active filters rather than counting them: this line
  // lives in the page's only live region, so it's the only confirmation a
  // screen-reader user gets about *which* filters were applied, not just
  // that a number changed.
  const descriptors = describeFilters(committed)
  const querySuffix = descriptors.length > 0 ? ` matching ${descriptors.join(', ')}` : ''
  // Guard: an empty result set has totalPages === 0, so "Page 1 of 0" would
  // be nonsense — omit the page fragment rather than render it.
  if (totalPages === 0) return `${totalElements} ${listingWord}${querySuffix}`
  return `Showing page ${page + 1} of ${totalPages} · ${totalElements} ${listingWord}${querySuffix}`
}
