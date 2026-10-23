import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LuChevronRight, LuCircle, LuX } from 'react-icons/lu'
import SerialRange from '../Dashboard/SerialRange'
import { SkeletonLines } from '../Dashboard/Skeleton'
import { CheckIcon, TruckIcon } from '../Dashboard/icons'
import EmptyState from '../Dashboard/EmptyState'
import { formatQuantity, itemLabel, marketStyle, padSerial, shortReference } from '../Dashboard/dashboardFormat'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATHS } from '../../utils/apiPaths'
import { formatDate } from '../../utils/helper'
import { UserContext } from '../../context/userContext'
import { can } from '../../utils/permissions'
import { LINKABLE_STATUS, TOLERANCE, casesLeft, linkedCases, totalCases } from '../../utils/dispatchStages'
import { planCover } from '../../utils/coverPlan'

const headerCell =
  'bg-[#FAFAF8] px-3 pt-[9px] pb-2 text-left text-[10.5px] font-semibold tracking-[0.07em] text-[#5A636D] uppercase whitespace-nowrap'
const bodyCell = 'border-t border-[#EDECE8] px-3 py-2.5 text-[12.5px] text-[#2A2F36]'
const fieldClass =
  'h-9 w-full rounded-lg border border-[#D7D6D1] bg-white px-2.5 font-numeric text-[13px] tabular-nums outline-none focus:border-[#15594A] focus:ring-[3px] focus:ring-[#E7F0EC]'

const tenDigits = (value) => /^\d{10}$/.test(String(value ?? '').trim())

const STRATEGIES = [
  { key: 'oldest', label: 'Oldest first' },
  { key: 'largest', label: 'Fewest ranges' },
  { key: 'single', label: 'One run only' }
]

/**
 * Covering one dispatch note's cases with serial ranges.
 *
 * Shown in a dialog over the list, so three notes in a row are three dialogs
 * rather than three journeys out of the list and back to it.
 */
