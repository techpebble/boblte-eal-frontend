import React, { useContext, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { LuDownload, LuLink, LuPlus, LuTriangleAlert, LuX } from 'react-icons/lu'
import DashboardLayout from '../../components/layouts/DashboardLayout'
import Modal from '../../components/Modal/Modal'
import DateRangeModal from '../../components/Modal/DateRangeModal'
import AddDispatchForm from '../../components/Dispatch/AddDispatchForm'
import EmptyState from '../../components/Dashboard/EmptyState'
import SerialRange from '../../components/Dashboard/SerialRange'
import StatusPill from '../../components/Dashboard/StatusPill'
import { SkeletonLines } from '../../components/Dashboard/Skeleton'
import { CheckIcon, TruckIcon } from '../../components/Dashboard/icons'
import {
  formatQuantity,
  itemLabel,
  marketStyle,
  shortReference
} from '../../components/Dashboard/dashboardFormat'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATHS } from '../../utils/apiPaths'
import { downloadCsv } from '../../utils/exportCsv'
import { formatDate, formatDateToYYYYMMDD } from '../../utils/helper'
import { UserContext } from '../../context/userContext'
import { can } from '../../utils/permissions'

const STATUS_TABS = [
  { key: 'open', label: 'Open', matches: ['draft', 'final'] },
  { key: 'moving', label: 'In transit', matches: ['loaded', 'dispatched'] },
  { key: 'delivered', label: 'Delivered', matches: ['delivered'] },
  { key: 'all', label: 'All', matches: null }
]

// Case counts come out of a division, so compare them the way the API does.
const TOLERANCE = 1e-6

const monthToDate = () => {
  const now = new Date()
  return { startDate: new Date(now.getFullYear(), now.getMonth(), 1), endDate: now, key: 'selection' }
}

const headerCell =
  'bg-[#FAFAF8] px-3.5 pt-[11px] pb-2.5 text-left text-[11px] font-semibold tracking-[0.07em] text-[#5A636D] uppercase whitespace-nowrap'
const bodyCell = 'border-t border-[#EDECE8] px-3.5 py-3 text-[13px] text-[#2A2F36]'

const fieldClass =
  'h-[38px] w-full rounded-lg border border-[#D7D6D1] bg-white px-[11px] font-numeric text-[13.5px] tabular-nums text-[#15181C] outline-none focus:border-[#15594A] focus:ring-[3px] focus:ring-[#E7F0EC]'

