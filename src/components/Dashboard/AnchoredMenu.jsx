import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * A menu that hangs off a control without being trapped by it.
 *
 * Inside a table it cannot be an absolutely positioned child of the row: the
 * table scrolls sideways, and a box that scrolls on one axis clips the other
 * too, so a menu on a low row was sliced off at the table's bottom edge.
 *
 * So it is drawn at the end of the document and placed from the trigger's own
 * rectangle, which no ancestor can crop. If there is not room beneath the
 * trigger it opens upward instead, and if there is room for neither it takes
 * the taller side and scrolls inside itself.
 *
 * Because the position is measured once, it closes on scroll and on resize
 * rather than drifting away from the control it belongs to.
 */
const MARGIN = 8 // breathing room against the window edge

const AnchoredMenu = ({ anchor, width = 220, align = 'left', onClose, children, ...rest }) => {
  const ref = useRef(null)
  const [placement, setPlacement] = useState(null)

  useLayoutEffect(() => {
    if (!anchor || !ref.current) return
    const menu = ref.current.getBoundingClientRect()

    const below = window.innerHeight - anchor.bottom - MARGIN
    const above = anchor.top - MARGIN
    const up = menu.height > below && above > below
    const room = Math.max(120, up ? above : below)

    const left = align === 'right'
      ? Math.min(anchor.right - width, window.innerWidth - width - MARGIN)
      : Math.min(anchor.left, window.innerWidth - width - MARGIN)

    setPlacement({
      left: Math.max(MARGIN, left),
      top: up ? undefined : anchor.bottom - 4,
      bottom: up ? window.innerHeight - anchor.top - 4 : undefined,
      maxHeight: Math.min(menu.height, room)
    })
  }, [anchor, align, width])

  // Measured once, so a scroll would leave it behind its own control.
  useEffect(() => {
    const close = () => onClose?.()
    window.addEventListener('scroll', close, true)
    window.addEventListener('resize', close)
    return () => {
      window.removeEventListener('scroll', close, true)
      window.removeEventListener('resize', close)
    }
  }, [onClose])

  if (!anchor) return null

  return createPortal(
    <div
      ref={ref}
      data-menu
      {...rest}
      style={{
        position: 'fixed',
        width,
        zIndex: 60,
        left: placement?.left ?? anchor.left,
        top: placement?.top,
        bottom: placement?.bottom,
        maxHeight: placement?.maxHeight,
        overflowY: 'auto',
        // Hidden only for the frame it takes to measure itself.
        visibility: placement ? 'visible' : 'hidden'
      }}
      className="rounded-[10px] border border-[#E3E2DE] bg-white p-[5px] text-left shadow-[0_10px_26px_rgba(21,24,28,0.13)]"
    >
      {children}
    </div>,
    document.body
  )
}

export default AnchoredMenu
