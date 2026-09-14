"use strict";

// AromaLParfum Frontend V2 — Paso 59
// Módulo: rutas y render de tienda/catálogo/productos

function setRoute(
  route,
  payload = {}
)
{
  state.route =
  route;

  state.routePayload =
  payload
  ||
  {};

  closeMenu();

  closeCart();

  closeModal();

  renderCurrentRoute();

  window.scrollTo(
    {
      top:
      0,

      behavior:
      "smooth",
    }
  );
}

function renderCurrentRoute()
{
  const app =
  document.getElementById(
    "app"
  );

  if (
    !app
  )
  {
    return;
  }

  if (
    state.loading
  )
  {
    setAppLoading();

    return;
  }

  switch (
    state.route
  )
  {
    case "catalog":
    {
      app.innerHTML =
      renderCatalogPage();

      break;
    }

    case "best":
    {
      app.innerHTML =
      typeof renderBestSellersPageV2 === "function"
      ? renderBestSellersPageV2()
      : renderBestSellersPage();

      break;
    }

    case "collections":
    {
      app.innerHTML =
      typeof renderCollectionsPageV2 === "function"
      ? renderCollectionsPageV2()
      : renderCollectionsPage();

      break;
    }

    case "collection":
    {
      app.innerHTML =
      typeof renderCollectionDetailPageV2 === "function"
      ? renderCollectionDetailPageV2(state.routePayload.slug)
      : renderCollectionDetailPage(
          state.routePayload.slug
        );

      break;
    }

    case "campaign":
    {
      const campaignSlug =
      state.routePayload.slug
      ||
      state.routePayload.campaign_slug
      ||
      "";

      app.innerHTML =
      typeof campaignsV2RenderPage === "function"
      ? campaignsV2RenderPage(campaignSlug)
      : `<section class="section"><div class="container"><div class="empty-state"><h3>Campaña no disponible.</h3><button class="btn" type="button" data-route="catalog">Ver catálogo</button></div></div></section>`;

      if (typeof campaignsV2AfterRender === "function")
      {
        Promise.resolve(campaignsV2AfterRender(campaignSlug)).catch(error =>
          console.debug("Campaign V2 after-render error", error)
        );
      }

      break;
    }

    case "decants":
    {
      app.innerHTML =
      renderDecantBuilderPage();

      break;
    }

    case "gifts":
    {
      app.innerHTML =
      renderGiftBuilderPage();

      break;
    }

    case "games":
    {
      app.innerHTML =
      renderDiscoverPage();

      afterRenderDiscoverPage();

      break;
    }

    case "game":
    {
      app.innerHTML =
      renderGamePage();

      afterRenderGame();

      break;
    }

    case "advisor":
    {
      app.innerHTML =
      renderAdvisorPage();

      break;
    }

    case "favorites":
    {
      app.innerHTML =
      typeof wishlistV2RenderFavoritesPage === "function"
      ? wishlistV2RenderFavoritesPage()
      : renderFavoritesPage();

      break;
    }

    case "shared-wishlist":
    {
      app.innerHTML =
      typeof wishlistV2RenderSharedWishlistPage === "function"
      ? wishlistV2RenderSharedWishlistPage()
      : renderFavoritesPage();

      if (typeof wishlistV2HydrateSharedWishlist === "function")
      {
        Promise.resolve(wishlistV2HydrateSharedWishlist()).catch(error =>
          console.debug("Wishlist shared hydration error", error)
        );
      }

      break;
    }

    case "order-tracking":
    {
      app.innerHTML =
      typeof orderTrackingV2RenderPage === "function"
      ? orderTrackingV2RenderPage()
      : `<section class="section"><div class="container"><div class="empty-state"><h3>Seguimiento no disponible.</h3></div></div></section>`;

      break;
    }

    case "club":
    {
      app.innerHTML =
      typeof loyaltyV2RenderPage === "function"
      ? loyaltyV2RenderPage()
      : `<section class="section"><div class="container"><div class="empty-state"><h3>Club no disponible.</h3></div></div></section>`;

      break;
    }

    case "product":
    {
      const productId =
      state.routePayload.id;

      app.innerHTML =
      typeof renderProductDetailPageV2 === "function"
      ?
      renderProductDetailPageV2(
        productId
      )
      :
      renderProductDetailPage(
        productId
      );

      ensureProductGallery(
        productId
      );

      if (
        typeof productV2AfterRender === "function"
      )
      {
        Promise.resolve(
          productV2AfterRender(
            productId
          )
        )
        .catch(
          error =>
          console.debug(
            "Product V2 after-render error",
            error
          )
        );
      }

      if (
        typeof reviewsV2AfterProductRender === "function"
      )
      {
        Promise.resolve(
          reviewsV2AfterProductRender(
            productId
          )
        )
        .catch(
          error =>
          console.debug(
            "Reviews V2 after-render error",
            error
          )
        );
      }

      break;
    }

    case "personal-care":
    {
      app.innerHTML =
      renderPersonalCarePage();

      break;
    }

    case "gift-sets":
    {
      app.innerHTML =
      renderGiftSetsPage();

      break;
    }

    case "discovery":
    {
      app.innerHTML =
      renderDiscoveryPage();

      break;
    }

    case "about":
    {
      app.innerHTML =
      renderAboutPage();

      break;
    }

    case "contact":
    {
      app.innerHTML =
      renderContactPage();

      break;
    }

    case "admin":
    {
      renderAdminRoute();

      break;
    }

    case "home":
    default:
    {
      app.innerHTML =
      renderHomePage();

      break;
    }
  }

  applyLanguageToChrome();

  updateHeaderCounts();

  if (
    typeof productV2AfterRouteRender === "function"
  )
  {
    productV2AfterRouteRender();
  }

  if (
    state.route === "games"
  )
  {
    setTimeout(
      () =>
      activateGameAds(),
      0
    );
  }
}

function renderMobileMenu()
{
  const host =
  document.getElementById(
    "mobileMenuLinks"
  );

  if (
    !host
  )
  {
    return;
  }

  const entries =
  [
    {
      route:
      "home",

      label:
      state.language === "en"
      ?
      "Home"
      :
      "Inicio",
    },

    {
      route:
      "catalog",

      label:
      t(
        "nav.perfumes"
      ),
    },

    {
      route:
      "best",

      label:
      t(
        "nav.best"
      ),
    },

    {
      route:
      "collections",

      label:
      t(
        "nav.collections"
      ),
    },

    {
      route:
      "decants",

      label:
      t(
        "nav.decants"
      ),
    },

    {
      route:
      "gifts",

      label:
      t(
        "nav.gifts"
      ),
    },

    {
      route:
      "games",

      label:
      t(
        "nav.games"
      ),
    },

    {
      route:
      "advisor",

      label:
      state.language === "en"
      ?
      "Fragrance advisor"
      :
      "Asesor de perfumes",
    },

    {
      route:
      "favorites",

      label:
      t(
        "nav.favorites"
      ),
    },

    {
      route:
      "order-tracking",

      label:
      state.language === "en"
      ?
      "Track order"
      :
      "Seguir pedido",
    },

    {
      route:
      "club",

      label:
      state.language === "en"
      ?
      "AromaLParfum Club"
      :
      "Club AromaLParfum",
    },

    {
      route:
      "contact",

      label:
      t(
        "nav.contact"
      ),
    },

    {
      route:
      "about",

      label:
      t(
        "nav.about"
      ),
    },

    {
      route:
      "admin",

      label:
      t(
        "nav.admin"
      ),
    },
  ];

  host.innerHTML =
  entries
  .map(
    item =>
    `
      <button
        class="menu-link"
        type="button"
        data-route="${escapeAttribute(item.route)}">
        ${escapeHtml(item.label)}
      </button>
    `
  )
  .join(
    ""
  );
}

