import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { LuDownload, LuPlus, LuTrash2, LuX } from 'react-icons/lu'
import DashboardLayout from '../../components/layouts/DashboardLayout'
import Modal from '../../components/Modal/Modal'
import DateRangeModal from '../../components/Modal/DateRangeModal'
import AddEALUsageForm from '../../components/EALUsage/AddEALUsageForm'
import EmptyState from '../../components/Dashboard/EmptyState'
import SerialRange from '../../components/Dashboard/SerialRange'
import StatusPill from '../../components/Dashboard/StatusPill'
import { SkeletonTableRows } from '../../components/Dashboard/Skeleton'
import { ChartIcon } from '../../components/Dashboard/icons'
import { formatQuantity, itemLabel, marketStyle, padSerial } from '../../components/Dashboard/dashboardFormat'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATHS } from '../../utils/apiPaths'
import { downloadCsv } from '../../utils/exportCsv'
import { formatDate, formatDateToYYYYMMDD } from '../../utils/helper'
import { UserContext } from '../../context/userContext'
import { can } from '../../utils/permissions'

const PAGE_SIZES = [25, 50, 100]
const COLUMN_COUNT = 8

const headerCell =
  'bg-[#FAFAF8] px-4 pt-3 pb-[11px] text-left text-[11px] font-semibold tracking-[0.07em] text-[#5A636D] uppercase whitespace-nowrap'
const bodyCell = 'border-t border-[#EDECE8] px-4 py-[13px] text-[13px] text-[#2A2F36]'
const footCell = 'border-t border-[#DEDDD8] bg-[#FAFAF8] px-4 py-[13px] text-[13px] font-semibold'

/**
 * Usage rows carry no status. What they do carry is how many of the cases
 * produced are still waiting to be linked to a dispatch note.
 */
const statusOf = (entry) => {
  const produced = entry.usedQuantityInCases || 0
  const waiting = entry.balanceQuantityInCases || 0
  if (waiting <= 0) return 'dispatched'
  if (waiting >= produced) return 'in-stock'
  return 'part-dispatched'
}

/** Today. The day's own work is what these pages are opened for; a wider
    window is a question you ask, not the one you start with. */
const today = () => {
  const now = new Date()
  return { startDate: now, endDate: now, key: 'selection' }
}

