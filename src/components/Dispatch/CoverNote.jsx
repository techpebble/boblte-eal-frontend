import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LuCircle, LuX } from 'react-icons/lu'
import SerialRange from '../Dashboard/SerialRange'
import { SkeletonLines } from '../Dashboard/Skeleton'
import { CheckIcon, TruckIcon } from '../Dashboard/icons'
import EmptyState from '../Dashboard/EmptyState'
import { formatQuantity, itemLabel } from '../Dashboard/dashboardFormat'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATHS } from '../../utils/apiPaths'
import { UserContext } from '../../context/userContext'
import { can } from '../../utils/permissions'
import { LINKABLE_STATUS, TOLERANCE, casesLeft, linkedCases, totalCases } from '../../utils/dispatchStages'

const headerCell =
  'bg-[#FAFAF8] px-3 pt-[9px] pb-2 text-left text-[10.5px] font-semibold tracking-[0.07em] text-[#5A636D] uppercase whitespace-nowrap'
const bodyCell = 'border-t border-[#EDECE8] px-3 py-2.5 text-[12.5px] text-[#2A2F36]'
const fieldClass =
  'h-9 w-full rounded-lg border border-[#D7D6D1] bg-white px-2.5 font-numeric text-[13px] tabular-nums outline-none focus:border-[#15594A] focus:ring-[3px] focus:ring-[#E7F0EC]'

const textField =
  'h-9 w-full rounded-lg border border-[#D7D6D1] bg-white px-2.5 text-[13px] outline-none focus:border-[#15594A] focus:ring-[3px] focus:ring-[#E7F0EC]'

const tenDigits = (value) => /^\d{10}$/.test(String(value ?? '').trim())

/** The rail holds items, and one entry that is not an item. */
const LOAD_PANE = '__load__'

