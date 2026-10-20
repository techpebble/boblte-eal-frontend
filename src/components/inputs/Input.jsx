import React, { useState } from 'react';
import { LuEye, LuEyeOff } from "react-icons/lu";

const Input = ({
    value,
    onChange,
    label,
    placeholder,
    type,
    readOnly,
    required,
    className,
    hint,
    mono,
    error
}) => {
    const [showPassword, setShowPassword] = useState(false);

    const toggleShowPassword = () => {
        setShowPassword(!showPassword);
    }

    const id = label ? `field-${String(label).toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined;

    // A read-only field is a derived figure rather than something to fill in,
    // so it is drawn as a result: tinted, and plainly not an empty box.
    const shell = [
        'flex h-[38px] items-center gap-2 rounded-lg border px-[11px]',
        readOnly
            ? 'border-dashed border-[#C9DED6] bg-[#F3F8F6]'
            : error
                ? 'border-[#9B2C2C] bg-white'
                : 'border-[#D7D6D1] bg-white focus-within:border-[#15594A] focus-within:ring-[3px] focus-within:ring-[#E7F0EC]'
    ].join(' ');

    return (
        <div>
            {label && (
                <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-[#3C434B]">
                    {label}
                </label>
            )}
            <div className={shell}>
                <input
                    id={id}
                    type={type == 'password' ? showPassword ? 'text' : 'password' : type}
                    placeholder={placeholder}
                    className={`min-w-0 flex-1 border-0 bg-transparent text-[13.5px] outline-none placeholder:text-[#A8ADB5] ${
                        readOnly ? 'font-numeric font-semibold tabular-nums text-[#0D3C32]' : 'text-[#15181C]'
                    } ${mono ? 'font-numeric tabular-nums' : ''} ${className || ''}`}
                    value={value}
                    onChange={(e) => onChange && onChange(e)}
                    readOnly={readOnly}
                    required={required}
                />
                {type == "password" && (
                    <button
                        type="button"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => toggleShowPassword()}
                        className="flex h-[26px] w-[26px] shrink-0 cursor-pointer items-center justify-center rounded-md text-[#5A636D] hover:bg-[#F2F1ED]"
                    >
                        {showPassword ? <LuEyeOff /> : <LuEye />}
                    </button>
                )}
            </div>
            {(error || hint) && (
                <p className={`mt-1.5 mb-0 text-[11px] ${error ? 'text-[#9B2C2C]' : 'text-[#5A636D]'}`}>
                    {error || hint}
                </p>
            )}
        </div>
    )
}

export default Input
