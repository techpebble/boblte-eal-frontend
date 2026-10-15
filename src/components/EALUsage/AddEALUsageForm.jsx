import React, { useEffect, useState } from 'react'
import Input from '../inputs/Input';
import Select from '../inputs/Select';
import { API_PATHS } from '../../utils/apiPaths';
import axiosInstance from '../../utils/axiosInstance';

function AddEALUsageForm({onAddEALUsage}) {
    const [companies, setcompanies] = useState([]);
    const [items, setitems] = useState([]);
    const [packs, setpacks] = useState([]);
    const [loading, setloading] = useState(false);
    const markets = [
        { value: 'local', label: 'Local' },
        { value: 'export', label: 'Export' },
    ];

    const [EALIssuance, setEALIssuance] = useState({
        company: '',
        dateUsed: '',
        market: '',
        item:'',
        pack:'',
        usedQuantityInCases:'',
        prefix:'',
        serialFrom:'',
        serialTo:'',
        usedQuantity: ''
    });

    const handleChange = (key, value) => setEALIssuance({...EALIssuance, [key]: value});
    
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

    // Get all companies
    const fetchItems = async () => {
        
        try {
            const para = '?isActive=true' + (EALIssuance.company ? '&company=' + EALIssuance.company : '') + (EALIssuance.market ? '&market=' + EALIssuance.market : '') + (EALIssuance.pack ? '&pack=' + EALIssuance.pack : '');
            const response = await axiosInstance.get(API_PATHS.ITEM.GET_DATA + para);
            if (response.data) {
                const itemOptions = response.data.data.map((item) => ({
                    value: item._id,
                    label: item.name,
                }));
                setitems(itemOptions);
            }

        } catch (error) {
            console.log("Something went wrong. Please try again.", error)
        } finally {
            setloading(false);
        }
    }

    // Get all packs
    const fetchPacks = async () => {
        if (loading) return;

        try {
        const response = await axiosInstance.get(API_PATHS.PACK.GET_DATA);
        if (response.data) {
            const packOptions = response.data.data.map((pack) => ({
                value: pack._id,
                label: pack.name,
                bottlesPerCase: pack.bottlesPerCase
            }));
            setpacks(packOptions);
        }

        } catch (error) {
            console.log("Something went wrong. Please try again.", error)
        } finally {
            setloading(false);
        }
    }

    useEffect(() => {
        fetchCompanies();
        fetchPacks();
        return() => { }
    }, [])

    useEffect(() => {
        if (!EALIssuance.pack) return
        const foundObject = packs.find((obj) => obj.value === EALIssuance.pack);
        const usedQuantity = foundObject.bottlesPerCase * EALIssuance.usedQuantityInCases;
        handleChange('usedQuantity', usedQuantity)
    }, [EALIssuance.usedQuantityInCases, EALIssuance.pack])

    useEffect(() => {
        // Check if all three required fields are selected
        if (EALIssuance.company && EALIssuance.market && EALIssuance.pack) {
            handleChange('item', '')
            fetchItems();
        } else {
            // Clear items if not all dependencies are selected
            setitems([]);
        }
    }, [EALIssuance.company, EALIssuance.market, EALIssuance.pack]);

    return (
        <div className="space-y-4">
            {/* Row 1: Company (6/12) & Market (6/12) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4">
                    <Select
                        label="Company"
                        placeholder="Select a Company"
                        value={EALIssuance.company}
                        onChange={({target}) => handleChange('company', target.value)}
                        options={companies}
                    />
                </div>
                <div className="md:col-span-4">
                    <Select
                        label="Market"
                        placeholder="Select a Market"
                        value={EALIssuance.market}
                        onChange={({target}) => handleChange('market', target.value)}
                        options={markets}
                    />
                </div>
                <div className="md:col-span-4">
                    <Select
                        label="Pack"
                        placeholder="Select a Pack"
                        value={EALIssuance.pack}
                        onChange={({target}) => handleChange('pack', target.value)}
                        options={packs}
                    />
                </div>
            </div>

            {/* Row 2: Issued Date (6/12) & Pack Size (6/12) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-4">
                    <Input
                        value={EALIssuance.dateUsed}
                        onChange={({target}) => handleChange('dateUsed', target.value)}
                        label="Used Date"
                        placeholder="DD/MM/YYYY"
                        type="date"
                    />
                </div>
                <div className="md:col-span-4">
                    <Select
                        label="Item"
                        placeholder="Select a Item"
                        value={EALIssuance.item}
                        onChange={({target}) => handleChange('item', target.value)}
                        options={items}
                    />
                </div>
                <div className="md:col-span-4">
                    <Input
                        value={EALIssuance.usedQuantityInCases}
                        onChange={({target}) => handleChange('usedQuantityInCases', target.value)}
                        label="Quantity Produced"
                        placeholder="In Cases"
                        type="text"
                    />
                </div>
            </div>

            {/* Row 3: Prefix (2/12), Serial From (5/12), Serial To (5/12) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-3">
                    <Input
                        value={EALIssuance.prefix}
                        onChange={({target}) => handleChange('prefix', target.value.toUpperCase())}
                        label="Prefix"
                        placeholder="Prefix (e.g., ABC)"
                        type="text"
                    />
                </div>
                <div className="md:col-span-3">
                    <Input
                        value={EALIssuance.serialFrom}
                        onChange={({target}) => handleChange('serialFrom', target.value)}
                        label="Serial From"
                        placeholder="Serial From (10 digits)"
                        type="text"
                    />
                </div>
                <div className="md:col-span-3">
                    <Input
                        value={EALIssuance.serialTo}
                        onChange={({target}) => handleChange('serialTo', target.value)}
                        label="Serial To"
                        placeholder="Serial To (10 digits)"
                        type="text"
                    />
                </div>
                <div className="md:col-span-3">
                    <Input
                        value={EALIssuance.usedQuantity}
                        label="Quantity Used"
                        placeholder="Quantity"
                        type="text"
                        readOnly
                    />
                </div>
            </div>
            <div>
                <div className="flex justify-end mt-6">
                    <button
                        type="button"
                        className="add-btn add-btn-fill"
                        onClick={()=>onAddEALUsage(EALIssuance) }
                    >
                        Add EAL Usage 
                    </button>
                </div>
            </div>
        </div>
    )
}

export default AddEALUsageForm