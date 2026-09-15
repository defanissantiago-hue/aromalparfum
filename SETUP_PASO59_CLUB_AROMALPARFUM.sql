-- AromaLParfum — PASO 59 — Club AromaLParfum V2
-- Ejecutar UNA sola vez en Supabase > SQL Editor.
-- Puntos calculados sobre pedidos PAGADOS + ENTREGADOS. Sin cuentas de cliente obligatorias.
-- El beneficio de historia de Instagram se modera en Admin y NO altera precios del checkout desde el navegador.

create table if not exists public.loyalty_settings (
  id smallint primary key default 1 check (id = 1),
  program_enabled boolean not null default true,
  pesos_per_point numeric(14,2) not null default 1000 check (pesos_per_point > 0),
  signature_points integer not null default 150 check (signature_points >= 0),
  prive_points integer not null default 350 check (prive_points >= signature_points),
  story_discount_percent numeric(5,2) not null default 20 check (story_discount_percent >= 0 and story_discount_percent <= 100),
  updated_at timestamptz not null default now()
);

insert into public.loyalty_settings (id)
values (1)
on conflict (id) do nothing;

create table if not exists public.loyalty_adjustments (
  id bigserial primary key,
  customer_id bigint not null,
  points integer not null check (points <> 0),
  reason text not null default 'Ajuste manual',
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists loyalty_adjustments_customer_idx
  on public.loyalty_adjustments(customer_id, created_at desc);

create table if not exists public.loyalty_benefits (
  id bigserial primary key,
  customer_id bigint not null,
  order_id bigint not null,
  benefit_type text not null default 'instagram_story',
  status text not null default 'pending' check (status in ('pending','approved','rejected','redeemed')),
  instagram_handle text,
  proof_note text,
  discount_percent numeric(5,2) not null default 20 check (discount_percent >= 0 and discount_percent <= 100),
  benefit_code text unique,
  admin_note text,
  requested_at timestamptz not null default now(),
  approved_at timestamptz,
  redeemed_at timestamptz,
  rejected_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(order_id, benefit_type)
);

create index if not exists loyalty_benefits_customer_idx
  on public.loyalty_benefits(customer_id, requested_at desc);
create index if not exists loyalty_benefits_status_idx
  on public.loyalty_benefits(status, requested_at desc);

alter table public.loyalty_settings enable row level security;
alter table public.loyalty_adjustments enable row level security;
alter table public.loyalty_benefits enable row level security;

revoke all on public.loyalty_settings from anon, authenticated;
revoke all on public.loyalty_adjustments from anon, authenticated;
revoke all on public.loyalty_benefits from anon, authenticated;

grant select, insert, update, delete on public.loyalty_settings to authenticated;
grant select, insert, update, delete on public.loyalty_adjustments to authenticated;
grant select, insert, update, delete on public.loyalty_benefits to authenticated;

-- Sin policies: aunque existan grants, RLS bloquea acceso directo. Toda operación pública pasa por RPC explícita.

create or replace function public.loyalty_v2_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'defanissantiago@gmail.com';
$$;

revoke all on function public.loyalty_v2_is_admin() from public;
grant execute on function public.loyalty_v2_is_admin() to authenticated;

create or replace function public.get_loyalty_profile_v2(
  p_order_code text,
  p_contact text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_settings public.loyalty_settings%rowtype;
  v_code text := upper(trim(coalesce(p_order_code, '')));
  v_contact text := trim(coalesce(p_contact, ''));
  v_contact_digits text := regexp_replace(coalesce(p_contact, ''), '[^0-9]', '', 'g');
  v_delivered integer := 0;
  v_spend numeric := 0;
  v_base_points integer := 0;
  v_adjustments integer := 0;
  v_points integer := 0;
  v_tier text := 'esencia';
  v_next_tier text := 'signature';
  v_next_points integer := 0;
  v_benefits jsonb := '[]'::jsonb;
  v_purchases jsonb := '[]'::jsonb;
  v_story_available boolean := false;
begin
  if v_code = '' or v_contact = '' then
    return jsonb_build_object('ok', false, 'error', 'missing_fields');
  end if;

  select o.id, o.customer_id, o.customer_name, o.customer_email, o.customer_phone,
         o.order_code, o.status, o.payment_status, o.total
  into v_order
  from public.orders o
  where upper(trim(coalesce(o.order_code, ''))) = v_code
    and (
      lower(trim(coalesce(o.customer_email, ''))) = lower(v_contact)
      or (
        length(v_contact_digits) >= 6
        and regexp_replace(coalesce(o.customer_phone, ''), '[^0-9]', '', 'g') = v_contact_digits
      )
    )
  order by o.id desc
  limit 1;

  if not found or v_order.customer_id is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select * into v_settings from public.loyalty_settings where id = 1;
  if not found then
    insert into public.loyalty_settings(id) values (1) on conflict (id) do nothing;
    select * into v_settings from public.loyalty_settings where id = 1;
  end if;

  if not coalesce(v_settings.program_enabled, true) then
    return jsonb_build_object('ok', false, 'error', 'program_disabled');
  end if;

  select
    count(*)::integer,
    coalesce(sum(coalesce(o.total, 0)), 0),
    coalesce(sum(floor(coalesce(o.total, 0) / v_settings.pesos_per_point)), 0)::integer
  into v_delivered, v_spend, v_base_points
  from public.orders o
  where o.customer_id = v_order.customer_id
    and o.status = 'entregado'
    and o.payment_status = 'pagado';

  select coalesce(sum(a.points), 0)::integer
  into v_adjustments
  from public.loyalty_adjustments a
  where a.customer_id = v_order.customer_id;

  v_points := greatest(0, v_base_points + v_adjustments);

  if v_points >= v_settings.prive_points then
    v_tier := 'prive';
    v_next_tier := null;
    v_next_points := 0;
  elsif v_points >= v_settings.signature_points then
    v_tier := 'signature';
    v_next_tier := 'prive';
    v_next_points := greatest(0, v_settings.prive_points - v_points);
  else
    v_tier := 'esencia';
    v_next_tier := 'signature';
    v_next_points := greatest(0, v_settings.signature_points - v_points);
  end if;

  select coalesce(jsonb_agg(row_data order by sort_at desc), '[]'::jsonb)
  into v_purchases
  from (
    select jsonb_build_object(
      'total', coalesce(o.total, 0),
      'points', floor(coalesce(o.total, 0) / v_settings.pesos_per_point)::integer,
      'date', coalesce(o.delivered_at, o.created_at)
    ) as row_data,
    coalesce(o.delivered_at, o.created_at) as sort_at
    from public.orders o
    where o.customer_id = v_order.customer_id
      and o.status = 'entregado'
      and o.payment_status = 'pagado'
    order by coalesce(o.delivered_at, o.created_at) desc
    limit 8
  ) x;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id,
    'type', b.benefit_type,
    'status', b.status,
    'discount_percent', b.discount_percent,
    'benefit_code', case when b.status in ('approved','redeemed') then b.benefit_code else null end,
    'requested_at', b.requested_at,
    'approved_at', b.approved_at,
    'redeemed_at', b.redeemed_at
  ) order by b.requested_at desc), '[]'::jsonb)
  into v_benefits
  from public.loyalty_benefits b
  where b.customer_id = v_order.customer_id;

  v_story_available :=
    v_order.status = 'entregado'
    and v_order.payment_status = 'pagado'
    and not exists (
      select 1 from public.loyalty_benefits b
      where b.order_id = v_order.id and b.benefit_type = 'instagram_story'
    );

  return jsonb_build_object(
    'ok', true,
    'order_code', v_order.order_code,
    'first_name', split_part(trim(coalesce(v_order.customer_name, 'Cliente')), ' ', 1),
    'points', v_points,
    'base_points', v_base_points,
    'adjustment_points', v_adjustments,
    'eligible_spend', v_spend,
    'delivered_orders', v_delivered,
    'tier', v_tier,
    'next_tier', v_next_tier,
    'points_to_next_tier', v_next_points,
    'settings', jsonb_build_object(
      'pesos_per_point', v_settings.pesos_per_point,
      'signature_points', v_settings.signature_points,
      'prive_points', v_settings.prive_points,
      'story_discount_percent', v_settings.story_discount_percent
    ),
    'story_available_for_current_order', v_story_available,
    'benefits', v_benefits,
    'recent_purchases', v_purchases
  );
