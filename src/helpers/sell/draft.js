// Pure logic for the create and edit listing drafts: their empty shapes,
// the submit-block tables (ordered, not a chain of ifs, so
// submitBlockMessage and the page's focus target can never name different
// fields), and the two places a request body is shaped. No JSX, no React,
// no fetch.

import { readPrice } from '../../lib/listings'

export const EMPTY_DRAFT = {
  condition: '',
  printing: '',
  askingPrice: '',
  location: '',
  description: '',
}

// Shared row constants, fed to two ordered tables rather than re-typed into
// a second one — two copies of the price rule would be two rules, and the
// guard could accept a value readPrice drops while the hint stays silent.
const CARD_ROW = { field: 'card', isBlocked: (draft, cardId) => !cardId }
const ASKING_PRICE_ROW = {
  field: 'askingPrice',
  isBlocked: (draft) => readPrice(draft.askingPrice) === '',
}

// A blank location and an over-length description are both perfectly
// constructible strings — the frontend blocks only what it cannot
// construct, never what it disagrees with, so those go to the server and
// its 400 renders verbatim.
const CREATE_BLOCK_ORDER = [CARD_ROW, ASKING_PRICE_ROW]
// Edit has no card to pick — cardId never changes after creation.
const EDIT_BLOCK_ORDER = [ASKING_PRICE_ROW]

function firstBlockedField(order, draft, cardId) {
  const failingRow = order.find((row) => row.isBlocked(draft, cardId))
  return failingRow ? failingRow.field : null
}

export function submitBlock(draft, cardId) {
  return firstBlockedField(CREATE_BLOCK_ORDER, draft, cardId)
}

export function editSubmitBlock(draft) {
  return firstBlockedField(EDIT_BLOCK_ORDER, draft)
}

// The single place the POST body is shaped. askingPrice is sent as a
// number, per the contract, not the string readPrice validated it with.
// description is omitted entirely when blank — an empty string is a value
// the user did not supply, not an empty description. This is a different
// rule from buildUpdateRequest below, and the two must not be shared: see
// that function's comment for why.
export function buildCreateRequest(draft, cardId) {
  const request = {
    cardId,
    condition: draft.condition,
    printing: draft.printing,
    askingPrice: Number(readPrice(draft.askingPrice)),
    location: draft.location,
  }
  if (draft.description.trim() !== '') {
    request.description = draft.description
  }
  return request
}

// The single place the PATCH body is shaped. Unlike buildCreateRequest
// above, description is always sent, '' when blank: an absent key preserves
// the existing description on the server, and erasing the textarea is the
// user's clearing gesture — omitting the key would make clearing impossible
// from the UI. Do not unify this with buildCreateRequest: they look
// identical and are not — one function's blank description means "nothing
// to describe yet" (omit), the other's means "remove what's there" (send
// '').
export function buildUpdateRequest(draft) {
  return {
    askingPrice: Number(readPrice(draft.askingPrice)),
    description: draft.description,
  }
}

// The edit form's initial draft, read from a ListingSummaryResponse — the
// shape /listings/mine returns. condition/printing/location/the card are
// not part of it: they aren't editable, and there is no key for them here.
export function editDraftFrom(listing) {
  return {
    askingPrice: String(listing.askingPrice),
    description: listing.description ?? '',
  }
}
