"use strict";

// AromaLParfum Frontend V2 — Paso 37
// Módulo: carrito, checkout legado y favoritos

    function productCartKey(
      productId
    )
    {
      return (
        "product:" +
        Number(
          productId
        )
      );
    }

    async function incrementPopularity(
      productId
    )
    {
      try
      {
        const result =
        await supabaseClient.rpc(
          "increment_product_popularity",
          {
            p_product_id:
            Number(
              productId
            ),
          }
        );

        if (
          result.error
        )
        {
          console.warn(
            "No se pudo registrar popularidad:",
            result.error.message
          );

          return;
        }

        const current =
        getPopularity(
          productId
        );

        state.popularity.set(
          Number(
            productId
          ),
          current + 1
        );
      }
      catch (
        error
      )
      {
        console.warn(
          "Popularidad:",
          error
        );
      }
    }

    function addProductToCart(
      productId
    )
    {
      const product =
      getProductById(
        productId
      );

      if (
        !product
      )
      {
        return;
      }

      if (
        product.stock <= 0
      )
      {
        toast(
          t(
            "product.out"
          ),
          "error"
        );

        return;
      }

      const key =
      productCartKey(
        product.id
      );

      const existing =
      state.cart.find(
        line =>
        line.key === key
      );

      if (
        existing
      )
      {
        if (
          existing.qty >= product.stock
        )
        {
          toast(
            state.language === "en"
            ?
            "No more stock is available."
            :
            "No hay más stock disponible.",
            "error"
          );

          return;
        }

        existing.qty +=
        1;
      }
      else
      {
        state.cart.push(
          {
            kind:
            "product",

            key:
            key,

            id:
            product.id,

            productId:
            product.id,

            qty:
            1,
          }
        );
      }

      saveLocalState();

      incrementPopularity(
        product.id
      );

      toast(
        state.language === "en"
        ?
        `${product.nombre} added to cart.`
        :
        `${product.nombre} agregado al carrito.`
      );

      openCart();
    }

    function getCartLineUnitPrice(
      line
    )
    {
      if (
        line.kind === "product"
      )
      {
        const product =
        getProductById(
          line.productId
          ??
          line.id
        );

        return product
        ?
        product.precio
        :
        0;
      }

      return asNumber(
        line.unitPrice,
        0
      );
    }

    function getCartLineTitle(
      line
    )
    {
      if (
        line.kind === "product"
      )
      {
        const product =
        getProductById(
          line.productId
          ??
          line.id
        );

        return product
        ?
        product.nombre
        :
        "Producto";
      }

      return String(
        line.title
        ||
        "Combo"
      );
    }

    function getCartLineImage(
      line
    )
    {
      if (
        line.kind === "product"
      )
      {
        const product =
        getProductById(
          line.productId
          ??
          line.id
        );

        return product
        ?
        getProductMainImage(
          product
        )
        :
        "";
      }

      if (
        line.image
      )
      {
        return line.image;
      }

      if (
        Array.isArray(
          line.items
        ) &&
        line.items.length
      )
      {
        const first =
        getProductById(
          line.items[0].productId
        );

        return first
        ?
        getProductMainImage(
          first
        )
        :
        "";
      }

      return "";
    }

    function getCartLineMeta(
      line
    )
    {
      if (
        line.kind === "product"
      )
      {
        const product =
        getProductById(
          line.productId
          ??
          line.id
        );

        if (
          !product
        )
        {
          return "";
        }

        return [
          product.ml
          ?
          `${product.ml} ml`
          :
          "",

          product.categoria,
        ]
        .filter(
          Boolean
        )
        .join(
          " · "
        );
      }

      if (
        line.bundleType === "decant"
      )
      {
        return (
          state.language === "en"
          ?
          `${line.items?.length || 0} decants`
          :
          `${line.items?.length || 0} decants`
        );
      }

      if (
        line.bundleType === "gift"
      )
      {
        return String(
          line.optionName
          ||
          t(
            "gifts.title"
          )
        );
      }

      return "";
    }

    function getCartSubtotal()
    {
      return state.cart.reduce(
        (
          total,
          line
        ) =>
        total +
        (
          getCartLineUnitPrice(
            line
          )
          *
          Math.max(
            1,
            asNumber(
              line.qty,
              1
            )
          )
        ),
        0
      );
    }

    function renderCart()
    {
      const itemsHost =
      document.getElementById(
        "cartItems"
      );

      const summaryHost =
      document.getElementById(
        "cartSummary"
      );

      if (
        !itemsHost ||
        !summaryHost
      )
      {
        return;
      }

      state.cart =
      state.cart.filter(
        line =>
        {
          if (
            line.kind !== "product"
          )
          {
            return true;
          }

          return Boolean(
            getProductById(
              line.productId
              ??
              line.id
            )
          );
        }
      );

      if (
        state.cart.length === 0
      )
      {
        itemsHost.innerHTML =
        `
          <div class="empty-state">
            <h3>
              ${escapeHtml(t("cart.empty"))}
            </h3>

            <button
              class="btn"
              type="button"
              data-route="catalog">
              ${escapeHtml(t("favorites.cta"))}
            </button>
          </div>
        `;

        summaryHost.innerHTML =
        "";

        saveLocalState();

        return;
      }

      itemsHost.innerHTML =
      state.cart
      .map(
        line =>
        renderCartLine(
          line
        )
      )
      .join(
        ""
      );

      summaryHost.innerHTML =
      `
        <div class="cart-summary">
          <div class="cart-total-row grand">
            <span>
              ${escapeHtml(t("cart.total"))}
            </span>

            <strong>
              ${money(getCartSubtotal())}
            </strong>
          </div>

          <button
            class="btn"
            style="width:100%;margin-top:10px"
            type="button"
            data-action="checkout">
            ${escapeHtml(t("cart.checkout"))}
          </button>
        </div>
      `;

      saveLocalState();
    }

    function renderCartLine(
      line
    )
    {
      const image =
      getCartLineImage(
        line
      );

      const title =
      getCartLineTitle(
        line
      );

      const meta =
      getCartLineMeta(
        line
      );

      const unitPrice =
      getCartLineUnitPrice(
        line
      );

      const qty =
      Math.max(
        1,
        asNumber(
          line.qty,
          1
        )
      );

      return `
        <article class="cart-line">
          <div class="cart-line-image">
            ${image
              ?
              `
                <img
                  src="${escapeAttribute(image)}"
                  alt="${escapeAttribute(title)}">
              `
              :
              `
                <span>
                  ✦
                </span>
              `
            }
          </div>

          <div>
            <h4>
              ${escapeHtml(title)}
            </h4>

            <div class="cart-line-meta">
              ${escapeHtml(meta)}
            </div>

            <div class="cart-line-meta">
              ${money(unitPrice)}
            </div>

            <div class="qty-control">
              <button
                type="button"
                data-action="cart-qty"
                data-cart-key="${escapeAttribute(line.key)}"
                data-delta="-1">
                −
              </button>

              <span>
                ${qty}
              </span>

              <button
                type="button"
                data-action="cart-qty"
                data-cart-key="${escapeAttribute(line.key)}"
                data-delta="1">
                +
              </button>
            </div>

            <button
              class="text-link"
              type="button"
              data-action="remove-cart-line"
              data-cart-key="${escapeAttribute(line.key)}">
              ${escapeHtml(t("cart.remove"))}
            </button>
          </div>

          <strong>
            ${money(unitPrice * qty)}
          </strong>
        </article>
      `;
    }

    function changeCartQuantity(
      key,
      delta
    )
    {
      const line =
      state.cart.find(
        item =>
        item.key === key
      );

      if (
        !line
      )
      {
        return;
      }

      const newQty =
      Math.max(
        0,
        asNumber(
          line.qty,
          1
        )
        +
        asNumber(
          delta,
          0
        )
      );

      if (
        newQty <= 0
      )
      {
        removeCartLine(
          key
        );

        return;
      }

      if (
        line.kind === "product"
      )
      {
        const product =
        getProductById(
          line.productId
          ??
          line.id
        );

        if (
          product &&
          newQty > product.stock
        )
        {
          toast(
            state.language === "en"
            ?
            "No more stock is available."
            :
            "No hay más stock disponible.",
            "error"
          );

          return;
        }
      }

      line.qty =
      newQty;

      saveLocalState();

      renderCart();
    }

    function removeCartLine(
      key
    )
    {
      state.cart =
      state.cart.filter(
        line =>
        line.key !== key
      );

      saveLocalState();

      renderCart();
    }

    function renderCheckout()
    {
      const total =
      getCartSubtotal();

      return `
        <div class="admin-form">
          <div class="settings-card">
            <h3>
              ${escapeHtml(t("checkout.client"))}
            </h3>

            <div class="admin-form-grid">
              <div class="admin-field span-2">
                <label for="checkoutName">
                  ${escapeHtml(t("checkout.name"))}
                </label>

                <input
                  id="checkoutName"
                  class="text-input"
                  type="text"
                  autocomplete="name">
              </div>

              <div class="admin-field">
                <label for="checkoutPhone">
                  ${escapeHtml(t("checkout.phone"))}
                </label>

                <input
                  id="checkoutPhone"
                  class="text-input"
                  type="tel"
                  autocomplete="tel">
              </div>

              <div class="admin-field">
                <label for="checkoutEmail">
                  ${escapeHtml(t("checkout.email"))}
                </label>

                <input
                  id="checkoutEmail"
                  class="text-input"
                  type="email"
                  autocomplete="email">
              </div>
            </div>
          </div>

          <div class="settings-card">
            <h3>
              ${escapeHtml(t("checkout.payment"))}
            </h3>

            <div class="admin-check-row">
              ${[
                ["Transferencia", t("checkout.payment.transfer")],
                ["Efectivo", t("checkout.payment.cash")],
                ["Mercado Pago", t("checkout.payment.mp")],
                ["Otro", t("checkout.payment.other")],
              ]
              .map(
                (
                  pair,
                  index
                ) =>
                `
                  <label class="admin-check">
                    <input
                      type="radio"
                      name="checkoutPayment"
                      value="${escapeAttribute(pair[0])}"
                      ${index === 0 ? "checked" : ""}>
                    ${escapeHtml(pair[1])}
                  </label>
                `
              )
              .join("")
            }
          </div>

          <div class="settings-card">
            <h3>
              ${escapeHtml(t("checkout.shipping"))}
            </h3>

            <div class="admin-check-row">
              <label class="admin-check">
                <input
                  type="radio"
                  name="checkoutShipping"
                  value="Sí"
                  data-action="shipping-choice">
                ${escapeHtml(t("checkout.yes"))}
              </label>

              <label class="admin-check">
                <input
                  type="radio"
                  name="checkoutShipping"
                  value="No"
                  data-action="shipping-choice"
                  checked>
                ${escapeHtml(t("checkout.no"))}
              </label>
            </div>

            <div
              id="checkoutShippingFields"
              class="admin-form-grid hidden u-mt-14">
              <div class="admin-field span-2">
                <label for="checkoutAddress">
                  ${escapeHtml(t("checkout.address"))}
                </label>

                <input
                  id="checkoutAddress"
                  class="text-input"
                  type="text"
                  autocomplete="street-address">
              </div>

              <div class="admin-field">
                <label for="checkoutCity">
                  ${escapeHtml(t("checkout.city"))}
                </label>

                <input
                  id="checkoutCity"
                  class="text-input"
                  type="text"
                  autocomplete="address-level2">
              </div>

              <div class="admin-field">
                <label for="checkoutProvince">
                  ${escapeHtml(t("checkout.province"))}
                </label>

                <input
                  id="checkoutProvince"
                  class="text-input"
                  type="text"
                  autocomplete="address-level1">
              </div>

              <div class="admin-field">
                <label for="checkoutPostal">
                  ${escapeHtml(t("checkout.postal"))}
                </label>

                <input
                  id="checkoutPostal"
                  class="text-input"
                  type="text"
                  autocomplete="postal-code">
              </div>
            </div>
          </div>

          <div class="settings-card">
            <h3>
              ${state.language === "en" ? "Discount code" : "Código de descuento"}
            </h3>

            <div class="admin-form-grid">
              <div class="admin-field">
                <label for="checkoutDiscountCode">
                  ${state.language === "en" ? "Code" : "Código"}
                </label>

                <input
                  id="checkoutDiscountCode"
                  class="text-input"
                  type="text"
                  autocomplete="off"
                  placeholder="AROMA-XXXXXXXX">
              </div>

              <div class="admin-field">
                <label>&nbsp;</label>

                <button
                  class="btn secondary"
                  type="button"
                  data-action="validate-game-discount">
                  ${state.language === "en" ? "Validate" : "Validar"}
                </button>
              </div>
            </div>

            ${state.checkoutDiscount
              ?
              `
                <div class="checkout-discount-ok">
                  ✓ ${state.language === "en" ? "10% discount validated." : "Descuento del 10% validado."}
                </div>
              `
              :
              ""
            }
          </div>

          <div class="settings-card">
            <h3>
              ${escapeHtml(t("checkout.summary"))}
            </h3>

            ${state.cart
              .map(
                line =>
                `
                  <div class="builder-summary-item">
                    <span>
                      ${escapeHtml(getCartLineTitle(line))}
                      ×
                      ${Math.max(1, asNumber(line.qty,1))}
                    </span>

                    <strong>
                      ${money(
                        getCartLineUnitPrice(line) *
                        Math.max(1, asNumber(line.qty,1))
                      )}
                    </strong>
                  </div>
                `
              )
              .join("")
            }

            ${state.checkoutDiscount
              ?
              `
                <div class="builder-summary-item">
                  <span>
                    ${state.language === "en" ? "Game winner discount" : "Descuento ganador Aroma Games"}
                  </span>

                  <strong>
                    -${money(total * 0.10)}
                  </strong>
                </div>
              `
              :
              ""
            }

            <div class="builder-total">
              <span>
                ${escapeHtml(t("cart.total"))}
              </span>

              <strong>
                ${money(
                  state.checkoutDiscount
                  ?
                  total * 0.90
                  :
                  total
                )}
              </strong>
            </div>
          </div>

          <button
            class="btn"
            style="width:100%"
            type="button"
            data-action="send-whatsapp-order">
            ${escapeHtml(t("checkout.send"))}
          </button>
        </div>
      `;
    }

    function openCheckout()
    {
      state.checkoutDiscount =
      null;

      if (
        state.cart.length === 0
      )
      {
        toast(
          t(
            "cart.empty"
          ),
          "error"
        );

        return;
      }

      closeCart();

      openModal(
        t(
          "checkout.title"
        ),
        renderCheckout()
      );
    }

    function getCheckedValue(
      name
    )
    {
      const checked =
      document.querySelector(
        `input[name="${name}"]:checked`
      );

      return checked
      ?
      checked.value
      :
      "";
    }

    function buildCartLineText(
      line
    )
    {
      const qty =
      Math.max(
        1,
        asNumber(
          line.qty,
          1
        )
      );

      const total =
      getCartLineUnitPrice(
        line
      )
      *
      qty;

      let text =
      "• " +
      getCartLineTitle(
        line
      )
      +
      " x" +
      qty
      +
      " — " +
      money(
        total
      );

      if (
        line.kind === "bundle" &&
        Array.isArray(
          line.items
        )
      )
      {
        const details =
        line.items.map(
          item =>
          {
            const product =
            getProductById(
              item.productId
            );

            return (
              "   - " +
              (
                product
                ?
                product.nombre
                :
                "Producto"
              )
              +
              (
                item.ml
                ?
                ` ${item.ml} ml`
                :
                ""
              )
              +
              (
                item.price
                ?
                ` (${money(item.price)})`
                :
                ""
              )
            );
          }
        )
        .join(
          "\n"
        );

        text +=
        "\n" +
        details;
      }

      return text;
    }

    async function validateGameDiscount()
    {
      const code =
      document.getElementById(
        "checkoutDiscountCode"
      )?.value.trim().toUpperCase()
      ||
      "";

      const phone =
      normalizeGamePhone(
        document.getElementById(
          "checkoutPhone"
        )?.value
      );

      if (
        !code ||
        phone.length < 8
      )
      {
        toast(
          state.language === "en"
          ?
          "Enter your WhatsApp number and discount code first."
          :
          "Ingresá primero tu WhatsApp y el código de descuento.",
          "error"
        );

        return;
      }

      const result =
      await supabaseClient.rpc(
        "validate_game_discount",
        {
          p_code:
          code,

          p_phone:
          phone,
        }
      );

      if (
        result.error
      )
      {
        state.checkoutDiscount =
        null;

        toast(
          result.error.message,
          "error"
        );

        return;
      }

      const data =
      result.data
      ||
      {};

      if (
        !data.valid
      )
      {
        state.checkoutDiscount =
        null;

        toast(
          data.message
          ||
          (
            state.language === "en"
            ?
            "Invalid or already used code."
            :
            "Código inválido, ajeno o ya utilizado."
          ),
          "error"
        );

        return;
      }

      state.checkoutDiscount =
      {
        code:
        data.code,

        percent:
        asNumber(
          data.percent,
          10
        ),

        phone:
        phone,

        rewardId:
        data.reward_id,
      };

      const modalBody =
      document.querySelector(
        ".modal-body"
      );

      if (
        modalBody
      )
      {
        modalBody.innerHTML =
        renderCheckout();

        const phoneInput =
        document.getElementById(
          "checkoutPhone"
        );

        if (
          phoneInput
        )
        {
          phoneInput.value =
          phone;
        }

        const codeInput =
        document.getElementById(
          "checkoutDiscountCode"
        );

        if (
          codeInput
        )
        {
          codeInput.value =
          code;
        }
      }

      toast(
        state.language === "en"
        ?
        "10% discount applied."
        :
        "Descuento del 10% aplicado.",
        "success"
      );
    }

    function sendWhatsAppOrder()
    {
      const name =
      document.getElementById(
        "checkoutName"
      )?.value.trim()
      ||
      "";

      const phone =
      document.getElementById(
        "checkoutPhone"
      )?.value.trim()
      ||
      "";

      const email =
      document.getElementById(
        "checkoutEmail"
      )?.value.trim()
      ||
      "";

      const payment =
      getCheckedValue(
        "checkoutPayment"
      );

      const shipping =
      getCheckedValue(
        "checkoutShipping"
      );

      if (
        !name ||
        !phone ||
        !email
      )
      {
        toast(
          state.language === "en"
          ?
          "Complete your name, phone and email."
          :
          "Completá nombre, teléfono y correo.",
          "error"
        );

        return;
      }

      if (
        state.checkoutDiscount &&
        normalizeGamePhone(
          phone
        ) !==
        normalizeGamePhone(
          state.checkoutDiscount.phone
        )
      )
      {
        state.checkoutDiscount =
        null;

        toast(
          state.language === "en"
          ?
          "The discount belongs to another WhatsApp number. Validate it again."
          :
          "El descuento pertenece a otro WhatsApp. Volvé a validarlo.",
          "error"
        );

        return;
      }

      const address =
      document.getElementById(
        "checkoutAddress"
      )?.value.trim()
      ||
      "";

      const city =
      document.getElementById(
        "checkoutCity"
      )?.value.trim()
      ||
      "";

      const province =
      document.getElementById(
        "checkoutProvince"
      )?.value.trim()
      ||
      "";

      const postal =
      document.getElementById(
        "checkoutPostal"
      )?.value.trim()
      ||
      "";

      if (
        shipping === "Sí" &&
        (
          !address ||
          !city ||
          !province
        )
      )
      {
        toast(
          state.language === "en"
          ?
          "Complete the shipping details."
          :
          "Completá los datos de envío.",
          "error"
        );

        return;
      }

      const lines =
      state.cart.map(
        line =>
        buildCartLineText(
          line
        )
      )
      .join(
        "\n"
      );

      let message =
      state.language === "en"
      ?
      `Hello, I would like to place this order.

CUSTOMER
Name: ${name}
Phone: ${phone}
Email: ${email}

PRODUCTS
${lines}

TOTAL: ${money(state.checkoutDiscount ? getCartSubtotal() * 0.90 : getCartSubtotal())}

PAYMENT
${payment}

SHIPPING
${shipping === "Sí" ? "Yes" : "No"}`
      :
      `Hola, quiero hacer este pedido.

DATOS DEL CLIENTE
Nombre: ${name}
Teléfono: ${phone}
Correo: ${email}

PRODUCTOS
${lines}

TOTAL: ${money(state.checkoutDiscount ? getCartSubtotal() * 0.90 : getCartSubtotal())}

MÉTODO DE PAGO
${payment}

¿CON ENVÍO?
${shipping}`;

      if (
        shipping === "Sí"
      )
      {
        message +=
        state.language === "en"
        ?
        `

SHIPPING DETAILS
Address: ${address}
City: ${city}
Province: ${province}
Postal code: ${postal || "Not provided"}`
        :
        `

DATOS DE ENVÍO
Dirección: ${address}
Ciudad: ${city}
Provincia: ${province}
Código postal: ${postal || "No indicado"}`;
      }

      if (
        state.checkoutDiscount
      )
      {
        message +=
        state.language === "en"
        ?
        `

DISCOUNT
Aroma Games winner: 10%
Code: ${state.checkoutDiscount.code}
Original subtotal: ${money(getCartSubtotal())}`
        :
        `

DESCUENTO
Ganador Aroma Games: 10%
Código: ${state.checkoutDiscount.code}
Subtotal original: ${money(getCartSubtotal())}`;
      }

      const whatsapp =
      getSiteSetting(
        "contact",
        "whatsapp",
        CONFIG.whatsappNumber
      );

      const url =
      "https://wa.me/" +
      String(
        whatsapp
      )
      .replace(
        /\D/g,
        ""
      )
      +
      "?text=" +
      encodeURIComponent(
        message
      );

      window.open(
        url,
        "_blank",
        "noopener"
      );
    }

    function toggleShippingFields()
    {
      const shipping =
      getCheckedValue(
        "checkoutShipping"
      );

      const fields =
      document.getElementById(
        "checkoutShippingFields"
      );

      if (
        !fields
      )
      {
        return;
      }

      fields.classList.toggle(
        "hidden",
        shipping !== "Sí"
      );
    }

    function toggleFavorite(
      productId
    )
    {
      const id =
      Number(
        productId
      );

      if (
        state.favorites.includes(
          id
        )
      )
      {
        state.favorites =
        state.favorites.filter(
          current =>
          current !== id
        );
      }
      else
      {
        state.favorites.push(
          id
        );
      }

      saveLocalState();

      renderCurrentRoute();
    }

