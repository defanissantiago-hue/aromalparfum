"use strict";

// AromaLParfum Frontend V2 — Paso 46
// Favoritos V2 + wishlist compartible + lista de regalo.

const ALP46_FAVORITES_SHARE_STORAGE = "alp_favorites_wishlist_v1";
const ALP46_SHARED_QUERY = "wishlist";

let alp46SharedWishlistCache = null;
let alp46SharedWishlistLoading = false;

function alp46ReadActiveWishlist()
{
  return safeJsonParse(
    alp66StorageGet(ALP46_FAVORITES_SHARE_STORAGE),
    null
  );
}

function alp46WriteActiveWishlist(value)
{
  if (!value)
  {
    alp66StorageRemove(ALP46_FAVORITES_SHARE_STORAGE);
    return;
  }

  alp66StorageSet(
    ALP46_FAVORITES_SHARE_STORAGE,
    JSON.stringify(value)
  );
}

function alp46CleanToken(value)
{
  return String(value || "").trim();
}

function alp46UnwrapRpcData(data)
{
  if (Array.isArray(data) && data.length === 1)
  {
    return data[0];
  }

  return data;
}

function alp46FindField(data, names)
{
  const seen = new Set();

  function walk(node, depth = 0)
  {
    if (node == null || depth > 5)
    {
      return "";
    }

    if (typeof node !== "object")
    {
      return "";
    }

    if (seen.has(node))
    {
      return "";
    }

    seen.add(node);

    for (const name of names)
    {
      if (Object.prototype.hasOwnProperty.call(node, name))
      {
        const value = node[name];

        if (value != null && String(value).trim())
        {
          return value;
        }
      }
    }

    const preferred = [
      "wishlist",
      "data",
      "result",
      "list",
      "meta"
    ];

    for (const key of preferred)
    {
      if (node[key] && typeof node[key] === "object")
      {
        const value = walk(node[key], depth + 1);
        if (value !== "") return value;
      }
    }

    return "";
  }

  return walk(data);
}

async function alp46RpcTry(functionName, parameterCandidates)
{
  let lastError = null;

  for (const params of parameterCandidates)
  {
    const result = await supabaseClient.rpc(functionName, params);

    if (!result.error)
    {
      return alp46UnwrapRpcData(result.data);
    }

    lastError = result.error;
  }

  throw lastError || new Error(`No se pudo ejecutar ${functionName}.`);
}

async function alp46CreateWishlistRecord(options)
{
  const type = options.type || "favorites";
  const name = options.name || "Mis favoritos";
  const description = options.description || null;
  const recipient = options.recipient || null;
  const occasion = options.occasion || null;
  const budget = options.budget == null ? null : Number(options.budget);

  const data = await alp46RpcTry(
    "create_wishlist",
    [
      {
        p_type: type,
        p_name: name,
        p_description: description,
        p_recipient: recipient,
        p_occasion: occasion,
        p_budget: Number.isFinite(budget) ? budget : null,
        p_public: true,
      },
      {
        p_type: type,
        p_name: name,
        p_description: description,
        p_recipient_name: recipient,
        p_occasion: occasion,
        p_budget: Number.isFinite(budget) ? budget : null,
        p_public: true,
      },
      {
        p_type: type,
        p_name: name,
        p_description: description,
        p_recipient: recipient,
        p_occasion: occasion,
        p_budget: Number.isFinite(budget) ? budget : null,
      },
      {
        p_type: type,
        p_name: name,
        p_description: description,
      },
      {
        p_type: type,
        p_name: name,
      },
    ]
  );

  const shareToken = alp46CleanToken(
    alp46FindField(data, ["share_token", "shareToken"])
  );

  const editToken = alp46CleanToken(
    alp46FindField(data, ["edit_token", "editToken"])
  );

  if (!shareToken || !editToken)
  {
    throw new Error("Supabase creó la lista, pero no devolvió los tokens para compartirla y editarla.");
  }

  return {
    shareToken,
    editToken,
    raw: data,
  };
}

