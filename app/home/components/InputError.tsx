interface InputErrorProps {
  message?: string;
}

const InputError = ({ message }: InputErrorProps) => {
  const m = message || 'This field is required';
  return (
    <span role="alert" className="text-sm text-red-700">
      {m}
    </span>
  );
};

export default InputError;
