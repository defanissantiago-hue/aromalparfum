"use strict";

// AromaLParfum Frontend V2 — PASO 60
// Reactivación CRM V2: consentimiento explícito + cola manual + trazabilidad.

const crm60State = {
  loaded: false,
  loading: false,
  error: "",
  search: "",
  queueStatus: "open",
  settings: {},
  summary: {},
  customers: [],
  queue: [],
  focusCustomerId: null,
};
window.crm60State = crm60State;

function crm60Text(es,en){ return state.language === "en" ? en : es; }
function crm60Num(v,f=0){ const n=Number(v); return Number.isFinite(n)?n:f; }
function crm60Date(v){ if(!v)return "—"; const d=new Date(v); if(Number.isNaN(d.getTime()))return "—"; return new Intl.DateTimeFormat(state.language === "en"?"en-US":"es-AR",{dateStyle:"medium"}).format(d); }
function crm60DateTime(v){ if(!v)return "—"; const d=new Date(v); if(Number.isNaN(d.getTime()))return "—"; return new Intl.DateTimeFormat(state.language === "en"?"en-US":"es-AR",{dateStyle:"medium",timeStyle:"short"}).format(d); }
function crm60Money(v){ return money(crm60Num(v)); }
function crm60Days(v){ const n=crm60Num(v,-1); return n<0?"—":`${n} ${crm60Text("días","days")}`; }
function crm60NormalizeWhatsApp(phone){ if(typeof alp47NormalizeArgentinaWhatsApp === "function") return alp47NormalizeArgentinaWhatsApp(phone); let d=String(phone||"").replace(/\D/g,"").replace(/^00/,"").replace(/^0+/,""); if(d.startsWith("54"))return d; if(d.length===10)return `549${d}`; return d; }

function crm60SegmentLabel(segment){
  const map={vip_dormant:crm60Text("VIP para reactivar","VIP to reactivate"),first_repurchase:crm60Text("Primera recompra","First repurchase"),dormant:crm60Text("Cliente inactivo","Dormant customer"),active:crm60Text("Activo","Active")};
  return map[String(segment||"")]||segment||"—";
}
function crm60ConsentLabel(status){
  const map={opted_in:crm60Text("Autorizó","Opted in"),opted_out:crm60Text("No autoriza","Opted out"),unknown:crm60Text("Sin registrar","Unknown")};
  return map[String(status||"unknown")]||map.unknown;
}
function crm60StatusLabel(status){
  const map={pending:crm60Text("Pendiente","Pending"),contacted:crm60Text("Contactado","Contacted"),snoozed:crm60Text("Pospuesto","Snoozed"),done:crm60Text("Cerrado","Done"),cancelled:crm60Text("Cancelado","Cancelled")};
  return map[String(status||"")]||status||"—";
}
function crm60ReasonLabel(reason){ return crm60SegmentLabel(reason)===(reason||"")?({repurchase:crm60Text("Recompra","Repurchase"),club:crm60Text("Club","Club"),manual:crm60Text("Manual","Manual")}[reason]||reason):crm60SegmentLabel(reason); }

async function alp60LoadReactivation({force=false}={}){
  if(crm60State.loading)return;
  if(crm60State.loaded&&!force){ alp60RenderHost(); return; }
  crm60State.loading=true; crm60State.error=""; alp60RenderHost();
  try{
    const res=await supabaseClient.rpc("admin_get_crm_reactivation_v2",{p_search:crm60State.search||"",p_queue_status:crm60State.queueStatus||"open"});
    if(res.error)throw res.error;
    const d=res.data||{}; if(!d.ok)throw new Error(d.error||"crm_load_failed");
    crm60State.settings=d.settings||{}; crm60State.summary=d.summary||{}; crm60State.customers=Array.isArray(d.customers)?d.customers:[]; crm60State.queue=Array.isArray(d.queue)?d.queue:[]; crm60State.loaded=true;
  }catch(e){ console.error("PASO60 CRM:",e); crm60State.error=e?.message||String(e); }
  finally{ crm60State.loading=false; alp60RenderHost(); }
}
function alp60EnsureLoaded(){ if(state.admin?.tab!=="reactivation")return; if(!crm60State.loaded&&!crm60State.loading) alp60LoadReactivation(); }
function alp60RenderHost(){ if(state.admin?.tab!=="reactivation")return; const h=document.getElementById("adminTabContent"); if(h)h.innerHTML=renderAdminReactivationV2(); }