function renderFooter()
{
  const footer =
  document.getElementById(
    "siteFooter"
  );

  if (
    !footer
  )
  {
    return;
  }

  const contact =
  getSiteSettingObject(
    "contact"
  );

  const social =
  {
    ...contact,
    ...getSiteSettingObject(
      "social_links"
    ),
  };

  footer.innerHTML =
  `
    <div class="container">
      <div class="footer-grid">
        <div>
          <div class="footer-brand">
            AROMALPARFUM
          </div>

          <h4>
            ${escapeHtml(t("footer.know"))}
          </h4>

          <p class="footer-copy">
            ${escapeHtml(t("footer.know.text"))}
          </p>

          <div class="social-row">
            ${renderSocialButton("instagram", social.instagram)}
            ${renderSocialButton("tiktok", social.tiktok)}
            ${renderSocialButton("facebook", social.facebook)}
            ${renderSocialButton("youtube", social.youtube)}
          </div>
        </div>

        <div>
          <h4>
            ${escapeHtml(t("footer.shop"))}
          </h4>

          <button class="footer-link" type="button" data-route="catalog">
            ${escapeHtml(t("nav.perfumes"))}
          </button>

          <button class="footer-link" type="button" data-route="best">
            ${escapeHtml(t("nav.best"))}
          </button>

          <button class="footer-link" type="button" data-route="decants">
            ${escapeHtml(t("nav.decants"))}
          </button>

          <button class="footer-link" type="button" data-route="gifts">
            ${escapeHtml(t("nav.gifts"))}
          </button>
        </div>

        <div>
          <h4>
            ${escapeHtml(t("footer.about"))}
          </h4>

          <button class="footer-link" type="button" data-route="collections">
            ${escapeHtml(t("nav.collections"))}
          </button>

          <button class="footer-link" type="button" data-route="games">
            ${escapeHtml(t("nav.games"))}
          </button>

          <button class="footer-link" type="button" data-route="about">
            ${escapeHtml(t("nav.about"))}
          </button>

          <button class="footer-link" type="button" data-route="contact">
            ${escapeHtml(t("nav.contact"))}
          </button>
        </div>

        <div>
          <h4>
            ${escapeHtml(t("footer.help"))}
          </h4>

          <button class="footer-link" type="button" data-route="advisor">
            ${state.language === "en" ? "Fragrance advisor" : "Asesor de perfumes"}
          </button>

          <button class="footer-link" type="button" data-route="favorites">
            ${escapeHtml(t("nav.favorites"))}
          </button>

          <button class="footer-link" type="button" data-route="order-tracking">
            ${state.language === "en" ? "Track order" : "Seguimiento de pedido"}
          </button>

          <button class="footer-link" type="button" data-route="club">
            ${state.language === "en" ? "AromaLParfum Club" : "Club AromaLParfum"}
          </button>

          <button class="footer-link" type="button" data-action="open-cart">
            ${escapeHtml(t("cart.title"))}
          </button>
        </div>

        <div>
          <h4>
            AromaLParfum
          </h4>

          <p class="footer-copy">
            WhatsApp:
            ${escapeHtml(contact.whatsapp || CONFIG.whatsappNumber)}
          </p>

          <p class="footer-copy">
            ${escapeHtml(contact.email || "")}
          </p>
        </div>
      </div>

      <div class="footer-bottom">
        <span>
          © ${new Date().getFullYear()} AromaLParfum.
          ${escapeHtml(t("footer.rights"))}
        </span>

        <button
          class="footer-link"
          type="button"
          data-route="admin">
          ${escapeHtml(t("nav.admin"))}
        </button>
      </div>
    </div>
  `;
}

function renderSocialButton(
  network,
  url
)
{
  const safeUrl =
  String(
    url ||
    ""
  ).trim();

  if (
    safeUrl === ""
  )
  {
    return "";
  }

  const iconMap =
  {
    instagram:
    `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3.5" y="3.5" width="17" height="17" rx="5"></rect>
        <circle cx="12" cy="12" r="4"></circle>
        <circle cx="17.3" cy="6.8" r=".8" fill="currentColor" stroke="none"></circle>
      </svg>
    `,

    tiktok:
    `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M14.2 4.2v10.1a4.1 4.1 0 1 1-3.4-4"></path>
        <path d="M14.2 4.2c.8 2.5 2.3 3.9 4.8 4.4"></path>
      </svg>
    `,

    facebook:
    `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M13.8 21v-8h2.8l.5-3h-3.3V8.1c0-.9.3-1.6 1.7-1.6h1.8V3.8c-.4-.1-1.4-.2-2.6-.2-2.6 0-4.3 1.5-4.3 4.4v2H7.6v3h2.8v8"></path>
      </svg>
    `,

    youtube:
    `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="3" y="6" width="18" height="12" rx="4"></rect>
        <path d="m10 9 5 3-5 3z" fill="currentColor" stroke="none"></path>
      </svg>
    `,
  };

  const icon =
  iconMap[
    network
  ]
  ||
  escapeHtml(
    network
    .slice(
      0,
      2
    )
    .toUpperCase()
  );

  return `
    <a
      class="social-btn"
      href="${escapeAttribute(safeUrl)}"
      target="_blank"
      rel="noopener noreferrer"
      aria-label="${escapeAttribute(network)}">
      ${icon}
    </a>
  `;
}

function getFeaturedProducts()
{
  const explicit =
  state.products
  .filter(
    product =>
    product.destacado === true &&
    product.stock > 0
  );

  if (
    explicit.length
  )
  {
    return explicit;
  }

  return state.products
  .filter(
    product =>
    product.stock > 0
  )
  .slice(
    0,
    10
  );
}

function getNewProducts()
{
  return state.products
  .filter(
    product =>
    isNewProduct(
      product
    )
  )
  .sort(
    (
      a,
      b
    ) =>
    {
      const dateA =
      new Date(
        a.created_at
        ||
        0
      )
      .getTime();

      const dateB =
      new Date(
        b.created_at
        ||
        0
      )
      .getTime();

      return dateB - dateA;
    }
  );
}

function getBestSellerProducts()
{
  return [
    ...state.products,
  ]
  .sort(
    (
      a,
      b
    ) =>
    {
      const popularityDiff =
      getPopularity(
        b.id
      )
      -
      getPopularity(
        a.id
      );

      if (
        popularityDiff !== 0
      )
      {
        return popularityDiff;
      }

      return (
        Number(
          b.destacado
        )
        -
        Number(
          a.destacado
        )
      );
    }
  );
}

