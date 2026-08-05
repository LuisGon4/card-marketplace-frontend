// Copy the user reads on the create-listing flow. Kept out of JSX so this
// file is the single source of truth for each case (CLAUDE.md). The
// valuation, submit-block, and upload strings arrive with the steps that
// render them.

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
