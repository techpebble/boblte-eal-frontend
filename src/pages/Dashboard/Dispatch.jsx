import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { LuChevronDown, LuDownload, LuPlus, LuRefreshCw, LuSearch, LuUndo2 } from 'react-icons/lu'
import DashboardLayout from '../../components/layouts/DashboardLayout'
import Modal from '../../components/Modal/Modal'
import DateRangeModal from '../../components/Modal/DateRangeModal'
import AddDispatchForm from '../../components/Dispatch/AddDispatchForm'
import CoverNote from '../../components/Dispatch/CoverNote'
import StickerSummary from '../../components/Dispatch/StickerSummary'
import EmptyState from '../../components/Dashboard/EmptyState'
import AnchoredMenu from '../../components/Dashboard/AnchoredMenu'
import { SkeletonTableRows } from '../../components/Dashboard/Skeleton'
import { TruckIcon } from '../../components/Dashboard/icons'
import { formatQuantity, shortReference, statusStyle } from '../../components/Dashboard/dashboardFormat'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATHS } from '../../utils/apiPaths'
import { downloadCsv } from '../../utils/exportCsv'
import { formatDate, formatDateToYYYYMMDD } from '../../utils/helper'
import { UserContext } from '../../context/userContext'
import { can } from '../../utils/permissions'
import {
  TOLERANCE,
  isFullyLinked,
  linkedCases,
  movesFor,
  needsVehicle,
  totalCases
} from '../../utils/dispatchStages'

const PAGE_SIZES = [25, 50, 100]
const COLUMN_COUNT = 8

const headerCell =
  'bg-[#FAFAF8] px-3 pt-[11px] pb-2.5 text-left text-[11px] font-semibold tracking-[0.07em] text-[#5A636D] uppercase whitespace-nowrap'
const bodyCell = 'border-t border-[#EDECE8] px-3 py-2.5 text-[13px] text-[#2A2F36]'

/** Today. The day's own work is what these pages are opened for; a wider
    window is a question you ask, not the one you start with. */
const today = () => {
  const now = new Date()
  return { startDate: now, endDate: now, key: 'selection' }
}

/**
 * The tiles across the top. "Needs serials" is the only one that is actually
 * blocked, so it carries the amber and counts the cases rather than the notes
 * — the notes do not tell you how much work is left.
 */
const TILES = [
  {
    key: 'blocked',
    label: 'Needs serials',
    dot: '#C07A1E',
    accent: '#C07A1E',
    matches: (note) => note.status === 'final' && !isFullyLinked(note),
    note: (rows) => {
      const cases = rows.reduce((sum, note) => sum + (totalCases(note) - linkedCases(note)), 0)
      return `${formatQuantity(Math.round(cases))} cases uncovered`
    }
  },
  {
    key: 'ready',
    label: 'Ready to load',
    dot: '#15594A',
    matches: (note) => note.status === 'final' && isFullyLinked(note),
    note: () => 'every case covered'
  },
  { key: 'loaded', label: 'Loaded', dot: '#2F7363', matches: (n) => n.status === 'loaded', note: () => 'waiting on the yard' },
  { key: 'transit', label: 'In transit', dot: '#1D4E89', matches: (n) => n.status === 'dispatched', note: () => 'on the road' },
  { key: 'delivered', label: 'Delivered', dot: '#A8ADB5', matches: (n) => n.status === 'delivered', note: () => 'in this period' }
]

