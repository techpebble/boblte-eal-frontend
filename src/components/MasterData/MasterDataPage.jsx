import React, { useContext, useEffect, useMemo, useState } from 'react'
import { LuDownload, LuPencil, LuPlus, LuSearch } from 'react-icons/lu'
import DashboardLayout from '../layouts/DashboardLayout'
import Modal from '../Modal/Modal'
import EmptyState from '../Dashboard/EmptyState'
import { SkeletonTableRows } from '../Dashboard/Skeleton'
import RecordForm from './RecordForm'
import { downloadCsv } from '../../utils/exportCsv'
import { formatDateToYYYYMMDD } from '../../utils/helper'
import { UserContext } from '../../context/userContext'
import { can } from '../../utils/permissions'

const PAGE_SIZES = [25, 50, 100]

const headerCell =
  'bg-[#FAFAF8] px-4 pt-3 pb-[11px] text-left text-[11px] font-semibold tracking-[0.07em] text-[#5A636D] uppercase whitespace-nowrap'
const bodyCell = 'border-t border-[#EDECE8] px-4 py-3 text-[13px] text-[#2A2F36]'

/**
 * The shared shell for the master-data lists — Packs, Delivery Depots and
 * Companies are the same page with different columns and fields.
 *
 * The caller owns fetching and saving; this owns searching, paging, export
 * and the add/edit dialogs.
 */
