import { UseFormRegisterReturn } from "react-hook-form";

interface SelectBoxProps extends React.PropsWithChildren<any> {
  defaultValue?: string;
  placeholder?: string;
  register: () => UseFormRegisterReturn<string>;
}

function SelectBox({
  defaultValue = "Select option...",
  placeholder = "Select option...",
  register,
  children,
}: SelectBoxProps) {
    
  const dataHsSelect = `{
    "placeholder": ${placeholder},
    "toggleTag": "<button type=\"button\"></button>",
    "toggleClasses": "",
    "dropdownClasses": "",
    "optionClasses": "hs-selected:"
  }`;

  return (
    <select className="rounded-md border-gray-300" data-hs-select={dataHsSelect} {...register()}>
      <option>{defaultValue}</option>
      {children}
    </select>
  );
}

export default SelectBox;