const EALUsage = () => {
  const { user } = useContext(UserContext)
  const mayCreate = can(user, 'usage:create')
  const mayDelete = can(user, 'usage:delete')

  const [openAddEALUsageModal, setOpenAddEALUsageModal] = useState(false)
  const [EALUsageData, setEALUsageData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Company and market narrow the query itself; item is not a filter the API
  // takes, so it is applied to the rows that come back.
  const [dateRange, setDateRange] = useState(today)
  const [company, setCompany] = useState('')
  const [market, setMarket] = useState('')
  const [item, setItem] = useState('')

  const [companies, setCompanies] = useState([])
  const [items, setItems] = useState([])

  const [selected, setSelected] = useState(() => new Set())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const [reloadToken, setReloadToken] = useState(0)
  const [removeCandidate, setRemoveCandidate] = useState(null)
  const [removing, setRemoving] = useState(false)
  const [confirmRange, setConfirmRange] = useState({ serialFrom: '', serialTo: '' })

  const selectAllRef = useRef(null)

  const onApplyDateRange = (selectedRange) => setDateRange(selectedRange)

  // Get all EAL Usage details
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    const fetchEALUsageDetails = async () => {
      try {
        const response = await axiosInstance.get(API_PATHS.EALUSAGE.GET_DATA, {
          params: {
            startDate: formatDateToYYYYMMDD(dateRange.startDate),
            endDate: formatDateToYYYYMMDD(dateRange.endDate),
            ...(company ? { company } : {}),
            ...(market ? { market } : {})
          }
        })
        if (cancelled) return
        setEALUsageData(response.data)
      } catch (err) {
        if (cancelled) return
        console.log('Something went wrong. Please try again.', err)
        setError(err?.response?.data?.message || 'Could not load the usage records.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchEALUsageDetails()
    return () => { cancelled = true }
  }, [dateRange, company, market, reloadToken])

  // Options for the filter bar
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [companyRes, itemRes] = await Promise.all([
          axiosInstance.get(API_PATHS.COMPANY.GET_DATA),
          axiosInstance.get(API_PATHS.ITEM.GET_DATA)
        ])
        setCompanies(companyRes.data?.data || companyRes.data || [])
        setItems(itemRes.data?.data || itemRes.data || [])
      } catch (err) {
        console.log('Could not load the filter options.', err)
      }
    }
    fetchOptions()
  }, [])

  const rows = useMemo(() => {
    const entries = Array.isArray(EALUsageData?.data) ? EALUsageData.data : []
    return entries
      .filter((entry) => !item || entry.item?._id === item)
      .map((entry) => ({ ...entry, status: statusOf(entry) }))
  }, [EALUsageData, item])

  // Totals follow what is on screen, so the footer always agrees with the rows.
  const totals = useMemo(
    () =>
      rows.reduce(
        (sum, row) => ({
          labels: sum.labels + (row.usedQuantity || 0),
          cases: sum.cases + (row.usedQuantityInCases || 0),
          waiting: sum.waiting + (row.balanceQuantityInCases || 0)
        }),
        { labels: 0, cases: 0, waiting: 0 }
      ),
    [rows]
  )

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const filtersActive = Boolean(company || market || item)

  useEffect(() => { setPage(1) }, [dateRange, company, market, item, pageSize])

  // A row that is no longer listed should not stay selected behind the scenes.
  useEffect(() => {
    setSelected((previous) => {
      if (previous.size === 0) return previous
      const visible = new Set(rows.map((row) => row._id))
      const next = new Set([...previous].filter((id) => visible.has(id)))
      return next.size === previous.size ? previous : next
    })
  }, [rows])

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = selected.size > 0 && selected.size < rows.length
    }
  }, [selected, rows.length])

  const toggleRow = (id) =>
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const toggleAll = () =>
    setSelected((previous) =>
      previous.size === rows.length ? new Set() : new Set(rows.map((row) => row._id))
    )

  const selectedRows = rows.filter((row) => selected.has(row._id))
  const selectedCases = selectedRows.reduce((sum, row) => sum + (row.usedQuantityInCases || 0), 0)

  const exportRows = (list, suffix) => {
    if (list.length === 0) return
    downloadCsv(
      `eal-usage-${formatDateToYYYYMMDD(dateRange.startDate)}-to-${formatDateToYYYYMMDD(dateRange.endDate)}${suffix}.csv`,
      [
        { header: 'Company', value: (row) => row.company?.name },
        { header: 'Date used', value: (row) => formatDate(row.dateUsed) },
        { header: 'Market', value: (row) => row.market },
        { header: 'Item', value: (row) => itemLabel(row.item) },
        { header: 'Pack', value: (row) => row.pack?.name },
        { header: 'Prefix', value: (row) => row.prefix },
        { header: 'Serial from', value: (row) => String(row.serialFrom).padStart(10, '0') },
        { header: 'Serial to', value: (row) => String(row.serialTo).padStart(10, '0') },
        { header: 'Labels applied', value: (row) => row.usedQuantity },
        { header: 'Cases produced', value: (row) => row.usedQuantityInCases },
        { header: 'Cases awaiting dispatch', value: (row) => row.balanceQuantityInCases }
      ],
      list
    )
  }

  // Both ends must match the record exactly before the button comes alive.
  const rangeConfirmed = Boolean(
    removeCandidate &&
    confirmRange.serialFrom.trim() !== '' &&
    confirmRange.serialTo.trim() !== '' &&
    Number(confirmRange.serialFrom) === removeCandidate.serialFrom &&
    Number(confirmRange.serialTo) === removeCandidate.serialTo
  )

  const handleRemoveUsage = async () => {
    if (!removeCandidate) return

    try {
      setRemoving(true)
      // The range goes with the request so the server can confirm it is
      // removing the record the page was showing.
      const { data } = await axiosInstance.delete(
        `${API_PATHS.EALUSAGE.DELETE_DATA}/${removeCandidate._id}`,
        { data: { serialFrom: confirmRange.serialFrom.trim(), serialTo: confirmRange.serialTo.trim() } }
      )
      toast.success(
        `Usage removed · ${formatQuantity(data?.data?.labelsReturned ?? removeCandidate.usedQuantity)} labels back in stock`
      )
      setRemoveCandidate(null)
      setConfirmRange({ serialFrom: '', serialTo: '' })
      setReloadToken((token) => token + 1)
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.response?.data?.error || 'Could not remove the usage')
      console.error('Error removing EAL Usage:', err)
    } finally {
      setRemoving(false)
    }
  }

  const clearFilters = () => {
    setCompany('')
    setMarket('')
    setItem('')
  }

  // Handle Add EAL Usage
  const handleAddEALUsage = async (EALUsage) => {
    const {
        company: usageCompany,
        dateUsed,
        market: usageMarket,
        item: usageItem,
        pack,
        usedQuantityInCases,
        prefix,
        serialFrom,
        serialTo,
        usedQuantity
    } = EALUsage;

    if (!usageCompany.trim()) {
      toast.error("Please select a Company");
      return;
    }

    if (!dateUsed.trim()) {
      toast.error("Please enter the date correctly");
      return;
    }

    if (!usageMarket.trim()) {
      toast.error("Please select a Market");
      return;
    }

    if (!usageItem.trim()) {
      toast.error("Please select a Item");
      return;
    }

    if (!pack.trim()) {
      toast.error("Please select a Pack");
      return;
    }

    if (!/^[A-Z]{3}$/.test(prefix.trim())) {
      toast.error("Prefix must be 3 uppercase letters (A-Z)");
      return;
    }

    if (!/^\d{10}$/.test(serialFrom)) {
      toast.error("Serial From must be a 10-digit number");
      return;
    }

    if (!/^\d{10}$/.test(serialTo)) {
      toast.error("Serial To must be a 10-digit number");
      return;
    }

    if (!usedQuantity > 0 || usedQuantity != (serialTo - serialFrom + 1)) {
      toast.error("Quantity Issued and the serial numbers are not matching");
      return;
    }

    if (!usedQuantityInCases > 0) {
      toast.error("Produced Quantity should be greater than zero");
      return;
    }

    try {
      setLoading(true);
      await axiosInstance.post(API_PATHS.EALUSAGE.ADD_DATA, EALUsage)
      setOpenAddEALUsageModal(false);
      setReloadToken((token) => token + 1);
      toast.success("EAL Usage added sucesfully");
    } catch (error) {
      // The old page logged this and left the user staring at an unchanged form.
      toast.error(error?.response?.data?.message || error.message);
      console.error('Error adding EAL Usage:', error.response?.data?.message || error.message);
      setLoading(false);
    }
  }

  return (
    <DashboardLayout activeMenu="EAL Usage">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-[18px]">

        {/* Page header */}
        <div className="flex flex-wrap items-end justify-between gap-3.5">
          <div>
            <h1 className="m-0 text-[25px] font-semibold tracking-[-0.022em]">EAL Usage</h1>
            <p className="mt-1.5 mb-0 text-[13px] text-[#5A636D]">
              Labels applied on the production line, and how much of what they
              produced is still waiting to be dispatched.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => exportRows(rows, '')}
              disabled={rows.length === 0}
              className="flex h-9 cursor-pointer items-center gap-[7px] rounded-lg border border-[#D7D6D1] bg-white px-[13px] text-[13px] font-medium text-[#2A2F36] hover:bg-[#FAFAF8] disabled:cursor-not-allowed disabled:text-[#A8ADB5]"
            >
              <LuDownload />
              Export
            </button>
            {mayCreate && (
              <button
                type="button"
                onClick={() => setOpenAddEALUsageModal(true)}
                className="flex h-9 cursor-pointer items-center gap-[7px] rounded-lg border border-[#15594A] bg-[#15594A] px-3.5 text-[13px] font-medium text-white hover:bg-[#124C3F]"
              >
                <LuPlus />
                Record usage
              </button>
            )}
          </div>
        </div>

        {/* Period summary */}
        <div className="flex flex-wrap overflow-hidden rounded-xl border border-[#E3E2DE] bg-white">
          {[
            { label: 'Entries in period', value: rows.length, unit: rows.length === 1 ? 'record' : 'records' },
            { label: 'Labels applied', value: totals.labels, unit: 'EAL' },
            { label: 'Cases produced', value: totals.cases, unit: 'cases' },
            { label: 'Awaiting dispatch', value: totals.waiting, unit: 'cases' }
          ].map((figure) => (
            <div key={figure.label} className="min-w-0 flex-[1_1_180px] border-l border-[#EDECE8] px-[18px] py-[15px] first:border-l-0">
              <p className="m-0 mb-[7px] text-[11px] font-semibold tracking-[0.07em] text-[#5A636D] uppercase">
                {figure.label}
              </p>
              <p className="m-0 flex items-baseline gap-[7px]">
                <span className="font-numeric text-[21px] font-medium tracking-[-0.015em] tabular-nums">
                  {loading ? '—' : formatQuantity(figure.value)}
                </span>
                <span className="text-[11.5px] text-[#5A636D]">{figure.unit}</span>
              </p>
            </div>
          ))}
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
                  market === option.value
                    ? 'bg-white font-semibold text-[#15181C] shadow-sm'
                    : 'text-[#4A5159]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          <label className="flex h-[34px] max-w-[280px] items-center gap-[7px] rounded-lg border border-[#E3E2DE] px-2.5 text-[12.5px]">
            <span className="shrink-0 text-[#5A636D]">Item</span>
            <select
              value={item}
              onChange={({ target }) => setItem(target.value)}
              className="min-w-0 flex-1 cursor-pointer truncate border-0 bg-transparent font-medium text-[#15181C] outline-none"
            >
              <option value="">All</option>
              {items.map((option) => (
                <option key={option._id} value={option._id}>{option.name}</option>
              ))}
            </select>
          </label>

          <span className="flex-1" />

          {filtersActive && (
            <button
              type="button"
              onClick={clearFilters}
              className="h-[34px] cursor-pointer px-2.5 text-[12.5px] text-[#5A636D] underline underline-offset-[3px]"
            >
              Clear filters
            </button>
          )}
        </div>

        {error && (
          <p role="alert" className="m-0 rounded-[10px] border border-[#F3C9C7] bg-[#FCEBEA] px-4 py-3 text-[13px] text-[#7A2322]">
            {error}
          </p>
        )}

        {/* Table */}
        <section className="overflow-hidden rounded-xl border border-[#E3E2DE] bg-white">
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 bg-[#0F2E27] px-[18px] py-[11px] text-[#DCEAE4]">
              <span className="font-numeric text-[12.5px] font-semibold">
                {selected.size} {selected.size === 1 ? 'entry' : 'entries'} selected
              </span>
              <span className="text-[#4E7A6E]">·</span>
              <span className="font-numeric text-[12.5px] text-[#9DC4B8]">
                {formatQuantity(selectedCases)} cases
              </span>
              <span className="flex-1" />
              <button
                type="button"
                onClick={() => exportRows(selectedRows, '-selection')}
                className="h-[30px] cursor-pointer rounded-[7px] border border-[#2F5E52] px-[11px] text-xs text-[#DCEAE4] hover:bg-[#15594A]"
              >
                Export selection
              </button>
              <button
                type="button"
                aria-label="Clear selection"
                onClick={() => setSelected(new Set())}
                className="flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-[7px] border border-[#2F5E52] hover:bg-[#15594A]"
              >
                <LuX />
              </button>
            </div>
          )}

          {!loading && rows.length === 0 ? (
            <div className="px-[18px] py-5">
              <EmptyState
                icon={<ChartIcon size={26} strokeWidth={1.5} />}
                title="No usage in this period"
                description={
                  filtersActive
                    ? 'Nothing matches these filters. Clear them, or widen the date range.'
                    : 'Widen the date range, or record the labels applied on the line.'
                }
                action={
                  (filtersActive || mayCreate) && (
                    <button
                      type="button"
                      onClick={() => (filtersActive ? clearFilters() : setOpenAddEALUsageModal(true))}
                      className="h-[34px] cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] px-3.5 text-[12.5px] font-medium text-white"
                    >
                      {filtersActive ? 'Clear filters' : 'Record usage'}
                    </button>
                  )
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[956px] table-fixed border-collapse">
                <thead>
                  <tr>
                    <th className={`${headerCell} w-11 pl-[18px]`}>
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        aria-label="Select all rows"
                        checked={rows.length > 0 && selected.size === rows.length}
                        onChange={toggleAll}
                        className="m-0 h-[15px] w-[15px] cursor-pointer accent-[#15594A]"
                      />
                    </th>
                    {/* The date rides with the company, the pack and market
                        with the item, and the label count with the range that
                        defines it. */}
                    <th className={headerCell}>Company</th>
                    <th className={headerCell}>Item</th>
                    <th className={`${headerCell} w-[215px]`}>Serial range</th>
                    <th className={`${headerCell} w-[90px] text-right`}>Cases</th>
                    <th className={`${headerCell} w-[108px] text-right`}>Awaiting</th>
                    <th className={`${headerCell} w-[120px]`}>Status</th>
                    {mayDelete && <th className={`${headerCell} w-[52px] text-right`}>Remove</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <SkeletonTableRows rows={6} columns={mayDelete ? COLUMN_COUNT : COLUMN_COUNT - 1} />
                  ) : (
                    pageRows.map((entry) => {
                      const chosen = selected.has(entry._id)
                      const tone = marketStyle(entry.market)
                      return (
                        <tr
                          key={entry._id}
                          className={chosen ? 'bg-[#F3F8F6]' : 'hover:bg-[#FAFAF8]'}
                        >
                          <td
                            className={`${bodyCell} pl-[18px]`}
                            style={{ borderLeft: `2px solid ${chosen ? '#15594A' : 'transparent'}` }}
                          >
                            <input
                              type="checkbox"
                              aria-label={`Select range ${entry.prefix}${entry.serialFrom}`}
                              checked={chosen}
                              onChange={() => toggleRow(entry._id)}
                              className="m-0 h-[15px] w-[15px] cursor-pointer accent-[#15594A]"
                            />
                          </td>
                          <td className={`${bodyCell} font-medium text-[#15181C]`}>
                            <span className="block truncate" title={entry.company?.name || undefined}>
                              {entry.company?.name || '—'}
                            </span>
                            <span className="font-numeric mt-0.5 block text-[11.5px] font-normal tabular-nums text-[#5A636D]">
                              {formatDate(entry.dateUsed)}
                            </span>
                          </td>
                          <td className={bodyCell}>
                            {/* Item names run long, so they are clipped rather
                                than widening the table. */}
                            <span className="block truncate text-[#15181C]" title={entry.item?.name || undefined}>
                              {itemLabel(entry.item) || '—'}
                            </span>
                            <span className="mt-0.5 flex items-center gap-1.5">
                              {entry.pack?.name && (
                                <span className="truncate text-[11.5px] text-[#5A636D]">{entry.pack.name}</span>
                              )}
                              <span
                                className="inline-block shrink-0 rounded-[5px] px-1.5 py-px text-[10.5px] font-semibold"
                                style={{ color: tone.fg, backgroundColor: tone.bg }}
                              >
                                {tone.label}
                              </span>
                            </span>
                          </td>
                          <td className={bodyCell}>
                            <SerialRange
                              compact
                              prefix={entry.prefix}
                              serialFrom={entry.serialFrom}
                              serialTo={entry.serialTo}
                            />
                            <span className="font-numeric mt-0.5 block text-[11px] tabular-nums text-[#5A636D]">
                              {formatQuantity(entry.usedQuantity)} labels
                            </span>
                          </td>
                          <td className={`${bodyCell} font-numeric text-right tabular-nums`}>
                            {formatQuantity(entry.usedQuantityInCases)}
                          </td>
                          <td className={`${bodyCell} font-numeric text-right font-semibold text-[#15181C] tabular-nums`}>
                            {formatQuantity(entry.balanceQuantityInCases)}
                          </td>
                          <td className={bodyCell}>
                            <StatusPill status={entry.status} />
                          </td>
                          {mayDelete && (
                            <td className={`${bodyCell} text-right`}>
                              {/* Only a run with nothing dispatched can go, and
                                  removing it hands the labels back to its
                                  issuance. The API checks this too. */}
                              <button
                                type="button"
                                disabled={entry.status !== 'in-stock'}
                                onClick={() => { setRemoveCandidate(entry); setConfirmRange({ serialFrom: '', serialTo: '' }) }}
                                aria-label={`Remove usage ${entry.prefix}${entry.serialFrom}`}
                                title={
                                  entry.status === 'in-stock'
                                    ? 'Remove this production run and return its labels to stock'
                                    : 'Some of these cases have been dispatched, so this cannot be removed'
                                }
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#5A636D] enabled:cursor-pointer enabled:hover:bg-[#FCEBEA] enabled:hover:text-[#9B2C2C] disabled:cursor-not-allowed disabled:text-[#D7D6D1]"
                              >
                                <LuTrash2 />
                              </button>
                            </td>
                          )}
                        </tr>
                      )
                    })
                  )}
                </tbody>
                {!loading && rows.length > 0 && (
                  <tfoot>
                    <tr>
                      <td className={footCell} colSpan={4}>
                        Total · {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
                        <span className="font-numeric ml-2 font-normal text-[#5A636D] tabular-nums">
                          {formatQuantity(totals.labels)} labels
                        </span>
                      </td>
                      <td className={`${footCell} font-numeric text-right tabular-nums`}>
                        {formatQuantity(totals.cases)}
                      </td>
                      <td className={`${footCell} font-numeric text-right tabular-nums`}>
                        {formatQuantity(totals.waiting)}
                      </td>
                      <td className={footCell} colSpan={mayDelete ? 2 : 1} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}

          {!loading && rows.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EDECE8] px-[18px] py-3">
              <span className="text-xs text-[#5A636D]">
                Rows {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, rows.length)} of{' '}
                {rows.length}
              </span>
              <div className="flex items-center gap-1.5">
                <label className="mr-2 flex items-center gap-[7px] text-xs text-[#5A636D]">
                  Rows per page
                  <select
                    value={pageSize}
                    onChange={({ target }) => setPageSize(Number(target.value))}
                    className="h-[30px] cursor-pointer rounded-[7px] border border-[#D7D6D1] bg-white px-1.5 text-xs"
                  >
                    {PAGE_SIZES.map((size) => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage === 1}
                  className="h-[30px] cursor-pointer rounded-[7px] border border-[#D7D6D1] bg-white px-[11px] text-xs text-[#2A2F36] disabled:cursor-not-allowed disabled:text-[#A8ADB5]"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(pageCount, value + 1))}
                  disabled={currentPage === pageCount}
                  className="h-[30px] cursor-pointer rounded-[7px] border border-[#D7D6D1] bg-white px-[11px] text-xs text-[#2A2F36] disabled:cursor-not-allowed disabled:text-[#A8ADB5]"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <Modal
        isOpen={Boolean(removeCandidate)}
        onClose={() => { setRemoveCandidate(null); setConfirmRange({ serialFrom: '', serialTo: '' }) }}
        title="Remove EAL usage"
        styleClass="w-full max-w-lg"
      >
        {removeCandidate && (
          <div className="font-ui flex flex-col gap-4">
            <div>
              <h2 className="m-0 text-[19px] font-semibold tracking-[-0.018em]">Remove this production run?</h2>
              <p className="mt-1.5 mb-0 text-[12.5px] text-[#5A636D]">
                None of these cases has been dispatched. Removing the run puts its
                labels back on the issuance they came from. This cannot be undone.
              </p>
            </div>

            <div className="rounded-lg border border-[#E3E2DE] bg-[#FAFAF8] px-3.5 py-3">
              <SerialRange
                compact
                prefix={removeCandidate.prefix}
                serialFrom={removeCandidate.serialFrom}
                serialTo={removeCandidate.serialTo}
              />
              <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {[
                  ['Item', itemLabel(removeCandidate.item)],
                  ['Date used', formatDate(removeCandidate.dateUsed)],
                  ['Cases produced', formatQuantity(removeCandidate.usedQuantityInCases)],
                  ['Labels returned', formatQuantity(removeCandidate.usedQuantity)]
                ].map(([label, value]) => (
                  <div key={label} className="flex items-baseline justify-between gap-2">
                    <dt className="shrink-0 text-[11.5px] text-[#5A636D]">{label}</dt>
                    <dd className="font-numeric m-0 truncate text-xs tabular-nums text-[#15181C]">{value || '—'}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div>
              <p className="m-0 mb-2.5 text-[12.5px] text-[#3C434B]">
                Type the serial range to confirm. It is checked here and again by
                the server before anything is removed.
              </p>
              <div className="flex flex-wrap gap-3">
                {[
                  ['serialFrom', 'Serial from', removeCandidate.serialFrom],
                  ['serialTo', 'Serial to', removeCandidate.serialTo]
                ].map(([key, label, expected]) => {
                  const typed = confirmRange[key].trim()
                  const matches = typed !== '' && Number(typed) === expected
                  return (
                    <div key={key} className="min-w-0 flex-[1_1_170px]">
                      <label htmlFor={`confirm-${key}`} className="mb-1.5 block text-xs font-medium text-[#3C434B]">
                        {label}
                      </label>
                      <input
                        id={`confirm-${key}`}
                        value={confirmRange[key]}
                        onChange={({ target }) =>
                          setConfirmRange((previous) => ({ ...previous, [key]: target.value }))
                        }
                        inputMode="numeric"
                        placeholder={padSerial(expected)}
                        className="font-numeric h-[38px] w-full rounded-lg border bg-white px-[11px] text-[13.5px] tabular-nums text-[#15181C] outline-none"
                        style={{
                          borderColor: typed === '' ? '#D7D6D1' : matches ? '#15594A' : '#9B2C2C'
                        }}
                      />
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => { setRemoveCandidate(null); setConfirmRange({ serialFrom: '', serialTo: '' }) }}
                className="h-9 cursor-pointer rounded-lg border border-[#D7D6D1] bg-white px-3.5 text-[13px] font-medium text-[#2A2F36]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={removing || !rangeConfirmed}
                onClick={handleRemoveUsage}
                className="h-9 cursor-pointer rounded-lg border border-[#9B2C2C] bg-[#9B2C2C] px-3.5 text-[13px] font-semibold text-white hover:bg-[#872626] disabled:cursor-not-allowed disabled:border-[#E3E2DE] disabled:bg-[#F2F1ED] disabled:text-[#A8ADB5]"
              >
                {removing ? 'Removing…' : 'Remove and return labels'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={openAddEALUsageModal}
        onClose={() => setOpenAddEALUsageModal(false)}
        title="Add EAL Usage"
        styleClass='w-full'
      >
        <AddEALUsageForm onAddEALUsage={handleAddEALUsage} />
      </Modal>
    </DashboardLayout>
  )
}

export default EALUsage
