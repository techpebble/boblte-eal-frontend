import React, { useEffect, useState } from 'react'
import { LuPlus, LuTrash2 } from 'react-icons/lu';
import ReactSelect from 'react-select';
import Input from '../inputs/Input';
import Select from '../inputs/Select';
import { selectStyles } from '../inputs/selectStyles';
import FormSection from '../inputs/FormSection';
import { API_PATHS } from '../../utils/apiPaths';
import axiosInstance from '../../utils/axiosInstance';
import { formatDateToYYYYMMDD } from '../../utils/helper';
import { formatQuantity, itemLabel } from '../Dashboard/dashboardFormat';

const headerCell =
    'bg-[#FAFAF8] px-3.5 pt-[11px] pb-2.5 text-left text-[11px] font-semibold tracking-[0.07em] text-[#5A636D] uppercase whitespace-nowrap';
const bodyCell = 'border-t border-[#EDECE8] px-3.5 py-2.5 text-[13px] text-[#2A2F36]';

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

    // Get the items that belong to the chosen company and market
    const fetchItems = async () => {

        try {
            const activeFilter = dispatchDetails?._id ? '' : '&isActive=true';
            const para = '?' + (Dispatch.company ? 'company=' + Dispatch.company : '') + (Dispatch.market ? '&market=' + Dispatch.market : '') + activeFilter;
            const response = await axiosInstance.get(API_PATHS.ITEM.GET_DATA + para);
            if (response.data) {
                const itemOptions = response.data.data.map((item) => ({
                    value: item._id,
                    label: itemLabel(item),
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

    const editing = Boolean(dispatchDetails?._id);
    const filledLines = Dispatch.items.filter(
        (line) => (line.item?._id || line.item) && Number(line.quantityInCases) > 0
    ).length;
    const ready = Boolean(
        Dispatch.company && Dispatch.market && Dispatch.deliveryTo && Dispatch.dateDispatched && filledLines > 0
    );

    return (
        <div className="font-ui flex flex-col gap-5">
            <div>
                <h2 className="m-0 text-[19px] font-semibold tracking-[-0.018em]">
                    {editing ? 'Update dispatch note' : 'New dispatch note'}
                </h2>
                <p className="mt-1.5 mb-0 text-[12.5px] text-[#5A636D]">
                    What is going out and where to. Serial ranges are linked afterwards,
                    once the note is finalised.
                </p>
            </div>

            <FormSection title="Destination">
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                    <Select
                        label="Company"
                        disabled={editing}
                        searchable={false}
                        placeholder="Select a Company"
                        value={Dispatch.company}
                        onChange={({ target }) => handleChange('company', target.value)}
                        options={companies}
                        hint={editing ? 'Fixed once the note exists' : undefined}
                    />
                    <Select
                        label="Market"
                        disabled={editing}
                        searchable={false}
                        placeholder="Select a Market"
                        value={Dispatch.market}
                        onChange={({ target }) => handleChange('market', target.value)}
                        options={markets}
                        hint={editing ? 'Fixed once the note exists' : undefined}
                    />
                    <Input
                        value={Dispatch.dateDispatched}
                        onChange={({ target }) => handleChange('dateDispatched', target.value)}
                        label="Dispatch date"
                        type="date"
                    />
                    <Select
                        label="Delivery depot"
                        searchable
                        placeholder="Select Delivery Depot"
                        value={Dispatch.deliveryTo}
                        onChange={({ target }) => handleChange('deliveryTo', target.value)}
                        options={deliveryLocations}
                    />
                </div>
            </FormSection>

            <FormSection
                title="Items"
                description={
                    products.length === 0
                        ? 'Choose a company and market first — the items offered depend on them.'
                        : 'Quantities are in cases.'
                }
            >
                <div className="overflow-hidden rounded-xl border border-[#E3E2DE]">
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[520px] border-collapse">
                            <thead>
                                <tr>
                                    <th className={`${headerCell} w-10 pl-4`}>#</th>
                                    <th className={headerCell}>Item</th>
                                    <th className={`${headerCell} w-[140px] text-right`}>Cases</th>
                                    <th className={`${headerCell} w-14`} />
                                </tr>
                            </thead>
                            <tbody>
                                {Dispatch.items.map((itemForm, index) => (
                                    <tr key={index}>
                                        <td className={`${bodyCell} font-numeric pl-4 text-[#5A636D] tabular-nums`}>
                                            {index + 1}
                                        </td>
                                        <td className={bodyCell}>
                                            <ReactSelect
                                                value={itemForm.item._id ? products.find(p => p.value === itemForm.item._id) || null : products.find(p => p.value === itemForm.item) || null}
                                                onChange={(selected) => handleItemChange(index, 'item', selected ? selected.value : '')}
                                                options={products}
                                                placeholder="Select Item"
                                                isSearchable
                                                isDisabled={products.length === 0}
                                                styles={selectStyles}
                                            />
                                        </td>
                                        <td className={bodyCell}>
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                placeholder="0"
                                                aria-label={`Cases for line ${index + 1}`}
                                                className="font-numeric h-[38px] w-full rounded-lg border border-[#D7D6D1] bg-white px-[11px] text-right text-[13.5px] tabular-nums text-[#15181C] outline-none focus:border-[#15594A] focus:ring-[3px] focus:ring-[#E7F0EC]"
                                                value={itemForm.quantityInCases}
                                                onChange={({ target }) => handleItemChange(index, 'quantityInCases', target.value)}
                                            />
                                        </td>
                                        <td className={`${bodyCell} text-center`}>
                                            <button
                                                type="button"
                                                aria-label={`Remove line ${index + 1}`}
                                                onClick={() => handleRemoveItem(index)}
                                                className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[#5A636D] hover:bg-[#FCEBEA] hover:text-[#9B2C2C]"
                                            >
                                                <LuTrash2 />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colSpan={2} className="border-t border-[#DEDDD8] bg-[#FAFAF8] px-3.5 py-3 text-right text-[13px] font-semibold text-[#3C434B]">
                                        Total
                                    </td>
                                    <td className="font-numeric border-t border-[#DEDDD8] bg-[#FAFAF8] px-3.5 py-3 text-right text-[13px] font-semibold tabular-nums">
                                        {formatQuantity(getTotalQuantity())}
                                    </td>
                                    <td className="border-t border-[#DEDDD8] bg-[#FAFAF8]" />
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div className="border-t border-[#EDECE8] px-3.5 py-2.5">
                        <button
                            type="button"
                            onClick={handleAddItem}
                            disabled={products.length === 0}
                            className="flex h-8 cursor-pointer items-center gap-[7px] rounded-[7px] border border-dashed border-[#D7D6D1] px-3 text-[12.5px] font-medium text-[#2A2F36] hover:bg-[#FAFAF8] disabled:cursor-not-allowed disabled:text-[#A8ADB5]"
                        >
                            <LuPlus />
                            Add another item
                        </button>
                    </div>
                </div>
            </FormSection>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#EDECE8] pt-4">
                <p className="m-0 mr-auto text-[11.5px] text-[#5A636D]">
                    {filledLines === 0
                        ? 'Add at least one item with a quantity.'
                        : `${filledLines} ${filledLines === 1 ? 'line' : 'lines'} · ${formatQuantity(getTotalQuantity())} cases`}
                </p>
                <button
                    type="button"
                    disabled={!ready}
                    className="h-9 cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] px-4 text-[13px] font-semibold text-white hover:bg-[#124C3F] disabled:cursor-not-allowed disabled:border-[#E3E2DE] disabled:bg-[#F2F1ED] disabled:text-[#A8ADB5]"
                    onClick={() => onSubmitDispatch(Dispatch)}
                >
                    {editing ? 'Update dispatch' : 'Create dispatch note'}
                </button>
            </div>
        </div>
    )
}

export default AddDispatchForm
