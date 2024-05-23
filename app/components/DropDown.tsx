import React from "react";


interface DropDownItemProps extends React.PropsWithChildren<any> {
    href?: string;
    className?: string;
    onClick?: () => void;
}


export const DropDownItem = ({ href = "#", className = "", onClick, children } : DropDownItemProps) => {
    return (
        <a
        onClick={onClick}
        className={"flex items-center gap-x-3.5 py-2 px-3 rounded-lg text-sm text-gray-800 hover:bg-gray-100 focus:outline-none focus:bg-gray-100 dark:text-neutral-400 dark:hover:bg-neutral-700 dark:hover:text-neutral-300 dark:focus:bg-neutral-700 " + className}
        href={href}
        >
        {children}
        </a>
    );
}

interface DropDownProps extends React.PropsWithChildren<any> {
    btnText?: string;
}

export function DropDown({ children, btnText = "Action" }: DropDownProps) {
  return (
    <div className="hs-dropdown relative inline-flex">
      <button
        id="hs-dropdown"
        type="button"
        className="hs-dropdown-toggle py-3 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg border border-gray-200 bg-white text-gray-800 shadow-sm hover:bg-gray-50 disabled:opacity-50 disabled:pointer-events-none dark:bg-neutral-900 dark:border-neutral-700 dark:text-white dark:hover:bg-neutral-800"
      >
        {btnText}
        <svg
          className="hs-dropdown-open:rotate-180 size-4 text-gray-600 dark:text-neutral-600"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m6 9 6 6 6-6"></path>
        </svg>
      </button>

      <div className="hs-dropdown-menu transition-[opacity,margin] duration hs-dropdown-open:opacity-100 opacity-0 w-56 hidden z-10 mt-2 min-w-60 bg-white shadow-md rounded-lg p-2 dark:bg-neutral-800 dark:border dark:border-neutral-700 dark:divide-neutral-700" aria-labelledby="hs-dropdown">
        {children}
      </div>
    </div>
  );
}