function crm60Kpi(label,value,note){ return `<article class="crm60-kpi"><span>${escapeHtml(label)}</span><strong>${escapeHtml(String(value))}</strong><small>${escapeHtml(note||"")}</small></article>`; }

function renderAdminReactivationV2(){
  const en=state.language==="en";
  if(crm60State.loading&&!crm60State.loaded)return `<div class="crm60-loading"><div class="loader"></div><p>${en?"Loading secure CRM…":"Cargando CRM seguro…"}</p></div>`;
  if(crm60State.error)return `<div class="admin-message error">${escapeHtml(crm60State.error)}</div><button class="btn" type="button" data-crm60-action="refresh">${en?"Retry":"Reintentar"}</button>`;
  if(!crm60State.loaded)return `<div class="crm60-loading"><p>${en?"Preparing reactivation CRM…":"Preparando Reactivación CRM…"}</p></div>`;
  const s=crm60State.summary||{}, cfg=crm60State.settings||{};
  const actionable=crm60State.customers.filter(c=>c.segment!=="active");
  return `<section class="crm60-admin">
    <div class="crm60-head"><div><p class="eyebrow">CRM · CONSENTIMIENTO · RECOMPRA</p><h2>${en?"Customer reactivation":"Reactivación de clientes"}</h2><p class="section-subtitle">${en?"Turn real purchase history into a manual follow-up queue without sending unsolicited messages.":"Convertí compras reales en una cola manual de seguimiento sin enviar mensajes no solicitados."}</p></div><div class="crm60-head-actions"><button class="btn secondary" type="button" data-crm60-action="refresh">${en?"Refresh":"Actualizar"}</button><button class="btn" type="button" data-crm60-action="sync">${en?"Build safe queue":"Generar cola segura"}</button></div></div>
    <div class="crm60-guard"><strong>${en?"Consent rule":"Regla de consentimiento"}</strong><p>${en?"Unknown is NOT consent. WhatsApp opens only for customers explicitly marked as opted in. Opting out automatically cancels pending WhatsApp follow-ups.":"“Sin registrar” NO es consentimiento. WhatsApp solo se habilita para clientes marcados explícitamente como Autorizó. Si se registra No autoriza, los seguimientos pendientes de WhatsApp se cancelan automáticamente."}</p></div>
    <div class="crm60-kpis">${crm60Kpi(en?"Buyers":"Compradores",formatInteger(crm60Num(s.buyers)),en?"paid + delivered":"pagados + entregados")}${crm60Kpi(en?"Reactivable":"Reactivables",formatInteger(crm60Num(s.reactivable)),en?"based on inactivity":"según inactividad")}${crm60Kpi(en?"WhatsApp opt-in":"WA autorizados",formatInteger(crm60Num(s.whatsapp_opted_in)),en?"explicit consent":"consentimiento explícito")}${crm60Kpi(en?"Due now":"Para contactar",formatInteger(crm60Num(s.due_now)),en?"manual queue":"cola manual")}${crm60Kpi(en?"Contacted 30d":"Contactados 30d",formatInteger(crm60Num(s.contacted_30d)),en?"tracked follow-ups":"seguimientos registrados")}</div>
    <section class="admin-card crm60-settings"><div><h3>${en?"Reactivation rules":"Reglas de reactivación"}</h3><p>${en?"These rules only generate suggestions. They never send a message.":"Estas reglas solo generan sugerencias. Nunca envían un mensaje."}</p></div><div class="crm60-settings-grid"><label>${en?"First repurchase after":"Primera recompra después de"}<input id="crm60FirstDays" type="number" min="1" value="${escapeAttribute(cfg.first_repurchase_days||21)}"><small>${en?"days":"días"}</small></label><label>${en?"Dormant after":"Inactivo después de"}<input id="crm60DormantDays" type="number" min="1" value="${escapeAttribute(cfg.reactivation_days||45)}"><small>${en?"days":"días"}</small></label><label>${en?"VIP dormant after":"VIP inactivo después de"}<input id="crm60VipDays" type="number" min="1" value="${escapeAttribute(cfg.vip_reactivation_days||30)}"><small>${en?"days":"días"}</small></label><label>${en?"VIP spend from":"Gasto VIP desde"}<input id="crm60VipSpend" type="number" min="0" step="1000" value="${escapeAttribute(cfg.vip_spend_threshold||150000)}"><small>ARS</small></label><label>${en?"Max generated per sync":"Máx. por generación"}<input id="crm60QueueLimit" type="number" min="1" max="500" value="${escapeAttribute(cfg.queue_limit||50)}"></label></div><button class="btn secondary" type="button" data-crm60-action="save-settings">${en?"Save rules":"Guardar reglas"}</button></section>
    <section class="admin-card"><div class="crm60-toolbar"><div><h3>${en?"Customers to reactivate":"Clientes para reactivar"}</h3><small>${actionable.length} ${en?"suggestions in current result":"sugerencias en el resultado actual"}</small></div><div class="crm60-search"><input id="crm60Search" type="search" value="${escapeAttribute(crm60State.search)}" placeholder="${en?"Name, phone or email":"Nombre, teléfono o email"}"><button class="btn secondary" type="button" data-crm60-action="search">${en?"Search":"Buscar"}</button></div></div>
      <div class="admin-table-wrap"><table class="admin-table crm60-table"><thead><tr><th>${en?"Customer":"Cliente"}</th><th>${en?"Segment":"Segmento"}</th><th>${en?"Purchases":"Compras"}</th><th>${en?"Last purchase":"Última compra"}</th><th>${en?"WhatsApp consent":"Consentimiento WA"}</th><th>${en?"Follow-up":"Seguimiento"}</th></tr></thead><tbody>${crm60State.customers.length?crm60State.customers.map(crm60CustomerRow).join(""):`<tr><td colspan="6">${en?"No customers found.":"No encontramos clientes."}</td></tr>`}</tbody></table></div>
    </section>
    <section class="admin-card"><div class="crm60-toolbar"><div><h3>${en?"Follow-up queue":"Cola de seguimiento"}</h3><small>${en?"Manual only — WhatsApp never opens without opt-in.":"Solo manual — WhatsApp nunca se habilita sin autorización."}</small></div><select id="crm60QueueStatus"><option value="open" ${crm60State.queueStatus==="open"?"selected":""}>${en?"Open":"Abiertos"}</option>${["pending","snoozed","contacted","done","cancelled","all"].map(v=>`<option value="${v}" ${crm60State.queueStatus===v?"selected":""}>${escapeHtml(v==="all"?(en?"All":"Todos"):crm60StatusLabel(v))}</option>`).join("")}</select></div><div class="crm60-queue">${crm60State.queue.length?crm60State.queue.map(crm60QueueCard).join(""):`<div class="empty-state"><h3>${en?"No follow-ups in this view.":"No hay seguimientos en esta vista."}</h3></div>`}</div></section>
  </section>`;
}

