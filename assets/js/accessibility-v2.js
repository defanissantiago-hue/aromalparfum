"use strict";

// AromaLParfum — PASO 64
// Accesibilidad, navegación móvil y gestión de foco. Frontend puro: no consulta Supabase.

const A11Y64_FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(",");

const a11y64PreviousFocus = new WeakMap();
let a11y64ActiveOverlay = null;
let a11y64RouteTimer = 0;

function a11y64IsVisible(node)
{
  return Boolean(node && (node.offsetWidth || node.offsetHeight || node.getClientRects().length));
}

function a11y64Focusable(container)
{
  return Array.from(container?.querySelectorAll(A11Y64_FOCUSABLE) || [])
    .filter(a11y64IsVisible)
    .filter(node => node.getAttribute("aria-hidden") !== "true");
}

function a11y64OverlayPanel(overlay)
{
  return overlay?.querySelector(".drawer-panel, .modal-panel") || overlay;
}

function a11y64RememberAndFocus(overlay)
{
  if (!overlay) return;
  a11y64PreviousFocus.set(overlay, document.activeElement);
  a11y64ActiveOverlay = overlay;

  const panel = a11y64OverlayPanel(overlay);
  const focusables = a11y64Focusable(panel);
  const preferred = panel?.querySelector(".close-btn") || focusables[0] || panel;

  window.requestAnimationFrame(() => preferred?.focus?.({ preventScroll: true }));
}

function a11y64RestoreFocus(overlay)
{
  if (!overlay) return;
  const previous = a11y64PreviousFocus.get(overlay);
  if (previous && document.contains(previous) && typeof previous.focus === "function")
  {
    window.requestAnimationFrame(() => previous.focus({ preventScroll: true }));
  }
  a11y64PreviousFocus.delete(overlay);
  if (a11y64ActiveOverlay === overlay) a11y64ActiveOverlay = null;
}

function a11y64TrapTab(event, overlay)
{
  const panel = a11y64OverlayPanel(overlay);
  const items = a11y64Focusable(panel);
  if (!items.length)
  {
    event.preventDefault();
    panel?.focus?.();
    return;
  }

  const first = items[0];
  const last = items[items.length - 1];

  if (event.shiftKey && document.activeElement === first)
  {
    event.preventDefault();
    last.focus();
  }
  else if (!event.shiftKey && document.activeElement === last)
  {
    event.preventDefault();
    first.focus();
  }
}

function a11y64CloseTopOverlay()
{
  const modal = document.getElementById("modal");
  const cart = document.getElementById("cartDrawer");
  const menu = document.getElementById("menuDrawer");

  if (modal?.classList.contains("open") && typeof closeModal === "function") return closeModal();
  if (cart?.classList.contains("open") && typeof closeCart === "function") return closeCart();
  if (menu?.classList.contains("open") && typeof closeMenu === "function") return closeMenu();
}

function a11y64OnKeydown(event)
{
  if (event.key === "Escape")
  {
    const hasOpen = document.querySelector(".modal.open, .drawer.open");
    if (hasOpen)
    {
      event.preventDefault();
      a11y64CloseTopOverlay();
    }
    return;
  }

  if (event.key === "Tab")
  {
    const overlay = document.querySelector(".modal.open, .drawer.cart.open, .drawer.menu.open");
    if (overlay) a11y64TrapTab(event, overlay);
  }
}

function a11y64SyncExpanded()
{
  const menuOpen = document.getElementById("menuDrawer")?.classList.contains("open") || false;
  const cartOpen = document.getElementById("cartDrawer")?.classList.contains("open") || false;

  document.querySelectorAll('[data-action="open-menu"]').forEach(node => node.setAttribute("aria-expanded", String(menuOpen)));
  document.querySelectorAll('[data-action="open-cart"]').forEach(node => node.setAttribute("aria-expanded", String(cartOpen)));
}

function a11y64ObserveOverlays()
{
  ["menuDrawer", "cartDrawer", "modal"].forEach(id =>
  {
    const overlay = document.getElementById(id);
    if (!overlay) return;

    let wasOpen = overlay.classList.contains("open");
    new MutationObserver(() =>
    {
      const isOpen = overlay.classList.contains("open");
      if (isOpen !== wasOpen)
      {
        if (isOpen) a11y64RememberAndFocus(overlay);
        else a11y64RestoreFocus(overlay);
        wasOpen = isOpen;
      }
      a11y64SyncExpanded();
    }).observe(overlay, { attributes: true, attributeFilter: ["class", "aria-hidden"] });
  });
}

function a11y64AnnounceRoute()
{
  const live = document.getElementById("a11yLiveRegion");
  if (!live) return;
  const heading = document.querySelector("#app h1, #app h2");
  const label = heading?.textContent?.trim() || document.title || "AromaLParfum";
  window.clearTimeout(a11y64RouteTimer);
  a11y64RouteTimer = window.setTimeout(() => { live.textContent = label; }, 120);
}

function a11y64SyncCurrentRoute()
{
  const route = String((typeof state !== "undefined" && state?.route) ? state.route : "home");
  document.querySelectorAll("[data-mobile-nav]").forEach(button =>
  {
    const key = button.dataset.mobileNav;
    const active = (key === "home" && route === "home") ||
      (key === "favorites" && route === "favorites");
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });

  document.querySelectorAll(".desktop-nav [data-route], .menu-links [data-route]").forEach(button =>
  {
    const active = String(button.dataset.route || "") === route;
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
}

function a11y64EnhanceDynamicContent()
{
  a11y64SyncCurrentRoute();
  a11y64AnnounceRoute();

  document.querySelectorAll("img:not([alt])").forEach(img => img.setAttribute("alt", ""));
  document.querySelectorAll("button:not([type])").forEach(button => button.setAttribute("type", "button"));

  const app = document.getElementById("app");
  if (app && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  {
    app.querySelectorAll("video[autoplay]").forEach(video => video.pause?.());
  }
}

function a11y64Init()
{
  document.addEventListener("keydown", a11y64OnKeydown);
  a11y64ObserveOverlays();
  a11y64SyncExpanded();
  a11y64EnhanceDynamicContent();

  const app = document.getElementById("app");
  if (app)
  {
    let queued = false;
    new MutationObserver(() =>
    {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(() =>
      {
        queued = false;
        a11y64EnhanceDynamicContent();
      });
    }).observe(app, { childList: true, subtree: true });
  }

  document.addEventListener("click", event =>
  {
    const skip = event.target.closest?.('.skip-link');
    if (skip)
    {
      window.setTimeout(() => document.getElementById("app")?.focus?.({ preventScroll: true }), 0);
    }
  });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", a11y64Init, { once: true });
else a11y64Init();
