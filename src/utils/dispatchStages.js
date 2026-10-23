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

/** One step forward. */
const FORWARD = {
  draft: 'final',
  final: 'loaded',
  loaded: 'dispatched',
  dispatched: 'delivered'
}

/** One step back, for a note moved on too soon. One stage at a time. */
const BACKWARD = {
  final: 'draft',
  loaded: 'final',
  dispatched: 'loaded',
  delivered: 'dispatched'
}

/** What undoing a stage actually means, in the words someone would use. */
const UNDOING = {
  draft: 'Its lines and quantities can be changed again, and labels cannot be linked until it is Final once more.',
  final: 'Its labels can be linked and unlinked again. Any vehicle already recorded stays until it is loaded afresh.',
  loaded: 'It goes back to standing in the yard, as though the lorry had not left.',
  dispatched: 'It goes back to being on the road, as though the depot had not confirmed receipt.'
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

  // One step back. Going back to draft is the only one the server guards,
  // because it reopens the lines themselves.
  const backward = BACKWARD[from]
  if (backward) {
    const linked = backward === 'draft' && linkedCases(note) > 0
    moves.push({
      to: backward,
      label: `Back to ${LABEL[backward].toLowerCase()}`,
      back: true,
      allowed: !linked,
      reason: linked ? 'Labels are already linked. Unlink them first.' : undefined,
      consequence: UNDOING[backward]
    })
  }

  return moves
}

/** Recording the vehicle is what moves a note to loaded, so it needs a dialog. */
export const needsVehicle = (from, to) => from === 'final' && to === 'loaded'