function crm60CustomerRow(c){
  const en=state.language==="en", seg=String(c.segment||"active"), consent=String(c.whatsapp_status||"unknown");
  return `<tr class="${crm60State.focusCustomerId===Number(c.customer_id)?"crm60-focus":""}"><td><strong>${escapeHtml(c.full_name||"Cliente")}</strong><small>${escapeHtml(c.phone||c.email||"—")}</small></td><td><span class="crm60-pill is-${escapeAttribute(seg)}">${escapeHtml(crm60SegmentLabel(seg))}</span>${c.inactive_days!=null?`<small>${escapeHtml(crm60Days(c.inactive_days))} ${en?"inactive":"sin compra"}</small>`:""}</td><td><strong>${formatInteger(crm60Num(c.delivered_orders))}</strong><small>${crm60Money(c.eligible_spend)}</small></td><td>${escapeHtml(crm60Date(c.last_purchase_at))}${c.last_contacted_at?`<small>${en?"Last contact":"Últ. contacto"}: ${escapeHtml(crm60Date(c.last_contacted_at))}</small>`:""}</td><td><span class="crm60-consent is-${escapeAttribute(consent)}">${escapeHtml(crm60ConsentLabel(consent))}</span><button class="btn small secondary" type="button" data-crm60-action="consent" data-customer-id="${c.customer_id}">${en?"Edit":"Editar"}</button></td><td>${crm60Num(c.open_followups)?`<span class="crm60-open-count">${crm60Num(c.open_followups)} ${en?"open":"abierto(s)"}</span>`:""}<button class="btn small ${consent==="opted_in"?"":"secondary"}" type="button" data-crm60-action="create" data-customer-id="${c.customer_id}" ${consent!=="opted_in"?"disabled title=\"Requiere consentimiento WhatsApp\"":""}>${en?"Create":"Crear"}</button></td></tr>`;
}