async function alp46WishlistAddProduct(editToken, productId)
{
  return alp46RpcTry(
    "wishlist_add_product",
    [
      {
        p_edit_token: editToken,
        p_product_id: Number(productId),
        p_quantity: 1,
        p_note: null,
      },
      {
        p_edit_token: editToken,
        p_product_id: Number(productId),
        p_quantity: 1,
      },
      {
        p_edit_token: editToken,
        p_product_id: Number(productId),
      },
      {
        edit_token: editToken,
        product_id: Number(productId),
      },
    ]
  );
}

async function alp46WishlistRemoveProduct(editToken, productId)
{
  return alp46RpcTry(
    "wishlist_remove_product",
    [
      {
        p_edit_token: editToken,
        p_product_id: Number(productId),
      },
      {
        edit_token: editToken,
        product_id: Number(productId),
      },
    ]
  );
}

async function alp46DisableWishlist(editToken)
{
  return alp46RpcTry(
    "disable_wishlist",
    [
      { p_edit_token: editToken },
      { edit_token: editToken },
      { p_token: editToken },
    ]
  );
}

async function alp46GetSharedWishlist(shareToken)
{
  return alp46RpcTry(
    "get_shared_wishlist",
    [
      { p_share_token: shareToken },
      { share_token: shareToken },
      { p_token: shareToken },
      { token: shareToken },
    ]
  );
}

function alp46ShareUrl(shareToken)
{
  const url = new URL(window.location.href);

  url.search = "";
  url.hash = "";
  url.searchParams.set(ALP46_SHARED_QUERY, shareToken);

  return url.toString();
}

async function alp46CopyText(text)
{
  if (navigator.clipboard?.writeText)
  {
    await navigator.clipboard.writeText(text);
    return;
  }

  const input = document.createElement("textarea");
  input.value = text;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  document.execCommand("copy");
  input.remove();
}

async function alp46SyncAllFavorites(editToken)
{
  const ids = [...new Set(state.favorites.map(Number).filter(Number.isFinite))];

  for (const id of ids)
  {
    await alp46WishlistAddProduct(editToken, id);
  }
}

async function wishlistV2CreateAndShareFavorites()
{
  if (!state.favorites.length)
  {
    toast(
      state.language === "en"
        ? "Add at least one fragrance to favorites first."
        : "Agregá al menos un perfume a Favoritos primero.",
      "error"
    );
    return;
  }

  const button = document.querySelector('[data-wishlist46-action="share-favorites"]');
  if (button) button.disabled = true;

  try
  {
    const existing = alp46ReadActiveWishlist();

    if (existing?.shareToken && existing?.editToken)
    {
      await alp46SyncAllFavorites(existing.editToken);
      const url = alp46ShareUrl(existing.shareToken);
      await alp46CopyText(url);

      toast(
        state.language === "en"
          ? "Favorites link copied."
          : "Link de favoritos copiado."
      );

      renderCurrentRoute();
      return;
    }

    const created = await alp46CreateWishlistRecord({
      type: "favorites",
      name: state.language === "en" ? "My favorites" : "Mis favoritos",
      description: state.language === "en"
        ? "Fragrances saved from AromaLParfum."
        : "Fragancias guardadas desde AromaLParfum.",
    });

    await alp46SyncAllFavorites(created.editToken);

    const saved = {
      type: "favorites",
      shareToken: created.shareToken,
      editToken: created.editToken,
      createdAt: new Date().toISOString(),
    };

    alp46WriteActiveWishlist(saved);

    const url = alp46ShareUrl(created.shareToken);
    await alp46CopyText(url);

    toast(
      state.language === "en"
        ? "Shareable favorites link created and copied."
        : "Lista compartible creada y link copiado."
    );

    renderCurrentRoute();
  }
  catch (error)
  {
    console.error("Wishlist V2 create favorites error", error);
    toast(
      error?.message || "No se pudo crear la lista compartible.",
      "error",
      5200
    );
  }
  finally
  {
    if (button) button.disabled = false;
  }
}

