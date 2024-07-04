import { Textarea } from "@/components/ui/textarea";
import { UseFormRegisterReturn } from "react-hook-form";

interface TextAreaInputProps {
    labelTitle?: string;
    defaultValue?: string;
    placeholder?: string;
    register: () => UseFormRegisterReturn<string>;
}

export default function TextAreaInput({ register, labelTitle = "", defaultValue = "", placeholder = ""} : TextAreaInputProps){
    const props = register();
    return(
        <>
            <label htmlFor={props.name} className="sr-only">
                <span>{labelTitle}</span>
            </label>
            <Textarea {...props} placeholder={placeholder} defaultValue={defaultValue} />
        </>
    )
}