-- AromaLParfum — PASO 57 — Seguimiento de Pedido V2
-- Ejecutar UNA sola vez en Supabase > SQL Editor.
-- La tienda pública NO lee public.orders directamente.
-- Esta RPC exige código de pedido + email/teléfono coincidente y devuelve solo datos seguros.

create or replace function public.get_public_order_status(
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
  v_items jsonb := '[]'::jsonb;
  v_code text := upper(trim(coalesce(p_order_code, '')));
  v_contact text := trim(coalesce(p_contact, ''));
  v_contact_digits text := regexp_replace(coalesce(p_contact, ''), '[^0-9]', '', 'g');
begin
  if v_code = '' or v_contact = '' then
    return jsonb_build_object('ok', false, 'error', 'missing_fields');
  end if;

  select
    o.id,
    o.order_code,
    o.status,
    o.payment_status,
    o.payment_method,
    o.payment_plan,
    o.deposit_percent,
    o.required_initial_payment,
    o.amount_paid,
    o.balance_due,
    o.subtotal,
    o.discount_total,
    o.try_before_credit_total,
    o.shipping_total,
    o.total,
    o.shipping_method,
    o.carrier,
    o.tracking_code,
    o.created_at,
    o.confirmed_at,
    o.preparing_at,
    o.shipped_at,
    o.delivered_at,
    o.cancelled_at,
    o.payment_confirmed_at,
    o.refunded_at
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

  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'display_name', coalesce(oi.display_name, 'Producto'),
        'item_type', coalesce(oi.item_type, 'product'),
        'quantity', coalesce(oi.quantity, 1),
        'ml', oi.ml,
        'unit_price', coalesce(oi.unit_price, 0),
        'total_price', coalesce(oi.total_price, 0)
      )
      order by oi.id
    ),
    '[]'::jsonb
  )
  into v_items
  from public.order_items oi
  where oi.order_id = v_order.id;

  return jsonb_build_object(
    'ok', true,
    'order_code', v_order.order_code,
    'status', v_order.status,
    'payment_status', v_order.payment_status,
    'payment_method', v_order.payment_method,
    'payment_plan', v_order.payment_plan,
    'deposit_percent', v_order.deposit_percent,
    'required_initial_payment', v_order.required_initial_payment,
    'amount_paid', v_order.amount_paid,
    'balance_due', v_order.balance_due,
    'subtotal', v_order.subtotal,
    'discount_total', v_order.discount_total,
    'try_before_credit_total', v_order.try_before_credit_total,
    'shipping_total', v_order.shipping_total,
    'total', v_order.total,
    'shipping_method', v_order.shipping_method,
    'carrier', v_order.carrier,
    'tracking_code', v_order.tracking_code,
    'created_at', v_order.created_at,
    'confirmed_at', v_order.confirmed_at,
    'preparing_at', v_order.preparing_at,
    'shipped_at', v_order.shipped_at,
    'delivered_at', v_order.delivered_at,
    'cancelled_at', v_order.cancelled_at,
    'payment_confirmed_at', v_order.payment_confirmed_at,
    'refunded_at', v_order.refunded_at,
    'items', v_items
  );
end;
$$;

revoke all on function public.get_public_order_status(text, text) from public;
grant execute on function public.get_public_order_status(text, text) to anon, authenticated;
