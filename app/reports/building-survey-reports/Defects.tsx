import { Key, useEffect, useState } from "react";
import TextAreaInput from "../Input/TextAreaInput";
import ToogleInput from "../Input/ToggleInput";
import { AudioRecorder, useAudioRecorder } from 'react-audio-voice-recorder';
import SelectBox from "../Input/SelectBox";
import CurrencyInput from 'react-currency-input-field';
import { useFormContext } from 'react-hook-form';
import { XCircleIcon } from '@heroicons/react/24/solid'

const DefectInput = ({ formKey }: { formKey: string }) => {
    const { register, unregister, getValues, setValue } = useFormContext()

    const options = [
        { name: "Cracked or broken slates", value: "Cracked or broken slates" },
        { name: "Missing slates", value: "Missing slates" },
    ]

    const currentDefects = (getValues(formKey + ".defects") || []).filter((x: any) => x);

    const removeDefect = (index: Key) => {
        unregister(formKey + `.defects.${index}.name`);
        unregister(formKey + `.defects.${index}.cost`);
    }

    const addDefect = () => {
        if (currentDefects.length === options.length) {
            // TODO: Model to add new defect
            return;
        }

        setValue(formKey + ".defects", currentDefects.concat({ name: options[currentDefects.length].value, cost: "£0" }));
    }

    if (currentDefects.length === 0) {
        return (
            <div className="pt-3 pb-3">
                <button onClick={() => addDefect()} className="btn btn-primary">Add Defect</button>
            </div>
        )
    }

    return (
        <>
            {currentDefects.map((defect: any, index: Key) => (
                <div key={index} className="flex gap-x-10 items-end w-full">
                    <SelectBox key={index} options={options} labelTitle={index === 0 && "Defect"} defaultValue={getValues(formKey + `.defects.${index}.name`)} register={() => register(formKey + `.defects.${index}.name`)} />
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
                        <button className="btn btn-error" onClick={() => removeDefect(index)}>Remove</button>
                    </div>
                </div>
            ))}
            <div className="pt-3 pb-3">
                <button onClick={addDefect} className="btn btn-primary">Add Defect</button>
            </div>
        </>
    )
}

type ConditionInputProp = {
    formKey: string;
    label: string;
}

const ConditionInput = ({ formKey, label }: ConditionInputProp) => {
    const { register, watch, unregister, setValue } = useFormContext();
    const [audio, setAudio] = useState({ url: null, blob: null });
    const [audioText, setAudioText] = useState("");

    const getTranscription = async (blob: Blob) => {
        const data = new FormData();
        data.append("file", new File([blob], "rec.mp3", { type: "audio/mpeg" }));
        data.append("model", "whisper-1");
        data.append("response_format", "json");

        fetch("https://api.openai.com/v1/audio/transcriptions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${import.meta.env.OPEN_API_KEY}`
            },
            body: data
        })
            .then(response => response.json())
            .then(data => setAudioText(data.text))
            .catch(error => setAudioText(error.message));
    }

    useEffect(() => {
        if (audio.blob !== null) {
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
                    <AudioRecorder onRecordingComplete={(blob) => addAudioElement(blob)} recorderControls={recorderControls} />
                </div>
            </div>

            {audio !== null && <audio hidden src={audio.url ?? ""} controls></audio>}
            <div className={`form-control w-full flex`}>
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

    return (
        <div>
            <label className="label">
                <span className={"label-text text-base-content"}>Upload Images</span>
            </label>
            <input
                type="file"
                accept="image/*"
                multiple
                {...register(formKey + `.images`)}
                className="file-input file-input-bordered max-w-xs" />
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
        <section className="m-3">
            <ToggleSection label={label} register={() => partOfSurveyReg}>
                <ConditionInput formKey={formKey} label={label}></ConditionInput>
            </ToggleSection>
        </section>
    );
}