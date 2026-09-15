-- AromaLParfum — PASO 65 — Security Hardening V2
-- Ejecutar UNA sola vez en Supabase > SQL Editor ANTES de subir el frontend del Paso 65.
-- Idempotente: puede volver a ejecutarse si hiciera falta.
--
-- Objetivos:
-- 1) La autorización de Admin se confirma en Supabase, no solo en JavaScript.
-- 2) Cerrar grants directos residuales de Club/CRM; esas operaciones ya usan RPC controladas.
-- 3) Verificar RLS de las tablas sensibles conocidas sin exponer sus datos.

create or replace function public.alp_admin_is_authorized_v2()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select
    auth.uid() is not null
    and lower(coalesce(auth.jwt() ->> 'email', '')) = 'defanissantiago@gmail.com';
$$;

revoke all on function public.alp_admin_is_authorized_v2() from public;
grant execute on function public.alp_admin_is_authorized_v2() to authenticated;

-- Cierra acceso directo a tablas que ya tienen RPC específicas.
-- Se usa SQL dinámico para que el script siga siendo seguro si alguna tabla opcional no existe.
do $$
declare
  v_table text;
  v_sequence text;
begin
  foreach v_table in array array[
    'loyalty_settings',
    'loyalty_adjustments',
    'loyalty_benefits',
    'crm_settings',
    'crm_contact_preferences',
    'crm_consent_log',
    'crm_followups',
    'product_reviews',
    'store_analytics_events'
  ]
  loop
    if to_regclass('public.' || v_table) is not null then
      execute format('alter table public.%I enable row level security', v_table);
      execute format('revoke all on table public.%I from anon, authenticated', v_table);
    end if;
  end loop;

  foreach v_sequence in array array[
    'loyalty_adjustments_id_seq',
    'loyalty_benefits_id_seq',
    'crm_consent_log_id_seq',
    'crm_followups_id_seq',
    'product_reviews_id_seq',
    'store_analytics_events_id_seq'
  ]
  loop
    if to_regclass('public.' || v_sequence) is not null then
      execute format('revoke all on sequence public.%I from anon, authenticated', v_sequence);
    end if;
  end loop;
end;
$$;

create or replace function public.admin_security_status_v2()
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  v_authorized boolean := public.alp_admin_is_authorized_v2();
  v_rls_enabled boolean := true;
  v_direct_closed boolean := true;
  v_table text;
  v_oid regclass;
begin
  if not v_authorized then
    return jsonb_build_object(
      'ok', false,
      'authorized', false,
      'error', 'not_authorized'
    );
  end if;

  foreach v_table in array array[
    'loyalty_settings',
    'loyalty_adjustments',
    'loyalty_benefits',
    'crm_settings',
    'crm_contact_preferences',
    'crm_consent_log',
    'crm_followups',
    'product_reviews',
    'store_analytics_events'
  ]
  loop
    v_oid := to_regclass('public.' || v_table);

    if v_oid is not null then
      if not coalesce((select c.relrowsecurity from pg_catalog.pg_class c where c.oid = v_oid), false) then
        v_rls_enabled := false;
      end if;

      if has_table_privilege('anon', v_oid, 'SELECT')
         or has_table_privilege('anon', v_oid, 'INSERT')
         or has_table_privilege('anon', v_oid, 'UPDATE')
         or has_table_privilege('anon', v_oid, 'DELETE')
      then
        v_direct_closed := false;
      end if;

      -- Para las tablas de Club/CRM tampoco dejamos grants directos a authenticated.
      if v_table in (
        'loyalty_settings','loyalty_adjustments','loyalty_benefits',
        'crm_settings','crm_contact_preferences','crm_consent_log','crm_followups'
      ) and (
        has_table_privilege('authenticated', v_oid, 'SELECT')
        or has_table_privilege('authenticated', v_oid, 'INSERT')
        or has_table_privilege('authenticated', v_oid, 'UPDATE')
        or has_table_privilege('authenticated', v_oid, 'DELETE')
      )
      then
        v_direct_closed := false;
      end if;
    end if;
  end loop;

  return jsonb_build_object(
    'ok', true,
    'authorized', true,
    'server_time', now(),
    'sensitive_rls_enabled', v_rls_enabled,
    'sensitive_direct_access_closed', v_direct_closed,
    'auth_role', coalesce(auth.jwt() ->> 'role', ''),
    'security_step', 65
  );
end;
$$;

revoke all on function public.admin_security_status_v2() from public;
grant execute on function public.admin_security_status_v2() to authenticated;

-- Reafirma que las RPC públicas conocidas no heredan ejecución genérica de PUBLIC.
do $$
begin
  if to_regprocedure('public.get_public_order_status(text,text)') is not null then
    execute 'revoke all on function public.get_public_order_status(text,text) from public';
    execute 'grant execute on function public.get_public_order_status(text,text) to anon, authenticated';
  end if;

  if to_regprocedure('public.get_product_reviews_v2(bigint,integer,integer)') is not null then
    execute 'revoke all on function public.get_product_reviews_v2(bigint,integer,integer) from public';
    execute 'grant execute on function public.get_product_reviews_v2(bigint,integer,integer) to anon, authenticated';
  end if;

  if to_regprocedure('public.get_loyalty_profile_v2(text,text)') is not null then
    execute 'revoke all on function public.get_loyalty_profile_v2(text,text) from public';
    execute 'grant execute on function public.get_loyalty_profile_v2(text,text) to anon, authenticated';
  end if;

  if to_regprocedure('public.request_story_benefit_v2(text,text,text,text)') is not null then
    execute 'revoke all on function public.request_story_benefit_v2(text,text,text,text) from public';
    execute 'grant execute on function public.request_story_benefit_v2(text,text,text,text) to anon, authenticated';
  end if;

  if to_regprocedure('public.track_store_events_v2(jsonb)') is not null then
    execute 'revoke all on function public.track_store_events_v2(jsonb) from public';
    execute 'grant execute on function public.track_store_events_v2(jsonb) to anon, authenticated';
  end if;
end;
$$;

notify pgrst, 'reload schema';

select jsonb_build_object(
  'paso', 65,
  'admin_server_check', 'admin_security_status_v2',
  'club_crm_direct_grants', 'revoked',
  'sensitive_rls', 'enforced',
  'schema_cache', 'reload_requested'
) as resultado;
