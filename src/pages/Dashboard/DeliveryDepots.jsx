import React, { useEffect, useState } from 'react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import axiosInstance from '../../utils/axiosInstance';
import { API_PATHS } from '../../utils/apiPaths';
import Modal from '../../components/Modal/Modal';
import AddDeliveryForm from '../../components/DeliveryDepots/AddDeliveryForm';
import EditDeliveryForm from '../../components/DeliveryDepots/EditDeliveryForm';
import toast from 'react-hot-toast';
import { LuPlus, LuPencil } from 'react-icons/lu';
import LoadingOverlay from '../../components/LoadingOverlay';

const DeliveryDepots = () => {
  const [openAddModal, setOpenAddModal] = useState(false);
  const [openEditModal, setOpenEditModal] = useState(false);
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [deliveriesData, setDeliveriesData] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDeliveries = async () => {
      if (loading) return;
      setLoading(true);

      try {
        const response = await axiosInstance.get(API_PATHS.DELIVERY.GET_DATA);
        if (response.data) {
          setDeliveriesData(response.data.data || []);
        }
      } catch (error) {
        console.log("Something went wrong.", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveries();
  }, []);

  const fetchDeliveriesRef = async () => {
    try {
      const response = await axiosInstance.get(API_PATHS.DELIVERY.GET_DATA);
      if (response.data) {
        setDeliveriesData(response.data.data || []);
      }
    } catch (error) {
      console.log("Something went wrong.", error);
    }
  };

  const handleAddDelivery = async (deliveryData) => {
    try {
      setLoading(true);
      await axiosInstance.post(API_PATHS.DELIVERY.ADD_DATA, deliveryData);
      setOpenAddModal(false);
      toast.success("Delivery depot added successfully");
      fetchDeliveriesRef();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to add delivery depot");
      console.error('Error adding delivery depot:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditDelivery = async (id, deliveryData) => {
    try {
      setLoading(true);
      await axiosInstance.put(`${API_PATHS.DELIVERY.UPDATE_DATA}/${id}`, deliveryData);
      setOpenEditModal(false);
      toast.success("Delivery depot updated successfully");
      fetchDeliveriesRef();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update delivery depot");
      console.error('Error updating delivery depot:', error);
    } finally {
      setLoading(false);
    }
  };

  const openEdit = (delivery) => {
    setSelectedDelivery(delivery);
    setOpenEditModal(true);
  };

  return (
    <DashboardLayout activeMenu="Delivery Depots">
      {loading && <LoadingOverlay />}
      <div className="my-5 mx-auto">
        <div className='grid grid-cols-1 gap-6'>
          <div className=''>
            <div className="card bg-white p-6 rounded-lg shadow-sm">
              <div className="flex items-center justify-between border-b pb-4">
                <div>
                  <h5 className="text-lg font-medium text-gray-800">Delivery Depots</h5>
                  <p className="text-xs text-gray-500 mt-1">
                    Manage your delivery depot locations
                  </p>
                </div>
                <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:bg-primary-dark transition-colors" onClick={() => setOpenAddModal(true)}>
                  <LuPlus className="text-lg" />
                  Add Depot
                </button>
              </div>
              <div className="mt-6">
                <div className="overflow-x-auto">
                  <table className="table-auto min-w-full border-collapse border border-gray-200 text-sm text-left text-gray-700">
                    <thead className="bg-gray-100 text-xs text-gray-700 uppercase">
                      <tr>
                        <th className="px-4 py-3 border border-gray-200">Name</th>
                        <th className="px-4 py-3 border border-gray-200">Code</th>
                        <th className="px-4 py-3 border border-gray-200">Address</th>
                        <th className="px-4 py-3 border border-gray-200 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveriesData.length > 0 ? (
                        deliveriesData.map((delivery) => (
                          <tr key={delivery._id} className="bg-white border-b hover:bg-gray-50">
                            <td className="px-4 py-3 border border-gray-200">{delivery.name}</td>
                            <td className="px-4 py-3 border border-gray-200">{delivery.code}</td>
                            <td className="px-4 py-3 border border-gray-200">{delivery.address}</td>
                            <td className="px-4 py-3 border border-gray-200 text-center">
                              <button 
                                onClick={() => openEdit(delivery)}
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
                            No delivery depots found
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
          title="Add Delivery Depot"
        >
          <AddDeliveryForm onAddDelivery={handleAddDelivery} loading={loading} />
        </Modal>

        <Modal 
          isOpen={openEditModal} 
          onClose={() => setOpenEditModal(false)}
          title="Edit Delivery Depot"
        >
          <EditDeliveryForm initialData={selectedDelivery} onEditDelivery={handleEditDelivery} loading={loading} />
        </Modal>
      </div>
    </DashboardLayout>
  );
};

export default DeliveryDepots;
