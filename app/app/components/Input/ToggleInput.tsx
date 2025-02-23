import { UseFormRegisterReturn } from "react-hook-form";

interface ToggleSectionProps {
  label: string;
  defaultValue: boolean;
  register: () => UseFormRegisterReturn<string>;
}

export default function ToogleInput({
  labelTitle,
  defaultValue,
  onClick,
  register,
}: any) {
  let inputProps = register && register();
  return (
    <div className="flex justify-between p-2">
      <label>{labelTitle}</label>
      <input
        type="checkbox"
        className="relative w-[3.25rem] h-7 p-px bg-gray-100 border-transparent text-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:ring-purple-600 disabled:opacity-50 disabled:pointer-events-none checked:bg-none checked:text-purple-600 checked:border-purple-600 focus:checked:border-purple-600 dark:bg-gray-800 dark:border-gray-700 dark:checked:bg-purple-600 dark:checked:border-purple-600 dark:focus:ring-offset-gray-600
                            before:inline-block before:w-6 before:h-6 before:bg-white checked:before:bg-purple-200 before:translate-x-0 checked:before:translate-x-full before:rounded-full before:shadow before:transform before:ring-0 before:transition before:ease-in-out before:duration-200 dark:before:bg-gray-400 dark:checked:before:bg-purple-200"
        defaultValue={defaultValue}
        onClick={onClick}
        {...inputProps}
      />
    </div>
  );
}
