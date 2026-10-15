import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import Modal from '../../components/Modal/Modal';
import AddItemForm from '../../components/Items/AddItemForm';
import EditItemForm from '../../components/Items/EditItemForm';
import toast from 'react-hot-toast';
import { LuPlus, LuPencil } from 'react-icons/lu';
import LoadingOverlay from '../../components/LoadingOverlay';

const Items = () => {
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [itemsData, setItemsData] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [packs, setPacks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    const fetchItems = async () => {
      setLoading(true);

      try {
        const response = await axiosInstance.get(`${API_PATHS.ITEM.GET_DATA}?isActive=all`);
        if (response.data) {
          setItemsData(response.data.data || []);
        }
      } catch (error) {
        console.log("Something went wrong.", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchDependencies = async () => {
      try {
        const [companiesRes, packsRes] = await Promise.all([
          axiosInstance.get(API_PATHS.COMPANY.GET_DATA),
          axiosInstance.get(API_PATHS.PACK.GET_DATA)
        ]);
        if (companiesRes.data) setCompanies(companiesRes.data.data || []);
        if (packsRes.data) setPacks(packsRes.data.data || []);
      } catch (error) {
        console.error("Failed to fetch dependencies", error);
      }
    };

    fetchItems();
    fetchDependencies();
  }, []); // Empty array is fine since API_PATHS is constant and no external props are used.

  const fetchItemsRef = async () => {
    try {
      const response = await axiosInstance.get(`${API_PATHS.ITEM.GET_DATA}?isActive=all`);
      if (response.data) {
        setItemsData(response.data.data || []);
      }
    } catch (error) {
      console.log("Something went wrong.", error);
    }
  };

  const handleAddItem = async (itemData) => {
    try {
      setLoading(true);
      await axiosInstance.post(API_PATHS.ITEM.ADD_DATA, itemData);
      setOpenAddModal(false);
      toast.success("Item added successfully");
      fetchItemsRef();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to add item");
      console.error('Error adding item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditItem = async (id, itemData) => {
    try {
      setLoading(true);
      await axiosInstance.put(`${API_PATHS.ITEM.UPDATE_DATA}/${id}`, itemData);
      setOpenEditModal(false);
      toast.success("Item updated successfully");
      fetchItemsRef();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update item");
      console.error('Error updating item:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleStatus = async (item) => {
    const currentActive = item.isActive !== false;
    const newActive = !currentActive;

    // Optimistic UI update
    setItemsData((prev) =>
      prev.map((it) => (it._id === item._id ? { ...it, isActive: newActive } : it))
    );

    try {
      await axiosInstance.put(`${API_PATHS.ITEM.UPDATE_STATUS}/${item._id}/status`, {
        isActive: newActive,
      });
      toast.success(`Item "${item.name}" marked as ${newActive ? 'Active' : 'Inactive'}`);
    } catch (error) {
      // Revert optimistic update
      setItemsData((prev) =>
        prev.map((it) => (it._id === item._id ? { ...it, isActive: currentActive } : it))
      );
      toast.error(error?.response?.data?.message || "Failed to update item status");
      console.error('Error toggling status:', error);
    }
  };

  const openEdit = (item) => {
    setSelectedItem(item);
    setOpenEditModal(true);
  };

  const activeCount = itemsData.filter((i) => i.isActive !== false).length;
  const inactiveCount = itemsData.filter((i) => i.isActive === false).length;

  const filteredItems = itemsData.filter((item) => {
    if (statusFilter === 'active') return item.isActive !== false;
    if (statusFilter === 'inactive') return item.isActive === false;
    return true;
  });

  return (
    <DashboardLayout activeMenu="Items">
      {loading && <LoadingOverlay />}
      <div className="my-5 mx-auto">
        <div className='grid grid-cols-1 gap-6'>
          <div className=''>
            <div className="card bg-white p-6 rounded-lg shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h5 className="text-lg font-medium text-gray-800">Items</h5>
                  <p className="text-xs text-gray-500 mt-1">
                    Manage your items inventory and availability
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex bg-gray-100 p-1 rounded-lg text-xs font-medium">
                    <button
                      type="button"
                      onClick={() => setStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                        statusFilter === 'all'
                          ? 'bg-white text-gray-900 shadow-xs'
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      All ({itemsData.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('active')}
                      className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                        statusFilter === 'active'
                          ? 'bg-emerald-500 text-white shadow-xs'
                          : 'text-gray-500 hover:text-emerald-600'
                      }`}
                    >
                      Active ({activeCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter('inactive')}
                      className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
                        statusFilter === 'inactive'
                          ? 'bg-rose-500 text-white shadow-xs'
                          : 'text-gray-500 hover:text-rose-600'
                      }`}
                    >
                      Inactive ({inactiveCount})
                    </button>
                  </div>
                  <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors cursor-pointer" onClick={() => setOpenAddModal(true)}>
                    <LuPlus className="text-lg" />
                    Add Item
                  </button>
                </div>
              </div>
              <div className="mt-6">
                <div className="overflow-x-auto">
                  <table className="table-auto min-w-full border-collapse border border-gray-200 text-sm text-left text-gray-700">
                    <thead className="bg-gray-100 text-xs text-gray-700 uppercase">
                      <tr>
                        <th className="px-4 py-3 border border-gray-200">Item Code</th>
                        <th className="px-4 py-3 border border-gray-200">Name</th>
                        <th className="px-4 py-3 border border-gray-200">Brand</th>
                        <th className="px-4 py-3 border border-gray-200">Company</th>
                        <th className="px-4 py-3 border border-gray-200">Pack</th>
                        <th className="px-4 py-3 border border-gray-200">Market</th>
                        <th className="px-4 py-3 border border-gray-200">Status</th>
                        <th className="px-4 py-3 border border-gray-200 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.length > 0 ? (
                        filteredItems.map((item) => (
                          <tr key={item._id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                            <td className="px-4 py-3 border border-gray-200 font-mono text-xs">{item.itemCode}</td>
                            <td className="px-4 py-3 border border-gray-200 font-medium text-gray-900">{item.name}</td>
                            <td className="px-4 py-3 border border-gray-200">{item.brand}</td>
                            <td className="px-4 py-3 border border-gray-200">{item.company?.name || 'N/A'}</td>
                            <td className="px-4 py-3 border border-gray-200">{item.pack?.name || 'N/A'}</td>
                            <td className="px-4 py-3 border border-gray-200 capitalize">{item.market}</td>
                            <td className="px-4 py-3 border border-gray-200">
                              <button
                                type="button"
                                role="switch"
                                aria-checked={item.isActive !== false}
                                onClick={() => handleToggleStatus(item)}
                                className="inline-flex items-center gap-2 group cursor-pointer focus:outline-none"
                                title={`Click to mark as ${item.isActive !== false ? 'Inactive' : 'Active'}`}
                              >
                                <span
                                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                                    item.isActive !== false ? 'bg-emerald-500' : 'bg-gray-300'
                                  }`}
                                >
                                  <span
                                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                      item.isActive !== false ? 'translate-x-4' : 'translate-x-0'
                                    }`}
                                  />
                                </span>
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                    item.isActive !== false
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-rose-50 text-rose-600 border border-rose-200'
                                  }`}
                                >
                                  {item.isActive !== false ? 'Active' : 'Inactive'}
                                </span>
                              </button>
                            </td>
                            <td className="px-4 py-3 border border-gray-200 text-center">
                              <button
                                onClick={() => openEdit(item)}
                                className="text-blue-500 hover:text-blue-700 transition-colors p-1 rounded hover:bg-blue-50 cursor-pointer"
                                title="Edit item"
                              >
                                <LuPencil className="text-lg" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="8" className="text-center py-8 text-gray-500">
                            No {statusFilter !== 'all' ? statusFilter : ''} items found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>

        <Modal
          isOpen={openAddModal}
          onClose={() => setOpenAddModal(false)}
          title="Add Item"
        >
          <AddItemForm
            onAddItem={handleAddItem}
            loading={loading}
            companies={companies}
            packs={packs}
          />
        </Modal>

        <Modal
          isOpen={openEditModal}
          onClose={() => setOpenEditModal(false)}
          title="Edit Item"
        >
          <EditItemForm
            initialData={selectedItem}
            onEditItem={handleEditItem}
            loading={loading}
            companies={companies}
            packs={packs}
          />
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default Items;
