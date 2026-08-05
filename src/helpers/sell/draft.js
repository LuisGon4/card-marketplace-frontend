// Pure logic for the create-listing draft: its empty shape, the submit
// block (an ordered table, not a chain of ifs, so submitBlockMessage and
// the page's focus target can never name different fields), and the
// single place the POST body is shaped. No JSX, no React, no fetch.

import { readPrice } from '../../lib/listings'

export const EMPTY_DRAFT = {
  condition: '',
  printing: '',
  askingPrice: '',
  location: '',
  description: '',
}

// Only two rows: a blank location and an over-length description are both
// perfectly constructible strings — the frontend blocks only what it
// cannot construct, never what it disagrees with, so those go to the
// server and its 400 renders verbatim.
const SUBMIT_BLOCK_ORDER = [
  { field: 'card', isBlocked: (draft, cardId) => !cardId },
  { field: 'askingPrice', isBlocked: (draft) => readPrice(draft.askingPrice) === '' },
]

export function submitBlock(draft, cardId) {
  const failingRow = SUBMIT_BLOCK_ORDER.find((row) => row.isBlocked(draft, cardId))
  return failingRow ? failingRow.field : null
}

// The single place the POST body is shaped. askingPrice is sent as a
// number, per the contract, not the string readPrice validated it with.
// description is omitted entirely when blank — an empty string is a value
// the user did not supply, not an empty description.
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
