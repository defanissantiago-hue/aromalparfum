-- AromaLParfum — PASO 60 — Reactivación CRM V2 + Consentimientos + Cola de Seguimiento
-- Ejecutar UNA sola vez en Supabase > SQL Editor, después de PASO 59.
-- IMPORTANTE: no envía mensajes automáticamente. Solo organiza una cola manual y exige consentimiento explícito.

create table if not exists public.crm_settings (
  id smallint primary key default 1 check (id = 1),
  first_repurchase_days integer not null default 21 check (first_repurchase_days between 1 and 3650),
  reactivation_days integer not null default 45 check (reactivation_days between 1 and 3650),
  vip_reactivation_days integer not null default 30 check (vip_reactivation_days between 1 and 3650),
  vip_spend_threshold numeric(14,2) not null default 150000 check (vip_spend_threshold >= 0),
  queue_limit integer not null default 50 check (queue_limit between 1 and 500),
  updated_at timestamptz not null default now()
);

insert into public.crm_settings(id) values (1) on conflict(id) do nothing;

create table if not exists public.crm_contact_preferences (
  customer_id bigint primary key,
  whatsapp_status text not null default 'unknown' check (whatsapp_status in ('unknown','opted_in','opted_out')),
  email_status text not null default 'unknown' check (email_status in ('unknown','opted_in','opted_out')),
  source text not null default 'manual',
  note text,
  updated_by text,
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_consent_log (
  id bigserial primary key,
  customer_id bigint not null,
  channel text not null check (channel in ('whatsapp','email')),
  previous_status text,
  new_status text not null check (new_status in ('unknown','opted_in','opted_out')),
  source text not null default 'manual',
  note text,
  changed_by text,
  changed_at timestamptz not null default now()
);

create index if not exists crm_consent_log_customer_idx
  on public.crm_consent_log(customer_id, changed_at desc);

create table if not exists public.crm_followups (
  id bigserial primary key,
  customer_id bigint not null,
  product_id bigint,
  reason text not null default 'manual' check (reason in ('first_repurchase','dormant','vip_dormant','repurchase','club','manual')),
  status text not null default 'pending' check (status in ('pending','contacted','snoozed','done','cancelled')),
  channel text not null default 'whatsapp' check (channel in ('whatsapp','email')),
  due_at timestamptz not null default now(),
  template_key text,
  note text,
  source text not null default 'manual',
  created_by text,
  created_at timestamptz not null default now(),
  contacted_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists crm_followups_queue_idx
  on public.crm_followups(status, due_at, created_at desc);
create index if not exists crm_followups_customer_idx
  on public.crm_followups(customer_id, created_at desc);

alter table public.crm_settings enable row level security;
alter table public.crm_contact_preferences enable row level security;
alter table public.crm_consent_log enable row level security;
alter table public.crm_followups enable row level security;

revoke all on public.crm_settings from anon, authenticated;
revoke all on public.crm_contact_preferences from anon, authenticated;
revoke all on public.crm_consent_log from anon, authenticated;
revoke all on public.crm_followups from anon, authenticated;

-- Sin policies directas: acceso únicamente mediante RPC de administrador.
grant select, insert, update, delete on public.crm_settings to authenticated;
grant select, insert, update, delete on public.crm_contact_preferences to authenticated;
grant select, insert, update, delete on public.crm_consent_log to authenticated;
grant select, insert, update, delete on public.crm_followups to authenticated;

create or replace function public.crm_v2_is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'defanissantiago@gmail.com';
$$;
revoke all on function public.crm_v2_is_admin() from public;
grant execute on function public.crm_v2_is_admin() to authenticated;

create or replace function public.admin_get_crm_reactivation_v2(
  p_search text default '',
  p_queue_status text default 'open'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.crm_settings%rowtype;
  v_search text := lower(trim(coalesce(p_search,'')));
  v_queue_status text := lower(trim(coalesce(p_queue_status,'open')));
  v_customers jsonb := '[]'::jsonb;
  v_queue jsonb := '[]'::jsonb;
  v_summary jsonb := '{}'::jsonb;
begin
  if not public.crm_v2_is_admin() then raise exception 'Solo administrador.'; end if;
  select * into v_settings from public.crm_settings where id=1;
  if not found then
    insert into public.crm_settings(id) values(1) on conflict(id) do nothing;
    select * into v_settings from public.crm_settings where id=1;
  end if;

  with purchases as (
    select
      o.customer_id,
      count(*)::integer as delivered_orders,
      coalesce(sum(coalesce(o.total,0)),0) as eligible_spend,
      max(coalesce(o.delivered_at,o.completed_at,o.created_at)) as last_purchase_at
    from public.orders o
    where o.customer_id is not null
      and o.status='entregado'
      and o.payment_status='pagado'
    group by o.customer_id
  ), base as (
    select
      p.id as customer_id,
      coalesce(nullif(trim(p.full_name),''),'Cliente') as full_name,
      coalesce(p.phone,'') as phone,
      coalesce(p.phone_normalized,'') as phone_normalized,
      coalesce(p.email,'') as email,
      coalesce(x.delivered_orders,0)::integer as delivered_orders,
      coalesce(x.eligible_spend,0) as eligible_spend,
      x.last_purchase_at,
      case when x.last_purchase_at is null then null
           else greatest(0, floor(extract(epoch from (now()-x.last_purchase_at))/86400))::integer end as inactive_days,
      coalesce(cp.whatsapp_status,'unknown') as whatsapp_status,
      coalesce(cp.email_status,'unknown') as email_status,
      coalesce(cp.source,'') as consent_source,
      cp.updated_at as consent_updated_at
    from public.customer_profiles p
    left join purchases x on x.customer_id=p.id
    left join public.crm_contact_preferences cp on cp.customer_id=p.id
    where x.customer_id is not null
      and (
        v_search=''
        or lower(coalesce(p.full_name,'')) like '%'||v_search||'%'
        or lower(coalesce(p.phone,'')) like '%'||v_search||'%'
        or lower(coalesce(p.email,'')) like '%'||v_search||'%'
      )
  ), segmented as (
    select b.*,
      case
        when b.eligible_spend >= v_settings.vip_spend_threshold
          and b.last_purchase_at <= now()-(v_settings.vip_reactivation_days||' days')::interval then 'vip_dormant'
        when b.delivered_orders = 1
          and b.last_purchase_at <= now()-(v_settings.first_repurchase_days||' days')::interval then 'first_repurchase'
        when b.last_purchase_at <= now()-(v_settings.reactivation_days||' days')::interval then 'dormant'
        else 'active'
      end as segment,
      (select count(*)::integer from public.crm_followups f
       where f.customer_id=b.customer_id and f.status in ('pending','snoozed')) as open_followups,
      (select max(f.contacted_at) from public.crm_followups f
       where f.customer_id=b.customer_id and f.contacted_at is not null) as last_contacted_at
    from base b
  )
  select coalesce(jsonb_agg(to_jsonb(s) order by
      case s.segment when 'vip_dormant' then 1 when 'first_repurchase' then 2 when 'dormant' then 3 else 4 end,
      (s.whatsapp_status='opted_in') desc,
      s.eligible_spend desc,
      s.customer_id desc
    ),'[]'::jsonb)
  into v_customers
  from (select * from segmented limit 200) s;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id',f.id,
    'customer_id',f.customer_id,
    'customer_name',coalesce(nullif(trim(p.full_name),''),'Cliente'),
    'phone',coalesce(p.phone,''),
    'phone_normalized',coalesce(p.phone_normalized,''),
    'email',coalesce(p.email,''),
    'whatsapp_status',coalesce(cp.whatsapp_status,'unknown'),
    'product_id',f.product_id,
    'product_name',pr.nombre,
    'reason',f.reason,
    'status',f.status,
    'channel',f.channel,
    'due_at',f.due_at,
    'template_key',f.template_key,
    'note',f.note,
    'source',f.source,
    'created_at',f.created_at,
    'contacted_at',f.contacted_at,
    'completed_at',f.completed_at
  ) order by
    case when f.status in ('pending','snoozed') and f.due_at<=now() then 0 else 1 end,
    f.due_at asc, f.id desc),'[]'::jsonb)
  into v_queue
  from public.crm_followups f
  join public.customer_profiles p on p.id=f.customer_id
  left join public.crm_contact_preferences cp on cp.customer_id=f.customer_id
  left join public.products pr on pr.id=f.product_id
  where
    case
      when v_queue_status='open' then f.status in ('pending','snoozed')
      when v_queue_status='all' then true
      else f.status=v_queue_status
    end;

  with purchases as (
    select o.customer_id, count(*)::integer delivered_orders, coalesce(sum(coalesce(o.total,0)),0) eligible_spend,
           max(coalesce(o.delivered_at,o.completed_at,o.created_at)) last_purchase_at
    from public.orders o
    where o.customer_id is not null and o.status='entregado' and o.payment_status='pagado'
    group by o.customer_id
  ), segmented as (
    select x.*,
      case
        when x.eligible_spend >= v_settings.vip_spend_threshold and x.last_purchase_at <= now()-(v_settings.vip_reactivation_days||' days')::interval then 'vip_dormant'
        when x.delivered_orders = 1 and x.last_purchase_at <= now()-(v_settings.first_repurchase_days||' days')::interval then 'first_repurchase'
        when x.last_purchase_at <= now()-(v_settings.reactivation_days||' days')::interval then 'dormant'
        else 'active'
      end segment
    from purchases x
  )
  select jsonb_build_object(
    'buyers',count(*)::integer,
    'reactivable',count(*) filter(where s.segment<>'active')::integer,
    'whatsapp_opted_in',count(*) filter(where coalesce(cp.whatsapp_status,'unknown')='opted_in')::integer,
    'whatsapp_unknown',count(*) filter(where coalesce(cp.whatsapp_status,'unknown')='unknown')::integer,
    'queue_open',(select count(*)::integer from public.crm_followups where status in ('pending','snoozed')),
    'due_now',(select count(*)::integer from public.crm_followups where status in ('pending','snoozed') and due_at<=now()),
    'contacted_30d',(select count(*)::integer from public.crm_followups where contacted_at>=now()-interval '30 days')
  ) into v_summary
  from segmented s
  left join public.crm_contact_preferences cp on cp.customer_id=s.customer_id;

  return jsonb_build_object(
    'ok',true,
    'settings',jsonb_build_object(
      'first_repurchase_days',v_settings.first_repurchase_days,
      'reactivation_days',v_settings.reactivation_days,
      'vip_reactivation_days',v_settings.vip_reactivation_days,
      'vip_spend_threshold',v_settings.vip_spend_threshold,
      'queue_limit',v_settings.queue_limit
    ),
    'summary',coalesce(v_summary,'{}'::jsonb),
    'customers',coalesce(v_customers,'[]'::jsonb),
    'queue',coalesce(v_queue,'[]'::jsonb)
  );
