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
            <textarea id={props.name}  className="py-3 px-4 block w-full h-full border-gray-200 rounded-lg text-sm focus:border-purple-600 focus:ring-purple-600 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400 dark:focus:ring-gray-600" defaultValue={defaultValue} placeholder={placeholder} {...props}></textarea>
        </>
    )
}