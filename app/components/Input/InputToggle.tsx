import { Key, MouseEvent, useState } from "react";
import ToogleInput from "./ToggleInput";
import { UseFormRegisterReturn, useFormContext } from 'react-hook-form';

interface ToggleSectionProps {
    label: string;
    children: any;
    defaultValue: boolean;
    register: () => UseFormRegisterReturn<string>;
}

export const InputToggle = ({ label, children, defaultValue, register }: ToggleSectionProps) => {
    const [enabled, setEnabled] = useState(defaultValue);

    return (
        <>
            <ToogleInput
                defaultValue={defaultValue}
                labelStyle="text-lg font-medium"
                labelTitle={label}
                onClick={(ev: React.ChangeEvent<HTMLInputElement>) => setEnabled(ev.target.checked)} register={register}></ToogleInput>
            {enabled && children}
        </>
    )
}