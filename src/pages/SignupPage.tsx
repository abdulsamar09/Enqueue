import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { businessApi } from '../lib/queueApi';
import { slugify } from '../lib/utils';

export default function SignupPage() {
  document.title = 'Enqueue — Sign Up';
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [initialWait, setInitialWait] = useState('5');

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { role: 'business', business_name: name } },
      });
      if (error) throw error;
      const user = data.user;
      if (!user) throw new Error('Could not create user');
      const slug = `${slugify(name)}-${user.id.slice(0, 6)}`;
      const createRes = await businessApi.create(user.id, name, slug, parseInt(initialWait));
      if (createRes.error) throw createRes.error;
      navigate('/dashboard');
    } catch (error) {
      toast.error((error as Error).message || 'Unable to sign up');
    }
  };

  return (
    <main className="mx-auto max-w-md p-6 pt-20">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Get started today</h1>
        <p className="mt-2 text-slate-500">Create your restaurant account and start managing your waitlist.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4 rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/50 border border-slate-100">
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Restaurant Name</label>
          <input 
            className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-medium focus:ring-2 focus:ring-[var(--eq-indigo)]" 
            placeholder="e.g. Central Coffee" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            required 
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Initial Avg Wait (Minutes)</label>
          <input 
            className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-medium focus:ring-2 focus:ring-[var(--eq-indigo)]" 
            placeholder="e.g. 5" 
            type="number"
            min="1"
            value={initialWait} 
            onChange={(e) => setInitialWait(e.target.value)} 
            required 
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Email Address</label>
          <input 
            className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-medium focus:ring-2 focus:ring-[var(--eq-indigo)]" 
            placeholder="name@business.com" 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Password</label>
          <input 
            className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-medium focus:ring-2 focus:ring-[var(--eq-indigo)]" 
            placeholder="••••••••" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
          />
        </div>
        <button className="mt-4 w-full rounded-2xl bg-[var(--eq-indigo)] py-4 font-black text-white shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-[0.98]">
          Create Business Account →
        </button>
      </form>

      <p className="mt-8 text-center text-sm font-medium text-slate-500">
        Already have an account?{' '}
        <Link to="/login" className="font-bold text-[var(--eq-indigo)] hover:underline">
          Login here
        </Link>
      </p>
    </main>
  );
}