function crm60QueueCard(q){
  const en=state.language==="en", consent=String(q.whatsapp_status||"unknown"), can=consent==="opted_in"&&!!crm60NormalizeWhatsApp(q.phone_normalized||q.phone), due=new Date(q.due_at||0).getTime()<=Date.now();
  return `<article class="crm60-queue-card ${due&&["pending","snoozed"].includes(q.status)?"is-due":""}"><div class="crm60-queue-main"><div class="crm60-queue-top"><span class="crm60-pill is-${escapeAttribute(q.reason)}">${escapeHtml(crm60ReasonLabel(q.reason))}</span><span class="crm60-status is-${escapeAttribute(q.status)}">${escapeHtml(crm60StatusLabel(q.status))}</span></div><h4>${escapeHtml(q.customer_name||"Cliente")}</h4><p>${escapeHtml(crm60MessageFor(q))}</p><div class="crm60-meta"><span>${en?"Due":"Fecha"}: ${escapeHtml(crm60DateTime(q.due_at))}</span>${q.product_name?`<span>${escapeHtml(q.product_name)}</span>`:""}<span>${en?"Consent":"Consentimiento"}: ${escapeHtml(crm60ConsentLabel(consent))}</span></div></div><div class="crm60-queue-actions">${["pending","snoozed"].includes(q.status)?`<button class="btn small" type="button" data-crm60-action="whatsapp" data-id="${q.id}" ${can?"":"disabled"}>WhatsApp</button><button class="btn small secondary" type="button" data-crm60-action="status" data-id="${q.id}" data-status="contacted" ${can?"":"disabled"}>${en?"Mark contacted":"Marcar contactado"}</button><button class="btn small secondary" type="button" data-crm60-action="snooze" data-id="${q.id}">${en?"Snooze 7d":"Posponer 7d"}</button>`:""}${q.status!=="done"&&q.status!=="cancelled"?`<button class="btn small secondary" type="button" data-crm60-action="status" data-id="${q.id}" data-status="done">${en?"Close":"Cerrar"}</button>`:""}</div></article>`;
}

