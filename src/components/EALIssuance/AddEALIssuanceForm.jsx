import React, { useEffect, useMemo, useState } from 'react'
import Input from '../inputs/Input';
import Select from '../inputs/Select';
import FormSection from '../inputs/FormSection';
import ValidationList from '../inputs/ValidationList';
import { API_PATHS } from '../../utils/apiPaths';
import axiosInstance from '../../utils/axiosInstance';
import { formatQuantity } from '../Dashboard/dashboardFormat';

function AddEALIssuanceForm({ onAddEALIssuance }) {
    const [companies, setcompanies] = useState([]);
    const [packs, setpacks] = useState([]);
    const [loading, setloading] = useState(false);
    const markets = [
        { value: 'local', label: 'Local' },
        { value: 'export', label: 'Export' },
    ];
    const [EALIssuance, setEALIssuance] = useState({
        company: '',
        dateIssued: '',
        market: '',
        pack: '',
        prefix: '',
        serialFrom: '',
        serialTo: '',
        issuedQuantity: ''
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

    // The quantity is the range, so it is worked out rather than typed. Typing
    // it only ever created a second number that had to agree with the first.
    const derived = useMemo(() => {
        const from = Number(EALIssuance.serialFrom);
        const to = Number(EALIssuance.serialTo);
        const tenDigits = /^\d{10}$/.test(EALIssuance.serialFrom) && /^\d{10}$/.test(EALIssuance.serialTo);
        const count = tenDigits && to >= from ? to - from + 1 : 0;
        const perCase = selectedPack?.bottlesPerCase || 0;

        return {
            count,
            cases: perCase > 0 && count > 0 ? count / perCase : 0,
            checks: [
                { ok: /^[A-Z]{3}$/.test(EALIssuance.prefix.trim()), text: 'Prefix is three uppercase letters.' },
                { ok: tenDigits, text: 'Both serials are ten digits.' },
                { ok: count > 0, text: 'Serial to is above serial from.' }
            ]
        };
    }, [EALIssuance.serialFrom, EALIssuance.serialTo, EALIssuance.prefix, selectedPack]);

    // Keep the payload the page and API expect.
    useEffect(() => {
        setEALIssuance((previous) => ({ ...previous, issuedQuantity: derived.count || '' }));
    }, [derived.count]);

    const ready = Boolean(
        EALIssuance.company &&
        EALIssuance.market &&
        EALIssuance.pack &&
        EALIssuance.dateIssued &&
        derived.checks.every((check) => check.ok)
    );

    return (
        <div className="font-ui flex flex-col gap-5">
            <div>
                <h2 className="m-0 text-[19px] font-semibold tracking-[-0.018em]">Record EAL issuance</h2>
                <p className="mt-1.5 mb-0 text-[12.5px] text-[#5A636D]">
                    Enter the range exactly as printed on the excise release note. The
                    quantity is worked out from it.
                </p>
            </div>

            <FormSection title="Source">
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
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
                    <Input
                        value={EALIssuance.dateIssued}
                        onChange={({ target }) => handleChange('dateIssued', target.value)}
                        label="Issued date"
                        type="date"
                    />
                    <Select
                        label="Pack"
                        placeholder="Select a Pack"
                        value={EALIssuance.pack}
                        onChange={({ target }) => handleChange('pack', target.value)}
                        options={packs}
                        hint={selectedPack ? `${selectedPack.bottlesPerCase} bottles per case` : undefined}
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
                    <div className="min-w-0 flex-[1_1_170px]">
                        <Input
                            value={EALIssuance.serialFrom}
                            onChange={({ target }) => handleChange('serialFrom', target.value)}
                            label="Serial from"
                            placeholder="10 digits"
                            type="text"
                            mono
                        />
                    </div>
                    <div className="min-w-0 flex-[1_1_170px]">
                        <Input
                            value={EALIssuance.serialTo}
                            onChange={({ target }) => handleChange('serialTo', target.value)}
                            label="Serial to"
                            placeholder="10 digits"
                            type="text"
                            mono
                        />
                    </div>
                </div>

                <div className="mt-3.5 flex flex-wrap items-center gap-4 rounded-[10px] border border-[#C9DED6] bg-[#F3F8F6] px-4 py-3.5">
                    <div className="flex-[1_1_150px]">
                        <p className="m-0 mb-1 text-[11px] font-semibold tracking-[0.07em] text-[#15594A] uppercase">
                            Quantity issued
                        </p>
                        <p className="m-0 flex items-baseline gap-[7px]">
                            <span className="font-numeric text-2xl font-semibold tracking-[-0.02em] tabular-nums text-[#0D3C32]">
                                {derived.count ? formatQuantity(derived.count) : '—'}
                            </span>
                            <span className="text-xs text-[#15594A]">labels</span>
                        </p>
                    </div>
                    <span className="h-[38px] w-px bg-[#C9DED6]" />
                    <div className="flex-[1_1_150px]">
                        <p className="m-0 mb-1 text-[11px] font-semibold tracking-[0.07em] text-[#15594A] uppercase">
                            Equivalent cases
                        </p>
                        <p className="m-0 flex items-baseline gap-[7px]">
                            <span className="font-numeric text-2xl font-semibold tracking-[-0.02em] tabular-nums text-[#0D3C32]">
                                {derived.cases ? formatQuantity(derived.cases) : '—'}
                            </span>
                            <span className="text-xs text-[#15594A]">
                                {selectedPack ? `at ${selectedPack.bottlesPerCase} per case` : 'pick a pack'}
                            </span>
                        </p>
                    </div>
                </div>

                <ValidationList checks={derived.checks} className="mt-3.5" />
            </FormSection>

            <div className="flex flex-wrap items-center justify-end gap-3 border-t border-[#EDECE8] pt-4">
                <p className="m-0 mr-auto text-[11.5px] text-[#5A636D]">
                    Posting stamps this issuance with your user id.
                </p>
                <button
                    type="button"
                    disabled={!ready}
                    className="h-9 cursor-pointer rounded-lg border border-[#15594A] bg-[#15594A] px-4 text-[13px] font-semibold text-white hover:bg-[#124C3F] disabled:cursor-not-allowed disabled:border-[#E3E2DE] disabled:bg-[#F2F1ED] disabled:text-[#A8ADB5]"
                    onClick={() => onAddEALIssuance(EALIssuance)}
                >
                    Post issuance
                </button>
            </div>
        </div>
    )
}

export default AddEALIssuanceForm
