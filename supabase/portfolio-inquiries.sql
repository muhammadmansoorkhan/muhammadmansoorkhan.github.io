create table public.portfolio_inquiries (
 id uuid primary key,
 created_at timestamptz not null default now(),
 name text not null check (char_length(btrim(name)) between 2 and 100),
 email text not null check (char_length(email) <= 254 and email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'),
 service text not null check (service in ('Business website','Landing page','Figma to front-end','Website fixes & updates','Portfolio website')),
 details text not null check (char_length(btrim(details)) between 10 and 5000),
 ip_hash text not null check (ip_hash ~ '^[a-f0-9]{64}$'),
 status text not null default 'new' check (status in ('new','contacted','closed'))
);
comment on table public.portfolio_inquiries is 'Private portfolio contact submissions; only the portfolio-inquiry Edge Function may accept public requests.';
alter table public.portfolio_inquiries enable row level security;
revoke all on public.portfolio_inquiries from public, anon, authenticated;
grant select, insert, update, delete on public.portfolio_inquiries to service_role;
create index portfolio_inquiries_ip_created_idx on public.portfolio_inquiries (ip_hash, created_at desc);
create index portfolio_inquiries_email_created_idx on public.portfolio_inquiries (email, created_at desc);

create function public.submit_portfolio_inquiry(
 p_id uuid, p_name text, p_email text, p_service text, p_details text, p_ip_hash text
) returns text language plpgsql security invoker set search_path = '' as $$
declare existing public.portfolio_inquiries%rowtype;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('portfolio:' || p_ip_hash, 0));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('portfolio-email:' || p_email, 0));
 select * into existing from public.portfolio_inquiries where id = p_id;
 if found then
  if existing.email = p_email and existing.name = p_name and existing.service = p_service and existing.details = p_details then
   return 'duplicate';
  end if;
  return 'conflict';
 end if;
 if (select count(*) from public.portfolio_inquiries where ip_hash = p_ip_hash and created_at > now() - interval '1 hour') >= 5
 or (select count(*) from public.portfolio_inquiries where email = p_email and created_at > now() - interval '5 minutes') >= 2 then
  return 'rate_limited';
 end if;
 insert into public.portfolio_inquiries (id, name, email, service, details, ip_hash)
 values (p_id, p_name, p_email, p_service, p_details, p_ip_hash);
 return 'accepted';
end;
$$;
revoke all on function public.submit_portfolio_inquiry(uuid,text,text,text,text,text) from public, anon, authenticated;
grant execute on function public.submit_portfolio_inquiry(uuid,text,text,text,text,text) to service_role;