function crm60MessageFor(q){
  const first=String(q.customer_name||"Cliente").trim().split(/\s+/)[0]||"Cliente";
  const product=q.product_name?` ${q.product_name}`:"";
  const es={
    vip_dormant:`Hola ${first}, ¿cómo estás? Somos AromaLParfum. Hace un tiempo que no nos vemos y queríamos acercarte una atención personalizada. Si estás buscando renovar tu perfume o descubrir algo nuevo, puedo ayudarte a elegir una opción según tus gustos.`,
    first_repurchase:`Hola ${first}, ¿cómo estás? Somos AromaLParfum. Queríamos saber cómo te fue con tu compra. Si te gustó y estás pensando en tu próxima fragancia, puedo ayudarte a encontrar una opción que vaya por la misma línea o algo diferente.`,
    dormant:`Hola ${first}, ¿cómo estás? Somos AromaLParfum. Te escribimos porque hace un tiempo compraste con nosotros. Si querés renovar tu fragancia o ver novedades, puedo ayudarte personalmente.`,
    repurchase:`Hola ${first}, ¿cómo estás? Somos AromaLParfum. Queríamos hacer un seguimiento de${product||" tu última fragancia"}. Si necesitás reposición o querés una alternativa parecida, puedo ayudarte.`,
    club:`Hola ${first}, ¿cómo estás? Somos AromaLParfum. Te escribimos por tu Club AromaLParfum. Si querés, te ayudo a revisar tus beneficios y elegir tu próxima fragancia.`,
    manual:`Hola ${first}, ¿cómo estás? Somos AromaLParfum. Te escribimos para hacer un seguimiento de tu experiencia y ayudarte con cualquier consulta sobre fragancias.`
  };
  const en={vip_dormant:`Hi ${first}! This is AromaLParfum. It's been a while since your last purchase. If you'd like to refresh your fragrance or discover something new, I can help you personally.`,first_repurchase:`Hi ${first}! This is AromaLParfum. We wanted to see how your purchase went. If you're thinking about your next fragrance, I can help you find something similar or completely different.`,dormant:`Hi ${first}! This is AromaLParfum. It's been a while since your last order. If you'd like to refresh your fragrance or see what's new, I can help you personally.`,repurchase:`Hi ${first}! This is AromaLParfum. We wanted to follow up on${product||" your last fragrance"}. If you need a replacement or a similar option, I can help.`,club:`Hi ${first}! This is AromaLParfum. We're reaching out about your AromaLParfum Club benefits. I can help you review them and choose your next fragrance.`,manual:`Hi ${first}! This is AromaLParfum. We're following up on your experience and can help with any fragrance questions.`};
  return (state.language==="en"?en:es)[q.template_key||q.reason]||(state.language==="en"?en.manual:es.manual);
}

function crm60FindCustomer(id){ return crm60State.customers.find(c=>Number(c.customer_id)===Number(id)); }
function crm60FindQueue(id){ return crm60State.queue.find(q=>Number(q.id)===Number(id)); }

function alp60OpenConsent(customerId){
  const c=crm60FindCustomer(customerId); if(!c)return;
  const en=state.language==="en";
  openModal(en?"Contact permission":"Consentimiento de contacto",`<div class="crm60-modal"><p><strong>${escapeHtml(c.full_name||"Cliente")}</strong></p><div class="crm60-warning">${en?"Only select Opted in if the customer actually gave permission to receive commercial WhatsApp messages.":"Marcá Autorizó únicamente si el cliente realmente dio permiso para recibir mensajes comerciales por WhatsApp."}</div><label>${en?"WhatsApp":"WhatsApp"}<select id="crm60ConsentWa"><option value="unknown" ${c.whatsapp_status==="unknown"?"selected":""}>${en?"Unknown":"Sin registrar"}</option><option value="opted_in" ${c.whatsapp_status==="opted_in"?"selected":""}>${en?"Opted in":"Autorizó"}</option><option value="opted_out" ${c.whatsapp_status==="opted_out"?"selected":""}>${en?"Opted out":"No autoriza"}</option></select></label><label>${en?"Evidence / source":"Origen del consentimiento"}<select id="crm60ConsentSource"><option value="whatsapp_cliente">${en?"Customer message / WhatsApp":"Mensaje del cliente / WhatsApp"}</option><option value="checkout">Checkout</option><option value="presencial">${en?"In person":"Presencial"}</option><option value="otro">${en?"Other":"Otro"}</option></select></label><label>${en?"Internal note":"Nota interna"}<textarea id="crm60ConsentNote" maxlength="600" placeholder="${en?"Example: customer explicitly asked to receive offers":"Ej.: el cliente pidió recibir novedades explícitamente"}"></textarea></label><button class="btn" type="button" data-crm60-action="save-consent" data-customer-id="${c.customer_id}">${en?"Save permission":"Guardar consentimiento"}</button></div>`);
}

