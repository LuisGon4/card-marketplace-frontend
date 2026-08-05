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

export const imagesPageHeading = 'Add photos'

export const loadingListingText = 'Loading listing…'

export const emptyPhotosCopy = {
  heading: 'No photos yet',
  body: 'This listing has no photos.',
}

export const nonOwnerUploadCopy = 'Only the seller can add photos to this listing.'

export const doneViewListingLabel = 'Done — view listing'

export const addPhotoPanelHeading = 'Add a photo'

export const photoFieldLabel = 'Photo'

export const photoFieldHint = 'JPEG only. One photo at a time.'

export const uploadButtonLabel = 'Upload photo'

export const chooseFileFirstHint = 'Choose a photo before uploading.'

const UPLOAD_STAGE_TEXT = {
  presigning: 'Preparing upload…',
  uploading: 'Uploading photo…',
  confirming: 'Saving photo to the listing…',
}

export function uploadStageText(stage) {
  return UPLOAD_STAGE_TEXT[stage] ?? null
}

// Keyed by the same three stage names runUpload uses for failedStage, so
// the error line can never name a leg the stage machine doesn't have.
const UPLOAD_ERROR_PREFIX = {
  presigning: "Couldn't start the upload",
  uploading: "Couldn't upload the photo",
  confirming: "Couldn't save the photo to the listing",
}

// The server's text is preserved verbatim as a substring, never
// paraphrased — which leg failed is the one thing that distinguishes "S3
// rejected the file" from "the listing rejected the upload" for a user
// staring at the same red box.
export function uploadErrorLine(stage, message) {
  return `${UPLOAD_ERROR_PREFIX[stage]}: ${message}`
}
