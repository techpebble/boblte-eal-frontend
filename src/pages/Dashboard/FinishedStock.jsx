import React, { useEffect, useMemo, useState } from 'react'
import { LuChevronRight, LuDownload } from 'react-icons/lu'
import DashboardLayout from '../../components/layouts/DashboardLayout'
import EmptyState from '../../components/Dashboard/EmptyState'
import SerialRange from '../../components/Dashboard/SerialRange'
import { SkeletonTableRows } from '../../components/Dashboard/Skeleton'
import { InboxIcon } from '../../components/Dashboard/icons'
import { formatQuantity, marketStyle } from '../../components/Dashboard/dashboardFormat'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATHS } from '../../utils/apiPaths'
import { downloadCsv } from '../../utils/exportCsv'
import { formatDate, formatDateToYYYYMMDD } from '../../utils/helper'

const COLUMN_COUNT = 8

const headerCell =
    'bg-[#FAFAF8] px-4 pt-3 pb-[11px] text-left text-[11px] font-semibold tracking-[0.07em] text-[#5A636D] uppercase whitespace-nowrap'
const bodyCell = 'border-t border-[#EDECE8] px-4 py-[13px] text-[13px] text-[#2A2F36]'
const groupCell = 'border-t border-[#DEDDD8] bg-[#F7F7F4] px-4 py-[13px] text-[13px]'
const footCell = 'border-t border-[#DEDDD8] bg-[#FAFAF8] px-4 py-[13px] text-[13px] font-semibold'

const DAY = 86400000
const ageInDays = (date) => Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / DAY))

