"use strict";

// AromaLParfum Frontend V2 — Paso 37
// Módulo: experiencias/juegos

function getGameConfig(
  type
)
{
  const config =
  state.gameConfigs.find(
    item =>
    item.tipo === type
  );

  if (
    config
  )
  {
    return config;
  }

  const fallback =
  {
    puzzle:
    {
      tipo:
      "puzzle",

      tiempo_limite:
      180,

      piezas:
      20,
    },

    differences:
    {
      tipo:
      "differences",

      tiempo_limite:
      180,

      diferencias:
      5,
    },

    hidden:
    {
      tipo:
      "hidden",

      tiempo_limite:
      90,
    },
  };

  return fallback[
    type
  ]
  ||
  fallback.puzzle;
}


function getGameAdsSettings()
{
  // Paso 43: Descubrí tu Aroma queda libre de publicidad.
  return { enabled:false, client:"", slotTop:"", slotBottom:"" };
}

function normalizeAdSenseClient(
  value
)
{
  const client =
  String(
    value
    ||
    ""
  ).trim();

  return /^ca-pub-\d{10,25}$/.test(
    client
  )
  ?
  client
  :
  "";
}

function normalizeAdSenseSlot(
  value
)
{
  const slot =
  String(
    value
    ||
    ""
  )
  .replace(
    /\D/g,
    ""
  )
  .slice(
    0,
    30
  );

  return slot;
}

function gameAdsReady()
{
  return false;
}

function renderGameAdSlot(position)
{
  void position;
  return "";
}

function ensureGameAdsScript(
  client
)
{
  const validClient =
  normalizeAdSenseClient(
    client
  );

  if (
    !validClient
  )
  {
    return Promise.reject(
      new Error(
        "AdSense client inválido."
      )
    );
  }

  const existing =
  document.getElementById(
    "alpAdSenseScript"
  )
  ||
  Array.from(
    document.scripts
  ).find(
    script =>
    String(
      script.src
      ||
      ""
    ).includes(
      "pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"
    )
  );

  if (
    existing
  )
  {
    return new Promise(
      resolve =>
      {
        if (
          existing.dataset.loaded === "true" ||
          document.readyState === "complete"
        )
        {
          resolve();

          return;
        }

        existing.addEventListener(
          "load",
          () => resolve(),
          {
            once:
            true,
          }
        );

        existing.addEventListener(
          "error",
          () => resolve(),
          {
            once:
            true,
          }
        );

        setTimeout(
          resolve,
          3500
        );
      }
    );
  }

  return new Promise(
    resolve =>
    {
      const script =
      document.createElement(
        "script"
      );

      script.id =
      "alpAdSenseScript";

      script.async =
      true;

      script.crossOrigin =
      "anonymous";

      script.src =
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client="
      +
      encodeURIComponent(
        validClient
      );

      script.addEventListener(
        "load",
        () =>
        {
          script.dataset.loaded =
          "true";

          resolve();
        },
        {
          once:
          true,
        }
      );

      script.addEventListener(
        "error",
        () => resolve(),
        {
          once:
          true,
        }
      );

      document.head.appendChild(
        script
      );
    }
  );
}

async function activateGameAds()
{
  // Sin anuncios desde el Paso 43.
  return;
}