end;
$$;

revoke all on function public.get_loyalty_profile_v2(text, text) from public;
grant execute on function public.get_loyalty_profile_v2(text, text) to anon, authenticated;

create or replace function public.request_story_benefit_v2(
  p_order_code text,
  p_contact text,
  p_instagram_handle text,
  p_proof_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order record;
  v_settings public.loyalty_settings%rowtype;
  v_existing record;
  v_handle text := trim(coalesce(p_instagram_handle, ''));
  v_note text := left(trim(coalesce(p_proof_note, '')), 600);
  v_code text := upper(trim(coalesce(p_order_code, '')));
  v_contact text := trim(coalesce(p_contact, ''));
  v_contact_digits text := regexp_replace(coalesce(p_contact, ''), '[^0-9]', '', 'g');
  v_id bigint;
begin
  if v_code = '' or v_contact = '' or length(v_handle) < 2 then
    return jsonb_build_object('ok', false, 'error', 'missing_fields');
  end if;
  if length(v_handle) > 80 then
    return jsonb_build_object('ok', false, 'error', 'handle_too_long');
  end if;

  select o.id, o.customer_id, o.status, o.payment_status
  into v_order
  from public.orders o
  where upper(trim(coalesce(o.order_code, ''))) = v_code
    and (
      lower(trim(coalesce(o.customer_email, ''))) = lower(v_contact)
      or (
        length(v_contact_digits) >= 6
        and regexp_replace(coalesce(o.customer_phone, ''), '[^0-9]', '', 'g') = v_contact_digits
      )
    )
  order by o.id desc limit 1;

  if not found or v_order.customer_id is null then
    return jsonb_build_object('ok', false, 'error', 'order_not_found');
  end if;
  if v_order.status <> 'entregado' or v_order.payment_status <> 'pagado' then
    return jsonb_build_object('ok', false, 'error', 'order_not_eligible');
  end if;

  select * into v_existing
  from public.loyalty_benefits
  where order_id = v_order.id and benefit_type = 'instagram_story'
  limit 1;
  if found then
    return jsonb_build_object('ok', true, 'existing', true, 'status', v_existing.status, 'benefit_code', v_existing.benefit_code);
  end if;

  select * into v_settings from public.loyalty_settings where id = 1;

  insert into public.loyalty_benefits(
    customer_id, order_id, benefit_type, status, instagram_handle, proof_note, discount_percent
  ) values (
    v_order.customer_id, v_order.id, 'instagram_story', 'pending', left(v_handle,80), nullif(v_note,''), coalesce(v_settings.story_discount_percent,20)
  ) returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'status', 'pending');
