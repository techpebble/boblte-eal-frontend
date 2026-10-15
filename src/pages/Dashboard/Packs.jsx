import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import Modal from '../../components/Modal/Modal';
import AddPackForm from '../../components/Packs/AddPackForm';
import EditPackForm from '../../components/Packs/EditPackForm';
import toast from 'react-hot-toast';
import { LuPlus, LuPencil } from 'react-icons/lu';
import LoadingOverlay from '../../components/LoadingOverlay';

const Packs = () => {
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedPack, setSelectedPack] = useState(null);
  const [packsData, setPacksData] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchPacks = async () => {
    if (loading) return;
    setLoading(true);

    try {
      const response = await axiosInstance.get(API_PATHS.PACK.GET_DATA);
      if (response.data) {
        setPacksData(response.data.data || []);
      }
    } catch (error) {
      console.log("Something went wrong.", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPacks();
  }, []);

  const handleAddPack = async (packData) => {
    try {
      setLoading(true);
      await axiosInstance.post(API_PATHS.PACK.ADD_DATA, packData);
      setOpenAddModal(false);
      toast.success("Pack added successfully");
      fetchPacks();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to add pack");
      console.error('Error adding pack:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditPack = async (id, packData) => {
    try {
      setLoading(true);
      await axiosInstance.put(`${API_PATHS.PACK.UPDATE_DATA}/${id}`, packData);
      setOpenEditModal(false);
      toast.success("Pack updated successfully");
      fetchPacks();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update pack");
      console.error('Error updating pack:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (pack) => {
    setSelectedPack(pack);
    setOpenEditModal(true);
  };

  return (
    <DashboardLayout activeMenu="Packs">
      {loading && <LoadingOverlay />}
      <div className="my-5 mx-auto">
        <div className='grid grid-cols-1 gap-6'>
          <div className=''>
            <div className="card bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h5 className="text-lg font-medium text-gray-800">Packs</h5>
                  <p className="text-xs text-gray-500 mt-1">
                    Manage your pack configurations
                  </p>
                </div>
                <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors" onClick={() => setOpenAddModal(true)}>
                  <LuPlus className="text-lg" />
                  Add Pack
                </button>
              </div>
              <div className="mt-6">
                <div className="overflow-x-auto">
                  <table className="table-auto min-w-full border-collapse border border-gray-200 text-sm text-left text-gray-700">
                    <thead className="bg-gray-100 text-xs text-gray-700 uppercase">
                      <tr>
                        <th className="px-4 py-3 border border-gray-200">Name</th>
                        <th className="px-4 py-3 border border-gray-200">Bottles per Case</th>
                        <th className="px-4 py-3 border border-gray-200">Pack (ml)</th>
                        <th className="px-4 py-3 border border-gray-200 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {packsData.length > 0 ? (
                        packsData.map((pack) => (
                          <tr key={pack._id} className="bg-white border-b hover:bg-gray-50">
                            <td className="px-4 py-3 border border-gray-200">{pack.name}</td>
                            <td className="px-4 py-3 border border-gray-200">{pack.bottlesPerCase}</td>
                            <td className="px-4 py-3 border border-gray-200">{pack.pack}</td>
                            <td className="px-4 py-3 border border-gray-200 text-center">
                              <button 
                                onClick={() => openEdit(pack)}
                                className="text-blue-500 hover:text-blue-700 transition-colors"
                              >
                                <LuPencil className="text-lg" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="text-center py-6 text-gray-500">
                            No packs found
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
          title="Add Pack"
        >
          <AddPackForm onAddPack={handleAddPack} loading={loading} />
        </Modal>

        <Modal 
          isOpen={openEditModal} 
          onClose={() => setOpenEditModal(false)}
          title="Edit Pack"
        >
          <EditPackForm initialData={selectedPack} onEditPack={handleEditPack} loading={loading} />
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default Packs;
