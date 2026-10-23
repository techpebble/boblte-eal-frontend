import React, { useCallback, useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { LuCopy, LuDownload } from 'react-icons/lu'
import { SkeletonLines } from '../Dashboard/Skeleton'
import EmptyState from '../Dashboard/EmptyState'
import { TruckIcon } from '../Dashboard/icons'
import { formatQuantity, itemLabel, padSerial, shortReference } from '../Dashboard/dashboardFormat'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATHS } from '../../utils/apiPaths'
import { downloadCsv } from '../../utils/exportCsv'

const headerCell =
  'bg-[#FAFAF8] px-3 pt-[9px] pb-2 text-left text-[10.5px] font-semibold tracking-[0.07em] text-[#5A636D] uppercase whitespace-nowrap'
const bodyCell = 'border-t border-[#EDECE8] px-3 py-2 text-[12.5px] text-[#2A2F36]'

const COLUMNS = ['Item', 'Prefix', 'From', 'To', 'Labels', 'Cases']

/**
 * Every sticker range on a note, in one table meant to be copied out.
 *
 * The excise portal wants the ranges typed in against each item, so this is
 * laid out the way that form reads rather than the way the app stores it: one
 * row per range, the item repeated on every row so a pasted block carries its
 * own context, and the serials written out in full with their prefix because
 * that is what goes in the field.
 */
