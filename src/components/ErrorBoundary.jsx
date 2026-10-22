import React from 'react'

/**
 * Catches a render error so one bad value shows a message instead of a blank
 * white page.
 *
 * Written after a role changed from a string to a record: the sidebar
 * rendered the object, React refused it, and the whole app went white with
 * nothing on screen to say why.
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('Render failed:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="font-ui flex min-h-screen items-center justify-center bg-[#F6F5F3] px-6">
        <div className="w-full max-w-[520px] rounded-xl border border-[#E3E2DE] bg-white px-6 py-6">
          <h1 className="m-0 text-[19px] font-semibold tracking-[-0.018em]">
            This page could not be shown
          </h1>
          <p className="mt-2 mb-0 text-[13px] text-[#5A636D]">
            Something went wrong while drawing the screen. Nothing you were looking
            at has been changed.
          </p>

          <pre className="font-numeric mt-4 mb-0 overflow-x-auto rounded-lg border border-[#F3C9C7] bg-[#FCEBEA] px-3.5 py-3 text-[11.5px] whitespace-pre-wrap text-[#7A2322]">
            {String(this.state.error?.message || this.state.error)}
          </pre>

          <div className="mt-5 flex gap-2.5">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="h-9 cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] px-3.5 text-[13px] font-semibold text-white hover:bg-[#124C3F]"
            >
              Reload
            </button>
            <a
              href="/dashboard"
              className="flex h-9 items-center rounded-lg border border-[#D7D6D1] bg-white px-3.5 text-[13px] font-medium text-[#2A2F36]"
            >
              Back to the dashboard
            </a>
          </div>
        </div>
      </div>
    )
  }
}

export default ErrorBoundary
