"use strict";

// AromaLParfum Frontend V2 — Paso 43
// Checkout seguro: crea pedidos reales mediante create_store_order_v2().
// El navegador nunca envía precios, descuentos ni costos al servidor.

const ALP43_CHECKOUT_CONTACT_KEY = "alp_checkout_contact_v2";
const ALP43_SESSION_KEY = "alp_analytics_session_v2";

function alp43SafeObject(value)
{
  return value && typeof value === "object" && !Array.isArray(value)
    ? value
    : {};
}

function alp43CheckoutState()
{
  state.checkoutV2 = alp43SafeObject(state.checkoutV2);

  if (!Array.isArray(state.checkoutV2.paymentMethods)) state.checkoutV2.paymentMethods = [];
  if (!state.checkoutV2.settings) state.checkoutV2.settings = {};
  if (!state.checkoutV2.token) state.checkoutV2.token = "";
  if (!state.checkoutV2.selectedMethodSlug) state.checkoutV2.selectedMethodSlug = "";
  if (!state.checkoutV2.paymentPlan) state.checkoutV2.paymentPlan = "";
  if (!state.checkoutV2.order) state.checkoutV2.order = null;
  if (typeof state.checkoutV2.submitting !== "boolean") state.checkoutV2.submitting = false;
  if (typeof state.checkoutV2.loaded !== "boolean") state.checkoutV2.loaded = false;

  return state.checkoutV2;
}

