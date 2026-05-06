import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

// ✅ Slug generator
function generateSlug(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')      // spaces → dash
    .replace(/[^\w-]+/g, '');  // remove special chars
}

export default function CreateBusinessPage() {
  document.title = 'Enqueue — Create Business';

  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();

    try {
      setLoading(true);

      const trimmedName = name.trim();
      if (!trimmedName) throw new Error('Business name is required');

      // 1. Get authenticated user from Supabase
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('User not authenticated');
      }

      // 2. Generate slug with unique suffix
      const slug = `${generateSlug(trimmedName)}-${user.id.slice(0, 6)}`;

      // 3. Insert business with slug
      const { error } = await supabase.from('businesses').insert({
        name: trimmedName,
        description: description.trim() || null,
        owner_id: user.id,
        slug: slug,
      });

      if (error) throw error;

      toast.success('Business created successfully');

      // 4. Go to dashboard
      navigate('/dashboard');
    } catch (error) {
      toast.error((error as Error).message || 'Unable to create business');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-md p-6">
      <h1 className="text-2xl font-bold">Create your business</h1>
      <p className="mt-2 text-sm text-[var(--eq-muted)]">
        This only takes a moment.
      </p>

      <form className="mt-6 space-y-3" onSubmit={onSubmit}>
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="Business name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          disabled={loading}
        />

        <textarea
          className="h-28 w-full resize-none rounded border px-3 py-2"
          placeholder="Description (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={loading}
        />

        <button
          disabled={loading}
          className="w-full rounded bg-[var(--eq-indigo)] px-4 py-2 text-white"
        >
          {loading ? 'Creating...' : 'Create business'}
        </button>
      </form>
    </main>
  );
}