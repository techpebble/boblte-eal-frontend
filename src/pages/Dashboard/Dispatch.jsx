import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import {
  LuChevronDown,
  LuChevronUp,
  LuDownload,
  LuPlus,
  LuSearch,
  LuTriangleAlert,
  LuX
} from 'react-icons/lu'
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

const railControl =
  'flex h-[30px] items-center gap-1 rounded-lg border border-[#E3E2DE] bg-white px-2 text-left text-[11px] text-[#15181C]'

/** The ten digits have to be there before any judgement about them means anything. */
const tenDigits = (value) => /^\d{10}$/.test(String(value ?? '').trim())

const Dispatch = () => {
  const [dispatches, setDispatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const [dateRange, setDateRange] = useState(monthToDate)
  const [company, setCompany] = useState('')
  const [market, setMarket] = useState('')
  const [statusTab, setStatusTab] = useState('open')
  const [search, setSearch] = useState('')
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

  const [openItemId, setOpenItemId] = useState(null)
  const [newEALData, setNewEALData] = useState({ prefix: '', serialFrom: '', serialTo: '' })

  const [formOpen, setFormOpen] = useState(false)
  const [formDispatch, setFormDispatch] = useState(null)
  const [vehicleOpen, setVehicleOpen] = useState(false)
  const [vehicleData, setVehicleData] = useState({ vehicleNumber: '', driverName: '', driverContact: '' })
  const [unlinkCandidate, setUnlinkCandidate] = useState(null)
  const [unlinkConfirmText, setUnlinkConfirmText] = useState('')

  const [reloadToken, setReloadToken] = useState(0)

  // Below lg the two panes stack, so picking a note moves something that is
  // off screen. Bring it into view rather than leaving the press looking
  // like it did nothing.
  const detailRef = useRef(null)
  const scrollToDetail = () => {
    if (window.matchMedia('(min-width: 1024px)').matches) return
    detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

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

  const notes = useMemo(() => {
    const term = search.trim().toLowerCase()
    return dispatches.filter((note) => {
      if (tab.matches && !tab.matches.includes(note.status)) return false
      if (!term) return true
      return [note.deliveryTo?.name, note.company?.name, note.company?.code, shortReference(note._id)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    })
  }, [dispatches, tab, search])

  // The detail only ever reads from the filtered list, so a note the filters
  // have hidden can never be the one still on show.
  const selected = notes.find((note) => note._id === selectedId) || null

  useEffect(() => {
    if (notes.length === 0) {
      if (selectedId !== null) setSelectedId(null)
      return
    }
    if (!notes.some((note) => note._id === selectedId)) setSelectedId(notes[0]._id)
  }, [notes, selectedId])

  useEffect(() => {
    setOpenItemId(null)
    setNewEALData({ prefix: '', serialFrom: '', serialTo: '' })
  }, [selectedId])

  const openItem = selected?.items?.find((entry) => entry.item?._id === openItemId) || null

  const replaceNote = (updated) => {
    setDispatches((previous) => previous.map((note) => (note._id === updated._id ? updated : note)))
  }

  const linkedCases = (note) => note?.EALIssuedTotalQuantity || 0
  const totalCases = (note) => note?.totalQuantity || 0
  const isFullyLinked = (note) => linkedCases(note) + TOLERANCE >= totalCases(note)
  const casesLeft = (entry) => (entry?.quantityInCases || 0) - (entry?.EALIssuedQuantity || 0)

  const filtersActive = Boolean(search.trim() || company || market)
  const clearFilters = () => { setSearch(''); setCompany(''); setMarket('') }

  // With company scoping on, most people only ever see their own company, and a
  // picker whose one real option is "yours" is just furniture.
  const showCompanyFilter = companies.length > 1

  /** Mirrors the rules addEALLinkToDispatchItem enforces, so a bad range is
      caught before it is sent. A check stays unjudged until the fields it
      reads actually hold something, so an untouched form shows no verdicts. */
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
      check(
        Boolean(newEALData.serialFrom || newEALData.serialTo),
        serialsReady,
        'Both serials are ten digits.'
      ),
      check(serialsReady, count > 0, 'Serial to is above serial from.'),
      check(
        serialsReady && count > 0,
        perCase > 0 && count % perCase === 0 && to % perCase === 0 && (from - 1) % perCase === 0,
        `The range closes on a whole case of ${perCase || '—'}.`
      ),
      check(
        cases > 0,
        cases <= remaining + TOLERANCE,
        `Fits the ${formatQuantity(remaining)} case(s) still to link.`
      )
    ]

    return {
      checks,
      cases,
      countKnown: serialsReady && count > 0,
      remaining,
      valid: checks.every((entry) => entry.state === 'ok')
    }
  }, [openItem, newEALData])

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
        itemId: openItem.item._id,
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

  /** The buttons that change the note itself. Moving it along its statuses is
      the next-step bar's job, so none of that is repeated here. */
  const noteActions = () => {
    if (!selected) return []
    const id = selected._id

    if (selected.status === 'draft') {
      return [
        mayEdit && actionButton('Edit note', () => { setFormDispatch(selected); setFormOpen(true) }, 'secondary'),
        mayDelete && actionButton('Delete', () => deleteDispatch(id), 'danger')
      ].filter(Boolean)
    }

    if (selected.status === 'final' && mayStatus && linkedCases(selected) === 0) {
      return [actionButton('Back to draft', () => updateDispatchStatus(id, 'draft'), 'secondary')]
    }

    return []
  }

  /** The one thing to do next, with the reason it can or cannot be done yet. */
  const nextStep = () => {
    if (!selected) return null
    const id = selected._id
    const done = linkedCases(selected)
    const total = totalCases(selected)
    const pct = total > 0 ? Math.min(100, (done / total) * 100) : 0
    const full = isFullyLinked(selected)
    const waiting = (selected.items || []).filter((entry) => casesLeft(entry) > TOLERANCE).length

    if (selected.status === 'draft') {
      return {
        tone: 'neutral',
        title: 'This note is still a draft',
        detail: 'Finalise it to start linking serial ranges to its cases.',
        action: mayStatus ? actionButton('Finalise', () => updateDispatchStatus(id, 'final')) : null
      }
    }

    if (selected.status === 'final' && !full) {
      return {
        tone: 'warn',
        title: waiting === 1
          ? 'One item still needs serial ranges'
          : `${formatQuantity(waiting)} items still need serial ranges`,
        detail: 'This note cannot be marked loaded until every case carries one.',
        progress: { done, total, pct },
        // No button: every row below carries its own, and a second door to
        // the same room only makes the first one harder to find.
        action: null
      }
    }

    if (selected.status === 'final' && full) {
      return {
        tone: 'good',
        title: 'Every case carries a serial range',
        detail: 'Record the vehicle to mark this note loaded.',
        progress: { done, total, pct: 100 },
        action: mayStatus ? actionButton('Mark loaded', () => setVehicleOpen(true)) : null
      }
    }

    if (selected.status === 'loaded') {
      return {
        tone: 'good',
        title: 'Loaded and ready to leave',
        detail: 'Mark it dispatched once the lorry is away.',
        action: mayStatus ? actionButton('Mark dispatched', () => updateDispatchStatus(id, 'dispatched')) : null
      }
    }

    if (selected.status === 'dispatched') {
      return {
        tone: 'good',
        title: 'On the road',
        detail: 'Mark it delivered once the depot confirms receipt.',
        action: mayStatus ? actionButton('Mark delivered', () => updateDispatchStatus(id, 'delivered')) : null
      }
    }

    return {
      tone: 'good',
      title: 'Delivered',
      detail: 'Nothing left to do on this note.',
      action: null
    }
  }

  const step = nextStep()
  const stepTone = {
    warn: { border: '#C07A1E', bar: '#C07A1E' },
    good: { border: '#15594A', bar: '#15594A' },
    neutral: { border: '#8A919B', bar: '#8A919B' }
  }[step?.tone || 'neutral']

  return (
    <DashboardLayout activeMenu="Dispatch">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-3.5 lg:h-[calc(100vh-100px)] lg:min-h-[540px]">

        {/* Page header */}
        <div className="flex shrink-0 flex-wrap items-end justify-between gap-3.5">
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

        {error && (
          <p role="alert" className="m-0 shrink-0 rounded-[10px] border border-[#F3C9C7] bg-[#FCEBEA] px-4 py-3 text-[13px] text-[#7A2322]">
            {error}
          </p>
        )}

        {/* The rail holds a fixed width so the detail can never be pushed below
            it on a laptop. Above lg each side scrolls on its own and the page
            itself does not scroll at all. */}
        <div className="flex min-h-0 flex-col gap-3.5 lg:flex-1 lg:flex-row">

          {/* ---------------- Note list ---------------- */}
          <section className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[#E3E2DE] bg-white lg:h-full lg:w-[320px] lg:shrink-0">

            {/* Everything here narrows the list and nothing else, which is why it
                sits inside the list rather than in a bar across the whole page. */}
            {/* Four short rows. The page title already says Dispatch, so the
                rail needs no heading of its own, and every row saved here is
                another depot visible without scrolling. */}
            <div className="flex shrink-0 flex-col gap-[7px] border-b border-[#EDECE8] p-2.5">
              <label className="flex h-[30px] items-center gap-2 rounded-lg border border-[#E3E2DE] bg-[#F6F5F3] px-2.5">
                <LuSearch className="shrink-0 text-[#8A919B]" />
                <span className="sr-only">Search notes by depot, company or reference</span>
                <input
                  value={search}
                  onChange={({ target }) => setSearch(target.value)}
                  placeholder="Depot, company or reference"
                  className="min-w-0 flex-1 border-0 bg-transparent text-[11.5px] text-[#15181C] outline-none"
                />
              </label>

              <div role="group" aria-label="Filter by status" className="flex gap-0.5 rounded-lg bg-[#F2F1ED] p-[3px]">
                {STATUS_TABS.map((entry) => (
                  <button
                    key={entry.key}
                    type="button"
                    aria-pressed={statusTab === entry.key}
                    onClick={() => setStatusTab(entry.key)}
                    className={`h-[25px] flex-1 cursor-pointer rounded-md text-[11px] whitespace-nowrap ${
                      statusTab === entry.key
                        ? 'bg-white font-semibold text-[#15181C] shadow-sm'
                        : 'text-[#5A636D] hover:text-[#15181C]'
                    }`}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>

              {/* Date, company and market share one row; the full range is in
                  the picker, so the trigger only has to say which days. */}
              <div className="flex gap-1.5">
                <DateRangeModal compact dateRange={dateRange} onApplyDateRange={onApplyDateRange} />
                {showCompanyFilter && (
                  <label className={`${railControl} min-w-0 flex-1`}>
                    <span className="sr-only">Company</span>
                    <select
                      value={company}
                      onChange={({ target }) => setCompany(target.value)}
                      className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent text-[11px] outline-none"
                    >
                      <option value="">All firms</option>
                      {companies.map((option) => (
                        <option key={option._id} value={option._id}>{option.code || option.name}</option>
                      ))}
                    </select>
                  </label>
                )}
                <label className={`${railControl} min-w-0 flex-1`}>
                  <span className="sr-only">Market</span>
                  <select
                    value={market}
                    onChange={({ target }) => setMarket(target.value)}
                    className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent text-[11px] outline-none"
                  >
                    <option value="">All markets</option>
                    <option value="local">Local</option>
                    <option value="export">Export</option>
                  </select>
                </label>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="font-numeric truncate text-[10.5px] text-[#5A636D] tabular-nums">
                  {formatQuantity(notes.length)} {notes.length === 1 ? 'note' : 'notes'}
                </span>
                {/* Only while something is hiding notes, so the reason one is
                    missing is never off screen. */}
                {filtersActive ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="shrink-0 cursor-pointer border-0 bg-transparent p-0 text-[10.5px] font-medium text-[#15594A] underline underline-offset-[3px]"
                  >
                    Clear filters
                  </button>
                ) : (
                  <span className="shrink-0 text-[10.5px] text-[#A8ADB5]">All shown</span>
                )}
              </div>
            </div>

            {loading ? (
              <div className="px-4 py-4"><SkeletonLines rows={4} /></div>
            ) : notes.length === 0 ? (
              <div className="px-3 py-4">
                <EmptyState
                  icon={<TruckIcon size={26} strokeWidth={1.5} />}
                  title="No dispatch notes"
                  description={filtersActive
                    ? 'Nothing matches these filters. Clear them to see the rest.'
                    : 'Nothing in this period under this status.'}
                  action={filtersActive ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="h-[34px] cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] px-3.5 text-[12.5px] font-medium text-white"
                    >
                      Clear filters
                    </button>
                  ) : undefined}
                />
              </div>
            ) : (
              <ul className="m-0 min-h-0 flex-1 list-none overflow-y-auto p-0 max-lg:max-h-[360px]">
                {notes.map((note) => {
                  const chosen = note._id === selectedId
                  const done = linkedCases(note)
                  const total = totalCases(note)
                  const pct = total > 0 ? Math.min(100, (done / total) * 100) : 0
                  const full = done + TOLERANCE >= total
                  return (
                    <li key={note._id} className="border-b border-[#F3F2EF]">
                      <button
                        type="button"
                        aria-current={chosen}
                        onClick={() => { setSelectedId(note._id); scrollToDetail() }}
                        className={`block w-full cursor-pointer py-3 pr-3.5 pl-3 text-left ${chosen ? 'bg-[#F3F8F6]' : 'hover:bg-[#FAFAF8]'}`}
                        style={{ borderLeft: `3px solid ${chosen ? '#15594A' : 'transparent'}` }}
                      >
                        {/* The depot leads: it is what people say out loud. */}
                        <span className="flex items-start justify-between gap-2">
                          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-[#15181C]">
                            {note.deliveryTo?.name || 'Depot not set'}
                          </span>
                          <StatusPill status={note.status} />
                        </span>
                        <span className="mt-[5px] flex items-center gap-1.5">
                          {note.company?.code && (
                            <span className="font-numeric shrink-0 rounded-[4px] bg-[#F0EFEC] px-[5px] py-px text-[10px] font-semibold tracking-[0.04em] text-[#3C434B]">
                              {note.company.code}
                            </span>
                          )}
                          <span className="min-w-0 flex-1 truncate text-[11.5px] text-[#4A5159]">
                            {note.company?.name || '—'}
                          </span>
                        </span>
                        <span className="mt-1 flex items-center gap-1.5">
                          <span className="font-numeric text-[11px] text-[#5A636D] tabular-nums">
                            {shortReference(note._id)}
                          </span>
                          <span className="text-[11px] text-[#C3C2BD]">·</span>
                          <span className="font-numeric text-[11px] text-[#5A636D] tabular-nums">
                            {formatDate(note.dateDispatched)}
                          </span>
                        </span>
                        <span className="mt-2.5 flex items-center gap-2">
                          <span className="h-[5px] flex-1 overflow-hidden rounded-[3px] bg-[#EFEEEA]">
                            <span
                              className="block h-full rounded-[3px]"
                              style={{ width: `${pct}%`, backgroundColor: full ? '#15594A' : '#C07A1E' }}
                            />
                          </span>
                          <span
                            className="font-numeric shrink-0 text-[11px] font-medium tabular-nums"
                            style={{ color: full ? '#5A636D' : '#8A5A00' }}
                          >
                            {full
                              ? `${formatQuantity(total)} cases`
                              : `${formatQuantity(done)} / ${formatQuantity(total)}`}
                          </span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {/* ---------------- Detail ---------------- */}
          <section ref={detailRef} className="flex min-h-0 min-w-0 flex-1 scroll-mt-4 flex-col lg:h-full lg:overflow-y-auto">
            {!selected ? (
              <div className="rounded-xl border border-[#E3E2DE] bg-white px-[18px] py-5">
                <EmptyState
                  icon={<TruckIcon size={26} strokeWidth={1.5} />}
                  title="Nothing selected"
                  description="Pick a dispatch note on the left to see its items and serial ranges."
                />
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">

                {/* Identity */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-[1_1_300px]">
                    <h2 className="m-0 flex flex-wrap items-center gap-2.5 text-[21px] font-semibold tracking-[-0.02em]">
                      {selected.deliveryTo?.name || 'Depot not set'}
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
                      <span className="font-numeric tabular-nums">{shortReference(selected._id)}</span>
                      {' · '}{selected.company?.name || '—'}
                      {' · '}
                      <span className="font-numeric tabular-nums">{formatDate(selected.dateDispatched)}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">{noteActions()}</div>
                </div>

                {/* The state, the blocker, the progress and the one action, together */}
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
                  <h3 className="m-0 px-4 pt-3.5 pb-1 text-[13.5px] font-semibold tracking-[-0.01em]">
                    Items on this note
                  </h3>
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
                        {(selected.items || []).map((entry) => {
                          const itemId = entry.item?._id
                          const left = casesLeft(entry)
                          const covered = left <= TOLERANCE
                          const total = entry.quantityInCases || 0
                          const pct = total > 0 ? Math.min(100, ((entry.EALIssuedQuantity || 0) / total) * 100) : 0
                          const open = Boolean(itemId) && itemId === openItemId
                          const ranges = entry.EALLinks || []
                          const canLink = mayLink && selected.status === 'final'
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
                                <td className={`${bodyCell} font-numeric text-right tabular-nums`}>
                                  {formatQuantity(total)}
                                </td>
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
                                            <strong className="font-semibold text-[#15181C]">
                                              {itemLabel(entry.item)}
                                            </strong>
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
                                                onChange={({ target }) => setNewEALData((previous) => ({ ...previous, prefix: target.value.toUpperCase() }))}
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
                                                onChange={({ target }) => setNewEALData((previous) => ({ ...previous, serialFrom: target.value }))}
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
                                                onChange={({ target }) => setNewEALData((previous) => ({ ...previous, serialTo: target.value }))}
                                                inputMode="numeric"
                                                placeholder="10 digits"
                                                className={fieldClass}
                                              />
                                            </div>
                                            <div className="flex-[0_0_132px]">
                                              <span className="mb-1.5 block text-[11.5px] font-medium text-[#3C434B]">Resolves to</span>
                                              <div className="flex h-[38px] items-center gap-[6px] rounded-lg border border-dashed border-[#C9DED6] bg-[#F3F8F6] px-[11px]">
                                                {/* Nothing is worked out until both serials really are ten
                                                    digits; otherwise an empty form reports a fraction of a case. */}
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
                                                  color: entryCheck.state === 'ok'
                                                    ? '#15594A'
                                                    : entryCheck.state === 'bad'
                                                      ? '#9B2C2C'
                                                      : '#8A919B'
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
                                          <p className="m-0 px-4 py-3 text-xs text-[#5A636D]">
                                            No ranges linked to this item yet.
                                          </p>
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
                            {formatQuantity((selected.items || []).length)}{' '}
                            {(selected.items || []).length === 1 ? 'item' : 'items'}
                          </td>
                          <td className={`${bodyCell} font-numeric border-t border-[#DEDDD8] bg-[#FAFAF8] text-right font-semibold tabular-nums`}>
                            {formatQuantity(totalCases(selected))}
                          </td>
                          <td className={`${bodyCell} font-numeric border-t border-[#DEDDD8] bg-[#FAFAF8] text-right font-semibold tabular-nums`}>
                            {formatQuantity(linkedCases(selected))}
                          </td>
                          <td colSpan={2} className={`${bodyCell} border-t border-[#DEDDD8] bg-[#FAFAF8]`} />
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Delivery, in its own block rather than crammed into the meta line */}
                <div className="rounded-xl border border-[#E3E2DE] bg-white px-[18px] py-4">
                  <h3 className="m-0 mb-3 text-[13.5px] font-semibold tracking-[-0.01em]">Delivery</h3>
                  <dl className="m-0 flex flex-wrap gap-x-9 gap-y-4">
                    {[
                      { label: 'Depot', value: selected.deliveryTo?.name },
                      { label: 'Market', value: marketStyle(selected.market).label },
                      { label: 'Date dispatched', value: formatDate(selected.dateDispatched), mono: true },
                      { label: 'Vehicle', value: selected.vehicleDetails?.vehicleNumber, mono: true },
                      { label: 'Driver', value: selected.vehicleDetails?.driverName },
                      { label: 'Driver contact', value: selected.vehicleDetails?.driverContact, mono: true },
                      { label: 'Raised by', value: selected.createdBy?.fullName }
                    ].map((field) => (
                      <div key={field.label} className="min-w-0">
                        <dt className="text-[10.5px] font-semibold tracking-[0.07em] text-[#5A636D] uppercase">
                          {field.label}
                        </dt>
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
              </div>
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