function alp60OpenCreate(customerId,productId=null){
  const c=crm60FindCustomer(customerId); if(!c)return;
  if(c.whatsapp_status!=="opted_in"){ alp60OpenConsent(customerId); return; }
  const en=state.language==="en"; const suggested=c.segment!=="active"?c.segment:"manual";
  openModal(en?"Create follow-up":"Crear seguimiento",`<div class="crm60-modal"><p><strong>${escapeHtml(c.full_name||"Cliente")}</strong></p><label>${en?"Reason":"Motivo"}<select id="crm60CreateReason">${["first_repurchase","dormant","vip_dormant","repurchase","club","manual"].map(r=>`<option value="${r}" ${r===suggested?"selected":""}>${escapeHtml(crm60ReasonLabel(r))}</option>`).join("")}</select></label><label>${en?"When":"Fecha"}<input id="crm60CreateDate" type="datetime-local" value="${crm60LocalDateValue(new Date())}"></label><label>${en?"Internal note":"Nota interna"}<textarea id="crm60CreateNote" maxlength="600"></textarea></label><input id="crm60CreateProduct" type="hidden" value="${escapeAttribute(productId||"")}"><button class="btn" type="button" data-crm60-action="create-submit" data-customer-id="${c.customer_id}">${en?"Add to queue":"Agregar a la cola"}</button></div>`);
}
function crm60LocalDateValue(d){ const pad=n=>String(n).padStart(2,"0"); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }

async function alp60SaveConsent(customerId){
  const res=await supabaseClient.rpc("admin_update_crm_consent_v2",{p_customer_id:Number(customerId),p_whatsapp_status:document.getElementById("crm60ConsentWa")?.value||"unknown",p_email_status:"unknown",p_source:document.getElementById("crm60ConsentSource")?.value||"manual",p_note:String(document.getElementById("crm60ConsentNote")?.value||"").trim()||null});
  if(res.error||!res.data?.ok)throw new Error(res.error?.message||res.data?.error||"consent_failed"); closeModal(); crm60State.loaded=false; await alp60LoadReactivation({force:true}); adminMessage(crm60Text("Consentimiento actualizado.","Consent updated."),"ok");
}
async function alp60CreateFollowup(customerId){
  const raw=document.getElementById("crm60CreateDate")?.value; const due=raw?new Date(raw).toISOString():new Date().toISOString(); const productRaw=document.getElementById("crm60CreateProduct")?.value;
  const res=await supabaseClient.rpc("admin_create_crm_followup_v2",{p_customer_id:Number(customerId),p_reason:document.getElementById("crm60CreateReason")?.value||"manual",p_product_id:productRaw?Number(productRaw):null,p_due_at:due,p_note:String(document.getElementById("crm60CreateNote")?.value||"").trim()||null});
  if(res.error||!res.data?.ok){ const code=res.data?.error; if(code==="whatsapp_not_opted_in")throw new Error(crm60Text("El cliente no tiene consentimiento de WhatsApp activo.","Customer has no active WhatsApp consent.")); throw new Error(res.error?.message||code||"followup_failed"); }
  closeModal(); crm60State.loaded=false; await alp60LoadReactivation({force:true}); adminMessage(crm60Text("Seguimiento agregado.","Follow-up added."),"ok");
}
async function alp60UpdateFollowup(id,status,snoozeDays=null){
  const res=await supabaseClient.rpc("admin_update_crm_followup_v2",{p_followup_id:Number(id),p_status:status,p_snooze_days:snoozeDays,p_note:null});
  if(res.error||!res.data?.ok)throw new Error(res.error?.message||res.data?.error||"update_failed"); crm60State.loaded=false; await alp60LoadReactivation({force:true}); adminMessage(crm60Text("Seguimiento actualizado.","Follow-up updated."),"ok");
}
async function alp60Sync(){
  const res=await supabaseClient.rpc("admin_sync_crm_reactivation_v2"); if(res.error||!res.data?.ok)throw new Error(res.error?.message||res.data?.error||"sync_failed"); crm60State.loaded=false; await alp60LoadReactivation({force:true}); adminMessage(crm60Text(`Cola actualizada: ${crm60Num(res.data.created)} seguimiento(s) nuevo(s).`,`Queue updated: ${crm60Num(res.data.created)} new follow-up(s).`),"ok");
}
async function alp60SaveSettings(){
  const payload={p_first_repurchase_days:Math.round(crm60Num(document.getElementById("crm60FirstDays")?.value,21)),p_reactivation_days:Math.round(crm60Num(document.getElementById("crm60DormantDays")?.value,45)),p_vip_reactivation_days:Math.round(crm60Num(document.getElementById("crm60VipDays")?.value,30)),p_vip_spend_threshold:crm60Num(document.getElementById("crm60VipSpend")?.value,150000),p_queue_limit:Math.round(crm60Num(document.getElementById("crm60QueueLimit")?.value,50))};
  const res=await supabaseClient.rpc("admin_update_crm_settings_v2",payload); if(res.error||!res.data?.ok)throw new Error(res.error?.message||res.data?.error||"settings_failed"); crm60State.loaded=false; await alp60LoadReactivation({force:true}); adminMessage(crm60Text("Reglas actualizadas.","Rules updated."),"ok");
}
function alp60OpenWhatsApp(id){
  const q=crm60FindQueue(id); if(!q)return; if(q.whatsapp_status!=="opted_in"){adminMessage(crm60Text("WhatsApp bloqueado: falta consentimiento explícito.","WhatsApp blocked: explicit consent is missing."),"error");return;} const number=crm60NormalizeWhatsApp(q.phone_normalized||q.phone); if(!number){adminMessage(crm60Text("El cliente no tiene un teléfono válido.","Customer has no valid phone number."),"error");return;} window.open(`https://wa.me/${number}?text=${encodeURIComponent(crm60MessageFor(q))}`,"_blank","noopener");
}

