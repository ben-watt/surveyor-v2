import { Key, MouseEvent, useState } from "react";
import ToogleInput from "../Input/ToggleInput";
import { useFormContext } from 'react-hook-form';
import { XCircleIcon } from '@heroicons/react/24/solid'
import { CopyMarkupBtn } from "@/app/components/Buttons";
import { SearchToSelect } from "@/app/components/Search";
import SelectedDefectHit from "@/app/components/SelectedDefectHit";
import { DefectHit } from "@/app/components/DefectHit";
import SmartTextArea from "../Input/SmartTextArea";
import ImageInput from "../Input/ImageInput";

const DefectInput = ({ formKey }: { formKey: string }) => {
    const { unregister, getValues, setValue, watch } = useFormContext()

    watch(formKey + ".defects")

    const currentDefects = getValues(formKey + ".defects") || [];

    const removeDefect = (index: Key) => {
        console.log("removing", index, currentDefects);
        unregister(formKey + `.defects.${index}.name`);
        unregister(formKey + `.defects.${index}.cost`);
    }

    const addDefect = (ev: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) => {
        ev.preventDefault()
        setValue(formKey + ".defects", currentDefects.concat({ name: "", cost: "£0" }));
    }

    if (currentDefects.length === 0) {
        return (
            <div className="flex justify-end pt-3 pb-3">
                <CopyMarkupBtn onClick={(ev) => addDefect(ev)}>Add Defect</CopyMarkupBtn>
            </div>
        )
    }

    return (
        <>
            {currentDefects.map((defect: any, index: Key) => (
                <div key={index} className="mt-2">
                    <SearchToSelect indexName={"defects"} onRemoveInput={() => removeDefect(index)} hitComponent={DefectHit} selectedHitComponent={SelectedDefectHit} />
                </div>
            ))}
            <div className="flex justify-end pt-3 pb-3">
                <CopyMarkupBtn onClick={(ev) => addDefect(ev)}>Add Defect</CopyMarkupBtn>
            </div>
        </>
    )
}


const ToggleSection = ({ label, children, register }: any) => {
    const [enabled, setEnabled] = useState(false);

    return (
        <>
            <ToogleInput
                labelStyle="text-lg font-medium"
                labelTitle={label}
                onClick={(ev: React.ChangeEvent<HTMLInputElement>) => setEnabled(ev.target.checked)} register={register}></ToogleInput>
            {enabled && children}
        </>
    )
}

export default function ConditionSection({ formKey, label }: { formKey: string, label: string }) {
    const { register, watch } = useFormContext();
    const partOfSurveyReg = register(formKey + ".isPartOfSurvey")

    return (
        <section className="mt-2">
            <ToggleSection label={label} register={() => partOfSurveyReg}>
                <div>
                    <SmartTextArea label={label} placeholder={`Description of the ${label.toLowerCase()}...`} {...register(formKey + ".description")} />
                    <DefectInput formKey={formKey}></DefectInput>
                    <ImageInput {...register(formKey + ".images")}  />
                </div>
            </ToggleSection>
        </section>
    );
}