const FinishedStock = () => {
    const [finishedStockData, setFinishedStockData] = useState(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [fetchedAt, setFetchedAt] = useState(null)

    const [groupBy, setGroupBy] = useState('company')
    const [market, setMarket] = useState('')
    const [expanded, setExpanded] = useState(() => new Set())

    // Get all EAL Usage details that still have cases left to dispatch
    useEffect(() => {
        let cancelled = false
        setLoading(true)
        setError(null)

        const fetchEALUsageDetails = async () => {
            try {
                // type=balance keeps only what has not been dispatched yet, so
                // the page never has to filter cleared stock out itself.
                const response = await axiosInstance.get(API_PATHS.EALUSAGE.GET_DATA, {
                    params: { type: 'balance', ...(market ? { market } : {}) }
                })
                if (cancelled) return
                setFinishedStockData(response.data)
                setFetchedAt(new Date())
            } catch (err) {
                if (cancelled) return
                console.log('Something went wrong. Please try again.', err)
                setError(err?.response?.data?.message || 'Could not load the finished stock.')
            } finally {
                if (!cancelled) setLoading(false)
            }
        }

        fetchEALUsageDetails()
        return () => { cancelled = true }
    }, [market])

    const entries = useMemo(
        () => (Array.isArray(finishedStockData?.data) ? finishedStockData.data : []),
        [finishedStockData]
    )

    /**
     * One leaf per company + item + market. The old page keyed on company and
     * item alone, which quietly added local and export stock of the same item
     * together.
     */
    const leaves = useMemo(() => {
        const result = new Map()

        entries.forEach((entry) => {
            const companyId = entry.company?._id || 'unknown'
            const itemId = entry.item?._id || 'unknown'
            const key = `${companyId}-${itemId}-${entry.market}`

            if (!result.has(key)) {
                result.set(key, {
                    key,
                    company: entry.company,
                    item: entry.item,
                    market: entry.market,
                    cases: 0,
                    labels: 0,
                    producedCases: 0,
                    ranges: []
                })
            }

            const leaf = result.get(key)
            leaf.cases += entry.balanceQuantityInCases || 0
            leaf.labels += entry.balanceQuantity || 0
            leaf.producedCases += entry.usedQuantityInCases || 0
            leaf.ranges.push(entry)
        })

        return [...result.values()].map((leaf) => ({
            ...leaf,
            oldestDays: leaf.ranges.reduce(
                (oldest, entry) => Math.max(oldest, ageInDays(entry.dateUsed)),
                0
            ),
            ranges: [...leaf.ranges].sort((a, b) => new Date(a.dateUsed) - new Date(b.dateUsed))
        }))
    }, [entries])

    const groups = useMemo(() => {
        const result = new Map()

        leaves.forEach((leaf) => {
            const head = groupBy === 'company' ? leaf.company : leaf.item
            const id = head?._id || 'unknown'
            if (!result.has(id)) {
                result.set(id, { id, name: head?.name || '—', cases: 0, labels: 0, leaves: [] })
            }
            const group = result.get(id)
            group.cases += leaf.cases
            group.labels += leaf.labels
            group.leaves.push(leaf)
        })

        return [...result.values()]
            .map((group) => ({
                ...group,
                leaves: [...group.leaves].sort((a, b) => b.cases - a.cases)
            }))
            .sort((a, b) => b.cases - a.cases)
    }, [leaves, groupBy])

    const totals = useMemo(
        () =>
            leaves.reduce(
                (sum, leaf) => ({
                    cases: sum.cases + leaf.cases,
                    labels: sum.labels + leaf.labels,
                    ranges: sum.ranges + leaf.ranges.length,
                    oldest: Math.max(sum.oldest, leaf.oldestDays)
                }),
                { cases: 0, labels: 0, ranges: 0, oldest: 0 }
            ),
        [leaves]
    )

    const toggle = (key) =>
        setExpanded((previous) => {
            const next = new Set(previous)
            if (next.has(key)) next.delete(key)
            else next.add(key)
            return next
        })

    const exportStock = () => {
        if (entries.length === 0) return
        downloadCsv(
            `finished-stock-${formatDateToYYYYMMDD(new Date())}.csv`,
            [
                { header: 'Company', value: (row) => row.company?.name },
                { header: 'Item', value: (row) => row.item?.name },
                { header: 'Pack', value: (row) => row.pack?.name },
                { header: 'Market', value: (row) => row.market },
                { header: 'Date used', value: (row) => formatDate(row.dateUsed) },
                { header: 'Prefix', value: (row) => row.prefix },
                { header: 'Serial from', value: (row) => String(row.serialFrom).padStart(10, '0') },
                { header: 'Serial to', value: (row) => String(row.serialTo).padStart(10, '0') },
                { header: 'Cases produced', value: (row) => row.usedQuantityInCases },
                { header: 'Cases awaiting dispatch', value: (row) => row.balanceQuantityInCases },
                { header: 'Age in days', value: (row) => ageInDays(row.dateUsed) }
            ],
            entries
        )
    }

    const tiles = [
        { label: 'Cases awaiting dispatch', value: totals.cases, unit: 'cases' },
        { label: 'Labels held in stock', value: totals.labels, unit: 'EAL' },
        { label: 'Open production runs', value: totals.ranges, unit: totals.ranges === 1 ? 'entry' : 'entries' },
        { label: 'Oldest run', value: totals.oldest, unit: 'days', warn: totals.oldest > 30 }
    ]

    return (
        <DashboardLayout activeMenu="Finished Stock">
            <div className="mx-auto flex max-w-[1400px] flex-col gap-[18px]">

                {/* Page header */}
                <div className="flex flex-wrap items-end justify-between gap-3.5">
                    <div>
                        <h1 className="m-0 text-[25px] font-semibold tracking-[-0.022em]">Finished Stock</h1>
                        <p className="mt-1.5 mb-0 text-[13px] text-[#5A636D]">
                            Cases produced and labelled but not yet linked to a dispatch
                            {fetchedAt && (
                                <>
                                    {' · as at '}
                                    <span className="font-numeric tabular-nums">
                                        {formatDate(fetchedAt)},{' '}
                                        {fetchedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </>
                            )}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={exportStock}
                        disabled={entries.length === 0}
                        className="flex h-9 cursor-pointer items-center gap-[7px] rounded-lg border border-[#D7D6D1] bg-white px-[13px] text-[13px] font-medium text-[#2A2F36] hover:bg-[#FAFAF8] disabled:cursor-not-allowed disabled:text-[#A8ADB5]"
                    >
                        <LuDownload />
                        Export
                    </button>
                </div>

                {/* Tiles */}
                <div className="flex flex-wrap gap-3.5">
                    {tiles.map((tile) => (
                        <div
                            key={tile.label}
                            className="min-w-0 flex-[1_1_220px] rounded-xl border border-[#E3E2DE] bg-white px-[18px] py-4"
                        >
                            <p className="m-0 mb-2 text-[11px] font-semibold tracking-[0.07em] text-[#5A636D] uppercase">
                                {tile.label}
                            </p>
                            <p className="m-0 flex items-baseline gap-[7px]">
                                <span
                                    className="font-numeric text-[26px] font-medium tracking-[-0.02em] tabular-nums"
                                    style={tile.warn ? { color: '#8A5A00' } : undefined}
                                >
                                    {loading ? '—' : formatQuantity(tile.value)}
                                </span>
                                <span className="text-xs text-[#5A636D]">{tile.unit}</span>
                            </p>
                        </div>
                    ))}
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-2.5">
                    <div role="group" aria-label="Group stock by" className="flex h-[34px] gap-0.5 rounded-[9px] border border-[#E3E2DE] bg-white p-[3px]">
                        {[
                            { value: 'company', label: 'By company' },
                            { value: 'item', label: 'By item' }
                        ].map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                aria-pressed={groupBy === option.value}
                                onClick={() => setGroupBy(option.value)}
                                className={`cursor-pointer rounded-md px-[13px] text-[12.5px] ${
                                    groupBy === option.value
                                        ? 'bg-[#15181C] font-semibold text-white'
                                        : 'text-[#4A5159]'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    <div role="group" aria-label="Market" className="flex h-[34px] gap-0.5 rounded-[9px] border border-[#E3E2DE] bg-white p-[3px]">
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
                                        ? 'bg-[#F2F1ED] font-semibold text-[#15181C]'
                                        : 'text-[#4A5159]'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    <span className="flex-1" />
                    <span className="text-xs text-[#5A636D]">
                        A run clears from here once its cases are linked to a dispatch
                    </span>
                </div>

                {error && (
                    <p role="alert" className="m-0 rounded-[10px] border border-[#F3C9C7] bg-[#FCEBEA] px-4 py-3 text-[13px] text-[#7A2322]">
                        {error}
                    </p>
                )}

                {/* Grouped table */}
                <section className="overflow-hidden rounded-xl border border-[#E3E2DE] bg-white">
                    {!loading && leaves.length === 0 ? (
                        <div className="px-[18px] py-5">
                            <EmptyState
                                icon={<InboxIcon size={26} strokeWidth={1.5} />}
                                title="Nothing waiting to be dispatched"
                                description={
                                    market
                                        ? 'Nothing is held for this market. Try All.'
                                        : 'Every case produced has been linked to a dispatch note.'
                                }
                            />
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[1000px] border-collapse">
                                <thead>
                                    <tr>
                                        <th className={`${headerCell} w-[38px] pl-[18px]`} />
                                        <th className={headerCell}>
                                            {groupBy === 'company' ? 'Company · item' : 'Item · company'}
                                        </th>
                                        <th className={headerCell}>Market</th>
                                        <th className={`${headerCell} text-right`}>Cases waiting</th>
                                        <th className={`${headerCell} text-right`}>Labels</th>
                                        <th className={`${headerCell} w-[200px]`}>Dispatched so far</th>
                                        <th className={`${headerCell} text-right`}>Oldest run</th>
                                        <th className={`${headerCell} text-right`}>Runs</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <SkeletonTableRows rows={6} columns={COLUMN_COUNT} />
                                    ) : (
                                        groups.map((group) => (
                                            <React.Fragment key={group.id}>
                                                <tr>
                                                    <td className={`${groupCell} pl-[18px]`} />
                                                    <td className={`${groupCell} font-semibold text-[#15181C]`}>
                                                        <span className="block max-w-[420px] truncate" title={group.name}>
                                                            {group.name}
                                                        </span>
                                                    </td>
                                                    <td className={groupCell} />
                                                    <td className={`${groupCell} font-numeric text-right font-semibold tabular-nums`}>
                                                        {formatQuantity(group.cases)}
                                                    </td>
                                                    <td className={`${groupCell} font-numeric text-right font-semibold tabular-nums`}>
                                                        {formatQuantity(group.labels)}
                                                    </td>
                                                    <td className={groupCell} colSpan={3} />
                                                </tr>

                                                {group.leaves.map((leaf) => {
                                                    const open = expanded.has(leaf.key)
                                                    const tone = marketStyle(leaf.market)
                                                    const dispatched = leaf.producedCases - leaf.cases
                                                    const pct = leaf.producedCases > 0
                                                        ? (dispatched / leaf.producedCases) * 100
                                                        : 0
                                                    const name = groupBy === 'company' ? leaf.item?.name : leaf.company?.name

                                                    return (
                                                        <React.Fragment key={leaf.key}>
                                                            <tr className="hover:bg-[#FAFAF8]">
                                                                <td className={`${bodyCell} pl-[18px]`}>
                                                                    <button
                                                                        type="button"
                                                                        aria-expanded={open}
                                                                        aria-label={`${open ? 'Hide' : 'Show'} production runs for ${name || 'this row'}`}
                                                                        onClick={() => toggle(leaf.key)}
                                                                        className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-[5px] text-[#8A919B] hover:bg-[#F2F1ED]"
                                                                    >
                                                                        <LuChevronRight
                                                                            className="transition-transform"
                                                                            style={open ? { transform: 'rotate(90deg)' } : undefined}
                                                                        />
                                                                    </button>
                                                                </td>
                                                                <td className={`${bodyCell} pl-1`}>
                                                                    <span className="block max-w-[380px] truncate" title={name || undefined}>
                                                                        {name || '—'}
                                                                    </span>
                                                                </td>
                                                                <td className={bodyCell}>
                                                                    <span
                                                                        className="inline-block rounded-[5px] px-2 py-[3px] text-[11px] font-semibold"
                                                                        style={{ color: tone.fg, backgroundColor: tone.bg }}
                                                                    >
                                                                        {tone.label}
                                                                    </span>
                                                                </td>
                                                                <td className={`${bodyCell} font-numeric text-right font-medium text-[#15181C] tabular-nums`}>
                                                                    {formatQuantity(leaf.cases)}
                                                                </td>
                                                                <td className={`${bodyCell} font-numeric text-right text-[#5A636D] tabular-nums`}>
                                                                    {formatQuantity(leaf.labels)}
                                                                </td>
                                                                <td className={bodyCell}>
                                                                    <span className="flex items-center gap-[9px]">
                                                                        <span className="h-[7px] flex-1 overflow-hidden rounded bg-[#EFEEEA]">
                                                                            <span
                                                                                className="block h-full rounded bg-[#9DC4B8]"
                                                                                style={{ width: `${pct}%` }}
                                                                            />
                                                                        </span>
                                                                        <span className="font-numeric w-[38px] text-right text-[11px] text-[#5A636D] tabular-nums">
                                                                            {Math.round(pct)}%
                                                                        </span>
                                                                    </span>
                                                                </td>
                                                                <td
                                                                    className={`${bodyCell} font-numeric text-right tabular-nums`}
                                                                    style={leaf.oldestDays > 30 ? { color: '#8A5A00' } : undefined}
                                                                >
                                                                    {leaf.oldestDays}d
                                                                </td>
                                                                <td className={`${bodyCell} font-numeric text-right text-[#5A636D] tabular-nums`}>
                                                                    {leaf.ranges.length}
                                                                </td>
                                                            </tr>

                                                            {open && (
                                                                <tr>
                                                                    <td colSpan={COLUMN_COUNT} className="bg-[#FBFBF9] p-0">
                                                                        <div className="py-[14px] pr-[18px] pl-[60px]">
                                                                            <p className="m-0 mb-2.5 text-[11px] font-semibold tracking-[0.08em] text-[#5A636D] uppercase">
                                                                                Production runs still holding stock
                                                                            </p>
                                                                            <table className="w-full border-collapse overflow-hidden rounded-[9px] border border-[#E3E2DE] bg-white">
                                                                                <thead>
                                                                                    <tr>
                                                                                        <th className={`${headerCell} px-3.5`}>Used</th>
                                                                                        <th className={`${headerCell} px-3.5`}>Serial range</th>
                                                                                        <th className={`${headerCell} px-3.5 text-right`}>Produced</th>
                                                                                        <th className={`${headerCell} px-3.5 text-right`}>Waiting</th>
                                                                                        <th className={`${headerCell} w-[180px] px-3.5`}>Dispatched</th>
                                                                                        <th className={`${headerCell} px-3.5 text-right`}>Age</th>
                                                                                    </tr>
                                                                                </thead>
                                                                                <tbody>
                                                                                    {leaf.ranges.map((entry) => {
                                                                                        const produced = entry.usedQuantityInCases || 0
                                                                                        const waiting = entry.balanceQuantityInCases || 0
                                                                                        const done = produced > 0 ? ((produced - waiting) / produced) * 100 : 0
                                                                                        return (
                                                                                            <tr key={entry._id}>
                                                                                                <td className={`${bodyCell} font-numeric px-3.5 whitespace-nowrap tabular-nums`}>
                                                                                                    {formatDate(entry.dateUsed)}
                                                                                                </td>
                                                                                                <td className={`${bodyCell} px-3.5`}>
                                                                                                    <SerialRange
                                                                                                        prefix={entry.prefix}
                                                                                                        serialFrom={entry.serialFrom}
                                                                                                        serialTo={entry.serialTo}
                                                                                                    />
                                                                                                </td>
                                                                                                <td className={`${bodyCell} font-numeric px-3.5 text-right text-[#5A636D] tabular-nums`}>
                                                                                                    {formatQuantity(produced)}
                                                                                                </td>
                                                                                                <td className={`${bodyCell} font-numeric px-3.5 text-right font-semibold tabular-nums`}>
                                                                                                    {formatQuantity(waiting)}
                                                                                                </td>
                                                                                                <td className={`${bodyCell} px-3.5`}>
                                                                                                    <span className="flex items-center gap-[9px]">
                                                                                                        <span className="h-1.5 flex-1 overflow-hidden rounded-[3px] bg-[#EFEEEA]">
                                                                                                            <span
                                                                                                                className="block h-full rounded-[3px] bg-[#9DC4B8]"
                                                                                                                style={{ width: `${done}%` }}
                                                                                                            />
                                                                                                        </span>
                                                                                                        <span className="font-numeric text-[11px] text-[#5A636D] tabular-nums">
                                                                                                            {Math.round(done)}%
                                                                                                        </span>
                                                                                                    </span>
                                                                                                </td>
                                                                                                <td className={`${bodyCell} font-numeric px-3.5 text-right text-[#5A636D] tabular-nums`}>
                                                                                                    {ageInDays(entry.dateUsed)}d
                                                                                                </td>
                                                                                            </tr>
                                                                                        )
                                                                                    })}
                                                                                </tbody>
                                                                            </table>
                                                                        </div>
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </React.Fragment>
                                                    )
                                                })}
                                            </React.Fragment>
                                        ))
                                    )}
                                </tbody>
                                {!loading && leaves.length > 0 && (
                                    <tfoot>
                                        <tr>
                                            <td className={footCell} colSpan={3}>
                                                All {groupBy === 'company' ? 'companies' : 'items'}
                                            </td>
                                            <td className={`${footCell} font-numeric text-right tabular-nums`}>
                                                {formatQuantity(totals.cases)}
                                            </td>
                                            <td className={`${footCell} font-numeric text-right tabular-nums`}>
                                                {formatQuantity(totals.labels)}
                                            </td>
                                            <td className={footCell} colSpan={2} />
                                            <td className={`${footCell} font-numeric text-right tabular-nums`}>
                                                {totals.ranges}
                                            </td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    )}
                </section>
            </div>
        </DashboardLayout>
    )
}

export default FinishedStock
