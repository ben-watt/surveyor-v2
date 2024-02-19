import { UseFormRegisterReturn } from "react-hook-form";

interface InputTextProps {
  labelTitle: string;
  defaultValue?: string;
  register: () => UseFormRegisterReturn<string>
}

function InputText({ labelTitle, defaultValue, register}: InputTextProps) {
  return (
    <div className="relative">
      <input type="text" id="input-text" className="peer border p-4 block w-full border-gray-200 rounded-lg text-sm placeholder:text-transparent focus:border-purple-600 focus:ring-purple-600 disabled:opacity-50 disabled:pointer-events-none dark:bg-slate-900 dark:border-gray-700 dark:text-gray-400 dark:focus:ring-gray-600
        focus:pt-6
        focus:pb-2
        [&:not(:placeholder-shown)]:pt-6
        [&:not(:placeholder-shown)]:pb-2
        autofill:pt-6
        autofill:pb-2"
        defaultValue={defaultValue}
        placeholder=""
        {...register()} />
      <label htmlFor="input-text" className="absolute top-0 start-0 p-4 h-full text-sm truncate pointer-events-none transition ease-in-out duration-100 border border-transparent dark:text-white peer-disabled:opacity-50 peer-disabled:pointer-events-none
          peer-focus:text-xs
          peer-focus:-translate-y-1.5
          peer-focus:text-gray-500
          peer-[:not(:placeholder-shown)]:text-xs
          peer-[:not(:placeholder-shown)]:-translate-y-1.5
          peer-[:not(:placeholder-shown)]:text-gray-500">{labelTitle}</label>
    </div>
  );
}

export default InputText;