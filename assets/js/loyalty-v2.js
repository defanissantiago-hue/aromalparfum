"use strict";

// AromaLParfum Frontend V2 — PASO 59
// Club AromaLParfum: Puntos Aroma + niveles + beneficio moderado por historia de Instagram.

const loyalty59State = {
  loading: false,
  error: "",
  profile: null,
  orderCode: "",
  contact: "",
};

const alp59ClubState = {
  loaded: false,
  loading: false,
  error: "",
  search: "",
  page: 1,
  pageSize: 20,
  total: 0,
  rows: [],
  benefits: [],
  benefitStatus: "pending",
  summary: {},
  settings: {},
};

window.alp59ClubState = alp59ClubState;

function loyaltyV2Text(es, en) { return state.language === "en" ? en : es; }
function loyaltyV2Num(value, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
function loyaltyV2Money(value) { return money(loyaltyV2Num(value)); }
function loyaltyV2Date(value) {
  if (!value) return "—";
  const d = new Date(value); if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(state.language === "en" ? "en-US" : "es-AR", { dateStyle: "medium" }).format(d);
}
function loyaltyV2TierLabel(tier) {
  const key = String(tier || "esencia").toLowerCase();
  if (key === "prive") return "Privé";
  if (key === "signature") return "Signature";
  return "Esencia";
}
function loyaltyV2TierIndex(tier) { return tier === "prive" ? 2 : tier === "signature" ? 1 : 0; }

function loyaltyV2RecentPrefill() {
  const payloadCode = String(state.routePayload?.orderCode || state.routePayload?.order_code || "").trim();
  const payloadContact = String(state.routePayload?.contact || "").trim();
  if (payloadCode) return { orderCode: payloadCode, contact: payloadContact || orderTrackingV2FindRecent?.(payloadCode)?.contact || "" };
  const recent = typeof orderTrackingV2ReadRecent === "function" ? orderTrackingV2ReadRecent()[0] : null;
  return { orderCode: recent?.orderCode || loyalty59State.orderCode || "", contact: recent?.contact || loyalty59State.contact || "" };
}

function loyaltyV2RenderRecentOrders() {
  if (typeof orderTrackingV2ReadRecent !== "function") return "";
  const rows = orderTrackingV2ReadRecent();
  if (!rows.length) return "";
  return `<div class="loyalty59-recent"><p class="eyebrow">${loyaltyV2Text("En este dispositivo", "On this device")}</p><div class="loyalty59-recent-grid">${rows.map(row => `<button type="button" data-loyalty59-action="recent" data-order-code="${escapeAttribute(row.orderCode)}" data-contact="${escapeAttribute(row.contact || "")}"><strong>${escapeHtml(row.orderCode)}</strong><small>${escapeHtml(typeof orderTrackingV2MaskContact === "function" ? orderTrackingV2MaskContact(row.contact) : "")}</small></button>`).join("")}</div></div>`;
}

function loyaltyV2RenderBenefit(benefit) {
  const status = String(benefit?.status || "pending");
  const labels = {
    pending: loyaltyV2Text("En revisión", "Under review"),
    approved: loyaltyV2Text("Aprobado", "Approved"),
    rejected: loyaltyV2Text("No aprobado", "Not approved"),
    redeemed: loyaltyV2Text("Usado", "Redeemed"),
  };
  return `<article class="loyalty59-benefit is-${escapeAttribute(status)}"><div><span class="loyalty59-pill">${escapeHtml(labels[status] || status)}</span><h4>${loyaltyV2Text("Historia etiquetando AromaLParfum", "Story tagging AromaLParfum")}</h4><p>${loyaltyV2Text(`${loyaltyV2Num(benefit.discount_percent,20)}% de descuento en la próxima compra.`, `${loyaltyV2Num(benefit.discount_percent,20)}% off the next purchase.`)}</p></div>${benefit.benefit_code ? `<div class="loyalty59-code"><span>${loyaltyV2Text("Código", "Code")}</span><strong>${escapeHtml(benefit.benefit_code)}</strong>${status === "approved" ? `<button class="btn small" type="button" data-loyalty59-action="use-benefit" data-code="${escapeAttribute(benefit.benefit_code)}" data-discount="${escapeAttribute(benefit.discount_percent || 20)}">${loyaltyV2Text("Usar por WhatsApp", "Use on WhatsApp")}</button>` : ""}</div>` : ""}</article>`;
}

function loyaltyV2RenderProfile(profile) {
  const points = Math.max(0, loyaltyV2Num(profile.points));
  const settings = profile.settings || {};
  const tier = String(profile.tier || "esencia");
  const idx = loyaltyV2TierIndex(tier);
  const signature = loyaltyV2Num(settings.signature_points,150);
  const prive = loyaltyV2Num(settings.prive_points,350);
  const currentFloor = idx === 2 ? prive : idx === 1 ? signature : 0;
  const nextThreshold = idx === 0 ? signature : idx === 1 ? prive : points;
  const denominator = Math.max(1, nextThreshold - currentFloor);
  const progress = idx === 2 ? 100 : Math.max(0, Math.min(100, Math.round(((points - currentFloor) / denominator) * 100)));
  const benefits = Array.isArray(profile.benefits) ? profile.benefits : [];
  const purchases = Array.isArray(profile.recent_purchases) ? profile.recent_purchases : [];
  const pesosPerPoint = loyaltyV2Num(settings.pesos_per_point,1000);

  return `<div class="loyalty59-profile">
    <div class="loyalty59-hero-card">
      <div><p class="eyebrow">CLUB AROMALPARFUM</p><h2>${loyaltyV2Text(`Hola, ${profile.first_name || ""}`, `Hi, ${profile.first_name || ""}`)}</h2><p>${loyaltyV2Text(`Cada ${loyaltyV2Money(pesosPerPoint)} en pedidos pagados y entregados suma 1 Punto Aroma.`, `Every ${loyaltyV2Money(pesosPerPoint)} in paid and delivered orders earns 1 Aroma Point.`)}</p></div>
      <div class="loyalty59-points"><strong>${escapeHtml(String(points))}</strong><span>${loyaltyV2Text("Puntos Aroma", "Aroma Points")}</span></div>
    </div>

    <div class="loyalty59-kpis">
      <article><span>${loyaltyV2Text("Nivel", "Tier")}</span><strong>${escapeHtml(loyaltyV2TierLabel(tier))}</strong></article>
      <article><span>${loyaltyV2Text("Compras elegibles", "Eligible purchases")}</span><strong>${escapeHtml(String(loyaltyV2Num(profile.delivered_orders)))}</strong></article>
      <article><span>${loyaltyV2Text("Gasto elegible", "Eligible spend")}</span><strong>${loyaltyV2Money(profile.eligible_spend)}</strong></article>
      <article><span>${loyaltyV2Text("Ajustes", "Adjustments")}</span><strong>${loyaltyV2Num(profile.adjustment_points) >= 0 ? "+" : ""}${escapeHtml(String(loyaltyV2Num(profile.adjustment_points)))}</strong></article>
    </div>

    <div class="loyalty59-tier-card">
      <div class="loyalty59-tier-head"><div><span>${loyaltyV2Text("Tu nivel", "Your tier")}</span><strong>${escapeHtml(loyaltyV2TierLabel(tier))}</strong></div>${profile.next_tier ? `<small>${loyaltyV2Text(`Te faltan ${profile.points_to_next_tier} puntos para ${loyaltyV2TierLabel(profile.next_tier)}.`, `${profile.points_to_next_tier} points to ${loyaltyV2TierLabel(profile.next_tier)}.`)}</small>` : `<small>✓ ${loyaltyV2Text("Nivel máximo actual", "Current top tier")}</small>`}</div>
      <div class="loyalty59-progress"><i style="width:${progress}%"></i></div>
      <div class="loyalty59-tier-scale"><span>Esencia</span><span>Signature · ${signature}</span><span>Privé · ${prive}</span></div>
    </div>

    <section class="loyalty59-story-card">
      <div><p class="eyebrow">BENEFICIO SOCIAL</p><h3>${loyaltyV2Text(`Subí una historia y obtené ${loyaltyV2Num(settings.story_discount_percent,20)}% OFF`, `Post a story and get ${loyaltyV2Num(settings.story_discount_percent,20)}% OFF`)}</h3><p>${loyaltyV2Text("Mostrá tu compra, etiquetá a AromaLParfum y enviá la solicitud. La verificamos antes de habilitar el beneficio para tu próxima compra.", "Show your purchase, tag AromaLParfum and submit the request. We verify it before enabling the benefit for your next purchase.")}</p></div>
      ${profile.story_available_for_current_order ? `<button class="btn" type="button" data-loyalty59-action="story-request">${loyaltyV2Text("Solicitar beneficio", "Request benefit")}</button>` : `<span class="loyalty59-muted">${loyaltyV2Text("Para este pedido el beneficio ya fue solicitado o todavía no está habilitado.", "For this order the benefit was already requested or is not yet eligible.")}</span>`}
    </section>

    ${benefits.length ? `<section class="loyalty59-section"><div class="section-title-row"><div><p class="eyebrow">${loyaltyV2Text("Beneficios", "Benefits")}</p><h3>${loyaltyV2Text("Tus beneficios", "Your benefits")}</h3></div></div><div class="loyalty59-benefits">${benefits.map(loyaltyV2RenderBenefit).join("")}</div></section>` : ""}

    ${purchases.length ? `<section class="loyalty59-section"><div class="section-title-row"><div><p class="eyebrow">${loyaltyV2Text("Actividad", "Activity")}</p><h3>${loyaltyV2Text("Compras que sumaron puntos", "Purchases that earned points")}</h3></div></div><div class="loyalty59-purchases">${purchases.map(row => `<article><div><strong>${loyaltyV2Text("Compra elegible", "Eligible purchase")}</strong><small>${escapeHtml(loyaltyV2Date(row.date))}</small></div><span>${loyaltyV2Money(row.total)}</span><b>+${escapeHtml(String(loyaltyV2Num(row.points)))} pts</b></article>`).join("")}</div></section>` : ""}
  </div>`;
}

function loyaltyV2RenderPage() {
  const prefill = loyaltyV2RecentPrefill();
  return `<section class="section loyalty59-page"><div class="container loyalty59-shell">
    <div class="loyalty59-intro"><p class="eyebrow">CLUB AROMALPARFUM</p><h1 class="section-title">${loyaltyV2Text("Tus compras también construyen tu nivel", "Your purchases build your tier")}</h1><p class="section-subtitle">${loyaltyV2Text("Consultá tus Puntos Aroma y beneficios sin crear una cuenta. Usamos el código de un pedido y el mismo email o teléfono de la compra para verificarte de forma privada.", "Check your Aroma Points and benefits without creating an account. We privately verify you with an order code and the same email or phone used at checkout.")}</p></div>
    <form id="loyalty59Form" class="loyalty59-form"><div class="admin-field"><label for="loyalty59Code">${loyaltyV2Text("Código del pedido", "Order code")}</label><input id="loyalty59Code" class="text-input" autocomplete="off" placeholder="ALP-..." value="${escapeAttribute(prefill.orderCode)}"></div><div class="admin-field"><label for="loyalty59Contact">${loyaltyV2Text("Email o teléfono de la compra", "Purchase email or phone")}</label><input id="loyalty59Contact" class="text-input" autocomplete="email" value="${escapeAttribute(prefill.contact)}"></div><button class="btn" type="submit" ${loyalty59State.loading ? "disabled" : ""}>${loyalty59State.loading ? loyaltyV2Text("Consultando…", "Checking…") : loyaltyV2Text("Ver mi Club", "Open my Club")}</button></form>
    ${loyalty59State.error ? `<div class="admin-message error">${escapeHtml(loyalty59State.error)}</div>` : ""}
    ${loyalty59State.profile ? loyaltyV2RenderProfile(loyalty59State.profile) : loyaltyV2RenderRecentOrders()}
  </div></section>`;
}

async function loyaltyV2Lookup(orderCode, contact) {
  const code = String(orderCode || "").trim(); const identity = String(contact || "").trim();
  if (!code || !identity) { loyalty59State.error = loyaltyV2Text("Completá código y email/teléfono.", "Enter order code and email/phone."); loyalty59State.profile=null; renderCurrentRoute(); return; }
  loyalty59State.loading=true; loyalty59State.error=""; loyalty59State.orderCode=code; loyalty59State.contact=identity; renderCurrentRoute();
  try {
    const response = await supabaseClient.rpc("get_loyalty_profile_v2", { p_order_code: code, p_contact: identity });
    if (response.error) throw response.error;
    const data = response.data || {};
    if (!data.ok) {
      const map = { not_found: loyaltyV2Text("No encontramos un pedido que coincida con esos datos.", "We couldn't find an order matching those details."), program_disabled: loyaltyV2Text("El Club está temporalmente pausado.", "The Club is temporarily paused.") };
      throw new Error(map[data.error] || loyaltyV2Text("No pudimos abrir tu Club.", "We couldn't open your Club."));
    }
    loyalty59State.profile=data;
    if (typeof orderTrackingV2WriteRecent === "function") {
      const rows = orderTrackingV2ReadRecent().filter(row => String(row.orderCode).toUpperCase() !== code.toUpperCase());
      rows.unshift({ orderCode: data.order_code || code, contact: identity, savedAt: new Date().toISOString() });
      orderTrackingV2WriteRecent(rows);
    }
  } catch(error) {
    console.debug("PASO59 Club:", error);
    loyalty59State.profile=null;
    loyalty59State.error = String(error?.message || "").includes("get_loyalty_profile_v2") ? loyaltyV2Text("Primero activá el PASO 59 en Supabase.", "Enable STEP 59 in Supabase first.") : (error?.message || loyaltyV2Text("No pudimos consultar el Club.", "We couldn't check the Club."));
  } finally { loyalty59State.loading=false; renderCurrentRoute(); }
}

function loyaltyV2Open(orderCode="", contact="") {
  loyalty59State.profile=null; loyalty59State.error=""; loyalty59State.orderCode=String(orderCode||""); loyalty59State.contact=String(contact||"");
  setRoute("club", { orderCode: loyalty59State.orderCode, contact: loyalty59State.contact });
}

function loyaltyV2ApplyInitialRoute() {
  if (location.pathname.includes("/admin")) return false;
  const params=new URLSearchParams(location.search); const code=String(params.get("club")||"").trim();
  if (!code) return false;
  const recent=typeof orderTrackingV2FindRecent==="function" ? orderTrackingV2FindRecent(code) : null;
  state.route="club"; state.routePayload={orderCode:code,contact:recent?.contact||""}; return true;
}

function loyaltyV2OpenStoryRequest() {
  const profile=loyalty59State.profile; if (!profile) return;
  openModal(loyaltyV2Text("Beneficio por historia", "Story benefit"), `<div class="loyalty59-modal"><p>${loyaltyV2Text(`Subí una historia mostrando tu compra y etiquetá a AromaLParfum. Después indicá tu usuario de Instagram. Al aprobarla tendrás ${loyaltyV2Num(profile.settings?.story_discount_percent,20)}% OFF en tu próxima compra.`, `Post a story showing your purchase and tag AromaLParfum. Then enter your Instagram handle. Once approved you'll receive ${loyaltyV2Num(profile.settings?.story_discount_percent,20)}% OFF your next purchase.`)}</p><div class="admin-field"><label for="loyalty59Instagram">Instagram</label><input id="loyalty59Instagram" class="text-input" maxlength="80" placeholder="@usuario"></div><div class="admin-field"><label for="loyalty59Proof">${loyaltyV2Text("Nota opcional", "Optional note")}</label><textarea id="loyalty59Proof" class="text-input" maxlength="600" placeholder="${loyaltyV2Text("Ej.: la subí hoy y etiqueté @AromaLParfum", "Example: I posted it today and tagged @AromaLParfum")}"></textarea></div><button class="btn" type="button" data-loyalty59-action="submit-story">${loyaltyV2Text("Enviar a revisión", "Submit for review")}</button><div id="loyalty59StoryMessage"></div></div>`);
}

async function loyaltyV2SubmitStory() {
  const handle=String(document.getElementById("loyalty59Instagram")?.value||"").trim(); const note=String(document.getElementById("loyalty59Proof")?.value||"").trim(); const host=document.getElementById("loyalty59StoryMessage");
  if (handle.length<2) { if(host) host.innerHTML=`<div class="admin-message error">${loyaltyV2Text("Ingresá tu usuario de Instagram.", "Enter your Instagram handle.")}</div>`; return; }
  try {
    const response=await supabaseClient.rpc("request_story_benefit_v2", { p_order_code: loyalty59State.orderCode || loyalty59State.profile?.order_code, p_contact: loyalty59State.contact, p_instagram_handle: handle, p_proof_note: note || null });
    if (response.error) throw response.error; const data=response.data||{}; if(!data.ok) throw new Error(data.error||"request_failed");
    closeModal(); toast(loyaltyV2Text("Solicitud enviada. La vamos a verificar antes de habilitar el beneficio.", "Request submitted. We'll verify it before enabling the benefit."),"success");
    await loyaltyV2Lookup(loyalty59State.orderCode || loyalty59State.profile?.order_code, loyalty59State.contact);
  } catch(error) { if(host) host.innerHTML=`<div class="admin-message error">${escapeHtml(error?.message || loyaltyV2Text("No pudimos enviar la solicitud.", "We couldn't submit the request."))}</div>`; }
}

function loyaltyV2UseBenefit(code, discount) {
  const number=String(getSiteSetting("contact","whatsapp",CONFIG.whatsappNumber)||"").replace(/\D/g,"");
  const text=loyaltyV2Text(`Hola AromaLParfum. Quiero usar mi beneficio del ${discount}% del Club. Código: ${code}`, `Hello AromaLParfum. I want to use my ${discount}% Club benefit. Code: ${code}`);
  window.open(`https://wa.me/${number}?text=${encodeURIComponent(text)}`,"_blank","noopener");
}

async function alp59LoadClub({force=false}={}) {
  if (alp59ClubState.loading) return; if (alp59ClubState.loaded && !force) { refreshAdminTab(); return; }
  alp59ClubState.loading=true; alp59ClubState.error=""; if(state.admin?.tab==="club") refreshAdminTab();
  try {
    const [dashRes, benefitsRes] = await Promise.all([
      supabaseClient.rpc("admin_get_loyalty_dashboard_v2", { p_search: alp59ClubState.search, p_page: alp59ClubState.page, p_page_size: alp59ClubState.pageSize }),
      supabaseClient.rpc("admin_get_loyalty_benefits_v2", { p_status: alp59ClubState.benefitStatus || "all" }),
    ]);
    if (dashRes.error) throw dashRes.error; if (benefitsRes.error) throw benefitsRes.error;
    const dash=dashRes.data||{}; const ben=benefitsRes.data||{}; if(!dash.ok) throw new Error(dash.error||"club_admin_unavailable");
    alp59ClubState.rows=Array.isArray(dash.rows)?dash.rows:[]; alp59ClubState.total=loyaltyV2Num(dash.total); alp59ClubState.summary=dash.summary||{}; alp59ClubState.settings=dash.settings||{}; alp59ClubState.benefits=Array.isArray(ben.rows)?ben.rows:[]; alp59ClubState.loaded=true;
  } catch(error) { console.error("PASO59 admin club:",error); alp59ClubState.error=error?.message||String(error); }
  finally { alp59ClubState.loading=false; if(state.admin?.tab==="club") refreshAdminTab(); }
}

function alp59EnsureClubLoaded() { if(state.admin?.tab!=="club") return; if(!alp59ClubState.loaded&&!alp59ClubState.loading) alp59LoadClub(); }

function alp59Kpi(label,value,sub="") { return `<article class="loyalty59-admin-kpi"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong>${sub?`<small>${escapeHtml(sub)}</small>`:""}</article>`; }
function alp59BenefitStatusLabel(status) { const map={pending:["Pendiente","Pending"],approved:["Aprobado","Approved"],rejected:["Rechazado","Rejected"],redeemed:["Usado","Redeemed"]}; const p=map[status]||[status,status]; return state.language==="en"?p[1]:p[0]; }

function renderAdminClubV2() {
  const en=state.language==="en"; const s=alp59ClubState.summary||{}; const cfg=alp59ClubState.settings||{};
  if(alp59ClubState.loading&&!alp59ClubState.loaded) return `<div class="loading-state"><div class="spinner"></div><p>${en?"Loading Club…":"Cargando Club…"}</p></div>`;
  return `<div class="loyalty59-admin">
    <div class="admin-panel-head"><div><p class="eyebrow">CLUB AROMALPARFUM</p><h2>${en?"Loyalty & benefits":"Fidelización y beneficios"}</h2><p>${en?"Real purchase points, tiers and manually verified social benefits.":"Puntos por compras reales, niveles y beneficios sociales verificados manualmente."}</p></div><button class="btn outline" type="button" data-loyalty59-action="admin-refresh">${en?"Refresh":"Actualizar"}</button></div>
    ${alp59ClubState.error?`<div class="admin-message error">${escapeHtml(alp59ClubState.error)}</div>`:""}
    <div class="loyalty59-admin-kpis">${alp59Kpi(en?"Customers":"Clientes",loyaltyV2Num(s.customers))}${alp59Kpi(en?"With points":"Con puntos",loyaltyV2Num(s.members_with_points))}${alp59Kpi(en?"Points issued":"Puntos emitidos",loyaltyV2Num(s.points_issued))}${alp59Kpi(en?"Eligible revenue":"Facturación elegible",loyaltyV2Money(s.eligible_revenue))}${alp59Kpi(en?"Story requests":"Historias pendientes",loyaltyV2Num(s.pending_story_requests))}</div>
    <section class="admin-card loyalty59-settings"><h3>${en?"Program settings":"Configuración del Club"}</h3><div class="admin-form-grid"><div class="admin-field"><label>${en?"Program enabled":"Club activo"}</label><select id="loyalty59Enabled" class="select-input"><option value="true" ${cfg.program_enabled!==false?"selected":""}>${en?"Yes":"Sí"}</option><option value="false" ${cfg.program_enabled===false?"selected":""}>No</option></select></div><div class="admin-field"><label>${en?"ARS per point":"ARS por punto"}</label><input id="loyalty59Rate" class="number-input" type="number" min="1" step="100" value="${escapeAttribute(cfg.pesos_per_point||1000)}"></div><div class="admin-field"><label>Signature · pts</label><input id="loyalty59Signature" class="number-input" type="number" min="0" value="${escapeAttribute(cfg.signature_points||150)}"></div><div class="admin-field"><label>Privé · pts</label><input id="loyalty59Prive" class="number-input" type="number" min="0" value="${escapeAttribute(cfg.prive_points||350)}"></div><div class="admin-field"><label>${en?"Story discount %":"Descuento por historia %"}</label><input id="loyalty59StoryDiscount" class="number-input" type="number" min="0" max="100" step="1" value="${escapeAttribute(cfg.story_discount_percent||20)}"></div></div><button class="btn" type="button" data-loyalty59-action="admin-save-settings">${en?"Save settings":"Guardar configuración"}</button></section>
    <section class="admin-card"><div class="loyalty59-admin-toolbar"><div><h3>${en?"Customers & points":"Clientes y puntos"}</h3><small>${alp59ClubState.total} ${en?"profiles":"perfiles"}</small></div><div class="loyalty59-admin-search"><input id="loyalty59AdminSearch" class="text-input" value="${escapeAttribute(alp59ClubState.search)}" placeholder="${en?"Search customer…":"Buscar cliente…"}"><button class="btn secondary" type="button" data-loyalty59-action="admin-search">${en?"Search":"Buscar"}</button></div></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>${en?"Customer":"Cliente"}</th><th>${en?"Tier":"Nivel"}</th><th>${en?"Points":"Puntos"}</th><th>${en?"Delivered":"Entregados"}</th><th>${en?"Eligible spend":"Gasto elegible"}</th><th>${en?"Benefits":"Beneficios"}</th><th></th></tr></thead><tbody>${alp59ClubState.rows.length?alp59ClubState.rows.map(row=>`<tr><td><strong>${escapeHtml(row.full_name||"Cliente")}</strong><small>${escapeHtml(row.phone||row.email||"")}</small></td><td>${escapeHtml(loyaltyV2TierLabel(row.tier))}</td><td><strong>${escapeHtml(String(loyaltyV2Num(row.points)))}</strong>${loyaltyV2Num(row.adjustment_points)?`<small>${en?"adjustments":"ajustes"}: ${loyaltyV2Num(row.adjustment_points)>0?"+":""}${loyaltyV2Num(row.adjustment_points)}</small>`:""}</td><td>${loyaltyV2Num(row.delivered_orders)}</td><td>${loyaltyV2Money(row.eligible_spend)}</td><td>${loyaltyV2Num(row.pending_benefits)} ${en?"pending":"pend."} · ${loyaltyV2Num(row.approved_benefits)} ${en?"approved":"aprob."}</td><td><button class="btn small secondary" type="button" data-loyalty59-action="admin-adjust-open" data-customer-id="${escapeAttribute(row.customer_id)}" data-customer-name="${escapeAttribute(row.full_name||"Cliente")}">${en?"Adjust":"Ajustar"}</button></td></tr>`).join(""):`<tr><td colspan="7">${en?"No customers found.":"No encontramos clientes."}</td></tr>`}</tbody></table></div></section>
    <section class="admin-card"><div class="loyalty59-admin-toolbar"><div><h3>${en?"Instagram story benefits":"Beneficios por historias"}</h3><small>${en?"Verify the tag before approving.":"Verificá la etiqueta antes de aprobar."}</small></div><select id="loyalty59BenefitFilter" class="select-input"><option value="all" ${alp59ClubState.benefitStatus==="all"?"selected":""}>${en?"All":"Todos"}</option>${["pending","approved","redeemed","rejected"].map(st=>`<option value="${st}" ${alp59ClubState.benefitStatus===st?"selected":""}>${escapeHtml(alp59BenefitStatusLabel(st))}</option>`).join("")}</select></div><div class="loyalty59-benefit-admin-list">${alp59ClubState.benefits.length?alp59ClubState.benefits.map(b=>`<article class="loyalty59-benefit-admin"><div><span class="loyalty59-pill">${escapeHtml(alp59BenefitStatusLabel(b.status))}</span><strong>${escapeHtml(b.customer_name||"Cliente")}</strong><small>${escapeHtml(b.order_code||"")} · ${escapeHtml(loyaltyV2Date(b.requested_at))}</small><p><b>Instagram:</b> ${escapeHtml(b.instagram_handle||"—")}</p>${b.proof_note?`<p>${escapeHtml(b.proof_note)}</p>`:""}${b.benefit_code?`<p><b>${en?"Code":"Código"}:</b> ${escapeHtml(b.benefit_code)}</p>`:""}</div><div class="loyalty59-admin-actions">${b.status!=="approved"&&b.status!=="redeemed"?`<button class="btn small" type="button" data-loyalty59-action="admin-benefit" data-id="${b.id}" data-status="approved">${en?"Approve":"Aprobar"}</button>`:""}${b.status==="approved"?`<button class="btn small" type="button" data-loyalty59-action="admin-benefit" data-id="${b.id}" data-status="redeemed">${en?"Mark used":"Marcar usado"}</button>`:""}${b.status!=="rejected"&&b.status!=="redeemed"?`<button class="btn small danger" type="button" data-loyalty59-action="admin-benefit" data-id="${b.id}" data-status="rejected">${en?"Reject":"Rechazar"}</button>`:""}${b.status==="rejected"?`<button class="btn small secondary" type="button" data-loyalty59-action="admin-benefit" data-id="${b.id}" data-status="pending">${en?"Return to pending":"Volver a pendiente"}</button>`:""}</div></article>`).join(""):`<div class="empty-state"><h3>${en?"No benefit requests in this status.":"No hay solicitudes en este estado."}</h3></div>`}</div></section>
  </div>`;
}

function alp59OpenAdjustment(customerId, name) { openModal(loyaltyV2Text("Ajustar Puntos Aroma","Adjust Aroma Points"),`<div class="loyalty59-modal"><p><strong>${escapeHtml(name||"Cliente")}</strong></p><div class="admin-field"><label>${loyaltyV2Text("Puntos (+ suma / - resta)","Points (+ add / - subtract)")}</label><input id="loyalty59AdjustPoints" class="number-input" type="number" step="1"></div><div class="admin-field"><label>${loyaltyV2Text("Motivo","Reason")}</label><input id="loyalty59AdjustReason" class="text-input" maxlength="240" placeholder="${loyaltyV2Text("Ej.: atención comercial","Example: customer care")}"></div><button class="btn" type="button" data-loyalty59-action="admin-adjust-submit" data-customer-id="${escapeAttribute(customerId)}">${loyaltyV2Text("Guardar ajuste","Save adjustment")}</button></div>`); }

async function alp59SaveSettings() {
  const payload={ p_program_enabled:document.getElementById("loyalty59Enabled")?.value!=="false", p_pesos_per_point:loyaltyV2Num(document.getElementById("loyalty59Rate")?.value), p_signature_points:Math.round(loyaltyV2Num(document.getElementById("loyalty59Signature")?.value)), p_prive_points:Math.round(loyaltyV2Num(document.getElementById("loyalty59Prive")?.value)), p_story_discount_percent:loyaltyV2Num(document.getElementById("loyalty59StoryDiscount")?.value) };
  const res=await supabaseClient.rpc("admin_update_loyalty_settings_v2",payload); if(res.error||!res.data?.ok) throw new Error(res.error?.message||res.data?.error||"save_failed"); alp59ClubState.loaded=false; await alp59LoadClub({force:true}); adminMessage(loyaltyV2Text("Club actualizado.","Club updated."),"ok");
}
async function alp59AdjustPoints(customerId) { const points=Math.round(loyaltyV2Num(document.getElementById("loyalty59AdjustPoints")?.value)); const reason=String(document.getElementById("loyalty59AdjustReason")?.value||"").trim(); if(!points) return; const res=await supabaseClient.rpc("admin_adjust_loyalty_points_v2",{p_customer_id:Number(customerId),p_points:points,p_reason:reason||"Ajuste manual"}); if(res.error||!res.data?.ok) throw new Error(res.error?.message||res.data?.error||"adjust_failed"); closeModal(); alp59ClubState.loaded=false; await alp59LoadClub({force:true}); adminMessage(loyaltyV2Text("Puntos ajustados.","Points adjusted."),"ok"); }
async function alp59UpdateBenefit(id,status) { const res=await supabaseClient.rpc("admin_update_loyalty_benefit_v2",{p_benefit_id:Number(id),p_status:status,p_admin_note:null}); if(res.error||!res.data?.ok) throw new Error(res.error?.message||res.data?.error||"benefit_failed"); alp59ClubState.loaded=false; await alp59LoadClub({force:true}); adminMessage(loyaltyV2Text("Beneficio actualizado.","Benefit updated."),"ok"); }

if (!window.__alp59ClubListeners) {
  window.__alp59ClubListeners=true;
  document.addEventListener("submit",event=>{ if(event.target?.id!=="loyalty59Form") return; event.preventDefault(); loyaltyV2Lookup(document.getElementById("loyalty59Code")?.value,document.getElementById("loyalty59Contact")?.value); });
  document.addEventListener("change",event=>{ if(event.target?.id==="loyalty59BenefitFilter"){ alp59ClubState.benefitStatus=event.target.value||"all"; alp59ClubState.loaded=false; alp59LoadClub({force:true}); } });
  document.addEventListener("click",async event=>{ const btn=event.target.closest("[data-loyalty59-action]"); if(!btn) return; const action=btn.dataset.loyalty59Action;
    try {
      if(action==="recent") { const c=btn.dataset.orderCode||"", ct=btn.dataset.contact||""; loyalty59State.orderCode=c; loyalty59State.contact=ct; await loyaltyV2Lookup(c,ct); }
      else if(action==="story-request") loyaltyV2OpenStoryRequest();
      else if(action==="submit-story") await loyaltyV2SubmitStory();
      else if(action==="use-benefit") loyaltyV2UseBenefit(btn.dataset.code||"",btn.dataset.discount||20);
      else if(action==="admin-refresh") { alp59ClubState.loaded=false; await alp59LoadClub({force:true}); }
      else if(action==="admin-search") { alp59ClubState.search=String(document.getElementById("loyalty59AdminSearch")?.value||"").trim(); alp59ClubState.page=1; alp59ClubState.loaded=false; await alp59LoadClub({force:true}); }
      else if(action==="admin-save-settings") await alp59SaveSettings();
      else if(action==="admin-adjust-open") alp59OpenAdjustment(btn.dataset.customerId,btn.dataset.customerName);
      else if(action==="admin-adjust-submit") await alp59AdjustPoints(btn.dataset.customerId);
      else if(action==="admin-benefit") await alp59UpdateBenefit(btn.dataset.id,btn.dataset.status);
    } catch(error) { console.error("PASO59 action:",error); if(document.body?.dataset.entry==="admin") adminMessage(error?.message||String(error),"error"); else toast(error?.message||loyaltyV2Text("Ocurrió un error.","An error occurred."),"error"); }
  });
}

if (typeof setRoute === "function" && !window.__alp59SetRouteWrapped) {
  window.__alp59SetRouteWrapped=true; const base=setRoute; setRoute=function(route,payload={}) { if(route!=="club"){ const url=new URL(location.href); if(url.searchParams.has("club")){url.searchParams.delete("club");history.replaceState({},"",url.toString());} } return base(route,payload); };
}
