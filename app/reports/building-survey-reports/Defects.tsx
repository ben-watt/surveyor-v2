import { Key, MouseEvent, ReactEventHandler, ReactNode, useEffect, useState } from "react";
import TextAreaInput from "../Input/TextAreaInput";
import ToogleInput from "../Input/ToggleInput";
import { AudioRecorder, useAudioRecorder } from 'react-audio-voice-recorder';
import SelectBox from "../Input/SelectBox";
import CurrencyInput from 'react-currency-input-field';
import { useFormContext } from 'react-hook-form';
import { XCircleIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { CopyMarkupBtn, OutlineBtn } from "@/app/components/Buttons";
import { Search } from "@/app/components/Search";
import SelectedDefectHit from "@/app/components/SelectedDefectHit";
import { DefectHit } from "@/app/components/DefectHit";

const DefectInput = ({ formKey }: { formKey: string }) => {
    const { register, unregister, getValues, setValue } = useFormContext()

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
                    <Search indexName={"defects"} onRemoveInput={() => removeDefect(index)} hitComponent={DefectHit} selectedHitComponent={SelectedDefectHit} />
                </div>
            ))}
            <div className="flex justify-end pt-3 pb-3">
                <CopyMarkupBtn onClick={(ev) => addDefect(ev)}>Add Defect</CopyMarkupBtn>
            </div>
        </>
    )
}

type ConditionInputProp = {
    formKey: string;
    label: string;
}

type AudioState = {
    url?: string;
    blob?: Blob;
}

const ConditionInput = ({ formKey, label }: ConditionInputProp) => {
    const { register } = useFormContext();
    const [audio, setAudio] = useState<AudioState>({});
    const [audioText, setAudioText] = useState("");

    const getTranscription = async (blob: Blob) => {
        const data = new FormData();
        data.append("file", new File([blob], "rec.mp3", { type: "audio/mpeg" }));
        data.append("model", "whisper-1");
        data.append("response_format", "json");

        fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.NEXT_PUBLIC_OPEN_AI_API_KEY}`
            },
            body: data
        })
            .then(response => response.json())
            .then(data => setAudioText(data.text))
            .catch(error => setAudioText(error.message));
    }

    useEffect(() => {
        if (audio.blob !== undefined) {
            getTranscription(audio.blob);
        }
    }, [audio])

    const recorderControls = useAudioRecorder();
    const addAudioElement = (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        setAudio({ url, blob });
    };

    return (
        <>
            <div className="relative">
                <div className="h-36">
                    <TextAreaInput defaultValue={audioText} placeholder={`Description of the ${label.toLowerCase()}...`} {...register(formKey + ".description")} />
                    <div className="absolute bottom-2 right-2">
                        <AudioRecorder showVisualizer onRecordingComplete={(blob) => addAudioElement(blob)} audioTrackConstraints={{
                            noiseSuppression: true,
                            echoCancellation: true,
                        }} recorderControls={recorderControls} />

                    </div>
                </div>

            </div>
            <div className="w-full">
                {audio.url !== undefined && (
                    <>
                        <div className="flex">
                            <audio src={audio.url ?? ""} controls></audio>
                            <div className="bg-zinc-800 w-9 h-10 flex p-1">
                                <XMarkIcon className="w-fill text-white hover:text-purple-400 cursor-pointer" onClick={() => setAudio({})} />
                            </div>
                        </div>
                    </>)}
            </div>
            <div>
                <div>
                    <DefectInput formKey={formKey}></DefectInput>
                </div>
                <ImageInput formKey={formKey} />
            </div>
        </>
    )
}

const ImageInput = ({ formKey }: { formKey: string }) => {
    const { register, watch, setValue } = useFormContext();

    const images = watch(formKey + ".images") || [];
    const previewImageUrls = [];
    if (images.length !== 0) {
        for (let i = 0; i < images.length; i++) {
            previewImageUrls.push(URL.createObjectURL(new Blob([images[i]], { type: "image/*" })));
        }
    }

    const removeImage = (index: number) => {
        const newImages = [...images];
        newImages.splice(index, 1);
        setValue(formKey + ".images", newImages);
    }

    var {onChange, onBlur, name } = register(formKey + `.images`);

    
    return (
        <div>
            <label htmlFor={name} className="sr-only">
                <span>Upload Images</span>
            </label>
            <input
                type="file"
                accept="image/*"
                multiple 
                id="file-input"
                className="block w-full border border-gray-200 shadow-sm rounded-lg text-sm focus:z-10 focus:border-purple-600 focus:ring-purple-600 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600
                        file:bg-gray-50 file:border-0
                        file:bg-gray-100 file:me-4
                        file:py-3 file:px-4
                        dark:file:bg-gray-700 dark:file:text-gray-400"
                onChange={onChange} 
                onBlur={onBlur} />
            <div className="flex justify-start gap-x-5 mt-5">
                {previewImageUrls.map((src, i) => (
                    <div key={i} className="relative">
                        <XCircleIcon className="absolute top-0 right-0 w-5 text-red-500 cursor-pointer" onClick={() => removeImage(i)} />
                        <img src={src} width={100} height={100} />
                    </div>
                ))}
            </div>
        </div>
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
                <ConditionInput formKey={formKey} label={label}></ConditionInput>
            </ToggleSection>
        </section>
    );
}