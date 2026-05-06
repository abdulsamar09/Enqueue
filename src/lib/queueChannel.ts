import { supabase } from './supabase';

export const subscribeToQueue = (
  queue_id: string,
  onEntryChange: () => void,
  onQueueChange: () => void
): (() => void) => {
  const channel = supabase
    .channel(`queue:${queue_id}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'queue_entries', filter: `queue_id=eq.${queue_id}` },
      onEntryChange
    )
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'queues', filter: `id=eq.${queue_id}` },
      onQueueChange
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
};
