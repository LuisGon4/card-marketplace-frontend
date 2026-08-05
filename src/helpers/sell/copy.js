// Copy the user reads on the create-listing flow. Kept out of JSX so this
// file is the single source of truth for each case (CLAUDE.md). The
// valuation and upload strings arrive with the steps that render them.

import { PRICE_FORMAT_HINT, formatPrice } from '../../lib/listings'

export const pageHeading = 'Sell a card'

export const choosePanelHeading = '1. Choose the card'

export const describePanelHeading = '2. Describe your copy'

export const signedOutSellCopy = {
  heading: 'Sign in to sell a card',
  body: 'Use Sign in at the top of the page to list a card for sale.',
}

export const cardSearchLabel = 'Search cards by name'

// The state before any search has been submitted — a distinct case from a
// search that returned zero rows (CLAUDE.md's empty-vs-loading-vs-nothing-
// searched-yet rule).
export const cardSearchIdleHint = "Search for the card you're selling."

export const cardSearchLoadingText = 'Searching cards…'

export function cardResultCountText(query, count) {
  const cardWord = count === 1 ? 'card' : 'cards'
  return `${count} ${cardWord} match “${query}”`
}

export function cardSearchEmptyStateCopy(query) {
  return {
    heading: `No cards match “${query}”`,
    body: 'Check the spelling, or search a shorter part of the name.',
  }
}

// setName and rarity are both nullable on Card — handled once here so no
// call site has to branch on it.
export function cardResultDetail(card) {
  const setLabel = card.setName ?? 'Unknown set'
  const rarityLabel = card.rarity ?? 'Unknown rarity'
  return `${setLabel} · ${rarityLabel}`
}

export function selectedCardLabel(cardName) {
  return `Selected: ${cardName}`
}

export const conditionFieldLabel = 'Condition'
export const printingFieldLabel = 'Printing'
export const askingPriceFieldLabel = 'Asking price (USD)'
export const locationFieldLabel = 'Location'
export const descriptionFieldLabel = 'Description'

// The empty option reads "not chosen yet" here, unlike FilterBar's "Any
// condition" / "Any printing" — those mean "filter off," a legal final
// state; this form's empty option is invalid until the user leaves it.
export const conditionEmptyOptionLabel = 'Select a condition'
export const printingEmptyOptionLabel = 'Select a printing'

export const creatingListingText = 'Creating listing…'

const DESCRIPTION_MAX_LENGTH = 250

// A static hint, replaced — not joined — by an over-limit line once the
// draft exceeds it. Never blocks submission and never backed by maxLength,
// which would silently swallow the tail of a paste.
export function descriptionHint(length) {
  if (length <= DESCRIPTION_MAX_LENGTH) {
    return `Up to ${DESCRIPTION_MAX_LENGTH} characters.`
  }
  return `Description is ${length} characters; the limit is ${DESCRIPTION_MAX_LENGTH}.`
}

// Keyed by submitBlock's field keys (helpers/sell/draft.js) so the hint and
// the page's focus target read the same ordered definition and can never
// name different fields.
const SUBMIT_BLOCK_MESSAGES = {
  card: 'Choose a card before creating the listing.',
  askingPrice: PRICE_FORMAT_HINT,
}

export function submitBlockMessage(field) {
  return SUBMIT_BLOCK_MESSAGES[field] ?? null
}

export function marketPriceHint(marketPrice) {
  return `Market price: ${formatPrice(marketPrice)}`
}

// The wire cannot distinguish "not fetched yet" from "genuinely unpriced" —
// both are 200 with marketPrice: null — so this must never claim a card
// has no price, only that none is available right now.
export const marketPriceUnavailableHint = 'No market price available.'

export const checkValuationAgainLabel = 'Check again'
