-- Team invite support for shared hackathon access.
-- Run this once in Supabase SQL editor.

create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  hackathon_id uuid not null references public.hackathons(id) on delete cascade,
  email text not null,
  name text,
  role text default 'Member',
  token text not null unique,
  status text not null default 'pending',
  invited_by uuid not null,
  accepted_user_id uuid,
  expires_at timestamptz,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint team_invites_status_check check (status in ('pending', 'accepted', 'revoked', 'expired'))
);

create index if not exists idx_team_invites_hackathon_id on public.team_invites(hackathon_id);
create index if not exists idx_team_invites_email on public.team_invites(lower(email));
create index if not exists idx_team_invites_token on public.team_invites(token);

create or replace function public.update_team_invites_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_team_invites_updated_at on public.team_invites;
create trigger trg_team_invites_updated_at
before update on public.team_invites
for each row execute function public.update_team_invites_updated_at();
