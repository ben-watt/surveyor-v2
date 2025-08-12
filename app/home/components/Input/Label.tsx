export const Label = ({ text, htmlFor }: { text?: string; htmlFor?: string }) => {
  if (!text) return null;

  return (
    <div>
      <label htmlFor={htmlFor}>
        <span className="text-sm">{text}</span>
      </label>
    </div>
  );
};
