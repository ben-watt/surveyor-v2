import { XMarkIcon } from "@heroicons/react/16/solid";
import { AudioRecorder, useAudioRecorder } from "react-audio-voice-recorder";
import TextAreaInput from "./TextAreaInput";
import { useEffect, useState } from "react";
import { UseFormRegisterReturn } from "react-hook-form";

type AudioState = {
    url?: string;
    blob?: Blob;
}

interface SmartTextAreaProps {
    label: string;
    placeholder?: string;
    defaultValue?: string;
    register: () => UseFormRegisterReturn<string>;
}

const SmartTextArea = ({ label, placeholder, defaultValue, register } : SmartTextAreaProps) => {
    const [audio, setAudio] = useState<AudioState>({});
    const [audioText, setAudioText] = useState("");
    const enableAudioRecording = false;

    const setAudioTextFn = (text: string) => {
        console.debug("Setting audio text", text)
        setAudioText(text);
    }

    useEffect(() => {
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
            .then(data => setAudioTextFn(data.text))
            .catch(error => setAudioText(error.message));
        }

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
        <div>
            <div className="relative">
                <div>
                    <TextAreaInput labelTitle={label} defaultValue={defaultValue} placeholder={placeholder} register={register} />
                    {enableAudioRecording &&
                    <div className="absolute bottom-2 right-2">
                        <AudioRecorder showVisualizer onRecordingComplete={(blob) => addAudioElement(blob)} audioTrackConstraints={{
                            noiseSuppression: true,
                            echoCancellation: true,
                        }} recorderControls={recorderControls} />

                    </div>
                    }
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
        </div>
    )
}

export default SmartTextArea;