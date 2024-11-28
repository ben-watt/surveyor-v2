import { Check, Info, X } from 'lucide-react';
import { toast as rht, Toast } from 'react-hot-toast';


interface CustomToastProps {
    toast: Toast, 
    message: string, 
    icon?: React.ReactNode 
}

export const CustomToast = ({ toast,  message, icon }: CustomToastProps) => {
    return (
      <div
        className={`max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
        {icon && <div className="p-2">{icon}</div>}
        <div className="flex-1 w-0 p-2">
          <p className="text-sm text-gray-900">{message}</p>
        </div>
        <div className="flex border-l border-gray-200">
          <button
            onClick={() => rht.dismiss(toast.id)}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium"
          >
            Close
          </button>
        </div>
      </div>
    );
}

const success = (message: string) => {
    rht.custom((t) => <CustomToast toast={t} message={message} icon={<Check className="stroke-green-600" size={22} />} />);
};

const basic = (message: string) => {
    rht(message, { duration: 4000 });
}

const info = (message: string) => {
    rht.custom((t) => <CustomToast toast={t} message={message} icon={<Info className="stroke-blue-400" size={22} />} />);
}

const error = (message: string) => {
    rht.custom((t) => <CustomToast toast={t} message={message} icon={<X className="stroke-red-600" size={22} />} />);
}

export const toast = {
    success: success,
    basic: basic,
    error: error,
    info: info,
}