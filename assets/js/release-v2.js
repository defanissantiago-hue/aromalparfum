"use strict";

// AromaLParfum — PASO 67
// Release Audit & Stability Guard V2.
// No agrega telemetría ni consultas durante la navegación normal. Las pruebas
// de Supabase se ejecutan únicamente al abrir/ejecutar Admin → Auditoría.

const ALP67_RELEASE = Object.freeze({
  step: 67,
  version: "2.67.0",
  channel: "stable-candidate",
  date: "2026-09-15",
});

window.ALP_RELEASE = ALP67_RELEASE;

const alp67AuditState = {
  running: false,
  ranAt: "",
  checks: [],
  error: "",
};

function alp67Text(es, en)
{
  return state?.language === "en" ? en : es;
}

function alp67Check(id, label, ok, detail = "", severity = "critical")
{
  return {
    id: String(id || "check"),
    label: String(label || id || "Check"),
    ok: ok === true,
    detail: String(detail || ""),
    severity: severity === "warning" ? "warning" : "critical",
  };
}

function alp67LocalAssetVersions()
{
  const nodes = [
    ...Array.from(document.querySelectorAll('script[src*="assets/"]')),
    ...Array.from(document.querySelectorAll('link[rel="stylesheet"][href*="assets/"]')),
  ];

  return nodes.map(node =>
  {
    const raw = node.getAttribute("src") || node.getAttribute("href") || "";
    try
    {
      const url = new URL(raw, window.location.href);
      return {
        asset: url.pathname.split("/").pop() || raw,
        version: url.searchParams.get("v") || "",
      };
    }
    catch (_)
    {
      return { asset: raw, version: "" };
    }
  });
}

function alp67DuplicateDomIds()
{
  const counts = new Map();
  document.querySelectorAll("[id]").forEach(node =>
  {
    const id = String(node.id || "").trim();
    if (!id) return;
    counts.set(id, (counts.get(id) || 0) + 1);
  });

  return Array.from(counts.entries())
    .filter(([, count]) => count > 1)
    .map(([id, count]) => `${id}×${count}`)
    .slice(0, 20);
}

function alp67ModuleChecks()
{
  const entry = String(document.body?.dataset?.entry || "store");
  const required = [
    ["Supabase client", () => typeof supabaseClient !== "undefined" && Boolean(supabaseClient)],
    ["Global state", () => typeof state !== "undefined" && Boolean(state)],
    ["Data loader", () => typeof loadAllData === "function"],
    ["Router", () => typeof setRoute === "function" && typeof renderCurrentRoute === "function"],
    ["Products", () => typeof renderProductCard === "function"],
    ["Performance V2", () => typeof alp63EnsureRouteData === "function"],
    ["Accessibility V2", () => typeof a11y64Init === "function"],
    ["Security V2", () => typeof alp65VerifyAdminAccess === "function"],
    ["Resilience V2", () => typeof alp66RecordDiagnostic === "function"],
  ];

  if (entry === "store")
  {
    required.push(
      ["Checkout V2", () => typeof alp43SubmitCheckout === "function"],
      ["Order Tracking V2", () => typeof orderTrackingV2ApplyInitialRoute === "function"],
      ["Reviews V2", () => typeof reviewsV2LoadProduct === "function"],
      ["Club V2", () => typeof loyaltyV2ApplyInitialRoute === "function"],
      ["Analytics V2", () => typeof analyticsV2Init === "function"],
      ["SEO V2", () => typeof seoV2ApplyInitialRoute === "function"]
    );
  }

  if (entry === "admin")
  {
    required.push(
      ["Dashboard V2", () => typeof renderAdminDashboardV2 === "function"],
      ["Analytics Admin V2", () => typeof renderAdminAnalyticsV2 === "function"],
      ["Orders V2", () => typeof alp49EnsureOrdersLoaded === "function"],
      ["Inventory V2", () => typeof alp50EnsureInventoryLoaded === "function"],
      ["Finance V2", () => typeof alp51EnsureFinanceLoaded === "function"],
      ["Merchandising V2", () => typeof alp52EnsureMerchandisingLoaded === "function"],
      ["Reviews V2", () => typeof alp58EnsureReviewsLoaded === "function"],
      ["Club V2", () => typeof alp59EnsureClubLoaded === "function"],
      ["Customers V2", () => typeof alp47EnsureCustomersLoaded === "function"],
      ["Reactivation V2", () => typeof alp60EnsureLoaded === "function"]
    );
  }

  return required.map(([label, test], index) =>
  {
    let ok = false;
    try { ok = Boolean(test()); } catch (_) { ok = false; }
    return alp67Check(`module_${index + 1}`, label, ok, ok ? "OK" : "No disponible");
  });
}

