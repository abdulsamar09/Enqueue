import { supabase } from './supabase';
import type {
  BannedCustomer,
  Business,
  Queue,
  QueueEntry,
  QueueStats,
} from '../types';

//
// ===================== BUSINESS API =====================
//
export const businessApi = {
  async create(owner_id: string, name: string, slug: string, initial_avg_wait_minutes: number = 5) {
    const { data, error } = await supabase
      .from('businesses')
      .insert({ owner_id, name, slug: slug.trim().toLowerCase(), initial_avg_wait_minutes })
      .select()
      .single<Business>();

    return { data, error };
  },

  async getByOwner(owner_id: string) {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('owner_id', owner_id)
      .single<Business>();

    return { data, error };
  },

  async getBySlug(slug: string) {
    const cleanSlug = slug.trim().toLowerCase();

    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .eq('slug', cleanSlug);

    console.log('[DEBUG getBySlug]', { cleanSlug, data, error });

    return {
      data: data?.[0] ?? null,
      error,
    };
  },

  async updateName(id: string, name: string) {
    const { data, error } = await supabase
      .from('businesses')
      .update({ name })
      .eq('id', id)
      .select()
      .single<Business>();

    return { data, error };
  },

  async search(query: string) {
    const { data, error } = await supabase
      .from('businesses')
      .select('*')
      .ilike('name', `%${query}%`)
      .limit(100);

    return { data: data ?? [], error };
  },
};

//
// ===================== QUEUE API =====================
//
export const queueApi = {
  async getByBusiness(business_id: string) {
    const { data, error } = await supabase
      .from('queues')
      .select('*')
      .eq('business_id', business_id);

    return {
      data: data?.[0] ?? null,
      error,
    };
  },

  async setPaused(queue_id: string, is_paused: boolean) {
    const { data, error } = await supabase
      .from('queues')
      .update({ is_paused })
      .eq('id', queue_id)
      .select()
      .single<Queue>();

    return { data, error };
  },
};

