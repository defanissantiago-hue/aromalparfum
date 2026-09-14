"use strict";

// AromaLParfum Frontend V2 — Paso 44
// Módulo: Descubrí tu Aroma (quiz + recomendaciones + experiencias interactivas)

function alp44EnsureQuizState()
{
  if (!state.aromaQuiz)
  {
    state.aromaQuiz = {
      loaded: false,
      loading: false,
      error: "",
      questions: [],
      options: [],
      answers: {},
      step: 0,
      results: [],
      submitting: false,
      completed: false,
    };
  }

  return state.aromaQuiz;
}

function alp44Pick(row, keys, fallback = "")
{
  for (const key of keys)
  {
    if (row && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== "")
    {
      return row[key];
    }
  }

  return fallback;
}

function alp44QuestionId(row)
{
  return asNumber(alp44Pick(row, ["id", "question_id", "pregunta_id"], 0), 0);
}

function alp44QuestionSlug(row)
{
  return String(alp44Pick(row, ["slug", "key", "question_key", "clave"], "question"))
    .trim()
    .toLowerCase();
}

function alp44QuestionOrder(row)
{
  return asNumber(alp44Pick(row, ["orden", "sort_order", "position", "order_index"], 999), 999);
}

function alp44QuestionTitle(row)
{
  const english = state.language === "en";

  return String(alp44Pick(
    row,
    english
      ? ["titulo_en", "title_en", "label_en", "titulo", "title", "nombre_en", "nombre"]
      : ["titulo_es", "title_es", "label_es", "titulo", "title", "nombre_es", "nombre"],
    alp44QuestionSlug(row)
  ));
}

function alp44QuestionDescription(row)
{
  const english = state.language === "en";

  return String(alp44Pick(
    row,
    english
      ? ["descripcion_en", "description_en", "descripcion", "description"]
      : ["descripcion_es", "description_es", "descripcion", "description"],
    ""
  ));
}

function alp44OptionId(row)
{
  return String(alp44Pick(row, ["id", "slug", "key"], ""));
}

function alp44OptionQuestionId(row)
{
  return asNumber(alp44Pick(row, ["question_id", "pregunta_id", "aroma_quiz_question_id", "question"], 0), 0);
}

function alp44OptionQuestionSlug(row)
{
  return String(alp44Pick(row, ["question_slug", "pregunta_slug", "question"], "")).trim().toLowerCase();
}

function alp44OptionOrder(row)
{
  return asNumber(alp44Pick(row, ["orden", "sort_order", "position", "order_index"], 999), 999);
}

function alp44OptionLabel(row)
{
  const english = state.language === "en";

  return String(alp44Pick(
    row,
    english
      ? ["label_en", "nombre_en", "title_en", "label", "nombre", "title", "slug"]
      : ["label_es", "nombre_es", "title_es", "label", "nombre", "title", "slug"],
    "Opción"
  ));
}

function alp44OptionValue(row)
{
  const numeric = alp44Pick(row, ["value_numeric", "valor_numerico", "numeric_value"], null);

  if (numeric !== null && numeric !== undefined && String(numeric).trim() !== "")
  {
    return asNumber(numeric, 0);
  }

  return String(alp44Pick(
    row,
    ["value_text", "valor_texto", "text_value", "value", "valor", "slug"],
    alp44OptionLabel(row)
  ));
}

function alp44IsActive(row)
{
  const value = alp44Pick(row, ["activo", "active", "enabled"], true);

  if (typeof value === "boolean") return value;

  return !["false", "0", "no", "off"].includes(String(value).trim().toLowerCase());
}

function alp44OptionsForQuestion(question)
{
  const quiz = alp44EnsureQuizState();
  const questionId = alp44QuestionId(question);
  const questionSlug = alp44QuestionSlug(question);

  return quiz.options
    .filter(option =>
    {
      const byId = questionId > 0 && alp44OptionQuestionId(option) === questionId;
      const bySlug = alp44OptionQuestionSlug(option) && alp44OptionQuestionSlug(option) === questionSlug;
      return byId || bySlug;
    })
    .sort((a, b) => alp44OptionOrder(a) - alp44OptionOrder(b));
}

