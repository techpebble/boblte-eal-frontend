import React, { useEffect, useMemo, useState } from 'react'
import toast from 'react-hot-toast'
import { LuDownload, LuPencil, LuPlus, LuSearch } from 'react-icons/lu'
import DashboardLayout from '../../components/layouts/DashboardLayout'
import Modal from '../../components/Modal/Modal'
import ItemForm from '../../components/Items/ItemForm'
import EmptyState from '../../components/Dashboard/EmptyState'
import { SkeletonTableRows } from '../../components/Dashboard/Skeleton'
import { TagIcon } from '../../components/Dashboard/icons'
import { formatQuantity, marketStyle } from '../../components/Dashboard/dashboardFormat'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATHS } from '../../utils/apiPaths'
import { downloadCsv } from '../../utils/exportCsv'
import { formatDateToYYYYMMDD } from '../../utils/helper'

const PAGE_SIZES = [25, 50, 100]
const COLUMN_COUNT = 9

const headerCell =
  'bg-[#FAFAF8] px-4 pt-3 pb-[11px] text-left text-[11px] font-semibold tracking-[0.07em] text-[#5A636D] uppercase whitespace-nowrap'
const bodyCell = 'border-t border-[#EDECE8] px-4 py-3 text-[13px] text-[#2A2F36]'

const isActive = (item) => item.isActive !== false

