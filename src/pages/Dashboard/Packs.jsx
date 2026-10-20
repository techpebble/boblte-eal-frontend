import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import MasterDataPage from '../../components/MasterData/MasterDataPage'
import { PackageIcon } from '../../components/MasterData/icons'
import { formatQuantity } from '../../components/Dashboard/dashboardFormat'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATHS } from '../../utils/apiPaths'

const FIELDS = [
  { name: 'name', label: 'Name', placeholder: 'e.g. 750ml Bottle' },
  {
    name: 'bottlesPerCase',
    label: 'Bottles per case',
    type: 'number',
    placeholder: 'e.g. 12',
    hint: 'Every case figure in the app is derived from this, so changing it changes past arithmetic.'
  },
  { name: 'pack', label: 'Pack size (ml)', type: 'number', placeholder: 'e.g. 750' }
]

const COLUMNS = [
  { key: 'name', header: 'Name' },
  { key: 'pack', header: 'Pack size', align: 'right', mono: true, render: (row) => `${formatQuantity(row.pack)} ml` },
  { key: 'bottlesPerCase', header: 'Bottles per case', align: 'right', mono: true }
]

const Packs = () => {
  const [packs, setPacks] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const fetchPacks = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.PACK.GET_DATA)
      setPacks(response.data?.data || [])
    } catch (err) {
      console.log('Something went wrong.', err)
      setError(err?.response?.data?.message || 'Could not load the packs.')
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      await fetchPacks()
      setLoading(false)
    }
    load()
  }, [])

  const handleCreate = async (values) => {
    try {
      setSaving(true)
      await axiosInstance.post(API_PATHS.PACK.ADD_DATA, values)
      toast.success('Pack added successfully')
      await fetchPacks()
      return true
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add pack')
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id, values) => {
    try {
      setSaving(true)
      await axiosInstance.put(`${API_PATHS.PACK.UPDATE_DATA}/${id}`, values)
      toast.success('Pack updated successfully')
      await fetchPacks()
      return true
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update pack')
      return false
    } finally {
      setSaving(false)
    }
  }

  return (
    <MasterDataPage
      activeMenu="Packs"
      title="Packs"
      singular="Pack"
      subtitle="Bottle sizes and how many go in a case. Bottles per case is what turns a serial range into a number of cases, so it is the figure the rest of the app leans on."
      icon={<PackageIcon size={26} strokeWidth={1.5} />}
      rows={packs}
      loading={loading}
      error={error}
      saving={saving}
      columns={COLUMNS}
      searchKeys={['name', 'pack', 'bottlesPerCase']}
      searchPlaceholder="Search by name or size"
      fields={FIELDS}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
    />
  )
}

export default Packs