async function alp60OpenCustomerFollowup(customerId,productId=null){
  const old=typeof alp47CustomersState!=="undefined"?alp47CustomersState.customers.find(c=>Number(c.id)===Number(customerId)):null;
  crm60State.focusCustomerId=Number(customerId); crm60State.search=String(old?.phone||old?.email||old?.fullName||"").trim(); crm60State.loaded=false; state.admin.tab="reactivation"; refreshAdminTab(); await alp60LoadReactivation({force:true}); const c=crm60FindCustomer(customerId); if(!c){adminMessage(crm60Text("No encontramos el cliente en Reactivación.","Customer not found in Reactivation."),"error");return;} if(c.whatsapp_status!=="opted_in")alp60OpenConsent(customerId); else alp60OpenCreate(customerId,productId);
}
window.alp60OpenCustomerFollowup=alp60OpenCustomerFollowup;

if(!window.__crm60Listeners){
  window.__crm60Listeners=true;
  document.addEventListener("change",async e=>{ if(e.target?.id==="crm60QueueStatus"){crm60State.queueStatus=e.target.value||"open";crm60State.loaded=false;await alp60LoadReactivation({force:true});} });
  document.addEventListener("click",async e=>{ const b=e.target.closest("[data-crm60-action]"); if(!b)return; const a=b.dataset.crm60Action; try{
    if(a==="refresh"){crm60State.loaded=false;await alp60LoadReactivation({force:true});}
    else if(a==="search"){crm60State.search=String(document.getElementById("crm60Search")?.value||"").trim();crm60State.loaded=false;await alp60LoadReactivation({force:true});}
    else if(a==="sync")await alp60Sync();
    else if(a==="save-settings")await alp60SaveSettings();
    else if(a==="consent")alp60OpenConsent(b.dataset.customerId);
    else if(a==="save-consent")await alp60SaveConsent(b.dataset.customerId);
    else if(a==="create")alp60OpenCreate(b.dataset.customerId);
    else if(a==="create-submit")await alp60CreateFollowup(b.dataset.customerId);
    else if(a==="whatsapp")alp60OpenWhatsApp(b.dataset.id);
    else if(a==="status")await alp60UpdateFollowup(b.dataset.id,b.dataset.status);
    else if(a==="snooze")await alp60UpdateFollowup(b.dataset.id,"snoozed",7);
  }catch(err){console.error("PASO60 action:",err);adminMessage(err?.message||String(err),"error");} });
}

window.renderAdminReactivationV2=renderAdminReactivationV2;
window.alp60EnsureLoaded=alp60EnsureLoaded;
window.alp60LoadReactivation=alp60LoadReactivation;