function alp46OpenGiftWishlistModal()
{
  if (!state.favorites.length)
  {
    toast(
      state.language === "en"
        ? "Choose the fragrances for the gift list using Favorites first."
        : "Primero elegí en Favoritos los perfumes que querés poner en la lista de regalo.",
      "error"
    );
    return;
  }

  const en = state.language === "en";

  openModal(
    en ? "Create gift wishlist" : "Crear lista de regalo",
    `
      <div class="wishlist46-gift-form">
        <p class="wishlist46-modal-help">
          ${en
            ? "The fragrances currently in Favorites will be included in this shareable gift list."
            : "Los perfumes que tenés ahora en Favoritos se incluirán en esta lista compartible de regalo."}
        </p>

        <label class="wishlist46-field">
          <span>${en ? "List name" : "Nombre de la lista"}</span>
          <input id="wishlist46GiftName" type="text" maxlength="80" value="${en ? "Gift wishlist" : "Lista de regalo"}">
        </label>

        <label class="wishlist46-field">
          <span>${en ? "For whom?" : "¿Para quién?"}</span>
          <input id="wishlist46Recipient" type="text" maxlength="80" placeholder="${en ? "Example: Sofía" : "Ej: Sofía"}">
        </label>

        <label class="wishlist46-field">
          <span>${en ? "Occasion" : "Ocasión"}</span>
          <input id="wishlist46Occasion" type="text" maxlength="80" placeholder="${en ? "Birthday, anniversary..." : "Cumpleaños, aniversario..."}">
        </label>

        <label class="wishlist46-field">
          <span>${en ? "Approximate budget" : "Presupuesto aproximado"}</span>
          <input id="wishlist46Budget" type="number" min="0" step="1000" placeholder="50000">
        </label>

        <label class="wishlist46-field">
          <span>${en ? "Note" : "Nota"}</span>
          <textarea id="wishlist46Description" rows="3" maxlength="240" placeholder="${en ? "Optional note" : "Nota opcional"}"></textarea>
        </label>

        <button class="btn" type="button" data-wishlist46-action="create-gift-list">
          ${en ? "Create link" : "Crear link compartible"}
        </button>
      </div>
    `
  );
}

async function alp46CreateGiftWishlistFromModal()
{
  const en = state.language === "en";

  const name = document.getElementById("wishlist46GiftName")?.value.trim() || (en ? "Gift wishlist" : "Lista de regalo");
  const recipient = document.getElementById("wishlist46Recipient")?.value.trim() || null;
  const occasion = document.getElementById("wishlist46Occasion")?.value.trim() || null;
  const description = document.getElementById("wishlist46Description")?.value.trim() || null;
  const budgetRaw = document.getElementById("wishlist46Budget")?.value;
  const budget = budgetRaw ? Number(budgetRaw) : null;

  const button = document.querySelector('[data-wishlist46-action="create-gift-list"]');
  if (button) button.disabled = true;

  try
  {
    const created = await alp46CreateWishlistRecord({
      type: "gift",
      name,
      description,
      recipient,
      occasion,
      budget,
    });

    await alp46SyncAllFavorites(created.editToken);

    const url = alp46ShareUrl(created.shareToken);
    await alp46CopyText(url);

    closeModal();

    toast(
      en
        ? "Gift wishlist created. Link copied."
        : "Lista de regalo creada. Link copiado."
    );
  }
  catch (error)
  {
    console.error("Wishlist V2 gift list error", error);
    toast(
      error?.message || "No se pudo crear la lista de regalo.",
      "error",
      5200
    );
  }
  finally
  {
    if (button) button.disabled = false;
  }
}

async function alp46CopyActiveFavoritesLink()
{
  const active = alp46ReadActiveWishlist();

  if (!active?.shareToken)
  {
    await wishlistV2CreateAndShareFavorites();
    return;
  }

  await alp46CopyText(alp46ShareUrl(active.shareToken));
  toast(state.language === "en" ? "Link copied." : "Link copiado.");
}

async function alp46DisableActiveFavoritesLink()
{
  const active = alp46ReadActiveWishlist();
  if (!active?.editToken) return;

  const ok = window.confirm(
    state.language === "en"
      ? "Disable this shared favorites link? Anyone with the old link will stop seeing the list."
      : "¿Desactivar este link compartido? Quien tenga el link anterior dejará de ver la lista."
  );

  if (!ok) return;

  try
  {
    await alp46DisableWishlist(active.editToken);
    alp46WriteActiveWishlist(null);
    toast(state.language === "en" ? "Shared link disabled." : "Link compartido desactivado.");
    renderCurrentRoute();
  }
  catch (error)
  {
    console.error("Wishlist V2 disable error", error);
    toast(error?.message || "No se pudo desactivar el link.", "error", 5200);
  }
}

