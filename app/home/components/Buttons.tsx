import { MouseEvent } from 'react'

type ButtonProps = {
  className?: string;
  children: string;
  onClick?: (ev: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}


export function PrimaryBtn(props: ButtonProps) {
  const { className = "", children } = props;

  return (
    <button type="button" {...props} className={`w-full text-center cursor-pointer py-3 px-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border-0 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white disabled:opacity-50 shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-1 ${className}`}>
      <div className="m-auto">
        {children}
      </div>
    </button>
  )
}

export function OutlineBtn(props: ButtonProps) {
  return (
    <button type="button" {...props} className="py-3 px-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border-2 border-gray-200 bg-white text-gray-700 hover:border-blue-600 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-50 disabled:pointer-events-none shadow-md hover:shadow-lg transition-all duration-200">{props.children}</button>
  )
}

export function CopyMarkupBtn(props: ButtonProps) {
  return (
    <button type="button" {...props} className="py-1.5 px-2 inline-flex items-center gap-x-1 text-xs font-medium rounded-full border border-dashed border-blue-200 bg-white text-blue-800 hover:bg-blue-50 hover:border-blue-300 disabled:opacity-50 disabled:pointer-events-none shadow-sm hover:shadow-md transition-all duration-200">
      <svg className="flex-shrink-0 w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </svg>
      {props.children}
    </button>
  )
}