function alp43MoneyNumber(value)
{
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function alp43GenerateCheckoutToken()
{
  const random = globalThis.crypto?.randomUUID
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;

  return `${random}-${Date.now().toString(36)}`.slice(0, 120);
}

function alp43GetSessionId()
{
  let sessionId = alp66StorageGet(ALP43_SESSION_KEY) || "";

  if (!sessionId)
  {
    sessionId = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : `alp-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

    alp66StorageSet(ALP43_SESSION_KEY, sessionId);
  }

  return sessionId;
}

function alp43GetAttribution()
{
  const params = new URLSearchParams(location.search);
  let referrerHost = "";

  try
  {
    referrerHost = document.referrer ? new URL(document.referrer).host : "";
  }
  catch (_error)
  {
    referrerHost = "";
  }

  const utmCampaign = String(params.get("utm_campaign") || "").trim();
  let persistedCampaign = "";

  try
  {
    persistedCampaign = sessionStorage.getItem("alp_campaign_slug_v2") || "";
  }
  catch (_error)
  {
    persistedCampaign = "";
  }

  const routeCampaign = String(
    state.routePayload?.campaign_slug ||
    state.routePayload?.campaignSlug ||
    persistedCampaign ||
    (state.route === "campaign" ? state.routePayload?.slug : "") ||
    ""
  ).trim();

  return {
    session_id: typeof analyticsV2GetSessionId === "function"
      ? analyticsV2GetSessionId()
      : alp43GetSessionId(),
    utm_source: String(params.get("utm_source") || "").slice(0, 150),
    utm_medium: String(params.get("utm_medium") || "").slice(0, 150),
    utm_campaign: utmCampaign.slice(0, 150),
    campaign_slug: (routeCampaign || utmCampaign).toLowerCase().slice(0, 150),
    landing_path: `${location.pathname}${location.search}`.slice(0, 500),
    referrer_host: referrerHost.slice(0, 300),
  };
}

function alp43LoadSavedContact()
{
  try
  {
    return alp43SafeObject(JSON.parse(alp66StorageGet(ALP43_CHECKOUT_CONTACT_KEY) || "{}"));
  }
  catch (_error)
  {
    return {};
  }
}

function alp43SaveContact(contact)
{
  alp66StorageSet(
    ALP43_CHECKOUT_CONTACT_KEY,
    JSON.stringify({
      name: String(contact.name || "").slice(0, 120),
      phone: String(contact.phone || "").slice(0, 40),
      email: String(contact.email || "").slice(0, 200),
      address: String(contact.address || "").slice(0, 250),
      city: String(contact.city || "").slice(0, 120),
      province: String(contact.province || "").slice(0, 120),
      postal: String(contact.postal || "").slice(0, 40),
    })
  );
}

async function alp43LoadCheckoutConfig(force = false)
{
  const checkout = alp43CheckoutState();

  if (checkout.loaded && !force)
  {
    return checkout;
  }

  const result = await supabaseClient.rpc("get_checkout_payment_config");

  if (result.error)
  {
    throw new Error(result.error.message || "No se pudo cargar la configuración de pago.");
  }

  const data = alp43SafeObject(result.data);
  checkout.settings = alp43SafeObject(data.settings);
  checkout.paymentMethods = Array.isArray(data.payment_methods) ? data.payment_methods : [];
  checkout.loaded = true;

  if (!checkout.paymentMethods.length)
  {
    throw new Error(
      state.language === "en"
        ? "There are no payment methods available right now."
        : "No hay métodos de pago disponibles en este momento."
    );
  }

  if (!checkout.paymentMethods.some(method => method.slug === checkout.selectedMethodSlug))
  {
    checkout.selectedMethodSlug = checkout.paymentMethods[0].slug;
  }

  alp43EnsurePaymentPlan();

  return checkout;
}

function alp43SelectedPaymentMethod()
{
  const checkout = alp43CheckoutState();
  return checkout.paymentMethods.find(method => method.slug === checkout.selectedMethodSlug) || checkout.paymentMethods[0] || null;
}

function alp43EnsurePaymentPlan()
{
  const checkout = alp43CheckoutState();
  const method = alp43SelectedPaymentMethod();

  if (!method)
  {
    checkout.paymentPlan = "full";
    return;
  }

  const preferred = checkout.paymentPlan || checkout.settings.default_payment_plan || "deposit";

  if (preferred === "deposit" && method.allows_deposit)
  {
    checkout.paymentPlan = "deposit";
    return;
  }

  if (preferred === "full" && method.allows_full)
  {
    checkout.paymentPlan = "full";
    return;
  }

  checkout.paymentPlan = method.allows_deposit ? "deposit" : "full";
}

function alp43EstimatedPayment()
{
  const checkout = alp43CheckoutState();
  const method = alp43SelectedPaymentMethod();
  const total = Math.max(0, alp43MoneyNumber(getCartSubtotal()));

  if (!method || checkout.paymentPlan === "full")
  {
    return {
      total,
      percent: 100,
      initial: total,
      remaining: 0,
    };
  }

  const percent = Math.min(
    99,
    Math.max(
      1,
      alp43MoneyNumber(method.deposit_percent ?? checkout.settings.default_deposit_percent ?? 50)
    )
  );

  const initial = Math.round(total * (percent / 100) * 100) / 100;

  return {
    total,
    percent,
    initial,
    remaining: Math.max(0, total - initial),
  };
}

function alp43RenderPaymentMethodCards()
{
  const checkout = alp43CheckoutState();

  return checkout.paymentMethods.map(method => {
    const checked = method.slug === checkout.selectedMethodSlug;
    const badges = [];

    if (method.allows_deposit)
    {
      badges.push(
        state.language === "en"
          ? `Deposit ${alp43MoneyNumber(method.deposit_percent || checkout.settings.default_deposit_percent || 50)}%`
          : `Seña ${alp43MoneyNumber(method.deposit_percent || checkout.settings.default_deposit_percent || 50)}%`
      );
    }

    if (method.allows_full)
    {
      badges.push(state.language === "en" ? "Full payment" : "Pago completo");
    }

    return `
      <label class="checkout43-payment-card ${checked ? "is-selected" : ""}">
        <input
          type="radio"
          name="checkoutPaymentV2"
          value="${escapeAttribute(method.slug)}"
          ${checked ? "checked" : ""}>
        <span class="checkout43-payment-copy">
          <strong>${escapeHtml(method.name || method.slug)}</strong>
          ${method.description ? `<small>${escapeHtml(method.description)}</small>` : ""}
          <span class="checkout43-badges">${badges.map(label => `<em>${escapeHtml(label)}</em>`).join("")}</span>
        </span>
      </label>
    `;
  }).join("");
}

function alp43RenderPaymentPlanOptions()
{
  const checkout = alp43CheckoutState();
  const method = alp43SelectedPaymentMethod();

  if (!method) return "";

  const options = [];

  if (method.allows_deposit)
  {
    const percent = alp43MoneyNumber(method.deposit_percent || checkout.settings.default_deposit_percent || 50);
    options.push({
      value: "deposit",
      label: state.language === "en" ? `Pay ${percent}% now` : `Pagar seña del ${percent}%`,
      note: state.language === "en" ? "The rest stays as balance." : "El resto queda como saldo pendiente.",
    });
  }

  if (method.allows_full)
  {
    options.push({
      value: "full",
      label: state.language === "en" ? "Pay the full amount" : "Pagar el total",
      note: state.language === "en" ? "One payment for the complete order." : "Un solo pago por el pedido completo.",
    });
  }

  return options.map(option => `
    <label class="checkout43-plan ${checkout.paymentPlan === option.value ? "is-selected" : ""}">
      <input
        type="radio"
        name="checkoutPaymentPlanV2"
        value="${escapeAttribute(option.value)}"
        ${checkout.paymentPlan === option.value ? "checked" : ""}>
      <span>
        <strong>${escapeHtml(option.label)}</strong>
        <small>${escapeHtml(option.note)}</small>
      </span>
    </label>
  `).join("");
}

function alp43RenderPaymentEstimate()
{
  const estimate = alp43EstimatedPayment();
  const method = alp43SelectedPaymentMethod();

  return `
    <div class="checkout43-payment-estimate">
      <div>
        <span>${state.language === "en" ? "Cart subtotal" : "Subtotal del carrito"}</span>
        <strong>${money(estimate.total)}</strong>
      </div>
      <div>
        <span>${state.language === "en" ? "Estimated initial payment" : "Pago inicial estimado"}</span>
        <strong>${money(estimate.initial)}</strong>
      </div>
      ${estimate.remaining > 0 ? `
        <div>
          <span>${state.language === "en" ? "Estimated remaining balance" : "Saldo estimado después de la seña"}</span>
          <strong>${money(estimate.remaining)}</strong>
        </div>
      ` : ""}
      ${method?.instructions ? `<p>${escapeHtml(method.instructions)}</p>` : ""}
      <small>
        ${state.language === "en"
          ? "The final price, stock and Try Before benefit are recalculated securely when the order is registered."
          : "El precio final, el stock y el beneficio Probalo Antes se recalculan de forma segura al registrar el pedido."
        }
      </small>
    </div>
  `;
}

function alp43RenderCartSummary()
{
  return state.cart.map(line => `
    <div class="builder-summary-item">
      <span>${escapeHtml(getCartLineTitle(line))} × ${Math.max(1, asNumber(line.qty, 1))}</span>
      <strong>${money(getCartLineUnitPrice(line) * Math.max(1, asNumber(line.qty, 1)))}</strong>
    </div>
  `).join("");
}

function alp43RenderCheckout()
{
  const checkout = alp43CheckoutState();
  const saved = alp43LoadSavedContact();

  return `
    <div class="checkout43-shell">
      <div class="checkout43-security-note">
        <span>✓</span>
        <div>
          <strong>${state.language === "en" ? "Secure order" : "Pedido seguro"}</strong>
          <p>${state.language === "en"
            ? "AromaLParfum validates prices and stock directly in Supabase before creating the order."
            : "AromaLParfum valida precios y stock directamente en Supabase antes de crear el pedido."
          }</p>
        </div>
      </div>

      <div class="checkout64-assurances" aria-label="${state.language === "en" ? "Checkout guarantees" : "Garantías del checkout"}">
        <span><b aria-hidden="true">✓</b>${state.language === "en" ? "Price revalidated" : "Precio revalidado"}</span>
        <span><b aria-hidden="true">✓</b>${state.language === "en" ? "Stock revalidated" : "Stock revalidado"}</span>
        <span><b aria-hidden="true">✓</b>${state.language === "en" ? "Order code" : "Código de pedido"}</span>
        <span><b aria-hidden="true">✓</b>${state.language === "en" ? "Tracking included" : "Seguimiento incluido"}</span>
      </div>

      <div class="settings-card">
        <h3>${escapeHtml(t("checkout.client"))}</h3>
        <div class="admin-form-grid">
          <div class="admin-field span-2">
            <label for="checkoutName">${escapeHtml(t("checkout.name"))}</label>
            <input id="checkoutName" class="text-input" type="text" autocomplete="name" value="${escapeAttribute(saved.name || "")}">
          </div>
          <div class="admin-field">
            <label for="checkoutPhone">${escapeHtml(t("checkout.phone"))}</label>
            <input id="checkoutPhone" class="text-input" type="tel" autocomplete="tel" value="${escapeAttribute(saved.phone || "")}">
          </div>
          <div class="admin-field">
            <label for="checkoutEmail">${escapeHtml(t("checkout.email"))}</label>
            <input id="checkoutEmail" class="text-input" type="email" autocomplete="email" value="${escapeAttribute(saved.email || "")}">
          </div>
        </div>
      </div>

      <div class="settings-card">
        <h3>${escapeHtml(t("checkout.payment"))}</h3>
        <div id="checkout43PaymentMethods" class="checkout43-payment-methods">
          ${alp43RenderPaymentMethodCards()}
        </div>
        <div class="checkout43-subheading">${state.language === "en" ? "How do you want to pay?" : "¿Cómo querés pagarlo?"}</div>
        <div id="checkout43PlanOptions" class="checkout43-plan-options">
          ${alp43RenderPaymentPlanOptions()}
        </div>
        <div id="checkout43PaymentEstimate">
          ${alp43RenderPaymentEstimate()}
        </div>
      </div>

      <div class="settings-card">
        <h3>${escapeHtml(t("checkout.shipping"))}</h3>
        <div class="admin-check-row">
          <label class="admin-check">
            <input type="radio" name="checkoutShipping" value="Sí" data-action="shipping-choice">
            ${escapeHtml(t("checkout.yes"))}
          </label>
          <label class="admin-check">
            <input type="radio" name="checkoutShipping" value="No" data-action="shipping-choice" checked>
            ${escapeHtml(t("checkout.no"))}
          </label>
        </div>
        <div id="checkoutShippingFields" class="admin-form-grid hidden u-mt-14">
          <div class="admin-field span-2">
            <label for="checkoutAddress">${escapeHtml(t("checkout.address"))}</label>
            <input id="checkoutAddress" class="text-input" type="text" autocomplete="street-address" value="${escapeAttribute(saved.address || "")}">
          </div>
          <div class="admin-field">
            <label for="checkoutCity">${escapeHtml(t("checkout.city"))}</label>
            <input id="checkoutCity" class="text-input" type="text" autocomplete="address-level2" value="${escapeAttribute(saved.city || "")}">
          </div>
          <div class="admin-field">
            <label for="checkoutProvince">${escapeHtml(t("checkout.province"))}</label>
            <input id="checkoutProvince" class="text-input" type="text" autocomplete="address-level1" value="${escapeAttribute(saved.province || "")}">
          </div>
          <div class="admin-field">
            <label for="checkoutPostal">${escapeHtml(t("checkout.postal"))}</label>
            <input id="checkoutPostal" class="text-input" type="text" autocomplete="postal-code" value="${escapeAttribute(saved.postal || "")}">
          </div>
        </div>
      </div>

      <div class="settings-card">
        <h3>${escapeHtml(t("checkout.summary"))}</h3>
        ${alp43RenderCartSummary()}
        <div class="builder-total">
          <span>${escapeHtml(t("cart.total"))}</span>
          <strong>${money(getCartSubtotal())}</strong>
        </div>
        <p class="checkout43-try-note">
          ${state.language === "en"
            ? "If you have an available Try Before credit for a full bottle in this order, Supabase applies it automatically."
            : "Si tenés un crédito Probalo Antes disponible para una botella completa de este pedido, Supabase lo aplica automáticamente."
          }
        </p>
      </div>

      <button
        id="checkout43Submit"
        class="btn checkout43-submit"
        type="button"
        data-checkout-v2-action="submit"
        ${checkout.submitting ? "disabled" : ""}>
        ${checkout.submitting
          ? (state.language === "en" ? "Registering order..." : "Registrando pedido...")
          : (state.language === "en" ? "Register secure order" : "Registrar pedido seguro")
        }
      </button>

      <p class="checkout43-footer-note">
        ${state.language === "en"
          ? "WhatsApp is optional and is used after the order only for confirmation or personal assistance."
          : "WhatsApp queda como confirmación o asesoría después de registrar el pedido; no es necesario para que el pedido exista."
        }
      </p>
    </div>
  `;
}

// Reemplaza el checkout legado del Paso 42.
renderCheckout = alp43RenderCheckout;

openCheckout = async function()
{
  state.checkoutDiscount = null;

  if (!state.cart.length)
  {
    toast(t("cart.empty"), "error");
    return;
  }

  closeCart();

  try
  {
    await alp43LoadCheckoutConfig();
    const checkout = alp43CheckoutState();
    checkout.order = null;
    checkout.submitting = false;
    checkout.token = checkout.token || alp43GenerateCheckoutToken();

    if (typeof analyticsV2TrackCheckoutStart === "function")
    {
      analyticsV2TrackCheckoutStart();
    }

    openModal(t("checkout.title"), alp43RenderCheckout());
    alp43UpdateCheckoutPaymentUI();
  }
  catch (error)
  {
    openModal(
      t("checkout.title"),
      `<div class="empty-state"><h3>${state.language === "en" ? "Checkout unavailable" : "Checkout no disponible"}</h3><p>${escapeHtml(error?.message || String(error))}</p></div>`
    );
  }
};

function alp43UpdateCheckoutPaymentUI()
{
  const methodsHost = document.getElementById("checkout43PaymentMethods");
  const plansHost = document.getElementById("checkout43PlanOptions");
  const estimateHost = document.getElementById("checkout43PaymentEstimate");

  if (methodsHost) methodsHost.innerHTML = alp43RenderPaymentMethodCards();
  if (plansHost) plansHost.innerHTML = alp43RenderPaymentPlanOptions();
  if (estimateHost) estimateHost.innerHTML = alp43RenderPaymentEstimate();
}

function alp43ReadCheckoutForm()
{
  const shipping = getCheckedValue("checkoutShipping");

  return {
    name: String(document.getElementById("checkoutName")?.value || "").trim(),
    phone: String(document.getElementById("checkoutPhone")?.value || "").trim(),
    email: String(document.getElementById("checkoutEmail")?.value || "").trim(),
    shipping,
    address: String(document.getElementById("checkoutAddress")?.value || "").trim(),
    city: String(document.getElementById("checkoutCity")?.value || "").trim(),
    province: String(document.getElementById("checkoutProvince")?.value || "").trim(),
    postal: String(document.getElementById("checkoutPostal")?.value || "").trim(),
  };
}

function alp43ValidateCheckoutForm(form)
{
  if (!form.name || !form.phone || !form.email)
  {
    throw new Error(
      state.language === "en"
        ? "Complete your name, phone and email."
        : "Completá nombre, teléfono y correo."
    );
  }

  if (!form.email.includes("@"))
  {
    throw new Error(state.language === "en" ? "Enter a valid email." : "Ingresá un correo válido.");
  }

  if (form.shipping === "Sí" && (!form.address || !form.city || !form.province))
  {
    throw new Error(
      state.language === "en"
        ? "Complete the shipping details."
        : "Completá los datos de envío."
    );
  }
}

function alp43CheckoutItems()
{
  if (typeof getCheckoutV2CartItems === "function")
  {
    return getCheckoutV2CartItems();
  }

  return state.cart
    .filter(line => line.kind === "product")
    .map(line => ({
      type: "product",
      productId: Number(line.productId ?? line.id),
      qty: Math.max(1, asNumber(line.qty, 1)),
    }));
}

async function alp43SubmitCheckout()
{
  const checkout = alp43CheckoutState();

  if (checkout.submitting) return;

  try
  {
    const form = alp43ReadCheckoutForm();
    alp43ValidateCheckoutForm(form);

    const method = alp43SelectedPaymentMethod();
    if (!method) throw new Error("No hay un método de pago seleccionado.");

    const items = alp43CheckoutItems();
    if (!items.length) throw new Error(state.language === "en" ? "The cart is empty." : "El carrito está vacío.");

    checkout.submitting = true;
    checkout.token = checkout.token || alp43GenerateCheckoutToken();

    const button = document.getElementById("checkout43Submit");
    if (button)
    {
      button.disabled = true;
      button.textContent = state.language === "en" ? "Registering order..." : "Registrando pedido...";
    }

    const shippingData = form.shipping === "Sí"
      ? {
          method: "delivery",
          address: form.address,
          city: form.city,
          province: form.province,
          postal: form.postal || null,
        }
      : {
          method: "pickup",
        };

    if (typeof analyticsV2TrackCheckoutSubmit === "function")
    {
      analyticsV2TrackCheckoutSubmit();
    }

    const result = await supabaseClient.rpc("create_store_order_v2", {
      p_checkout_token: checkout.token,
      p_customer_name: form.name,
      p_phone: form.phone,
      p_email: form.email,
      p_items: items,
      p_payment_method_slug: method.slug,
      p_payment_plan: checkout.paymentPlan,
      p_shipping: shippingData,
      p_source: "web",
      p_attribution: alp43GetAttribution(),
    });

    if (result.error)
    {
      throw new Error(result.error.message || "No se pudo registrar el pedido.");
    }

    const order = alp43SafeObject(result.data);

    if (!order.ok || !order.order_code)
    {
      throw new Error(state.language === "en" ? "The server did not return a valid order." : "El servidor no devolvió un pedido válido.");
    }

    alp43SaveContact(form);

    checkout.order = {
      ...order,
      customer: form,
      method,
      paymentPlan: checkout.paymentPlan,
    };

    if (typeof orderTrackingV2RememberOrder === "function")
    {
      orderTrackingV2RememberOrder(checkout.order);
    }

    if (typeof analyticsV2TrackOrderCreated === "function")
    {
      analyticsV2TrackOrderCreated();
    }

    // El pedido ya existe en Supabase. Vaciar el carrito evita duplicarlo.
    state.cart = [];
    saveLocalState();

    // Nuevo token para un pedido futuro.
    checkout.token = "";
    checkout.submitting = false;

    alp43RenderOrderSuccess(checkout.order);
  }
  catch (error)
  {
    checkout.submitting = false;

    const button = document.getElementById("checkout43Submit");
    if (button)
    {
      button.disabled = false;
      button.textContent = state.language === "en" ? "Register secure order" : "Registrar pedido seguro";
    }

    toast(error?.message || String(error), "error");
  }
}

function alp43RenderOrderSuccess(order)
{
  const total = alp43MoneyNumber(order.total);
  const initial = alp43MoneyNumber(order.required_initial_payment);
  const tryBefore = alp43MoneyNumber(order.try_before_credit);
  const remainingAfterInitial = Math.max(0, total - initial);
  const isDeposit = order.payment_plan === "deposit";

  const html = `
    <div class="checkout43-success">
      <div class="checkout43-success-icon">✓</div>
      <div class="checkout43-success-head">
        <span>${state.language === "en" ? "Order registered" : "Pedido registrado"}</span>
        <h3>${escapeHtml(order.order_code)}</h3>
        <p>${state.language === "en"
          ? "Your order already exists in AromaLParfum. WhatsApp is optional for confirmation or assistance."
          : "Tu pedido ya existe en AromaLParfum. WhatsApp queda opcional para confirmar detalles o pedir asesoría."
        }</p>
      </div>

      <div class="checkout43-receipt">
        <div><span>${state.language === "en" ? "Subtotal" : "Subtotal"}</span><strong>${money(alp43MoneyNumber(order.subtotal))}</strong></div>
        ${tryBefore > 0 ? `<div class="is-benefit"><span>Probalo Antes</span><strong>-${money(tryBefore)}</strong></div>` : ""}
        <div><span>${state.language === "en" ? "Shipping" : "Envío"}</span><strong>${money(alp43MoneyNumber(order.shipping_total))}</strong></div>
        <div class="is-total"><span>Total</span><strong>${money(total)}</strong></div>
      </div>

      <div class="checkout43-payment-result">
        <div>
          <span>${state.language === "en" ? "Payment method" : "Método de pago"}</span>
          <strong>${escapeHtml(order.payment_method || order.method?.name || "")}</strong>
        </div>
        <div>
          <span>${isDeposit ? (state.language === "en" ? "Deposit to pay" : "Seña a pagar") : (state.language === "en" ? "Amount to pay" : "Importe a pagar")}</span>
          <strong>${money(initial)}</strong>
        </div>
        ${isDeposit ? `<div><span>${state.language === "en" ? "Balance after deposit" : "Saldo después de la seña"}</span><strong>${money(remainingAfterInitial)}</strong></div>` : ""}
      </div>

      ${order.method?.instructions ? `<div class="checkout43-instructions"><strong>${state.language === "en" ? "Payment instructions" : "Indicaciones de pago"}</strong><p>${escapeHtml(order.method.instructions)}</p></div>` : ""}

      <div class="checkout43-success-actions">
        <button class="btn" type="button" data-checkout-v2-action="whatsapp">
          ${state.language === "en" ? "Confirm / ask on WhatsApp" : "Confirmar / consultar por WhatsApp"}
        </button>
        <button class="btn secondary" type="button" data-checkout-v2-action="copy-code">
          ${state.language === "en" ? "Copy order code" : "Copiar código del pedido"}
        </button>
        <button class="btn secondary" type="button" data-checkout-v2-action="track">
          ${state.language === "en" ? "Track my order" : "Ver seguimiento"}
        </button>
        <button class="btn secondary" type="button" data-checkout-v2-action="continue-shopping">
          ${state.language === "en" ? "Continue shopping" : "Seguir comprando"}
        </button>
      </div>
    </div>
  `;

  openModal(state.language === "en" ? "Order confirmed" : "Pedido confirmado", html);
}

function alp43BuildWhatsAppConfirmation(order)
{
  const customer = alp43SafeObject(order.customer);
  const total = alp43MoneyNumber(order.total);
  const initial = alp43MoneyNumber(order.required_initial_payment);
  const remaining = Math.max(0, total - initial);
  const deposit = order.payment_plan === "deposit";

  return state.language === "en"
    ? `Hello! I already registered my AromaLParfum order.\n\nOrder: ${order.order_code}\nName: ${customer.name || ""}\nTotal: ${money(total)}\nPayment method: ${order.payment_method || order.method?.name || ""}\n${deposit ? `Deposit: ${money(initial)}\nBalance after deposit: ${money(remaining)}` : `Amount to pay: ${money(initial)}`}\n\nI would like to confirm the details / payment.`
    : `¡Hola! Ya registré mi pedido en AromaLParfum.\n\nPedido: ${order.order_code}\nNombre: ${customer.name || ""}\nTotal: ${money(total)}\nMétodo de pago: ${order.payment_method || order.method?.name || ""}\n${deposit ? `Seña: ${money(initial)}\nSaldo después de la seña: ${money(remaining)}` : `Importe a pagar: ${money(initial)}`}\n\nQuiero confirmar los detalles / el pago.`;
}

function alp43OpenWhatsAppConfirmation()
{
  const order = alp43CheckoutState().order;
  if (!order) return;

  const whatsapp = getSiteSetting("contact", "whatsapp", CONFIG.whatsappNumber);
  const number = String(whatsapp || "").replace(/\D/g, "");
  const message = alp43BuildWhatsAppConfirmation(order);

  window.open(`https://wa.me/${number}?text=${encodeURIComponent(message)}`, "_blank", "noopener");
}

async function alp43CopyOrderCode()
{
  const code = alp43CheckoutState().order?.order_code || "";
  if (!code) return;

  try
  {
    await navigator.clipboard.writeText(code);
    toast(state.language === "en" ? "Order code copied." : "Código del pedido copiado.", "success");
  }
  catch (_error)
  {
    toast(code, "success");
  }
}

// Los descuentos automáticos quedan fuera de Descubrí tu Aroma y del flujo de compra.
validateGameDiscount = async function()
{
  state.checkoutDiscount = null;
  toast(
    state.language === "en"
      ? "Game discounts are no longer part of checkout."
      : "Los descuentos de juegos ya no forman parte del checkout.",
    "error"
  );
};

// El pedido ya no se crea por WhatsApp. Esta función queda solo por compatibilidad
// con enlaces antiguos y abre el checkout seguro.
sendWhatsAppOrder = function()
{
  openCheckout();
};

if (!window.__alp43CheckoutListenersInstalled)
{
  window.__alp43CheckoutListenersInstalled = true;

  document.addEventListener("change", event => {
    const target = event.target;

    if (target?.matches('input[name="checkoutPaymentV2"]'))
    {
      const checkout = alp43CheckoutState();
      checkout.selectedMethodSlug = target.value;
      alp43EnsurePaymentPlan();
      alp43UpdateCheckoutPaymentUI();
      return;
    }

    if (target?.matches('input[name="checkoutPaymentPlanV2"]'))
    {
      const checkout = alp43CheckoutState();
      checkout.paymentPlan = target.value;
      alp43EnsurePaymentPlan();
      alp43UpdateCheckoutPaymentUI();
      return;
    }
  });

  document.addEventListener("click", async event => {
    const target = event.target.closest("[data-checkout-v2-action]");
    if (!target) return;

    event.preventDefault();

    const action = target.dataset.checkoutV2Action;

    if (action === "submit")
    {
      await alp43SubmitCheckout();
      return;
    }

    if (action === "whatsapp")
    {
      alp43OpenWhatsAppConfirmation();
      return;
    }

    if (action === "copy-code")
    {
      await alp43CopyOrderCode();
      return;
    }

    if (action === "track")
    {
      const order = alp43CheckoutState().order;
      if (order && typeof orderTrackingV2Open === "function")
      {
        closeModal();
        const contact = order.customer?.email || order.customer?.phone || "";
        orderTrackingV2Open(order.order_code, contact);
      }
      return;
    }

    if (action === "continue-shopping")
    {
      closeModal();
      setRoute("catalog");
    }
  });
}