async function wishlistV2SyncFavoriteProduct(productId, added)
{
  const active = alp46ReadActiveWishlist();

  if (!active?.editToken)
  {
    return;
  }

  try
  {
    if (added)
    {
      await alp46WishlistAddProduct(active.editToken, Number(productId));
    }
    else
    {
      await alp46WishlistRemoveProduct(active.editToken, Number(productId));
    }
  }
  catch (error)
  {
    // El favorito local nunca debe romperse si la lista remota falla.
    console.debug("Wishlist V2 background sync error", error);
  }
}

function wishlistV2RenderFavoritesPage()
{
  const en = state.language === "en";
  const products = state.products.filter(product => state.favorites.includes(Number(product.id)));
  const active = alp46ReadActiveWishlist();

  return `
    <section class="section wishlist46-page">
      <div class="container">
        <div class="wishlist46-head">
          <div>
            <p class="eyebrow">${en ? "Saved fragrances" : "Fragancias guardadas"}</p>
            <h1 class="section-title">${en ? "Your favorites" : "Tus favoritos"}</h1>
            <p class="wishlist46-intro">
              ${en
                ? "Keep your shortlist on this device or turn it into a private-by-link wishlist to share."
                : "Guardá tu selección en este dispositivo o convertí tus favoritos en una lista privada por link para compartir."}
            </p>
          </div>

          ${products.length ? `
            <div class="wishlist46-actions">
              <button class="btn" type="button" data-wishlist46-action="share-favorites">
                ${active?.shareToken
                  ? (en ? "Sync & copy link" : "Sincronizar y copiar link")
                  : (en ? "Create shareable link" : "Crear link compartible")}
              </button>

              <button class="btn secondary" type="button" data-wishlist46-action="gift-list">
                ${en ? "Create gift wishlist" : "Crear lista de regalo"}
              </button>
            </div>
          ` : ""}
        </div>

        ${active?.shareToken ? `
          <div class="wishlist46-share-status">
            <div>
              <span class="wishlist46-status-dot"></span>
              <strong>${en ? "Shared favorites link active" : "Link compartido de favoritos activo"}</strong>
              <small>${en ? "New favorite changes are synchronized in the background." : "Los cambios nuevos de Favoritos se sincronizan en segundo plano."}</small>
            </div>
            <div class="wishlist46-share-status-actions">
              <button class="btn ghost" type="button" data-wishlist46-action="copy-active">${en ? "Copy link" : "Copiar link"}</button>
              <button class="btn ghost danger" type="button" data-wishlist46-action="disable-active">${en ? "Disable" : "Desactivar"}</button>
            </div>
          </div>
        ` : ""}

        ${products.length
          ? `
            <div class="wishlist46-count">
              ${products.length} ${products.length === 1 ? (en ? "fragrance" : "perfume") : (en ? "fragrances" : "perfumes")}
            </div>
            <div class="catalog-grid">
              ${products.map(product => renderProductCard(product)).join("")}
            </div>
          `
          : `
            <div class="empty-state wishlist46-empty">
              <div class="wishlist46-empty-icon">♡</div>
              <h3>${en ? "No favorites yet" : "Todavía no tenés favoritos"}</h3>
              <p>${en ? "Use the heart on any fragrance to build your shortlist." : "Usá el corazón de cualquier perfume para armar tu selección."}</p>
              <button class="btn" type="button" data-route="catalog">${en ? "Explore perfumes" : "Explorar perfumes"}</button>
            </div>
          `}
      </div>
    </section>
  `;
}

function alp46ExtractSharedMeta(data)
{
  const root = Array.isArray(data) && data.length ? data[0] : data;
  const wishlist = root?.wishlist && typeof root.wishlist === "object" ? root.wishlist : root;

  return {
    name: wishlist?.name || wishlist?.nombre || wishlist?.wishlist_name || "",
    description: wishlist?.description || wishlist?.descripcion || wishlist?.wishlist_description || "",
    recipient: wishlist?.recipient || wishlist?.recipient_name || wishlist?.destinatario || "",
    occasion: wishlist?.occasion || wishlist?.ocasion || "",
    budget: wishlist?.budget ?? wishlist?.presupuesto ?? null,
    type: wishlist?.type || wishlist?.wishlist_type || "",
  };
}

