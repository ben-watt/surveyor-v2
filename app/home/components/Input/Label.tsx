export const Label = ({ text }: { text?: string }) => {
  if (!text) return null;

  return (
    <div>
      <label>
        <span className="text-sm">{text}</span>
      </label>
    </div>
  );
};
