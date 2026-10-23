import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LuArrowLeft, LuChevronDown, LuChevronUp, LuTriangleAlert, LuX } from 'react-icons/lu'
import DashboardLayout from '../../components/layouts/DashboardLayout'
import Modal from '../../components/Modal/Modal'
import AddDispatchForm from '../../components/Dispatch/AddDispatchForm'
import EmptyState from '../../components/Dashboard/EmptyState'
import SerialRange from '../../components/Dashboard/SerialRange'
import StatusPill from '../../components/Dashboard/StatusPill'
import { SkeletonLines } from '../../components/Dashboard/Skeleton'
import { CheckIcon, TruckIcon } from '../../components/Dashboard/icons'
import { formatQuantity, itemLabel, marketStyle, shortReference } from '../../components/Dashboard/dashboardFormat'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATHS } from '../../utils/apiPaths'
import { formatDate } from '../../utils/helper'
import { UserContext } from '../../context/userContext'
import { can } from '../../utils/permissions'
import { LINKABLE_STATUS, TOLERANCE, casesLeft, linkedCases, movesFor, totalCases } from '../../utils/dispatchStages'

const headerCell =
  'bg-[#FAFAF8] px-3.5 pt-[11px] pb-2.5 text-left text-[11px] font-semibold tracking-[0.07em] text-[#5A636D] uppercase whitespace-nowrap'
const bodyCell = 'border-t border-[#EDECE8] px-3.5 py-3 text-[13px] text-[#2A2F36]'

const fieldClass =
  'h-[38px] w-full rounded-lg border border-[#D7D6D1] bg-white px-[11px] font-numeric text-[13.5px] tabular-nums text-[#15181C] outline-none focus:border-[#15594A] focus:ring-[3px] focus:ring-[#E7F0EC]'

/** The ten digits have to be there before any judgement about them means anything. */
const tenDigits = (value) => /^\d{10}$/.test(String(value ?? '').trim())

/**
 * One dispatch note, on its own page. The list hands over an id; everything
 * here is about covering this note's cases and moving it along.
 */