const Items = () => {
  const [openAddModal, setOpenAddModal] = useState(false)
  const [openEditModal, setOpenEditModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [itemsData, setItemsData] = useState([])
  const [companies, setCompanies] = useState([])
  const [packs, setPacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  // Master data is small, so everything is fetched once and narrowed here.
  // That also keeps the tab counts honest, which a server-side status filter
  // would not.
  const [search, setSearch] = useState('')
  const [company, setCompany] = useState('')
  const [market, setMarket] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0])

  const fetchItems = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.ITEM.GET_DATA, {
        params: { isActive: 'all' }
      })
      setItemsData(response.data?.data || [])
    } catch (err) {
      console.log('Something went wrong.', err)
      setError(err?.response?.data?.message || 'Could not load the items.')
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const [, companiesRes, packsRes] = await Promise.all([
          fetchItems(),
          axiosInstance.get(API_PATHS.COMPANY.GET_DATA),
          axiosInstance.get(API_PATHS.PACK.GET_DATA)
        ])
        setCompanies(companiesRes.data?.data || [])
        setPacks(packsRes.data?.data || [])
      } catch (err) {
        console.error('Failed to fetch dependencies', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleAddItem = async (itemData) => {
    try {
      setSaving(true)
      await axiosInstance.post(API_PATHS.ITEM.ADD_DATA, itemData)
      setOpenAddModal(false)
      toast.success('Item added successfully')
      await fetchItems()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add item')
      console.error('Error adding item:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleEditItem = async (id, itemData) => {
    try {
      setSaving(true)
      await axiosInstance.put(`${API_PATHS.ITEM.UPDATE_DATA}/${id}`, itemData)
      setOpenEditModal(false)
      toast.success('Item updated successfully')
      await fetchItems()
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update item')
      console.error('Error updating item:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleToggleStatus = async (item) => {
    const currentActive = isActive(item)
    const newActive = !currentActive

    // Optimistic UI update
    setItemsData((prev) =>
      prev.map((it) => (it._id === item._id ? { ...it, isActive: newActive } : it))
    )

    try {
      await axiosInstance.put(`${API_PATHS.ITEM.UPDATE_STATUS}/${item._id}/status`, {
        isActive: newActive
      })
      toast.success(`Item "${item.name}" marked as ${newActive ? 'Active' : 'Inactive'}`)
    } catch (err) {
      // Revert optimistic update
      setItemsData((prev) =>
        prev.map((it) => (it._id === item._id ? { ...it, isActive: currentActive } : it))
      )
      toast.error(err?.response?.data?.message || 'Failed to update item status')
      console.error('Error toggling status:', err)
    }
  }

  const openEdit = (item) => {
    setSelectedItem(item)
    setOpenEditModal(true)
  }

  const activeCount = itemsData.filter(isActive).length
  const inactiveCount = itemsData.length - activeCount

  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return itemsData.filter((item) => {
      if (statusFilter === 'active' && !isActive(item)) return false
      if (statusFilter === 'inactive' && isActive(item)) return false
      if (company && item.company?._id !== company) return false
      if (market && item.market !== market) return false
      if (!needle) return true
      return [item.name, item.itemCode, item.brand]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(needle))
    })
  }, [itemsData, statusFilter, company, market, search])

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  useEffect(() => { setPage(1) }, [search, company, market, statusFilter, pageSize])

  const filtersActive = Boolean(search || company || market || statusFilter !== 'all')

  const clearFilters = () => {
    setSearch('')
    setCompany('')
    setMarket('')
    setStatusFilter('all')
  }

  const exportItems = () => {
    if (rows.length === 0) return
    downloadCsv(
      `items-${formatDateToYYYYMMDD(new Date())}.csv`,
      [
        { header: 'Item code', value: (row) => row.itemCode },
        { header: 'Name', value: (row) => row.name },
        { header: 'Brand', value: (row) => row.brand },
        { header: 'Company', value: (row) => row.company?.name },
        { header: 'Pack', value: (row) => row.pack?.name },
        { header: 'Market', value: (row) => row.market },
        { header: 'Bottles per case', value: (row) => row.bottlesPerCase },
        { header: 'Status', value: (row) => (isActive(row) ? 'Active' : 'Inactive') }
      ],
      rows
    )
  }

  const tabs = [
    { key: 'all', label: 'All', count: itemsData.length },
    { key: 'active', label: 'Active', count: activeCount },
    { key: 'inactive', label: 'Inactive', count: inactiveCount }
  ]

  return (
    <DashboardLayout activeMenu="Items">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-[18px]">

        {/* Page header */}
        <div className="flex flex-wrap items-end justify-between gap-3.5">
          <div>
            <h1 className="m-0 text-[25px] font-semibold tracking-[-0.022em]">Items</h1>
            <p className="mt-1.5 mb-0 text-[13px] text-[#5A636D]">
              The products labels are applied to. An inactive item stays on past
              records but is no longer offered when recording usage.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={exportItems}
              disabled={rows.length === 0}
              className="flex h-9 cursor-pointer items-center gap-[7px] rounded-lg border border-[#D7D6D1] bg-white px-[13px] text-[13px] font-medium text-[#2A2F36] hover:bg-[#FAFAF8] disabled:cursor-not-allowed disabled:text-[#A8ADB5]"
            >
              <LuDownload />
              Export
            </button>
            <button
              type="button"
              onClick={() => setOpenAddModal(true)}
              className="flex h-9 cursor-pointer items-center gap-[7px] rounded-lg border border-[#15594A] bg-[#15594A] px-3.5 text-[13px] font-medium text-white hover:bg-[#124C3F]"
            >
              <LuPlus />
              Add item
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center gap-2 rounded-[11px] border border-[#E3E2DE] bg-white px-3 py-2.5">
          <label className="flex h-[34px] min-w-[200px] flex-[1_1_240px] items-center gap-2.5 rounded-lg border border-[#E3E2DE] bg-[#F6F5F3] px-2.5 sm:max-w-[320px]">
            <LuSearch className="shrink-0 text-[#8A919B]" />
            <span className="sr-only">Search items</span>
            <input
              value={search}
              onChange={({ target }) => setSearch(target.value)}
              placeholder="Search name, code or brand"
              className="min-w-0 flex-1 border-0 bg-transparent text-[12.5px] text-[#15181C] outline-none"
            />
          </label>

          <div role="group" aria-label="Status" className="flex h-[34px] gap-0.5 rounded-lg bg-[#F2F1ED] p-[3px]">
            {tabs.map((entry) => (
              <button
                key={entry.key}
                type="button"
                aria-pressed={statusFilter === entry.key}
                onClick={() => setStatusFilter(entry.key)}
                className={`cursor-pointer rounded-md px-3 text-[12.5px] ${
                  statusFilter === entry.key
                    ? 'bg-white font-semibold text-[#15181C] shadow-sm'
                    : 'text-[#4A5159]'
                }`}
              >
                {entry.label}
                <span className="font-numeric ml-1 text-[#8A919B] tabular-nums">{entry.count}</span>
              </button>
            ))}
          </div>

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
          {!loading && rows.length === 0 ? (
            <div className="px-[18px] py-5">
              <EmptyState
                icon={<TagIcon size={26} strokeWidth={1.5} />}
                title={filtersActive ? 'No items match' : 'No items yet'}
                description={
                  filtersActive
                    ? 'Nothing matches these filters. Clear them to see every item.'
                    : 'Add the products your labels are applied to.'
                }
                action={
                  <button
                    type="button"
                    onClick={() => (filtersActive ? clearFilters() : setOpenAddModal(true))}
                    className="h-[34px] cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] px-3.5 text-[12.5px] font-medium text-white"
                  >
                    {filtersActive ? 'Clear filters' : 'Add item'}
                  </button>
                }
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] border-collapse">
                <thead>
                  <tr>
                    <th className={headerCell}>Item code</th>
                    <th className={headerCell}>Name</th>
                    <th className={headerCell}>Brand</th>
                    <th className={headerCell}>Company</th>
                    <th className={headerCell}>Pack</th>
                    <th className={headerCell}>Market</th>
                    <th className={`${headerCell} text-right`}>Bottles / case</th>
                    <th className={headerCell}>Status</th>
                    <th className={`${headerCell} w-16 text-right`}>Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <SkeletonTableRows rows={6} columns={COLUMN_COUNT} />
                  ) : (
                    pageRows.map((item) => {
                      const live = isActive(item)
                      const tone = marketStyle(item.market)
                      return (
                        <tr key={item._id} className="hover:bg-[#FAFAF8]">
                          <td className={`${bodyCell} font-numeric text-xs whitespace-nowrap tabular-nums`}>
                            {item.itemCode}
                          </td>
                          <td className={`${bodyCell} font-medium text-[#15181C]`}>
                            <span className="block max-w-[320px] truncate" title={item.name}>
                              {item.name}
                            </span>
                          </td>
                          <td className={bodyCell}>{item.brand || '—'}</td>
                          <td className={`${bodyCell} whitespace-nowrap`}>{item.company?.name || '—'}</td>
                          <td className={`${bodyCell} whitespace-nowrap`}>{item.pack?.name || '—'}</td>
                          <td className={bodyCell}>
                            <span
                              className="inline-block rounded-[5px] px-2 py-[3px] text-[11px] font-semibold"
                              style={{ color: tone.fg, backgroundColor: tone.bg }}
                            >
                              {tone.label}
                            </span>
                          </td>
                          <td className={`${bodyCell} font-numeric text-right text-[#5A636D] tabular-nums`}>
                            {item.bottlesPerCase == null ? '—' : formatQuantity(item.bottlesPerCase)}
                          </td>
                          <td className={bodyCell}>
                            <button
                              type="button"
                              role="switch"
                              aria-checked={live}
                              onClick={() => handleToggleStatus(item)}
                              className="group inline-flex cursor-pointer items-center gap-2 focus:outline-none"
                              title={`Click to mark as ${live ? 'Inactive' : 'Active'}`}
                            >
                              <span
                                className="relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out"
                                style={{ backgroundColor: live ? '#15594A' : '#D7D6D1' }}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out ${
                                    live ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </span>
                              <span
                                className="rounded-[5px] px-2 py-[3px] text-[11px] font-semibold"
                                style={
                                  live
                                    ? { color: '#15594A', backgroundColor: '#E7F0EC' }
                                    : { color: '#5A636D', backgroundColor: '#F0EFEC' }
                                }
                              >
                                {live ? 'Active' : 'Inactive'}
                              </span>
                            </button>
                          </td>
                          <td className={`${bodyCell} text-right`}>
                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              aria-label={`Edit ${item.name}`}
                              className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[#5A636D] hover:bg-[#F2F1ED] hover:text-[#15181C]"
                            >
                              <LuPencil />
                            </button>
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

      <Modal isOpen={openAddModal} onClose={() => setOpenAddModal(false)} title="Add Item">
        <ItemForm
          onSubmit={handleAddItem}
          loading={saving}
          companies={companies}
          packs={packs}
        />
      </Modal>

      <Modal isOpen={openEditModal} onClose={() => setOpenEditModal(false)} title="Edit Item">
        <ItemForm
          record={selectedItem}
          onSubmit={(values) => handleEditItem(selectedItem._id, values)}
          loading={saving}
          companies={companies}
          packs={packs}
        />
      </Modal>
    </DashboardLayout>
  )
}

export default Items