function getHeroCollections()
{
  const collections =
  state.collections
  .filter(
    collection =>
    collection.activo !== false
  );

  return collections.length
  ?
  collections
  :
  CONFIG.collectionFallbacks;
}

function getProductsForCollection(
  collection
)
{
  if (
    !collection
  )
  {
    return [];
  }

  const station =
  normalizeText(
    collection.estacion
  );

  const occasion =
  normalizeText(
    collection.ocasion
  );

  return state.products.filter(
    product =>
    {
      if (
        collection.tipo === "seasonal" &&
        station
      )
      {
        return arrayFromDb(
          product.estaciones
        )
        .some(
          value =>
          normalizeText(
            value
          ) ===
          station
        );
      }

      if (
        collection.tipo === "occasion" &&
        occasion
      )
      {
        return arrayFromDb(
          product.ocasiones
        )
        .some(
          value =>
          normalizeText(
            value
          ) ===
          occasion
        );
      }

      return false;
    }
  );
}

function getHeroProductForCollection(
  collection
)
{
  const matches =
  getProductsForCollection(
    collection
  );

  const imageMatch =
  matches.find(
    product =>
    Boolean(
      getProductMainImage(
        product
      )
    )
  );

  return (
    imageMatch
    ||
    matches[0]
    ||
    getFeaturedProducts().find(
      product =>
      Boolean(
        getProductMainImage(
          product
        )
      )
    )
    ||
    getFeaturedProducts()[0]
    ||
    state.products[0]
    ||
    null
  );
}

function renderHomePage()
{
  const heroCollections =
  getHeroCollections();

  const safeHeroIndex =
  clamp(
    state.heroCollectionIndex,
    0,
    Math.max(
      0,
      heroCollections.length - 1
    )
  );

  state.heroCollectionIndex =
  safeHeroIndex;

  const heroCollection =
  heroCollections[
    safeHeroIndex
  ];

  const heroProduct =
  getHeroProductForCollection(
    heroCollection
  );

  const featured =
  getFeaturedProducts()
  .slice(
    0,
    10
  );

  const newProducts =
  getNewProducts()
  .slice(
    0,
    10
  );

  const best =
  getBestSellerProducts()
  .filter(
    product =>
    getPopularity(
      product.id
    ) > 0
  )
  .slice(
    0,
    10
  );

  return `
    ${renderHero(heroCollection, heroProduct, heroCollections)}

    ${renderCategoryRail()}

    ${renderSeasonalVideo()}

    ${renderProductRowSection(
      t("featured.eyebrow"),
      t("featured.title"),
      featured,
      {
        route:
        "catalog",

        actionLabel:
        t("featured.viewall"),

        badge:
        "featured",
      }
    )}

    ${renderProductRowSection(
      t("new.eyebrow"),
      t("new.title"),
      newProducts,
      {
        route:
        "catalog",

        filter:
        "Nuevo",

        badge:
        "new",
      }
    )}

    ${best.length
      ?
      renderProductRowSection(
        t("best.eyebrow"),
        t("best.title"),
        best,
        {
          route:
          "best",

          badge:
          "best",

          description:
          t("best.description"),
        }
      )
      :
      ""
    }

    ${renderPromoBuilders()}

    ${renderAdvisorTeaser()}

    ${renderServiceStrip()}
  `;
}

function renderHero(
  collection,
  product,
  collections
)
{
  const customCover =
  getCollectionCoverUrl(
    collection?.slug || ""
  )
  ||
  getSiteCoverUrl(
    "hero"
  );

  const fallbackImage =
  product
  ?
  getProductMainImage(
    product
  )
  :
  "";

  const image =
  customCover
  ||
  fallbackImage;

  const hasCustomCover =
  Boolean(
    customCover
  );

  const coverPosition =
  coverPositionCss(
    getSiteCoverPosition(
      "hero"
    )
  );

  const collectionName =
  localizedCollectionName(
    collection
  )
  ||
  t(
    "hero.eyebrow"
  );

  const collectionDescription =
  localizedCollectionDescription(
    collection
  )
  ||
  t(
    "hero.description"
  );

  const heroStyle =
  hasCustomCover
  ?
  `style="--hero-cover-image:url(&quot;${escapeAttribute(customCover)}&quot;);--hero-cover-position:${escapeAttribute(coverPosition)};--hero-cover-position-mobile:${escapeAttribute(coverPosition)};"`
  :
  "";

  return `
    <section
      class="luxury-hero ${hasCustomCover ? "hero-cover-active" : ""}"
      ${heroStyle}>
      <div class="container">
        <div class="luxury-hero-grid">
          <div class="hero-copy">
            <p class="eyebrow">
              ${escapeHtml(collectionName)}
            </p>

            <h1>
              ${escapeHtml(t("hero.title"))}
            </h1>

            <p>
              ${escapeHtml(collectionDescription)}
            </p>

            <button
              class="btn"
              type="button"
              data-route="collection"
              data-collection-slug="${escapeAttribute(collection?.slug || "")}">
              ${escapeHtml(t("hero.cta"))}
              <span aria-hidden="true">→</span>
            </button>
          </div>

          ${hasCustomCover
            ?
            ""
            :
            `
              <div class="hero-visual">
                <div class="hero-product-stage">
                  ${image
                    ?
                    `
                      <img
                        src="${escapeAttribute(image)}"
                        alt="${escapeAttribute(product?.nombre || "Perfume")}">
                    `
                    :
                    `
                      <div class="hero-product-fallback">
                        ${escapeHtml(product?.nombre || "AromaLParfum")}
                      </div>
                    `
                  }
                </div>
              </div>

              <div class="hero-benefits">
                <div class="hero-benefit">
                  <span class="hero-benefit-icon">✦</span>
                  <span>${escapeHtml(t("hero.benefit1"))}</span>
                </div>

                <div class="hero-benefit">
                  <span class="hero-benefit-icon">◌</span>
                  <span>${escapeHtml(t("hero.benefit2"))}</span>
                </div>

                <div class="hero-benefit">
                  <span class="hero-benefit-icon">🎁</span>
                  <span>${escapeHtml(t("hero.benefit3"))}</span>
                </div>

                <div class="hero-benefit">
                  <span class="hero-benefit-icon">♡</span>
                  <span>${escapeHtml(t("hero.benefit4"))}</span>
                </div>
              </div>
            `
          }
        </div>
      </div>

      <div class="hero-collection-tabs">
        ${collections
          .map(
            (
              item,
              index
            ) =>
            `
              <button
                class="hero-collection-tab ${index === state.heroCollectionIndex ? "active" : ""}"
                type="button"
                data-action="select-hero-collection"
                data-index="${index}">
                ${(item.emoji || "") + " " + escapeHtml(localizedCollectionName(item))}
              </button>
            `
          )
          .join("")
        }
      </div>
    </section>
  `;
}

