import { Textarea } from "@/components/ui/textarea";
import { UseFormRegisterReturn } from "react-hook-form";
import { Label } from "./Label";

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
            {labelTitle && <Label text={labelTitle} /> }
            <Textarea {...props} placeholder={placeholder} defaultValue={defaultValue} />
        </div>
    )
}