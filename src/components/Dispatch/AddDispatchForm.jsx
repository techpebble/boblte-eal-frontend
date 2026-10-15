import React, { useEffect, useState } from 'react'
import Input from '../inputs/Input';
import Select from '../inputs/Select';
import { API_PATHS } from '../../utils/apiPaths';
import axiosInstance from '../../utils/axiosInstance';
import { formatDateToYYYYMMDD } from '../../utils/helper';
import ReactSelect from 'react-select';

function AddDispatchForm({ onSubmitDispatch, dispatchDetails }) {
    const [companies, setcompanies] = useState([]);
    const [deliveryLocations, setDeliveryLocations] = useState([]);
    const [loading, setloading] = useState(false);

    const markets = [
        { value: 'local', label: 'Local' },
        { value: 'export', label: 'Export' },
    ];

    const [products, setProducts] = useState([]);

    const [Dispatch, setDispatch] = useState({
        _id: dispatchDetails._id ? dispatchDetails._id : '',
        company: dispatchDetails.company ? dispatchDetails.company._id : '',
        market: dispatchDetails.market ? dispatchDetails.market : '',
        dateDispatched: dispatchDetails.dateDispatched ? formatDateToYYYYMMDD(dispatchDetails.dateDispatched) : formatDateToYYYYMMDD(new Date()),
        deliveryTo: dispatchDetails.deliveryTo ? dispatchDetails.deliveryTo._id : '',
        items: dispatchDetails.items ? dispatchDetails.items : [],
    });

    useEffect(() => {
        fetchCompanies();
        fetchDelivery();
    }, []);

    const handleChange = (key, value) => {
        setDispatch({ ...Dispatch, [key]: value });
    };

    const handleAddItem = () => {
        const updated = [...Dispatch.items, { item: '', quantityInCases: '' }];
        setDispatch({ ...Dispatch, items: updated });
    };

    const handleRemoveItem = (index) => {
        const updated = Dispatch.items.filter((_, i) => i !== index);
        setDispatch({ ...Dispatch, items: updated });
    };

    const handleItemChange = (index, field, value) => {
        const updated = [...Dispatch.items];
        updated[index][field] = value;
        setDispatch({ ...Dispatch, items: updated });
    };

    // Get all companies
    const fetchCompanies = async () => {
        if (loading) return;

        try {
            const response = await axiosInstance.get(API_PATHS.COMPANY.GET_DATA);
            if (response.data) {
                const companyOptions = response.data.data.map((company) => ({
                    value: company._id,
                    label: company.name,
                }));
                setcompanies(companyOptions);
            }

        } catch (error) {
            console.log("Something went wrong. Please try again.", error)
        } finally {
            setloading(false);
        }
    }

    // Get all delivery
    const fetchDelivery = async () => {
        if (loading) return;

        try {
            const response = await axiosInstance.get(API_PATHS.DELIVERY.GET_DATA);
            if (response.data) {
                const deliveryOptions = response.data.data.map((delivery) => ({
                    value: delivery._id,
                    label: delivery.name,
                }));
                setDeliveryLocations(deliveryOptions);
            }

        } catch (error) {
            console.log("Something went wrong. Please try again.", error)
        } finally {
            setloading(false);
        }
    }

    // Get all companies
    const fetchItems = async () => {

        try {
            const activeFilter = dispatchDetails?._id ? '' : '&isActive=true';
            const para = '?' + (Dispatch.company ? 'company=' + Dispatch.company : '') + (Dispatch.market ? '&market=' + Dispatch.market : '') + activeFilter;
            const response = await axiosInstance.get(API_PATHS.ITEM.GET_DATA + para);
            if (response.data) {
                const itemOptions = response.data.data.map((item) => ({
                    value: item._id,
                    label: item.name,
                }));
                setProducts(itemOptions);
                if (Dispatch.items.length === 0) {
                    handleAddItem();
                }

            }

        } catch (error) {
            console.log("Something went wrong. Please try again.", error)
        } finally {
            setloading(false);
        }
    }

    const getTotalQuantity = () => {
        return Dispatch.items.reduce((total, item) => {
            const qty = parseFloat(item.quantityInCases);
            return total + (isNaN(qty) ? 0 : qty);
        }, 0);
    };

    useEffect(() => {
        if (Dispatch.items.length > 0 && !dispatchDetails?._id) {
            Dispatch.items = [];
            handleAddItem();
        }
        // Check if all two required fields are selected
        if (Dispatch.company && Dispatch.market) {
            fetchItems();
        } else {
            // Clear items if not all dependencies are selected
            setProducts([]);
        }
    }, [Dispatch.company, Dispatch.market]);

    return (
        <div className="space-y-4">
            {/* Row 1: Company (6/12) & Market (6/12) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6">
                    <Select
                        label="Company"
                        disabled={dispatchDetails?._id ? 'disabled' : ''}
                        searchable={false}
                        placeholder="Select a Company"
                        value={Dispatch.company}
                        onChange={({ target }) => handleChange('company', target.value)}
                        options={companies}
                    />
                </div>
                <div className="md:col-span-6">
                    <Select
                        label="Market"
                        disabled={dispatchDetails?._id ? 'disabled' : ''}
                        searchable={false}
                        placeholder="Select a Market"
                        value={Dispatch.market}
                        onChange={({ target }) => handleChange('market', target.value)}
                        options={markets}
                    />
                </div>
            </div>

            {/* Row 2: Issued Date (6/12) & Pack Size (6/12) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-6">
                    <Input
                        value={Dispatch.dateDispatched}
                        onChange={({ target }) => handleChange('dateDispatched', target.value)}
                        label="Dispatched Date"
                        placeholder="DD/MM/YYYY"
                        type="date"
                    />
                </div>
                <div className="md:col-span-6">
                    <Select
                        label="Delivery To"
                        searchable={true}
                        placeholder="Select Delivery Depot"
                        value={Dispatch.deliveryTo}
                        onChange={({ target }) => handleChange('deliveryTo', target.value)}
                        options={deliveryLocations}
                    />
                </div>
            </div>

            <div>
                <h3 className='text-lg font-medium text-gray-900'>
                    Items
                </h3>
            </div>

            <table className="table-auto min-w-full border border-gray-200 text-sm text-left text-gray-700">
                <thead className="bg-gray-100 text-xs text-gray-700 uppercase">
                    <tr>
                        <th className="w-1/12 px-4 py-3 border">Si. No.</th>
                        <th className="w-6/12 px-4 py-3 border">Item</th>
                        <th className="w-3/12 px-4 py-3 border">Quantity</th>
                        <th className="w-2/12 px-4 py-3 border">Delete</th>
                    </tr>
                </thead>
                <tbody>
                    {Dispatch.items.map((itemForm, index) => (
                        <tr key={index} className="bg-white border-b hover:bg-gray-50">
                            <td className='px-4 py-3 border'>{index + 1}</td>
                            <td className='px-4 py-3 border'>
                                <ReactSelect
                                    value={itemForm.item._id ? products.find(p => p.value === itemForm.item._id) || null : products.find(p => p.value === itemForm.item) || null}
                                    onChange={(selected) => handleItemChange(index, 'item', selected ? selected.value : '')}
                                    options={products}
                                    placeholder="Select Item"
                                    isSearchable
                                    styles={{
                                        control: (base) => ({
                                            ...base,
                                            backgroundColor: 'transparent',
                                            borderColor: '#d1d5db', // Tailwind's gray-300
                                            border: 0,
                                            minHeight: '36px',
                                            fontSize: '0.875rem',
                                        }),
                                        menu: (base) => ({
                                            ...base,
                                            zIndex: 100,
                                        }),
                                    }}
                                />
                            </td>
                            <td className='px-4 py-3 border'>
                                <input
                                    type='text'
                                    placeholder='Quantity'
                                    className='w-full bg-transparent outline-none'
                                    value={itemForm.quantityInCases}
                                    onChange={({ target }) => handleItemChange(index, 'quantityInCases', target.value)}
                                />
                            </td>
                            <td className='px-4 py-3 border text-center text-red-600 cursor-pointer' onClick={() => handleRemoveItem(index)}>
                                ❌
                            </td>
                        </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold">
                        <td colSpan="2" className="px-4 py-3 border text-right">Total</td>
                        <td className="px-4 py-3 border">{getTotalQuantity()}</td>
                        <td className="px-4 py-3 border"></td>
                    </tr>
                </tbody>

            </table>

            <div className="flex justify-between mt-4">
                <button
                    type="button"
                    className="text-blue-600 underline"
                    onClick={handleAddItem}
                    disabled={products.length === 0}
                >
                    + Add another item
                </button>

                <button
                    type="button"
                    className="add-btn add-btn-fill"
                    onClick={() => onSubmitDispatch(Dispatch)}
                >
                    {dispatchDetails?._id ? 'Update Dispatch' : 'Add Dispatch'}
                </button>
            </div>

        </div>
    )
}

export default AddDispatchForm