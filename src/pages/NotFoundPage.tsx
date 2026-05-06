import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  document.title = 'Enqueue — Not Found';
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-3xl font-bold">Page not found</h1>
      <Link to="/" className="rounded bg-[var(--eq-indigo)] px-4 py-2 text-white">
        Back to home
      </Link>
    </main>
  );
}