const emptyVehicle = { vehicleNumber: '', driverName: '', driverContact: '' }

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
  const [entry, setEntry] = useState({ prefix: '', serialFrom: '', serialTo: '' })
  const [vehicle, setVehicle] = useState(emptyVehicle)

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

  const onLoadPane = focusedId === LOAD_PANE
  const focused = onLoadPane
    ? null
    : note?.items?.find((entry) => entry.item?._id === focusedId) || null
  const shortfall = focused ? casesLeft(focused) : 0
  const perCase = focused?.item?.bottlesPerCase || 0
  const canLink = mayLink && note?.status === LINKABLE_STATUS

  // A fresh item means a fresh form.
  useEffect(() => { setEntry({ prefix: '', serialFrom: '', serialTo: '' }) }, [focusedId])

  // What the note says about the lorry, and the copy of it being edited. The
  // effect watches the three values rather than the note object, so linking a
  // range does not wipe something half-typed on the other pane.
  const stored = {
    vehicleNumber: note?.vehicleDetails?.vehicleNumber || '',
    driverName: note?.vehicleDetails?.driverName || '',
    driverContact: note?.vehicleDetails?.driverContact || ''
  }
  const { vehicleNumber: storedNumber, driverName: storedDriver, driverContact: storedContact } = stored

  useEffect(() => {
    setVehicle({ vehicleNumber: storedNumber, driverName: storedDriver, driverContact: storedContact })
  }, [storedNumber, storedDriver, storedContact])

  const hasVehicle = storedNumber.trim().length > 0
  const vehicleEdited =
    vehicle.vehicleNumber !== storedNumber ||
    vehicle.driverName !== storedDriver ||
    vehicle.driverContact !== storedContact

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

  /** Mirrors what addEALLinkToDispatchItem enforces, so a bad range is caught
      before it is sent. A check stays unjudged until the fields it reads hold
      something, so an untouched form shows no verdicts. */
  const checks = useMemo(() => {
    const prefix = entry.prefix.trim()
    const ready = tenDigits(entry.serialFrom) && tenDigits(entry.serialTo)
    const from = Number(entry.serialFrom)
    const to = Number(entry.serialTo)
    const count = ready ? to - from + 1 : 0
    const cases = ready && perCase > 0 && count > 0 ? count / perCase : 0

    const check = (judged, ok, text) => ({ state: !judged ? 'pending' : ok ? 'ok' : 'bad', text })
    const list = [
      check(prefix.length > 0, /^[A-Z]{3}$/.test(prefix), 'Prefix is three uppercase letters.'),
      check(Boolean(entry.serialFrom || entry.serialTo), ready, 'Both serials are ten digits.'),
      check(ready, count > 0, 'Serial to is above serial from.'),
      check(
        ready && count > 0,
        perCase > 0 && count % perCase === 0 && to % perCase === 0 && (from - 1) % perCase === 0,
        `The range closes on a whole case of ${perCase || '—'}.`
      ),
      check(cases > 0, cases <= shortfall + TOLERANCE, `Fits the ${formatQuantity(shortfall)} case(s) still to cover.`)
    ]

    return { list, cases, countKnown: ready && count > 0, valid: list.every((item) => item.state === 'ok') }
  }, [entry, perCase, shortfall])

  const addRange = async () => {
    if (!checks.valid) return
    try {
      setBusy(true)
      setNote(await linkOne(entry.prefix, entry.serialFrom, entry.serialTo))
      setEntry({ prefix: '', serialFrom: '', serialTo: '' })
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

  /**
   * Who is carrying the load.
   *
   * The stage is left out of the body on purpose: the controller reads it as
   * `status ?? existing.status`, so omitting it saves the lorry without
   * moving the note on. Recording a vehicle and marking a note loaded used to
   * be the same act, and correcting a mistyped number should not be.
   *
   * What comes back is not populated, so only the three fields are merged in
   * rather than the whole note being replaced by a thinner copy of itself.
   */
  const saveVehicle = async () => {
    const body = {
      vehicleNumber: vehicle.vehicleNumber.trim(),
      driverName: vehicle.driverName.trim(),
      driverContact: vehicle.driverContact.trim()
    }
    try {
      setBusy(true)
      await axiosInstance.put(`${API_PATHS.DISPATCH.UPDATE_DATA}/${note._id}/vehicle`, body)
      setNote((previous) => ({ ...previous, vehicleDetails: body }))
      setTouched(true)
      toast.success(body.vehicleNumber ? 'Vehicle saved' : 'Vehicle cleared')
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Could not save the vehicle.')
    } finally {
      setBusy(false)
    }
  }

  const markLoaded = async () => {
    try {
      setBusy(true)
      await axiosInstance.put(`${API_PATHS.DISPATCH.UPDATE_DATA}/${note._id}/status`, { status: 'loaded' })
      setTouched(true)
      toast.success('Marked loaded')
      // The note has left the stage this dialog works on, so there is nothing
      // more to do in it. Unmounting refreshes the list behind.
      onClose?.()
    } catch (err) {
      toast.error(err?.response?.data?.error || err?.response?.data?.message || 'Could not mark this note loaded.')
    } finally {
      setBusy(false)
    }
  }

  /**
   * The list behind this dialog is stale the moment a range is linked, and the
   * dialog can be shut by the cross, by Escape or by the backdrop as well as
   * by a button. So it tells the list on the way out, however it goes.
   */
  const changed = useRef(false)
  useEffect(() => { changed.current = touched }, [touched])
  useEffect(() => () => { if (changed.current) onChanged?.() }, [onChanged])

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
    <div className="flex min-h-0 flex-1 flex-col">

      {/* Progress, the full width of the dialog. It used to be squeezed into
          190px beside the title, which is where the close button landed. */}
      <div className="flex shrink-0 flex-wrap items-center gap-3.5 border-b border-[#EDECE8] bg-[#FAFAF8] px-5 py-2.5">
        <span className="flex shrink-0 items-baseline gap-[7px]">
          <span className="font-numeric text-[17px] font-semibold tabular-nums">
            {formatQuantity(done)}
            <span className="font-normal text-[#8A919B]"> / {formatQuantity(total)}</span>
          </span>
          <span className="text-[11.5px] text-[#5A636D]">cases covered</span>
        </span>
        <span className="h-[7px] min-w-[160px] flex-[1_1_220px] overflow-hidden rounded bg-[#EFEEEA]">
          <span
            className="block h-full rounded"
            style={{ width: `${pct}%`, backgroundColor: covered ? '#15594A' : '#C07A1E' }}
          />
        </span>
        <span
          className="shrink-0 text-[11.5px] font-semibold"
          style={{ color: covered ? '#15594A' : '#8A5A00' }}
        >
          {covered
            ? 'every case covered'
            : `${formatQuantity(total - done)} left on ${formatQuantity(waiting.length)} item${waiting.length === 1 ? '' : 's'}`}
        </span>
      </div>

      <div className="flex min-h-0 flex-1 items-stretch">

        {/* The items, as a checklist you work down */}
        {/* 292px. Measured, not guessed: the longest alias in the catalogue —
            "Old Monk Lemon Flavoured 750ml" — draws 198px at this size, and
            272px left only 195px for it. */}
        <aside className="flex w-[292px] shrink-0 flex-col border-r border-[#EDECE8] bg-[#FAFAF8]">
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

          {/* Not an item, but the other thing the note is waiting for, and
              the reason a second dialog used to open on top of this one. */}
          <div className="shrink-0 border-t border-[#E3E2DE] p-2">
            <p className="m-0 px-1 pt-1 pb-1.5 text-[10.5px] font-semibold tracking-[0.07em] text-[#5A636D] uppercase">
              The load
            </p>
            <button
              type="button"
              aria-pressed={onLoadPane}
              onClick={() => setFocusedId(LOAD_PANE)}
              className={`block w-full cursor-pointer rounded-[9px] border px-[11px] py-2.5 text-left ${
                onLoadPane ? 'border-[#15594A] bg-white' : 'border-[#E3E2DE] bg-transparent hover:bg-white'
              }`}
            >
              <span className="flex items-start gap-2">
                <span className="mt-px shrink-0" style={{ color: hasVehicle ? '#15594A' : '#C07A1E' }}>
                  {hasVehicle ? <CheckIcon size={14} strokeWidth={2.3} /> : <LuCircle className="text-[13px]" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold text-[#15181C]">Vehicle &amp; driver</span>
                  <span className="mt-0.5 block truncate text-[10.5px] text-[#5A636D]">
                    {hasVehicle
                      ? <><span className="font-numeric tabular-nums">{storedNumber}</span>{storedDriver ? ` · ${storedDriver}` : ''}</>
                      : 'Not recorded'}
                  </span>
                </span>
              </span>
            </button>
          </div>
        </aside>

        {/* The work on the focused item */}
        <section className="min-w-0 flex-1 overflow-y-auto">
          {onLoadPane ? (
            <div className="flex flex-col gap-3 px-4 py-3.5">
              <div>
                <h3 className="m-0 text-[15px] font-semibold tracking-[-0.014em]">Vehicle &amp; driver</h3>
                <p className="mt-1 mb-0 text-[12px] text-[#5A636D]">
                  Who is carrying this load. Recorded against the note, and what the depot is told to expect.
                </p>
              </div>

              {mayStatus ? (
                <form
                  className="overflow-hidden rounded-[11px] border border-[#E3E2DE] bg-white"
                  onSubmit={(event) => { event.preventDefault(); saveVehicle() }}
                >
                  <div className="flex flex-col gap-3 px-[15px] py-3.5">
                    <div>
                      <label htmlFor="v-number" className="mb-1 block text-[11px] font-medium text-[#3C434B]">
                        Vehicle number
                      </label>
                      <input
                        id="v-number"
                        value={vehicle.vehicleNumber}
                        onChange={({ target }) => setVehicle((p) => ({ ...p, vehicleNumber: target.value.toUpperCase() }))}
                        placeholder="KA.40.B.9654"
                        className={`${fieldClass} tracking-[0.04em] uppercase`}
                      />
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      <div className="min-w-0 flex-[1_1_180px]">
                        <label htmlFor="v-driver" className="mb-1 block text-[11px] font-medium text-[#3C434B]">
                          Driver name
                        </label>
                        <input
                          id="v-driver"
                          value={vehicle.driverName}
                          onChange={({ target }) => setVehicle((p) => ({ ...p, driverName: target.value }))}
                          placeholder="Name on the licence"
                          className={textField}
                        />
                      </div>
                      <div className="min-w-0 flex-[1_1_180px]">
                        <label htmlFor="v-contact" className="mb-1 block text-[11px] font-medium text-[#3C434B]">
                          Driver contact
                        </label>
                        <input
                          id="v-contact"
                          value={vehicle.driverContact}
                          onChange={({ target }) => setVehicle((p) => ({ ...p, driverContact: target.value }))}
                          inputMode="tel"
                          placeholder="10 digits"
                          className={fieldClass}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 border-t border-[#EDECE8] bg-[#FAFAF8] px-[15px] py-2.5">
                    <p className="m-0 min-w-0 flex-[1_1_200px] text-[11.5px] text-[#5A636D]">
                      Saving this does not move the note on.
                    </p>
                    {vehicleEdited && (
                      <button
                        type="button"
                        onClick={() => setVehicle({ vehicleNumber: storedNumber, driverName: storedDriver, driverContact: storedContact })}
                        className="h-9 shrink-0 cursor-pointer rounded-lg border border-[#D7D6D1] bg-white px-3 text-[12.5px] font-medium text-[#2A2F36] hover:bg-[#F2F1ED]"
                      >
                        Undo changes
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!vehicleEdited || busy}
                      className="h-9 shrink-0 cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#124C3F] disabled:cursor-not-allowed disabled:border-[#E3E2DE] disabled:bg-[#F2F1ED] disabled:text-[#A8ADB5]"
                    >
                      {busy ? 'Saving…' : hasVehicle ? 'Save changes' : 'Save vehicle'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="overflow-hidden rounded-[11px] border border-[#E3E2DE] bg-white">
                  <dl className="m-0 grid grid-cols-[132px_minmax(0,1fr)] gap-x-3 gap-y-2.5 px-[15px] py-3.5 text-[12.5px]">
                    <dt className="m-0 text-[#5A636D]">Vehicle number</dt>
                    <dd className="font-numeric m-0 tabular-nums">{storedNumber || '—'}</dd>
                    <dt className="m-0 text-[#5A636D]">Driver name</dt>
                    <dd className="m-0">{storedDriver || '—'}</dd>
                    <dt className="m-0 text-[#5A636D]">Driver contact</dt>
                    <dd className="font-numeric m-0 tabular-nums">{storedContact || '—'}</dd>
                  </dl>
                  <p className="m-0 border-t border-[#EDECE8] bg-[#FAFAF8] px-[15px] py-2.5 text-[11.5px] text-[#5A636D]">
                    Your role can see the vehicle on this note but not change it.
                  </p>
                </div>
              )}
            </div>
          ) : !focused ? (
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

              {/* Adding a range. The arithmetic the server will apply is
                  spelled out beneath, so a refusal is never a surprise. */}
              {canLink && shortfall > TOLERANCE && (
                <div className="overflow-hidden rounded-[11px] border border-[#C9DED6] bg-white">
                  <div className="border-b border-[#DCEAE4] bg-[#F3F8F6] px-[15px] py-2.5">
                    <h4 className="m-0 text-[13px] font-semibold tracking-[-0.008em] text-[#0D3C32]">Add a serial range</h4>
                    <p className="mt-0.5 mb-0 text-[11.5px] text-[#3C5B52]">
                      {perCase
                        ? `${formatQuantity(perCase)} bottles make one case, so the range has to close on a whole case.`
                        : 'This item has no pack size set, so a range cannot be checked against cases.'}
                    </p>
                  </div>

                  <form
                    className="flex flex-wrap items-end gap-2.5 px-[15px] pt-3 pb-2"
                    onSubmit={(event) => { event.preventDefault(); addRange() }}
                  >
                    <div className="flex-[0_0_88px]">
                      <label htmlFor="c-prefix" className="mb-1 block text-[11px] font-medium text-[#3C434B]">Prefix</label>
                      <input
                        id="c-prefix"
                        value={entry.prefix}
                        onChange={({ target }) => setEntry((p) => ({ ...p, prefix: target.value.toUpperCase() }))}
                        maxLength={3}
                        placeholder="ABC"
                        className={`${fieldClass} tracking-[0.08em] uppercase`}
                      />
                    </div>
                    <div className="min-w-0 flex-[1_1_140px]">
                      <label htmlFor="c-from" className="mb-1 block text-[11px] font-medium text-[#3C434B]">Serial from</label>
                      <input
                        id="c-from"
                        value={entry.serialFrom}
                        onChange={({ target }) => setEntry((p) => ({ ...p, serialFrom: target.value }))}
                        inputMode="numeric"
                        placeholder="10 digits"
                        className={fieldClass}
                      />
                    </div>
                    <div className="min-w-0 flex-[1_1_140px]">
                      <label htmlFor="c-to" className="mb-1 block text-[11px] font-medium text-[#3C434B]">Serial to</label>
                      <input
                        id="c-to"
                        value={entry.serialTo}
                        onChange={({ target }) => setEntry((p) => ({ ...p, serialTo: target.value }))}
                        inputMode="numeric"
                        placeholder="10 digits"
                        className={fieldClass}
                      />
                    </div>
                    <div className="flex-[0_0_104px]">
                      <span className="mb-1 block text-[11px] font-medium text-[#3C434B]">Resolves to</span>
                      <div className="flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-[#C9DED6] bg-[#F3F8F6] px-2.5">
                        <span className="font-numeric text-[13px] font-semibold text-[#0D3C32] tabular-nums">
                          {checks.countKnown ? formatQuantity(checks.cases) : '—'}
                        </span>
                        <span className="text-[11px] text-[#15594A]">cases</span>
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={!checks.valid || busy}
                      className="h-9 shrink-0 cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#124C3F] disabled:cursor-not-allowed disabled:border-[#E3E2DE] disabled:bg-[#F2F1ED] disabled:text-[#A8ADB5]"
                    >
                      {busy ? 'Linking…' : 'Add range'}
                    </button>
                  </form>

                  <ul className="m-0 flex list-none flex-col gap-1.5 px-[15px] pb-3.5">
                    {checks.list.map((item) => (
                      <li
                        key={item.text}
                        className="flex items-start gap-2 text-[11.5px]"
                        style={{
                          color: item.state === 'ok' ? '#15594A' : item.state === 'bad' ? '#9B2C2C' : '#8A919B'
                        }}
                      >
                        <span className="mt-px flex h-[13px] w-[13px] shrink-0 items-center justify-center">
                          {item.state === 'ok' && <CheckIcon size={13} strokeWidth={2.4} />}
                          {item.state === 'bad' && <LuX />}
                          {item.state === 'pending' && <span className="block h-[5px] w-[5px] rounded-full bg-[#C3C2BD]" />}
                        </span>
                        {item.text}
                      </li>
                    ))}
                  </ul>
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

      {/* The work above is one pane; this is what the whole note is waiting
          for. Closing is the cross in the corner, so it is not said twice.
          Marking loaded happens here rather than in a second dialog over this
          one — the vehicle it used to ask for is a pane in the rail now. */}
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-[#EDECE8] bg-[#FAFAF8] px-5 py-3">
        <p className="m-0 min-w-0 flex-[1_1_280px] text-[12px] text-[#5A636D]">
          {note.status !== LINKABLE_STATUS
            ? `This note is ${note.status}. Its ranges and vehicle are shown as they were recorded.`
            : covered && hasVehicle
              ? 'Every case carries a range and the vehicle is named. Ready to load.'
              : `${
                  covered
                    ? 'Every case carries a range'
                    : `${formatQuantity(total - done)} case${total - done === 1 ? '' : 's'} still uncovered`
                }. A note is marked loaded once every case carries a range and the vehicle is named.`}
        </p>
        <Link
          to={`/dispatch/${note._id}`}
          className="h-9 shrink-0 rounded-lg border border-[#D7D6D1] bg-white px-3 text-[12.5px] leading-[34px] font-medium text-[#2A2F36] hover:bg-[#FAFAF8]"
        >
          Open full page
        </Link>
        <button
          type="button"
          disabled={!covered || !hasVehicle || !mayStatus || busy || note.status !== LINKABLE_STATUS}
          onClick={markLoaded}
          className="h-9 shrink-0 cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#124C3F] disabled:cursor-not-allowed disabled:border-[#E3E2DE] disabled:bg-[#F2F1ED] disabled:text-[#A8ADB5]"
        >
          {busy ? 'Working…' : 'Mark loaded'}
        </button>
      </div>
    </div>
  )
}

export default CoverNote
