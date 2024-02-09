import { UseFormRegisterReturn } from "react-hook-form";

interface TextAreaInputProps extends UseFormRegisterReturn<string> {
    labelTitle?: string;
    defaultValue: string;
    placeholder: string;
}

export default function TextAreaInput(props: TextAreaInputProps){
    const { labelTitle, defaultValue, placeholder } = props;

    return(
        <>
            <label htmlFor="textarea-label" className="sr-only">
                <span>{labelTitle}</span>
            </label>
            <textarea id="textarea-label" className="py-3 px-4 block w-full h-full border-gray-200 rounded-lg text-sm focus:border-purple-600 focus:ring-purple-600 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400 dark:focus:ring-gray-600" defaultValue={defaultValue || ""} placeholder={placeholder || ""} {...props as UseFormRegisterReturn}></textarea>
        </>
    )
}