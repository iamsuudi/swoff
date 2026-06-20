interface SpinnerProps {
  inline?: boolean;
}

export default function Spinner({ inline }: SpinnerProps) {
  const inner = (
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
  );
  if (inline) return inner;
  return (
    <div className="flex items-center justify-center py-20">{inner}</div>
  );
}