function renderGamesHubPage()
{
  const games =
  [
    {
      type:
      "puzzle",

      number:
      "01",

      title:
      t(
        "games.puzzle"
      ),

      description:
      t(
        "games.puzzle.desc"
      ),

      meta:
      state.language === "en"
      ?
      ["20 pieces", "Visual challenge"]
      :
      ["20 piezas", "Desafío visual"],
    },

    {
      type:
      "differences",

      number:
      "02",

      title:
      t(
        "games.diff"
      ),

      description:
      t(
        "games.diff.desc"
      ),

      meta:
      state.language === "en"
      ?
      ["5 subtle changes", "High difficulty"]
      :
      ["5 cambios sutiles", "Dificultad alta"],
    },

    {
      type:
      "hidden",

      number:
      "03",

      title:
      t(
        "games.hidden"
      ),

      description:
      t(
        "games.hidden.desc"
      ),

      meta:
      state.language === "en"
      ?
      ["Against the clock", "Random perfume"]
      :
      ["Contrarreloj", "Perfume aleatorio"],
    },
  ];

  return `
    <section class="section">
      <div class="container">
        ${renderPageCoverBanner("games", t("games.eyebrow"), t("games.title"), t("games.description"))}

        <div class="section-title-row">
          <div>
            <p class="eyebrow">
              ${escapeHtml(t("games.eyebrow"))}
            </p>

            <h1 class="section-title">
              ${escapeHtml(t("games.title"))}
            </h1>

            <p class="section-subtitle">
              ${escapeHtml(t("games.description"))}
            </p>
          </div>
        </div>

        <div class="game-ranking-layout">
          ${renderGamePlayerCard()}
          ${renderDailyLeaderboard()}
        </div>

        ${renderGameAdSlot("top")}

        <div class="game-hub-grid">
          ${games
            .map(
              game =>
              `
                <article class="game-card">
                  <span class="game-card-number" aria-hidden="true">
                    ${escapeHtml(game.number)}
                  </span>

                  <span class="game-card-kicker">
                    Aroma Games · ${escapeHtml(game.number)}
                  </span>

                  <h3>
                    ${escapeHtml(game.title)}
                  </h3>

                  <p>
                    ${escapeHtml(game.description)}
                  </p>

                  <div class="game-card-meta">
                    ${game.meta
                      .map(
                        item =>
                        `
                          <span class="game-meta-pill">
                            ${escapeHtml(item)}
                          </span>
                        `
                      )
                      .join("")
                    }
                  </div>

                  <div>
                    <button
                      class="btn"
                      type="button"
                      data-action="start-game"
                      data-game-type="${escapeAttribute(game.type)}">
                      ${escapeHtml(t("games.play"))}
                      <span aria-hidden="true">→</span>
                    </button>
                  </div>
                </article>
              `
            )
            .join("")
          }
        </div>

        ${renderGameAdSlot("bottom")}
      </div>
    </section>
  `;
}


function normalizeGamePhone(
  value
)
{
  return String(
    value
    ||
    ""
  )
  .replace(
    /\D/g,
    ""
  );
}

function getGamePlayer()
{
  const player =
  state.gamePlayer
  ||
  null;

  if (
    !player
  )
  {
    return null;
  }

  const name =
  String(
    player.name
    ||
    ""
  ).trim();

  const phone =
  normalizeGamePhone(
    player.phone
  );

  if (
    name.length < 2 ||
    phone.length < 8
  )
  {
    return null;
  }

  return {
    name,
    phone,
  };
}

function saveGamePlayerFromForm()
{
  const name =
  document.getElementById(
    "gamePlayerName"
  )?.value.trim()
  ||
  "";

  const phone =
  normalizeGamePhone(
    document.getElementById(
      "gamePlayerPhone"
    )?.value
  );

  if (
    name.length < 2 ||
    phone.length < 8
  )
  {
    toast(
      state.language === "en"
      ?
      "Enter your name and a valid WhatsApp number."
      :
      "Ingresá tu nombre y un WhatsApp válido.",
      "error"
    );

    return;
  }

  state.gamePlayer =
  {
    name,
    phone,
  };

  localStorage.setItem(
    "alp_game_player",
    JSON.stringify(
      state.gamePlayer
    )
  );

  toast(
    state.language === "en"
    ?
    "Player saved."
    :
    "Jugador guardado.",
    "success"
  );

  renderCurrentRoute();
}

function clearGamePlayer()
{
  state.gamePlayer =
  null;

  localStorage.removeItem(
    "alp_game_player"
  );

  renderCurrentRoute();
}

