import { UseFormRegisterReturn } from "react-hook-form";

interface SelectBoxProps extends React.PropsWithChildren<any> {
  labelTitle: string;
  defaultValue?: string;
  placeholder?: string;
  register: () => UseFormRegisterReturn<string>;
}

function SelectBox({
  labelTitle,
  defaultValue = "Select option...",
  placeholder = "Select option...",
  register,
  children,
}: SelectBoxProps) {
  
  const props = register();

  return (
    <>
      <label htmlFor={props.name} className="sr-only">
        <span>{labelTitle}</span>
      </label>
      <select
        className="rounded-md border-gray-300 text-sm"
        {...props}
      >
        <option>{defaultValue}</option>
        {children}
      </select>
    </>
  );
}

export default SelectBox;
