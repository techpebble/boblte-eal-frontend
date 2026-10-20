import React, { useEffect, useMemo, useState } from 'react'
import Input from '../inputs/Input';
import Select from '../inputs/Select';
import FormSection from '../inputs/FormSection';
import ValidationList from '../inputs/ValidationList';
import { API_PATHS } from '../../utils/apiPaths';
import axiosInstance from '../../utils/axiosInstance';
import { formatQuantity, itemLabel } from '../Dashboard/dashboardFormat';

function AddEALUsageForm({ onAddEALUsage }) {
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
        item: '',
        pack: '',
        usedQuantityInCases: '',
        prefix: '',
        serialFrom: '',
        serialTo: '',
        usedQuantity: ''
    });

    const handleChange = (key, value) => setEALIssuance({ ...EALIssuance, [key]: value });

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

    // Get the items that match the company, market and pack already chosen
    const fetchItems = async () => {

        try {
            const para = '?isActive=true' + (EALIssuance.company ? '&company=' + EALIssuance.company : '') + (EALIssuance.market ? '&market=' + EALIssuance.market : '') + (EALIssuance.pack ? '&pack=' + EALIssuance.pack : '');
            const response = await axiosInstance.get(API_PATHS.ITEM.GET_DATA + para);
            if (response.data) {
                const itemOptions = response.data.data.map((item) => ({
                    value: item._id,
                    label: itemLabel(item),
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
        return () => { }
    }, [])

    const selectedPack = packs.find((option) => option.value === EALIssuance.pack) || null;

    useEffect(() => {
        // The pack may be set before its options have arrived, so this has to
        // tolerate not finding one rather than reading through undefined.
        if (!selectedPack) return
        const usedQuantity = selectedPack.bottlesPerCase * Number(EALIssuance.usedQuantityInCases || 0);
        handleChange('usedQuantity', usedQuantity || '')
    }, [EALIssuance.usedQuantityInCases, selectedPack])

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

    const checks = useMemo(() => {
        const from = Number(EALIssuance.serialFrom);
        const to = Number(EALIssuance.serialTo);
        const tenDigits = /^\d{10}$/.test(EALIssuance.serialFrom) && /^\d{10}$/.test(EALIssuance.serialTo);
        const count = tenDigits && to >= from ? to - from + 1 : 0;
        const perCase = selectedPack?.bottlesPerCase || 0;
        const expected = Number(EALIssuance.usedQuantity) || 0;

        return [
            { ok: /^[A-Z]{3}$/.test(EALIssuance.prefix.trim()), text: 'Prefix is three uppercase letters.' },
            { ok: tenDigits, text: 'Both serials are ten digits.' },
            {
                ok: count > 0 && expected > 0 && count === expected,
                text: `The range covers exactly the labels the cases need${expected ? ` (${formatQuantity(expected)})` : ''}.`
            },
            {
                ok: perCase > 0 && count > 0 && count % perCase === 0 && to % perCase === 0 && (from - 1) % perCase === 0,
                text: `The range closes on a whole case of ${perCase || '—'}.`
            }
        ];
    }, [EALIssuance.serialFrom, EALIssuance.serialTo, EALIssuance.prefix, EALIssuance.usedQuantity, selectedPack]);

    const ready = Boolean(
        EALIssuance.company &&
        EALIssuance.market &&
        EALIssuance.pack &&
        EALIssuance.item &&
        EALIssuance.dateUsed &&
        Number(EALIssuance.usedQuantityInCases) > 0 &&
        checks.every((check) => check.ok)
    );

    return (
        <div className="font-ui flex flex-col gap-5">
            <div>
                <h2 className="m-0 text-[19px] font-semibold tracking-[-0.018em]">Record EAL usage</h2>
                <p className="mt-1.5 mb-0 text-[12.5px] text-[#5A636D]">
                    The labels applied on the line, and the cases they produced.
                </p>
            </div>

            <FormSection title="Production run">
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                    <Select
                        label="Company"
                        placeholder="Select a Company"
                        value={EALIssuance.company}
                        onChange={({ target }) => handleChange('company', target.value)}
                        options={companies}
                    />
                    <Select
                        label="Market"
                        placeholder="Select a Market"
                        value={EALIssuance.market}
                        onChange={({ target }) => handleChange('market', target.value)}
                        options={markets}
                    />
                    <Select
                        label="Pack"
                        placeholder="Select a Pack"
                        value={EALIssuance.pack}
                        onChange={({ target }) => handleChange('pack', target.value)}
                        options={packs}
                        hint={selectedPack ? `${selectedPack.bottlesPerCase} bottles per case` : undefined}
                    />
                    <Input
                        value={EALIssuance.dateUsed}
                        onChange={({ target }) => handleChange('dateUsed', target.value)}
                        label="Used date"
                        type="date"
                    />
                    <Select
                        label="Item"
                        placeholder={items.length ? 'Select an Item' : 'Pick company, market and pack first'}
                        value={EALIssuance.item}
                        onChange={({ target }) => handleChange('item', target.value)}
                        options={items}
                        searchable
                        disabled={items.length === 0}
                    />
                    <Input
                        value={EALIssuance.usedQuantityInCases}
                        onChange={({ target }) => handleChange('usedQuantityInCases', target.value)}
                        label="Cases produced"
                        placeholder="In cases"
                        type="text"
                        mono
                    />
                </div>
            </FormSection>

            <FormSection title="Serial range">
                <div className="flex flex-wrap items-start gap-3.5">
                    <div className="flex-[0_0_108px]">
                        <Input
                            value={EALIssuance.prefix}
                            onChange={({ target }) => handleChange('prefix', target.value.toUpperCase())}
                            label="Prefix"
                            placeholder="ABC"
                            type="text"
                            mono
                            className="uppercase tracking-[0.08em]"
                        />
                    </div>
                    <div className="min-w-0 flex-[1_1_160px]">
                        <Input
                            value={EALIssuance.serialFrom}
                            onChange={({ target }) => handleChange('serialFrom', target.value)}
                            label="Serial from"
                            placeholder="10 digits"
                            type="text"
                            mono
                        />
                    </div>
                    <div className="min-w-0 flex-[1_1_160px]">
                        <Input
                            value={EALIssuance.serialTo}
                            onChange={({ target }) => handleChange('serialTo', target.value)}
                            label="Serial to"
                            placeholder="10 digits"
                            type="text"
                            mono
                        />
                    </div>
                    <div className="flex-[0_0_150px]">
                        <Input
                            value={EALIssuance.usedQuantity ? formatQuantity(EALIssuance.usedQuantity) : ''}
                            label="Labels needed"
                            placeholder="—"
                            type="text"
                            readOnly
                            hint="Cases × bottles per case"
                        />
                    </div>
                </div>

                <ValidationList checks={checks} className="mt-3.5" />
            </FormSection>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#EDECE8] pt-4">
                <p className="m-0 mr-auto text-[11.5px] text-[#5A636D]">
                    This draws the range down from its issuance.
                </p>
                <button
                    type="button"
                    disabled={!ready}
                    className="h-9 cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] px-4 text-[13px] font-semibold text-white hover:bg-[#124C3F] disabled:cursor-not-allowed disabled:border-[#E3E2DE] disabled:bg-[#F2F1ED] disabled:text-[#A8ADB5]"
                    onClick={() => onAddEALUsage(EALIssuance)}
                >
                    Record usage
                </button>
            </div>
        </div>
    )
}

export default AddEALUsageForm
