-- Add business.description and ensure slug is auto-generated.
-- Also enforce one business per owner so `maybeSingle()` is safe.

alter table public.businesses
  add column if not exists description text;

create unique index if not exists businesses_owner_id_unique_idx
  on public.businesses (owner_id);

create or replace function public.slugify_business_name(input text)
returns text
language sql
immutable
as $$
  select lower(
    regexp_replace(
      regexp_replace(coalesce(trim(input), ''), '[^a-zA-Z0-9]+', '-', 'g'),
      '(^-|-$)', '', 'g'
    )
  );
$$;

create or replace function public.set_business_slug()
returns trigger
language plpgsql
as $$
begin
  if NEW.slug is null or NEW.slug = '' then
    NEW.slug :=
      public.slugify_business_name(NEW.name) ||
      '-' ||
      substring(replace(NEW.owner_id::text, '-', ''), 1, 6);
  end if;
  return NEW;
end;
$$;

drop trigger if exists trg_set_business_slug on public.businesses;
create trigger trg_set_business_slug
before insert on public.businesses
for each row execute function public.set_business_slug();