const StickerSummary = ({ dispatchId }) => {
  const [note, setNote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

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

  const rows = useMemo(() => {
    if (!note) return []
    return (note.items || []).flatMap((entry) => {
      const perCase = entry.item?.bottlesPerCase || 0
      const name = itemLabel(entry.item) || entry.item?.name || '—'
      return (entry.EALLinks || []).map((link) => {
        const labels = link.serialTo - link.serialFrom + 1
        return {
          key: `${entry.item?._id}-${link.prefix}-${link.serialFrom}`,
          item: name,
          prefix: link.prefix,
          from: `${link.prefix}${padSerial(link.serialFrom)}`,
          to: `${link.prefix}${padSerial(link.serialTo)}`,
          labels,
          cases: perCase > 0 ? labels / perCase : null
        }
      })
    })
  }, [note])

  const totals = useMemo(() => ({
    labels: rows.reduce((sum, row) => sum + row.labels, 0),
    cases: rows.reduce((sum, row) => sum + (row.cases || 0), 0)
  }), [rows])

  /**
   * The oldest way to put text on the clipboard, and the one that still works
   * where the newer one does not.
   *
   * navigator.clipboard needs a permission the browser can withhold — an
   * embedded view or a tightened policy refuses it outright — and this dialog
   * exists to be copied out of, so a refusal cannot be the end of it. A
   * selected textarea and execCommand is deprecated but asks nobody.
   */
  const copyTheOldWay = (text) => {
    const field = document.createElement('textarea')
    field.value = text
    field.setAttribute('readonly', '')
    field.style.position = 'fixed'
    field.style.top = '-1000px'
    document.body.appendChild(field)
    field.select()
    let worked = false
    try { worked = document.execCommand('copy') } catch { worked = false }
    document.body.removeChild(field)
    return worked
  }

  /** Tab-separated, which is what a spreadsheet and most web tables accept. */
  const copy = async () => {
    const body = rows.map((row) => [
      row.item, row.prefix, row.from, row.to, row.labels, row.cases ?? ''
    ].join('\t'))
    const text = [COLUMNS.join('\t'), ...body].join('\n')
    const done = () =>
      toast.success(`${formatQuantity(rows.length)} range${rows.length === 1 ? '' : 's'} copied`)

    try {
      await navigator.clipboard.writeText(text)
      done()
      return
    } catch {
      // Fall through to the way that needs no permission.
    }

    if (copyTheOldWay(text)) done()
    else toast.error('Could not reach the clipboard. Select the table and copy it.')
  }

  const csv = () => {
    if (rows.length === 0) return
    downloadCsv(
      `stickers-${shortReference(note._id).replace('#', '')}.csv`,
      [
        { header: 'Item', value: (row) => row.item },
        { header: 'Prefix', value: (row) => row.prefix },
        { header: 'From', value: (row) => row.from },
        { header: 'To', value: (row) => row.to },
        { header: 'Labels', value: (row) => row.labels },
        { header: 'Cases', value: (row) => row.cases }
      ],
      rows
    )
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

  return (
    <div className="flex max-h-[76vh] flex-col gap-3">

      {/* The dialog chrome carries the note's name, so this is only the work:
          what to do with the ranges below. */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <p className="m-0 min-w-0 flex-[1_1_320px] text-[12px] text-[#5A636D]">
          {rows.length === 0
            ? 'Nothing has been linked to this note yet.'
            : `${formatQuantity(rows.length)} range${rows.length === 1 ? '' : 's'} across ${formatQuantity((note.items || []).length)} item${(note.items || []).length === 1 ? '' : 's'}. Copying gives tab-separated rows, which paste into a spreadsheet or the portal's table as columns.`}
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={csv}
            disabled={rows.length === 0}
            className="flex h-9 cursor-pointer items-center gap-[7px] rounded-lg border border-[#D7D6D1] bg-white px-3 text-[12.5px] font-medium text-[#2A2F36] hover:bg-[#FAFAF8] disabled:cursor-not-allowed disabled:text-[#A8ADB5]"
          >
            <LuDownload />
            CSV
          </button>
          <button
            type="button"
            onClick={copy}
            disabled={rows.length === 0}
            className="flex h-9 cursor-pointer items-center gap-[7px] rounded-lg border border-[#15594A] bg-[#15594A] px-3.5 text-[12.5px] font-semibold text-white hover:bg-[#124C3F] disabled:cursor-not-allowed disabled:border-[#E3E2DE] disabled:bg-[#F2F1ED] disabled:text-[#A8ADB5]"
          >
            <LuCopy />
            Copy for the portal
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<TruckIcon size={24} strokeWidth={1.5} />}
          title="No stickers linked yet"
          description="No serial ranges have been linked to this note's items."
        />
      ) : (
        <>
          {/* Selectable as well as copyable, for a portal that wants one field
              at a time rather than a pasted block. */}
          <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-[#E3E2DE]">
            <table className="w-full min-w-[640px] border-collapse">
              <thead className="sticky top-0 z-[1]">
                <tr>
                  <th className={headerCell}>Item</th>
                  <th className={`${headerCell} w-[72px]`}>Prefix</th>
                  <th className={`${headerCell} w-[150px]`}>From</th>
                  <th className={`${headerCell} w-[150px]`}>To</th>
                  <th className={`${headerCell} w-[86px] text-right`}>Labels</th>
                  <th className={`${headerCell} w-[74px] text-right`}>Cases</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="hover:bg-[#FAFAF8]">
                    <td className={`${bodyCell} font-medium text-[#15181C]`}>{row.item}</td>
                    <td className={`${bodyCell} font-numeric tabular-nums`}>{row.prefix}</td>
                    <td className={`${bodyCell} font-numeric whitespace-nowrap tabular-nums`}>{row.from}</td>
                    <td className={`${bodyCell} font-numeric whitespace-nowrap tabular-nums`}>{row.to}</td>
                    <td className={`${bodyCell} font-numeric text-right tabular-nums`}>{formatQuantity(row.labels)}</td>
                    <td className={`${bodyCell} font-numeric text-right tabular-nums`}>
                      {row.cases == null ? '—' : formatQuantity(row.cases)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} className={`${bodyCell} border-t border-[#DEDDD8] bg-[#FAFAF8] text-xs font-semibold text-[#3C434B]`}>
                    Total · {formatQuantity(rows.length)} range{rows.length === 1 ? '' : 's'}
                  </td>
                  <td className={`${bodyCell} font-numeric border-t border-[#DEDDD8] bg-[#FAFAF8] text-right font-semibold tabular-nums`}>
                    {formatQuantity(totals.labels)}
                  </td>
                  <td className={`${bodyCell} font-numeric border-t border-[#DEDDD8] bg-[#FAFAF8] text-right font-semibold tabular-nums`}>
                    {formatQuantity(totals.cases)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default StickerSummary
