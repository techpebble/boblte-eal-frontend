import React from 'react'
import BrandMark from './BrandMark'

// Illustrative only — a picture of what a serial range looks like as it moves
// through the system. These are not records from this installation.
const SAMPLE_STRIP = [
  { prefix: 'LBC', serial: '0004120001', state: 'Applied', fg: '#0D2A24', bg: '#6FB49F' },
  { prefix: 'LBC', serial: '0004121201', state: 'Applied', fg: '#0D2A24', bg: '#6FB49F' },
  { prefix: 'LBC', serial: '0004122401', state: 'Linked', fg: '#0D2A24', bg: '#9DC4B8' },
  { prefix: 'LBC', serial: '0004123001', state: 'On hand', fg: '#DCEAE4', bg: '#1E463C' },
  { prefix: 'LBC', serial: '0004123601', state: 'On hand', fg: '#DCEAE4', bg: '#1E463C' }
]

const AuthLayout = ({ children }) => (
  <div className="font-ui flex min-h-screen flex-wrap bg-[#F6F5F3] text-[#15181C]">
    <div className="flex min-w-0 flex-[999_1_480px] flex-col px-6 pt-8 pb-9 sm:px-14 sm:pt-10">
      <BrandMark />
      <div className="flex flex-1 items-center">
        <div className="my-9 w-full max-w-[392px]">{children}</div>
      </div>
      <p className="m-0 text-[11.5px] text-[#5A636D]">
        © {new Date().getFullYear()} BOBLTE · Excise label control
      </p>
    </div>

    {/* The panel is decoration, so it steps aside on a narrow screen. */}
    <aside className="hidden min-w-0 flex-[1_1_440px] flex-col justify-between gap-9 overflow-hidden bg-[#11322B] px-11 py-10 text-[#E8EFEB] lg:flex">
      <div className="flex items-center gap-2">
        <span className="h-[7px] w-[7px] rounded-full bg-[#6FB49F]" />
        <span className="text-[10.5px] font-semibold tracking-[0.11em] text-[#9DC4B8] uppercase">
          Excise adhesive label control
        </span>
      </div>

      <div>
        <p className="m-0 mb-7 max-w-[460px] text-[30px] leading-[1.25] font-medium tracking-[-0.025em] text-white">
          Every label accounted for, from the excise department to the depot gate.
        </p>

        <div className="max-w-[460px] rounded-xl border border-[#255146] bg-[#0D2A24] px-[18px] py-4">
          <div className="flex items-center justify-between gap-3 border-b border-[#255146] pb-[11px]">
            <span className="text-[10.5px] font-semibold tracking-[0.1em] text-[#9DC4B8] uppercase">
              Issuance LBC · 625 ml · 12s
            </span>
            <span className="font-numeric text-[10.5px] text-[#6FB49F]">3,600 labels</span>
          </div>
          <div className="flex flex-col gap-[9px] pt-3">
            {SAMPLE_STRIP.map((row) => (
              <div key={row.serial} className="flex items-center gap-3">
                <span className="font-numeric shrink-0 text-xs text-[#5E8E80]">{row.prefix}</span>
                <span className="font-numeric shrink-0 text-[12.5px] tracking-[0.02em] text-[#DCEAE4]">
                  {row.serial}
                </span>
                <span className="h-px flex-1 bg-[#1E463C]" />
                <span
                  className="shrink-0 rounded-[5px] px-[7px] py-[2px] text-[10.5px] font-semibold"
                  style={{ color: row.fg, backgroundColor: row.bg }}
                >
                  {row.state}
                </span>
              </div>
            ))}
          </div>
        </div>
        <p className="m-0 mt-3 max-w-[460px] text-[11px] text-[#5E8E80]">
          Illustration — not records from this system.
        </p>
      </div>

      <p className="m-0 max-w-[460px] text-[12.5px] leading-[1.6] text-[#9DC4B8]">
        Issuance, production and dispatch entries are each recorded against the name of
        the person who posted them.
      </p>
    </aside>
  </div>
)

export default AuthLayout
