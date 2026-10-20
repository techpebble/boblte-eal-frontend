import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import MasterDataPage from '../../components/MasterData/MasterDataPage'
import { WarehouseIcon } from '../../components/MasterData/icons'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATHS } from '../../utils/apiPaths'

const FIELDS = [
  { name: 'name', label: 'Depot name', placeholder: 'e.g. KSBCL Depot - Raichur' },
  { name: 'code', label: 'Code', placeholder: 'e.g. RCH', hint: 'Must be unique across depots.' },
  { name: 'address', label: 'Address', multiline: true, placeholder: 'Where deliveries are received' }
]

const COLUMNS = [
  { key: 'name', header: 'Depot' },
  { key: 'code', header: 'Code', mono: true },
  {
    key: 'address',
    header: 'Address',
    render: (row) => (
      <span className="block max-w-[420px] truncate" title={row.address || undefined}>
        {row.address || '—'}
      </span>
    )
  }
]

const DeliveryDepots = () => {
  const [depots, setDepots] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const fetchDepots = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.DELIVERY.GET_DATA)
      setDepots(response.data?.data || [])
    } catch (err) {
      console.log('Something went wrong.', err)
      setError(err?.response?.data?.message || 'Could not load the depots.')
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      await fetchDepots()
      setLoading(false)
    }
    load()
  }, [])

  const handleCreate = async (values) => {
    try {
      setSaving(true)
      await axiosInstance.post(API_PATHS.DELIVERY.ADD_DATA, values)
      toast.success('Depot added successfully')
      await fetchDepots()
      return true
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add depot')
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id, values) => {
    try {
      setSaving(true)
      await axiosInstance.put(`${API_PATHS.DELIVERY.UPDATE_DATA}/${id}`, values)
      toast.success('Depot updated successfully')
      await fetchDepots()
      return true
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update depot')
      return false
    } finally {
      setSaving(false)
    }
  }

  return (
    <MasterDataPage
      activeMenu="Delivery Depots"
      title="Delivery Depots"
      singular="Depot"
      subtitle="Where dispatched cases are delivered. A depot can be chosen on a dispatch note once it is listed here."
      icon={<WarehouseIcon size={26} strokeWidth={1.5} />}
      rows={depots}
      loading={loading}
      error={error}
      saving={saving}
      columns={COLUMNS}
      searchKeys={['name', 'code', 'address']}
      searchPlaceholder="Search by name, code or address"
      fields={FIELDS}
      onCreate={handleCreate}
      onUpdate={handleUpdate}
    />
  )
}

export default DeliveryDepots