const CoverNote = ({ dispatchId, onClose, onChanged }) => {
  const { user } = useContext(UserContext)
  const mayLink = can(user, 'dispatch:link')
  const mayStatus = can(user, 'dispatch:status')

  const [note, setNote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [touched, setTouched] = useState(false)

  const [focusedId, setFocusedId] = useState(null)
  const [strategy, setStrategy] = useState('oldest')
  const [stock, setStock] = useState([])
  const [stockLoading, setStockLoading] = useState(false)
  const [dropped, setDropped] = useState(() => new Set())
  const [manualOpen, setManualOpen] = useState(false)
  const [manual, setManual] = useState({ prefix: '', serialFrom: '', serialTo: '' })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await axiosInstance.get(`${API_PATHS.DISPATCH.GET_DATA}/${dispatchId}`)
      setNote(response.data?.data || null)
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not load this dispatch note.')
    } finally {
      setLoading(false)
    }
  }, [dispatchId])

  useEffect(() => { load() }, [load])

  // Open on the first item that still needs ranges — the reason the dialog
  // was opened at all.
  useEffect(() => {
    if (!note || focusedId) return
    const waiting = (note.items || []).find((entry) => casesLeft(entry) > TOLERANCE)
    setFocusedId((waiting || note.items?.[0])?.item?._id || null)
  }, [note, focusedId])

  const focused = note?.items?.find((entry) => entry.item?._id === focusedId) || null
  const shortfall = focused ? casesLeft(focused) : 0
  const perCase = focused?.item?.bottlesPerCase || 0
  const canLink = mayLink && note?.status === LINKABLE_STATUS

  // What production has left for this item. The same question addEALDispatch
  // asks internally, asked here so a person does not have to read it off a list.
  useEffect(() => {
    if (!focused || !note || !canLink || shortfall <= TOLERANCE) { setStock([]); return undefined }
    let cancelled = false
    setStockLoading(true)

    const run = async () => {
      try {
        const response = await axiosInstance.get(API_PATHS.EALUSAGE.GET_DATA, {
          params: {
            type: 'balance',
            company: note.company?._id || note.company,
            market: note.market
          }
        })
        if (cancelled) return
        const rows = (response.data?.data || []).filter(
          (entry) => String(entry.item?._id || entry.item) === String(focused.item?._id)
        )
        setStock(rows)
      } catch (err) {
        if (!cancelled) {
          console.error('Could not read production stock.', err)
          setStock([])
        }
      } finally {
        if (!cancelled) setStockLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [focused, note, canLink, shortfall])

  useEffect(() => { setDropped(new Set()) }, [focusedId, strategy])

  const plan = useMemo(
    () => planCover({ usages: stock, perCase, casesNeeded: Math.round(shortfall), strategy }),
    [stock, perCase, shortfall, strategy]
  )

  const keyOf = (line) => `${line.prefix}-${line.serialFrom}-${line.serialTo}`
  const kept = plan.lines.filter((line) => !dropped.has(keyOf(line)))
  const keptCases = kept.reduce((sum, line) => sum + line.cases, 0)
  const keptLabels = kept.reduce((sum, line) => sum + line.labels, 0)

  const linkOne = async (prefix, serialFrom, serialTo) => {
    const response = await axiosInstance.post(API_PATHS.EALDISPATCH.ADD_EAL_LINK, {
      dispatchId: note._id,
      itemId: focused.item._id,
      prefix,
      serialFrom: String(serialFrom),
      serialTo: String(serialTo)
    })
    return response.data.updatedDispatch
  }

  /** One call per range, because the API links one at a time. Whatever lands
      is kept; the rest are named rather than silently dropped. */
  const linkPlan = async () => {
    if (kept.length === 0) return
    setBusy(true)
    let latest = note
    const failed = []

    for (const line of kept) {
      try {
        latest = await linkOne(line.prefix, line.serialFrom, line.serialTo)
      } catch (err) {
        failed.push(err?.response?.data?.message || `${line.prefix}${padSerial(line.serialFrom)}`)
      }
    }

    setNote(latest)
    setTouched(true)
    setDropped(new Set())
    if (failed.length === 0) {
      toast.success(`${formatQuantity(kept.length)} range${kept.length === 1 ? '' : 's'} linked`)
    } else {
      toast.error(`${formatQuantity(failed.length)} of ${formatQuantity(kept.length)} could not be linked: ${failed[0]}`)
    }
    setBusy(false)
  }

  const manualChecks = useMemo(() => {
    const prefix = manual.prefix.trim()
    const ready = tenDigits(manual.serialFrom) && tenDigits(manual.serialTo)
    const from = Number(manual.serialFrom)
    const to = Number(manual.serialTo)
    const count = ready ? to - from + 1 : 0
    const cases = ready && perCase > 0 && count > 0 ? count / perCase : 0
    return {
      cases,
      countKnown: ready && count > 0,
      valid: /^[A-Z]{3}$/.test(prefix) && ready && count > 0 && perCase > 0 &&
        count % perCase === 0 && to % perCase === 0 && (from - 1) % perCase === 0 &&
        cases <= shortfall + TOLERANCE
    }
  }, [manual, perCase, shortfall])

  const addManual = async () => {
    if (!manualChecks.valid) return
    try {
      setBusy(true)
      setNote(await linkOne(manual.prefix, manual.serialFrom, manual.serialTo))
      setManual({ prefix: '', serialFrom: '', serialTo: '' })
      setTouched(true)
      toast.success('Range linked')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not link that range.')
    } finally {
      setBusy(false)
    }
  }

  const unlink = async (link) => {
    try {
      setBusy(true)
      const response = await axiosInstance.post(API_PATHS.EALDISPATCH.REMOVE_EAL_LINK, {
        dispatchId: note._id,
        itemId: focused.item._id,
        prefix: link.prefix,
        serialFrom: link.serialFrom,
        serialTo: link.serialTo
      })
      setNote(response.data.updatedDispatch)
      setTouched(true)
      toast.success('Range unlinked')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not unlink that range.')
    } finally {
      setBusy(false)
    }
  }

  const close = () => {
    if (touched) onChanged?.()
    onClose()
  }

  if (loading) return <div className="px-2 py-4"><SkeletonLines rows={6} /></div>

  if (error || !note) {
    return (
      <div className="px-2 py-4">
        <EmptyState
          icon={<TruckIcon size={26} strokeWidth={1.5} />}
          title="Not found"
          description={error || 'This dispatch note is not one you can see.'}
        />
      </div>
    )
  }

  const done = linkedCases(note)
  const total = totalCases(note)
  const pct = total > 0 ? Math.min(100, (done / total) * 100) : 0
  const waiting = (note.items || []).filter((entry) => casesLeft(entry) > TOLERANCE)
  const covered = waiting.length === 0

  return (
    <div className="flex max-h-[76vh] min-h-[420px] flex-col">

      {/* Identity and how far the whole note has got */}
      <div className="flex shrink-0 flex-wrap items-center gap-3.5 border-b border-[#EDECE8] pb-3.5">
        <div className="min-w-0 flex-[1_1_260px]">
          <h2 className="m-0 flex flex-wrap items-center gap-2 text-[17px] font-semibold tracking-[-0.016em]">
            {note.deliveryTo?.name || 'Depot not set'}
            <span
              className="rounded-[5px] px-[7px] py-0.5 text-[10.5px] font-semibold"
              style={{ color: marketStyle(note.market).fg, backgroundColor: marketStyle(note.market).bg }}
            >
              {marketStyle(note.market).label}
            </span>
          </h2>
          <p className="mt-1 mb-0 text-[12px] text-[#5A636D]">
            <span className="font-numeric tabular-nums">{shortReference(note._id)}</span>
            {' · '}{note.company?.name || '—'}
            {' · '}<span className="font-numeric tabular-nums">{formatDate(note.dateDispatched)}</span>
          </p>
        </div>
        <div className="flex w-[190px] shrink-0 flex-col gap-1.5">
          <span className="flex items-baseline justify-between gap-2">
            <span className="font-numeric text-[15px] font-semibold tabular-nums">
              {formatQuantity(done)}
              <span className="font-normal text-[#8A919B]"> / {formatQuantity(total)}</span>
            </span>
            <span className="text-[10.5px] text-[#5A636D]">cases covered</span>
          </span>
          <span className="h-1.5 overflow-hidden rounded bg-[#EFEEEA]">
            <span
              className="block h-full rounded"
              style={{ width: `${pct}%`, backgroundColor: covered ? '#15594A' : '#C07A1E' }}
            />
          </span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 items-stretch">

        {/* The items, as a checklist you work down */}
        <aside className="flex w-[232px] shrink-0 flex-col border-r border-[#EDECE8] bg-[#FAFAF8]">
          <p className="m-0 px-3 pt-3 pb-2 text-[10.5px] font-semibold tracking-[0.07em] text-[#5A636D] uppercase">
            Items · {covered ? 'all covered' : `${formatQuantity(waiting.length)} to cover`}
          </p>
          <ul className="m-0 flex min-h-0 flex-1 list-none flex-col gap-1 overflow-y-auto p-2 pt-0">
            {(note.items || []).map((entry) => {
              const left = casesLeft(entry)
              const full = left <= TOLERANCE
              const itemTotal = entry.quantityInCases || 0
              const itemPct = itemTotal > 0 ? Math.min(100, ((entry.EALIssuedQuantity || 0) / itemTotal) * 100) : 0
              const on = entry.item?._id === focusedId
              return (
                <li key={entry.item?._id || entry._id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => setFocusedId(entry.item?._id)}
                    className={`block w-full cursor-pointer rounded-[9px] border px-[11px] py-2.5 text-left ${
                      on ? 'border-[#15594A] bg-white' : 'border-[#E3E2DE] bg-transparent hover:bg-white'
                    }`}
                  >
                    <span className="flex items-start gap-2">
                      <span className="mt-px shrink-0" style={{ color: full ? '#15594A' : '#C07A1E' }}>
                        {full ? <CheckIcon size={14} strokeWidth={2.3} /> : <LuCircle className="text-[13px]" />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[12px] font-semibold text-[#15181C]">
                          {itemLabel(entry.item) || '—'}
                        </span>
                        <span className="mt-0.5 block truncate text-[10.5px] text-[#5A636D]">
                          {formatQuantity(itemTotal)} cases
                          {entry.item?.bottlesPerCase ? ` · ${formatQuantity(entry.item.bottlesPerCase)} per case` : ''}
                        </span>
                      </span>
                    </span>
                    <span className="mt-[7px] flex items-center gap-[7px]">
                      <span className="h-1 flex-1 overflow-hidden rounded-sm bg-[#EFEEEA]">
                        <span
                          className="block h-full rounded-sm"
                          style={{ width: `${itemPct}%`, backgroundColor: full ? '#15594A' : '#C07A1E' }}
                        />
                      </span>
                      <span
                        className="font-numeric shrink-0 text-[10px] font-medium tabular-nums"
                        style={{ color: full ? '#15594A' : '#8A5A00' }}
                      >
                        {full ? 'Covered' : `${formatQuantity(left)} left`}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>

        {/* The work on the focused item */}
        <section className="min-w-0 flex-1 overflow-y-auto">
          {!focused ? (
            <div className="px-4 py-5">
              <EmptyState icon={<TruckIcon size={24} strokeWidth={1.5} />} title="No items" description="This note has no lines." />
            </div>
          ) : (
            <div className="flex flex-col gap-3 px-4 py-3.5">

              <div>
                <h3 className="m-0 text-[15px] font-semibold tracking-[-0.014em]">{itemLabel(focused.item) || '—'}</h3>
                <p className="mt-1 mb-0 text-[12px] text-[#5A636D]">
                  {formatQuantity(focused.quantityInCases)} cases on this note ·{' '}
                  {shortfall > TOLERANCE
                    ? <strong className="font-semibold text-[#8A5A00]">{formatQuantity(shortfall)} still to cover</strong>
                    : <strong className="font-semibold text-[#15594A]">covered</strong>}
                  {perCase ? ` · ${formatQuantity(perCase)} bottles per case` : ''}
                </p>
              </div>

              {/* The app proposes; the person checks. */}
              {canLink && shortfall > TOLERANCE && (
                <div className="overflow-hidden rounded-[11px] border border-[#C9DED6] bg-white">
                  <div className="flex flex-wrap items-center gap-3 border-b border-[#DCEAE4] bg-[#F3F8F6] px-[15px] py-3">
                    <div className="min-w-0 flex-[1_1_240px]">
                      <h4 className="m-0 text-[13px] font-semibold tracking-[-0.008em] text-[#0D3C32]">
                        Proposed from production stock
                      </h4>
                      <p className="mt-0.5 mb-0 text-[11.5px] text-[#3C5B52]">
                        {stockLoading
                          ? 'Reading what production has left…'
                          : `${formatQuantity(stock.length)} run${stock.length === 1 ? '' : 's'} hold labels for this item.`}
                      </p>
                    </div>
                    <label className="flex items-center gap-1.5 text-[11.5px] text-[#3C5B52]">
                      Take from
                      <select
                        value={strategy}
                        onChange={({ target }) => setStrategy(target.value)}
                        className="h-7 cursor-pointer rounded-[7px] border border-[#C9DED6] bg-white px-1.5 text-[11.5px] text-[#0D3C32]"
                      >
                        {STRATEGIES.map((entry) => (
                          <option key={entry.key} value={entry.key}>{entry.label}</option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {stockLoading ? (
                    <div className="px-4 py-4"><SkeletonLines rows={3} /></div>
                  ) : kept.length === 0 ? (
                    <p className="m-0 px-[15px] py-4 text-[12px] text-[#5A636D]">
                      {stock.length === 0
                        ? 'No production run for this item has labels left. Record the usage first, or type a range by hand below.'
                        : 'Nothing left to propose — drop fewer ranges, or type one by hand below.'}
                    </p>
                  ) : (
                    <>
                      <table className="w-full border-collapse">
                        <thead>
                          <tr>
                            <th className={`${headerCell} w-[86px] pl-[15px]`}>Run</th>
                            <th className={headerCell}>Serial range</th>
                            <th className={`${headerCell} w-[82px] text-right`}>Labels</th>
                            <th className={`${headerCell} w-[70px] text-right`}>Cases</th>
                            <th className={`${headerCell} w-[44px] pr-[15px]`} />
                          </tr>
                        </thead>
                        <tbody>
                          {kept.map((line) => (
                            <tr key={keyOf(line)}>
                              <td className={`${bodyCell} font-numeric pl-[15px] text-[11.5px] text-[#5A636D] tabular-nums`}>
                                {formatDate(line.dateUsed)}
                              </td>
                              <td className={bodyCell}>
                                <SerialRange prefix={line.prefix} serialFrom={line.serialFrom} serialTo={line.serialTo} />
                              </td>
                              <td className={`${bodyCell} font-numeric text-right tabular-nums`}>{formatQuantity(line.labels)}</td>
                              <td className={`${bodyCell} font-numeric text-right font-semibold tabular-nums`}>{formatQuantity(line.cases)}</td>
                              <td className={`${bodyCell} pr-[15px] text-right`}>
                                <button
                                  type="button"
                                  aria-label="Drop this range from the proposal"
                                  onClick={() => setDropped((previous) => new Set(previous).add(keyOf(line)))}
                                  className="inline-flex h-[26px] w-[26px] cursor-pointer items-center justify-center rounded-[7px] border border-[#E3E2DE] bg-white text-[#5A636D] hover:bg-[#F2F1ED]"
                                >
                                  <LuX />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      <div className="flex flex-wrap items-center gap-3 border-t border-[#DEDDD8] bg-[#FAFAF8] px-[15px] py-2.5">
                        <p className="m-0 flex min-w-0 flex-[1_1_260px] items-center gap-[7px] text-[12px] text-[#15594A]">
                          <CheckIcon size={14} strokeWidth={2.4} />
                          <span>
                            <strong className="font-semibold">
                              {formatQuantity(kept.length)} range{kept.length === 1 ? '' : 's'} ·{' '}
                              {formatQuantity(keptCases)} cases · {formatQuantity(keptLabels)} labels.
                            </strong>{' '}
                            {keptCases + TOLERANCE >= shortfall
                              ? 'Covers this item exactly.'
                              : `Leaves ${formatQuantity(shortfall - keptCases)} cases short.`}
                          </span>
                        </p>
                        <div className="flex gap-2">
                          {dropped.size > 0 && (
                            <button
                              type="button"
                              onClick={() => setDropped(new Set())}
                              className="h-[34px] cursor-pointer rounded-lg border border-[#D7D6D1] bg-white px-3 text-[12.5px] font-medium text-[#2A2F36]"
                            >
                              Start again
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={busy}
                            onClick={linkPlan}
                            className="h-[34px] cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] px-[15px] text-[12.5px] font-semibold text-white hover:bg-[#124C3F] disabled:opacity-60"
                          >
                            {busy ? 'Linking…' : `Link ${kept.length === 1 ? 'this range' : `these ${kept.length} ranges`}`}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* The old way, one click down, for a serial read off the labels */}
              {canLink && shortfall > TOLERANCE && (
                <div className="rounded-[11px] border border-[#E3E2DE] bg-white">
                  <button
                    type="button"
                    aria-expanded={manualOpen}
                    onClick={() => setManualOpen((open) => !open)}
                    className="flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-[15px] py-2.5 text-left text-[12px] font-medium text-[#2A2F36]"
                  >
                    <LuChevronRight className={`text-[#8A919B] ${manualOpen ? 'rotate-90' : ''}`} />
                    Type a range by hand instead
                    <span className="font-normal text-[#5A636D]">— for a serial read off the labels</span>
                  </button>
                  {manualOpen && (
                    <form
                      className="flex flex-wrap items-end gap-2.5 px-[15px] pb-3.5"
                      onSubmit={(event) => { event.preventDefault(); addManual() }}
                    >
                      <div className="flex-[0_0_88px]">
                        <label htmlFor="c-prefix" className="mb-1 block text-[11px] font-medium text-[#3C434B]">Prefix</label>
                        <input
                          id="c-prefix"
                          value={manual.prefix}
                          onChange={({ target }) => setManual((p) => ({ ...p, prefix: target.value.toUpperCase() }))}
                          maxLength={3}
                          placeholder="ABC"
                          className={`${fieldClass} tracking-[0.08em] uppercase`}
                        />
                      </div>
                      <div className="min-w-0 flex-[1_1_140px]">
                        <label htmlFor="c-from" className="mb-1 block text-[11px] font-medium text-[#3C434B]">Serial from</label>
                        <input
                          id="c-from"
                          value={manual.serialFrom}
                          onChange={({ target }) => setManual((p) => ({ ...p, serialFrom: target.value }))}
                          inputMode="numeric"
                          placeholder="10 digits"
                          className={fieldClass}
                        />
                      </div>
                      <div className="min-w-0 flex-[1_1_140px]">
                        <label htmlFor="c-to" className="mb-1 block text-[11px] font-medium text-[#3C434B]">Serial to</label>
                        <input
                          id="c-to"
                          value={manual.serialTo}
                          onChange={({ target }) => setManual((p) => ({ ...p, serialTo: target.value }))}
                          inputMode="numeric"
                          placeholder="10 digits"
                          className={fieldClass}
                        />
                      </div>
                      <div className="flex-[0_0_104px]">
                        <span className="mb-1 block text-[11px] font-medium text-[#3C434B]">Resolves to</span>
                        <div className="flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-[#D7D6D1] bg-[#FAFAF8] px-2.5">
                          <span className="font-numeric text-[13px] font-semibold text-[#0D3C32] tabular-nums">
                            {manualChecks.countKnown ? formatQuantity(manualChecks.cases) : '—'}
                          </span>
                          <span className="text-[11px] text-[#5A636D]">cases</span>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={!manualChecks.valid || busy}
                        className="h-9 shrink-0 cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] px-3.5 text-[12.5px] font-semibold text-white disabled:cursor-not-allowed disabled:border-[#E3E2DE] disabled:bg-[#F2F1ED] disabled:text-[#A8ADB5]"
                      >
                        Add range
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* What this item already carries */}
              <div className="overflow-hidden rounded-[11px] border border-[#E3E2DE] bg-white">
                <h4 className="m-0 px-[15px] pt-2.5 pb-0.5 text-[12.5px] font-semibold tracking-[-0.008em]">
                  Already covered · {formatQuantity(focused.EALIssuedQuantity || 0)} cases
                </h4>
                {(focused.EALLinks || []).length === 0 ? (
                  <p className="m-0 px-[15px] py-3 text-[12px] text-[#5A636D]">No ranges linked to this item yet.</p>
                ) : (
                  <table className="w-full border-collapse">
                    <thead>
                      <tr>
                        <th className={`${headerCell} pl-[15px]`}>Serial range</th>
                        <th className={`${headerCell} w-[82px] text-right`}>Labels</th>
                        <th className={`${headerCell} w-[70px] text-right`}>Cases</th>
                        <th className={`${headerCell} w-[84px] pr-[15px]`} />
                      </tr>
                    </thead>
                    <tbody>
                      {focused.EALLinks.map((link, index) => {
                        const labels = link.serialTo - link.serialFrom + 1
                        return (
                          <tr key={`${link.prefix}-${link.serialFrom}-${index}`}>
                            <td className={`${bodyCell} pl-[15px]`}>
                              <SerialRange prefix={link.prefix} serialFrom={link.serialFrom} serialTo={link.serialTo} />
                            </td>
                            <td className={`${bodyCell} font-numeric text-right tabular-nums`}>{formatQuantity(labels)}</td>
                            <td className={`${bodyCell} font-numeric text-right font-medium tabular-nums`}>
                              {perCase > 0 ? formatQuantity(labels / perCase) : '—'}
                            </td>
                            <td className={`${bodyCell} pr-[15px] text-right`}>
                              {canLink && (
                                <button
                                  type="button"
                                  disabled={busy}
                                  onClick={() => unlink(link)}
                                  className="h-[26px] cursor-pointer rounded-[7px] border border-[#E3BDBB] bg-white px-2 text-[11.5px] text-[#9B2C2C] hover:bg-[#FCEBEA] disabled:opacity-60"
                                >
                                  Unlink
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {!canLink && (
                <p className="m-0 rounded-[10px] border border-[#EDECE8] bg-[#FAFAF8] px-3.5 py-3 text-[12px] text-[#5A636D]">
                  {note.status === LINKABLE_STATUS
                    ? 'Your role does not allow linking serial ranges.'
                    : `Labels can only be linked while a note is Final. This one is ${note.status}.`}
                </p>
              )}
            </div>
          )}
        </section>
      </div>

      {/* The work above is one item; this is what the whole note is waiting for */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-[#EDECE8] pt-3.5">
        <p className="m-0 min-w-0 flex-[1_1_280px] text-[12px] text-[#5A636D]">
          {covered ? (
            <>
              <strong className="font-semibold text-[#15181C]">Every case carries a serial range.</strong>{' '}
              Record the vehicle to mark this note loaded.
            </>
          ) : (
            <>
              <strong className="font-semibold text-[#15181C]">
                {formatQuantity(total - done)} cases across{' '}
                {formatQuantity(waiting.length)} item{waiting.length === 1 ? '' : 's'}
              </strong>{' '}
              still have no serial range. The note can be marked loaded once every case carries one.
            </>
          )}
        </p>
        <Link
          to={`/dispatch/${note._id}`}
          className="h-9 shrink-0 rounded-lg border border-[#D7D6D1] bg-white px-3 text-[12.5px] leading-[34px] font-medium text-[#2A2F36] hover:bg-[#FAFAF8]"
        >
          Open full page
        </Link>
        <button
          type="button"
          onClick={close}
          className="h-9 shrink-0 cursor-pointer rounded-lg border border-[#D7D6D1] bg-white px-3.5 text-[12.5px] font-medium text-[#2A2F36] hover:bg-[#FAFAF8]"
        >
          Close
        </button>
        <button
          type="button"
          disabled={!covered || !mayStatus || note.status !== LINKABLE_STATUS}
          onClick={() => { if (touched) onChanged?.(); onClose('load') }}
          className="h-9 shrink-0 cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#124C3F] disabled:cursor-not-allowed disabled:border-[#E3E2DE] disabled:bg-[#F2F1ED] disabled:text-[#A8ADB5]"
        >
          Mark loaded
        </button>
      </div>
    </div>
  )
}

export default CoverNote
