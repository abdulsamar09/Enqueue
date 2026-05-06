import { formatDistanceToNow } from 'date-fns';

export const slugify = (s: string): string =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30);

export const formatTimeAgo = (iso: string): string =>
  formatDistanceToNow(new Date(iso), { addSuffix: true });