async function alp44LoadQuizData(force = false)
{
  const quiz = alp44EnsureQuizState();

  if (quiz.loading) return;
  if (quiz.loaded && !force) return;

  quiz.loading = true;
  quiz.error = "";

  try
  {
    const [questionsResult, optionsResult] = await Promise.all([
      supabaseClient.from("aroma_quiz_questions").select("*"),
      supabaseClient.from("aroma_quiz_options").select("*"),
    ]);

    if (questionsResult.error) throw questionsResult.error;
    if (optionsResult.error) throw optionsResult.error;

    quiz.questions = (questionsResult.data || [])
      .filter(alp44IsActive)
      .sort((a, b) => alp44QuestionOrder(a) - alp44QuestionOrder(b));

    quiz.options = (optionsResult.data || [])
      .filter(alp44IsActive)
      .sort((a, b) => alp44OptionOrder(a) - alp44OptionOrder(b));

    if (!quiz.questions.length)
    {
      throw new Error(state.language === "en"
        ? "The fragrance quiz has no active questions."
        : "El quiz de fragancias no tiene preguntas activas.");
    }

    quiz.loaded = true;
    quiz.step = Math.min(quiz.step, Math.max(0, quiz.questions.length - 1));
  }
  catch (error)
  {
    console.warn("aroma_quiz:", error?.message || error);
    quiz.error = error?.message || String(error);
    quiz.loaded = false;
  }
  finally
  {
    quiz.loading = false;

    if (state.route === "games")
    {
      renderCurrentRoute();
    }
  }
}

function alp44BuildAnswersPayload()
{
  const quiz = alp44EnsureQuizState();
  const payload = {};

  for (const question of quiz.questions)
  {
    const slug = alp44QuestionSlug(question);
    const answer = quiz.answers[slug];

    if (!answer) continue;

    payload[slug] = answer.value;
  }

  return payload;
}

function alp44AnswerSummary()
{
  const quiz = alp44EnsureQuizState();

  return quiz.questions
    .map(question =>
    {
      const slug = alp44QuestionSlug(question);
      const answer = quiz.answers[slug];
      return answer ? answer.label : "";
    })
    .filter(Boolean);
}

function alp44LocalRecommendations(limit = 6)
{
  const quiz = alp44EnsureQuizState();
  const answers = alp44BuildAnswersPayload();
  const normalizedAnswers = Object.fromEntries(
    Object.entries(answers).map(([key, value]) => [key, normalizeText(value)])
  );

  const budget = asNumber(answers.budget, 0);

  return (state.products || [])
    .filter(product => asNumber(product.stock, 0) > 0 && asNumber(product.precio, 0) > 0)
    .map(product =>
    {
      let score = 0;

      const fields = {
        gender: normalizeText(product.genero),
        style: normalizeText([
          product.familia,
          product.descripcion,
          product.recomendacion_uso,
          product.salida,
          product.corazon,
          product.fondo,
        ].filter(Boolean).join(" ")),
        occasion: normalizeText(arrayFromDb(product.ocasiones).join(" ") || product.ocasiones),
        season: normalizeText(arrayFromDb(product.estaciones).join(" ") || product.estaciones),
      };

      if (normalizedAnswers.gender && fields.gender.includes(normalizedAnswers.gender)) score += 35;
      if (normalizedAnswers.style && fields.style.includes(normalizedAnswers.style)) score += 28;
      if (normalizedAnswers.occasion && fields.occasion.includes(normalizedAnswers.occasion)) score += 24;
      if (normalizedAnswers.season && fields.season.includes(normalizedAnswers.season)) score += 24;

      if (budget > 0)
      {
        const price = asNumber(product.precio, 0);
        if (price <= budget) score += 24;
        else if (price <= budget * 1.12) score += 8;
        else score -= 18;
      }

      score += Math.min(12, getPopularity(product.id));

      return { product, score };
    })
    .sort((a, b) => b.score - a.score || asNumber(a.product.precio, 0) - asNumber(b.product.precio, 0))
    .slice(0, limit)
    .map(item => item.product);
}

