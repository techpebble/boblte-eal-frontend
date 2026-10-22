/**
 * How a dispatch note moves through its stages, as the server sees it.
 *
 * This mirrors backend `utils/stageTransition.js`. The server is what decides;
 * this is here so the app can offer the moves that will be allowed, and say
 * why the others are not, instead of letting someone pick one and be refused.
 * If the server's rules change, this file changes with them.
 */

// Case counts come out of a division, so compare them the way the API does.
export const TOLERANCE = 1e-6

/** Labels may only be linked or unlinked while a note is at this stage. */
export const LINKABLE_STATUS = 'final'

export const STAGES = ['draft', 'final', 'loaded', 'dispatched', 'delivered']

/** One step forward, and the one step back the server allows. */
const FORWARD = {
  draft: 'final',
  final: 'loaded',
  loaded: 'dispatched',
  dispatched: 'delivered'
}

export const linkedCases = (note) => note?.EALIssuedTotalQuantity || 0
export const totalCases = (note) => note?.totalQuantity || 0
export const isFullyLinked = (note) => linkedCases(note) + TOLERANCE >= totalCases(note)
export const casesLeft = (entry) => (entry?.quantityInCases || 0) - (entry?.EALIssuedQuantity || 0)

const LABEL = {
  draft: 'Draft',
  final: 'Final',
  loaded: 'Loaded',
  dispatched: 'Dispatched',
  delivered: 'Delivered'
}

/**
 * The moves on offer for one note, in the order they should be shown. Each
 * carries whether it can be taken now, and when it cannot, the reason — which
 * is the same reason the server would give.
 */
export const movesFor = (note) => {
  const from = String(note?.status ?? '').toLowerCase()
  const moves = []

  const forward = FORWARD[from]
  if (forward) {
    // final → loaded is the one forward step the server guards: every case
    // has to carry a serial range first.
    if (from === 'final' && !isFullyLinked(note)) {
      const short = (note.items || []).filter((entry) => casesLeft(entry) > TOLERANCE)
      const cases = short.reduce((sum, entry) => sum + casesLeft(entry), 0)
      moves.push({
        to: forward,
        label: LABEL[forward],
        allowed: false,
        reason: `${Math.round(cases).toLocaleString()} case(s) across ${short.length} line(s) have no label linked`
      })
    } else {
      moves.push({ to: forward, label: LABEL[forward], allowed: true })
    }
  }

  // Back to draft, only while nothing has been linked against the note.
  if (from === 'final') {
    const linked = linkedCases(note) > 0
    moves.push({
      to: 'draft',
      label: 'Back to draft',
      back: true,
      allowed: !linked,
      reason: linked ? 'Labels are already linked. Unlink them first.' : undefined
    })
  }

  return moves
}

/** Recording the vehicle is what moves a note to loaded, so it needs a dialog. */
export const needsVehicle = (from, to) => from === 'final' && to === 'loaded'
