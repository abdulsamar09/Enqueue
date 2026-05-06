import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function LoginPage() {
  document.title = 'Enqueue — Business Login';
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      navigate('/dashboard');
    } catch (error) {
      toast.error((error as Error).message || 'Unable to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">Business login</h1>
      <form className="mt-6 space-y-3" onSubmit={onSubmit}>
        <input className="w-full rounded border px-3 py-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input className="w-full rounded border px-3 py-2" placeholder="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        <button disabled={loading} className="w-full rounded bg-[var(--eq-indigo)] px-4 py-2 text-white">
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
      <Link to="/forgot-password" className="mt-3 block text-sm text-[var(--eq-muted)] underline">
        Forgot password?
      </Link>
      <p className="mt-8 text-sm text-[var(--eq-muted)]">Customer? You don't need to sign in — just scan the QR code.</p>
      <p className="mt-4 text-center text-sm text-[var(--eq-muted)]">
        Don't have a business account?{' '}
        <Link to="/signup" className="font-semibold text-[var(--eq-indigo)] hover:underline">
          Sign up here
        </Link>
      </p>
    </main>
  );
}
