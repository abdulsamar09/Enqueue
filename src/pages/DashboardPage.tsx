import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { QRCodeCanvas } from 'qrcode.react';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { banApi, businessApi, entryApi, queueApi } from '../lib/queueApi';
import { subscribeToQueue } from '../lib/queueChannel';
import Spinner from '../components/Spinner';
import { formatTimeAgo } from '../lib/utils';
import { supabase } from '../lib/supabase';

const tabs = [
  { id: 'Overview', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg> },
  { id: 'Waitlist', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
  { id: 'QR Code', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg> },
  { id: 'History', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> },
  { id: 'Banned', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg> },
  { id: 'Settings', icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg> },
] as const;

type Tab = (typeof tabs)[number]['id'];

export default function DashboardPage() {
  document.title = 'Enqueue — Dashboard';

  const [tab, setTab] = useState<Tab>('Overview');
  const { user, signOut } = useAuth();
  const queryClient = useQueryClient();
  const qrRef = useRef<HTMLCanvasElement>(null);

  // ---------------- BUSINESS ----------------
  const businessQ = useQuery({
    queryKey: ['business', user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await businessApi.getByOwner(user!.id);
      if (error) throw error;
      return data ?? null;
    },
  });

  // ---------------- QUEUE ----------------
  const queueQ = useQuery({
    queryKey: ['queue', businessQ.data?.id],
    enabled: !!businessQ.data?.id,
    queryFn: async () => {
      if (!businessQ.data?.id) return null;
      const { data, error } = await queueApi.getByBusiness(businessQ.data.id);
      if (error) throw error;
      
      if (!data) {
        const { data: newQueue } = await supabase
          .from('queues')
          .insert({ business_id: businessQ.data.id, name: 'Main Queue' })
          .select()
          .single();
        return newQueue;
      }
      
      return data;
    },
  });

  // ---------------- WAITING ----------------
  const waitingQ = useQuery({
    queryKey: ['waiting', queueQ.data?.id],
    enabled: !!queueQ.data?.id,
    queryFn: async () => {
      const { data } = await entryApi.getWaiting(queueQ.data!.id);
      return data ?? [];
    },
  });

  // ---------------- STATS ----------------
  const statsQ = useQuery({
    queryKey: ['stats', queueQ.data?.id],
    enabled: !!queueQ.data?.id && !!businessQ.data?.id,
    queryFn: () => {
      if (!queueQ.data?.id || !businessQ.data?.id) return null;
      return entryApi.getStats(queueQ.data.id, businessQ.data.id);
    },
  });

  // ---------------- HISTORY ----------------
  const historyQ = useQuery({
    queryKey: ['history', queueQ.data?.id],
    enabled: !!queueQ.data?.id,
    queryFn: async () => {
      if (!queueQ.data?.id) return [];
      const { data } = await entryApi.getHistory(queueQ.data.id);
      return data ?? [];
    },
  });

  // ---------------- BANS ----------------
  const bansQ = useQuery({
    queryKey: ['bans', businessQ.data?.id],
    enabled: !!businessQ.data?.id,
    queryFn: async () => {
      if (!businessQ.data?.id) return [];
      const { data } = await banApi.getAll(businessQ.data.id);
      return data ?? [];
    },
  });

  // ---------------- REALTIME ----------------
  useEffect(() => {
    if (!queueQ.data?.id) return;
    return subscribeToQueue(
      queueQ.data.id,
      () => {
        queryClient.invalidateQueries({ queryKey: ['waiting'] });
        queryClient.invalidateQueries({ queryKey: ['stats'] });
      },
      () => {
        queryClient.invalidateQueries({ queryKey: ['history'] });
        queryClient.invalidateQueries({ queryKey: ['stats'] });
        queryClient.invalidateQueries({ queryKey: ['bans'] });
        queryClient.invalidateQueries({ queryKey: ['waiting'] });
      }
    );
  }, [queueQ.data?.id, queryClient]);

  const serving = useMemo(
    () => historyQ.data?.find((e) => e.status === 'serving'),
    [historyQ.data]
  );

  const callNext = useMutation({
    mutationFn: async () => {
      if (!queueQ.data?.id) throw new Error('No queue found');
      return entryApi.callNext(queueQ.data.id);
    },
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (e) => toast.error((e as Error).message),
  });

  const downloadQR = () => {
    if (!qrRef.current) return;
    const canvas = qrRef.current;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `qrcode-${businessQ.data?.slug}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (businessQ.isLoading || queueQ.isLoading) return <Spinner />;

  if (!businessQ.data) {
    return (
      <div className="flex h-screen items-center justify-center p-6 text-center">
        <div className="max-w-sm rounded-2xl bg-white p-8 shadow-xl">
          <p className="text-lg font-medium text-slate-600">No business profile found. Please create one to continue.</p>
        </div>
      </div>
    );
  }

  const queueUrl = `${window.location.origin}/queue/${businessQ.data.slug}`;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* SIDEBAR */}
      <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col border-r border-slate-200 bg-white md:flex">
        <div className="flex items-center gap-3 p-6 pb-2">
          <img src="/logo.png" alt="Enqueue Logo" className="h-16 w-auto object-contain" />
        </div>

        <nav className="flex-1 space-y-1 px-4 py-4">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold transition-all ${
                tab === t.id
                  ? 'bg-indigo-50 text-[var(--eq-indigo)]'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <span className="text-slate-400 group-hover:text-[var(--eq-indigo)] transition-colors">{t.icon}</span>
              {t.id}
            </button>
          ))}
        </nav>

        <div className="border-t border-slate-100 p-4">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Logged in as</p>
            <p className="mt-1 truncate text-sm font-medium text-slate-700">{user?.email}</p>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 pb-20 md:ml-64 md:pb-0">
        {/* HEADER */}
        <header className="sticky top-0 z-10 flex flex-col gap-4 border-b border-slate-200 bg-white/80 px-4 py-4 backdrop-blur-md sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex flex-col">
              <h1 className="text-xl font-bold text-slate-900 truncate max-w-[200px] sm:max-w-xs">{businessQ.data.name}</h1>
              <p className="text-xs font-medium text-slate-500">Restaurant Dashboard • {tab}</p>
            </div>
            
            <div className="ml-4 flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 shrink-0">
              <div className={`h-2 w-2 rounded-full ${queueQ.data?.is_paused ? 'bg-rose-500' : 'bg-green-500 animate-pulse'}`} />
              <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest text-slate-500">
                Waitlist {queueQ.data?.is_paused ? 'Closed' : 'Open'}
              </span>
              <span className="sm:hidden text-[10px] font-black uppercase tracking-widest text-slate-500">
                {queueQ.data?.is_paused ? 'Closed' : 'Open'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 w-full sm:w-auto justify-end">
            <button
              onClick={async () => {
                if (!queueQ.data) return;
                await queueApi.setPaused(queueQ.data.id, !queueQ.data.is_paused);
                queryClient.invalidateQueries({ queryKey: ['queue'] });
                toast.success(`Queue ${!queueQ.data.is_paused ? 'Closed' : 'Opened'}`);
              }}
              className={`flex-1 sm:flex-none rounded-lg px-4 py-2 text-sm font-bold transition-all text-center ${
                queueQ.data?.is_paused 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {queueQ.data?.is_paused ? 'Open Waitlist' : 'Close Waitlist'}
            </button>
            <div className="hidden h-8 w-[1px] bg-slate-200 sm:block" />
            <button
              onClick={() => signOut()}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 shrink-0"
            >
              Sign Out
            </button>
          </div>
        </header>

        <div className="mx-auto max-w-6xl p-6 md:p-8">
          {/* OVERVIEW */}
          {tab === 'Overview' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Diners Waiting" value={statsQ.data?.waiting ?? 0} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} color="indigo" />
                <StatCard label="Seated Today" value={statsQ.data?.served_today ?? 0} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>} color="green" />
                <StatCard label="Avg. Wait Time" value={`${statsQ.data?.avg_wait_minutes ?? 0}m`} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="amber" />
                <StatCard label="No-shows Today" value={statsQ.data?.no_shows_today ?? 0} icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>} color="rose" />
              </div>

              <div className="flex flex-col items-center justify-center rounded-3xl bg-[var(--eq-indigo)] p-12 text-center text-white shadow-2xl shadow-indigo-200">
                <h3 className="text-3xl font-bold">Ready to seat the next diner?</h3>
                <p className="mt-2 text-indigo-100">Click below to call the next party from the waitlist.</p>
                <button
                  onClick={() => callNext.mutate()}
                  className="mt-8 rounded-full bg-white px-10 py-4 text-lg font-black text-[var(--eq-indigo)] shadow-xl transition-all hover:scale-105 active:scale-95"
                >
                  Call Next Diner →
                </button>
              </div>
            </div>
          )}

          {/* WAITLIST */}
          {tab === 'Waitlist' && (
            <div className="space-y-6">
              {serving && (
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-indigo-100 bg-indigo-50 p-6 shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-white">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-indigo-600 uppercase tracking-wider">Now Seating</p>
                      <p className="text-2xl font-black text-indigo-900">{serving.customer_name}</p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      onClick={async () => {
                        await entryApi.skip(serving.id, queueQ.data!.id);
                        await entryApi.callNext(queueQ.data!.id);
                        queryClient.invalidateQueries();
                        toast.success('Diner skipped, calling next!');
                      }}
                      className="w-full sm:w-auto rounded-xl border border-indigo-200 bg-white px-6 py-3 font-bold text-indigo-600 shadow-sm transition-all hover:bg-indigo-50"
                    >
                      Skip & Next
                    </button>
                    <button
                      onClick={async () => {
                        await entryApi.markServed(serving.id);
                        await entryApi.callNext(queueQ.data!.id);
                        queryClient.invalidateQueries();
                        toast.success('Diner seated, calling next!');
                      }}
                      className="w-full sm:w-auto rounded-xl bg-green-600 px-6 py-3 font-bold text-white shadow-lg shadow-green-100 transition-all hover:scale-105 active:scale-95"
                    >
                      Mark as Seated & Next →
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
                  <h3 className="font-bold text-slate-800">Current Waitlist</h3>
                </div>
                
                <div className="divide-y divide-slate-100">
                  {(waitingQ.data ?? []).length === 0 ? (
                    <div className="flex flex-col items-center py-20 text-slate-400">
                      <svg className="w-12 h-12 mb-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
                      <p className="font-medium">The waitlist is empty.</p>
                    </div>
                  ) : (
                    (waitingQ.data ?? []).map((e) => (
                      <div key={e.id} className="flex items-center justify-between px-6 py-5 transition-colors hover:bg-slate-50/50">
                        <div className="flex items-center gap-4">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 font-black text-slate-500">
                            {e.position}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{e.customer_name}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-medium text-slate-400">Joined {formatTimeAgo(e.joined_at)}</p>
                              {e.customer_phone && (
                                <>
                                  <span className="text-[10px] text-slate-300">•</span>
                                  <p className="text-xs font-bold text-[var(--eq-indigo)]">{e.customer_phone}</p>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-4 sm:mt-0">
                          <button
                            onClick={async () => {
                              await entryApi.skip(e.id, e.queue_id);
                              queryClient.invalidateQueries();
                              toast.success('Customer moved to end');
                            }}
                            className="flex-1 sm:flex-none rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition-colors hover:bg-white text-center"
                          >
                            Skip
                          </button>
                          <button
                            onClick={async () => {
                              if (confirm(`Ban ${e.customer_name}?`)) {
                                const { error } = await entryApi.ban(e.id, businessQ.data!.id, e.customer_name, e.customer_phone || undefined);
                                if (error) {
                                  toast.error('Failed: ' + (error as any).message);
                                } else {
                                  await queryClient.invalidateQueries();
                                  toast.success('Customer banned and added to Banned list');
                                }
                              }
                            }}
                            className="flex-1 sm:flex-none rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100 text-center"
                          >
                            Ban
                          </button>
                          <button
                            onClick={async () => {
                              await entryApi.remove(e.id, e.queue_id);
                              queryClient.invalidateQueries();
                            }}
                            className="flex-1 sm:flex-none rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-400 transition-colors hover:text-slate-600 text-center"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* QR CODE */}
          {tab === 'QR Code' && (
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200 bg-white p-10 shadow-sm">
                <div className="rounded-2xl border-8 border-slate-50 p-4 shadow-inner">
                  <QRCodeCanvas
                    value={queueUrl}
                    size={280}
                    fgColor="#000000"
                    includeMargin={true}
                    ref={qrRef}
                  />
                </div>
                <button
                  onClick={downloadQR}
                  className="mt-8 rounded-full bg-slate-900 px-8 py-3 font-bold text-white transition-all hover:scale-105 active:scale-95"
                >
                  Download PNG ↓
                </button>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl bg-white p-8 border border-slate-200 shadow-sm">
                  <h3 className="text-lg font-bold text-slate-900">Your Unique Links</h3>
                  <p className="mt-1 text-sm text-slate-500">Share these with your diners to join the waitlist.</p>

                  <div className="mt-8 space-y-6">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Restaurant Code</label>
                      <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
                        <code className="text-xl font-black text-indigo-600">{businessQ.data.slug}</code>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(businessQ.data.slug);
                            toast.success('Code copied!');
                          }}
                          className="text-xs font-bold text-slate-400 hover:text-slate-600"
                        >
                          COPY
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Full Link</label>
                      <div className="mt-2 flex items-center justify-between rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100">
                        <span className="truncate text-sm font-medium text-slate-600">{queueUrl}</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(queueUrl);
                            toast.success('URL copied!');
                          }}
                          className="text-xs font-bold text-slate-400 hover:text-slate-600"
                        >
                          COPY
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-2xl bg-indigo-600 p-8 text-white shadow-xl shadow-indigo-100">
                  <h4 className="font-bold">Pro Tip 💡</h4>
                  <p className="mt-2 text-sm text-indigo-100">Print your QR code and place it at your host stand or entrance. Diners can join the waitlist directly from their phones!</p>
                </div>
              </div>
            </div>
          )}

          {/* HISTORY */}
          {tab === 'History' && (
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
               <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4 flex justify-between items-center">
                  <h3 className="font-bold text-slate-800">Recent Activity</h3>
                  <span className="text-xs font-bold text-slate-400">Last 50 diners</span>
                </div>
                <div className="divide-y divide-slate-100">
                  {(historyQ.data ?? []).length === 0 ? (
                    <p className="p-10 text-center text-slate-400">No history available.</p>
                  ) : (
                    (historyQ.data ?? []).map((h) => (
                      <div key={h.id} className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`h-2 w-2 rounded-full ${h.status === 'done' ? 'bg-green-500' : 'bg-slate-300'}`} />
                          <span className="font-bold text-slate-800">{h.customer_name}</span>
                        </div>
                        <span className={`rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                          h.status === 'done' ? 'bg-green-50 text-green-600' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {h.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
            </div>
          )}

          {/* BANNED */}
          {tab === 'Banned' && (
            <div className="max-w-2xl space-y-4">
              {bansQ.isLoading ? (
                <div className="flex items-center justify-center p-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[var(--eq-indigo)]" />
                </div>
              ) : (bansQ.data ?? []).length === 0 ? (
                <div className="rounded-3xl bg-white p-12 text-center border border-slate-200 shadow-sm">
                   <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 text-2xl mb-4">🛡️</div>
                   <p className="text-slate-400 font-medium">No banned diners yet.</p>
                </div>
              ) : (
                (bansQ.data ?? []).map((b) => (
                  <div key={b.id} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-500 font-bold">
                        !
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{b.name}</p>
                        {b.phone && <p className="text-xs text-slate-400">{b.phone}</p>}
                      </div>
                    </div>
                    <button
                      onClick={async () => {
                        await banApi.unban(b.id);
                        toast.success('Unbanned');
                        queryClient.invalidateQueries();
                      }}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
                    >
                      Unban
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {/* SETTINGS */}
          {tab === 'Settings' && (
             <div className="max-w-md space-y-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
                   <h3 className="font-bold text-slate-900">Waitlist Settings</h3>
                   <p className="mt-1 text-sm text-slate-500">Manage your waitlist baseline and status.</p>
                   
                    <div className="mt-8 space-y-6">
                      <div className="space-y-1">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Initial Avg Wait (Minutes)</label>
                        <div className="flex gap-2">
                          <input 
                            className="w-full rounded-xl border-none bg-slate-50 px-4 py-3 font-medium focus:ring-2 focus:ring-[var(--eq-indigo)]" 
                            defaultValue={businessQ.data?.initial_avg_wait_minutes} 
                            type="number"
                            id="initialWaitInput"
                          />
                          <button
                            onClick={async () => {
                              const val = (document.getElementById('initialWaitInput') as HTMLInputElement).value;
                              await supabase.from('businesses').update({ initial_avg_wait_minutes: parseInt(val) }).eq('id', businessQ.data!.id);
                              queryClient.invalidateQueries();
                              toast.success('Wait time updated');
                            }}
                            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white"
                          >
                            Save
                          </button>
                        </div>
                        <p className="mt-2 text-[10px] text-slate-400">Used as a baseline when no historical data is available.</p>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-black uppercase tracking-widest text-slate-400 ml-1">Public URL Slug</label>
                        <div className="flex gap-2">
                          <input 
                            className="w-full rounded-xl border-none bg-slate-50 px-4 py-3 font-medium focus:ring-2 focus:ring-[var(--eq-indigo)]" 
                            defaultValue={businessQ.data?.slug} 
                            type="text"
                            id="slugInput"
                          />
                          <button
                            onClick={async () => {
                              const val = (document.getElementById('slugInput') as HTMLInputElement).value;
                              const { error } = await supabase.from('businesses').update({ slug: val.trim().toLowerCase() }).eq('id', businessQ.data!.id);
                              if (error) {
                                toast.error('Slug already taken or invalid');
                              } else {
                                queryClient.invalidateQueries();
                                toast.success('URL updated successfully');
                              }
                            }}
                            className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white"
                          >
                            Update
                          </button>
                        </div>
                        <p className="mt-2 text-[10px] text-slate-400">Your public link: {window.location.origin}/queue/{businessQ.data?.slug}</p>
                      </div>

                      <div className="border-t border-slate-100 pt-6">
                        <button
                          onClick={() => signOut()}
                          className="w-full rounded-xl bg-rose-600 py-3.5 font-bold text-white transition-all hover:bg-rose-700 active:scale-[0.98]"
                        >
                          Sign Out From Dashboard
                        </button>
                      </div>
                   </div>
                </div>
             </div>
          )}
        </div>
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 z-50 flex w-full justify-around border-t border-slate-200 bg-white px-2 py-3 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)] md:hidden">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex flex-col items-center gap-1 rounded-lg px-2 text-[10px] font-bold transition-all ${
              tab === t.id ? 'text-[var(--eq-indigo)] scale-110' : 'text-slate-400'
            }`}
          >
            <span className="[&>svg]:h-5 [&>svg]:w-5">{t.icon}</span>
            <span className="truncate max-w-[60px]">{t.id}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: React.ReactNode; color: 'indigo' | 'green' | 'amber' | 'rose' }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  };

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition-transform hover:scale-[1.02]">
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${colors[color]}`}>
        {icon}
      </div>
      <p className="mt-6 text-xs font-bold uppercase tracking-widest text-slate-400">{label}</p>
      <p className="mt-1 text-3xl font-black text-slate-900">{value}</p>
    </div>
  );
}