exception when unique_violation then
  select * into v_existing from public.loyalty_benefits where order_id=v_order.id and benefit_type='instagram_story' limit 1;
  return jsonb_build_object('ok', true, 'existing', true, 'status', v_existing.status, 'benefit_code', v_existing.benefit_code);
end;
$$;

revoke all on function public.request_story_benefit_v2(text, text, text, text) from public;
grant execute on function public.request_story_benefit_v2(text, text, text, text) to anon, authenticated;

create or replace function public.admin_get_loyalty_dashboard_v2(
  p_search text default '',
  p_page integer default 1,
  p_page_size integer default 20
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.loyalty_settings%rowtype;
  v_search text := lower(trim(coalesce(p_search,'')));
  v_page integer := greatest(1, coalesce(p_page,1));
  v_size integer := least(100, greatest(1, coalesce(p_page_size,20)));
  v_total integer := 0;
  v_rows jsonb := '[]'::jsonb;
  v_summary jsonb := '{}'::jsonb;
begin
  if not public.loyalty_v2_is_admin() then raise exception 'Solo administrador.'; end if;
  select * into v_settings from public.loyalty_settings where id=1;

  with eligible as (
    select o.customer_id,
           count(*)::integer delivered_orders,
           coalesce(sum(o.total),0) eligible_spend,
           coalesce(sum(floor(coalesce(o.total,0)/v_settings.pesos_per_point)),0)::integer base_points,
           max(coalesce(o.delivered_at,o.created_at)) last_purchase_at
    from public.orders o
    where o.customer_id is not null and o.status='entregado' and o.payment_status='pagado'
    group by o.customer_id
  ), adj as (
    select customer_id, coalesce(sum(points),0)::integer adjustment_points
    from public.loyalty_adjustments group by customer_id
  ), ben as (
    select customer_id,
      count(*) filter(where status='pending')::integer pending_benefits,
      count(*) filter(where status='approved')::integer approved_benefits
    from public.loyalty_benefits group by customer_id
  ), base as (
    select p.id customer_id, p.full_name, p.phone, p.email,
      coalesce(e.delivered_orders,0) delivered_orders,
      coalesce(e.eligible_spend,0) eligible_spend,
      greatest(0,coalesce(e.base_points,0)+coalesce(a.adjustment_points,0))::integer points,
      coalesce(a.adjustment_points,0)::integer adjustment_points,
      coalesce(b.pending_benefits,0)::integer pending_benefits,
      coalesce(b.approved_benefits,0)::integer approved_benefits,
      e.last_purchase_at
    from public.customer_profiles p
    left join eligible e on e.customer_id=p.id
    left join adj a on a.customer_id=p.id
    left join ben b on b.customer_id=p.id
  ), filtered as (
    select * from base
    where v_search='' or lower(coalesce(full_name,'')) like '%'||v_search||'%'
      or lower(coalesce(phone,'')) like '%'||v_search||'%'
      or lower(coalesce(email,'')) like '%'||v_search||'%'
  )
  select count(*)::integer into v_total from filtered;

  with eligible as (
    select o.customer_id,
           count(*)::integer delivered_orders,
           coalesce(sum(o.total),0) eligible_spend,
           coalesce(sum(floor(coalesce(o.total,0)/v_settings.pesos_per_point)),0)::integer base_points,
           max(coalesce(o.delivered_at,o.created_at)) last_purchase_at
    from public.orders o
    where o.customer_id is not null and o.status='entregado' and o.payment_status='pagado'
    group by o.customer_id
  ), adj as (
    select customer_id, coalesce(sum(points),0)::integer adjustment_points
    from public.loyalty_adjustments group by customer_id
  ), ben as (
    select customer_id,
      count(*) filter(where status='pending')::integer pending_benefits,
      count(*) filter(where status='approved')::integer approved_benefits
    from public.loyalty_benefits group by customer_id
  ), base as (
    select p.id customer_id, p.full_name, p.phone, p.email,
      coalesce(e.delivered_orders,0) delivered_orders,
      coalesce(e.eligible_spend,0) eligible_spend,
      greatest(0,coalesce(e.base_points,0)+coalesce(a.adjustment_points,0))::integer points,
      coalesce(a.adjustment_points,0)::integer adjustment_points,
      coalesce(b.pending_benefits,0)::integer pending_benefits,
      coalesce(b.approved_benefits,0)::integer approved_benefits,
      e.last_purchase_at
    from public.customer_profiles p
    left join eligible e on e.customer_id=p.id
    left join adj a on a.customer_id=p.id
    left join ben b on b.customer_id=p.id
    where v_search='' or lower(coalesce(p.full_name,'')) like '%'||v_search||'%'
      or lower(coalesce(p.phone,'')) like '%'||v_search||'%'
      or lower(coalesce(p.email,'')) like '%'||v_search||'%'
  ), page_rows as (
    select *, case when points>=v_settings.prive_points then 'prive' when points>=v_settings.signature_points then 'signature' else 'esencia' end tier
    from base order by points desc, last_purchase_at desc nulls last, customer_id desc
    offset (v_page-1)*v_size limit v_size
  )
  select coalesce(jsonb_agg(to_jsonb(page_rows)), '[]'::jsonb) into v_rows from page_rows;

  select jsonb_build_object(
    'customers', count(distinct p.id),
    'members_with_points', count(distinct p.id) filter(where coalesce(e.base_points,0)+coalesce(a.adjustment_points,0)>0),
    'points_issued', coalesce(sum(coalesce(e.base_points,0)+coalesce(a.adjustment_points,0)),0),
    'eligible_revenue', coalesce(sum(e.eligible_spend),0),
    'pending_story_requests', (select count(*) from public.loyalty_benefits where status='pending')
  ) into v_summary
  from public.customer_profiles p
  left join (
    select o.customer_id, coalesce(sum(o.total),0) eligible_spend,
      coalesce(sum(floor(coalesce(o.total,0)/v_settings.pesos_per_point)),0)::integer base_points
    from public.orders o where o.customer_id is not null and o.status='entregado' and o.payment_status='pagado' group by o.customer_id
  ) e on e.customer_id=p.id
  left join (
    select customer_id, coalesce(sum(points),0)::integer adjustment_points from public.loyalty_adjustments group by customer_id
  ) a on a.customer_id=p.id;

  return jsonb_build_object(
    'ok',true,'total',v_total,'page',v_page,'page_size',v_size,'rows',v_rows,'summary',v_summary,
    'settings',jsonb_build_object(
      'program_enabled',v_settings.program_enabled,
      'pesos_per_point',v_settings.pesos_per_point,
      'signature_points',v_settings.signature_points,
      'prive_points',v_settings.prive_points,
      'story_discount_percent',v_settings.story_discount_percent
    )
  );
end;
$$;

revoke all on function public.admin_get_loyalty_dashboard_v2(text, integer, integer) from public;
grant execute on function public.admin_get_loyalty_dashboard_v2(text, integer, integer) to authenticated;

create or replace function public.admin_get_loyalty_benefits_v2(
  p_status text default 'all'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_rows jsonb;
begin
  if not public.loyalty_v2_is_admin() then raise exception 'Solo administrador.'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',b.id,'customer_id',b.customer_id,'order_id',b.order_id,'order_code',o.order_code,
    'customer_name',p.full_name,'customer_phone',p.phone,'customer_email',p.email,
    'type',b.benefit_type,'status',b.status,'instagram_handle',b.instagram_handle,'proof_note',b.proof_note,
    'discount_percent',b.discount_percent,'benefit_code',b.benefit_code,'admin_note',b.admin_note,
    'requested_at',b.requested_at,'approved_at',b.approved_at,'redeemed_at',b.redeemed_at,'rejected_at',b.rejected_at
  ) order by b.requested_at desc),'[]'::jsonb)
  into v_rows
  from public.loyalty_benefits b
  left join public.customer_profiles p on p.id=b.customer_id
  left join public.orders o on o.id=b.order_id
  where coalesce(p_status,'all')='all' or b.status=p_status;
  return jsonb_build_object('ok',true,'rows',v_rows);
