import React, { useEffect } from 'react'

/**
 * The shell every dialog in the app sits in.
 *
 * The close button used to float over the body on `absolute top-4 right-4`,
 * so whatever a dialog put in its own top-right corner ended up underneath
 * it — a progress bar here, a Copy button there. It has a column of its own
 * now, and nothing can be pushed under it.
 *
 * `title` names the dialog for a screen reader. It is not drawn, because the
 * dialogs already carry their own headings and two would be one too many;
 * a dialog that wants its heading up in the chrome passes `header` instead.
 *
 * `flush` hands the body to the caller unpadded and unscrolled, for a layout
 * that manages its own regions — otherwise the body scrolls as one.
 */
function Modal({ children, isOpen, onClose, title, header, styleClass = '', flush = false }) {
  useEffect(() => {
    if (!isOpen) return undefined
    const onKey = (event) => { if (event.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div
      className="animate-modal-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4 backdrop-blur-sm"
      onClick={(event) => { if (event.target === event.currentTarget) onClose() }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        className={`relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-xl border border-[#E3E2DE] bg-white shadow-2xl ${
          // A dialog that names no width used to be capped by a wrapper. It
          // still is, rather than stretching to the width of the window.
          /(?:^|\s)(?:max-w-|w-\[)/.test(styleClass) ? '' : 'max-w-2xl'
        } ${styleClass}`}
      >
        <div className="flex shrink-0 items-start gap-3 border-b border-[#EDECE8] py-3 pr-3 pl-5">
          <div className="min-w-0 flex-1">{header}</div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-[#5A636D] transition hover:bg-[#F2F1ED] hover:text-[#15181C]"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        <div className={flush ? 'flex min-h-0 flex-1 flex-col overflow-hidden' : 'min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4'}>
          {children}
        </div>
      </div>

      <style>{`
        .animate-modal-fade-in > [role="dialog"] {
          animation: modalFadeIn 0.25s cubic-bezier(0.4,0,0.2,1);
        }
        @keyframes modalFadeIn {
          from { opacity: 0; transform: translateY(20px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}

export default Modal