function alp67StaticChecks()
{
  const expectedVersion = String(ALP67_RELEASE.step);
  const assets = alp67LocalAssetVersions();
  const wrongAssets = assets.filter(item => item.version !== expectedVersion);
  const duplicateIds = alp67DuplicateDomIds();
  const requiredIds = ["app", "menuDrawer", "cartDrawer", "modal", "toastStack"];
  const missingIds = requiredIds.filter(id => !document.getElementById(id));
  const htmlBuild = document.querySelector('meta[name="alp-build"]')?.getAttribute("content") || "";

  return [
    alp67Check(
      "release_meta",
      alp67Text("Versión HTML", "HTML version"),
      htmlBuild === expectedVersion,
      htmlBuild ? `PASO ${htmlBuild}` : alp67Text("Falta meta alp-build", "alp-build meta missing")
    ),
    alp67Check(
      "asset_versions",
      alp67Text("Caché de assets", "Asset cache versions"),
      wrongAssets.length === 0 && assets.length > 0,
      wrongAssets.length
        ? wrongAssets.map(item => `${item.asset}:v=${item.version || "-"}`).slice(0, 8).join(", ")
        : `${assets.length} assets · v=${expectedVersion}`
    ),
    alp67Check(
      "dom_ids",
      alp67Text("IDs únicos del DOM", "Unique DOM IDs"),
      duplicateIds.length === 0,
      duplicateIds.length ? duplicateIds.join(", ") : "OK"
    ),
    alp67Check(
      "critical_dom",
      alp67Text("Estructura crítica", "Critical DOM"),
      missingIds.length === 0,
      missingIds.length ? missingIds.join(", ") : "OK"
    ),
    alp67Check(
      "storage",
      alp67Text("Almacenamiento seguro", "Safe storage"),
      typeof alp66StorageGet === "function" && typeof alp66StorageSet === "function",
      typeof alp66StorageAvailable === "function" && alp66StorageAvailable()
        ? alp67Text("Persistente", "Persistent")
        : alp67Text("Fallback en memoria disponible", "Memory fallback available"),
      "warning"
    ),
    alp67Check(
      "boot_guard",
      "Boot guard",
      window.__alp67BootState === "ready" || window.__alp67BootState === "running",
      String(window.__alp67BootState || "not-started")
    ),
  ];
}

async function alp67LiveChecks()
{
  const checks = [];

  checks.push(alp67Check(
    "online",
    alp67Text("Conexión del navegador", "Browser connection"),
    navigator.onLine !== false,
    navigator.onLine === false ? alp67Text("Sin conexión", "Offline") : "Online",
    "warning"
  ));

  if (navigator.onLine === false)
  {
    checks.push(alp67Check(
      "supabase_read",
      "Supabase read",
      false,
      alp67Text("No probado: navegador sin conexión", "Not tested: browser offline"),
      "warning"
    ));
    return checks;
  }

  try
  {
    const result = await supabaseClient
      .from("products")
      .select("id")
      .limit(1);

    checks.push(alp67Check(
      "supabase_read",
      "Supabase read",
      !result.error,
      result.error ? "query_failed" : "products:id OK"
    ));
  }
  catch (_)
  {
    checks.push(alp67Check("supabase_read", "Supabase read", false, "network_or_client_error"));
  }

  if (document.body?.dataset?.entry === "admin")
  {
    try
    {
      const session = typeof getCurrentSession === "function" ? await getCurrentSession() : null;
      const authorized = session?.user && typeof alp65VerifyAdminAccess === "function"
        ? await alp65VerifyAdminAccess(session.user, { force: true })
        : false;

      checks.push(alp67Check(
        "admin_server_guard",
        alp67Text("Autorización Admin server-side", "Server-side Admin authorization"),
        authorized === true,
        authorized ? "admin_security_status_v2 OK" : "not_authorized_or_rpc_unavailable"
      ));
    }
    catch (_)
    {
      checks.push(alp67Check("admin_server_guard", "Admin server guard", false, "verification_failed"));
    }
  }

  return checks;
}

async function alp67RunAudit(options = {})
{
  if (alp67AuditState.running) return alp67AuditState;

  alp67AuditState.running = true;
  alp67AuditState.error = "";

  try
  {
    const checks = [
      ...alp67StaticChecks(),
      ...alp67ModuleChecks(),
      ...(options.live === false ? [] : await alp67LiveChecks()),
    ];

    alp67AuditState.checks = checks;
    alp67AuditState.ranAt = new Date().toISOString();
  }
  catch (error)
  {
    alp67AuditState.error = "audit_failed";
    if (typeof alp66RecordDiagnostic === "function")
    {
      alp66RecordDiagnostic(error, { context: "release:audit" });
    }
  }
  finally
  {
    alp67AuditState.running = false;
  }

  return alp67AuditState;
}

function alp67AuditSummary()
{
  const rows = Array.isArray(alp67AuditState.checks) ? alp67AuditState.checks : [];
  const criticalFail = rows.filter(row => !row.ok && row.severity !== "warning").length;
  const warnings = rows.filter(row => !row.ok && row.severity === "warning").length;
  const passed = rows.filter(row => row.ok).length;

  return {
    total: rows.length,
    passed,
    warnings,
    critical_failures: criticalFail,
    ready: rows.length > 0 && criticalFail === 0,
  };
}

