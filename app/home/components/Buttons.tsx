import { MouseEvent } from 'react';

type ButtonProps = {
  className?: string;
  children: string;
  onClick?: (ev: MouseEvent<HTMLButtonElement, globalThis.MouseEvent>) => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
};

export function PrimaryBtn(props: ButtonProps) {
  const { className = '', children } = props;

  return (
    <button
      type="button"
      {...props}
      className={`inline-flex w-full transform cursor-pointer items-center gap-x-2 rounded-lg border-0 bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-3 text-center text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:-translate-y-1 hover:from-blue-700 hover:to-purple-700 hover:shadow-xl disabled:opacity-50 ${className}`}
    >
      <div className="m-auto">{children}</div>
    </button>
  );
}

export function OutlineBtn(props: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className="inline-flex items-center gap-x-2 rounded-lg border-2 border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-md transition-all duration-200 hover:border-blue-600 hover:bg-blue-50 hover:text-blue-600 hover:shadow-lg disabled:pointer-events-none disabled:opacity-50"
    >
      {props.children}
    </button>
  );
}

export function CopyMarkupBtn(props: ButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className="inline-flex items-center gap-x-1 rounded-full border border-dashed border-blue-200 bg-white px-2 py-1.5 text-xs font-medium text-blue-800 shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md disabled:pointer-events-none disabled:opacity-50"
    >
      <svg
        className="h-3.5 w-3.5 flex-shrink-0"
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
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </svg>
      {props.children}
    </button>
  );
}