function alp44NormalizeRpcRecommendations(data)
{
  let rows = [];

  if (Array.isArray(data))
  {
    rows = data;
  }
  else if (Array.isArray(data?.recommendations))
  {
    rows = data.recommendations;
  }
  else if (Array.isArray(data?.products))
  {
    rows = data.products;
  }

  const products = [];
  const seen = new Set();

  for (const row of rows)
  {
    const id = asNumber(
      alp44Pick(row, ["product_id", "id", "producto_id"], row?.product?.id),
      0
    );

    if (!id || seen.has(id)) continue;

    const product = (state.products || []).find(item => asNumber(item.id, 0) === id);

    if (product)
    {
      seen.add(id);
      products.push(product);
    }
  }

  return products;
}

async function alp44SubmitQuiz()
{
  const quiz = alp44EnsureQuizState();

  if (quiz.submitting) return;

  const missing = quiz.questions.find(question => !quiz.answers[alp44QuestionSlug(question)]);

  if (missing)
  {
    quiz.step = Math.max(0, quiz.questions.indexOf(missing));
    renderCurrentRoute();
    toast(
      state.language === "en" ? "Answer every question to see your recommendations." : "Respondé todas las preguntas para ver tus recomendaciones.",
      "error"
    );
    return;
  }

  quiz.submitting = true;
  quiz.error = "";
  renderCurrentRoute();

  try
  {
    const result = await supabaseClient.rpc("get_aroma_quiz_recommendations", {
      p_answers: alp44BuildAnswersPayload(),
      p_limit: 6,
    });

    if (result.error) throw result.error;

    quiz.results = alp44NormalizeRpcRecommendations(result.data);

    if (!quiz.results.length)
    {
      quiz.results = alp44LocalRecommendations(6);
    }

    quiz.completed = true;
  }
  catch (error)
  {
    console.warn("get_aroma_quiz_recommendations:", error?.message || error);
    quiz.results = alp44LocalRecommendations(6);
    quiz.completed = true;

    if (!quiz.results.length)
    {
      quiz.error = error?.message || String(error);
    }
  }
  finally
  {
    quiz.submitting = false;
    renderCurrentRoute();
  }
}

function alp44ResetQuiz()
{
  const quiz = alp44EnsureQuizState();
  quiz.answers = {};
  quiz.step = 0;
  quiz.results = [];
  quiz.completed = false;
  quiz.error = "";
  renderCurrentRoute();
}

function alp44RenderQuizLoading()
{
  return `
    <div class="discover-quiz-card discover-quiz-loading">
      <div class="spinner"></div>
      <p>${state.language === "en" ? "Preparing your fragrance quiz..." : "Preparando tu quiz de fragancias..."}</p>
    </div>
  `;
}

function alp44RenderQuizError()
{
  const quiz = alp44EnsureQuizState();

  return `
    <div class="discover-quiz-card">
      <span class="discover-chip">${state.language === "en" ? "Fragrance advisor" : "Asesor de fragancias"}</span>
      <h2>${state.language === "en" ? "We couldn't load the quiz" : "No pudimos cargar el quiz"}</h2>
      <p>${escapeHtml(quiz.error || (state.language === "en" ? "Please try again." : "Probá nuevamente."))}</p>
      <div class="discover-actions">
        <button class="btn" type="button" data-discover-action="retry-quiz">
          ${state.language === "en" ? "Try again" : "Reintentar"}
        </button>
        <button class="btn btn-secondary" type="button" data-route="catalog">
          ${state.language === "en" ? "Browse catalog" : "Explorar catálogo"}
        </button>
      </div>
    </div>
  `;
}

function alp44RenderQuizResults()
{
  const quiz = alp44EnsureQuizState();
  const summary = alp44AnswerSummary();

  return `
    <div class="discover-results">
      <div class="discover-results-head">
        <div>
          <span class="discover-chip">${state.language === "en" ? "Your selection" : "Tu selección"}</span>
          <h2>${state.language === "en" ? "These fragrances fit you best" : "Estos aromas encajan mejor con vos"}</h2>
          <p>
            ${state.language === "en"
              ? "We combined your style, occasion, season and budget with the AromaLParfum catalog."
              : "Combinamos tu estilo, ocasión, temporada y presupuesto con el catálogo de AromaLParfum."
            }
          </p>
        </div>

        <button class="btn btn-secondary" type="button" data-discover-action="reset-quiz">
          ${state.language === "en" ? "Answer again" : "Volver a responder"}
        </button>
      </div>

      ${summary.length
        ? `
          <div class="discover-summary-chips">
            ${summary.map(item => `<span>${escapeHtml(item)}</span>`).join("")}
          </div>
        `
        : ""
      }

      ${quiz.results.length
        ? `
          <div class="product-grid discover-product-grid">
            ${quiz.results.map(product => renderProductCard(product)).join("")}
          </div>
        `
        : `
          <div class="empty-state">
            <p>${state.language === "en" ? "No matching fragrances found yet." : "Todavía no encontramos coincidencias suficientes."}</p>
            <button class="btn" type="button" data-route="catalog">
              ${state.language === "en" ? "Browse all fragrances" : "Ver todos los perfumes"}
            </button>
          </div>
        `
      }

      <div class="discover-result-note">
        <strong>${state.language === "en" ? "Tip" : "Tip"}:</strong>
        ${state.language === "en"
          ? "Open a fragrance to compare it or try it first as a decant."
          : "Abrí una fragancia para compararla o probarla primero en decant."
        }
      </div>
    </div>
  `;
}

