import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { businessApi, entryApi, queueApi } from '../lib/queueApi';
import { subscribeToQueue } from '../lib/queueChannel';
import Spinner from '../components/Spinner';
import type { QueueEntry } from '../types';
import Logo from '../components/Logo';

export default function QueuePublicPage() {
  document.title = 'Enqueue — Join Waitlist';
  const { slug = '' } = useParams();
  const key = `enqueue_entry_${slug}`;
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [entryId, setEntryId] = useState<string | null>(localStorage.getItem(key));

  const businessQ = useQuery({ 
    queryKey: ['bizSlug', slug], 
    queryFn: async () => (await businessApi.getBySlug(slug)).data, 
    enabled: !!slug 
  });

  const queueQ = useQuery({ 
    queryKey: ['queuePublic', businessQ.data?.id], 
    queryFn: async () => {
      if (!businessQ.data?.id) return null;
      return (await queueApi.getByBusiness(businessQ.data.id)).data;
    }, 
    enabled: !!businessQ.data?.id 
  });

  const waitingQ = useQuery({ 
    queryKey: ['waitingPublic', queueQ.data?.id], 
    queryFn: async () => (await entryApi.getWaiting(queueQ.data!.id)).data ?? [], 
    enabled: !!queueQ.data?.id 
  });

  const entryQ = useQuery({ 
    queryKey: ['entry', entryId], 
    queryFn: async () => (await entryApi.getById(entryId!)).data, 
    enabled: !!entryId 
  });

  const statsQ = useQuery({ 
    queryKey: ['statsPublic', businessQ.data?.id], 
    queryFn: async () => {
      if (!queueQ.data?.id || !businessQ.data?.id) return null;
      return (await entryApi.getStats(queueQ.data.id, businessQ.data.id));
    }, 
    enabled: !!businessQ.data?.id && !!queueQ.data?.id
  });

  useEffect(() => {
    if (!queueQ.data?.id) return;
    return subscribeToQueue(
      queueQ.data.id,
      () => {
        queryClient.invalidateQueries({ queryKey: ['waitingPublic'] });
        queryClient.invalidateQueries({ queryKey: ['entry'] });
        queryClient.invalidateQueries({ queryKey: ['statsPublic'] });
      },
      () => {
        queryClient.invalidateQueries({ queryKey: ['entry'] });
        queryClient.invalidateQueries({ queryKey: ['statsPublic'] });
      }
    );
  }, [queryClient, queueQ.data?.id]);

  const position = useMemo(() => {
    if (!entryQ.data || entryQ.data.status !== 'waiting') return 0;
    return (waitingQ.data ?? []).findIndex((e) => e.id === entryQ.data?.id) + 1;
  }, [entryQ.data, waitingQ.data]);

  const onJoin = async (e: FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/\D/g, '');
    if (!name.trim()) return toast.error('Please enter your name');
    if (cleanPhone.length < 10) return toast.error('Please enter a valid 10-digit phone number');
    
    try {
      if (!queueQ.data || !businessQ.data) return;
      const joined = await entryApi.join(queueQ.data.id, businessQ.data.id, name, phone);
      if (joined.banned) return toast.error('You are banned from this waitlist.');
      if (joined.error || !joined.data) throw joined.error ?? new Error('Unable to join');
      localStorage.setItem(key, joined.data.id);
      setEntryId(joined.data.id);
      toast.success('Joined successfully!');
    } catch (error) {
      toast.error((error as Error).message);
    }
  };

  if (businessQ.isLoading || queueQ.isLoading) return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <Spinner />
    </div>
  );

  if (!businessQ.data || !queueQ.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <div className="rounded-[3rem] bg-white p-12 shadow-2xl shadow-slate-200/60 max-w-lg border border-slate-100">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-3xl bg-slate-50 text-6xl mb-8">🍽️</div>
          <h1 className="text-3xl font-black text-slate-900">Waitlist Not Found</h1>
          <p className="mt-4 text-slate-500 font-medium leading-relaxed">We couldn't find a restaurant with the code "<span className="text-[var(--eq-indigo)] font-bold">{slug}</span>". Please check the link or search again.</p>
          
          <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => window.location.href = '/'}
              className="rounded-2xl bg-[var(--eq-indigo)] px-8 py-4 font-black text-white shadow-xl shadow-indigo-100 transition-all hover:scale-105 active:scale-95"
            >
              Back to Home
            </button>
          </div>
          <p className="mt-8 text-[10px] font-black uppercase tracking-widest text-slate-300">Enqueue Systems Waitlist</p>
        </div>
      </div>
    );
  }

  const avgWait = statsQ.data?.avg_wait_minutes ?? 3;
  const totalWaitEstimate = (waitingQ.data?.length ?? 0) * avgWait;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="flex flex-col items-center border-b border-white/50 bg-white/30 p-4 sm:p-6 backdrop-blur-xl">
        <Logo />
        <h1 className="mt-4 text-lg sm:text-xl font-black tracking-tight text-slate-900 text-center">{businessQ.data.name}</h1>
        <div className="mt-1 flex items-center gap-2">
          <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Live Waitlist Active</p>
        </div>
      </header>

      <main className="mx-auto max-w-lg p-6">
        {!entryQ.data || entryQ.data.status === 'removed' || entryQ.data.status === 'done' ? (
          <div className="space-y-6">
            <div className="rounded-3xl bg-white p-8 shadow-xl shadow-slate-200/50">
              <h2 className="text-center text-2xl font-bold text-slate-900">Join the Waitlist</h2>
              
              <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
                <div className="rounded-2xl bg-slate-50 p-3 sm:p-4 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Waiting</p>
                  <p className="text-lg sm:text-xl font-black text-slate-900">{waitingQ.data?.length ?? 0}</p>
                </div>
                <div className="rounded-2xl bg-indigo-50 p-3 sm:p-4 text-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Est. Wait</p>
                  <p className="text-lg sm:text-xl font-black text-indigo-600">~{totalWaitEstimate} min</p>
                </div>
              </div>

              <form onSubmit={onJoin} className="mt-8 space-y-4">
                {queueQ.data?.is_paused && (
                  <div className="rounded-2xl bg-amber-50 p-4 text-center text-sm font-semibold text-amber-700">
                    ⚠️ Waitlist is currently closed — please wait a moment.
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Your Name</label>
                  <input
                    required
                    className="w-full rounded-2xl border-none bg-slate-100 px-5 py-4 text-lg font-medium focus:ring-2 focus:ring-[var(--eq-indigo)]"
                    placeholder="e.g. John Doe"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Phone Number</label>
                  <input
                    required
                    className="w-full rounded-2xl border-none bg-slate-100 px-5 py-4 text-lg font-medium focus:ring-2 focus:ring-[var(--eq-indigo)]"
                    placeholder="Enter your phone number"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                  />
                </div>
                <button
                  disabled={queueQ.data.is_paused}
                  className="mt-4 w-full rounded-2xl bg-[var(--eq-indigo)] py-5 text-lg font-black text-white shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                >
                  Join Waitlist Now →
                </button>
              </form>
            </div>
            
            <p className="px-4 text-center text-xs font-medium leading-relaxed text-slate-400">
              By joining, you agree to receive waitlist status updates. We value your privacy and won't spam you.
            </p>
          </div>
        ) : (
          <EntryStatusView 
            entry={entryQ.data} 
            position={position} 
            avgWait={avgWait}
            onReset={() => { localStorage.removeItem(key); setEntryId(null); queryClient.invalidateQueries(); }} 
            businessName={businessQ.data.name} 
          />
        )}
      </main>
    </div>
  );
}