const DispatchNote = () => {
  const { dispatchId } = useParams()
  const navigate = useNavigate()
  const { user } = useContext(UserContext)

  const mayEdit = can(user, 'dispatch:edit')
  const mayDelete = can(user, 'dispatch:delete')
  const mayStatus = can(user, 'dispatch:status')
  const mayLink = can(user, 'dispatch:link')

  const [note, setNote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const [openItemId, setOpenItemId] = useState(null)
  const [newEALData, setNewEALData] = useState({ prefix: '', serialFrom: '', serialTo: '' })

  const [formOpen, setFormOpen] = useState(false)
  const [vehicleOpen, setVehicleOpen] = useState(false)
  const [vehicleData, setVehicleData] = useState({ vehicleNumber: '', driverName: '', driverContact: '' })
  const [unlinkCandidate, setUnlinkCandidate] = useState(null)
  const [unlinkConfirmText, setUnlinkConfirmText] = useState('')
  // Undoing a stage is not a one-click act: it says what it will mean first.
  const [undoing, setUndoing] = useState(null)

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

  const openItem = note?.items?.find((entry) => entry.item?._id === openItemId) || null

  /** Mirrors the rules addEALLinkToDispatchItem enforces, so a bad range is
      caught before it is sent. A check stays unjudged until the fields it
      reads actually hold something. */
  const linkChecks = useMemo(() => {
    if (!openItem) return null

    const perCase = openItem.item?.bottlesPerCase || 0
    const prefix = newEALData.prefix.trim()
    const serialsReady = tenDigits(newEALData.serialFrom) && tenDigits(newEALData.serialTo)
    const from = Number(newEALData.serialFrom)
    const to = Number(newEALData.serialTo)
    const count = serialsReady ? to - from + 1 : 0
    const cases = serialsReady && perCase > 0 && count > 0 ? count / perCase : 0
    const remaining = casesLeft(openItem)

    const check = (ready, ok, text) => ({ state: !ready ? 'pending' : ok ? 'ok' : 'bad', text })

    const checks = [
      check(prefix.length > 0, /^[A-Z]{3}$/.test(prefix), 'Prefix is three uppercase letters.'),
      check(Boolean(newEALData.serialFrom || newEALData.serialTo), serialsReady, 'Both serials are ten digits.'),
      check(serialsReady, count > 0, 'Serial to is above serial from.'),
      check(
        serialsReady && count > 0,
        perCase > 0 && count % perCase === 0 && to % perCase === 0 && (from - 1) % perCase === 0,
        `The range closes on a whole case of ${perCase || '—'}.`
      ),
      check(cases > 0, cases <= remaining + TOLERANCE, `Fits the ${formatQuantity(remaining)} case(s) still to link.`)
    ]

    return {
      checks,
      cases,
      countKnown: serialsReady && count > 0,
      valid: checks.every((entry) => entry.state === 'ok')
    }
  }, [openItem, newEALData])

  const handleSubmitDispatch = async (dispatch) => {
    const { company, deliveryTo, dateDispatched, market, items } = dispatch

    if (!company?.trim()) { toast.error('Please select a Company'); return }
    if (!deliveryTo?.trim()) { toast.error('Please select a delivery location'); return }
    if (isNaN(Date.parse(dateDispatched))) { toast.error('Please enter the date correctly'); return }
    if (!market?.trim()) { toast.error('Please select a Market'); return }
    if (!Array.isArray(items) || items.length === 0) { toast.error('Please add at least one item'); return }

    dispatch.totalQuantity = items.reduce((sum, entry) => sum + Number(entry.quantityInCases || 0), 0)

    try {
      setBusy(true)
      await axiosInstance.put(`${API_PATHS.DISPATCH.UPDATE_DATA}/${dispatch._id}`, dispatch)
      toast.success('Dispatch Details updated successfully')
      setFormOpen(false)
      await load()
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to save dispatch details.')
    } finally {
      setBusy(false)
    }
  }

  const moveTo = async (status) => {
    try {
      setBusy(true)
      await axiosInstance.put(`${API_PATHS.DISPATCH.UPDATE_DATA}/${note._id}/status`, { status })
      toast.success(`Dispatch marked ${status}`)
      await load()
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to update dispatch status.')
    } finally {
      setBusy(false)
    }
  }

  const removeNote = async () => {
    try {
      setBusy(true)
      await axiosInstance.delete(`${API_PATHS.DISPATCH.DELETE_DATA}/${note._id}`)
      toast.success('Dispatch deleted successfully')
      navigate('/dispatch')
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to delete dispatch.')
      setBusy(false)
    }
  }

  const handleSubmitVehicleDetails = async () => {
    try {
      setBusy(true)
      await axiosInstance.put(`${API_PATHS.DISPATCH.UPDATE_DATA}/${note._id}/vehicle`, {
        ...vehicleData,
        status: 'loaded'
      })
      toast.success('Vehicle details submitted')
      setVehicleOpen(false)
      setVehicleData({ vehicleNumber: '', driverName: '', driverContact: '' })
      await load()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error submitting vehicle info')
    } finally {
      setBusy(false)
    }
  }

  const handleAddEAL = async () => {
    if (!linkChecks?.valid) return
    try {
      setBusy(true)
      const response = await axiosInstance.post(API_PATHS.EALDISPATCH.ADD_EAL_LINK, {
        dispatchId: note._id,
        itemId: openItem.item._id,
        prefix: newEALData.prefix,
        serialFrom: newEALData.serialFrom,
        serialTo: newEALData.serialTo
      })
      setNote(response.data.updatedDispatch)
      setNewEALData({ prefix: '', serialFrom: '', serialTo: '' })
      toast.success(response.data.message || 'EAL linked')
    } catch (err) {
      toast.error(err.response?.data?.message || err.response?.data?.error || err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleUnlinkEAL = async () => {
    if (unlinkConfirmText !== 'unlink' || !unlinkCandidate) return
    try {
      setBusy(true)
      const response = await axiosInstance.post(API_PATHS.EALDISPATCH.REMOVE_EAL_LINK, {
        dispatchId: note._id,
        itemId: unlinkCandidate.itemId,
        prefix: unlinkCandidate.link.prefix,
        serialFrom: unlinkCandidate.link.serialFrom,
        serialTo: unlinkCandidate.link.serialTo
      })
      setNote(response.data.updatedDispatch)
      toast.success('EAL unlinked successfully!')
      setUnlinkCandidate(null)
      setUnlinkConfirmText('')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to unlink EAL.')
    } finally {
      setBusy(false)
    }
  }

  const actionButton = (label, onClick, tone = 'primary') => (
    <button
      key={label}
      type="button"
      disabled={busy}
      onClick={onClick}
      className={
        tone === 'primary'
          ? 'h-9 shrink-0 cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] px-3.5 text-[13px] font-semibold text-white hover:bg-[#124C3F] disabled:opacity-60'
          : tone === 'danger'
            ? 'h-9 shrink-0 cursor-pointer rounded-lg border border-[#E3BDBB] bg-white px-3.5 text-[13px] font-medium text-[#9B2C2C] hover:bg-[#FCEBEA] disabled:opacity-60'
            : 'h-9 shrink-0 cursor-pointer rounded-lg border border-[#D7D6D1] bg-white px-3.5 text-[13px] font-medium text-[#2A2F36] hover:bg-[#FAFAF8] disabled:opacity-60'
      }
    >
      {label}
    </button>
  )

  /** The one thing to do next, with the reason it can or cannot be done yet.
      The stages match utils/stageTransition.js on the server. */
  const nextStep = () => {
    if (!note) return null
    const done = linkedCases(note)
    const total = totalCases(note)
    const pct = total > 0 ? Math.min(100, (done / total) * 100) : 0
    const waiting = (note.items || []).filter((entry) => casesLeft(entry) > TOLERANCE).length

    if (note.status === 'draft') {
      return {
        tone: 'neutral',
        title: 'This note is still a draft',
        detail: 'Finalise it to start linking serial ranges to its cases.',
        action: mayStatus ? actionButton('Finalise', () => moveTo('final')) : null
      }
    }

    if (note.status === LINKABLE_STATUS && done + TOLERANCE < total) {
      return {
        tone: 'warn',
        title: waiting === 1
          ? 'One item still needs serial ranges'
          : `${formatQuantity(waiting)} items still need serial ranges`,
        detail: 'This note cannot be marked loaded until every case carries one.',
        progress: { done, total, pct },
        action: null
      }
    }

    if (note.status === LINKABLE_STATUS) {
      return {
        tone: 'good',
        title: 'Every case carries a serial range',
        detail: 'Record the vehicle to mark this note loaded.',
        progress: { done, total, pct: 100 },
        action: mayStatus ? actionButton('Mark loaded', () => setVehicleOpen(true)) : null
      }
    }

    if (note.status === 'loaded') {
      return {
        tone: 'good',
        title: 'Loaded and ready to leave',
        detail: 'Mark it dispatched once the lorry is away.',
        action: mayStatus ? actionButton('Mark dispatched', () => moveTo('dispatched')) : null
      }
    }

    if (note.status === 'dispatched') {
      return {
        tone: 'good',
        title: 'On the road',
        detail: 'Mark it delivered once the depot confirms receipt.',
        action: mayStatus ? actionButton('Mark delivered', () => moveTo('delivered')) : null
      }
    }

    return { tone: 'good', title: 'Delivered', detail: 'Nothing left to do on this note.', action: null }
  }

  // The one step back this stage allows, if any.
  const back = note ? movesFor(note).find((move) => move.back) : null

  const step = nextStep()
  const stepTone = {
    warn: { border: '#C07A1E', bar: '#C07A1E' },
    good: { border: '#15594A', bar: '#15594A' },
    neutral: { border: '#8A919B', bar: '#8A919B' }
  }[step?.tone || 'neutral']

  const backLink = (
    <Link
      to="/dispatch"
      className="inline-flex h-9 w-fit items-center gap-[7px] rounded-lg border border-[#D7D6D1] bg-white pr-3.5 pl-[11px] text-[12.5px] font-medium text-[#2A2F36] hover:bg-[#FAFAF8]"
    >
      <LuArrowLeft />
      All dispatch notes
    </Link>
  )

  return (
    <DashboardLayout activeMenu="Dispatch">
      <div className="mx-auto flex max-w-[1100px] flex-col gap-3.5">
        {backLink}

        {loading ? (
          <div className="rounded-xl border border-[#E3E2DE] bg-white px-[18px] py-5"><SkeletonLines rows={5} /></div>
        ) : error || !note ? (
          <div className="rounded-xl border border-[#E3E2DE] bg-white px-[18px] py-5">
            <EmptyState
              icon={<TruckIcon size={26} strokeWidth={1.5} />}
              title="Not found"
              description={error || 'This dispatch note is not one you can see.'}
            />
          </div>
        ) : (
          <>
            {/* Identity */}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-[1_1_300px]">
                <h1 className="m-0 flex flex-wrap items-center gap-2.5 text-[23px] font-semibold tracking-[-0.02em]">
                  {note.deliveryTo?.name || 'Depot not set'}
                  <StatusPill status={note.status} />
                  <span
                    className="inline-block rounded-[5px] px-2 py-[3px] text-[11px] font-semibold"
                    style={{ color: marketStyle(note.market).fg, backgroundColor: marketStyle(note.market).bg }}
                  >
                    {marketStyle(note.market).label}
                  </span>
                </h1>
                <p className="mt-1.5 mb-0 text-[12.5px] text-[#5A636D]">
                  <span className="font-numeric tabular-nums">{shortReference(note._id)}</span>
                  {' · '}{note.company?.name || '—'}
                  {' · '}<span className="font-numeric tabular-nums">{formatDate(note.dateDispatched)}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {note.status === 'draft' && mayEdit && actionButton('Edit note', () => setFormOpen(true), 'secondary')}
                {note.status === 'draft' && mayDelete && actionButton('Delete', removeNote, 'danger')}
                {mayStatus && back && back.allowed &&
                  actionButton(back.label, () => setUndoing(back), 'secondary')}
                {mayStatus && back && !back.allowed && (
                  <span
                    className="flex h-9 shrink-0 items-center rounded-lg border border-[#E3E2DE] bg-[#F2F1ED] px-3.5 text-[12.5px] text-[#8A919B]"
                    title={back.reason}
                  >
                    {back.label} — {back.reason}
                  </span>
                )}
              </div>
            </div>

            {/* The state, the reason, the progress and the one move that follows */}
            {step && (
              <div
                className="flex flex-wrap items-center gap-4 rounded-xl border border-[#E3E2DE] bg-white px-[18px] py-4"
                style={{ borderLeft: `4px solid ${stepTone.border}` }}
              >
                <div className="min-w-0 flex-[1_1_280px]">
                  <p className="m-0 flex items-center gap-2 text-[14px] font-semibold tracking-[-0.008em] text-[#15181C]">
                    {step.tone === 'warn' && <LuTriangleAlert className="shrink-0 text-[#C07A1E]" />}
                    {step.tone === 'good' && (
                      <span className="shrink-0 text-[#15594A]"><CheckIcon size={16} strokeWidth={2.4} /></span>
                    )}
                    {step.title}
                  </p>
                  <p className="mt-1 mb-0 text-[12.5px] text-[#5A636D]">{step.detail}</p>
                </div>
                {step.progress && (
                  <div className="flex w-[190px] shrink-0 flex-col gap-1.5">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="font-numeric text-[17px] font-semibold text-[#15181C] tabular-nums">
                        {formatQuantity(step.progress.done)}
                        <span className="font-normal text-[#8A919B]"> / {formatQuantity(step.progress.total)}</span>
                      </span>
                      <span className="text-[11px] text-[#5A636D]">cases linked</span>
                    </span>
                    <span className="h-[7px] overflow-hidden rounded bg-[#EFEEEA]">
                      <span
                        className="block h-full rounded"
                        style={{ width: `${step.progress.pct}%`, backgroundColor: stepTone.bar }}
                      />
                    </span>
                  </div>
                )}
                {step.action}
              </div>
            )}

            {/* Items — the link form opens inside the row it belongs to */}
            <div className="overflow-hidden rounded-xl border border-[#E3E2DE] bg-white">
              <h2 className="m-0 px-4 pt-3.5 pb-1 text-[13.5px] font-semibold tracking-[-0.01em]">Items on this note</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] border-collapse">
                  <thead>
                    <tr>
                      <th className={headerCell}>Item</th>
                      <th className={`${headerCell} w-[88px] text-right`}>Cases</th>
                      <th className={`${headerCell} w-[88px] text-right`}>Linked</th>
                      <th className={`${headerCell} w-[150px]`}>Serial cover</th>
                      <th className={`${headerCell} w-[118px]`} />
                    </tr>
                  </thead>
                  <tbody>
                    {(note.items || []).map((entry) => {
                      const itemId = entry.item?._id
                      const left = casesLeft(entry)
                      const covered = left <= TOLERANCE
                      const total = entry.quantityInCases || 0
                      const pct = total > 0 ? Math.min(100, ((entry.EALIssuedQuantity || 0) / total) * 100) : 0
                      const open = Boolean(itemId) && itemId === openItemId
                      const ranges = entry.EALLinks || []
                      const canLink = mayLink && note.status === LINKABLE_STATUS
                      const expandable = canLink || ranges.length > 0

                      return (
                        <React.Fragment key={itemId || entry._id}>
                          <tr className={open ? 'bg-[#F3F8F6]' : ''}>
                            <td className={`${bodyCell} font-medium text-[#15181C]`}>
                              <span className="block truncate" title={entry.item?.name || undefined}>
                                {itemLabel(entry.item) || '—'}
                              </span>
                              <span className="mt-0.5 block truncate text-[11.5px] font-normal text-[#5A636D]">
                                {[
                                  entry.item?.bottlesPerCase
                                    ? `${formatQuantity(entry.item.bottlesPerCase)} per case`
                                    : 'Pack size not set',
                                  ranges.length > 0
                                    ? `${formatQuantity(ranges.length)} range${ranges.length === 1 ? '' : 's'}`
                                    : null
                                ].filter(Boolean).join(' · ')}
                              </span>
                            </td>
                            <td className={`${bodyCell} font-numeric text-right tabular-nums`}>{formatQuantity(total)}</td>
                            <td
                              className={`${bodyCell} font-numeric text-right font-semibold tabular-nums`}
                              style={{ color: covered ? '#15594A' : '#8A5A00' }}
                            >
                              {formatQuantity(entry.EALIssuedQuantity || 0)}
                            </td>
                            <td className={bodyCell}>
                              <span className="flex items-center gap-2">
                                <span className="h-[5px] flex-1 overflow-hidden rounded-[3px] bg-[#EFEEEA]">
                                  <span
                                    className="block h-full rounded-[3px]"
                                    style={{ width: `${pct}%`, backgroundColor: covered ? '#15594A' : '#C07A1E' }}
                                  />
                                </span>
                                {covered ? (
                                  <span className="flex shrink-0 items-center gap-[3px] text-[11px] font-semibold text-[#15594A]">
                                    <CheckIcon size={12} strokeWidth={2.6} />
                                    Full
                                  </span>
                                ) : (
                                  <span className="font-numeric shrink-0 text-[11px] text-[#8A5A00] tabular-nums">
                                    {formatQuantity(left)} left
                                  </span>
                                )}
                              </span>
                            </td>
                            <td className={`${bodyCell} text-right`}>
                              {expandable && (
                                <button
                                  type="button"
                                  aria-expanded={open}
                                  onClick={() => {
                                    setOpenItemId(open ? null : itemId)
                                    setNewEALData({ prefix: '', serialFrom: '', serialTo: '' })
                                  }}
                                  className={`inline-flex h-[30px] w-[84px] cursor-pointer items-center justify-between gap-1.5 rounded-[7px] border px-2.5 text-xs whitespace-nowrap ${
                                    open
                                      ? 'border-[#15594A] bg-[#15594A] font-semibold text-white'
                                      : 'border-[#D7D6D1] bg-white font-medium text-[#2A2F36] hover:bg-[#FAFAF8]'
                                  }`}
                                >
                                  {open ? 'Close' : canLink && !covered ? 'Link' : 'Ranges'}
                                  {open ? <LuChevronUp /> : <LuChevronDown />}
                                </button>
                              )}
                            </td>
                          </tr>

                          {open && (
                            <tr className="bg-[#F3F8F6]">
                              <td colSpan={5} className="border-t-0 p-0">
                                <div className="mx-3.5 mb-3.5 overflow-hidden rounded-[10px] border border-[#C9DED6] bg-white">
                                  {canLink && (
                                    <>
                                      <p className="m-0 px-4 pt-3.5 pb-1 text-[12.5px] text-[#4A5159]">
                                        Add a serial range for{' '}
                                        <strong className="font-semibold text-[#15181C]">{itemLabel(entry.item)}</strong>
                                        {entry.item?.bottlesPerCase
                                          ? `. ${formatQuantity(entry.item.bottlesPerCase)} bottles make one case, so the range has to close on a whole case.`
                                          : '.'}
                                      </p>

                                      <form
                                        className="flex flex-wrap items-end gap-3 px-4 pt-2 pb-3"
                                        onSubmit={(event) => { event.preventDefault(); handleAddEAL() }}
                                      >
                                        <div className="flex-[0_0_96px]">
                                          <label htmlFor="d-prefix" className="mb-1.5 block text-[11.5px] font-medium text-[#3C434B]">Prefix</label>
                                          <input
                                            id="d-prefix"
                                            value={newEALData.prefix}
                                            onChange={({ target }) => setNewEALData((p) => ({ ...p, prefix: target.value.toUpperCase() }))}
                                            maxLength={3}
                                            placeholder="ABC"
                                            className={`${fieldClass} tracking-[0.08em] uppercase`}
                                          />
                                        </div>
                                        <div className="min-w-0 flex-[1_1_150px]">
                                          <label htmlFor="d-from" className="mb-1.5 block text-[11.5px] font-medium text-[#3C434B]">Serial from</label>
                                          <input
                                            id="d-from"
                                            value={newEALData.serialFrom}
                                            onChange={({ target }) => setNewEALData((p) => ({ ...p, serialFrom: target.value }))}
                                            inputMode="numeric"
                                            placeholder="10 digits"
                                            className={fieldClass}
                                          />
                                        </div>
                                        <div className="min-w-0 flex-[1_1_150px]">
                                          <label htmlFor="d-to" className="mb-1.5 block text-[11.5px] font-medium text-[#3C434B]">Serial to</label>
                                          <input
                                            id="d-to"
                                            value={newEALData.serialTo}
                                            onChange={({ target }) => setNewEALData((p) => ({ ...p, serialTo: target.value }))}
                                            inputMode="numeric"
                                            placeholder="10 digits"
                                            className={fieldClass}
                                          />
                                        </div>
                                        <div className="flex-[0_0_132px]">
                                          <span className="mb-1.5 block text-[11.5px] font-medium text-[#3C434B]">Resolves to</span>
                                          <div className="flex h-[38px] items-center gap-[6px] rounded-lg border border-dashed border-[#C9DED6] bg-[#F3F8F6] px-[11px]">
                                            <span className="font-numeric text-[14px] font-semibold text-[#0D3C32] tabular-nums">
                                              {linkChecks?.countKnown ? formatQuantity(linkChecks.cases) : '—'}
                                            </span>
                                            <span className="text-[11.5px] text-[#15594A]">cases</span>
                                          </div>
                                        </div>
                                        <button
                                          type="submit"
                                          disabled={!linkChecks?.valid || busy}
                                          className="h-[38px] shrink-0 cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] px-[15px] text-[13px] font-semibold text-white hover:bg-[#124C3F] disabled:cursor-not-allowed disabled:border-[#E3E2DE] disabled:bg-[#F2F1ED] disabled:text-[#A8ADB5]"
                                        >
                                          Add range
                                        </button>
                                      </form>

                                      <ul className="m-0 flex list-none flex-col gap-1.5 px-4 pb-3.5">
                                        {(linkChecks?.checks || []).map((entryCheck) => (
                                          <li
                                            key={entryCheck.text}
                                            className="flex items-start gap-2 text-xs"
                                            style={{
                                              color: entryCheck.state === 'ok' ? '#15594A'
                                                : entryCheck.state === 'bad' ? '#9B2C2C' : '#8A919B'
                                            }}
                                          >
                                            <span className="mt-px flex h-[14px] w-[14px] shrink-0 items-center justify-center">
                                              {entryCheck.state === 'ok' && <CheckIcon size={14} strokeWidth={2.4} />}
                                              {entryCheck.state === 'bad' && <LuX />}
                                              {entryCheck.state === 'pending' && (
                                                <span className="block h-[5px] w-[5px] rounded-full bg-[#C3C2BD]" />
                                              )}
                                            </span>
                                            {entryCheck.text}
                                          </li>
                                        ))}
                                      </ul>
                                    </>
                                  )}

                                  <div className={canLink ? 'border-t border-[#EDECE8]' : ''}>
                                    {ranges.length === 0 ? (
                                      <p className="m-0 px-4 py-3 text-xs text-[#5A636D]">No ranges linked to this item yet.</p>
                                    ) : (
                                      <table className="w-full border-collapse">
                                        <thead>
                                          <tr>
                                            <th className={headerCell}>Range linked</th>
                                            <th className={`${headerCell} text-right`}>Labels</th>
                                            <th className={`${headerCell} text-right`}>Cases</th>
                                            <th className={headerCell} />
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {ranges.map((link, index) => {
                                            const labels = link.serialTo - link.serialFrom + 1
                                            const perCase = entry.item?.bottlesPerCase || 0
                                            return (
                                              <tr key={`${link.prefix}-${link.serialFrom}-${index}`}>
                                                <td className={bodyCell}>
                                                  <SerialRange prefix={link.prefix} serialFrom={link.serialFrom} serialTo={link.serialTo} />
                                                </td>
                                                <td className={`${bodyCell} font-numeric text-right tabular-nums`}>{formatQuantity(labels)}</td>
                                                <td className={`${bodyCell} font-numeric text-right font-medium tabular-nums`}>
                                                  {perCase > 0 ? formatQuantity(labels / perCase) : '—'}
                                                </td>
                                                <td className={`${bodyCell} text-right`}>
                                                  {canLink && (
                                                    <button
                                                      type="button"
                                                      onClick={() => setUnlinkCandidate({ link, itemId })}
                                                      className="h-7 cursor-pointer rounded-md border border-[#E3BDBB] bg-white px-2.5 text-xs text-[#9B2C2C] hover:bg-[#FCEBEA]"
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
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className={`${bodyCell} border-t border-[#DEDDD8] bg-[#FAFAF8] text-xs font-semibold text-[#3C434B]`}>
                        {formatQuantity((note.items || []).length)}{' '}
                        {(note.items || []).length === 1 ? 'item' : 'items'}
                      </td>
                      <td className={`${bodyCell} font-numeric border-t border-[#DEDDD8] bg-[#FAFAF8] text-right font-semibold tabular-nums`}>
                        {formatQuantity(totalCases(note))}
                      </td>
                      <td className={`${bodyCell} font-numeric border-t border-[#DEDDD8] bg-[#FAFAF8] text-right font-semibold tabular-nums`}>
                        {formatQuantity(linkedCases(note))}
                      </td>
                      <td colSpan={2} className={`${bodyCell} border-t border-[#DEDDD8] bg-[#FAFAF8]`} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Delivery */}
            <div className="rounded-xl border border-[#E3E2DE] bg-white px-[18px] py-4">
              <h2 className="m-0 mb-3 text-[13.5px] font-semibold tracking-[-0.01em]">Delivery</h2>
              <dl className="m-0 flex flex-wrap gap-x-9 gap-y-4">
                {[
                  { label: 'Depot', value: note.deliveryTo?.name },
                  { label: 'Market', value: marketStyle(note.market).label },
                  { label: 'Date dispatched', value: formatDate(note.dateDispatched), mono: true },
                  { label: 'Vehicle', value: note.vehicleDetails?.vehicleNumber, mono: true },
                  { label: 'Driver', value: note.vehicleDetails?.driverName },
                  { label: 'Driver contact', value: note.vehicleDetails?.driverContact, mono: true },
                  { label: 'Raised by', value: note.createdBy?.fullName }
                ].map((field) => (
                  <div key={field.label} className="min-w-0">
                    <dt className="text-[10.5px] font-semibold tracking-[0.07em] text-[#5A636D] uppercase">{field.label}</dt>
                    <dd
                      className={`mt-[5px] mb-0 text-[13px] ${field.mono ? 'font-numeric tabular-nums' : ''} ${
                        field.value ? 'text-[#15181C]' : 'text-[#A8ADB5]'
                      }`}
                    >
                      {field.value || 'Not yet recorded'}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>
          </>
        )}
      </div>

      {/* Undoing a stage: what it means, before it happens. */}
      <Modal
        isOpen={Boolean(undoing)}
        onClose={() => setUndoing(null)}
        title="Undo a stage"
        styleClass="w-full max-w-lg"
      >
        {undoing && note && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="m-0 text-[19px] font-semibold tracking-[-0.018em]">
                Send this note back to {undoing.to}?
              </h2>
              <p className="mt-2 mb-0 text-[12.5px] leading-[1.55] text-[#5A636D]">{undoing.consequence}</p>
            </div>
            <p className="m-0 rounded-[10px] border border-[#EDECE8] bg-[#FAFAF8] px-3.5 py-3 text-[12.5px] text-[#3C434B]">
              It moves one stage, from <strong className="font-semibold text-[#15181C]">{note.status}</strong> to{' '}
              <strong className="font-semibold text-[#15181C]">{undoing.to}</strong>. Everything already recorded
              against it stays as it is.
            </p>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setUndoing(null)}
                className="h-9 cursor-pointer rounded-lg border border-[#D7D6D1] bg-white px-3.5 text-[13px] font-medium text-[#2A2F36]"
              >
                Leave it as it is
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  const to = undoing.to
                  setUndoing(null)
                  await moveTo(to)
                }}
                className="h-9 cursor-pointer rounded-lg border border-[#8A5A00] bg-[#8A5A00] px-3.5 text-[13px] font-semibold text-white hover:bg-[#734B00] disabled:opacity-60"
              >
                Send it back to {undoing.to}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Edit note */}
      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title="Update Dispatch" styleClass="w-full">
        <AddDispatchForm onSubmitDispatch={handleSubmitDispatch} dispatchDetails={note || []} />
      </Modal>

      {/* Vehicle details */}
      <Modal isOpen={vehicleOpen} onClose={() => setVehicleOpen(false)} title="Enter Vehicle Details" styleClass="w-full max-w-md">
        <div className="flex flex-col gap-3.5">
          <p className="m-0 text-[12.5px] text-[#5A636D]">Recording the vehicle marks this note as loaded.</p>
          {[
            { key: 'vehicleNumber', label: 'Vehicle number' },
            { key: 'driverName', label: 'Driver name' },
            { key: 'driverContact', label: 'Driver contact' }
          ].map((field) => (
            <div key={field.key}>
              <label htmlFor={field.key} className="mb-1.5 block text-xs font-medium text-[#3C434B]">{field.label}</label>
              <input
                id={field.key}
                value={vehicleData[field.key]}
                onChange={({ target }) => setVehicleData((p) => ({ ...p, [field.key]: target.value }))}
                className="h-[38px] w-full rounded-lg border border-[#D7D6D1] bg-white px-[11px] text-[13.5px] outline-none focus:border-[#15594A] focus:ring-[3px] focus:ring-[#E7F0EC]"
              />
            </div>
          ))}
          <div className="flex justify-end gap-2.5 pt-1">
            <button
              type="button"
              onClick={() => setVehicleOpen(false)}
              className="h-9 cursor-pointer rounded-lg border border-[#D7D6D1] bg-white px-3.5 text-[13px] font-medium text-[#2A2F36]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleSubmitVehicleDetails}
              className="h-9 cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] px-3.5 text-[13px] font-semibold text-white disabled:opacity-60"
            >
              Submit
            </button>
          </div>
        </div>
      </Modal>

      {/* Unlink confirmation */}
      <Modal
        isOpen={Boolean(unlinkCandidate)}
        onClose={() => { setUnlinkCandidate(null); setUnlinkConfirmText('') }}
        title="Unlink EAL"
        styleClass="w-full max-w-lg"
      >
        {unlinkCandidate && (
          <div className="flex flex-col gap-3.5">
            <div className="rounded-lg border border-[#E3E2DE] bg-[#FAFAF8] px-3.5 py-3">
              <SerialRange
                prefix={unlinkCandidate.link.prefix}
                serialFrom={unlinkCandidate.link.serialFrom}
                serialTo={unlinkCandidate.link.serialTo}
              />
              <p className="mt-1.5 mb-0 text-xs text-[#5A636D]">
                {formatQuantity(unlinkCandidate.link.serialTo - unlinkCandidate.link.serialFrom + 1)} labels will go back to stock.
              </p>
            </div>
            <div>
              <label htmlFor="unlink-confirm" className="mb-1.5 block text-[12.5px] text-[#3C434B]">
                To confirm, type <strong className="font-numeric bg-[#F2F1ED] px-1">unlink</strong> below
              </label>
              <input
                id="unlink-confirm"
                value={unlinkConfirmText}
                onChange={({ target }) => setUnlinkConfirmText(target.value)}
                className="h-[38px] w-full rounded-lg border border-[#D7D6D1] bg-white px-[11px] text-[13.5px] outline-none focus:border-[#9B2C2C]"
              />
            </div>
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => { setUnlinkCandidate(null); setUnlinkConfirmText('') }}
                className="h-9 cursor-pointer rounded-lg border border-[#D7D6D1] bg-white px-3.5 text-[13px] font-medium text-[#2A2F36]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={unlinkConfirmText !== 'unlink' || busy}
                onClick={handleUnlinkEAL}
                className="h-9 cursor-pointer rounded-lg border border-[#9B2C2C] bg-[#9B2C2C] px-3.5 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:border-[#E3E2DE] disabled:bg-[#F2F1ED] disabled:text-[#A8ADB5]"
              >
                Confirm unlink
              </button>
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  )
}

export default DispatchNote