async function loadDailyLeaderboard()
{
  try
  {
    const result =
    await supabaseClient.rpc(
      "get_daily_game_leaderboard",
      {
        p_date:
        null,
      }
    );

    if (
      result.error
    )
    {
      console.warn(
        "daily leaderboard:",
        result.error.message
      );

      state.dailyLeaderboard =
      [];

      return;
    }

    state.dailyLeaderboard =
    Array.isArray(
      result.data
    )
    ?
    result.data
    :
    [];
  }
  catch (
    error
  )
  {
    console.warn(
      "daily leaderboard:",
      error
    );

    state.dailyLeaderboard =
    [];
  }
}

async function submitDailyGameScore(
  completed,
  elapsed
)
{
  const player =
  getGamePlayer();

  if (
    !completed ||
    !player
  )
  {
    return null;
  }

  try
  {
    const result =
    await supabaseClient.rpc(
      "submit_daily_game_score",
      {
        p_player_name:
        player.name,

        p_player_phone:
        player.phone,

        p_game_type:
        state.game.type,

        p_product_id:
        Number(
          state.game.productId
        )
        ||
        null,

        p_duration_seconds:
        Math.max(
          1,
          Number(
            elapsed
          )
          ||
          1
        ),

        p_attempts:
        Math.max(
          1,
          Number(
            state.game.moves
          )
          ||
          1
        ),
      }
    );

    if (
      result.error
    )
    {
      console.warn(
        "submit_daily_game_score:",
        result.error.message
      );

      return null;
    }

    await loadDailyLeaderboard();

    return result.data
    ||
    null;
  }
  catch (
    error
  )
  {
    console.warn(
      "submit_daily_game_score:",
      error
    );

    return null;
  }
}

function renderDailyLeaderboard()
{
  const rows =
  state.dailyLeaderboard
  ||
  [];

  return `
    <div class="game-ranking-card">
      <h3>
        ${state.language === "en" ? "Today's ranking" : "Ranking de hoy"}
      </h3>

      <p>
        ${state.language === "en"
          ? "A daily ranking to discover fragrances while you play. Points break ties."
          : "Un ranking diario para descubrir fragancias mientras jugás. Los puntos sirven para desempatar."
        }
      </p>

      <span class="game-ranking-prize">
        ✦ Ranking diario · sin descuentos automáticos
      </span>

      ${rows.length
        ?
        `
          <table class="game-ranking-table">
            <thead>
              <tr>
                <th>#</th>
                <th>${state.language === "en" ? "Player" : "Jugador"}</th>
                <th>${state.language === "en" ? "Solved" : "Resueltos"}</th>
                <th>${state.language === "en" ? "Points" : "Puntos"}</th>
              </tr>
            </thead>

            <tbody>
              ${rows
                .slice(
                  0,
                  10
                )
                .map(
                  (
                    row,
                    index
                  ) =>
                  `
                    <tr>
                      <td>${index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}</td>
                      <td>${escapeHtml(row.player_name || "Jugador")}</td>
                      <td>${formatInteger(row.solved || 0)}</td>
                      <td>${formatInteger(row.points || 0)}</td>
                    </tr>
                  `
                )
                .join("")
              }
            </tbody>
          </table>
        `
        :
        `
          <div class="empty-state u-mt-14">
            <p>
              ${state.language === "en"
                ? "No valid scores yet today."
                : "Todavía no hay puntajes válidos hoy."
              }
            </p>
          </div>
        `
      }
    </div>
  `;
}