const Dispatch = () => {
  const navigate = useNavigate()
  const { user } = useContext(UserContext)
  const mayCreate = can(user, 'dispatch:create')
  const mayEdit = can(user, 'dispatch:edit')
  const mayDelete = can(user, 'dispatch:delete')
  const mayStatus = can(user, 'dispatch:status')
  // Undoing a stage is a supervisor's call, kept apart from moving one along.
  const mayReverse = can(user, 'dispatch:reverse')

  const [dispatches, setDispatches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  const [dateRange, setDateRange] = useState(today)
  const [company, setCompany] = useState('')
  const [market, setMarket] = useState('')
  const [search, setSearch] = useState('')
  const [tile, setTile] = useState(null)
  const [companies, setCompanies] = useState([])

  const [selected, setSelected] = useState(() => new Set())
  const [openMenu, setOpenMenu] = useState(null) // { id, kind, anchor }
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  const [formOpen, setFormOpen] = useState(false)
  const [vehicleFor, setVehicleFor] = useState(null)
  // Undoing a stage is not a one-click act: it says what it will mean first.
  const [undoing, setUndoing] = useState(null) // { note, move }
  // A note opens over the list, so the list keeps its filters and its place.
  const [covering, setCovering] = useState(null)
  // The stickers already on a note, laid out to be copied into the portal.
  const [summarising, setSummarising] = useState(null)
  const [vehicleData, setVehicleData] = useState({ vehicleNumber: '', driverName: '', driverContact: '' })
  const [reloadToken, setReloadToken] = useState(0)

  const tableRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const run = async () => {
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
        setError(err?.response?.data?.message || 'Could not load the dispatch notes.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    run()
    return () => { cancelled = true }
  }, [dateRange, company, market, reloadToken])

  useEffect(() => {
    const run = async () => {
      try {
        const res = await axiosInstance.get(API_PATHS.COMPANY.GET_DATA)
        setCompanies(res.data?.data || res.data || [])
      } catch (err) {
        console.log('Could not load the company list.', err)
      }
    }
    run()
  }, [])

  // A click anywhere else closes whichever menu is open. The menu itself is
  // drawn at the end of the document, not inside the row, so "elsewhere" is
  // decided by the data-menu mark rather than by where the table is.
  useEffect(() => {
    if (!openMenu) return undefined
    const close = (event) => {
      if (event.type === 'keydown') {
        if (event.key === 'Escape') setOpenMenu(null)
        return
      }
      if (event.target?.closest?.('[data-menu]')) return
      setOpenMenu(null)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', close)
    }
  }, [openMenu])

  const counts = useMemo(
    () => Object.fromEntries(TILES.map((entry) => [entry.key, dispatches.filter(entry.matches)])),
    [dispatches]
  )

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase()
    const chosen = TILES.find((entry) => entry.key === tile)
    return dispatches.filter((note) => {
      if (chosen && !chosen.matches(note)) return false
      if (!term) return true
      return [note.deliveryTo?.name, note.company?.name, note.company?.code, shortReference(note._id)]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    })
  }, [dispatches, search, tile])

  const filtersActive = Boolean(search.trim() || company || market || tile)
  const clearFilters = () => { setSearch(''); setCompany(''); setMarket(''); setTile(null) }
  const showCompanyFilter = companies.length > 1

  useEffect(() => { setPage(1) }, [search, tile, company, market, pageSize])

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const pageRows = useMemo(
    () => rows.slice((page - 1) * pageSize, page * pageSize),
    [rows, page, pageSize]
  )

  // A selection only means anything while the rows are still on screen.
  useEffect(() => {
    setSelected((previous) => {
      const live = new Set(rows.map((note) => note._id))
      const next = new Set([...previous].filter((id) => live.has(id)))
      return next.size === previous.size ? previous : next
    })
  }, [rows])

  const selectedNotes = useMemo(
    () => dispatches.filter((note) => selected.has(note._id)),
    [dispatches, selected]
  )

  /** A bulk move only makes sense while every note picked is at the same
      stage, and that stage has a step that needs no dialog of its own. */
  const bulkMove = useMemo(() => {
    if (selectedNotes.length === 0 || !mayStatus) return null
    const stages = new Set(selectedNotes.map((note) => note.status))
    if (stages.size > 1) {
      return { blocked: `They are at ${stages.size} different stages, so they cannot move together.` }
    }
    const [first] = selectedNotes
    const move = movesFor(first).find((entry) => !entry.back)
    if (!move) return { blocked: 'There is no next stage for these.' }
    if (!move.allowed) return { blocked: move.reason }
    if (needsVehicle(first.status, move.to)) {
      return { blocked: 'Each of these needs its own vehicle recorded, so they go one at a time.' }
    }
    return { to: move.to, label: move.label }
  }, [selectedNotes, mayStatus])

  /**
   * The main half of a row's split button. Before a note leaves, the work is
   * covering its cases; after it has gone, the question is what went on it —
   * which is the list the excise portal asks for.
   */
  const mainAction = (note) =>
    note.status === 'draft' || note.status === 'final'
      ? { label: 'Cover', run: () => setCovering(note) }
      : { label: 'Stickers', run: () => setSummarising(note) }

  const toggleRow = (id) => setSelected((previous) => {
    const next = new Set(previous)
    if (next.has(id)) next.delete(id); else next.add(id)
    return next
  })

  const allOnPageSelected = pageRows.length > 0 && pageRows.every((note) => selected.has(note._id))
  const toggleAllOnPage = () => setSelected((previous) => {
    const next = new Set(previous)
    if (allOnPageSelected) pageRows.forEach((note) => next.delete(note._id))
    else pageRows.forEach((note) => next.add(note._id))
    return next
  })

  const moveNote = async (note, to) => {
    if (needsVehicle(note.status, to)) {
      setVehicleFor(note)
      setOpenMenu(null)
      return
    }
    try {
      setBusy(true)
      await axiosInstance.put(`${API_PATHS.DISPATCH.UPDATE_DATA}/${note._id}/status`, { status: to })
      setDispatches((previous) => previous.map((row) => (row._id === note._id ? { ...row, status: to } : row)))
      toast.success(`Moved to ${to}`)
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Could not move this note.')
    } finally {
      setBusy(false)
      setOpenMenu(null)
    }
  }

  /** One call per note, because the API moves one note at a time. Whatever
      succeeds is kept; the rest are named rather than silently dropped. */
  const moveSelected = async () => {
    if (!bulkMove?.to) return
    setBusy(true)
    const done = []
    const failed = []

    for (const note of selectedNotes) {
      try {
        await axiosInstance.put(`${API_PATHS.DISPATCH.UPDATE_DATA}/${note._id}/status`, { status: bulkMove.to })
        done.push(note._id)
      } catch {
        failed.push(note.deliveryTo?.name || shortReference(note._id))
      }
    }

    if (done.length > 0) {
      setDispatches((previous) =>
        previous.map((row) => (done.includes(row._id) ? { ...row, status: bulkMove.to } : row))
      )
      setSelected(new Set())
      toast.success(`${formatQuantity(done.length)} moved to ${bulkMove.to}`)
    }
    if (failed.length > 0) {
      toast.error(`${formatQuantity(failed.length)} could not move: ${failed.slice(0, 3).join(', ')}${failed.length > 3 ? '…' : ''}`)
    }
    setBusy(false)
  }

  const removeNote = async (note) => {
    try {
      setBusy(true)
      await axiosInstance.delete(`${API_PATHS.DISPATCH.DELETE_DATA}/${note._id}`)
      setDispatches((previous) => previous.filter((row) => row._id !== note._id))
      toast.success('Dispatch deleted successfully')
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to delete dispatch.')
    } finally {
      setBusy(false)
      setOpenMenu(null)
    }
  }

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
      await axiosInstance.post(API_PATHS.DISPATCH.ADD_DATA, dispatch)
      toast.success('Dispatch Details added successfully')
      setFormOpen(false)
      setReloadToken((token) => token + 1)
    } catch (err) {
      toast.error(err.response?.data?.error || err.response?.data?.message || 'Failed to save dispatch details.')
    } finally {
      setBusy(false)
    }
  }

  const submitVehicle = async () => {
    try {
      setBusy(true)
      await axiosInstance.put(`${API_PATHS.DISPATCH.UPDATE_DATA}/${vehicleFor._id}/vehicle`, {
        ...vehicleData,
        status: 'loaded'
      })
      toast.success('Vehicle details submitted')
      setVehicleFor(null)
      setVehicleData({ vehicleNumber: '', driverName: '', driverContact: '' })
      setReloadToken((token) => token + 1)
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error submitting vehicle info')
    } finally {
      setBusy(false)
    }
  }

  const exportNotes = () => {
    if (rows.length === 0) return
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
      selectedNotes.length > 0 ? selectedNotes : rows
    )
  }

  return (
    <DashboardLayout activeMenu="Dispatch">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-3.5">

        {/* Page header */}
        <div className="flex flex-wrap items-end justify-between gap-3.5">
          <div>
            <h1 className="m-0 text-[25px] font-semibold tracking-[-0.022em]">Dispatch</h1>
            <p className="mt-1.5 mb-0 text-[13px] text-[#5A636D]">Notes raised, and how far each one has got.</p>
          </div>
          <div className="flex gap-2">
            {/* Ask the same question again. Nudging a filter and nudging it
                back was the long way round to see what had happened since. */}
            <button
              type="button"
              onClick={() => setReloadToken((token) => token + 1)}
              disabled={loading}
              className="flex h-9 cursor-pointer items-center gap-[7px] rounded-lg border border-[#D7D6D1] bg-white px-[13px] text-[13px] font-medium text-[#2A2F36] hover:bg-[#FAFAF8] disabled:cursor-not-allowed disabled:text-[#A8ADB5]"
            >
              <LuRefreshCw className={loading ? 'animate-spin' : undefined} />
              Refresh
            </button>
            <button
              type="button"
              onClick={exportNotes}
              disabled={rows.length === 0}
              className="flex h-9 cursor-pointer items-center gap-[7px] rounded-lg border border-[#D7D6D1] bg-white px-[13px] text-[13px] font-medium text-[#2A2F36] hover:bg-[#FAFAF8] disabled:cursor-not-allowed disabled:text-[#A8ADB5]"
            >
              <LuDownload />
              Export
            </button>
            {mayCreate && (
              <button
                type="button"
                onClick={() => setFormOpen(true)}
                className="flex h-9 cursor-pointer items-center gap-[7px] rounded-lg border border-[#15594A] bg-[#15594A] px-3.5 text-[13px] font-medium text-white hover:bg-[#124C3F]"
              >
                <LuPlus />
                New dispatch note
              </button>
            )}
          </div>
        </div>

        {error && (
          <p role="alert" className="m-0 rounded-[10px] border border-[#F3C9C7] bg-[#FCEBEA] px-4 py-3 text-[13px] text-[#7A2322]">
            {error}
          </p>
        )}

        {/* The statuses are the filter, and each one says what it is worth */}
        <div role="group" aria-label="Filter by status" className="flex flex-wrap gap-2.5">
          {TILES.map((entry) => {
            const bucket = counts[entry.key] || []
            const on = tile === entry.key
            return (
              <button
                key={entry.key}
                type="button"
                aria-pressed={on}
                onClick={() => setTile(on ? null : entry.key)}
                className="flex min-w-0 flex-[1_1_150px] cursor-pointer flex-col gap-[3px] rounded-[11px] border bg-white px-3.5 py-[11px] text-left hover:bg-[#FAFAF8]"
                style={{ borderColor: on ? (entry.accent || '#15594A') : '#E3E2DE' }}
              >
                <span
                  className="flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.06em] uppercase"
                  style={{ color: entry.accent || '#5A636D' }}
                >
                  <span className="h-[7px] w-[7px] shrink-0 rounded-full" style={{ backgroundColor: entry.dot }} />
                  {entry.label}
                </span>
                <span
                  className="font-numeric text-[20px] font-semibold tracking-[-0.02em] tabular-nums"
                  style={{ color: bucket.length === 0 ? '#8A919B' : '#15181C' }}
                >
                  {formatQuantity(bucket.length)}
                </span>
                <span className="truncate text-[11px]" style={{ color: entry.accent || '#5A636D' }}>
                  {bucket.length === 0 ? 'none' : entry.note(bucket)}
                </span>
              </button>
            )
          })}
        </div>

        {/* Filters. No detail panel beside them now, so a bar reads as a bar. */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-[34px] min-w-[180px] flex-[1_1_230px] items-center gap-2 rounded-lg border border-[#E3E2DE] bg-[#F6F5F3] px-2.5 sm:max-w-[320px]">
            <LuSearch className="shrink-0 text-[#8A919B]" />
            <span className="sr-only">Search notes by depot, company or reference</span>
            <input
              value={search}
              onChange={({ target }) => setSearch(target.value)}
              placeholder="Depot, company or reference"
              className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] text-[#15181C] outline-none"
            />
          </label>
          <DateRangeModal dateRange={dateRange} onApplyDateRange={setDateRange} />
          {showCompanyFilter && (
            <label className="flex h-[34px] items-center gap-[7px] rounded-lg border border-[#E3E2DE] bg-white px-2.5 text-[12.5px]">
              <span className="sr-only">Company</span>
              <select
                value={company}
                onChange={({ target }) => setCompany(target.value)}
                className="cursor-pointer border-0 bg-transparent text-[12.5px] text-[#15181C] outline-none"
              >
                <option value="">All companies</option>
                {companies.map((option) => (
                  <option key={option._id} value={option._id}>{option.name}</option>
                ))}
              </select>
            </label>
          )}
          <label className="flex h-[34px] items-center gap-[7px] rounded-lg border border-[#E3E2DE] bg-white px-2.5 text-[12.5px]">
            <span className="sr-only">Market</span>
            <select
              value={market}
              onChange={({ target }) => setMarket(target.value)}
              className="cursor-pointer border-0 bg-transparent text-[12.5px] text-[#15181C] outline-none"
            >
              <option value="">All markets</option>
              <option value="local">Local</option>
              <option value="export">Export</option>
            </select>
          </label>
          <span className="ml-auto flex items-center gap-3 text-[12px] text-[#5A636D]">
            <span>
              Showing <strong className="font-semibold text-[#15181C]">{formatQuantity(rows.length)}</strong>
              {' '}of {formatQuantity(dispatches.length)}
            </span>
            {filtersActive && (
              <button
                type="button"
                onClick={clearFilters}
                className="cursor-pointer border-0 bg-transparent p-0 text-[12px] font-medium text-[#15594A] underline underline-offset-[3px]"
              >
                Clear filters
              </button>
            )}
          </span>
        </div>

        <section className="overflow-hidden rounded-xl border border-[#E3E2DE] bg-white">

          {/* Only once rows are ticked, and it says whether they can move as one */}
          {selectedNotes.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 border-b border-[#DCEAE4] bg-[#F3F8F6] px-4 py-2.5">
              <span className="text-[12.5px] font-semibold text-[#0D3C32]">
                {formatQuantity(selectedNotes.length)} {selectedNotes.length === 1 ? 'note' : 'notes'} selected
              </span>
              <span className="min-w-0 text-[12px] text-[#3C5B52]">
                {bulkMove?.to
                  ? `All at ${selectedNotes[0].status}, so they can move together.`
                  : bulkMove?.blocked || 'Your role cannot move these.'}
              </span>
              <div className="ml-auto flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  className="h-8 cursor-pointer rounded-[7px] border border-[#C9DED6] bg-white px-3 text-[12.5px] font-medium text-[#0D3C32]"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={exportNotes}
                  className="h-8 cursor-pointer rounded-[7px] border border-[#C9DED6] bg-white px-3 text-[12.5px] font-medium text-[#0D3C32]"
                >
                  Export these
                </button>
                {bulkMove?.to && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={moveSelected}
                    className="h-8 cursor-pointer rounded-[7px] border border-[#15594A] bg-[#15594A] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#124C3F] disabled:opacity-60"
                  >
                    Move {selectedNotes.length === 1 ? 'it' : 'all'} to {bulkMove.to}
                  </button>
                )}
              </div>
            </div>
          )}

          {!loading && rows.length === 0 ? (
            <div className="px-[18px] py-5">
              <EmptyState
                icon={<TruckIcon size={26} strokeWidth={1.5} />}
                title="No dispatch notes"
                description={filtersActive
                  ? 'Nothing matches these filters. Clear them to see the rest.'
                  : 'Nothing in this period.'}
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
            <div ref={tableRef} className="overflow-x-auto">
              <table className="w-full min-w-[990px] table-fixed border-collapse">
                <thead>
                  <tr>
                    <th className={`${headerCell} w-[42px] pl-4`}>
                      <input
                        type="checkbox"
                        aria-label="Select every note on this page"
                        checked={allOnPageSelected}
                        onChange={toggleAllOnPage}
                        className="m-0 h-[15px] w-[15px] cursor-pointer accent-[#15594A]"
                      />
                    </th>
                    <th className={headerCell}>Depot</th>
                    {/* Wide enough for "Blue Ocean Beverages Pvt. Ltd." — the
                        longest name in the data — rather than a truncation. */}
                    <th className={`${headerCell} w-[206px]`}>Company</th>
                    <th className={`${headerCell} w-[104px]`}>Date</th>
                    <th className={`${headerCell} w-[116px]`}>Status</th>
                    <th className={`${headerCell} w-[78px] text-right`}>Cases</th>
                    <th className={`${headerCell} w-[140px]`}>Serial cover</th>
                    <th className={`${headerCell} w-[124px] pr-4`}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <SkeletonTableRows rows={8} columns={COLUMN_COUNT} />
                  ) : (
                    pageRows.map((note) => {
                      const done = linkedCases(note)
                      const total = totalCases(note)
                      const full = done + TOLERANCE >= total
                      const pct = total > 0 ? Math.min(100, (done / total) * 100) : 0
                      const chosen = selected.has(note._id)
                      const tone = statusStyle(note.status)
                      const moves = mayStatus ? movesFor(note, { mayReverse }) : []
                      const statusOpen = openMenu?.id === note._id && openMenu.kind === 'status'
                      const moreOpen = openMenu?.id === note._id && openMenu.kind === 'more'
                      const main = mainAction(note)

                      return (
                        <tr key={note._id} className={chosen ? 'bg-[#F3F8F6]' : 'hover:bg-[#FAFAF8]'}>
                          <td className={`${bodyCell} pl-4`}>
                            <input
                              type="checkbox"
                              aria-label={`Select ${note.deliveryTo?.name || 'this note'}`}
                              checked={chosen}
                              onChange={() => toggleRow(note._id)}
                              className="m-0 h-[15px] w-[15px] cursor-pointer accent-[#15594A]"
                            />
                          </td>
                          <td className={`${bodyCell} font-medium text-[#15181C]`}>
                            <button
                              type="button"
                              onClick={() => setCovering(note)}
                              className="block w-full cursor-pointer truncate border-0 bg-transparent p-0 text-left text-inherit hover:underline"
                            >
                              {note.deliveryTo?.name || 'Depot not set'}
                            </button>
                            <span className="font-numeric mt-0.5 block truncate text-[11px] font-normal text-[#8A919B] tabular-nums">
                              {shortReference(note._id)}
                            </span>
                          </td>
                          <td className={bodyCell}>
                            <span className="block truncate text-[12px] text-[#4A5159]" title={note.company?.name || undefined}>
                              {note.company?.name || '—'}
                            </span>
                          </td>
                          <td className={`${bodyCell} font-numeric text-[12.5px] whitespace-nowrap text-[#4A5159] tabular-nums`}>
                            {formatDate(note.dateDispatched)}
                          </td>

                          {/* The status is the control: the state and the way to
                              change it are one object. */}
                          <td className={`${bodyCell} relative`} data-menu>
                            <button
                              type="button"
                              aria-haspopup={moves.length > 0 ? 'menu' : undefined}
                              aria-expanded={statusOpen}
                              disabled={moves.length === 0}
                              onClick={({ currentTarget }) => setOpenMenu(
                                statusOpen
                                  ? null
                                  : { id: note._id, kind: 'status', anchor: currentTarget.getBoundingClientRect() }
                              )}
                              className={`inline-flex h-6 items-center gap-1.5 rounded-md border py-0 pr-1.5 pl-2 text-[10.5px] font-semibold whitespace-nowrap ${
                                moves.length > 0 ? 'cursor-pointer' : 'cursor-default'
                              }`}
                              style={{
                                color: tone.fg,
                                backgroundColor: tone.bg,
                                borderColor: statusOpen ? 'rgba(21,24,28,.22)' : 'transparent'
                              }}
                            >
                              {tone.label}
                              {moves.length > 0 && <LuChevronDown className="opacity-55" />}
                            </button>

                            {statusOpen && (
                              <AnchoredMenu
                                role="menu"
                                anchor={openMenu.anchor}
                                width={244}
                                onClose={() => setOpenMenu(null)}
                              >
                                <p className="m-0 px-[9px] pt-[7px] pb-[5px] text-[10px] font-semibold tracking-[0.08em] text-[#8A919B] uppercase">
                                  Move this note on
                                </p>
                                {moves.map((move) => (
                                  <React.Fragment key={move.to}>
                                  {move.back && (
                                    <span className="my-1 block h-px bg-[#EDECE8]" />
                                  )}
                                  <button
                                    type="button"
                                    role="menuitem"
                                    disabled={!move.allowed || busy}
                                    onClick={() => {
                                      if (move.back) {
                                        setUndoing({ note, move })
                                        setOpenMenu(null)
                                        return
                                      }
                                      moveNote(note, move.to)
                                    }}
                                    className={`flex w-full items-start gap-2 rounded-[7px] border-0 bg-transparent px-[9px] py-[7px] text-left text-[12.5px] ${
                                      move.allowed
                                        ? 'cursor-pointer font-medium text-[#15181C] hover:bg-[#F2F1ED]'
                                        : 'cursor-not-allowed text-[#A8ADB5]'
                                    }`}
                                  >
                                    {move.back ? (
                                      <LuUndo2 className="mt-[2px] shrink-0" />
                                    ) : (
                                      <span
                                        className="mt-[5px] h-[7px] w-[7px] shrink-0 rounded-full"
                                        style={{ backgroundColor: move.allowed ? statusStyle(move.to).fg : '#D7D6D1' }}
                                      />
                                    )}
                                    <span className="min-w-0">
                                      {move.label}
                                      {!move.allowed && move.reason && (
                                        <span className="mt-px block text-[11px] text-[#A8ADB5]">{move.reason}</span>
                                      )}
                                    </span>
                                  </button>
                                  </React.Fragment>
                                ))}
                              </AnchoredMenu>
                            )}
                          </td>

                          <td className={`${bodyCell} font-numeric text-right font-medium tabular-nums`}>
                            {formatQuantity(total)}
                          </td>

                          {/* A shortfall is a way in to the work */}
                          <td className={bodyCell}>
                            <span className="flex items-center gap-2">
                              <span className="h-[5px] flex-1 overflow-hidden rounded-[3px] bg-[#EFEEEA]">
                                <span
                                  className="block h-full rounded-[3px]"
                                  style={{ width: `${pct}%`, backgroundColor: full ? '#15594A' : '#C07A1E' }}
                                />
                              </span>
                              {full ? (
                                <span className="font-numeric shrink-0 text-[11px] font-medium text-[#5A636D] tabular-nums">Full</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setCovering(note)}
                                  className="font-numeric shrink-0 cursor-pointer border-0 bg-transparent p-0 text-[11px] font-semibold text-[#8A5A00] underline underline-offset-[3px] tabular-nums"
                                >
                                  {formatQuantity(total - done)} left
                                </button>
                              )}
                            </span>
                          </td>

                          <td className={`${bodyCell} relative pr-4 text-right`} data-menu>
                            {/* One press for the thing this note is waiting
                                for; the arrow for everything else. */}
                            <span className="inline-flex">
                              <button
                                type="button"
                                onClick={main.run}
                                className="inline-flex h-[30px] w-[78px] cursor-pointer items-center justify-center rounded-l-[7px] border border-[#D7D6D1] bg-white text-xs font-medium text-[#2A2F36] hover:bg-[#FAFAF8]"
                              >
                                {main.label}
                              </button>
                              <button
                                type="button"
                                aria-haspopup="menu"
                                aria-expanded={moreOpen}
                                aria-label={`More for ${note.deliveryTo?.name || 'this note'}`}
                                onClick={({ currentTarget }) => setOpenMenu(
                                  moreOpen
                                    ? null
                                    : { id: note._id, kind: 'more', anchor: currentTarget.getBoundingClientRect() }
                                )}
                                className="-ml-px inline-flex h-[30px] w-[26px] cursor-pointer items-center justify-center rounded-r-[7px] border border-[#D7D6D1] bg-white text-[#5A636D] hover:bg-[#F2F1ED]"
                              >
                                <LuChevronDown className="text-[13px]" />
                              </button>
                            </span>
                            {moreOpen && (
                              <AnchoredMenu
                                role="menu"
                                anchor={openMenu.anchor}
                                width={188}
                                align="right"
                                onClose={() => setOpenMenu(null)}
                              >
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => { setOpenMenu(null); setCovering(note) }}
                                  className="w-full cursor-pointer rounded-[7px] border-0 bg-transparent px-[9px] py-[7px] text-left text-[12.5px] text-[#15181C] hover:bg-[#F2F1ED]"
                                >
                                  Cover this note
                                </button>
                                <button
                                  type="button"
                                  role="menuitem"
                                  onClick={() => { setOpenMenu(null); setSummarising(note) }}
                                  className="w-full cursor-pointer rounded-[7px] border-0 bg-transparent px-[9px] py-[7px] text-left text-[12.5px] text-[#15181C] hover:bg-[#F2F1ED]"
                                >
                                  Sticker summary
                                </button>
                                {note.status === 'draft' && mayEdit && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => navigate(`/dispatch/${note._id}`)}
                                    className="w-full cursor-pointer rounded-[7px] border-0 bg-transparent px-[9px] py-[7px] text-left text-[12.5px] text-[#15181C] hover:bg-[#F2F1ED]"
                                  >
                                    Open the full page
                                  </button>
                                )}
                                {note.status === 'draft' && mayDelete && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    disabled={busy}
                                    onClick={() => removeNote(note)}
                                    className="w-full cursor-pointer rounded-[7px] border-0 bg-transparent px-[9px] py-[7px] text-left text-[12.5px] text-[#9B2C2C] hover:bg-[#FCEBEA]"
                                  >
                                    Delete this draft
                                  </button>
                                )}
                              </AnchoredMenu>
                            )}
                          </td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading && rows.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EDECE8] px-4 py-2.5">
              <span className="text-xs text-[#5A636D]">
                Rows {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, rows.length)} of {formatQuantity(rows.length)}
              </span>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-[7px] text-xs text-[#5A636D]">
                  Rows per page
                  <select
                    value={pageSize}
                    onChange={({ target }) => setPageSize(Number(target.value))}
                    className="h-[30px] cursor-pointer rounded-[7px] border border-[#E3E2DE] bg-white px-[7px] text-xs"
                  >
                    {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={page === 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="h-[30px] cursor-pointer rounded-[7px] border border-[#E3E2DE] bg-white px-[11px] text-xs text-[#2A2F36] disabled:cursor-not-allowed disabled:bg-[#F2F1ED] disabled:text-[#A8ADB5]"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= pageCount}
                  onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                  className="h-[30px] cursor-pointer rounded-[7px] border border-[#E3E2DE] bg-white px-[11px] text-xs text-[#2A2F36] disabled:cursor-not-allowed disabled:bg-[#F2F1ED] disabled:text-[#A8ADB5]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <Modal isOpen={formOpen} onClose={() => setFormOpen(false)} title="Add Dispatch" styleClass="w-full">
        <AddDispatchForm onSubmitDispatch={handleSubmitDispatch} dispatchDetails={[]} />
      </Modal>

      {/* Covering a note, over the list rather than instead of it. */}
      <Modal
        isOpen={Boolean(covering)}
        onClose={() => setCovering(null)}
        title={`Cover ${covering?.deliveryTo?.name || 'this note'}`}
        styleClass="w-full max-w-[1060px]"
      >
        {covering && (
          <CoverNote
            dispatchId={covering._id}
            onClose={(then) => {
              const note = covering
              setCovering(null)
              if (then === 'load') setVehicleFor(note)
            }}
            onChanged={() => setReloadToken((token) => token + 1)}
          />
        )}
      </Modal>

      {/* What went on the note, laid out to be copied into the portal. */}
      <Modal
        isOpen={Boolean(summarising)}
        onClose={() => setSummarising(null)}
        title="Sticker summary"
        styleClass="w-full max-w-[920px]"
      >
        {summarising && <StickerSummary dispatchId={summarising._id} />}
      </Modal>

      {/* Undoing a stage: what it means, before it happens. */}
      <Modal
        isOpen={Boolean(undoing)}
        onClose={() => setUndoing(null)}
        title="Undo a stage"
        styleClass="w-full max-w-lg"
      >
        {undoing && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="m-0 text-[19px] font-semibold tracking-[-0.018em]">
                Send {undoing.note.deliveryTo?.name || 'this note'} back to{' '}
                {undoing.move.to}?
              </h2>
              <p className="mt-2 mb-0 text-[12.5px] leading-[1.55] text-[#5A636D]">
                {undoing.move.consequence}
              </p>
            </div>
            <p className="m-0 rounded-[10px] border border-[#EDECE8] bg-[#FAFAF8] px-3.5 py-3 text-[12.5px] text-[#3C434B]">
              It moves one stage, from{' '}
              <strong className="font-semibold text-[#15181C]">{undoing.note.status}</strong> to{' '}
              <strong className="font-semibold text-[#15181C]">{undoing.move.to}</strong>. Everything
              already recorded against it stays as it is.
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
                  const { note, move } = undoing
                  setUndoing(null)
                  await moveNote(note, move.to)
                }}
                className="h-9 cursor-pointer rounded-lg border border-[#8A5A00] bg-[#8A5A00] px-3.5 text-[13px] font-semibold text-white hover:bg-[#734B00] disabled:opacity-60"
              >
                Send it back to {undoing.move.to}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(vehicleFor)}
        onClose={() => setVehicleFor(null)}
        title="Enter Vehicle Details"
        styleClass="w-full max-w-md"
      >
        <div className="flex flex-col gap-3.5">
          <p className="m-0 text-[12.5px] text-[#5A636D]">
            Recording the vehicle marks {vehicleFor?.deliveryTo?.name || 'this note'} as loaded.
          </p>
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
              onClick={() => setVehicleFor(null)}
              className="h-9 cursor-pointer rounded-lg border border-[#D7D6D1] bg-white px-3.5 text-[13px] font-medium text-[#2A2F36]"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={submitVehicle}
              className="h-9 cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] px-3.5 text-[13px] font-semibold text-white disabled:opacity-60"
            >
              Submit
            </button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  )
}

export default Dispatch