function alp44RenderQuizQuestion()
{
  const quiz = alp44EnsureQuizState();
  const question = quiz.questions[quiz.step];

  if (!question)
  {
    return alp44RenderQuizError();
  }

  const slug = alp44QuestionSlug(question);
  const answer = quiz.answers[slug];
  const options = alp44OptionsForQuestion(question);
  const progress = Math.round(((quiz.step + 1) / quiz.questions.length) * 100);

  return `
    <div class="discover-quiz-card">
      <div class="discover-quiz-progress-row">
        <span>${state.language === "en" ? "Question" : "Pregunta"} ${quiz.step + 1} / ${quiz.questions.length}</span>
        <strong>${progress}%</strong>
      </div>

      <div class="discover-quiz-progress" aria-hidden="true">
        <span style="width:${progress}%"></span>
      </div>

      <div class="discover-question-head">
        <span class="discover-chip">${state.language === "en" ? "Find your fragrance" : "Encontrá tu fragancia"}</span>
        <h2>${escapeHtml(alp44QuestionTitle(question))}</h2>
        ${alp44QuestionDescription(question)
          ? `<p>${escapeHtml(alp44QuestionDescription(question))}</p>`
          : ""
        }
      </div>

      <div class="discover-options" role="radiogroup" aria-label="${escapeAttribute(alp44QuestionTitle(question))}">
        ${options.map(option =>
        {
          const optionId = alp44OptionId(option);
          const selected = answer && String(answer.optionId) === String(optionId);

          return `
            <button
              class="discover-option ${selected ? "is-selected" : ""}"
              type="button"
              role="radio"
              aria-checked="${selected ? "true" : "false"}"
              data-discover-action="select-option"
              data-question-slug="${escapeAttribute(slug)}"
              data-option-id="${escapeAttribute(optionId)}">
              <span class="discover-option-dot"></span>
              <span>${escapeHtml(alp44OptionLabel(option))}</span>
            </button>
          `;
        }).join("")}
      </div>

      ${!options.length
        ? `<p class="discover-inline-error">${state.language === "en" ? "This question has no active options." : "Esta pregunta no tiene opciones activas."}</p>`
        : ""
      }

      <div class="discover-quiz-controls">
        <button
          class="btn btn-secondary"
          type="button"
          data-discover-action="quiz-back"
          ${quiz.step === 0 ? "disabled" : ""}>
          ${state.language === "en" ? "Back" : "Atrás"}
        </button>

        <button
          class="btn"
          type="button"
          data-discover-action="quiz-next"
          ${!answer || quiz.submitting ? "disabled" : ""}>
          ${quiz.step === quiz.questions.length - 1
            ? (state.language === "en" ? "See my fragrances" : "Ver mis perfumes")
            : (state.language === "en" ? "Continue" : "Continuar")
          }
        </button>
      </div>
    </div>
  `;
}

function alp44RenderQuizPanel()
{
  const quiz = alp44EnsureQuizState();

  if (quiz.loading || (!quiz.loaded && !quiz.error))
  {
    return alp44RenderQuizLoading();
  }

  if (quiz.error && !quiz.loaded)
  {
    return alp44RenderQuizError();
  }

  if (quiz.submitting)
  {
    return `
      <div class="discover-quiz-card discover-quiz-loading">
        <div class="spinner"></div>
        <h2>${state.language === "en" ? "Choosing your best matches..." : "Buscando tus mejores coincidencias..."}</h2>
        <p>${state.language === "en" ? "We're comparing your answers with the catalog." : "Estamos comparando tus respuestas con el catálogo."}</p>
      </div>
    `;
  }

  if (quiz.completed)
  {
    return alp44RenderQuizResults();
  }

  return alp44RenderQuizQuestion();
}

