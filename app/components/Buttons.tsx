import { MouseEvent } from 'react'

type ButtonProps = {
    children: string;
    onClick: (ev:  MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) => void;
    disabled?: boolean;
}


export function PrimaryBtn (props: ButtonProps) {
  return (
    <button type="button" {...props}  className="py-3 px-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-transparent bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:pointer-events-none dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600">{props.children}</button>
  )
}

export function OutlineBtn (props: ButtonProps) {
  return (
    <button type="button" {...props}  className="py-3 px-4 inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-500 hover:border-blue-600 hover:text-blue-600 disabled:opacity-50 disabled:pointer-events-none dark:border-gray-700 dark:text-gray-400 dark:hover:text-blue-500 dark:hover:border-blue-600 dark:focus:outline-none dark:focus:ring-1 dark:focus:ring-gray-600">{props.children}</button>
  )
}