end;
$$;
revoke all on function public.admin_get_crm_reactivation_v2(text,text) from public;
grant execute on function public.admin_get_crm_reactivation_v2(text,text) to authenticated;

create or replace function public.admin_update_crm_consent_v2(
  p_customer_id bigint,
  p_whatsapp_status text,
  p_email_status text default 'unknown',
  p_source text default 'manual',
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wa text:=lower(trim(coalesce(p_whatsapp_status,'unknown')));
  v_email text:=lower(trim(coalesce(p_email_status,'unknown')));
  v_source text:=left(trim(coalesce(p_source,'manual')),80);
  v_note text:=left(trim(coalesce(p_note,'')),600);
  v_old public.crm_contact_preferences%rowtype;
begin
  if not public.crm_v2_is_admin() then raise exception 'Solo administrador.'; end if;
  if p_customer_id is null or not exists(select 1 from public.customer_profiles where id=p_customer_id) then
    return jsonb_build_object('ok',false,'error','customer_not_found');
  end if;
  if v_wa not in ('unknown','opted_in','opted_out') or v_email not in ('unknown','opted_in','opted_out') then
    return jsonb_build_object('ok',false,'error','invalid_status');
  end if;
  select * into v_old from public.crm_contact_preferences where customer_id=p_customer_id;

  insert into public.crm_contact_preferences(customer_id,whatsapp_status,email_status,source,note,updated_by,updated_at)
  values(p_customer_id,v_wa,v_email,coalesce(nullif(v_source,''),'manual'),nullif(v_note,''),lower(coalesce(auth.jwt()->>'email','admin')),now())
  on conflict(customer_id) do update set
    whatsapp_status=excluded.whatsapp_status,
    email_status=excluded.email_status,
    source=excluded.source,
    note=excluded.note,
    updated_by=excluded.updated_by,
    updated_at=now();

  if coalesce(v_old.whatsapp_status,'unknown') is distinct from v_wa then
    insert into public.crm_consent_log(customer_id,channel,previous_status,new_status,source,note,changed_by)
    values(p_customer_id,'whatsapp',coalesce(v_old.whatsapp_status,'unknown'),v_wa,coalesce(nullif(v_source,''),'manual'),nullif(v_note,''),lower(coalesce(auth.jwt()->>'email','admin')));
  end if;
  if coalesce(v_old.email_status,'unknown') is distinct from v_email then
    insert into public.crm_consent_log(customer_id,channel,previous_status,new_status,source,note,changed_by)
    values(p_customer_id,'email',coalesce(v_old.email_status,'unknown'),v_email,coalesce(nullif(v_source,''),'manual'),nullif(v_note,''),lower(coalesce(auth.jwt()->>'email','admin')));
  end if;

  if v_wa <> 'opted_in' then
    update public.crm_followups
      set status='cancelled', updated_at=now(), note=concat_ws(' · ',nullif(note,''),'Cancelado al retirar/no constar consentimiento WhatsApp')
    where customer_id=p_customer_id and channel='whatsapp' and status in ('pending','snoozed');
  end if;

  return jsonb_build_object('ok',true,'whatsapp_status',v_wa,'email_status',v_email);
end;
$$;
revoke all on function public.admin_update_crm_consent_v2(bigint,text,text,text,text) from public;
grant execute on function public.admin_update_crm_consent_v2(bigint,text,text,text,text) to authenticated;

create or replace function public.admin_create_crm_followup_v2(
  p_customer_id bigint,
  p_reason text default 'manual',
  p_product_id bigint default null,
  p_due_at timestamptz default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text:=lower(trim(coalesce(p_reason,'manual')));
  v_status text;
  v_id bigint;
begin
  if not public.crm_v2_is_admin() then raise exception 'Solo administrador.'; end if;
  if v_reason not in ('first_repurchase','dormant','vip_dormant','repurchase','club','manual') then v_reason:='manual'; end if;
  if not exists(select 1 from public.customer_profiles where id=p_customer_id) then return jsonb_build_object('ok',false,'error','customer_not_found'); end if;
  select coalesce(whatsapp_status,'unknown') into v_status from public.crm_contact_preferences where customer_id=p_customer_id;
  if coalesce(v_status,'unknown') <> 'opted_in' then return jsonb_build_object('ok',false,'error','whatsapp_not_opted_in'); end if;

  insert into public.crm_followups(customer_id,product_id,reason,status,channel,due_at,template_key,note,source,created_by)
  values(p_customer_id,p_product_id,v_reason,'pending','whatsapp',coalesce(p_due_at,now()),v_reason,left(trim(coalesce(p_note,'')),600),'manual',lower(coalesce(auth.jwt()->>'email','admin')))
  returning id into v_id;
  return jsonb_build_object('ok',true,'id',v_id);
end;
$$;
revoke all on function public.admin_create_crm_followup_v2(bigint,text,bigint,timestamptz,text) from public;
grant execute on function public.admin_create_crm_followup_v2(bigint,text,bigint,timestamptz,text) to authenticated;

create or replace function public.admin_update_crm_followup_v2(
  p_followup_id bigint,
  p_status text,
  p_snooze_days integer default null,
  p_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text:=lower(trim(coalesce(p_status,'')));
  v_row record;
  v_days integer:=greatest(1,least(365,coalesce(p_snooze_days,7)));
begin
  if not public.crm_v2_is_admin() then raise exception 'Solo administrador.'; end if;
  if v_status not in ('pending','contacted','snoozed','done','cancelled') then return jsonb_build_object('ok',false,'error','invalid_status'); end if;
  select f.*,coalesce(cp.whatsapp_status,'unknown') as whatsapp_status into v_row
  from public.crm_followups f
  left join public.crm_contact_preferences cp on cp.customer_id=f.customer_id
  where f.id=p_followup_id for update of f;
  if not found then return jsonb_build_object('ok',false,'error','not_found'); end if;
  if v_status in ('pending','contacted','snoozed') and v_row.channel='whatsapp' and v_row.whatsapp_status<>'opted_in' then
    return jsonb_build_object('ok',false,'error','whatsapp_not_opted_in');
  end if;

  update public.crm_followups set
    status=v_status,
    due_at=case when v_status='snoozed' then now()+(v_days||' days')::interval else due_at end,
    contacted_at=case when v_status='contacted' then coalesce(contacted_at,now()) else contacted_at end,
    completed_at=case when v_status in ('done','cancelled') then coalesce(completed_at,now()) else completed_at end,
    note=case when trim(coalesce(p_note,''))<>'' then left(trim(p_note),600) else note end,
    updated_at=now()
  where id=p_followup_id;
  return jsonb_build_object('ok',true,'status',v_status);
end;
$$;
revoke all on function public.admin_update_crm_followup_v2(bigint,text,integer,text) from public;
grant execute on function public.admin_update_crm_followup_v2(bigint,text,integer,text) to authenticated;

create or replace function public.admin_sync_crm_reactivation_v2()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings public.crm_settings%rowtype;
  v_count integer:=0;
begin
  if not public.crm_v2_is_admin() then raise exception 'Solo administrador.'; end if;
  select * into v_settings from public.crm_settings where id=1;
  if not found then insert into public.crm_settings(id) values(1) on conflict(id) do nothing; select * into v_settings from public.crm_settings where id=1; end if;

  with purchases as (
    select o.customer_id,count(*)::integer delivered_orders,coalesce(sum(coalesce(o.total,0)),0) eligible_spend,
           max(coalesce(o.delivered_at,o.completed_at,o.created_at)) last_purchase_at
    from public.orders o
    where o.customer_id is not null and o.status='entregado' and o.payment_status='pagado'
    group by o.customer_id
  ), candidates as (
    select x.customer_id,
      case
        when x.eligible_spend>=v_settings.vip_spend_threshold and x.last_purchase_at<=now()-(v_settings.vip_reactivation_days||' days')::interval then 'vip_dormant'
        when x.delivered_orders=1 and x.last_purchase_at<=now()-(v_settings.first_repurchase_days||' days')::interval then 'first_repurchase'
        when x.last_purchase_at<=now()-(v_settings.reactivation_days||' days')::interval then 'dormant'
        else 'active'
      end reason
    from purchases x
    join public.crm_contact_preferences cp on cp.customer_id=x.customer_id and cp.whatsapp_status='opted_in'
    join public.customer_profiles p on p.id=x.customer_id and coalesce(nullif(trim(p.phone_normalized),''),nullif(trim(p.phone),'')) is not null
  ), ready as (
    select c.* from candidates c
    where c.reason<>'active'
      and not exists(
        select 1 from public.crm_followups f
        where f.customer_id=c.customer_id
          and f.reason=c.reason
          and (f.status in ('pending','snoozed') or f.created_at>=now()-interval '30 days')
      )
    order by case c.reason when 'vip_dormant' then 1 when 'first_repurchase' then 2 else 3 end
    limit v_settings.queue_limit
  )
  insert into public.crm_followups(customer_id,reason,status,channel,due_at,template_key,source,created_by)
  select r.customer_id,r.reason,'pending','whatsapp',now(),r.reason,'segment_sync',lower(coalesce(auth.jwt()->>'email','admin'))
  from ready r;
  get diagnostics v_count = row_count;
  return jsonb_build_object('ok',true,'created',v_count);
end;
$$;
revoke all on function public.admin_sync_crm_reactivation_v2() from public;
grant execute on function public.admin_sync_crm_reactivation_v2() to authenticated;

create or replace function public.admin_update_crm_settings_v2(
  p_first_repurchase_days integer,
  p_reactivation_days integer,
  p_vip_reactivation_days integer,
  p_vip_spend_threshold numeric,
  p_queue_limit integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.crm_v2_is_admin() then raise exception 'Solo administrador.'; end if;
  if coalesce(p_first_repurchase_days,0)<1 or coalesce(p_reactivation_days,0)<1 or coalesce(p_vip_reactivation_days,0)<1
     or coalesce(p_vip_spend_threshold,-1)<0 or coalesce(p_queue_limit,0)<1 or p_queue_limit>500 then
    return jsonb_build_object('ok',false,'error','invalid_settings');
  end if;
  insert into public.crm_settings(id,first_repurchase_days,reactivation_days,vip_reactivation_days,vip_spend_threshold,queue_limit,updated_at)
  values(1,p_first_repurchase_days,p_reactivation_days,p_vip_reactivation_days,p_vip_spend_threshold,p_queue_limit,now())
  on conflict(id) do update set
    first_repurchase_days=excluded.first_repurchase_days,
    reactivation_days=excluded.reactivation_days,
    vip_reactivation_days=excluded.vip_reactivation_days,
    vip_spend_threshold=excluded.vip_spend_threshold,
    queue_limit=excluded.queue_limit,
    updated_at=now();
  return jsonb_build_object('ok',true);
end;
$$;
revoke all on function public.admin_update_crm_settings_v2(integer,integer,integer,numeric,integer) from public;
grant execute on function public.admin_update_crm_settings_v2(integer,integer,integer,numeric,integer) to authenticated;
