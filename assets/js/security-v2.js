"use strict";

// AromaLParfum — PASO 65 — Security Hardening V2
// Objetivos:
// - El navegador deja de ser la autoridad para habilitar Admin.
// - URLs externas se limitan a HTTP/HTTPS.
// - El panel puede mostrar el estado de endurecimiento sin leer tablas sensibles.
// - La verificación se cachea brevemente para no sumar llamadas repetidas.

const ALP65_ADMIN_VERIFY_TTL_MS = 60 * 1000;

const alp65SecurityState = {
  authorized: false,
  loaded: false,
  checkedAt: 0,
  userId: "",
  status: null,
  error: "",
};

function alp65SecurityText(es, en)
{
  return state?.language === "en" ? en : es;
}

function alp65SafeExternalUrl(value)
{
  const raw = String(value || "").trim();

  if (!raw)
  {
    return "";
  }

  try
  {
    const url = new URL(raw);

    if (url.protocol !== "https:" && url.protocol !== "http:")
    {
      return "";
    }

    // Nunca aceptamos credenciales embebidas en enlaces administrables.
    if (url.username || url.password)
    {
      return "";
    }

    return url.toString();
  }
  catch (_error)
  {
    return "";
  }
}

function alp65ClearAdminVerification()
{
  alp65SecurityState.authorized = false;
  alp65SecurityState.loaded = false;
  alp65SecurityState.checkedAt = 0;
  alp65SecurityState.userId = "";
  alp65SecurityState.status = null;
  alp65SecurityState.error = "";
}

function alp65AdminVerificationFresh(user)
{
  const userId = String(user?.id || "");

  return Boolean(
    userId &&
    alp65SecurityState.loaded &&
    alp65SecurityState.userId === userId &&
    Date.now() - alp65SecurityState.checkedAt < ALP65_ADMIN_VERIFY_TTL_MS
  );
}

async function alp65VerifyAdminAccess(user, options = {})
{
  const force = Boolean(options?.force);
  const userId = String(user?.id || "");

  if (!userId)
  {
    alp65ClearAdminVerification();
    return false;
  }

  if (!force && alp65AdminVerificationFresh(user))
  {
    return alp65SecurityState.authorized === true;
  }

  const result = await supabaseClient.rpc("admin_security_status_v2");

  if (result.error)
  {
    console.warn("Admin server verification failed:", result.error.message);

    alp65SecurityState.authorized = false;
    alp65SecurityState.loaded = true;
    alp65SecurityState.checkedAt = Date.now();
    alp65SecurityState.userId = userId;
    alp65SecurityState.status = null;
    alp65SecurityState.error = "server_verification_failed";

    return false;
  }

  const data = result.data || {};
  const authorized = data?.ok === true && data?.authorized === true;

  alp65SecurityState.authorized = authorized;
  alp65SecurityState.loaded = true;
  alp65SecurityState.checkedAt = Date.now();
  alp65SecurityState.userId = userId;
  alp65SecurityState.status = data;
  alp65SecurityState.error = authorized ? "" : String(data?.error || "not_authorized");

  return authorized;
}

function alp65SecurityBoolean(value)
{
  return value === true
    ? `<span class="alp65-check ok" aria-label="OK">✓</span>`
    : `<span class="alp65-check bad" aria-label="Revisar">!</span>`;
}

function alp65RenderSecurityV2()
{
  const en = state?.language === "en";
  const data = alp65SecurityState.status || {};
  const directClosed = data?.sensitive_direct_access_closed === true;
  const rlsEnabled = data?.sensitive_rls_enabled === true;
  const serverAuthorized = alp65SecurityState.authorized === true;
  const sessionScoped = document.body?.dataset?.entry === "admin";

  return `
    <section class="alp65-security-panel">
      <div class="section-head">
        <div>
          <p class="eyebrow">Security V2</p>
          <h2>${en ? "Security status" : "Estado de seguridad"}</h2>
          <p class="section-subtitle">
            ${en
              ? "Checks that protect the administration area and sensitive CRM/Club data."
              : "Controles que protegen el panel administrativo y los datos sensibles de CRM/Club."
            }
          </p>
        </div>

        <button class="btn outline" type="button" data-action="admin-security-refresh">
          ${en ? "Verify again" : "Verificar de nuevo"}
        </button>
      </div>

      <div class="alp65-security-grid">
        <article class="alp65-security-card">
          ${alp65SecurityBoolean(serverAuthorized)}
          <div>
            <strong>${en ? "Server-side Admin check" : "Admin verificado en servidor"}</strong>
            <p>${en
              ? "Supabase RPC is the authority before the panel is enabled."
              : "Supabase RPC es la autoridad antes de habilitar el panel."
            }</p>
          </div>
        </article>

        <article class="alp65-security-card">
          ${alp65SecurityBoolean(rlsEnabled)}
          <div>
            <strong>RLS</strong>
            <p>${en
              ? "Sensitive Club, CRM, Reviews and Analytics tables report RLS enabled."
              : "Las tablas sensibles de Club, CRM, Reseñas y Analytics reportan RLS activo."
            }</p>
          </div>
        </article>

        <article class="alp65-security-card">
          ${alp65SecurityBoolean(directClosed)}
          <div>
            <strong>${en ? "Direct table access closed" : "Acceso directo cerrado"}</strong>
            <p>${en
              ? "Club and CRM mutations must pass through controlled RPC functions."
              : "Las operaciones de Club y CRM deben pasar por RPC controladas."
            }</p>
          </div>
        </article>

        <article class="alp65-security-card">
          ${alp65SecurityBoolean(sessionScoped)}
          <div>
            <strong>${en ? "Admin session scoped to the tab" : "Sesión Admin limitada a la pestaña"}</strong>
            <p>${en
              ? "The Admin auth session is stored in sessionStorage instead of persistent localStorage."
              : "La sesión de Admin se guarda en sessionStorage y no queda persistida en localStorage."
            }</p>
          </div>
        </article>
      </div>

      <div class="alp65-security-note">
        <strong>${en ? "Dependency pinning" : "Dependencia fijada"}</strong>
        <span>@supabase/supabase-js 2.116.0</span>
      </div>

      ${alp65SecurityState.error
        ? `<div class="admin-message error">${escapeHtml(en
            ? "Server verification is not available. Run SETUP_PASO65_SECURITY_HARDENING.sql before using Admin."
            : "La verificación del servidor no está disponible. Ejecutá SETUP_PASO65_SECURITY_HARDENING.sql antes de usar Admin.")}</div>`
        : ""
      }
    </section>
  `;
}

async function alp65RefreshSecurityPanel()
{
  const session = await getCurrentSession();
  const user = session?.user || state?.admin?.currentUser || null;
  const authorized = await alp65VerifyAdminAccess(user, { force: true });

  if (!authorized)
  {
    await supabaseClient.auth.signOut();
    state.admin.currentUser = null;
    alp65ClearAdminVerification();

    toast(
      alp65SecurityText(
        "La sesión no superó la verificación del servidor.",
        "The session did not pass server verification."
      ),
      "error"
    );

    renderCurrentRoute();
    return;
  }

  if (typeof refreshAdminTab === "function")
  {
    refreshAdminTab();
  }

  if (typeof adminMessage === "function")
  {
    adminMessage(
      alp65SecurityText("Seguridad verificada.", "Security verified."),
      "ok"
    );
  }
}
