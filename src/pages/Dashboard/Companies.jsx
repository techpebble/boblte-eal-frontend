import React, { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import MasterDataPage from '../../components/MasterData/MasterDataPage'
import { BuildingIcon } from '../../components/MasterData/icons'
import axiosInstance from '../../utils/axiosInstance'
import { API_PATHS } from '../../utils/apiPaths'

const FIELDS = [
  { name: 'name', label: 'Company name', placeholder: 'e.g. Lion Brewery (Ceylon) PLC' },
  { name: 'code', label: 'Code', placeholder: 'e.g. LBC', hint: 'Must be unique across companies.' },
  { name: 'address', label: 'Address', multiline: true, placeholder: 'Registered address' }
]

const COLUMNS = [
  { key: 'name', header: 'Company' },
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

const Companies = () => {
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)

  const fetchCompanies = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.COMPANY.GET_DATA)
      setCompanies(response.data?.data || [])
    } catch (err) {
      console.log('Something went wrong.', err)
      setError(err?.response?.data?.message || 'Could not load the companies.')
    }
  }

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      await fetchCompanies()
      setLoading(false)
    }
    load()
  }, [])

  const handleCreate = async (values) => {
    try {
      setSaving(true)
      await axiosInstance.post(API_PATHS.COMPANY.ADD_DATA, values)
      toast.success('Company added successfully')
      await fetchCompanies()
      return true
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to add company')
      return false
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id, values) => {
    try {
      setSaving(true)
      await axiosInstance.put(`${API_PATHS.COMPANY.UPDATE_DATA}/${id}`, values)
      toast.success('Company updated successfully')
      await fetchCompanies()
      return true
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update company')
      return false
    } finally {
      setSaving(false)
    }
  }

  return (
    <MasterDataPage
      activeMenu="Companies"
      title="Companies"
      singular="Company"
      subtitle="The distilleries and breweries whose labels are tracked here. Everything else — issuances, items, dispatch notes — hangs off a company."
      icon={<BuildingIcon size={26} strokeWidth={1.5} />}
      rows={companies}
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

export default Companies