function renderCategoryRail()
{
  const categories =
  [
    {
      icon:
      "♀",

      label:
      t(
        "category.women"
      ),

      route:
      "catalog",

      filter:
      "Mujer",
    },

    {
      icon:
      "♂",

      label:
      t(
        "category.men"
      ),

      route:
      "catalog",

      filter:
      "Hombre",
    },

    {
      icon:
      "⚥",

      label:
      t(
        "category.unisex"
      ),

      route:
      "catalog",

      filter:
      "Unisex",
    },

    {
      icon:
      "🎁",

      label:
      t(
        "category.giftsets"
      ),

      route:
      "gift-sets",
    },

    {
      icon:
      "✦",

      label:
      t(
        "category.giftideas"
      ),

      route:
      "gifts",
    },

    {
      icon:
      "🧴",

      label:
      t(
        "category.care"
      ),

      route:
      "personal-care",
    },

    {
      icon:
      "▦",

      label:
      t(
        "category.discovery"
      ),

      route:
      "discovery",
    },
  ];

  return `
    <div class="category-rail-wrap">
      <div class="container">
        <div class="category-rail">
          ${categories
            .map(
              item =>
              `
                <button
                  class="category-tile"
                  type="button"
                  data-route="${escapeAttribute(item.route)}"
                  ${item.filter ? `data-filter="${escapeAttribute(item.filter)}"` : ""}>
                  <span class="category-icon" aria-hidden="true">
                    ${escapeHtml(item.icon)}
                  </span>

                  <strong>
                    ${escapeHtml(item.label)}
                  </strong>
                </button>
              `
            )
            .join("")
          }
        </div>
      </div>
    </div>
  `;
}