function renderGamePlayerCard()
{
  const player =
  getGamePlayer();

  return `
    <div class="game-player-card">
      <h3>
        ${state.language === "en" ? "Your player" : "Tu jugador"}
      </h3>

      <p>
        ${state.language === "en"
          ? "Your WhatsApp is used only to identify your player in the ranking."
          : "Tu WhatsApp se usa solamente para identificar tu jugador en el ranking."
        }
      </p>

      ${player
        ?
        `
          <div class="game-player-current">
            <div>
              <strong>${escapeHtml(player.name)}</strong>
              <small>${state.language === "en" ? "Private WhatsApp saved" : "WhatsApp guardado de forma privada"}</small>
            </div>

            <button
              class="btn small secondary"
              type="button"
              data-action="clear-game-player">
              ${state.language === "en" ? "Change" : "Cambiar"}
            </button>
          </div>
        `
        :
        `
          <div class="game-player-form">
            <div class="admin-field">
              <label for="gamePlayerName">
                ${state.language === "en" ? "Name / nickname" : "Nombre / apodo"}
              </label>

              <input
                id="gamePlayerName"
                class="text-input"
                type="text"
                maxlength="40"
                placeholder="${state.language === "en" ? "Your name" : "Tu nombre"}">
            </div>

            <div class="admin-field">
              <label for="gamePlayerPhone">
                WhatsApp
              </label>

              <input
                id="gamePlayerPhone"
                class="text-input"
                type="tel"
                maxlength="25"
                placeholder="11...">
            </div>

            <button
              class="btn"
              type="button"
              data-action="save-game-player">
              ${state.language === "en" ? "Save" : "Guardar"}
            </button>
          </div>
        `
      }
    </div>
  `;
}

function getGameEligibleProducts()
{
  return state.products.filter(
    product =>
    Boolean(
      getProductMainImage(
        product
      )
    )
    &&
    product.stock >= 0
  );
}

function chooseRandom(
  array
)
{
  if (
    !array ||
    array.length === 0
  )
  {
    return null;
  }

  const index =
  Math.floor(
    Math.random() *
    array.length
  );

  return array[
    index
  ];
}

async function startGame(
  type
)
{
  clearGameTimer();

  if (
    !getGamePlayer()
  )
  {
    toast(
      state.language === "en"
      ?
      "Save your player name and WhatsApp before playing."
      :
      "Guardá tu nombre y WhatsApp antes de jugar.",
      "error"
    );

    setRoute(
      "games"
    );

    return;
  }

  let product =
  null;

  if (
    isAiEnabled(
      "games_ai_enabled"
    )
  )
  {
    try
    {
      const ai =
      await callAromaAI(
        "game",
        {
          gameType:
          type,

          products:
          getAiCatalogPayload(),
        }
      );

      const result =
      typeof ai === "string"
      ?
      safeJsonParse(
        ai,
        null
      )
      :
      ai;

      if (
        result &&
        result.product_id
      )
      {
        product =
        getProductById(
          result.product_id
        );
      }
    }
    catch (
      error
    )
    {
      console.warn(
        "AI game fallback:",
        error
      );
    }
  }

  if (
    !product
  )
  {
    product =
    chooseRandom(
      getGameEligibleProducts()
    );
  }

  if (
    !product
  )
  {
    toast(
      state.language === "en"
      ?
      "Upload product images before playing."
      :
      "Necesitás perfumes con imágenes para jugar.",
      "error"
    );

    return;
  }

  state.game =
  {
    type:
    type,

    productId:
    product.id,

    startedAt:
    Date.now(),

    timerId:
    null,

    remaining:
    Math.max(
      10,
      asNumber(
        getGameConfig(
          type
        ).tiempo_limite,
        type === "hidden"
        ?
        90
        :
        180
      )
    ),

    moves:
    0,

    selectedPuzzleIndex:
    null,

    puzzleOrder:
    [],

    differences:
    [],

    differencesFound:
    new Set(),

    hiddenTargetIndex:
    null,
  };

  prepareGameState();

  setRoute(
    "game",
    {
      type:
      type,
    }
  );
}

function prepareGameState()
{
  if (
    state.game.type === "puzzle"
  )
  {
    preparePuzzle();
  }

  if (
    state.game.type === "differences"
  )
  {
    prepareDifferences();
  }

  if (
    state.game.type === "hidden"
  )
  {
    prepareHiddenGame();
  }
}

function preparePuzzle()
{
  const order =
  Array.from(
    {
      length:
      20,
    },
    (
      _,
      index
    ) =>
    index
  );

  shuffleArray(
    order
  );

  if (
    order.every(
      (
        value,
        index
      ) =>
      value === index
    )
  )
  {
    [
      order[0],
      order[1],
    ]
    =
    [
      order[1],
      order[0],
    ];
  }

  state.game.puzzleOrder =
  order;

  state.game.selectedPuzzleIndex =
  null;

  state.game.moves =
  0;
}