const MasterDataPage = ({
  activeMenu,
  title,
  subtitle,
  singular,
  icon,
  rows,
  loading,
  error,
  columns,
  searchKeys,
  searchPlaceholder,
  fields,
  onCreate,
  onUpdate,
  saving
}) => {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])
  const { user } = useContext(UserContext)
  // Packs, depots and companies all sit behind the one master-data
  // permission, so the shell can decide this once for all three.
  const mayManage = can(user, 'masterdata:manage')

  const [addOpen, setAddOpen] = useState(false)
  const [editRecord, setEditRecord] = useState(null)

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase()
    if (!needle) return rows
    return rows.filter((row) =>
      searchKeys
        .map((key) => row[key])
        .filter((value) => value != null)
        .some((value) => String(value).toLowerCase().includes(needle))
    )
  }, [rows, search, searchKeys])

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageRows = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => { setPage(1) }, [search, pageSize])

  const exportRows = () => {
    if (filtered.length === 0) return
    downloadCsv(
      `${activeMenu.toLowerCase().replace(/\s+/g, '-')}-${formatDateToYYYYMMDD(new Date())}.csv`,
      columns.map((column) => ({
        header: column.header,
        value: (row) => (column.exportValue ? column.exportValue(row) : row[column.key])
      })),
      filtered
    )
  }

  return (
    <DashboardLayout activeMenu={activeMenu}>
      <div className="mx-auto flex max-w-[1400px] flex-col gap-[18px]">

        <div className="flex flex-wrap items-end justify-between gap-3.5">
          <div>
            <h1 className="m-0 text-[25px] font-semibold tracking-[-0.022em]">{title}</h1>
            <p className="mt-1.5 mb-0 max-w-[620px] text-[13px] text-[#5A636D]">{subtitle}</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportRows}
              disabled={filtered.length === 0}
              className="flex h-9 cursor-pointer items-center gap-[7px] rounded-lg border border-[#D7D6D1] bg-white px-[13px] text-[13px] font-medium text-[#2A2F36] hover:bg-[#FAFAF8] disabled:cursor-not-allowed disabled:text-[#A8ADB5]"
            >
              <LuDownload />
              Export
            </button>
            {mayManage && (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="flex h-9 cursor-pointer items-center gap-[7px] rounded-lg border border-[#15594A] bg-[#15594A] px-3.5 text-[13px] font-medium text-white hover:bg-[#124C3F]"
              >
                <LuPlus />
                Add {singular}
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-[11px] border border-[#E3E2DE] bg-white px-3 py-2.5">
          <label className="flex h-[34px] min-w-[200px] flex-[1_1_240px] items-center gap-2.5 rounded-lg border border-[#E3E2DE] bg-[#F6F5F3] px-2.5 sm:max-w-[360px]">
            <LuSearch className="shrink-0 text-[#8A919B]" />
            <span className="sr-only">Search {title.toLowerCase()}</span>
            <input
              value={search}
              onChange={({ target }) => setSearch(target.value)}
              placeholder={searchPlaceholder}
              className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] text-[#15181C] outline-none"
            />
          </label>
          <span className="flex-1" />
          <span className="font-numeric text-xs text-[#5A636D] tabular-nums">
            {loading ? '—' : `${filtered.length} of ${rows.length}`}
          </span>
        </div>

        {error && (
          <p role="alert" className="m-0 rounded-[10px] border border-[#F3C9C7] bg-[#FCEBEA] px-4 py-3 text-[13px] text-[#7A2322]">
            {error}
          </p>
        )}

        <section className="overflow-hidden rounded-xl border border-[#E3E2DE] bg-white">
          {!loading && filtered.length === 0 ? (
            <div className="px-[18px] py-5">
              <EmptyState
                icon={icon}
                title={search ? `No ${title.toLowerCase()} match` : `No ${title.toLowerCase()} yet`}
                description={
                  search
                    ? 'Nothing matches that search. Clear it to see everything.'
                    : `Add the first ${singular.toLowerCase()} to get started.`
                }
                action={
                  (search || mayManage) && (
                    <button
                      type="button"
                      onClick={() => (search ? setSearch('') : setAddOpen(true))}
                      className="h-[34px] cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] px-3.5 text-[12.5px] font-medium text-white"
                    >
                      {search ? 'Clear search' : `Add ${singular.toLowerCase()}`}
                    </button>
                  )
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse">
                <thead>
                  <tr>
                    {columns.map((column) => (
                      <th
                        key={column.key}
                        className={`${headerCell} ${column.align === 'right' ? 'text-right' : ''}`}
                      >
                        {column.header}
                      </th>
                    ))}
                    {mayManage && <th className={`${headerCell} w-16 text-right`}>Edit</th>}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <SkeletonTableRows rows={6} columns={columns.length + (mayManage ? 1 : 0)} />
                  ) : (
                    pageRows.map((row) => (
                      <tr key={row._id} className="hover:bg-[#FAFAF8]">
                        {columns.map((column) => (
                          <td
                            key={column.key}
                            className={`${bodyCell} ${column.align === 'right' ? 'text-right' : ''} ${
                              column.mono ? 'font-numeric tabular-nums' : ''
                            }`}
                          >
                            {column.render ? column.render(row) : (row[column.key] ?? '—')}
                          </td>
                        ))}
                        {mayManage && (
                          <td className={`${bodyCell} text-right`}>
                            <button
                              type="button"
                              onClick={() => setEditRecord(row)}
                              aria-label={`Edit ${row.name || singular}`}
                              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[#5A636D] hover:bg-[#F2F1ED] hover:text-[#15181C]"
                            >
                              <LuPencil />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filtered.length > pageSize && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#EDECE8] px-[18px] py-3">
              <span className="text-xs text-[#5A636D]">
                Rows {(currentPage - 1) * pageSize + 1}–
                {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length}
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

      <Modal isOpen={addOpen} onClose={() => setAddOpen(false)} title={`Add ${singular}`} styleClass="w-full max-w-md">
        <h2 className="m-0 mb-4 text-[17px] font-semibold tracking-[-0.015em]">Add {singular.toLowerCase()}</h2>
        <RecordForm
          fields={fields}
          onSubmit={async (values) => {
            const ok = await onCreate(values)
            if (ok !== false) setAddOpen(false)
          }}
          loading={saving}
          submitLabel={`Add ${singular.toLowerCase()}`}
        />
      </Modal>

      <Modal
        isOpen={Boolean(editRecord)}
        onClose={() => setEditRecord(null)}
        title={`Edit ${singular}`}
        styleClass="w-full max-w-md"
      >
        <h2 className="m-0 mb-4 text-[17px] font-semibold tracking-[-0.015em]">Edit {singular.toLowerCase()}</h2>
        <RecordForm
          fields={fields}
          record={editRecord}
          onSubmit={async (values) => {
            const ok = await onUpdate(editRecord._id, values)
            if (ok !== false) setEditRecord(null)
          }}
          loading={saving}
          submitLabel="Save changes"
        />
      </Modal>
    </DashboardLayout>
  )
}

export default MasterDataPage
