interface InputErrorProps {
    message: string | undefined;
}

const InputError = ({ message } : InputErrorProps) => {
    return (message && <span role="alert" className="text-red-700 text-sm">{message}*</span>)
}

export default InputError;