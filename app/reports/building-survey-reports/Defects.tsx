import { Key, MouseEvent, useState } from "react";
import ToogleInput from "../../components/Input/ToggleInput";
import { UseFormRegisterReturn, useFormContext } from 'react-hook-form';
import { CopyMarkupBtn } from "@/app/components/Buttons";
import { SearchToSelect } from "@/app/components/Search";
import SelectedDefectHit from "@/app/components/SelectedDefectHit";
import { DefectHit } from "@/app/components/DefectHit";


interface DefectInputProps {
    register: () => UseFormRegisterReturn<string>;
}

export const ComponentInput = ({ register } : DefectInputProps) => {
    const { unregister, getValues, setValue, watch } = useFormContext()
    const props = register();

    watch(props.name)

    const currentDefects = getValues(props.name) || [];

    const removeDefect = (index: Key) => {
        unregister(props.name + `.${index}.name`);
        unregister(props.name + `.${index}.cost`);
    }

    const addComponent = (ev: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) => {
        ev.preventDefault()
        setValue(props.name, currentDefects.concat({ name: "", cost: "£0" }));
    }

    if (currentDefects.length === 0) {
        return (
            <div className="flex justify-end">
                <CopyMarkupBtn onClick={(ev) => addComponent(ev)}>Add Component</CopyMarkupBtn>
            </div>
        )
    }

    return (
        <>
            {currentDefects.map((defect: any, index: Key) => (
                <div key={index}>
                    <SearchToSelect indexName={"defects"} onRemoveInput={() => removeDefect(index)} hitComponent={DefectHit} selectedHitComponent={SelectedDefectHit} />
                </div>
            ))}
        </>
    )
}


interface ToggleSectionProps {
    label: string;
    children: any;
    defaultValue: boolean;
    register: () => UseFormRegisterReturn<string>;
}

export const ToggleSection = ({ label, children, defaultValue, register }: ToggleSectionProps) => {
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