function prepareDifferences()
{
  /*
    Banco de posiciones discretas.
    Cada partida mezcla el banco y toma solo cinco puntos.
    Los cambios son deliberadamente pequeños: el objetivo es que
    se perciban al observar, no que aparezcan como manchas obvias.
  */
  const positionPool =
  [
    { x: 10.5, y: 12.5 },
    { x: 25.0, y: 19.0 },
    { x: 43.0, y: 13.5 },
    { x: 67.0, y: 18.0 },
    { x: 83.0, y: 27.0 },
    { x: 15.0, y: 42.0 },
    { x: 34.0, y: 39.0 },
    { x: 55.5, y: 42.5 },
    { x: 76.0, y: 48.0 },
    { x: 89.0, y: 52.0 },
    { x: 19.0, y: 69.0 },
    { x: 38.0, y: 65.0 },
    { x: 58.5, y: 68.0 },
    { x: 73.5, y: 74.0 },
    { x: 86.0, y: 78.0 },
  ];

  shuffleArray(
    positionPool
  );

  const chosen =
  positionPool.slice(
    0,
    5
  );

  state.game.differences =
  chosen.map(
    (
      position,
      index
    ) =>
    {
      const size =
      4.0 +
      Math.random() * 2.2;

      const opacity =
      0.14 +
      Math.random() * 0.12;

      const rotation =
      Math.round(
        -18 +
        Math.random() * 36
      );

      const hitSize =
      Math.max(
        9.5,
        size + 4.2
      );

      return {
        id:
        index,

        x:
        position.x,

        y:
        position.y,

        type:
        1 +
        Math.floor(
          Math.random() * 8
        ),

        size:
        Number(
          size.toFixed(2)
        ),

        opacity:
        Number(
          opacity.toFixed(2)
        ),

        rotation:
        rotation,

        hitSize:
        Number(
          hitSize.toFixed(2)
        ),
      };
    }
  );

  state.game.differencesFound =
  new Set();

  state.game.moves =
  0;
}

function prepareHiddenGame()
{
  const candidates =
  getGameEligibleProducts();

  const target =
  getProductById(
    state.game.productId
  );

  const decoys =
  candidates
  .filter(
    product =>
    product.id !== target?.id
  );

  shuffleArray(
    decoys
  );

  const tiles =
  decoys
  .slice(
    0,
    23
  );

  const targetIndex =
  Math.floor(
    Math.random() *
    (
      tiles.length +
      1
    )
  );

  tiles.splice(
    targetIndex,
    0,
    target
  );

  state.game.hiddenProducts =
  tiles;

  state.game.hiddenTargetIndex =
  targetIndex;
}

function shuffleArray(
  array
)
{
  for (
    let index =
    array.length - 1;

    index > 0;

    index--
  )
  {
    const random =
    Math.floor(
      Math.random() *
      (
        index +
        1
      )
    );

    [
      array[index],
      array[random],
    ]
    =
    [
      array[random],
      array[index],
    ];
  }

  return array;
}

function renderGamePage()
{
  const type =
  state.game.type;

  if (
    !type
  )
  {
    return renderGamesHubPage();
  }

  const product =
  getProductById(
    state.game.productId
  );

  if (
    !product
  )
  {
    return renderGamesHubPage();
  }

  const content =
  type === "puzzle"
  ?
  renderPuzzleGame(
    product
  )
  :
  type === "differences"
  ?
  renderDifferencesGame(
    product
  )
  :
  renderHiddenGame(
    product
  );

  return `
    <section class="section">
      <div class="container">
        <div class="game-topbar">
          <button
            class="text-link"
            type="button"
            data-route="games">
            ←
            ${escapeHtml(t("games.back"))}
          </button>

          <div class="game-status">
            <span>
              ${escapeHtml(t("games.time"))}:
              <strong id="gameTime">
                ${formatGameTime(state.game.remaining)}
              </strong>
            </span>

            <span id="gameSecondaryStatus">
              ${renderGameSecondaryStatus()}
            </span>
          </div>

          <button
            class="btn small"
            type="button"
            data-action="restart-game">
            ${escapeHtml(t("games.restart"))}
          </button>
        </div>

        ${content}
      </div>
    </section>
  `;
}

