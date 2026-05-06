export default function Spinner() {
  return (
    <div className="flex min-h-[120px] items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--eq-indigo)] border-t-transparent" />
    </div>
  );
}
