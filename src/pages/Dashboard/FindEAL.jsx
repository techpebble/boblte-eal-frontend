import React, { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { LuCircle, LuSearch, LuTriangleAlert } from 'react-icons/lu'
import DashboardLayout from '../../components/layouts/DashboardLayout'
import EmptyState from '../../components/Dashboard/EmptyState'
import { SkeletonLines } from '../../components/Dashboard/Skeleton'
import { CheckIcon, TagIcon, TruckIcon } from '../../components/Dashboard/icons'
import { formatQuantity, itemLabel, marketStyle, padSerial } from '../../components/Dashboard/dashboardFormat'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATHS } from '../../utils/apiPaths'
import { formatDate } from '../../utils/helper'

const nameOf = (ref) => (ref && typeof ref === 'object' ? ref.name : null)

/** Where the label is now, in the words someone would use out loud. */
const STATE = {
  'on-hand': { label: 'On hand, not yet applied', fg: '#8A5A00', bg: '#FBF1DC', Icon: TagIcon },
  applied: { label: 'Applied in production, not yet dispatched', fg: '#0D3C32', bg: '#E7F0EC', Icon: TagIcon },
  linked: { label: 'On a lorry, not yet delivered', fg: '#0D3C32', bg: '#E7F0EC', Icon: TruckIcon },
  'in-transit': { label: 'On the road', fg: '#1D4E89', bg: '#E8EFF8', Icon: TruckIcon },
  delivered: { label: 'Delivered to the depot', fg: '#3C434B', bg: '#EDEFF2', Icon: CheckIcon }
}

const serialSpan = (prefix, from, to) =>
  `${prefix} ${padSerial(from)} → ${padSerial(to)}`

