import { Key, MouseEvent, ReactEventHandler, ReactNode, useEffect, useState } from "react";
import TextAreaInput from "../Input/TextAreaInput";
import ToogleInput from "../Input/ToggleInput";
import { AudioRecorder, useAudioRecorder } from 'react-audio-voice-recorder';
import SelectBox from "../Input/SelectBox";
import CurrencyInput from 'react-currency-input-field';
import { useFormContext } from 'react-hook-form';
import { XCircleIcon, XMarkIcon } from '@heroicons/react/24/solid'
import { OutlineBtn, PrimaryBtn } from "@/app/components/Buttons";

const DefectInput = ({ formKey }: { formKey: string }) => {
    const { register, unregister, getValues, setValue, watch } = useFormContext()

    watch(formKey + ".defects")

    const options = [
        { name: "Cracked or broken slates", value: "Cracked or broken slates" },
        { name: "Missing slates", value: "Missing slates" },
    ]

    const currentDefects = (getValues(formKey + ".defects") || []).filter((x: any) => x);

    const removeDefect = (index: Key) => {
        unregister(formKey + `.defects.${index}.name`);
        unregister(formKey + `.defects.${index}.cost`);
    }

    const addDefect = (ev: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) => {
        ev.preventDefault()

        if (currentDefects.length === options.length) {
            console.info("Max defects reached")
            return;
        }

        console.info("Adding defect")
        setValue(formKey + ".defects", currentDefects.concat({ name: options[currentDefects.length].value, cost: "£0" }));
    }

    if (currentDefects.length === 0) {
        return (
            <div className="pt-3 pb-3">
                <PrimaryBtn onClick={(ev) => addDefect(ev)}>Add Defect</PrimaryBtn>
            </div>
        )
    }

    return (
        <>
            {currentDefects.map((defect: any, index: Key) => (
                <div key={index} className="flex gap-x-10 items-end w-full">
                    <SelectBox options={options} labelTitle={index === 0 && "Defect"} defaultValue={getValues(formKey + `.defects.${index}.name`)} register={() => register(formKey + `.defects.${index}.name`)} />
                    <div>
                        <label className="label"><div className="label-text">{index === 0 && "Cost"}</div></label>
                        <CurrencyInput
                            className="input input-bordered"
                            placeholder="Please enter a number"
                            prefix="£"
                            defaultValue={0}
                            decimalsLimit={2} {...register(formKey + `.defects.${index}.cost`)} />
                    </div>
                    <div>
                        <OutlineBtn onClick={(ev) => removeDefect(index)}>Remove</OutlineBtn>
                    </div>
                </div>
            ))}
            <div className="pt-3 pb-3">
                <OutlineBtn onClick={addDefect}>Add Defect</OutlineBtn>
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
                <TextAreaInput defaultValue={audioText} placeholder={`Description of the ${label.toLowerCase()}...`} register={() => register(formKey + ".description")} />             
                <div className="absolute bottom-2 right-2">
                    <AudioRecorder showVisualizer onRecordingComplete={(blob) => addAudioElement(blob)} audioTrackConstraints={{
                        noiseSuppression: true,
                        echoCancellation: true,
                    }} recorderControls={recorderControls} />
                    
                </div>
            </div>
            <div className="w-full">
                {audio.url !== undefined && (
                <>
                    <div className="flex">
                        <audio src={audio.url ?? ""} controls></audio>
                        <div className="bg-zinc-800 w-9 h-10 flex p-1">
                            <XMarkIcon className="w-fill text-white hover:text-blue-400 cursor-pointer" onClick={() => setAudio({})} />
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

    var formRegistration = register(formKey + `.images`);
    return (
        <div>
            <label htmlFor={formRegistration.name} className="sr-only">
                <span>Upload Images</span>
            </label>
            <input
                type="file"
                accept="image/*"
                multiple id="file-input"
                className="block w-full border border-gray-200 shadow-sm rounded-lg text-sm focus:z-10 focus:border-blue-500 focus:ring-blue-500 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600
                        file:bg-gray-50 file:border-0
                        file:bg-gray-100 file:me-4
                        file:py-3 file:px-4
                        dark:file:bg-gray-700 dark:file:text-gray-400"
                {...formRegistration} />
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