function alp46ExtractSharedProductIds(data)
{
  const ids = new Set();
  const seen = new Set();

  function walk(node, context = "", depth = 0)
  {
    if (node == null || depth > 8) return;

    if (Array.isArray(node))
    {
      node.forEach(item => walk(item, context, depth + 1));
      return;
    }

    if (typeof node !== "object" || seen.has(node)) return;
    seen.add(node);

    if (node.product_id != null && Number.isFinite(Number(node.product_id)))
    {
      ids.add(Number(node.product_id));
    }

    if (node.product && typeof node.product === "object" && Number.isFinite(Number(node.product.id)))
    {
      ids.add(Number(node.product.id));
    }

    if (
      (context === "products" || context === "items") &&
      node.id != null &&
      (node.nombre || node.name || node.precio || node.price) &&
      Number.isFinite(Number(node.id))
    )
    {
      ids.add(Number(node.id));
    }

    for (const [key, value] of Object.entries(node))
    {
      if (key === "wishlist") continue;
      if (value && typeof value === "object") walk(value, key, depth + 1);
    }
  }

  walk(data);
  return [...ids];
}

function wishlistV2RenderSharedWishlistPage()
{
  const en = state.language === "en";
  const token = alp46CleanToken(state.routePayload?.shareToken);

  if (!token)
  {
    return `
      <section class="section"><div class="container"><div class="empty-state">
        <h3>${en ? "Invalid wishlist link" : "Link de wishlist inválido"}</h3>
        <button class="btn" type="button" data-route="home">${en ? "Go home" : "Volver al inicio"}</button>
      </div></div></section>
    `;
  }

  if (!alp46SharedWishlistCache || alp46SharedWishlistCache.token !== token)
  {
    return `
      <section class="section"><div class="container"><div class="loading-state wishlist46-loading">
        <div class="spinner"></div>
        <p>${en ? "Loading shared wishlist..." : "Cargando lista compartida..."}</p>
      </div></div></section>
    `;
  }

  if (alp46SharedWishlistCache.error)
  {
    return `
      <section class="section"><div class="container"><div class="empty-state wishlist46-empty">
        <div class="wishlist46-empty-icon">♡</div>
        <h3>${en ? "This wishlist is not available" : "Esta lista ya no está disponible"}</h3>
        <p>${en ? "It may have been disabled or the link may be incorrect." : "Puede haber sido desactivada o el link puede ser incorrecto."}</p>
        <button class="btn" type="button" data-route="catalog">${en ? "Explore perfumes" : "Explorar perfumes"}</button>
      </div></div></section>
    `;
  }

  const data = alp46SharedWishlistCache.data;
  const meta = alp46ExtractSharedMeta(data);
  const ids = alp46ExtractSharedProductIds(data);
  const products = ids.map(id => getProductById(id)).filter(Boolean);

  return `
    <section class="section wishlist46-page wishlist46-shared-page">
      <div class="container">
        <div class="wishlist46-shared-hero">
          <span class="wishlist46-shared-badge">${meta.type === "gift" ? (en ? "Gift wishlist" : "Lista de regalo") : (en ? "Shared wishlist" : "Lista compartida")}</span>
          <h1>${escapeHtml(meta.name || (en ? "AromaLParfum wishlist" : "Wishlist AromaLParfum"))}</h1>
          ${meta.description ? `<p>${escapeHtml(meta.description)}</p>` : ""}

          ${(meta.recipient || meta.occasion || meta.budget != null) ? `
            <div class="wishlist46-meta-grid">
              ${meta.recipient ? `<div><small>${en ? "For" : "Para"}</small><strong>${escapeHtml(meta.recipient)}</strong></div>` : ""}
              ${meta.occasion ? `<div><small>${en ? "Occasion" : "Ocasión"}</small><strong>${escapeHtml(meta.occasion)}</strong></div>` : ""}
              ${meta.budget != null && Number(meta.budget) > 0 ? `<div><small>${en ? "Budget" : "Presupuesto"}</small><strong>${money(Number(meta.budget))}</strong></div>` : ""}
            </div>
          ` : ""}
        </div>

        ${products.length
          ? `
            <div class="wishlist46-shared-toolbar">
              <span>${products.length} ${products.length === 1 ? (en ? "fragrance" : "perfume") : (en ? "fragrances" : "perfumes")}</span>
              <button class="btn secondary" type="button" data-wishlist46-action="copy-current-shared">${en ? "Copy this link" : "Copiar este link"}</button>
            </div>
            <div class="catalog-grid">
              ${products.map(product => renderProductCard(product)).join("")}
            </div>
          `
          : `
            <div class="empty-state wishlist46-empty">
              <h3>${en ? "This wishlist has no available fragrances." : "Esta lista no tiene perfumes disponibles."}</h3>
              <button class="btn" type="button" data-route="catalog">${en ? "Explore catalog" : "Explorar catálogo"}</button>
            </div>
          `}
      </div>
    </section>
  `;
}

