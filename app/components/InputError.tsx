interface InputErrorProps {
    message?: string;
}

const InputError = ({ message } : InputErrorProps) => {
    const m = message || "This field is required";
    return <span role="alert" className="text-red-700 text-sm">{m}</span>
}

export default InputError;