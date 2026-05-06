import { FormEvent, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function ForgotPasswordPage() {
  document.title = 'Enqueue — Forgot Password';
  const [email, setEmail] = useState('');
  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      toast.success('Reset link sent');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };
  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">Forgot password</h1>
      <form onSubmit={onSubmit} className="mt-5 space-y-3">
        <input className="w-full rounded border px-3 py-2" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button className="w-full rounded bg-[var(--eq-indigo)] px-4 py-2 text-white">Send reset link</button>
      </form>
    </main>
  );
}
