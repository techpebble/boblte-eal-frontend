/**
 * Working out which serial ranges would cover a dispatch line.
 *
 * The operator knows how many cases are short. The app knows which production
 * runs still hold labels, and which parts of each are already spoken for, so
 * it can propose the ranges instead of asking for twenty digits per range.
 *
 * Every range it proposes has to satisfy the same arithmetic the server does
 * in addEALLinkToDispatchItem: a whole number of cases, starting one past a
 * case boundary and ending on one.
 */

/**
 * The stretches of a production run that nothing has taken yet.
 *
 * A usage records which sub-ranges have been linked away in usedSerialRanges;
 * what is left is the gaps between them. They arrive in no particular order,
 * so they are sorted before walking.
 */
export const freeRangesOf = (usage) => {
  const from = Number(usage?.serialFrom)
  const to = Number(usage?.serialTo)
  if (!Number.isFinite(from) || !Number.isFinite(to) || to < from) return []

  const taken = [...(usage.usedSerialRanges || [])]
    .map((range) => ({ from: Number(range.serialFrom), to: Number(range.serialTo) }))
    .filter((range) => Number.isFinite(range.from) && Number.isFinite(range.to))
    .sort((a, b) => a.from - b.from)

  const free = []
  let cursor = from

  for (const range of taken) {
    if (range.from > cursor) free.push({ from: cursor, to: Math.min(range.from - 1, to) })
    cursor = Math.max(cursor, range.to + 1)
    if (cursor > to) break
  }
  if (cursor <= to) free.push({ from: cursor, to })

  return free.filter((range) => range.to >= range.from)
}

/**
 * The largest whole-case range inside a free stretch, and how many cases it
 * holds. A gap of 47 labels in a 48-bottle case covers nothing, so it is
 * passed over rather than offered as a range the server would refuse.
 */
const wholeCasesIn = (range, perCase) => {
  if (!perCase || perCase <= 0) return null
  const start = Math.ceil((range.from - 1) / perCase) * perCase + 1
  const end = Math.floor(range.to / perCase) * perCase
  if (end < start) return null
  return { from: start, to: end, cases: (end - start + 1) / perCase }
}

/** Oldest run first is the excise habit: labels leave as they were applied. */
const ORDER = {
  oldest: (a, b) => new Date(a.dateUsed) - new Date(b.dateUsed),
  largest: (a, b) => (b.balanceQuantityInCases || 0) - (a.balanceQuantityInCases || 0)
}

/**
 * Ranges adding up to `casesNeeded`, drawn from `usages` in the chosen order.
 *
 * Returns what it could find and what is still short, rather than refusing
 * outright: covering four hundred of six hundred cases is worth offering, and
 * the shortfall is worth saying out loud.
 */
export const planCover = ({ usages = [], perCase, casesNeeded, strategy = 'oldest' }) => {
  const lines = []
  let left = Number(casesNeeded) || 0

  if (!perCase || perCase <= 0 || left <= 0) {
    return { lines, cases: 0, labels: 0, short: Math.max(0, left) }
  }

  const ordered = [...usages].sort(ORDER[strategy] || ORDER.oldest)

  for (const usage of ordered) {
    if (left <= 0) break
    // Only one run per line when that is what was asked for.
    if (strategy === 'single' && lines.length > 0) break

    for (const gap of freeRangesOf(usage)) {
      if (left <= 0) break
      const whole = wholeCasesIn(gap, perCase)
      if (!whole) continue

      const take = Math.min(whole.cases, left)
      const to = whole.from + take * perCase - 1

      lines.push({
        usageId: usage._id,
        prefix: usage.prefix,
        dateUsed: usage.dateUsed,
        issuanceId: usage.issuanceId,
        serialFrom: whole.from,
        serialTo: to,
        labels: take * perCase,
        cases: take
      })
      left -= take
    }
  }

  return {
    lines,
    cases: lines.reduce((sum, line) => sum + line.cases, 0),
    labels: lines.reduce((sum, line) => sum + line.labels, 0),
    short: Math.max(0, left)
  }
}
