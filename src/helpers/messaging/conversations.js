// Shared vocabulary for the conversation list: sorting and lookup by id.
// Stays here, not lib/: no consumer outside this feature exists yet.

// Newest-first by createdAt, tie-broken by id so order is stable across
// refetches — the endpoint documents no ordering guarantee. Never mutates
// its argument.
//
// Compares parsed instants, not the raw strings. Jackson's ISO_INSTANT
// serializer emits 0, 3, 6, or 9 fractional-second digits depending on the
// value (no fraction at all when it's exactly zero), and `Z` sorts above
// both `.` and every digit — so under plain string comparison a shorter
// fraction always looks newer than a longer one sharing its prefix, even
// though every value carries an explicit `Z`. Do not revert to comparing
// the raw strings.
//
// An unparseable createdAt (Date.parse -> NaN) sorts after every valid
// one, rather than comparing as a number (where NaN would make every
// comparison false and leave the sort order implementation-defined). Two
// invalid values, or two equal instants, fall through to the id tie-break
// — its job is stability across refetches, not temporal accuracy — so the
// comparator stays a well-defined total order no matter which direction a
// pair is compared in.
export function sortConversations(list) {
  return [...list].sort((a, b) => {
    const aTime = Date.parse(a.createdAt)
    const bTime = Date.parse(b.createdAt)
    const aValid = !Number.isNaN(aTime)
    const bValid = !Number.isNaN(bTime)
    if (aValid !== bValid) return aValid ? -1 : 1
    if (aValid && aTime !== bTime) return bTime - aTime
    if (a.id === b.id) return 0
    return a.id > b.id ? 1 : -1
  })
}

// Used by the thread page: there is no GET /api/conversations/{id},
// so the thread finds its own entry in the list fetched here.
export function findConversation(list, id) {
  return list.find((conversation) => conversation.id === id) ?? null
}