end;
$$;

revoke all on function public.admin_get_loyalty_benefits_v2(text) from public;
grant execute on function public.admin_get_loyalty_benefits_v2(text) to authenticated;

create or replace function public.admin_adjust_loyalty_points_v2(
  p_customer_id bigint,
  p_points integer,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_id bigint;
begin
  if not public.loyalty_v2_is_admin() then raise exception 'Solo administrador.'; end if;
  if p_customer_id is null or coalesce(p_points,0)=0 then return jsonb_build_object('ok',false,'error','invalid_adjustment'); end if;
  if not exists(select 1 from public.customer_profiles where id=p_customer_id) then return jsonb_build_object('ok',false,'error','customer_not_found'); end if;
  insert into public.loyalty_adjustments(customer_id,points,reason,created_by)
  values(p_customer_id,p_points,left(coalesce(nullif(trim(p_reason),''),'Ajuste manual'),240),lower(coalesce(auth.jwt()->>'email','admin')))
  returning id into v_id;
  return jsonb_build_object('ok',true,'id',v_id);
end;
$$;

revoke all on function public.admin_adjust_loyalty_points_v2(bigint, integer, text) from public;
grant execute on function public.admin_adjust_loyalty_points_v2(bigint, integer, text) to authenticated;

create or replace function public.admin_update_loyalty_benefit_v2(
  p_benefit_id bigint,
  p_status text,
  p_admin_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_status text:=lower(trim(coalesce(p_status,''))); v_code text; v_row record;
begin
  if not public.loyalty_v2_is_admin() then raise exception 'Solo administrador.'; end if;
  if v_status not in ('pending','approved','rejected','redeemed') then return jsonb_build_object('ok',false,'error','invalid_status'); end if;
  select * into v_row from public.loyalty_benefits where id=p_benefit_id for update;
  if not found then return jsonb_build_object('ok',false,'error','not_found'); end if;
  v_code:=v_row.benefit_code;
  if v_status='approved' and coalesce(v_code,'')='' then
    loop
      v_code:='AROMA-'||upper(substr(md5(random()::text||clock_timestamp()::text||p_benefit_id::text),1,8));
      exit when not exists(select 1 from public.loyalty_benefits where benefit_code=v_code);
    end loop;
  end if;
  update public.loyalty_benefits set
    status=v_status,
    benefit_code=case when v_status in ('approved','redeemed') then v_code else benefit_code end,
    admin_note=left(trim(coalesce(p_admin_note,'')),600),
    approved_at=case when v_status='approved' then coalesce(approved_at,now()) else approved_at end,
    redeemed_at=case when v_status='redeemed' then coalesce(redeemed_at,now()) else redeemed_at end,
    rejected_at=case when v_status='rejected' then now() else rejected_at end,
    updated_at=now()
  where id=p_benefit_id;
  return jsonb_build_object('ok',true,'status',v_status,'benefit_code',v_code);
end;
$$;

revoke all on function public.admin_update_loyalty_benefit_v2(bigint, text, text) from public;
grant execute on function public.admin_update_loyalty_benefit_v2(bigint, text, text) to authenticated;

create or replace function public.admin_update_loyalty_settings_v2(
  p_program_enabled boolean,
  p_pesos_per_point numeric,
  p_signature_points integer,
  p_prive_points integer,
  p_story_discount_percent numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.loyalty_v2_is_admin() then raise exception 'Solo administrador.'; end if;
  if coalesce(p_pesos_per_point,0)<=0 or coalesce(p_signature_points,-1)<0 or coalesce(p_prive_points,-1)<p_signature_points
     or coalesce(p_story_discount_percent,-1)<0 or p_story_discount_percent>100 then
    return jsonb_build_object('ok',false,'error','invalid_settings');
  end if;
  insert into public.loyalty_settings(id,program_enabled,pesos_per_point,signature_points,prive_points,story_discount_percent,updated_at)
  values(1,coalesce(p_program_enabled,true),p_pesos_per_point,p_signature_points,p_prive_points,p_story_discount_percent,now())
  on conflict(id) do update set program_enabled=excluded.program_enabled,pesos_per_point=excluded.pesos_per_point,
    signature_points=excluded.signature_points,prive_points=excluded.prive_points,
    story_discount_percent=excluded.story_discount_percent,updated_at=now();
  return jsonb_build_object('ok',true);
end;
$$;

revoke all on function public.admin_update_loyalty_settings_v2(boolean, numeric, integer, integer, numeric) from public;
grant execute on function public.admin_update_loyalty_settings_v2(boolean, numeric, integer, integer, numeric) to authenticated;