//
// ===================== ENTRY API =====================
//
export const entryApi = {
  async getWaiting(queue_id: string) {
    const { data, error } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('queue_id', queue_id)
      .eq('status', 'waiting')
      .order('position', { ascending: true });

    return { data: data ?? [], error };
  },

  async getById(entry_id: string) {
    const { data, error } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('id', entry_id)
      .single<QueueEntry>();

    return { data, error };
  },

  async join(
    queue_id: string,
    business_id: string,
    customer_name: string,
    customer_phone?: string
  ) {
    try {
      const cleanPhone = customer_phone?.replace(/\D/g, '') || '';
      const { data: ban } = await supabase
        .from('banned_customers')
        .select('id')
        .eq('business_id', business_id)
        .eq('phone', cleanPhone)
        .maybeSingle();

      if (ban) {
        return {
          data: null,
          error: new Error('You are banned from this queue.'),
          banned: true,
        };
      }

      const { data: last } = await supabase
        .from('queue_entries')
        .select('position')
        .eq('queue_id', queue_id)
        .order('position', { ascending: false })
        .limit(1);

      const nextPosition = (last?.[0]?.position ?? 0) + 1;

      const { data, error } = await supabase
        .from('queue_entries')
        .insert({
          queue_id,
          business_id,
          customer_name: customer_name.trim(),
          customer_phone: customer_phone?.trim() || null,
          position: nextPosition,
          status: 'waiting',
        })
        .select()
        .single<QueueEntry>();

      return { data, error, banned: false };
    } catch (error) {
      return { data: null, error: error as Error, banned: false };
    }
  },

  async getHistory(queue_id: string) {
    const { data, error } = await supabase
      .from('queue_entries')
      .select('*')
      .eq('queue_id', queue_id)
      .neq('status', 'waiting')
      .order('joined_at', { ascending: false })
      .limit(50);
    return { data: data ?? [], error };
  },

  async getStats(queue_id: string, business_id: string): Promise<QueueStats> {
    const today = new Date().toISOString().split('T')[0];

    // Get business initial wait for fallback
    const { data: biz } = await supabase.from('businesses').select('initial_avg_wait_minutes').eq('id', business_id).single();
    const fallbackWait = biz?.initial_avg_wait_minutes ?? 5;

    const [waiting, served, noShow, history] = await Promise.all([
      supabase.from('queue_entries').select('id', { count: 'exact' }).eq('queue_id', queue_id).eq('status', 'waiting'),
      supabase.from('queue_entries').select('id', { count: 'exact' }).eq('business_id', business_id).eq('status', 'done').gte('served_at', today),
      supabase.from('queue_entries').select('id', { count: 'exact' }).eq('business_id', business_id).in('status', ['removed', 'no_show']).gte('joined_at', today),
      supabase.from('queue_entries')
        .select('joined_at, served_at')
        .eq('queue_id', queue_id)
        .eq('status', 'done')
        .order('served_at', { ascending: false })
        .limit(50),
    ]);

    let avgWait = fallbackWait;
    if (history.data && history.data.length > 0) {
      const totalMinutes = history.data.reduce((acc, entry) => {
        const wait = (new Date(entry.served_at).getTime() - new Date(entry.joined_at).getTime()) / (1000 * 60);
        return acc + wait;
      }, 0);
      avgWait = Math.round(totalMinutes / history.data.length);
      if (avgWait < 1) avgWait = 1;
    }

    return {
      waiting: waiting.count ?? 0,
      served_today: served.count ?? 0,
      no_shows_today: noShow.count ?? 0,
      avg_wait_minutes: avgWait,
    };
  },

  async callNext(queue_id: string) {
    // 1. Complete current serving
    await supabase.from('queue_entries').update({ status: 'done', served_at: new Date().toISOString() }).eq('queue_id', queue_id).eq('status', 'serving');

    // 2. Get next in line
    const { data: next } = await supabase.from('queue_entries').select('*').eq('queue_id', queue_id).eq('status', 'waiting').order('position', { ascending: true }).limit(1).single();

    if (!next) return { data: null, error: null };

    // 3. Set to serving
    const { data, error } = await supabase.from('queue_entries').update({ status: 'serving', called_at: new Date().toISOString() }).eq('id', next.id).select().single();

    return { data, error };
  },

  async markServed(entry_id: string) {
    return supabase.from('queue_entries').update({ status: 'done', served_at: new Date().toISOString() }).eq('id', entry_id);
  },

  async ban(entry_id: string, business_id: string, customer_name: string, customer_phone?: string) {
    try {
      // 1. Mark entry as banned
      const { error: updateError } = await supabase.from('queue_entries').update({ status: 'banned' }).eq('id', entry_id);
      if (updateError) throw updateError;
      
      // 2. Add to banned_customers
      const cleanPhone = customer_phone?.replace(/\D/g, '') || null;
      const { data, error: insertError } = await supabase.from('banned_customers').insert({
        business_id,
        name: customer_name.trim(),
        phone: cleanPhone,
        reason: 'Banned by business owner'
      }).select();

      if (insertError) throw insertError;
      return { data: data?.[0] ?? null, error: null };
    } catch (error) {
      console.error('[BAN ERROR]', error);
      return { data: null, error: error as Error };
    }
  },

  async skip(entry_id: string, queue_id: string) {
    // Retain in queue but move to end of 'waiting' list or just keep waiting
    // User said "retain the current person in the queue, and call up the next one simultaneously"
    // We'll just set them back to 'waiting' and increment their position so they are at the end
    const { data: last } = await supabase
      .from('queue_entries')
      .select('position')
      .eq('queue_id', queue_id)
      .order('position', { ascending: false })
      .limit(1);
    
    const nextPosition = (last?.[0]?.position ?? 0) + 1;
    
    return supabase.from('queue_entries').update({ status: 'waiting', position: nextPosition }).eq('id', entry_id);
  },

  async remove(entry_id: string, queue_id: string) {
    return supabase.from('queue_entries').update({ status: 'removed' }).eq('id', entry_id);
  },
};

//
// ===================== BAN API =====================
//
export const banApi = {
  async getAll(business_id: string) {
    const { data, error } = await supabase
      .from('banned_customers')
      .select('*')
      .eq('business_id', business_id)
      .order('banned_at', { ascending: false });

    return { data: data ?? [], error };
  },

  async unban(ban_id: string) {
    const { error } = await supabase
      .from('banned_customers')
      .delete()
      .eq('id', ban_id);

    return { error };
  },
};