const Dispatch = () => {
  const [dispatches, setDispatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const [dateRange, setDateRange] = useState(monthToDate)
  const [company, setCompany] = useState('')
  const [market, setMarket] = useState('')
  const [statusTab, setStatusTab] = useState('open')
  const [companies, setCompanies] = useState([])

  const [selectedId, setSelectedId] = useState(null)
  const { user } = useContext(UserContext)
  // A note is raised, changed, moved along and linked by four separate
  // permissions, so each control answers to its own.
  const mayCreate = can(user, 'dispatch:create')
  const mayEdit = can(user, 'dispatch:edit')
  const mayDelete = can(user, 'dispatch:delete')
  const mayStatus = can(user, 'dispatch:status')
  const mayLink = can(user, 'dispatch:link')

  const [linkItemId, setLinkItemId] = useState(null)
  const [newEALData, setNewEALData] = useState({ prefix: '', serialFrom: '', serialTo: '' })

  const [formOpen, setFormOpen] = useState(false)
  const [formDispatch, setFormDispatch] = useState(null)
  const [vehicleOpen, setVehicleOpen] = useState(false)
  const [vehicleData, setVehicleData] = useState({ vehicleNumber: '', driverName: '', driverContact: '' })
  const [unlinkCandidate, setUnlinkCandidate] = useState(null)
  const [unlinkConfirmText, setUnlinkConfirmText] = useState('')

  const [reloadToken, setReloadToken] = useState(0)

  const onApplyDateRange = (selectedRange) => setDateRange(selectedRange)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const fetchDispatchDetails = async () => {
      try {
        const response = await axiosInstance.get(API_PATHS.DISPATCH.GET_DATA, {
          params: {
            startDate: formatDateToYYYYMMDD(dateRange.startDate),
            endDate: formatDateToYYYYMMDD(dateRange.endDate),
            ...(company ? { company } : {}),
            ...(market ? { market } : {})
          }
        })
        if (cancelled) return
        setDispatches(Array.isArray(response.data?.data) ? response.data.data : [])
      } catch (err) {
        if (cancelled) return
        console.error('Error fetching dispatch details:', err)
        setError(err?.response?.data?.message || 'Could not load the dispatch notes.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchDispatchDetails()
    return () => { cancelled = true }
  }, [dateRange, company, market, reloadToken])

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const res = await axiosInstance.get(API_PATHS.COMPANY.GET_DATA)
        setCompanies(res.data?.data || res.data || [])
      } catch (err) {
        console.log('Could not load the company list.', err)
      }
    }
    fetchCompanies()
  }, [])

  const tab = STATUS_TABS.find((entry) => entry.key === statusTab) || STATUS_TABS[0]
  const notes = useMemo(
    () => (tab.matches ? dispatches.filter((note) => tab.matches.includes(note.status)) : dispatches),
    [dispatches, tab]
  )

  // Keep a selection only while it is still in the list.
  useEffect(() => {
    if (notes.length === 0) {
      setSelectedId(null)
      return
    }
    if (!notes.some((note) => note._id === selectedId)) setSelectedId(notes[0]._id)
  }, [notes, selectedId])

  const selected = dispatches.find((note) => note._id === selectedId) || null
  const linkItem = selected?.items?.find((entry) => entry.item?._id === linkItemId) || null

  useEffect(() => { setLinkItemId(null) }, [selectedId])

  const replaceNote = (updated) => {
    setDispatches((previous) => previous.map((note) => (note._id === updated._id ? updated : note)))
  }

  const linkedCases = (note) => note?.EALIssuedTotalQuantity || 0
  const totalCases = (note) => note?.totalQuantity || 0
  const isFullyLinked = (note) => linkedCases(note) + TOLERANCE >= totalCases(note)

  /** Mirrors the rules addEALLinkToDispatchItem enforces, so a bad range is
      caught before it is sent. */
  const linkChecks = useMemo(() => {
    if (!linkItem) return null

    const perCase = linkItem.item?.bottlesPerCase || 0
    const from = Number(newEALData.serialFrom)
    const to = Number(newEALData.serialTo)
    const count = Number.isFinite(from) && Number.isFinite(to) ? to - from + 1 : 0
    const cases = perCase > 0 ? count / perCase : 0
    const remaining = (linkItem.quantityInCases || 0) - (linkItem.EALIssuedQuantity || 0)

    const checks = [
      {
        ok: /^[A-Z]{3}$/.test(newEALData.prefix.trim()),
        text: 'Prefix is three uppercase letters.'
      },
      {
        ok: /^\d{10}$/.test(newEALData.serialFrom) && /^\d{10}$/.test(newEALData.serialTo),
        text: 'Both serials are ten digits.'
      },
      {
        ok: count > 0,
        text: 'Serial to is above serial from.'
      },
      {
        ok: perCase > 0 && count > 0 && count % perCase === 0 && to % perCase === 0 && (from - 1) % perCase === 0,
        text: `The range closes on a whole case of ${perCase || '—'}.`
      },
      {
        ok: cases > 0 && cases <= remaining + TOLERANCE,
        text: `Fits the ${formatQuantity(remaining)} case(s) still to link.`
      }
    ]

    return { checks, cases, remaining, valid: checks.every((check) => check.ok) }
  }, [linkItem, newEALData])

  const handleSubmitDispatch = async (dispatch) => {
    const { company: noteCompany, deliveryTo, dateDispatched, market: noteMarket, items } = dispatch

    if (!noteCompany?.trim()) { toast.error('Please select a Company'); return }
    if (!deliveryTo?.trim()) { toast.error('Please select a delivery location'); return }
    if (isNaN(Date.parse(dateDispatched))) { toast.error('Please enter the date correctly'); return }
    if (!noteMarket?.trim()) { toast.error('Please select a Market'); return }
    if (!Array.isArray(items) || items.length === 0) { toast.error('Please add at least one item'); return }

    dispatch.totalQuantity = items.reduce((sum, entry) => sum + Number(entry.quantityInCases || 0), 0)

    try {
      setBusy(true)
      if (dispatch._id) {
        await axiosInstance.put(`${API_PATHS.DISPATCH.UPDATE_DATA}/${dispatch._id}`, dispatch)
        toast.success('Dispatch Details updated successfully')
      } else {
        await axiosInstance.post(API_PATHS.DISPATCH.ADD_DATA, dispatch)
        toast.success('Dispatch Details added successfully')
      }
      setFormOpen(false)
      setReloadToken((token) => token + 1)
    } catch (err) {
      console.error('Error saving dispatch:', err.response?.data?.message || err.message)
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to save dispatch details.')
    } finally {
      setBusy(false)
    }
  }

  const updateDispatchStatus = async (id, status) => {
    try {
      setBusy(true)
      await axiosInstance.put(`${API_PATHS.DISPATCH.UPDATE_DATA}/${id}/status`, { status })
      setDispatches((previous) =>
        previous.map((note) => (note._id === id ? { ...note, status } : note))
      )
      toast.success(`Dispatch marked ${status}`)
    } catch (err) {
      console.error('Error updating status:', err.response?.data?.message || err.message)
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to update dispatch status.')
    } finally {
      setBusy(false)
    }
  }

  const deleteDispatch = async (id) => {
    try {
      setBusy(true)
      await axiosInstance.delete(`${API_PATHS.DISPATCH.DELETE_DATA}/${id}`)
      setDispatches((previous) => previous.filter((note) => note._id !== id))
      toast.success('Dispatch deleted successfully')
    } catch (err) {
      console.error('Error deleting dispatch:', err.response?.data?.message || err.message)
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to delete dispatch.')
    } finally {
      setBusy(false)
    }
  }

  const handleSubmitVehicleDetails = async () => {
    try {
      setBusy(true)
      await axiosInstance.put(`${API_PATHS.DISPATCH.UPDATE_DATA}/${selected._id}/vehicle`, {
        ...vehicleData,
        status: 'loaded'
      })
      toast.success('Vehicle details submitted')
      setVehicleOpen(false)
      setVehicleData({ vehicleNumber: '', driverName: '', driverContact: '' })
      setReloadToken((token) => token + 1)
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
        dispatchId: selected._id,
        itemId: linkItem.item._id,
        prefix: newEALData.prefix,
        serialFrom: newEALData.serialFrom,
        serialTo: newEALData.serialTo
      })
      const { message, updatedDispatch } = response.data
      replaceNote(updatedDispatch)
      setNewEALData({ prefix: '', serialFrom: '', serialTo: '' })
      toast.success(message || 'EAL linked')
    } catch (err) {
      console.error('Error linking EAL:', err.response?.data?.message || err.message)
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
        dispatchId: selected._id,
        itemId: unlinkCandidate.itemId,
        prefix: unlinkCandidate.link.prefix,
        serialFrom: unlinkCandidate.link.serialFrom,
        serialTo: unlinkCandidate.link.serialTo
      })
      replaceNote(response.data.updatedDispatch)
      toast.success('EAL unlinked successfully!')
      setUnlinkCandidate(null)
      setUnlinkConfirmText('')
    } catch (err) {
      console.error('Error unlinking EAL:', err.response?.data?.message || err.message)
      toast.error(err.response?.data?.message || 'Failed to unlink EAL.')
    } finally {
      setBusy(false)
    }
  }

  const exportNotes = () => {
    if (notes.length === 0) return
    downloadCsv(
      `dispatch-${formatDateToYYYYMMDD(dateRange.startDate)}-to-${formatDateToYYYYMMDD(dateRange.endDate)}.csv`,
      [
        { header: 'Reference', value: (row) => shortReference(row._id) },
        { header: 'Company', value: (row) => row.company?.name },
        { header: 'Date dispatched', value: (row) => formatDate(row.dateDispatched) },
        { header: 'Market', value: (row) => row.market },
        { header: 'Depot', value: (row) => row.deliveryTo?.name },
        { header: 'Status', value: (row) => row.status },
        { header: 'Cases', value: (row) => row.totalQuantity },
        { header: 'Cases linked', value: (row) => row.EALIssuedTotalQuantity || 0 },
        { header: 'Vehicle', value: (row) => row.vehicleDetails?.vehicleNumber },
        { header: 'Driver', value: (row) => row.vehicleDetails?.driverName }
      ],
      notes
    )
  }

  const statusActions = () => {
    if (!selected) return null
    const id = selected._id
    const full = isFullyLinked(selected)

    const button = (label, onClick, tone = 'primary') => (
      <button
        key={label}
        type="button"
        disabled={busy}
        onClick={onClick}
        className={
          tone === 'primary'
            ? 'h-9 cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] px-3.5 text-[13px] font-semibold text-white hover:bg-[#124C3F] disabled:opacity-60'
            : tone === 'danger'
              ? 'h-9 cursor-pointer rounded-lg border border-[#E3BDBB] bg-white px-3.5 text-[13px] font-medium text-[#9B2C2C] hover:bg-[#FCEBEA] disabled:opacity-60'
              : 'h-9 cursor-pointer rounded-lg border border-[#D7D6D1] bg-white px-3.5 text-[13px] font-medium text-[#2A2F36] hover:bg-[#FAFAF8] disabled:opacity-60'
        }
      >
        {label}
      </button>
    )

    switch (selected.status) {
      case 'draft':
        return [
          mayEdit && button('Edit note', () => { setFormDispatch(selected); setFormOpen(true) }, 'secondary'),
          mayDelete && button('Delete', () => deleteDispatch(id), 'danger'),
          mayStatus && button('Finalise', () => updateDispatchStatus(id, 'final'))
        ].filter(Boolean)
      case 'final':
        return [
          mayStatus && linkedCases(selected) === 0 &&
            button('Back to draft', () => updateDispatchStatus(id, 'draft'), 'secondary'),
          full
            ? mayStatus && button('Mark loaded', () => setVehicleOpen(true))
            : <span key="pending" className="self-center text-[12.5px] text-[#8A5A00]">Pending EAL linking</span>
        ].filter(Boolean)
      case 'loaded':
        return [mayStatus && button('Mark dispatched', () => updateDispatchStatus(id, 'dispatched'))].filter(Boolean)
      case 'dispatched':
        return [mayStatus && button('Mark delivered', () => updateDispatchStatus(id, 'delivered'))].filter(Boolean)
      default:
        return null
    }
  }

  return (
    <DashboardLayout activeMenu="Dispatch">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4">

        {/* Page header */}
        <div className="flex flex-wrap items-end justify-between gap-3.5">
          <div>
            <h1 className="m-0 text-[25px] font-semibold tracking-[-0.022em]">Dispatch</h1>
            <p className="mt-1.5 mb-0 text-[13px] text-[#5A636D]">
              Pick a note on the left; link serial ranges to its cases on the right.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportNotes}
              disabled={notes.length === 0}
              className="flex h-9 cursor-pointer items-center gap-[7px] rounded-lg border border-[#D7D6D1] bg-white px-[13px] text-[13px] font-medium text-[#2A2F36] hover:bg-[#FAFAF8] disabled:cursor-not-allowed disabled:text-[#A8ADB5]"
            >
              <LuDownload />
              Export
            </button>
            {mayCreate && (
              <button
                type="button"
                onClick={() => { setFormDispatch(null); setFormOpen(true) }}
                className="flex h-9 cursor-pointer items-center gap-[7px] rounded-lg border border-[#15594A] bg-[#15594A] px-3.5 text-[13px] font-medium text-white hover:bg-[#124C3F]"
              >
                <LuPlus />
                New dispatch note
              </button>
            )}
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 rounded-[11px] border border-[#E3E2DE] bg-white px-3 py-2.5">
          <DateRangeModal dateRange={dateRange} onApplyDateRange={onApplyDateRange} />
          <span className="mx-0.5 h-[22px] w-px bg-[#E3E2DE]" />
          <label className="flex h-[34px] items-center gap-[7px] rounded-lg border border-[#E3E2DE] px-2.5 text-[12.5px]">
            <span className="text-[#5A636D]">Company</span>
            <select
              value={company}
              onChange={({ target }) => setCompany(target.value)}
              className="cursor-pointer border-0 bg-transparent font-medium text-[#15181C] outline-none"
            >
              <option value="">All</option>
              {companies.map((option) => (
                <option key={option._id} value={option._id}>{option.name}</option>
              ))}
            </select>
          </label>
          <div role="group" aria-label="Market" className="flex h-[34px] gap-0.5 rounded-lg bg-[#F2F1ED] p-[3px]">
            {[
              { value: '', label: 'All' },
              { value: 'local', label: 'Local' },
              { value: 'export', label: 'Export' }
            ].map((option) => (
              <button
                key={option.label}
                type="button"
                aria-pressed={market === option.value}
                onClick={() => setMarket(option.value)}
                className={`cursor-pointer rounded-md px-3 text-[12.5px] ${
                  market === option.value ? 'bg-white font-semibold text-[#15181C] shadow-sm' : 'text-[#4A5159]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p role="alert" className="m-0 rounded-[10px] border border-[#F3C9C7] bg-[#FCEBEA] px-4 py-3 text-[13px] text-[#7A2322]">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-start gap-4">

          {/* Master list */}
          <section className="min-w-0 max-w-[400px] flex-[1_1_320px] overflow-hidden rounded-xl border border-[#E3E2DE] bg-white">
            <div role="group" aria-label="Filter by status" className="flex gap-0.5 border-b border-[#EDECE8] px-3 py-2.5">
              {STATUS_TABS.map((entry) => (
                <button
                  key={entry.key}
                  type="button"
                  aria-pressed={statusTab === entry.key}
                  onClick={() => setStatusTab(entry.key)}
                  className={`h-[30px] flex-1 cursor-pointer rounded-[7px] text-xs ${
                    statusTab === entry.key
                      ? 'bg-[#15181C] font-semibold text-white'
                      : 'text-[#4A5159] hover:bg-[#FAFAF8]'
                  }`}
                >
                  {entry.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="px-4 py-4"><SkeletonLines rows={4} /></div>
            ) : notes.length === 0 ? (
              <div className="px-3 py-4">
                <EmptyState
                  icon={<TruckIcon size={26} strokeWidth={1.5} />}
                  title="No dispatch notes"
                  description="Nothing in this period under this filter."
                />
              </div>
            ) : (
              <ul className="m-0 max-h-[640px] list-none overflow-y-auto p-0">
                {notes.map((note) => {
                  const chosen = note._id === selectedId
                  const pct = totalCases(note) > 0 ? (linkedCases(note) / totalCases(note)) * 100 : 0
                  return (
                    <li key={note._id} className="border-b border-[#F3F2EF]">
                      <button
                        type="button"
                        onClick={() => setSelectedId(note._id)}
                        className={`block w-full cursor-pointer px-4 py-3.5 text-left ${chosen ? 'bg-[#F3F8F6]' : 'hover:bg-[#FAFAF8]'}`}
                        style={{ borderLeft: `3px solid ${chosen ? '#15594A' : 'transparent'}` }}
                      >
                        <span className="flex items-center justify-between gap-2.5">
                          <span className="font-numeric text-[13px] font-semibold text-[#15181C]">
                            {shortReference(note._id)}
                          </span>
                          <StatusPill status={note.status} />
                        </span>
                        <span className="mt-1.5 block truncate text-xs text-[#4A5159]">
                          {note.company?.name} · {note.deliveryTo?.name}
                        </span>
                        <span className="mt-2.5 flex items-center gap-[9px]">
                          <span className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-[#EFEEEA]">
                            <span
                              className="block h-full rounded-[3px]"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: pct >= 100 ? '#15594A' : '#C07A1E'
                              }}
                            />
                          </span>
                          <span className="font-numeric shrink-0 text-[11px] text-[#5A636D] tabular-nums">
                            {formatQuantity(linkedCases(note))} / {formatQuantity(totalCases(note))}
                          </span>
                        </span>
                        <span className="mt-[7px] flex items-center justify-between gap-2.5">
                          <span className="font-numeric text-[11px] text-[#5A636D] tabular-nums">
                            {formatDate(note.dateDispatched)}
                          </span>
                          <span className="font-numeric text-[11px] text-[#5A636D] tabular-nums">
                            {formatQuantity(totalCases(note))} cases
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* Detail */}
          <section className="flex min-w-0 flex-[999_1_560px] flex-col gap-3.5">
            {!selected ? (
              <div className="rounded-xl border border-[#E3E2DE] bg-white px-[18px] py-5">
                <EmptyState
                  icon={<TruckIcon size={26} strokeWidth={1.5} />}
                  title="Nothing selected"
                  description="Pick a dispatch note on the left to see its items and serial ranges."
                />
              </div>
            ) : (
              <>
                <div className="overflow-hidden rounded-xl border border-[#E3E2DE] bg-white">
                  <div className="flex flex-wrap items-center gap-3.5 border-b border-[#EDECE8] px-5 py-[18px]">
                    <div className="min-w-0 flex-[1_1_260px]">
                      <h2 className="m-0 flex items-center gap-2.5 text-[19px] font-semibold tracking-[-0.018em]">
                        <span className="font-numeric">{shortReference(selected._id)}</span>
                        <StatusPill status={selected.status} />
                        <span
                          className="inline-block rounded-[5px] px-2 py-[3px] text-[11px] font-semibold"
                          style={{
                            color: marketStyle(selected.market).fg,
                            backgroundColor: marketStyle(selected.market).bg
                          }}
                        >
                          {marketStyle(selected.market).label}
                        </span>
                      </h2>
                      <p className="mt-1.5 mb-0 text-[12.5px] text-[#5A636D]">
                        {selected.company?.name} · {selected.deliveryTo?.name} ·{' '}
                        <span className="font-numeric tabular-nums">{formatDate(selected.dateDispatched)}</span>
                        {selected.vehicleDetails?.vehicleNumber && (
                          <> · {selected.vehicleDetails.vehicleNumber}
                            {selected.vehicleDetails.driverName && ` (${selected.vehicleDetails.driverName})`}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">{statusActions()}</div>
                  </div>

                  {/* Linking progress */}
                  {isFullyLinked(selected) ? (
                    <div className="flex flex-wrap items-center gap-3.5 border-b border-[#C9DED6] bg-[#F3F8F6] px-5 py-3.5">
                      <CheckIcon size={17} strokeWidth={2.2} />
                      <span className="min-w-0 flex-[1_1_280px] text-[12.5px] text-[#0D3C32]">
                        <strong className="font-semibold">Every case carries a serial range.</strong>{' '}
                        {formatQuantity(totalCases(selected))} of {formatQuantity(totalCases(selected))} linked.
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-3.5 border-b border-[#EBD9AC] bg-[#FBF1DC] px-5 py-3.5">
                      <LuTriangleAlert className="shrink-0 text-[#8A5A00]" />
                      <span className="min-w-0 flex-[1_1_280px] text-[12.5px] text-[#5C3D06]">
                        <strong className="font-semibold text-[#3F2A04]">
                          {formatQuantity(linkedCases(selected))} of {formatQuantity(totalCases(selected))} cases carry a serial range.
                        </strong>{' '}
                        The note cannot be loaded until every case is linked.
                      </span>
                      <span className="h-2 max-w-[280px] flex-[1_1_200px] overflow-hidden rounded bg-[#EBD9AC]">
                        <span
                          className="block h-full rounded bg-[#C07A1E]"
                          style={{
                            width: `${totalCases(selected) > 0 ? (linkedCases(selected) / totalCases(selected)) * 100 : 0}%`
                          }}
                        />
                      </span>
                    </div>
                  )}

                  {/* Items */}
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[640px] border-collapse">
                      <thead>
                        <tr>
                          <th className={headerCell}>Item</th>
                          <th className={`${headerCell} text-right`}>Cases</th>
                          <th className={`${headerCell} text-right`}>Bottles / case</th>
                          <th className={`${headerCell} text-right`}>Linked</th>
                          <th className={`${headerCell} text-right`}>Remaining</th>
                          <th className={headerCell} />
                        </tr>
                      </thead>
                      <tbody>
                        {(selected.items || []).map((entry) => {
                          const remaining = (entry.quantityInCases || 0) - (entry.EALIssuedQuantity || 0)
                          const active = entry.item?._id === linkItemId
                          return (
                            <tr key={entry.item?._id || entry._id} className={active ? 'bg-[#F3F8F6]' : ''}>
                              <td className={`${bodyCell} font-medium text-[#15181C]`}>
                                <span className="block max-w-[280px] truncate" title={entry.item?.name || undefined}>
                                  {itemLabel(entry.item) || '—'}
                                </span>
                              </td>
                              <td className={`${bodyCell} font-numeric text-right tabular-nums`}>
                                {formatQuantity(entry.quantityInCases)}
                              </td>
                              <td className={`${bodyCell} font-numeric text-right text-[#5A636D] tabular-nums`}>
                                {entry.item?.bottlesPerCase ?? '—'}
                              </td>
                              <td
                                className={`${bodyCell} font-numeric text-right font-medium tabular-nums`}
                                style={{ color: remaining > TOLERANCE ? '#8A5A00' : '#15594A' }}
                              >
                                {formatQuantity(entry.EALIssuedQuantity || 0)}
                              </td>
                              <td className={`${bodyCell} font-numeric text-right font-semibold tabular-nums`}>
                                {formatQuantity(remaining)}
                              </td>
                              <td className={`${bodyCell} text-right`}>
                                {selected.status === 'final' && mayLink && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setLinkItemId(active ? null : entry.item?._id)
                                      setNewEALData({ prefix: '', serialFrom: '', serialTo: '' })
                                    }}
                                    className={`h-[30px] cursor-pointer rounded-[7px] border px-[11px] text-xs font-medium ${
                                      active
                                        ? 'border-[#15594A] bg-[#15594A] text-white'
                                        : 'border-[#D7D6D1] bg-white text-[#2A2F36] hover:bg-[#FAFAF8]'
                                    }`}
                                  >
                                    {active ? 'Linking…' : 'Link EALs'}
                                  </button>
                                )}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Linking panel */}
                {linkItem && (
                  <div className="overflow-hidden rounded-xl border border-[#C9DED6] bg-white">
                    <div className="flex flex-wrap items-center gap-3 border-b border-[#DCEAE4] bg-[#F3F8F6] px-5 py-[15px]">
                      <span className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg bg-[#15594A] text-white">
                        <LuLink className="text-[15px]" />
                      </span>
                      <div className="min-w-0 flex-[1_1_260px]">
                        <h3 className="m-0 truncate text-[14.5px] font-semibold tracking-[-0.01em]">
                          Link serial ranges · {itemLabel(linkItem.item)}
                        </h3>
                        <p className="mt-[3px] mb-0 text-xs text-[#4A5159]">
                          {formatQuantity(linkItem.EALIssuedQuantity || 0)} of{' '}
                          {formatQuantity(linkItem.quantityInCases)} cases linked ·{' '}
                          {formatQuantity(linkChecks.remaining)} still to link ·{' '}
                          {linkItem.item?.bottlesPerCase} bottles per case
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLinkItemId(null)}
                        className="h-8 cursor-pointer rounded-[7px] border border-[#C9DED6] bg-white px-3 text-[12.5px] text-[#0D3C32]"
                      >
                        Close
                      </button>
                    </div>

                    <form
                      className="flex flex-wrap items-end gap-3.5 px-5 py-[18px]"
                      onSubmit={(event) => { event.preventDefault(); handleAddEAL() }}
                    >
                      <div className="flex-[0_0_108px]">
                        <label htmlFor="d-prefix" className="mb-1.5 block text-xs font-medium text-[#3C434B]">Prefix</label>
                        <input
                          id="d-prefix"
                          value={newEALData.prefix}
                          onChange={({ target }) => setNewEALData((previous) => ({ ...previous, prefix: target.value.toUpperCase() }))}
                          maxLength={3}
                          placeholder="ABC"
                          className={`${fieldClass} tracking-[0.08em] uppercase`}
                        />
                      </div>
                      <div className="min-w-0 flex-[1_1_170px]">
                        <label htmlFor="d-from" className="mb-1.5 block text-xs font-medium text-[#3C434B]">Serial from</label>
                        <input
                          id="d-from"
                          value={newEALData.serialFrom}
                          onChange={({ target }) => setNewEALData((previous) => ({ ...previous, serialFrom: target.value }))}
                          inputMode="numeric"
                          placeholder="10 digits"
                          className={fieldClass}
                        />
                      </div>
                      <div className="min-w-0 flex-[1_1_170px]">
                        <label htmlFor="d-to" className="mb-1.5 block text-xs font-medium text-[#3C434B]">Serial to</label>
                        <input
                          id="d-to"
                          value={newEALData.serialTo}
                          onChange={({ target }) => setNewEALData((previous) => ({ ...previous, serialTo: target.value }))}
                          inputMode="numeric"
                          placeholder="10 digits"
                          className={fieldClass}
                        />
                      </div>
                      <div className="flex-[0_0_150px]">
                        <span className="mb-1.5 block text-xs font-medium text-[#3C434B]">Resolves to</span>
                        <div className="flex h-[38px] items-center gap-[7px] rounded-lg border border-dashed border-[#C9DED6] bg-[#F3F8F6] px-[11px]">
                          <span className="font-numeric text-[13.5px] font-semibold text-[#0D3C32] tabular-nums">
                            {linkChecks.cases > 0 ? formatQuantity(linkChecks.cases) : '—'}
                          </span>
                          <span className="text-[11.5px] text-[#15594A]">cases</span>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={!linkChecks.valid || busy}
                        className="h-[38px] cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] px-[15px] text-[13px] font-semibold text-white hover:bg-[#124C3F] disabled:cursor-not-allowed disabled:border-[#E3E2DE] disabled:bg-[#F2F1ED] disabled:text-[#A8ADB5]"
                      >
                        Add range
                      </button>
                    </form>

                    <ul className="m-0 flex list-none flex-col gap-[7px] px-5 pb-4">
                      {linkChecks.checks.map((check) => (
                        <li
                          key={check.text}
                          className="flex items-start gap-2 text-xs"
                          style={{ color: check.ok ? '#15594A' : '#5A636D' }}
                        >
                          <span className="mt-px shrink-0">
                            {check.ok ? <CheckIcon size={14} strokeWidth={2.4} /> : <LuX className="text-[#A8ADB5]" />}
                          </span>
                          {check.text}
                        </li>
                      ))}
                    </ul>

                    <div className="border-t border-[#EDECE8]">
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
                          {(linkItem.EALLinks || []).length === 0 ? (
                            <tr>
                              <td colSpan={4} className={`${bodyCell} text-center text-[#5A636D]`}>
                                No ranges linked to this item yet.
                              </td>
                            </tr>
                          ) : (
                            linkItem.EALLinks.map((link, index) => {
                              const labels = link.serialTo - link.serialFrom + 1
                              const perCase = linkItem.item?.bottlesPerCase || 0
                              return (
                                <tr key={`${link.prefix}-${link.serialFrom}-${index}`}>
                                  <td className={bodyCell}>
                                    <SerialRange
                                      prefix={link.prefix}
                                      serialFrom={link.serialFrom}
                                      serialTo={link.serialTo}
                                    />
                                  </td>
                                  <td className={`${bodyCell} font-numeric text-right tabular-nums`}>
                                    {formatQuantity(labels)}
                                  </td>
                                  <td className={`${bodyCell} font-numeric text-right font-medium tabular-nums`}>
                                    {perCase > 0 ? formatQuantity(labels / perCase) : '—'}
                                  </td>
                                  <td className={`${bodyCell} text-right`}>
                                    {selected.status === 'final' && mayLink && (
                                      <button
                                        type="button"
                                        onClick={() => setUnlinkCandidate({ link, itemId: linkItem.item._id })}
                                        className="h-7 cursor-pointer rounded-md border border-[#E3BDBB] bg-white px-2.5 text-xs text-[#9B2C2C] hover:bg-[#FCEBEA]"
                                      >
                                        Unlink
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              )
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </div>

      {/* Add / edit note */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={formDispatch?._id ? 'Update Dispatch' : 'Add Dispatch'}
        styleClass="w-full"
      >
        <AddDispatchForm onSubmitDispatch={handleSubmitDispatch} dispatchDetails={formDispatch || []} />
      </Modal>

      {/* Vehicle details */}
      <Modal
        isOpen={vehicleOpen}
        onClose={() => setVehicleOpen(false)}
        title="Enter Vehicle Details"
        styleClass="w-full max-w-md"
      >
        <div className="flex flex-col gap-3.5">
          <p className="m-0 text-[12.5px] text-[#5A636D]">
            Recording the vehicle marks this note as loaded.
          </p>
          {[
            { key: 'vehicleNumber', label: 'Vehicle number' },
            { key: 'driverName', label: 'Driver name' },
            { key: 'driverContact', label: 'Driver contact' }
          ].map((field) => (
            <div key={field.key}>
              <label htmlFor={field.key} className="mb-1.5 block text-xs font-medium text-[#3C434B]">
                {field.label}
              </label>
              <input
                id={field.key}
                value={vehicleData[field.key]}
                onChange={({ target }) => setVehicleData((previous) => ({ ...previous, [field.key]: target.value }))}
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
                {formatQuantity(unlinkCandidate.link.serialTo - unlinkCandidate.link.serialFrom + 1)} labels
                will go back to stock.
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

export default Dispatch