function renderGameSecondaryStatus()
{
  if (
    state.game.type === "puzzle"
  )
  {
    return (
      escapeHtml(
        t(
          "games.moves"
        )
      )
      +
      ": <strong>" +
      state.game.moves +
      "</strong>"
    );
  }

  if (
    state.game.type === "differences"
  )
  {
    return (
      escapeHtml(
        t(
          "games.found"
        )
      )
      +
      ": <strong>" +
      state.game.differencesFound.size +
      "/5</strong>"
    );
  }

  return "";
}

function renderPuzzleGame(
  product
)
{
  const image =
  getProductMainImage(
    product
  );

  const order =
  state.game.puzzleOrder;

  return `
    <div>
      <div class="section-title-row">
        <div>
          <p class="eyebrow">
            ${escapeHtml(t("games.puzzle"))}
          </p>

          <h1 class="section-title">
            ${escapeHtml(product.nombre)}
          </h1>
        </div>
      </div>

      <div
        class="puzzle-board"
        id="puzzleBoard">
        ${order
          .map(
            (
              sourceIndex,
              boardIndex
            ) =>
            renderPuzzlePiece(
              image,
              sourceIndex,
              boardIndex
            )
          )
          .join("")
        }
      </div>
    </div>
  `;
}

function renderPuzzlePiece(
  image,
  sourceIndex,
  boardIndex
)
{
  const columns =
  5;

  const rows =
  4;

  const sourceColumn =
  sourceIndex %
  columns;

  const sourceRow =
  Math.floor(
    sourceIndex /
    columns
  );

  const x =
  columns === 1
  ?
  0
  :
  (
    sourceColumn /
    (
      columns -
      1
    )
  )
  *
  100;

  const y =
  rows === 1
  ?
  0
  :
  (
    sourceRow /
    (
      rows -
      1
    )
  )
  *
  100;

  return `
    <button
      class="puzzle-piece ${state.game.selectedPuzzleIndex === boardIndex ? "selected" : ""}"
      type="button"
      data-action="puzzle-piece"
      data-index="${boardIndex}"
      style="
        background-image:url('${escapeAttribute(image)}');
        background-size:${columns * 100}% ${rows * 100}%;
        background-position:${x}% ${y}%;
      "
      aria-label="Pieza ${boardIndex + 1}">
    </button>
  `;
}

function puzzlePieceClick(
  index
)
{
  const numericIndex =
  Number(
    index
  );

  if (
    state.game.selectedPuzzleIndex === null
  )
  {
    state.game.selectedPuzzleIndex =
    numericIndex;

    renderCurrentRoute();

    return;
  }

  if (
    state.game.selectedPuzzleIndex === numericIndex
  )
  {
    state.game.selectedPuzzleIndex =
    null;

    renderCurrentRoute();

    return;
  }

  const first =
  state.game.selectedPuzzleIndex;

  [
    state.game.puzzleOrder[first],
    state.game.puzzleOrder[numericIndex],
  ]
  =
  [
    state.game.puzzleOrder[numericIndex],
    state.game.puzzleOrder[first],
  ];

  state.game.moves +=
  1;

  state.game.selectedPuzzleIndex =
  null;

  if (
    isPuzzleSolved()
  )
  {
    completeGame(
      true
    );

    return;
  }

  renderCurrentRoute();
}

function isPuzzleSolved()
{
  return state.game.puzzleOrder.every(
    (
      sourceIndex,
      boardIndex
    ) =>
    sourceIndex === boardIndex
  );
}

