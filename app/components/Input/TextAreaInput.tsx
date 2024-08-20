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
        <div>
            <label htmlFor={props.name}>
                <span className="text-sm">{labelTitle}</span>
            </label>
            <Textarea {...props} placeholder={placeholder} defaultValue={defaultValue} />
        </div>
    )
}