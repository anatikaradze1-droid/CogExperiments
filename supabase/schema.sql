-- CogExperiments BUILDER + FIXED SET v5
create extension if not exists pgcrypto;

create table public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.experiments (
  id uuid primary key,
  slug text unique not null,
  name text not null,
  description text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  version integer not null default 1,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key,
  experiment_id uuid not null references public.experiments(id) on delete cascade,
  experiment_version integer not null,
  participant_code text not null,
  device_type text,
  viewport_width integer,
  viewport_height integer,
  user_agent text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  validity_status text,
  summary jsonb not null default '{}'::jsonb
);

create table public.trials (
  id uuid primary key,
  experiment_id uuid not null references public.experiments(id) on delete cascade,
  experiment_version integer not null,
  session_id uuid not null references public.sessions(id) on delete cascade,
  participant_code text not null,
  block_name text not null,
  global_trial integer,
  block_trial integer,
  stimulus_name text,
  stimulus_type text,
  response_key text,
  response_label text,
  rt_ms numeric,
  missing boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;
alter table public.experiments enable row level security;
alter table public.sessions enable row level security;
alter table public.trials enable row level security;

create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.admin_users where user_id=auth.uid());
$$;
grant execute on function public.is_platform_admin() to authenticated;

grant select on public.experiments to anon,authenticated;
grant insert,update,delete on public.experiments to authenticated;
grant insert on public.sessions to anon;
grant insert on public.trials to anon;
grant select,update,delete on public.sessions to authenticated;
grant select,update,delete on public.trials to authenticated;

create policy "public published experiments" on public.experiments for select to anon using(status='published');
create policy "admin read experiments" on public.experiments for select to authenticated using(public.is_platform_admin());
create policy "admin insert experiments" on public.experiments for insert to authenticated with check(public.is_platform_admin());
create policy "admin update experiments" on public.experiments for update to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());
create policy "admin delete experiments" on public.experiments for delete to authenticated using(public.is_platform_admin());

create policy "anon create session" on public.sessions for insert to anon with check(exists(select 1 from public.experiments e where e.id=experiment_id and e.status='published'));
create policy "anon create trial" on public.trials for insert to anon with check(exists(select 1 from public.experiments e where e.id=experiment_id and e.status='published'));

create policy "admin read sessions" on public.sessions for select to authenticated using(public.is_platform_admin());
create policy "admin update sessions" on public.sessions for update to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());
create policy "admin delete sessions" on public.sessions for delete to authenticated using(public.is_platform_admin());
create policy "admin read trials" on public.trials for select to authenticated using(public.is_platform_admin());
create policy "admin update trials" on public.trials for update to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());
create policy "admin delete trials" on public.trials for delete to authenticated using(public.is_platform_admin());

create or replace function public.finish_participant_session(p_session_id uuid,p_summary jsonb)
returns void language plpgsql security definer set search_path=public as $$
begin
  update public.sessions
  set completed_at=now(),
      summary=coalesce(p_summary,'{}'::jsonb),
      validity_status=coalesce(p_summary->>'validity_status',validity_status)
  where id=p_session_id and completed_at is null;
end;
$$;
grant execute on function public.finish_participant_session(uuid,jsonb) to anon,authenticated;

insert into storage.buckets(id,name,public)
values('stimuli','stimuli',true)
on conflict(id) do update set public=true;

create policy "public read stimuli" on storage.objects for select to public using(bucket_id='stimuli');
create policy "admin insert stimuli" on storage.objects for insert to authenticated with check(bucket_id='stimuli' and public.is_platform_admin());
create policy "admin update stimuli" on storage.objects for update to authenticated using(bucket_id='stimuli' and public.is_platform_admin());
create policy "admin delete stimuli" on storage.objects for delete to authenticated using(bucket_id='stimuli' and public.is_platform_admin());

-- Create admin users manually in Supabase Authentication.
-- Then authorize each one with:
-- insert into public.admin_users(user_id) values ('PASTE_AUTH_USER_UUID_HERE');
