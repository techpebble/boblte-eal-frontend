import React, { useEffect, useMemo, useState } from 'react'
import { LuPrinter, LuSearch } from 'react-icons/lu'
import DashboardLayout from '../../components/layouts/DashboardLayout'
import EmptyState from '../../components/Dashboard/EmptyState'
import SerialRange from '../../components/Dashboard/SerialRange'
import StatusPill from '../../components/Dashboard/StatusPill'
import { SkeletonLines } from '../../components/Dashboard/Skeleton'
import { TagIcon } from '../../components/Dashboard/icons'
import {
    formatQuantity,
    marketStyle,
    padSerial,
    shortReference
} from '../../components/Dashboard/dashboardFormat'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATHS } from '../../utils/apiPaths'
import { formatDate } from '../../utils/helper'

const nameOf = (ref) => (ref && typeof ref === 'object' ? ref.name : null)

const FindEAL = () => {
    const [ealNumber, setEalNumber] = useState('')
    const [company, setCompany] = useState('')
    const [market, setMarket] = useState('')
    const [pack, setPack] = useState('')

    const [companies, setCompanies] = useState([])
    const [packs, setPacks] = useState([])

    const [loading, setLoading] = useState(false)
    const [trace, setTrace] = useState(null)
    const [notFound, setNotFound] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        const fetchOptions = async () => {
            try {
                const [companyRes, packRes] = await Promise.all([
                    axiosInstance.get(API_PATHS.COMPANY.GET_DATA),
                    axiosInstance.get(API_PATHS.PACK.GET_DATA)
                ])
                setCompanies(companyRes.data?.data || companyRes.data || [])
                setPacks(packRes.data?.data || packRes.data || [])
            } catch (err) {
                console.error('Could not load the filter options.', err)
            }
        }
        fetchOptions()
    }, [])

    const reset = () => {
        setEalNumber('')
        setCompany('')
        setMarket('')
        setPack('')
        setTrace(null)
        setNotFound(false)
        setError(null)
    }

    const onSearch = async (event) => {
        if (event) event.preventDefault()

        if (!ealNumber.trim()) {
            setError('Enter an EAL serial to trace.')
            return
        }

        setLoading(true)
        setError(null)
        setNotFound(false)
        setTrace(null)

        try {
            const res = await axiosInstance.get(API_PATHS.EALUSAGE.FIND, {
                params: {
                    ealNumber: ealNumber.trim(),
                    ...(company ? { company } : {}),
                    ...(market ? { market } : {}),
                    ...(pack ? { pack } : {})
                }
            })
            setTrace(res.data?.respondData || null)
        } catch (err) {
            console.error('FindEAL error', err)
            if (err.response?.status === 404) setNotFound(true)
            else setError(err.response?.data?.error || err.message || 'Could not trace that label.')
        } finally {
            setLoading(false)
        }
    }

    /**
     * The API answers with four parallel lists. This folds them into the one
     * story the page tells: where the label came from and where it went.
     */
    const story = useMemo(() => {
        if (!trace) return null

        const issuance = trace.issuance?.[0] || null
        const usage = trace.usage?.[0] || null
        const link = trace.ealDispatches?.[0] || null
        const note = trace.dispatches?.[0] || null

        const steps = []
        if (issuance) {
            steps.push({
                title: 'Issued by excise',
                date: issuance.dateIssued,
                detail: `${formatQuantity(issuance.issuedQuantity)} labels released${
                    nameOf(issuance.company) ? ` to ${nameOf(issuance.company)}` : ''
                }.`,
                user: issuance.createdBy?.fullName,
                tone: '#15594A'
            })
        }
        if (usage) {
            steps.push({
                title: 'Applied in production',
                date: usage.dateUsed,
                detail: `${formatQuantity(usage.usedQuantity)} labels applied${
                    nameOf(usage.item) ? ` to ${nameOf(usage.item)}` : ''
                }, making ${formatQuantity(usage.usedQuantityInCases)} cases.`,
                user: usage.createdBy?.fullName,
                tone: '#15594A'
            })
        }
        if (link) {
            steps.push({
                title: 'Linked to a dispatch',
                date: link.dateDispatched,
                detail: note
                    ? `${shortReference(note._id)} · ${nameOf(note.deliveryTo) || 'depot not recorded'}.`
                    : 'Attached to a dispatch note.',
                user: link.createdBy?.fullName,
                tone: '#1D4E89'
            })
        }
        if (note?.status === 'delivered') {
            steps.push({
                title: 'Received at depot',
                date: note.dateDispatched,
                detail: `${nameOf(note.deliveryTo) || 'Depot'} confirmed delivery.`,
                tone: '#1D4E89'
            })
        }

        const status = note?.status === 'delivered'
            ? 'delivered'
            : link
                ? 'linked'
                : usage
                    ? 'in-stock'
                    : 'unused'

        return {
            issuance,
            usage,
            link,
            note,
            steps,
            status,
            facts: [
                { k: 'Company', v: nameOf(issuance?.company) },
                { k: 'Pack', v: nameOf(issuance?.pack) },
                { k: 'Market', v: issuance?.market },
                { k: 'Issued on', v: issuance ? formatDate(issuance.dateIssued) : null },
                { k: 'Item', v: nameOf(usage?.item) },
                { k: 'Applied on', v: usage ? formatDate(usage.dateUsed) : null },
                { k: 'Dispatch note', v: note ? shortReference(note._id) : null },
                { k: 'Depot', v: nameOf(note?.deliveryTo) }
            ]
        }
    }, [trace])

    return (
        <DashboardLayout activeMenu="Find EAL">
            <div className="mx-auto flex max-w-[1400px] flex-col gap-[18px]">

                <div className="print-hide">
                    <h1 className="m-0 text-[25px] font-semibold tracking-[-0.022em]">Find EAL</h1>
                    <p className="mt-1.5 mb-0 text-[13px] text-[#5A636D]">
                        Trace one label from the excise issuance through production to the
                        depot that received it.
                    </p>
                </div>

                {/* Search */}
                <section className="print-hide rounded-xl border border-[#E3E2DE] bg-white px-[22px] py-5">
                    <form onSubmit={onSearch} className="flex flex-wrap items-end gap-3">
                        <div className="min-w-0 flex-[1_1_360px]">
                            <label htmlFor="eal" className="mb-[7px] block text-xs font-medium text-[#3C434B]">
                                EAL serial <span className="text-[#9B2C2C]">*</span>
                            </label>
                            <div className="flex h-12 items-center gap-2.5 rounded-[10px] border border-[#D7D6D1] bg-white px-3.5 focus-within:border-[#15594A] focus-within:ring-[3px] focus-within:ring-[#E7F0EC]">
                                <LuSearch className="shrink-0 text-[#8A919B]" />
                                <input
                                    id="eal"
                                    value={ealNumber}
                                    onChange={({ target }) => { setEalNumber(target.value); setError(null) }}
                                    placeholder="LBC0004121488"
                                    className="font-numeric min-w-0 flex-1 border-0 bg-transparent text-[18px] tracking-[0.03em] tabular-nums text-[#15181C] outline-none placeholder:text-[#A8ADB5]"
                                />
                                <span className="font-numeric hidden shrink-0 text-[11px] text-[#5A636D] sm:block">
                                    3 letters + 10 digits
                                </span>
                            </div>
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="h-12 cursor-pointer rounded-[10px] border border-[#15594A] bg-[#15594A] px-5 text-sm font-semibold text-white hover:bg-[#124C3F] disabled:opacity-60"
                        >
                            {loading ? 'Tracing…' : 'Trace label'}
                        </button>
                        <button
                            type="button"
                            onClick={reset}
                            className="h-12 cursor-pointer rounded-[10px] border border-[#D7D6D1] bg-white px-4 text-[13.5px] font-medium text-[#2A2F36] hover:bg-[#FAFAF8]"
                        >
                            Reset
                        </button>
                    </form>

                    <details className="mt-4 border-t border-[#EDECE8] pt-3.5">
                        <summary className="flex cursor-pointer items-center gap-[7px] text-[12.5px] font-medium text-[#15594A]">
                            Narrow the search
                            <span className="font-normal text-[#5A636D]">
                                — optional, when the serial is partly unreadable
                            </span>
                        </summary>
                        <div className="mt-3.5 grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div>
                                <label htmlFor="s-co" className="mb-1.5 block text-xs font-medium text-[#3C434B]">Company</label>
                                <select
                                    id="s-co"
                                    value={company}
                                    onChange={({ target }) => setCompany(target.value)}
                                    className="h-9 w-full cursor-pointer rounded-lg border border-[#D7D6D1] bg-white px-[11px] text-[13px]"
                                >
                                    <option value="">Any company</option>
                                    {companies.map((option) => (
                                        <option key={option._id} value={option._id}>{option.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="s-mkt" className="mb-1.5 block text-xs font-medium text-[#3C434B]">Market</label>
                                <select
                                    id="s-mkt"
                                    value={market}
                                    onChange={({ target }) => setMarket(target.value)}
                                    className="h-9 w-full cursor-pointer rounded-lg border border-[#D7D6D1] bg-white px-[11px] text-[13px]"
                                >
                                    <option value="">Any market</option>
                                    <option value="local">Local</option>
                                    <option value="export">Export</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="s-pack" className="mb-1.5 block text-xs font-medium text-[#3C434B]">Pack</label>
                                <select
                                    id="s-pack"
                                    value={pack}
                                    onChange={({ target }) => setPack(target.value)}
                                    className="h-9 w-full cursor-pointer rounded-lg border border-[#D7D6D1] bg-white px-[11px] text-[13px]"
                                >
                                    <option value="">Any pack</option>
                                    {packs.map((option) => (
                                        <option key={option._id} value={option._id}>{option.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </details>
                </section>

                {error && (
                    <p role="alert" className="print-hide m-0 rounded-[10px] border border-[#F3C9C7] bg-[#FCEBEA] px-4 py-3 text-[13px] text-[#7A2322]">
                        {error}
                    </p>
                )}

                {loading && (
                    <div className="rounded-xl border border-[#E3E2DE] bg-white px-[22px] py-5">
                        <SkeletonLines rows={4} />
                    </div>
                )}

                {notFound && !loading && (
                    <div className="rounded-xl border border-[#E3E2DE] bg-white px-[18px] py-5">
                        <EmptyState
                            title="No issuance covers that serial"
                            description="Check the prefix and the ten digits. A label can only be traced once the issuance that contains it has been recorded."
                        />
                    </div>
                )}

                {/* Trace */}
                {story && !loading && (
                    <section className="overflow-hidden rounded-xl border border-[#E3E2DE] bg-white">
                        <div className="flex flex-wrap items-center gap-3.5 border-b border-[#EDECE8] px-[22px] py-[18px]">
                            <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] bg-[#E7F0EC] text-[#15594A]">
                                <TagIcon size={20} strokeWidth={1.9} />
                            </span>
                            <div className="min-w-0 flex-[1_1_300px]">
                                <h2 className="font-numeric m-0 text-[19px] font-semibold tracking-[-0.015em] tabular-nums">
                                    <span className="text-[#8A919B]">{trace.prefix}</span>
                                    <span>{padSerial(trace.serial)}</span>
                                </h2>
                                <p className="mt-1 mb-0 flex flex-wrap items-center gap-2 text-[12.5px] text-[#5A636D]">
                                    {story.issuance?.market && (
                                        <span
                                            className="inline-block rounded-[5px] px-2 py-[3px] text-[11px] font-semibold"
                                            style={{
                                                color: marketStyle(story.issuance.market).fg,
                                                backgroundColor: marketStyle(story.issuance.market).bg
                                            }}
                                        >
                                            {marketStyle(story.issuance.market).label}
                                        </span>
                                    )}
                                    <span>
                                        Within{' '}
                                        <SerialRange
                                            prefix={story.issuance?.prefix}
                                            serialFrom={story.issuance?.serialFrom}
                                            serialTo={story.issuance?.serialTo}
                                        />
                                    </span>
                                </p>
                            </div>
                            <StatusPill status={story.status} />
                            <button
                                type="button"
                                onClick={() => window.print()}
                                className="print-hide flex h-9 cursor-pointer items-center gap-[7px] rounded-lg border border-[#D7D6D1] bg-white px-[13px] text-[13px] font-medium text-[#2A2F36] hover:bg-[#FAFAF8]"
                            >
                                <LuPrinter />
                                Print trace
                            </button>
                        </div>

                        {/* Facts */}
                        <dl className="m-0 grid grid-cols-2 border-b border-[#EDECE8] lg:grid-cols-4">
                            {story.facts.map((fact) => (
                                <div key={fact.k} className="border-t border-r border-[#F3F2EF] px-[22px] py-3.5">
                                    <dt className="mb-1.5 text-[10.5px] font-semibold tracking-[0.08em] text-[#5A636D] uppercase">
                                        {fact.k}
                                    </dt>
                                    <dd className="font-numeric m-0 truncate text-[13.5px] text-[#15181C] capitalize" title={fact.v || undefined}>
                                        {fact.v || '—'}
                                    </dd>
                                </div>
                            ))}
                        </dl>

                        {/* Chain of custody */}
                        <div className="px-[22px] pt-5 pb-[22px]">
                            <p className="m-0 mb-4 text-[11px] font-semibold tracking-[0.08em] text-[#5A636D] uppercase">
                                Chain of custody
                            </p>
                            <ol className="m-0 flex list-none flex-wrap p-0">
                                {story.steps.map((step, index) => (
                                    <li key={step.title} className="min-w-0 flex-[1_1_220px] pr-5">
                                        <span className="flex items-center">
                                            <span
                                                className="h-[13px] w-[13px] shrink-0 rounded-full"
                                                style={{ backgroundColor: step.tone, boxShadow: `0 0 0 3px ${step.tone}22` }}
                                            />
                                            <span
                                                className="h-0.5 flex-1"
                                                style={{
                                                    backgroundColor:
                                                        index === story.steps.length - 1 ? 'transparent' : `${step.tone}33`
                                                }}
                                            />
                                        </span>
                                        <span className="mt-2.5 block">
                                            <span className="block text-[13.5px] font-semibold text-[#15181C]">{step.title}</span>
                                            <span className="font-numeric mt-[3px] block text-[11.5px] tabular-nums text-[#5A636D]">
                                                {step.date ? formatDate(step.date) : '—'}
                                            </span>
                                            <span className="mt-1.5 block text-xs leading-[1.5] text-[#4A5159]">{step.detail}</span>
                                            {step.user && (
                                                <span className="mt-1 block text-[11px] text-[#8A919B]">Recorded by {step.user}</span>
                                            )}
                                        </span>
                                    </li>
                                ))}
                            </ol>

                            {story.steps.length === 1 && (
                                <p className="m-0 mt-4 rounded-[10px] border border-[#E3E2DE] bg-[#FAFAF8] px-3.5 py-3 text-xs text-[#5A636D]">
                                    This label has been issued but not yet applied on the line, so the
                                    trail ends here.
                                </p>
                            )}
                        </div>
                    </section>
                )}

                {!story && !loading && !notFound && !error && (
                    <div className="rounded-xl border border-[#E3E2DE] bg-white px-[18px] py-5">
                        <EmptyState
                            title="Trace a label"
                            description="Type the three-letter prefix and the ten digits printed on the label, then trace it."
                        />
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}

export default FindEAL
