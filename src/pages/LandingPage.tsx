import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../components/Logo';
import { useAuth } from '../context/AuthContext';
import { businessApi } from '../lib/queueApi';
import { Business } from '../types';

export default function LandingPage() {
  document.title = 'Enqueue — Premium Waitlist & Table Management';
  const navigate = useNavigate();
  const { user } = useAuth();
  const [slug, setSlug] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Business[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingResults, setIsLoadingResults] = useState(false);

  // Prefetch some businesses for immediate display
  useEffect(() => {
    const prefetch = async () => {
      try {
        const { data, error } = await businessApi.search('');
        if (error) console.error('[DEBUG] Prefetch error:', error);
        setSearchResults(data || []);
      } catch (err) {
        console.error('[DEBUG] Prefetch catch:', err);
      }
    };
    prefetch();
  }, []);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (slug.trim()) navigate(`/queue/${slug.trim()}`);
  };

  const onSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setShowDropdown(true);
    setIsLoadingResults(true);
    const { data } = await businessApi.search(searchQuery);
    setSearchResults(data || []);
    setIsLoadingResults(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between p-4 sm:p-6 gap-y-4 gap-x-4">
          <div className="order-1">
            <Logo />
          </div>
          
          {/* SEARCH BAR */}
          <div className="relative order-3 md:order-2 w-full md:flex-1 max-w-md mx-0 md:mx-8">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none">
                <svg className="w-4 h-4 text-slate-400 group-focus-within:text-[var(--eq-indigo)] transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="Search for a restaurant..."
                className="w-full bg-slate-50 border-none rounded-full py-2.5 pl-11 pr-4 text-sm font-medium focus:ring-2 focus:ring-[var(--eq-indigo)] transition-all shadow-inner"
                value={searchQuery}
                onFocus={async () => {
                  setShowDropdown(true);
                  // Refresh results if empty query
                  if (!searchQuery) {
                    setIsLoadingResults(true);
                    const { data, error } = await businessApi.search('');
                    if (error) console.error('[DEBUG] onFocus error:', error);
                    setSearchResults(data || []);
                    setIsLoadingResults(false);
                  }
                }}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                onChange={async (e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  setShowDropdown(true);
                  setIsLoadingResults(true);
                  const { data, error } = await businessApi.search(val);
                  if (error) console.error('[DEBUG] onChange error:', error);
                  setSearchResults(data || []);
                  setIsLoadingResults(false);
                }}
              />
            </div>
            
            {/* DROPDOWN */}
            {showDropdown && (
              <div className="absolute top-full left-0 right-0 z-[60] mt-2 bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-3">
                  {isLoadingResults ? (
                    <div className="px-4 py-6 text-center">
                      <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-slate-200 border-t-[var(--eq-indigo)] mb-2"></div>
                      <p className="text-xs font-bold text-slate-400">Finding restaurants...</p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-xs font-bold text-slate-400">No restaurants found</p>
                    </div>
                  ) : (
                    <>
                      {!searchQuery && (
                        <div className="px-4 py-2 border-b border-slate-50 mb-2">
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">All Registered Restaurants</p>
                        </div>
                      )}
                      <div className="divide-y divide-slate-50 max-h-[300px] overflow-y-auto custom-scrollbar">
                        {searchResults.map((b) => (
                        <button
                          key={b.id}
                          onClick={() => navigate(`/queue/${b.slug}`)}
                          className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors rounded-xl text-left"
                        >
                          <div>
                            <p className="font-bold text-slate-900">{b.name}</p>
                            <p className="text-xs text-slate-400">Join the waitlist</p>
                          </div>
                          <svg className="w-4 h-4 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 order-2 md:order-3">
            {user ? (
              <Link to="/dashboard" className="rounded-full bg-[var(--eq-indigo)] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-100 transition-transform hover:scale-105 active:scale-95 whitespace-nowrap text-xs sm:text-sm">
                Go to Dashboard
              </Link>
            ) : (
              <Link to="/login" className="rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-50 shadow-sm whitespace-nowrap text-xs sm:text-sm">
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-20">
        {/* HERO SECTION */}
        <section className="flex flex-col items-center text-center mb-32">
          <span className="mb-6 inline-block rounded-full bg-indigo-50 px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-indigo-600 ring-1 ring-indigo-100 animate-fade-in">
            Premium Waitlist Management
          </span>
          <h1 className="text-5xl font-black tracking-tight text-slate-900 md:text-7xl lg:text-8xl max-w-4xl leading-[1.1]">
            Your restaurant waitlist, finally <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--eq-indigo)] to-emerald-500">under control.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg text-slate-600 md:text-xl leading-relaxed">
            Eliminate physical lines and bulky buzzers. Enqueue empowers premium restaurants to manage diners with elegant QR codes and real-time digital waitlists.
          </p>
          
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <a href="#get-started" className="rounded-full bg-slate-900 px-8 py-4 text-lg font-bold text-white shadow-2xl transition-all hover:scale-105 active:scale-95">
              Get Started Free
            </a>
            <a href="#features" className="rounded-full border border-slate-200 bg-white px-8 py-4 text-lg font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50">
              Explore Features
            </a>
          </div>
        </section>

        {/* STATS / TRUST BAR */}
        <div className="mb-32 grid grid-cols-2 gap-8 border-y border-slate-100 py-12 md:grid-cols-4 text-center">
          <div>
            <p className="text-3xl font-black text-slate-900">500+</p>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-widest mt-1">Restaurants</p>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900">1M+</p>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-widest mt-1">Diners Seated</p>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900">99.9%</p>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-widest mt-1">Uptime</p>
          </div>
          <div>
            <p className="text-3xl font-black text-slate-900">15min</p>
            <p className="text-sm font-medium text-slate-500 uppercase tracking-widest mt-1">Avg. Wait Saved</p>
          </div>
        </div>

        {/* FEATURES GRID */}
        <section id="features" className="mb-40">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-slate-900 md:text-4xl">Everything you need to <br/> run a smoother front-of-house.</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>}
              title="Touchless Check-in"
              description="Diners join your waitlist by scanning a beautiful, branded QR code at your entrance."
            />
            <FeatureCard 
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
              title="Real-time Updates"
              description="Live countdowns and position tracking keep diners informed on their own devices."
            />
            <FeatureCard 
              icon={<svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
              title="Smart Analytics"
              description="Track average wait times and peak hours to optimize your restaurant's performance."
            />
          </div>
        </section>

        {/* GET STARTED CARDS */}
        <section id="get-started" className="scroll-mt-32">
          <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-stretch lg:justify-center">
            {/* Join Queue Section */}
            <div className="w-full max-w-md rounded-[2.5rem] bg-white p-10 shadow-2xl shadow-slate-200/50 border border-slate-100 flex flex-col">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-[var(--eq-indigo)] mb-8 shadow-inner">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-black text-slate-900">Join a Waitlist</h2>
              <p className="mt-2 text-slate-500 mb-8">Hungry? Enter the restaurant code or search in the header to grab your spot.</p>
              
              <div className="mt-auto space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Restaurant Code</label>
                  <input
                    className="w-full rounded-2xl border-none bg-slate-50 px-5 py-4 font-bold text-xl placeholder:font-medium focus:ring-2 focus:ring-[var(--eq-indigo)] transition-all"
                    placeholder="e.g. coffee-house"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                  />
                </div>
                <button 
                  onClick={onSubmit}
                  className="w-full rounded-2xl bg-[var(--eq-indigo)] py-5 font-black text-white shadow-xl shadow-indigo-100 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  Join Waitlist Now →
                </button>
              </div>
            </div>

            {/* Business Sign Up Section */}
            <div className="w-full max-w-md rounded-[2.5rem] bg-slate-900 p-10 text-white shadow-2xl shadow-slate-900/20 flex flex-col">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-[var(--eq-indigo)] mb-8 shadow-inner">
                <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-7h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-2xl font-black">For Restaurants</h2>
              <p className="mt-2 text-slate-400 mb-8">Manage your tables like a pro. Set up your restaurant in under 60 seconds.</p>
              
              <ul className="space-y-4 mb-10">
                <li className="flex gap-4 items-center font-medium">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--eq-indigo)] text-xs">✓</span>
                  No monthly hardware costs
                </li>
                <li className="flex gap-4 items-center font-medium">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--eq-indigo)] text-xs">✓</span>
                  SMS & Digital notifications
                </li>
                <li className="flex gap-4 items-center font-medium">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--eq-indigo)] text-xs">✓</span>
                  Customer banning & security
                </li>
              </ul>

              <div className="mt-auto">
                {user ? (
                  <Link to="/dashboard" className="block w-full rounded-2xl bg-white py-5 text-center font-black text-slate-900 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    Go to Dashboard
                  </Link>
                ) : (
                  <Link to="/signup" className="block w-full rounded-2xl bg-white py-5 text-center font-black text-slate-900 transition-all hover:scale-[1.02] active:scale-[0.98]">
                    Create Account — It's Free
                  </Link>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-100 bg-white py-20">
        <div className="mx-auto max-w-7xl px-6 grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="col-span-1 md:col-span-2">
            <Logo />
            <p className="mt-6 max-w-xs text-slate-500 leading-relaxed">
              The modern way to manage restaurant waitlists. Premium experience for diners, powerful tools for owners.
            </p>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-6">Product</h4>
            <ul className="space-y-4 text-sm font-medium text-slate-500">
              <li><a href="#features" className="hover:text-[var(--eq-indigo)] transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-[var(--eq-indigo)] transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-[var(--eq-indigo)] transition-colors">Security</a></li>
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-slate-900 mb-6">Company</h4>
            <ul className="space-y-4 text-sm font-medium text-slate-500">
              <li><a href="#" className="hover:text-[var(--eq-indigo)] transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-[var(--eq-indigo)] transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-[var(--eq-indigo)] transition-colors">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-6 mt-20 pt-8 border-t border-slate-50 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">© {new Date().getFullYear()} Enqueue Systems. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return (
    <div className="rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-100/50 transition-all hover:scale-[1.03] hover:shadow-2xl">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-[var(--eq-indigo)] mb-6">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-500 leading-relaxed">{description}</p>
    </div>
  );
}
