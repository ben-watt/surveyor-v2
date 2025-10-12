import { UseFormRegisterReturn } from 'react-hook-form';

interface ToggleSectionProps {
  label: string;
  defaultValue: boolean;
  register: () => UseFormRegisterReturn<string>;
}

export default function ToogleInput({ labelTitle, defaultValue, onClick, register }: any) {
  let inputProps = register && register();
  return (
    <div className="flex justify-between p-2">
      <label>{labelTitle}</label>
      <input
        type="checkbox"
        className="relative h-7 w-[3.25rem] cursor-pointer rounded-full border-transparent bg-gray-100 p-px text-transparent transition-colors duration-200 ease-in-out before:inline-block before:h-6 before:w-6 before:translate-x-0 before:transform before:rounded-full before:bg-white before:shadow before:ring-0 before:transition before:duration-200 before:ease-in-out checked:border-purple-600 checked:bg-none checked:text-purple-600 checked:before:translate-x-full checked:before:bg-purple-200 focus:ring-purple-600 focus:checked:border-purple-600 disabled:pointer-events-none disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:before:bg-gray-400 dark:checked:border-purple-600 dark:checked:bg-purple-600 dark:checked:before:bg-purple-200 dark:focus:ring-offset-gray-600"
        defaultValue={defaultValue}
        onClick={onClick}
        {...inputProps}
      />
    </div>
  );
}