function renderDiscoverPage()
{
  const quiz = alp44EnsureQuizState();

  return `
    <section class="section discover-hero-section">
      <div class="container">
        <div class="discover-hero">
          <div class="discover-hero-copy">
            <span class="discover-chip">${state.language === "en" ? "Discover your scent" : "Descubrí tu Aroma"}</span>
            <h1>${state.language === "en" ? "A fragrance recommendation built around you." : "Una recomendación de fragancias pensada para vos."}</h1>
            <p>
              ${state.language === "en"
                ? "Answer five quick questions about your style, occasion, season and budget. We'll suggest fragrances from the current AromaLParfum catalog."
                : "Respondé cinco preguntas rápidas sobre tu estilo, ocasión, temporada y presupuesto. Te recomendamos perfumes del catálogo actual de AromaLParfum."
              }
            </p>

            <div class="discover-hero-points">
              <span>✓ ${state.language === "en" ? "Personalized selection" : "Selección personalizada"}</span>
              <span>✓ ${state.language === "en" ? "Real catalog products" : "Productos reales del catálogo"}</span>
              <span>✓ ${state.language === "en" ? "No automatic discounts" : "Sin descuentos automáticos"}</span>
            </div>
          </div>

          <div class="discover-hero-mark" aria-hidden="true">
            <span>ALP</span>
            <small>${state.language === "en" ? "SCENT FINDER" : "AROMA FINDER"}</small>
          </div>
        </div>

        <div id="aromaQuizMount" class="discover-quiz-shell">
          ${alp44RenderQuizPanel()}
        </div>
      </div>
    </section>

    <div class="discover-experiences">
      ${renderGamesHubPage()}
    </div>
  `;
}

function afterRenderDiscoverPage()
{
  const quiz = alp44EnsureQuizState();

  if (!quiz.loaded && !quiz.loading && !quiz.error)
  {
    alp44LoadQuizData();
  }
}

function alp44SelectOption(questionSlug, optionId)
{
  const quiz = alp44EnsureQuizState();
  const question = quiz.questions.find(item => alp44QuestionSlug(item) === questionSlug);

  if (!question) return;

  const option = alp44OptionsForQuestion(question)
    .find(item => String(alp44OptionId(item)) === String(optionId));

  if (!option) return;

  quiz.answers[questionSlug] = {
    optionId: alp44OptionId(option),
    label: alp44OptionLabel(option),
    value: alp44OptionValue(option),
  };

  renderCurrentRoute();
}

if (!window.__alp44DiscoverListenersInstalled)
{
  window.__alp44DiscoverListenersInstalled = true;

  document.addEventListener("click", async event =>
  {
    const element = event.target.closest("[data-discover-action]");
    if (!element) return;

    const action = element.dataset.discoverAction;
    const quiz = alp44EnsureQuizState();

    if (action === "select-option")
    {
      alp44SelectOption(
        String(element.dataset.questionSlug || ""),
        String(element.dataset.optionId || "")
      );
      return;
    }

    if (action === "quiz-back")
    {
      quiz.step = Math.max(0, quiz.step - 1);
      renderCurrentRoute();
      return;
    }

    if (action === "quiz-next")
    {
      const question = quiz.questions[quiz.step];
      const slug = question ? alp44QuestionSlug(question) : "";

      if (!slug || !quiz.answers[slug])
      {
        toast(state.language === "en" ? "Choose an option first." : "Elegí una opción primero.", "error");
        return;
      }

      if (quiz.step >= quiz.questions.length - 1)
      {
        await alp44SubmitQuiz();
      }
      else
      {
        quiz.step += 1;
        renderCurrentRoute();
      }
      return;
    }

    if (action === "reset-quiz")
    {
      alp44ResetQuiz();
      return;
    }

    if (action === "retry-quiz")
    {
      quiz.error = "";
      await alp44LoadQuizData(true);
    }
  });
}
