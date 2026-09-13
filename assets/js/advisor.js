"use strict";

// AromaLParfum Frontend V2 — Paso 37
// Módulo: asesor, acerca de y contacto

    function getAiCatalogPayload()
    {
      return state.products
      .filter(
        product =>
        product.stock > 0
      )
      .slice(
        0,
        150
      )
      .map(
        product =>
        ({
          id:
          product.id,

          nombre:
          product.nombre,

          marca:
          product.marca,

          precio:
          product.precio,

          ml:
          product.ml,

          categoria:
          product.categoria,

          genero:
          product.genero,

          familia:
          product.familia,

          salida:
          product.salida,

          corazon:
          product.corazon,

          fondo:
          product.fondo,

          descripcion:
          product.descripcion,

          stock:
          product.stock,

          estaciones:
          product.estaciones,

          ocasiones:
          product.ocasiones,

          duracion:
          product.duracion,

          proyeccion:
          product.proyeccion,
        })
      );
    }

    async function callAromaAI(
      mode,
      payload = {}
    )
    {
      const endpoint =
      getAiEndpoint();

      const result =
      await supabaseClient.functions.invoke(
        endpoint,
        {
          body:
          {
            mode:
            mode,

            ...payload,
          },
        }
      );

      if (
        result.error
      )
      {
        throw new Error(
          result.error.message
          ||
          "Error de la función de IA."
        );
      }

      const data =
      result.data
      ||
      {};

      if (
        data.success === false
      )
      {
        throw new Error(
          data.error
          ||
          "La IA devolvió un error."
        );
      }

      return data.result;
    }

    function renderAdvisorPage()
    {
      const enabled =
      isAiEnabled(
        "advisor_enabled"
      );

      return `
        <section class="section">
          <div class="container">
            <div class="section-title-row">
              <div>
                <p class="eyebrow">
                  ${escapeHtml(t("advisor.eyebrow"))}
                </p>

                <h1 class="section-title">
                  ${escapeHtml(t("advisor.title"))}
                </h1>

                <p class="section-subtitle">
                  ${escapeHtml(
                    enabled
                    ?
                    t("advisor.description")
                    :
                    t("advisor.disabled")
                  )}
                </p>
              </div>
            </div>

            <div class="advisor-layout">
              <div class="advisor-chat">
                <div
                  class="advisor-messages"
                  id="advisorMessages">
                  ${renderAdvisorMessages(enabled)}
                </div>

                <div class="advisor-input-row">
                  <input
                    id="advisorInput"
                    class="text-input"
                    type="text"
                    placeholder="${escapeAttribute(t("advisor.placeholder"))}"
                    ${enabled ? "" : "disabled"}>

                  <button
                    class="btn"
                    type="button"
                    data-action="advisor-send"
                    ${enabled ? "" : "disabled"}>
                    ${escapeHtml(t("advisor.send"))}
                  </button>
                </div>
              </div>

              <aside class="advisor-suggestions">
                <p class="eyebrow">
                  ${state.language === "en" ? "Ideas" : "Probá preguntar"}
                </p>

                ${renderAdvisorPromptButton(
                  state.language === "en"
                  ?
                  "I want a sweet fragrance for a date."
                  :
                  "Quiero un perfume dulce para una cita."
                )}

                ${renderAdvisorPromptButton(
                  state.language === "en"
                  ?
                  "Recommend something fresh for summer."
                  :
                  "Recomendame algo fresco para verano."
                )}

                ${renderAdvisorPromptButton(
                  state.language === "en"
                  ?
                  "I have a budget of $40000."
                  :
                  "Tengo un presupuesto de $40000."
                )}

                ${renderAdvisorPromptButton(
                  state.language === "en"
                  ?
                  "I want a long-lasting night fragrance."
                  :
                  "Quiero algo duradero para usar de noche."
                )}

                ${!enabled
                  ?
                  `
                    <p class="section-subtitle u-mt-18">
                      ${escapeHtml(t("advisor.fallback"))}
                    </p>

                    <button
                      class="btn outline u-mt-12"
                      type="button"
                      data-route="collections">
                      ${escapeHtml(t("nav.collections"))}
                    </button>
                  `
                  :
                  ""
                }
              </aside>
            </div>
          </div>
        </section>
      `;
    }

    function renderAdvisorMessages(
      enabled
    )
    {
      const messages =
      state.advisorMessages.length
      ?
      state.advisorMessages
      :
      [
        {
          role:
          "ai",

          text:
          enabled
          ?
          (
            state.language === "en"
            ?
            "Tell me what you like and I will help you choose from the AromaLParfum catalog."
            :
            "Contame qué te gusta y te ayudo a elegir dentro del catálogo de AromaLParfum."
          )
          :
          t(
            "advisor.disabled"
          ),
        },
      ];

      return messages
      .map(
        message =>
        `
          <div class="chat-bubble ${message.role === "user" ? "user" : "ai"}">
            ${escapeHtml(message.text)}
          </div>
        `
      )
      .join(
        ""
      );
    }

    function renderAdvisorPromptButton(
      prompt
    )
    {
      return `
        <button
          class="btn soft small"
          type="button"
          data-action="advisor-prompt"
          data-prompt="${escapeAttribute(prompt)}">
          ${escapeHtml(prompt)}
        </button>
      `;
    }

    async function sendAdvisorMessage()
    {
      if (
        !isAiEnabled(
          "advisor_enabled"
        )
      )
      {
        toast(
          t(
            "advisor.disabled"
          ),
          "error"
        );

        return;
      }

      const input =
      document.getElementById(
        "advisorInput"
      );

      const message =
      input?.value.trim()
      ||
      "";

      if (
        !message
      )
      {
        return;
      }

      state.advisorMessages.push(
        {
          role:
          "user",

          text:
          message,
        }
      );

      if (
        input
      )
      {
        input.value =
        "";
      }

      const host =
      document.getElementById(
        "advisorMessages"
      );

      if (
        host
      )
      {
        host.innerHTML =
        renderAdvisorMessages(
          true
        )
        +
        `
          <div class="chat-bubble ai">
            ${escapeHtml(t("common.loading"))}
          </div>
        `;
      }

      try
      {
        const result =
        await callAromaAI(
          "advisor",
          {
            message:
            message,

            products:
            getAiCatalogPayload(),
          }
        );

        state.advisorMessages.push(
          {
            role:
            "ai",

            text:
            typeof result === "string"
            ?
            result
            :
            JSON.stringify(
              result,
              null,
              2
            ),
          }
        );
      }
      catch (
        error
      )
      {
        state.advisorMessages.push(
          {
            role:
            "ai",

            text:
            state.language === "en"
            ?
            `The advisor could not answer: ${error.message}`
            :
            `El asesor no pudo responder: ${error.message}`,
          }
        );
      }

      renderCurrentRoute();
    }

    function renderAboutPage()
    {
      return `
        <section class="section">
          <div class="container">
            <div
              style="
                max-width:860px;
                margin:0 auto;
              ">
              <p class="eyebrow">
                ${escapeHtml(t("about.eyebrow"))}
              </p>

              <h1 class="section-title">
                ${escapeHtml(t("about.title"))}
              </h1>

              <p
                class="detail-description"
                style="font-size:16px;margin-top:28px">
                ${escapeHtml(t("about.p1"))}
              </p>

              <p
                class="detail-description"
                style="font-size:16px">
                ${escapeHtml(t("about.p2"))}
              </p>

              <p
                class="detail-description"
                style="font-size:16px">
                ${escapeHtml(t("about.p3"))}
              </p>

              <div class="u-mt-28">
                <button
                  class="btn"
                  type="button"
                  data-route="catalog">
                  ${escapeHtml(t("featured.viewall"))}
                </button>
              </div>
            </div>
          </div>
        </section>
      `;
    }

    function renderContactPage()
    {
      const contact =
      getSiteSettingObject(
        "contact"
      );

      return `
        <section class="section">
          <div class="container">
            <div class="section-title-row">
              <div>
                <p class="eyebrow">
                  ${escapeHtml(t("contact.eyebrow"))}
                </p>

                <h1 class="section-title">
                  ${escapeHtml(t("contact.title"))}
                </h1>
              </div>
            </div>

            <div class="promo-grid">
              <div class="settings-card">
                <h3>
                  ${escapeHtml(t("contact.whatsapp"))}
                </h3>

                <p class="section-subtitle">
                  ${escapeHtml(contact.whatsapp || CONFIG.whatsappNumber)}
                </p>

                <button
                  class="btn u-mt-14"
                  type="button"
                  data-action="open-whatsapp">
                  WhatsApp
                </button>

                <h3 class="u-mt-28">
                  ${escapeHtml(t("contact.instagram"))}
                </h3>

                <p class="section-subtitle">
                  ${escapeHtml(contact.instagram || "AromaLParfum")}
                </p>

                <h3 class="u-mt-28">
                  ${escapeHtml(t("contact.email"))}
                </h3>

                <p class="section-subtitle">
                  ${escapeHtml(contact.email || "")}
                </p>
              </div>

              <div class="settings-card">
                <h3>
                  ${escapeHtml(t("contact.message"))}
                </h3>

                <div class="admin-form">
                  <input
                    id="contactName"
                    class="text-input"
                    type="text"
                    placeholder="${escapeAttribute(t("checkout.name"))}">

                  <input
                    id="contactEmail"
                    class="text-input"
                    type="email"
                    placeholder="${escapeAttribute(t("checkout.email"))}">

                  <textarea
                    id="contactMessage"
                    class="textarea-input"
                    placeholder="${escapeAttribute(t("contact.message"))}">
                  </textarea>

                  <button
                    class="btn"
                    type="button"
                    data-action="send-contact-whatsapp">
                    ${escapeHtml(t("contact.send"))}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      `;
    }

    function openWhatsAppGeneral()
    {
      const whatsapp =
      getSiteSetting(
        "contact",
        "whatsapp",
        CONFIG.whatsappNumber
      );

      const message =
      state.language === "en"
      ?
      "Hello AromaLParfum, I would like information about fragrances."
      :
      "Hola AromaLParfum, quiero consultar por perfumes.";

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

    function sendContactWhatsApp()
    {
      const name =
      document.getElementById(
        "contactName"
      )?.value.trim()
      ||
      "";

      const email =
      document.getElementById(
        "contactEmail"
      )?.value.trim()
      ||
      "";

      const message =
      document.getElementById(
        "contactMessage"
      )?.value.trim()
      ||
      "";

      if (
        !name ||
        !message
      )
      {
        toast(
          state.language === "en"
          ?
          "Complete your name and message."
          :
          "Completá tu nombre y mensaje.",
          "error"
        );

        return;
      }

      const whatsapp =
      getSiteSetting(
        "contact",
        "whatsapp",
        CONFIG.whatsappNumber
      );

      const text =
      state.language === "en"
      ?
      `Hello AromaLParfum.

Name: ${name}
Email: ${email || "Not provided"}

Message:
${message}`
      :
      `Hola AromaLParfum.

Nombre: ${name}
Correo: ${email || "No indicado"}

Mensaje:
${message}`;

      window.open(
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
          text
        ),
        "_blank",
        "noopener"
      );
    }

