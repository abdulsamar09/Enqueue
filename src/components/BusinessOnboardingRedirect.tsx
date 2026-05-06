import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import Spinner from './Spinner';

async function checkBusinessExists(ownerId: string) {
  // Required onboarding check: route-only Supabase query by owner_id.
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('owner_id', ownerId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export function RequireBusiness({ children }: PropsWithChildren) {
  const { user, loading } = useAuth();
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  const [hasBusiness, setHasBusiness] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoadingBusiness(true);
    void checkBusinessExists(user.id)
      .then((exists) => setHasBusiness(exists))
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error('[Enqueue] business existence check failed:', e);
        toast.error('Unable to load onboarding status');
        setHasBusiness(null);
      })
      .finally(() => setLoadingBusiness(false));
  }, [user]);

  if (loading || loadingBusiness) return <Spinner />;
  if (hasBusiness === false) return <Navigate to="/create-business" replace />;
  if (hasBusiness === true) return <>{children}</>;
  return <div className="p-6">Unable to load onboarding status.</div>;
}

export function NoBusinessYet({ children }: PropsWithChildren) {
  const { user, loading } = useAuth();
  const [loadingBusiness, setLoadingBusiness] = useState(true);
  const [hasBusiness, setHasBusiness] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoadingBusiness(true);
    void checkBusinessExists(user.id)
      .then((exists) => setHasBusiness(exists))
      .catch((e) => {
        // eslint-disable-next-line no-console
        console.error('[Enqueue] business existence check failed:', e);
        toast.error('Unable to load onboarding status');
        setHasBusiness(null);
      })
      .finally(() => setLoadingBusiness(false));
  }, [user]);

  if (loading || loadingBusiness) return <Spinner />;
  if (hasBusiness === true) return <Navigate to="/dashboard" replace />;
  if (hasBusiness === false) return <>{children}</>;
  return <div className="p-6">Unable to load onboarding status.</div>;
}

