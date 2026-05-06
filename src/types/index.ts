export interface Business {
  id: string;
  owner_id: string;
  name: string;
  description?: string | null;
  slug: string;
  initial_avg_wait_minutes: number;
  created_at: string;
}

export interface Queue {
  id: string;
  business_id: string;
  name: string;
  is_paused: boolean;
  created_at: string;
}

export type EntryStatus = 'waiting' | 'serving' | 'done' | 'removed' | 'banned' | 'no_show';

export interface QueueEntry {
  id: string;
  queue_id: string;
  business_id: string;
  customer_name: string;
  customer_phone: string | null;
  position: number;
  status: EntryStatus;
  notes: string | null;
  joined_at: string;
  served_at: string | null;
  called_at: string | null;
}

export interface BannedCustomer {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  reason: string | null;
  banned_at: string;
}

export interface QueueStats {
  waiting: number;
  served_today: number;
  avg_wait_minutes: number;
  no_shows_today: number;
}