function renderDifferencesGame(
  product
)
{
  const image =
  getProductMainImage(
    product
  );

  const instruction =
  state.language === "en"
  ?
  "Five small details changed. There are no hints: compare texture, light, color and tiny shapes. A ring appears only after you find one."
  :
  "Cambiaran cinco detalles pequeños. No hay pistas: compará textura, luz, color y formas mínimas. El círculo aparece recién cuando encontrás una.";

  return `
    <div>
      <div class="section-title-row">
        <div>
          <p class="eyebrow">
            ${escapeHtml(t("games.diff"))}
          </p>

          <h1 class="section-title">
            ${escapeHtml(product.nombre)}
          </h1>
        </div>
      </div>

      <div class="game-instruction-card">
        <span>
          ${escapeHtml(instruction)}
        </span>

        <strong>
          ${state.language === "en" ? "High difficulty" : "Dificultad alta"}
        </strong>
      </div>

      <div class="differences-board">
        <div class="difference-image">
          <img
            src="${escapeAttribute(image)}"
            alt="${escapeAttribute(product.nombre)}">
        </div>

        <div class="difference-image">
          <img
            src="${escapeAttribute(image)}"
            alt="${escapeAttribute(product.nombre)}">

          ${state.game.differences
            .map(
              difference =>
              {
                const hit =
                asNumber(
                  difference.hitSize,
                  10
                );

                const left =
                clamp(
                  difference.x - hit / 2,
                  0,
                  100 - hit
                );

                const top =
                clamp(
                  difference.y - hit / 2,
                  0,
                  100 - hit
                );

                return `
                  <span
                    class="difference-mark type-${difference.type}"
                    style="
                      left:${difference.x}%;
                      top:${difference.y}%;
                      --diff-size:${difference.size}%;
                      --diff-opacity:${difference.opacity};
                      --diff-rotation:${difference.rotation}deg;
                    ">
                  </span>

                  <button
                    class="difference-zone ${state.game.differencesFound.has(difference.id) ? "found" : ""}"
                    type="button"
                    data-action="difference-zone"
                    data-difference-id="${difference.id}"
                    style="
                      left:${left}%;
                      top:${top}%;
                      --hit-size:${hit}%;
                    "
                    aria-label="${state.language === "en" ? "Difference" : "Diferencia"}">
                  </button>
                `;
              }
            )
            .join("")
          }
        </div>
      </div>
    </div>
  `;
}

function findDifference(
  id
)
{
  const numericId =
  Number(
    id
  );

  if (
    state.game.differencesFound.has(
      numericId
    )
  )
  {
    return;
  }

  state.game.differencesFound.add(
    numericId
  );

  state.game.moves +=
  1;

  if (
    state.game.differencesFound.size >=
    state.game.differences.length
  )
  {
    completeGame(
      true
    );

    return;
  }

  renderCurrentRoute();
}

function renderHiddenGame(
  product
)
{
  const tiles =
  state.game.hiddenProducts
  ||
  [];

  return `
    <div>
      <div class="section-title-row">
        <div>
          <p class="eyebrow">
            ${escapeHtml(t("games.hidden"))}
          </p>

          <h1 class="section-title">
            ${state.language === "en" ? "Find " : "Encontrá "}
            ${escapeHtml(product.nombre)}
          </h1>

          <p class="section-subtitle">
            ${escapeHtml(t("games.hidden.desc"))}
          </p>
        </div>
      </div>

      <div class="hidden-game-grid">
        ${tiles
          .map(
            (
              tile,
              index
            ) =>
            {
              const image =
              tile
              ?
              getProductMainImage(
                tile
              )
              :
              "";

              return `
                <button
                  class="hidden-tile ${index === state.game.hiddenTargetIndex ? "target" : "decoy"}"
                  type="button"
                  data-action="hidden-tile"
                  data-index="${index}">
                  ${image
                    ?
                    `
                      <img
                        src="${escapeAttribute(image)}"
                        alt="">
                    `
                    :
                    "✦"
                  }
                </button>
              `;
            }
          )
          .join("")
        }
      </div>
    </div>
  `;
}

function hiddenTileClick(
  index
)
{
  state.game.moves +=
  1;

  if (
    Number(
      index
    ) ===
    Number(
      state.game.hiddenTargetIndex
    )
  )
  {
    completeGame(
      true
    );

    return;
  }

  toast(
    state.language === "en"
    ?
    "Not that one. Keep looking."
    :
    "Ese no es. Seguí buscando.",
    "error",
    1400
  );
}