function alp67AuditPill(row)
{
  if (row.ok)
  {
    return `<span class="alp66-status-pill ok">✓ OK</span>`;
  }

  if (row.severity === "warning")
  {
    return `<span class="alp67-status-pill warn">!</span>`;
  }

  return `<span class="alp66-status-pill bad">! ${alp67Text("Revisar", "Review")}</span>`;
}

function alp67RenderAdminAudit()
{
  const en = state?.language === "en";
  const summary = alp67AuditSummary();
  const rows = alp67AuditState.checks || [];

  return `
    <section class="alp67-audit">
      <div class="section-head compact">
        <div>
          <p class="eyebrow">Release ${escapeHtml(ALP67_RELEASE.version)}</p>
          <h2>${en ? "Final stability audit" : "Auditoría final de estabilidad"}</h2>
          <p class="muted">${en
            ? "Non-destructive checks for deployment version, critical frontend modules, DOM consistency and Supabase connectivity."
            : "Controles no destructivos de versión desplegada, módulos críticos, consistencia del DOM y conectividad con Supabase."
          }</p>
        </div>
        <div class="alp66-diagnostic-actions">
          <button class="btn" type="button" data-action="alp67-audit-run">${alp67AuditState.running ? (en ? "Running…" : "Ejecutando…") : (en ? "Run audit" : "Ejecutar auditoría")}</button>
          <button class="btn outline" type="button" data-action="alp67-audit-copy" ${rows.length ? "" : "disabled"}>${en ? "Copy report" : "Copiar informe"}</button>
        </div>
      </div>

      <div class="alp66-diagnostic-grid">
        <article class="alp66-diagnostic-card"><span>${en ? "Release" : "Release"}</span><strong>PASO ${ALP67_RELEASE.step}</strong></article>
        <article class="alp66-diagnostic-card"><span>${en ? "Passed" : "Correctos"}</span><strong>${formatInteger(summary.passed)}</strong></article>
        <article class="alp66-diagnostic-card"><span>${en ? "Warnings" : "Advertencias"}</span><strong>${formatInteger(summary.warnings)}</strong></article>
        <article class="alp66-diagnostic-card"><span>${en ? "Critical failures" : "Fallos críticos"}</span><strong>${formatInteger(summary.critical_failures)}</strong></article>
      </div>

      ${rows.length
        ? `<div class="settings-card alp67-audit-list">
            <h3>${summary.ready ? (en ? "Candidate is internally consistent" : "La candidata es internamente consistente") : (en ? "Items to review" : "Puntos a revisar")}</h3>
            ${rows.map(row => `
              <div class="alp67-audit-row">
                ${alp67AuditPill(row)}
                <div><strong>${escapeHtml(row.label)}</strong><small>${escapeHtml(row.detail || "")}</small></div>
              </div>`).join("")}
          </div>`
        : `<div class="settings-card"><p class="muted">${en ? "Run the audit to verify this deployment." : "Ejecutá la auditoría para verificar este despliegue."}</p></div>`
      }

      <div class="alp65-security-note">
        <strong>${en ? "Scope" : "Alcance"}</strong>
        <span>${en ? "Read-only checks. No order, stock, price, customer or campaign is modified." : "Pruebas de solo lectura. No modifica pedidos, stock, precios, clientes ni campañas."}</span>
      </div>
    </section>
  `;
}

function alp67RefreshAudit()
{
  if (state?.admin?.tab === "audit" && typeof refreshAdminTab === "function")
  {
    refreshAdminTab();
  }
}

function alp67AuditReport()
{
  return {
    product: "AromaLParfum",
    release: ALP67_RELEASE,
    generated_at: new Date().toISOString(),
    entry: String(document.body?.dataset?.entry || "store"),
    route: String(state?.route || "unknown"),
    summary: alp67AuditSummary(),
    checks: alp67AuditState.checks,
  };
}

async function alp67CopyAuditReport()
{
  const text = JSON.stringify(alp67AuditReport(), null, 2);
  try
  {
    await navigator.clipboard.writeText(text);
    toast(alp67Text("Informe de auditoría copiado.", "Audit report copied."), "success");
    return;
  }
  catch (_) {}

  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.opacity = "0";
  document.body.appendChild(area);
  area.select();
  try
  {
    document.execCommand("copy");
    toast(alp67Text("Informe de auditoría copiado.", "Audit report copied."), "success");
  }
  catch (_)
  {
    toast(alp67Text("No se pudo copiar el informe.", "Could not copy the report."), "error");
  }
  finally
  {
    area.remove();
  }
}

document.addEventListener("click", async event =>
{
  const button = event.target.closest('[data-action="alp67-audit-run"], [data-action="alp67-audit-copy"]');
  if (!button) return;

  event.preventDefault();
  event.stopImmediatePropagation();

  if (button.dataset.action === "alp67-audit-run")
  {
    await alp67RunAudit({ live: true });
    alp67RefreshAudit();
    return;
  }

  await alp67CopyAuditReport();
});