async function wishlistV2HydrateSharedWishlist()
{
  const token = alp46CleanToken(state.routePayload?.shareToken);

  if (!token || alp46SharedWishlistLoading) return;
  if (alp46SharedWishlistCache?.token === token) return;

  alp46SharedWishlistLoading = true;

  try
  {
    const data = await alp46GetSharedWishlist(token);
    alp46SharedWishlistCache = { token, data, error: null };
  }
  catch (error)
  {
    console.error("Wishlist V2 shared load error", error);
    alp46SharedWishlistCache = { token, data: null, error };
  }
  finally
  {
    alp46SharedWishlistLoading = false;
    if (state.route === "shared-wishlist" && state.routePayload?.shareToken === token)
    {
      renderCurrentRoute();
    }
  }
}

function wishlistV2ApplyInitialSharedRoute()
{
  if (document.body?.dataset.entry === "admin") return false;

  const params = new URLSearchParams(window.location.search);
  const token = alp46CleanToken(params.get(ALP46_SHARED_QUERY));

  if (!token) return false;

  state.route = "shared-wishlist";
  state.routePayload = { shareToken: token };
  alp46SharedWishlistCache = null;
  return true;
}

function alp46CleanupSharedQueryWhenLeaving()
{
  if (state.route === "shared-wishlist") return;

  const url = new URL(window.location.href);
  if (!url.searchParams.has(ALP46_SHARED_QUERY)) return;

  url.searchParams.delete(ALP46_SHARED_QUERY);
  window.history.replaceState({}, "", url.toString());
}

// Las rutas internas normales limpian ?wishlist= para que el usuario
// pueda seguir navegando sin quedar atado a la lista compartida.
const alp46OriginalSetRoute = typeof setRoute === "function" ? setRoute : null;
if (alp46OriginalSetRoute)
{
  setRoute = function(route, payload = {})
  {
    alp46OriginalSetRoute(route, payload);
    alp46CleanupSharedQueryWhenLeaving();
  };
}

document.addEventListener("click", async event =>
{
  const element = event.target.closest("[data-wishlist46-action]");
  if (!element) return;

  event.preventDefault();
  event.stopPropagation();

  const action = element.dataset.wishlist46Action;

  try
  {
    if (action === "share-favorites")
    {
      await wishlistV2CreateAndShareFavorites();
    }
    else if (action === "gift-list")
    {
      alp46OpenGiftWishlistModal();
    }
    else if (action === "create-gift-list")
    {
      await alp46CreateGiftWishlistFromModal();
    }
    else if (action === "copy-active")
    {
      await alp46CopyActiveFavoritesLink();
    }
    else if (action === "disable-active")
    {
      await alp46DisableActiveFavoritesLink();
    }
    else if (action === "copy-current-shared")
    {
      await alp46CopyText(window.location.href);
      toast(state.language === "en" ? "Link copied." : "Link copiado.");
    }
  }
  catch (error)
  {
    console.error("Wishlist V2 action error", error);
    toast(error?.message || "No se pudo completar la acción.", "error", 5000);
  }
});