function EntryStatusView({
  entry,
  position,
  avgWait,
  onReset,
  businessName,
}: {
  entry: QueueEntry;
  position: number;
  avgWait: number;
  onReset: () => void;
  businessName: string;
}) {
  if (entry.status === 'serving') {
    return (
      <div className="flex flex-col items-center space-y-6 text-center animate-bounce-slow px-4">
        <div className="rounded-full bg-green-100 p-6 sm:p-8 shadow-inner">
          <span className="text-5xl sm:text-7xl">🍽️</span>
        </div>
        <div className="space-y-2">
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900">It's Your Turn!</h2>
          <p className="text-base sm:text-lg font-medium text-slate-600 px-4">Your table is ready at <span className="font-bold">{businessName}</span>.</p>
        </div>
        <div className="rounded-2xl bg-green-500 px-6 sm:px-8 py-3 sm:py-4 font-black text-white shadow-xl shadow-green-100 text-sm sm:text-base">
          WE ARE READY FOR YOU
        </div>
      </div>
    );
  }

  if (entry.status === 'done') {
    return (
      <div className="space-y-6 rounded-3xl bg-white p-10 text-center shadow-xl">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-slate-100 text-4xl">✨</div>
        <h2 className="text-2xl font-bold text-slate-900">You've been seated!</h2>
        <p className="text-slate-500">Thank you for visiting {businessName}. Hope you had a great experience!</p>
        <button onClick={onReset} className="w-full rounded-2xl bg-slate-900 py-4 font-bold text-white">Join Again</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-2 sm:px-0">
      <div className="flex flex-col items-center rounded-3xl bg-white p-6 sm:p-10 text-center shadow-xl shadow-slate-200/50 border border-white">
        <div className="relative">
          <div className="absolute inset-0 animate-ping rounded-full bg-indigo-100" />
          <div className="relative flex h-24 w-24 sm:h-32 sm:w-32 items-center justify-center rounded-full bg-[var(--eq-indigo)] text-4xl sm:text-5xl font-black text-white shadow-2xl shadow-indigo-200">
            {position}
          </div>
        </div>
        
        <div className="mt-8 space-y-1">
          <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-slate-400">Your Current Position</p>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Wait is almost over!</h2>
        </div>

        <div className="mt-10 grid w-full grid-cols-2 divide-x divide-slate-100 border-t border-slate-50 pt-8">
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">Ahead of you</p>
            <p className="mt-1 text-xl sm:text-2xl font-black text-slate-800">{Math.max(position - 1, 0)}</p>
          </div>
          <div>
            <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">Est. Wait</p>
            <p className="mt-1 text-xl sm:text-2xl font-black text-slate-800">~{Math.max(position, 1) * avgWait} min</p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl bg-indigo-600 p-8 text-center text-white shadow-xl shadow-indigo-100">
        <p className="text-sm font-medium leading-relaxed opacity-90">
          This page updates automatically in real-time. Feel free to browse or relax — we'll let you know when it's your turn.
        </p>
      </div>

      <button onClick={onReset} className="w-full py-4 text-sm font-bold text-slate-400 hover:text-slate-600 transition-colors">
        Leave Waitlist
      </button>
    </div>
  );
}
