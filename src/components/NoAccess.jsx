import React from 'react'
import { Link } from 'react-router-dom'

/**
 * Shown when a role opens nothing at all — a role with no view permissions
 * ticked. Without this the app would send such a person round a redirect
 * loop looking for a page to land on.
 */
const NoAccess = () => (
  <div className="font-ui flex min-h-screen items-center justify-center bg-[#F6F5F3] px-5 text-[#15181C]">
    <div className="w-full max-w-[440px] rounded-xl border border-[#E3E2DE] bg-white px-7 py-8 text-center">
      <h1 className="m-0 text-[21px] font-semibold tracking-[-0.02em]">Nothing to show you</h1>
      <p className="mt-2.5 mb-0 text-[13px] leading-[1.55] text-[#5A636D]">
        Your role does not open any of the screens in this app yet. An
        administrator can add the permissions you need.
      </p>
      <Link
        to="/logout"
        className="mt-5 inline-flex h-9 items-center rounded-lg border border-[#D7D6D1] bg-white px-3.5 text-[13px] font-medium text-[#2A2F36] hover:bg-[#FAFAF8]"
      >
        Sign out
      </Link>
    </div>
  </div>
)

export default NoAccess
