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
    <button type="button" {...props} className={`text-center cursor-pointer py-3 px-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-zinc-900 text-white hover:bg-zinc-900 disabled:opacity-50 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600 hover:shadow-md ${className}`}>{children}</button>
  )
}

export function OutlineBtn(props: ButtonProps) {
  return (
    <button type="button" {...props} className="py-3 px-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-500 hover:border-purple-600 hover:text-purple-600 disabled:opacity-50 disabled:pointer-events-none dark:border-gray-700 dark:text-gray-400 dark:hover:text-purple-600 dark:hover:border-purple-600 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600">{props.children}</button>
  )
}

export function CopyMarkupBtn(props: ButtonProps) {
  return (
    <button type="button" {...props} className="py-1.5 px-2 inline-flex items-center gap-x-1 text-xs font-medium rounded-full border border-dashed border-gray-200 bg-white text-gray-800 hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600">
      <svg className="flex-shrink-0 w-3.5 h-3.5" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </svg>
      {props.children}
    </button>
  )
}