function renderSeasonalVideo()
{
  const video =
  getSiteSettingObject(
    "seasonal_video"
  );

  const source =
  getSeasonalVideoUrl();

  if (
    video.enabled !== true ||
    !source
  )
  {
    return "";
  }

  const title =
  (
    state.language === "en"
    ?
    video.title_en
    :
    video.title_es
  )
  ||
  (
    state.language === "en"
    ?
    "Seasonal Fragrances"
    :
    "Perfumes de temporada"
  );

  const autoplay =
  video.autoplay === true;

  const muted =
  autoplay
  ?
  true
  :
  video.muted === true;

  const loop =
  video.loop !== false;

  return `
    <section class="seasonal-video">
      <div class="container">
        <div class="seasonal-video-grid">
          <div class="seasonal-video-copy">
            <p class="eyebrow">
              ${escapeHtml(t("hero.eyebrow"))}
            </p>

            <h2>
              ${escapeHtml(title)}
            </h2>

            <p>
              ${escapeHtml(t("hero.description"))}
            </p>
          </div>

          <div class="seasonal-video-media">
            <video
              controls
              playsinline
              preload="metadata"
              ${autoplay ? "autoplay" : ""}
              ${muted ? "muted" : ""}
              ${loop ? "loop" : ""}
              src="${escapeAttribute(source)}">
            </video>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderProductRowSection(
  eyebrow,
  title,
  products,
  options = {}
)
{
  if (
    !products ||
    products.length === 0
  )
  {
    return "";
  }

  return `
    <section class="section">
      <div class="container">
        <div class="section-title-row">
          <div>
            <p class="eyebrow">
              ${escapeHtml(eyebrow)}
            </p>

            <h2 class="section-title">
              ${escapeHtml(title)}
            </h2>

            ${options.description
              ?
              `
                <p class="section-subtitle">
                  ${escapeHtml(options.description)}
                </p>
              `
              :
              ""
            }
          </div>

          ${options.route
            ?
            `
              <button
                class="text-link"
                type="button"
                data-route="${escapeAttribute(options.route)}"
                ${options.filter ? `data-filter="${escapeAttribute(options.filter)}"` : ""}>
                ${escapeHtml(options.actionLabel || t("featured.viewall"))}
                <span aria-hidden="true">→</span>
              </button>
            `
            :
            ""
          }
        </div>

        <div class="product-row-scroller">
          ${products
            .map(
              product =>
              renderProductCard(
                product,
                {
                  badge:
                  options.badge,
                }
              )
            )
            .join("")
          }
        </div>
      </div>
    </section>
  `;
}

function renderProductCard(
  product,
  options = {}
)
{
  const image =
  getProductMainImage(
    product
  );

  const badges =
  [];

  if (
    isNewProduct(
      product
    )
  )
  {
    badges.push(
      {
        type:
        "new",

        text:
        t(
          "product.new"
        ),
      }
    );
  }

  if (
    product.destacado
  )
  {
    badges.push(
      {
        type:
        "featured",

        text:
        t(
          "product.featured"
        ),
      }
    );
  }

  if (
    options.badge === "best" ||
    getPopularity(
      product.id
    ) > 0 &&
    getBestSellerProducts()
    .slice(
      0,
      5
    )
    .some(
      item =>
      item.id === product.id
    )
  )
  {
    badges.push(
      {
        type:
        "best",

        text:
        t(
          "product.best"
        ),
      }
    );
  }

  const notes =
  [
    localizedField(
      product,
      "salida"
    ),

    localizedField(
      product,
      "corazon"
    ),
  ]
  .filter(
    Boolean
  )
  .join(
    " · "
  );

  return `
    <article class="product-card">
      <div class="product-media">
        <div class="product-badges">
          ${badges
            .slice(
              0,
              2
            )
            .map(
              badge =>
              `
                <span class="badge ${escapeAttribute(badge.type)}">
                  ${escapeHtml(badge.text)}
                </span>
              `
            )
            .join("")
          }
        </div>

        <button
          class="fav-mini ${isFavorite(product.id) ? "active" : ""}"
          type="button"
          aria-label="${escapeAttribute(t("nav.favorites"))}"
          data-action="toggle-favorite"
          data-product-id="${product.id}">
          ${isFavorite(product.id) ? "♥" : "♡"}
        </button>

        <button
          type="button"
          style="all:unset;cursor:pointer;width:100%;height:100%;display:block"
          data-route="product"
          data-product-id="${product.id}">
          ${image
            ?
            `
              <img
                src="${escapeAttribute(image)}"
                alt="${escapeAttribute(product.nombre)}"
                loading="lazy"
                decoding="async">
            `
            :
            `
              <div class="product-placeholder">
                ${escapeHtml(product.nombre)}
              </div>
            `
          }
        </button>
      </div>

      <div class="product-body">
        <div class="product-kicker">
          ${escapeHtml(product.marca || product.categoria)}
          ·
          ${escapeHtml(product.genero)}
        </div>

        <h3 class="product-title">
          ${escapeHtml(product.nombre)}
        </h3>

        <p class="product-notes">
          ${escapeHtml(notes || localizedField(product, "familia") || t("common.consult"))}
        </p>

        <div class="product-bottom">
          <span class="product-price">
            ${money(product.precio)}
          </span>

          <button
            class="add-circle"
            type="button"
            title="${escapeAttribute(t("product.add"))}"
            data-action="add-product"
            data-product-id="${product.id}"
            ${product.stock <= 0 ? "disabled" : ""}>
            +
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderPromoBuilders()
{
  const decantImage =
  getSiteCoverUrl(
    "decants"
  )
  ||
  getFeaturedProducts()
  .map(
    product =>
    getProductMainImage(
      product
    )
  )
  .find(
    Boolean
  )
  ||
  "";

  const giftImage =
  getSiteCoverUrl(
    "gifts"
  )
  ||
  getNewProducts()
  .concat(
    getFeaturedProducts()
  )
  .map(
    product =>
    getProductMainImage(
      product
    )
  )
  .find(
    Boolean
  )
  ||
  "";

  return `
    <section class="section compact">
      <div class="container">
        <div class="promo-grid">
          <article class="promo-card dark">
            <div class="promo-content">
              <p class="eyebrow">
                ${escapeHtml(t("promo.decant.eyebrow"))}
              </p>

              <h3>
                ${escapeHtml(t("promo.decant.title"))}
              </h3>

              <p>
                ${escapeHtml(t("promo.decant.description"))}
              </p>

              <div>
                <button
                  class="btn light"
                  type="button"
                  data-route="decants">
                  ${escapeHtml(t("promo.decant.cta"))}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>

            ${decantImage
              ?
              `
                <div class="promo-visual" aria-hidden="true">
                  <img
                    src="${escapeAttribute(decantImage)}"
                    alt=""
                    loading="lazy"
                    decoding="async">
                </div>
              `
              :
              ""
            }
          </article>

          <article class="promo-card light">
            <div class="promo-content">
              <p class="eyebrow">
                ${escapeHtml(t("promo.gift.eyebrow"))}
              </p>

              <h3>
                ${escapeHtml(t("promo.gift.title"))}
              </h3>

              <p>
                ${escapeHtml(t("promo.gift.description"))}
              </p>

              <div>
                <button
                  class="btn outline"
                  type="button"
                  data-route="gifts">
                  ${escapeHtml(t("promo.gift.cta"))}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </div>

            ${giftImage
              ?
              `
                <div class="promo-visual" aria-hidden="true">
                  <img
                    src="${escapeAttribute(giftImage)}"
                    alt=""
                    loading="lazy"
                    decoding="async">
                </div>
              `
              :
              ""
            }
          </article>
        </div>
      </div>
    </section>
  `;
}

function renderAdvisorTeaser()
{
  const enabled =
  isAiEnabled(
    "advisor_enabled"
  );

  return `
    <section class="section">
      <div class="container">
        <div class="advisor-teaser-pro">
          <div class="advisor-teaser-copy">
            <p class="eyebrow">
              ${escapeHtml(t("advisor.eyebrow"))}
            </p>

            <h2>
              ${escapeHtml(t("advisor.title"))}
            </h2>

            <p class="section-subtitle">
              ${escapeHtml(
                enabled
                ?
                t("advisor.description")
                :
                t("advisor.disabled")
              )}
            </p>

            <div class="advisor-status ${enabled ? "" : "offline"}">
              <span class="advisor-status-dot" aria-hidden="true"></span>
              <span>
                ${escapeHtml(
                  enabled
                  ?
                  (state.language === "en" ? "AI assistant available" : "Asesor IA disponible")
                  :
                  (state.language === "en" ? "Ready to activate later" : "Preparado para activar más adelante")
                )}
              </span>
            </div>
          </div>

          ${getSiteCoverUrl("advisor")
            ?
            `
              <div class="advisor-teaser-visual has-cover" aria-hidden="true">
                <img
                  src="${escapeAttribute(getSiteCoverUrl("advisor"))}"
                  alt=""
                  loading="lazy"
                  decoding="async">
              </div>
            `
            :
            `
              <div class="advisor-teaser-visual" aria-hidden="true">
                <div class="advisor-orbit">✦</div>
              </div>
            `
          }

          <button
            class="btn"
            type="button"
            data-route="advisor">
            ${escapeHtml(t("advisor.send"))}
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>
    </section>
  `;
}

function renderServiceStrip()
{
  const services =
  [
    {
      icon:
      "🚚",

      title:
      t(
        "services.shipping.title"
      ),

      text:
      t(
        "services.shipping.text"
      ),
    },

    {
      icon:
      "✦",

      title:
      t(
        "services.support.title"
      ),

      text:
      t(
        "services.support.text"
      ),
    },

    {
      icon:
      "↺",

      title:
      t(
        "services.secure.title"
      ),

      text:
      t(
        "services.secure.text"
      ),
    },

    {
      icon:
      "▣",

      title:
      t(
        "services.choice.title"
      ),

      text:
      t(
        "services.choice.text"
      ),
    },
  ];

  return `
    <div class="service-strip">
      ${services
        .map(
          service =>
          `
            <div class="service-item">
              <span class="service-icon" aria-hidden="true">
                ${escapeHtml(service.icon)}
              </span>

              <div>
                <strong>
                  ${escapeHtml(service.title)}
                </strong>

                <span>
                  ${escapeHtml(service.text)}
                </span>
              </div>
            </div>
          `
        )
        .join("")
      }
    </div>
  `;
}

function getCatalogProducts()
{
  const filter =
  state.catalogFilter;

  const searchTerm =
  normalizeText(
    state.catalogSearch
  );

  let list =
  state.products.filter(
    product =>
    {
      if (
        filter === "Nuevo"
      )
      {
        if (
          !isNewProduct(
            product
          )
        )
        {
          return false;
        }
      }
      else if (
        filter === "Destacado"
      )
      {
        if (
          !product.destacado
        )
        {
          return false;
        }
      }
      else if (
        filter !== "Todos"
      )
      {
        const matches =
        [
          product.categoria,
          product.genero,
          product.tipo_producto_slug,
          product.tipo_producto,
        ]
        .some(
          value =>
          normalizeText(
            value
          ) ===
          normalizeText(
            filter
          )
        );

        if (
          !matches
        )
        {
          return false;
        }
      }

      if (
        searchTerm
      )
      {
        const haystack =
        normalizeText(
          [
            product.nombre,
            product.marca,
            product.categoria,
            product.genero,
            product.familia,
            product.salida,
            product.corazon,
            product.fondo,
          ]
          .join(
            " "
          )
        );

        if (
          !haystack.includes(
            searchTerm
          )
        )
        {
          return false;
        }
      }

      return true;
    }
  );

  switch (
    state.catalogSort
  )
  {
    case "low":
    {
      list.sort(
        (
          a,
          b
        ) =>
        a.precio -
        b.precio
      );

      break;
    }

    case "high":
    {
      list.sort(
        (
          a,
          b
        ) =>
        b.precio -
        a.precio
      );

      break;
    }

    case "name":
    {
      list.sort(
        (
          a,
          b
        ) =>
        a.nombre.localeCompare(
          b.nombre,
          currentLanguage()
        )
      );

      break;
    }

    case "stock":
    {
      list.sort(
        (
          a,
          b
        ) =>
        b.stock -
        a.stock
      );

      break;
    }

    default:
    {
      list.sort(
        (
          a,
          b
        ) =>
        {
          const featuredDiff =
          Number(
            b.destacado
          )
          -
          Number(
            a.destacado
          );

          if (
            featuredDiff !== 0
          )
          {
            return featuredDiff;
          }

          return (
            getPopularity(
              b.id
            )
            -
            getPopularity(
              a.id
            )
          );
        }
      );
    }
  }

  return list;
}

function renderCatalogPage()
{
  const list =
  getCatalogProducts();

  const pageSize =
  Math.max(
    1,
    asNumber(
      state.catalogPageSize,
      24
    )
  );

  const totalPages =
  Math.max(
    1,
    Math.ceil(
      list.length /
      pageSize
    )
  );

  state.catalogPage =
  Math.min(
    totalPages,
    Math.max(
      1,
      asNumber(
        state.catalogPage,
        1
      )
    )
  );

  const pageStart =
  (
    state.catalogPage -
    1
  )
  *
  pageSize;

  const pageItems =
  list.slice(
    pageStart,
    pageStart +
    pageSize
  );

  const chips =
  [
    "Todos",
    "Nuevo",
    "Destacado",
    "Hombre",
    "Mujer",
    "Unisex",
    "Árabe",
    "Argentina",
    "Nicho",
    "Diseñador",
  ];

  const visiblePages =
  [];

  if (
    totalPages <=
    7
  )
  {
    for (
      let page = 1;
      page <= totalPages;
      page += 1
    )
    {
      visiblePages.push(
        page
      );
    }
  }
  else
  {
    const candidates =
    new Set(
      [
        1,
        totalPages,
        state.catalogPage - 2,
        state.catalogPage - 1,
        state.catalogPage,
        state.catalogPage + 1,
        state.catalogPage + 2,
      ]
      .filter(
        page =>
        page >= 1 &&
        page <= totalPages
      )
    );

    visiblePages.push(
      ...Array.from(
        candidates
      )
      .sort(
        (
          a,
          b
        ) =>
        a - b
      )
    );
  }

  const pageButtons =
  [];

  let previousPage =
  null;

  for (
    const page of
    visiblePages
  )
  {
    if (
      previousPage !== null &&
      page -
      previousPage >
      1
    )
    {
      pageButtons.push(
        `
          <span
            class="catalog-page-info"
            style="width:auto;margin:0 2px">
            …
          </span>
        `
      );
    }

    pageButtons.push(
      `
        <button
          class="catalog-page-btn ${page === state.catalogPage ? "active" : ""}"
          type="button"
          data-action="catalog-page"
          data-page="${page}">
          ${page}
        </button>
      `
    );

    previousPage =
    page;
  }

  return `
    <section class="section">
      <div class="container">
        <div class="section-title-row">
          <div>
            <p class="eyebrow">
              ${escapeHtml(t("catalog.eyebrow"))}
            </p>

            <h1 class="section-title">
              ${escapeHtml(t("catalog.title"))}
            </h1>

            <p class="section-subtitle">
              ${formatInteger(list.length)}
              ${state.language === "en" ? "products" : "productos"}
              ${list.length
                ?
                ` · ${state.language === "en" ? "Page" : "Página"} ${state.catalogPage} ${state.language === "en" ? "of" : "de"} ${totalPages}`
                :
                ""
              }
            </p>
          </div>
        </div>

        <div class="chips">
          ${chips
            .map(
              chip =>
              `
                <button
                  class="chip ${state.catalogFilter === chip ? "active" : ""}"
                  type="button"
                  data-action="catalog-filter"
                  data-filter="${escapeAttribute(chip)}">
                  ${escapeHtml(
                    chip === "Todos"
                    ?
                    t("common.all")
                    :
                    chip === "Nuevo"
                    ?
                    t("product.new")
                    :
                    chip === "Destacado"
                    ?
                    t("product.featured")
                    :
                    chip
                  )}
                </button>
              `
            )
            .join("")
          }
        </div>

        <div class="catalog-toolbar">
          <input
            id="catalogSearch"
            class="search-input"
            type="search"
            value="${escapeAttribute(state.catalogSearch)}"
            placeholder="${escapeAttribute(t("catalog.search"))}">

          <select
            id="catalogSort"
            class="select-input">
            <option value="default" ${state.catalogSort === "default" ? "selected" : ""}>
              ${escapeHtml(t("catalog.sort.default"))}
            </option>

            <option value="low" ${state.catalogSort === "low" ? "selected" : ""}>
              ${escapeHtml(t("catalog.sort.low"))}
            </option>

            <option value="high" ${state.catalogSort === "high" ? "selected" : ""}>
              ${escapeHtml(t("catalog.sort.high"))}
            </option>

            <option value="name" ${state.catalogSort === "name" ? "selected" : ""}>
              ${escapeHtml(t("catalog.sort.name"))}
            </option>

            <option value="stock" ${state.catalogSort === "stock" ? "selected" : ""}>
              ${escapeHtml(t("catalog.sort.stock"))}
            </option>
          </select>

          <button
            class="btn outline"
            type="button"
            data-action="clear-catalog">
            ${escapeHtml(t("common.none"))}
          </button>
        </div>

        ${list.length
          ?
          `
            <div class="catalog-grid">
              ${pageItems
                .map(
                  product =>
                  renderProductCard(
                    product
                  )
                )
                .join("")
              }
            </div>

            ${totalPages > 1
              ?
              `
                <nav
                  class="catalog-pagination"
                  aria-label="${escapeAttribute(state.language === "en" ? "Catalog pages" : "Páginas del catálogo")}">

                  <button
                    class="catalog-page-btn"
                    type="button"
                    data-action="catalog-page"
                    data-page="${Math.max(1, state.catalogPage - 1)}"
                    ${state.catalogPage <= 1 ? "disabled" : ""}>
                    ←
                  </button>

                  ${pageButtons.join("")}

                  <button
                    class="catalog-page-btn"
                    type="button"
                    data-action="catalog-page"
                    data-page="${Math.min(totalPages, state.catalogPage + 1)}"
                    ${state.catalogPage >= totalPages ? "disabled" : ""}>
                    →
                  </button>

                  <div class="catalog-page-info">
                    ${state.language === "en"
                      ? `Showing ${pageStart + 1}–${Math.min(pageStart + pageSize, list.length)} of ${list.length}`
                      : `Mostrando ${pageStart + 1}–${Math.min(pageStart + pageSize, list.length)} de ${list.length}`
                    }
                  </div>
                </nav>
              `
              :
              ""
            }
          `
          :
          `
            <div class="empty-state">
              <h3>
                ${escapeHtml(t("catalog.empty"))}
              </h3>
            </div>
          `
        }
      </div>
    </section>
  `;
}

function renderBestSellersPage()
{
  const list =
  getBestSellerProducts();

  return `
    <section class="section">
      <div class="container">
        ${renderPageCoverBanner("best_sellers", t("best.eyebrow"), t("best.title"), t("best.description"))}

        <div class="section-title-row">
          <div>
            <p class="eyebrow">
              ${escapeHtml(t("best.eyebrow"))}
            </p>

            <h1 class="section-title">
              ${escapeHtml(t("best.title"))}
            </h1>

            <p class="section-subtitle">
              ${escapeHtml(t("best.description"))}
            </p>
          </div>
        </div>

        <div class="catalog-grid">
          ${list
            .map(
              product =>
              renderProductCard(
                product,
                {
                  badge:
                  "best",
                }
              )
            )
            .join("")
          }
        </div>
      </div>
    </section>
  `;
}

function renderCollectionsPage()
{
  const collections =
  getHeroCollections();

  return `
    <section class="section">
      <div class="container">
        ${renderPageCoverBanner("collections", t("collections.eyebrow"), t("collections.title"))}

        <div class="section-title-row">
          <div>
            <p class="eyebrow">
              ${escapeHtml(t("collections.eyebrow"))}
            </p>

            <h1 class="section-title">
              ${escapeHtml(t("collections.title"))}
            </h1>
          </div>
        </div>

        ${collections.length
          ?
          `
            <div class="promo-grid">
              ${collections
                .map(
                  (
                    collection,
                    index
                  ) =>
                  {
                    const products =
                    getProductsForCollection(
                      collection
                    );

                    const product =
                    products.find(
                      item =>
                      getProductMainImage(
                        item
                      )
                    )
                    ||
                    products[0]
                    ||
                    null;

                    const image =
                    product
                    ?
                    getProductMainImage(
                      product
                    )
                    :
                    "";

                    return `
                      <article class="promo-card ${index % 2 === 0 ? "light" : "dark"}">
                        ${image
                          ?
                          `
                            <div class="promo-visual">
                              <img
                                src="${escapeAttribute(image)}"
                                alt="${escapeAttribute(product.nombre)}"
                                loading="lazy"
                                decoding="async">
                            </div>
                          `
                          :
                          ""
                        }

                        <p class="eyebrow">
                          ${escapeHtml(collection.emoji || "✦")}
                          ${escapeHtml(collection.tipo || "")}
                        </p>

                        <h3>
                          ${escapeHtml(localizedCollectionName(collection))}
                        </h3>

                        <p>
                          ${escapeHtml(localizedCollectionDescription(collection))}
                        </p>

                        <div>
                          <button
                            class="btn ${index % 2 === 0 ? "outline" : "light"}"
                            type="button"
                            data-route="collection"
                            data-collection-slug="${escapeAttribute(collection.slug)}">
                            ${escapeHtml(t("hero.cta"))}
                            <span aria-hidden="true">→</span>
                          </button>
                        </div>
                      </article>
                    `;
                  }
                )
                .join("")
              }
            </div>
          `
          :
          `
            <div class="empty-state">
              <h3>
                ${escapeHtml(t("collections.empty"))}
              </h3>
            </div>
          `
        }
      </div>
    </section>
  `;
}

function renderCollectionDetailPage(
  slug
)
{
  const collection =
  getHeroCollections()
  .find(
    item =>
    item.slug === slug
  )
  ||
  getHeroCollections()[0];

  if (
    !collection
  )
  {
    return renderCollectionsPage();
  }

  const products =
  getProductsForCollection(
    collection
  );

  return `
    <section class="section">
      <div class="container">
        <button
          class="text-link"
          type="button"
          data-route="collections">
          ←
          ${escapeHtml(t("common.back"))}
        </button>

        <div class="section-title-row u-mt-18">
          <div>
            <p class="eyebrow">
              ${escapeHtml(collection.emoji || "✦")}
              ${escapeHtml(t("collections.eyebrow"))}
            </p>

            <h1 class="section-title">
              ${escapeHtml(localizedCollectionName(collection))}
            </h1>

            <p class="section-subtitle">
              ${escapeHtml(localizedCollectionDescription(collection))}
            </p>
          </div>
        </div>

        ${products.length
          ?
          `
            <div class="catalog-grid">
              ${products
                .map(
                  product =>
                  renderProductCard(
                    product
                  )
                )
                .join("")
              }
            </div>
          `
          :
          `
            <div class="empty-state">
              <h3>
                ${state.language === "en" ? "No fragrances assigned yet." : "Todavía no hay fragancias asignadas."}
              </h3>
            </div>
          `
        }
      </div>
    </section>
  `;
}

function renderProductDetailPage(
  id
)
{
  const product =
  getProductById(
    id
  );

  if (
    !product
  )
  {
    return `
      <section class="section">
        <div class="container">
          <div class="empty-state">
            <h3>
              ${state.language === "en" ? "Fragrance not found." : "No encontramos ese perfume."}
            </h3>

            <button
              class="btn"
              type="button"
              data-route="catalog">
              ${escapeHtml(t("common.back"))}
            </button>
          </div>
        </div>
      </section>
    `;
  }

  state.selectedProductId =
  product.id;

  const images =
  getProductImages(
    product
  );

  const mainImage =
  state.selectedGalleryUrl &&
  images.includes(
    state.selectedGalleryUrl
  )
  ?
  state.selectedGalleryUrl
  :
  images[0]
  ||
  "";

  state.selectedGalleryUrl =
  mainImage;

  const seasons =
  arrayFromDb(
    product.estaciones
  );

  const occasions =
  arrayFromDb(
    product.ocasiones
  );

  return `
    <section class="section">
      <div class="container">
        <button
          class="text-link"
          type="button"
          data-route="catalog">
          ←
          ${escapeHtml(t("common.back"))}
        </button>

        <div class="detail-layout u-mt-20">
          <div>
            <div class="detail-main-image" id="detailMainImage">
              ${mainImage
                ?
                `
                  <img
                    src="${escapeAttribute(mainImage)}"
                    alt="${escapeAttribute(product.nombre)}"
                    decoding="async">
                `
                :
                `
                  <div class="product-placeholder">
                    ${escapeHtml(product.nombre)}
                  </div>
                `
              }
            </div>

            ${images.length > 1
              ?
              `
                <div class="detail-thumbs">
                  ${images
                    .map(
                      url =>
                      `
                        <button
                          class="detail-thumb ${url === mainImage ? "active" : ""}"
                          type="button"
                          data-action="select-gallery-image"
                          data-image-url="${escapeAttribute(url)}">
                          <img
                            src="${escapeAttribute(url)}"
                            alt=""
                            loading="lazy"
                            decoding="async">
                        </button>
                      `
                    )
                    .join("")
                  }
                </div>
              `
              :
              ""
            }
          </div>

          <div class="detail-copy">
            <p class="eyebrow">
              ${escapeHtml(product.marca || product.categoria)}
              ·
              ${escapeHtml(product.genero)}
            </p>

            <h1>
              ${escapeHtml(product.nombre)}
            </h1>

            <div class="detail-price">
              ${money(product.precio)}
            </div>

            <p class="section-subtitle">
              ${product.ml ? `${product.ml} ml · ` : ""}
              ${product.stock > 0 ? escapeHtml(t("product.available")) : escapeHtml(t("product.out"))}
            </p>

            <p class="detail-description">
              ${escapeHtml(localizedField(product, "descripcion") || t("common.consult"))}
            </p>

            <div class="u-mt-20" style="display:flex;gap:8px;flex-wrap:wrap">
              <button
                class="btn"
                type="button"
                data-action="add-product"
                data-product-id="${product.id}"
                ${product.stock <= 0 ? "disabled" : ""}>
                ${escapeHtml(t("product.add"))}
              </button>

              <button
                class="btn outline"
                type="button"
                data-action="toggle-favorite"
                data-product-id="${product.id}">
                ${isFavorite(product.id) ? "♥" : "♡"}
                ${escapeHtml(t("nav.favorites"))}
              </button>
            </div>

            <div class="note-grid">
              <div class="note-card">
                <strong>
                  ${escapeHtml(t("product.notes.top"))}
                </strong>

                <span>
                  ${escapeHtml(localizedField(product, "salida") || t("common.consult"))}
                </span>
              </div>

              <div class="note-card">
                <strong>
                  ${escapeHtml(t("product.notes.heart"))}
                </strong>

                <span>
                  ${escapeHtml(localizedField(product, "corazon") || t("common.consult"))}
                </span>
              </div>

              <div class="note-card">
                <strong>
                  ${escapeHtml(t("product.notes.base"))}
                </strong>

                <span>
                  ${escapeHtml(localizedField(product, "fondo") || t("common.consult"))}
                </span>
              </div>
            </div>

            <div class="detail-info">
              ${renderDetailInfoRow(t("product.brand"), product.marca || t("common.consult"))}
              ${renderDetailInfoRow(t("product.family"), localizedField(product, "familia") || t("common.consult"))}
              ${renderDetailInfoRow(t("product.size"), product.ml ? `${product.ml} ml` : t("common.consult"))}
              ${renderDetailInfoRow(t("product.stock"), String(product.stock))}
              ${renderDetailInfoRow(t("product.duration"), localizedField(product, "duracion") || t("common.consult"))}
              ${renderDetailInfoRow(t("product.projection"), localizedField(product, "proyeccion") || t("common.consult"))}
              ${renderDetailInfoRow(t("product.use"), localizedField(product, "recomendacion_uso") || t("common.consult"))}
              ${renderDetailInfoRow(t("product.seasons"), seasons.join(", ") || t("common.consult"))}
              ${renderDetailInfoRow(t("product.occasions"), occasions.join(", ") || t("common.consult"))}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderDetailInfoRow(
  label,
  value
)
{
  return `
    <div class="detail-info-row">
      <strong>
        ${escapeHtml(label)}
      </strong>

      <span>
        ${escapeHtml(value)}
      </span>
    </div>
  `;
}

function renderFavoritesPage()
{
  const products =
  state.products.filter(
    product =>
    state.favorites.includes(
      product.id
    )
  );

  return `
    <section class="section">
      <div class="container">
        <div class="section-title-row">
          <div>
            <p class="eyebrow">
              ${escapeHtml(t("favorites.eyebrow"))}
            </p>

            <h1 class="section-title">
              ${escapeHtml(t("favorites.title"))}
            </h1>
          </div>
        </div>

        ${products.length
          ?
          `
            <div class="catalog-grid">
              ${products
                .map(
                  product =>
                  renderProductCard(
                    product
                  )
                )
                .join("")
              }
            </div>
          `
          :
          `
            <div class="empty-state">
              <h3>
                ${escapeHtml(t("favorites.empty"))}
              </h3>

              <button
                class="btn"
                type="button"
                data-route="catalog">
                ${escapeHtml(t("favorites.cta"))}
              </button>
            </div>
          `
        }
      </div>
    </section>
  `;
}

function getProductsByGroup(
  group
)
{
  const typeSlugs =
  state.productTypes
  .filter(
    type =>
    type.grupo === group
  )
  .map(
    type =>
    type.slug
  );

  return state.products.filter(
    product =>
    typeSlugs.includes(
      product.tipo_producto_slug
    )
  );
}

function renderPersonalCarePage()
{
  const products =
  getProductsByGroup(
    "personal_care"
  );

  return `
    <section class="section">
      <div class="container">
        ${renderPageCoverBanner("personal_care", t("category.care"), t("category.care"), state.language === "en" ? "Deodorants, body creams, mists, lotions and other personal care products." : "Desodorantes, cremas, body splash, lociones y otros productos de cuidado personal.")}

        <div class="section-title-row">
          <div>
            <p class="eyebrow">
              ${escapeHtml(t("category.care"))}
            </p>

            <h1 class="section-title">
              ${escapeHtml(t("category.care"))}
            </h1>

            <p class="section-subtitle">
              ${state.language === "en"
                ? "Deodorants, body creams, mists, lotions and other personal care products."
                : "Desodorantes, cremas, body splash, lociones y otros productos de cuidado personal."
              }
            </p>
          </div>
        </div>

        ${products.length
          ?
          `
            <div class="catalog-grid">
              ${products.map(renderProductCard).join("")}
            </div>
          `
          :
          `
            <div class="empty-state">
              <h3>
                ${state.language === "en" ? "No personal care products yet." : "Todavía no cargaste productos de cuidado personal."}
              </h3>
            </div>
          `
        }
      </div>
    </section>
  `;
}

function renderGiftSetsPage()
{
  const products =
  getProductsByGroup(
    "gift"
  );

  return `
    <section class="section">
      <div class="container">
        ${renderPageCoverBanner("gift_sets", t("category.giftsets"), t("category.giftsets"))}

        <div class="section-title-row">
          <div>
            <p class="eyebrow">
              ${escapeHtml(t("category.giftsets"))}
            </p>

            <h1 class="section-title">
              ${escapeHtml(t("category.giftsets"))}
            </h1>
          </div>
        </div>

        ${products.length
          ?
          `
            <div class="catalog-grid">
              ${products.map(renderProductCard).join("")}
            </div>
          `
          :
          `
            <div class="empty-state">
              <h3>
                ${state.language === "en" ? "No pre-built gift sets yet." : "Todavía no hay sets de regalo precargados."}
              </h3>

              <button
                class="btn"
                type="button"
                data-route="gifts">
                ${escapeHtml(t("promo.gift.cta"))}
              </button>
            </div>
          `
        }
      </div>
    </section>
  `;
}

function renderDiscoveryPage()
{
  const products =
  getProductsByGroup(
    "decant"
  );

  return `
    <section class="section">
      <div class="container">
        ${renderPageCoverBanner("discovery", "Discovery Sets", "Discovery Sets", state.language === "en" ? "Discover several fragrances before choosing a full bottle." : "Probá varias fragancias antes de elegir un frasco completo.")}

        <div class="section-title-row">
          <div>
            <p class="eyebrow">
              Discovery Sets
            </p>

            <h1 class="section-title">
              Discovery Sets
            </h1>

            <p class="section-subtitle">
              ${state.language === "en"
                ? "Discover several fragrances before choosing a full bottle."
                : "Probá varias fragancias antes de elegir un frasco completo."
              }
            </p>
          </div>

          <button
            class="btn"
            type="button"
            data-route="decants">
            ${escapeHtml(t("promo.decant.cta"))}
          </button>
        </div>

        ${products.length
          ?
          `
            <div class="catalog-grid">
              ${products.map(renderProductCard).join("")}
            </div>
          `
          :
          renderPromoBuilders()
        }
      </div>
    </section>
  `;
}