const FindEAL = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [ealNumber, setEalNumber] = useState(searchParams.get('eal') || '')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const run = useCallback(async (value, issuanceId) => {
    const text = String(value ?? '').trim()
    if (!text) return

    setLoading(true)
    setError(null)
    try {
      const response = await axiosInstance.get(API_PATHS.EALUSAGE.FIND, {
        params: { ealNumber: text, ...(issuanceId ? { issuanceId } : {}) }
      })
      setResult(response.data)
    } catch (err) {
      setResult(null)
      setError(err?.response?.data?.error || 'Could not trace that EAL.')
    } finally {
      setLoading(false)
    }
  }, [])

  // A serial in the address bar traces on arrival, so a link to a label works.
  useEffect(() => {
    const fromUrl = searchParams.get('eal')
    if (fromUrl) run(fromUrl, searchParams.get('issuance') || undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = (event) => {
    event.preventDefault()
    const text = ealNumber.trim()
    if (!text) return
    setSearchParams({ eal: text })
    run(text)
  }

  const choose = (candidate) => {
    setSearchParams({ eal: ealNumber.trim(), issuance: candidate.id })
    run(ealNumber, candidate.id)
  }

  const trace = result && !result.needsChoice ? result : null
  const choices = result?.needsChoice ? result.candidates : []
  const state = trace ? STATE[trace.state] || STATE['on-hand'] : null

  /** Issued → applied → dispatched → delivered, each read from the one before. */
  const steps = () => {
    if (!trace) return []
    const list = []
    const issuance = trace.issuance

    list.push({
      key: 'issued',
      done: true,
      title: 'Issued by the excise department',
      when: formatDate(issuance.dateIssued),
      detail: `${formatQuantity(issuance.issuedQuantity)} labels${
        issuance.createdBy?.fullName ? `, received by ${issuance.createdBy.fullName}` : ''
      }. ${
        issuance.balanceQuantity > 0
          ? `${formatQuantity(issuance.balanceQuantity)} of them are still on hand.`
          : 'Nothing of this issuance is left on hand.'
      }`,
      range: serialSpan(issuance.prefix, issuance.serialFrom, issuance.serialTo),
      to: '/eal-issuance',
      link: 'Open EAL Issuance'
    })

    if (trace.usage.length === 0) {
      list.push({
        key: 'applied',
        done: false,
        title: 'Applied in production',
        when: 'not yet',
        detail: 'This label has not been recorded against a production run.'
      })
      return list
    }

    trace.usage.forEach((entry) => {
      const perCase = entry.pack?.bottlesPerCase
      list.push({
        key: `usage-${entry.id}`,
        done: true,
        title: 'Applied in production',
        when: formatDate(entry.dateUsed),
        detail: `${itemLabel(entry.item) || 'Item not named'} — ${formatQuantity(entry.usedQuantityInCases)} cases${
          perCase ? ` of ${formatQuantity(perCase)}` : ''
        }${entry.createdBy?.fullName ? `, recorded by ${entry.createdBy.fullName}` : ''}.`,
        range: serialSpan(entry.prefix, entry.serialFrom, entry.serialTo),
        to: '/eal-usage',
        link: 'Open EAL Usage'
      })
    })

    if (trace.ealDispatches.length === 0) {
      list.push({
        key: 'dispatched',
        done: false,
        title: 'Linked to a dispatch note',
        when: 'not yet',
        detail: 'These cases are in finished stock. No dispatch note carries them.'
      })
      return list
    }

    trace.ealDispatches.forEach((entry) => {
      const note = entry.note
      const vehicle = note?.vehicleDetails?.vehicleNumber
      list.push({
        key: `dispatch-${entry.id}`,
        done: true,
        title: 'Linked to a dispatch note',
        when: formatDate(entry.dateDispatched),
        detail: `${nameOf(note?.deliveryTo) || 'Depot not recorded'}${
          vehicle ? `. Loaded on ${vehicle}${note?.vehicleDetails?.driverName ? `, driver ${note.vehicleDetails.driverName}` : ''}` : ''
        }. ${formatQuantity(entry.usedQuantityInCases)} cases.`,
        range: serialSpan(entry.prefix, entry.serialFrom, entry.serialTo),
        to: note?._id ? `/dispatch/${note._id}` : '/dispatch',
        link: 'Open the dispatch note'
      })
    })

    const note = trace.ealDispatches[0]?.note
    list.push({
      key: 'delivered',
      done: note?.status === 'delivered',
      title: 'Delivered to the depot',
      when: note?.status === 'delivered' ? formatDate(note.dateDispatched) : 'not yet',
      detail: note?.status === 'delivered'
        ? 'The depot has confirmed receipt.'
        : `The note is still marked ${note?.status || 'open'}. It has not been confirmed as delivered.`
    })

    return list
  }

  const rows = steps()

  return (
    <DashboardLayout activeMenu="Find EAL">
      <div className="mx-auto flex w-full max-w-[980px] flex-col gap-4">

        <div>
          <h1 className="m-0 text-[25px] font-semibold tracking-[-0.022em]">Find an EAL</h1>
          <p className="mt-1.5 mb-0 text-[13px] text-[#5A636D]">
            One label, one answer: where it came from, what it went on, and where it went.
          </p>
        </div>

        {/* The serial is the whole query; the prefix is optional, because the
            next step can sort out what it would have narrowed. */}
        <form
          onSubmit={submit}
          className="flex flex-wrap items-end gap-2.5 rounded-xl border border-[#E3E2DE] bg-white px-[18px] py-4"
        >
          <div className="min-w-0 flex-[1_1_320px]">
            <label htmlFor="eal" className="mb-1.5 block text-xs font-medium text-[#3C434B]">EAL serial</label>
            <input
              id="eal"
              value={ealNumber}
              onChange={({ target }) => setEalNumber(target.value)}
              placeholder="NRK2048325000"
              className="font-numeric h-11 w-full rounded-[10px] border border-[#D7D6D1] bg-white px-3.5 text-[19px] tracking-[0.02em] tabular-nums outline-none focus:border-[#15594A] focus:ring-[3px] focus:ring-[#E7F0EC]"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !ealNumber.trim()}
            className="flex h-11 shrink-0 cursor-pointer items-center gap-2 rounded-[10px] border border-[#15594A] bg-[#15594A] px-5 text-[14px] font-semibold text-white hover:bg-[#124C3F] disabled:cursor-not-allowed disabled:border-[#E3E2DE] disabled:bg-[#F2F1ED] disabled:text-[#A8ADB5]"
          >
            <LuSearch />
            {loading ? 'Tracing…' : 'Trace'}
          </button>
          <p className="m-0 flex-[1_1_100%] text-[11.5px] text-[#8A919B]">
            Type the ten digits, with or without the three-letter prefix —{' '}
            <span className="font-numeric tabular-nums">NRK2048325000</span> or{' '}
            <span className="font-numeric tabular-nums">2048325000</span>.
          </p>
        </form>

        {loading && (
          <div className="rounded-xl border border-[#E3E2DE] bg-white px-[18px] py-5"><SkeletonLines rows={4} /></div>
        )}

        {!loading && error && (
          <div className="rounded-xl border border-[#E3E2DE] bg-white px-[18px] py-5">
            <EmptyState
              icon={<TagIcon size={26} strokeWidth={1.5} />}
              title="Nothing holds that serial"
              description={error}
            />
          </div>
        )}

        {/* Only when the serial sits in more than one issuance. A prefix is
            reused across packs and the ranges under it overlap, so the digits
            alone do not always name one label. */}
        {!loading && choices.length > 0 && (
          <section className="overflow-hidden rounded-xl border border-[#EBD9AC] bg-white">
            <div className="flex flex-wrap items-center gap-3 border-b border-[#EBD9AC] bg-[#FBF1DC] px-[18px] py-3.5">
              <LuTriangleAlert className="shrink-0 text-[#8A5A00]" />
              <span className="min-w-0 flex-[1_1_300px] text-[12.5px] text-[#5C3D06]">
                <strong className="font-semibold text-[#3F2A04]">
                  {formatQuantity(choices.length)} issuances hold this serial.
                </strong>{' '}
                Pick the pack you are holding — the trace changes with it.
              </span>
            </div>
            <div className="flex flex-wrap gap-3 px-[18px] py-3.5">
              {choices.map((candidate) => {
                const left = candidate.balanceQuantity > 0
                return (
                  <button
                    key={candidate.id}
                    type="button"
                    onClick={() => choose(candidate)}
                    className="flex min-w-0 flex-[1_1_300px] cursor-pointer flex-col gap-2 rounded-[11px] border border-[#E3E2DE] bg-white px-[15px] py-3.5 text-left hover:border-[#15594A] hover:bg-[#F3F8F6]"
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="font-numeric text-[15px] font-semibold tracking-[0.06em] text-[#15181C]">
                        {candidate.prefix}
                      </span>
                      <span className="text-[12.5px] font-semibold text-[#15181C]">
                        {nameOf(candidate.pack) || 'Pack not named'}
                      </span>
                      <span
                        className="ml-auto rounded-[5px] px-[7px] py-0.5 text-[10.5px] font-semibold"
                        style={{
                          color: marketStyle(candidate.market).fg,
                          backgroundColor: marketStyle(candidate.market).bg
                        }}
                      >
                        {marketStyle(candidate.market).label}
                      </span>
                    </span>
                    <span className="truncate text-[11.5px] text-[#4A5159]">
                      {nameOf(candidate.company) || '—'} · issued {formatDate(candidate.dateIssued)}
                    </span>
                    <span className="font-numeric text-[11.5px] whitespace-nowrap text-[#5A636D] tabular-nums">
                      {padSerial(candidate.serialFrom)}
                      <span className="px-1 text-[#C3C2BD]">→</span>
                      {padSerial(candidate.serialTo)}
                    </span>
                    {/* Usually the line that makes the right one obvious. */}
                    <span
                      className="flex items-center gap-[7px] text-[11px]"
                      style={{ color: left ? '#8A5A00' : '#15594A' }}
                    >
                      {left ? <LuCircle className="shrink-0" /> : <CheckIcon size={13} strokeWidth={2.3} />}
                      {left
                        ? `${formatQuantity(candidate.balanceQuantity)} of ${formatQuantity(candidate.issuedQuantity)} labels still on hand`
                        : `All ${formatQuantity(candidate.issuedQuantity)} labels applied`}
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* One label, one chain. */}
        {!loading && trace && (
          <section className="overflow-hidden rounded-xl border border-[#E3E2DE] bg-white">
            <div className="flex flex-wrap items-center gap-3.5 border-b border-[#EDECE8] px-[18px] py-4">
              <div className="min-w-0 flex-[1_1_280px]">
                <h2 className="font-numeric m-0 text-[22px] font-semibold tracking-[0.01em] tabular-nums">
                  <span className="text-[#8A919B]">{trace.prefix}</span>
                  {padSerial(trace.serial)}
                </h2>
                <p className="mt-1.5 mb-0 text-[12.5px] text-[#5A636D]">
                  {[
                    itemLabel(trace.usage[0]?.item),
                    nameOf(trace.issuance.pack),
                    nameOf(trace.issuance.company)
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>
              {state && (
                <span
                  className="flex shrink-0 items-center gap-[7px] rounded-[7px] px-3 py-[7px] text-[12px] font-semibold"
                  style={{ color: state.fg, backgroundColor: state.bg }}
                >
                  <state.Icon size={15} strokeWidth={2} />
                  {state.label}
                </span>
              )}
            </div>

            {/* A way back to the choice, when there was one. */}
            {trace.candidates?.length > 1 && (
              <p className="m-0 border-b border-[#EDECE8] bg-[#FAFAF8] px-[18px] py-2.5 text-[11.5px] text-[#5A636D]">
                {formatQuantity(trace.candidates.length)} issuances hold this serial; showing{' '}
                <strong className="font-semibold text-[#15181C]">
                  {trace.prefix} · {nameOf(trace.issuance.pack)}
                </strong>
                .{' '}
                <button
                  type="button"
                  onClick={() => setResult({ ...result, needsChoice: true })}
                  className="cursor-pointer border-0 bg-transparent p-0 text-[11.5px] font-medium text-[#15594A] underline underline-offset-[3px]"
                >
                  Pick a different one
                </button>
              </p>
            )}

            <ol className="m-0 list-none px-[18px] pt-1.5 pb-[18px]">
              {rows.map((step, index) => {
                const last = index === rows.length - 1
                return (
                  <li key={step.key} className="flex gap-3.5 pt-3.5">
                    <span className="flex w-[26px] shrink-0 flex-col items-center">
                      <span
                        className="flex h-[26px] w-[26px] items-center justify-center rounded-full border-2"
                        style={{
                          backgroundColor: step.done ? '#E7F0EC' : '#FFFFFF',
                          borderColor: step.done ? '#15594A' : '#D7D6D1',
                          color: step.done ? '#15594A' : '#A8ADB5'
                        }}
                      >
                        {step.done ? <CheckIcon size={13} strokeWidth={2.4} /> : <LuCircle className="text-[11px]" />}
                      </span>
                      {!last && (
                        <span
                          className="min-h-[18px] w-0.5 flex-1"
                          style={{ backgroundColor: step.done && rows[index + 1]?.done ? '#15594A' : '#EDECE8' }}
                        />
                      )}
                    </span>
                    <span className="min-w-0 flex-1 pb-1">
                      <span className="flex flex-wrap items-baseline gap-2.5">
                        <span
                          className="text-[13.5px] font-semibold tracking-[-0.008em]"
                          style={{ color: step.done ? '#15181C' : '#8A919B' }}
                        >
                          {step.title}
                        </span>
                        <span className="font-numeric text-[11.5px] text-[#5A636D] tabular-nums">{step.when}</span>
                      </span>
                      <span className="mt-1 block text-[12.5px] text-[#4A5159]">{step.detail}</span>
                      {(step.range || step.link) && (
                        <span className="mt-[7px] flex flex-wrap items-center gap-2">
                          {step.range && (
                            <span className="font-numeric inline-block rounded-[7px] border border-[#EDECE8] bg-[#FAFAF8] px-2.5 py-1 text-[11.5px] whitespace-nowrap text-[#3C434B] tabular-nums">
                              {step.range}
                            </span>
                          )}
                          {step.link && (
                            <Link to={step.to} className="text-[11.5px] font-medium">
                              {step.link} →
                            </Link>
                          )}
                        </span>
                      )}
                    </span>
                  </li>
                )
              })}
            </ol>
          </section>
        )}

        {!loading && !trace && choices.length === 0 && !error && (
          <div className="rounded-xl border border-[#E3E2DE] bg-white px-[18px] py-5">
            <EmptyState
              icon={<TagIcon size={26} strokeWidth={1.5} />}
              title="Trace a label"
              description="Type an EAL serial above to see where it came from and where it went."
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

export default FindEAL