function formatGameTime(
  seconds
)
{
  const safe =
  Math.max(
    0,
    Math.floor(
      asNumber(
        seconds,
        0
      )
    )
  );

  const minutes =
  Math.floor(
    safe /
    60
  );

  const remainder =
  safe %
  60;

  return (
    String(
      minutes
    )
    .padStart(
      2,
      "0"
    )
    +
    ":" +
    String(
      remainder
    )
    .padStart(
      2,
      "0"
    )
  );
}

function afterRenderGame()
{
  clearGameTimer();

  if (
    state.route !== "game"
  )
  {
    return;
  }

  state.game.timerId =
  window.setInterval(
    () =>
    {
      state.game.remaining -=
      1;

      const time =
      document.getElementById(
        "gameTime"
      );

      if (
        time
      )
      {
        time.textContent =
        formatGameTime(
          state.game.remaining
        );
      }

      if (
        state.game.remaining <= 0
      )
      {
        completeGame(
          false
        );
      }
    },
    1000
  );
}

function clearGameTimer()
{
  if (
    state.game &&
    state.game.timerId
  )
  {
    clearInterval(
      state.game.timerId
    );

    state.game.timerId =
    null;
  }
}

async function completeGame(
  completed
)
{
  clearGameTimer();

  const elapsed =
  Math.max(
    0,
    Math.round(
      (
        Date.now() -
        (
          state.game.startedAt
          ||
          Date.now()
        )
      )
      /
      1000
    )
  );

  try
  {
    await supabaseClient.rpc(
      "register_game_result",
      {
        p_game_type:
        state.game.type,

        p_product_id:
        Number(
          state.game.productId
        ),

        p_completed:
        Boolean(
          completed
        ),

        p_duration_seconds:
        elapsed,

        p_attempts:
        Math.max(
          1,
          state.game.moves
        ),
      }
    );
  }
  catch (
    error
  )
  {
    console.warn(
      "game_activity:",
      error
    );
  }

  const scoreResult =
  await submitDailyGameScore(
    Boolean(
      completed
    ),
    elapsed
  );

  const points =
  scoreResult &&
  typeof scoreResult === "object"
  ?
  asNumber(
    scoreResult.points,
    0
  )
  :
  0;

  const solvedToday =
  scoreResult &&
  typeof scoreResult === "object"
  ?
  asNumber(
    scoreResult.solved_today,
    0
  )
  :
  0;

  openModal(
    completed
    ?
    t(
      "games.win"
    )
    :
    t(
      "games.lose"
    ),
    `
      <div class="empty-state">
        <h3>
          ${escapeHtml(
            completed
            ?
            t("games.win")
            :
            t("games.lose")
          )}
        </h3>

        <p>
          ${escapeHtml(t("games.time"))}:
          ${formatGameTime(elapsed)}
        </p>

        ${completed && points
          ?
          `
            <div class="game-score-earned">
              <strong>+${formatInteger(points)}</strong>
              <span>
                ${state.language === "en" ? "points earned" : "puntos ganados"}
              </span>
            </div>

            <p class="u-mt-14">
              ${state.language === "en"
                ? `Solved today: ${formatInteger(solvedToday)}`
                : `Resueltos hoy: ${formatInteger(solvedToday)}`
              }
            </p>
          `
          :
          ""
        }

        <div class="u-flex-center-gap u-mt-14">
          <button
            class="btn"
            type="button"
            data-action="restart-game">
            ${escapeHtml(t("games.restart"))}
          </button>

          <button
            class="btn secondary"
            type="button"
            data-route="games">
            ${state.language === "en" ? "See ranking" : "Ver ranking"}
          </button>
        </div>
      </div>
    `
  );
}

function restartGame()
{
  const type =
  state.game.type;

  if (
    !type
  )
  {
    setRoute(
      "games"
    );

    return;
  }

  startGame(
    type
  );
}

