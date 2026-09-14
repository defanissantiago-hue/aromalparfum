"use strict";

// AromaLParfum Frontend V2 — Paso 46
// Módulo: eventos globales, compatibilidad e inicialización

    function openSearchModal()
    {
      openModal(
        state.language === "en"
        ?
        "Search fragrances"
        :
        "Buscar perfumes",
        `
          <div class="admin-form">
            <input
              id="globalSearchInput"
              class="search-input"
              type="search"
              placeholder="${escapeAttribute(t("catalog.search"))}"
              autofocus>

            <button
              class="btn"
              type="button"
              data-action="global-search-submit">
              ${state.language === "en" ? "Search" : "Buscar"}
            </button>
          </div>
        `
      );

      window.setTimeout(
        () =>
        {
          document.getElementById(
            "globalSearchInput"
          )?.focus();
        },
        30
      );
    }

    function submitGlobalSearch()
    {
      const value =
      document.getElementById(
        "globalSearchInput"
      )?.value.trim()
      ||
      "";

      state.catalogSearch =
      value;

      state.catalogFilter =
      "Todos";

      state.catalogPage =
      1;

      if (typeof catalogScheduleSmartSearch === "function")
      {
        catalogScheduleSmartSearch(
          value,
          0
        );
      }

      setRoute(
        "catalog"
      );
    }

    function handleRouteElement(
      element
    )
    {
      const route =
      element.dataset.route;

      if (
        !route
      )
      {
        return false;
      }

      if (
        route === "admin" &&
        document.body?.dataset.entry !== "admin"
      )
      {
        window.location.href = "admin/";
        return true;
      }

      if (
        route !== "admin" &&
        document.body?.dataset.entry === "admin"
      )
      {
        window.location.href = "../";
        return true;
      }

      if (
        route === "catalog"
      )
      {
        state.catalogFilter =
        element.dataset.filter
        ||
        "Todos";

        state.catalogPage =
        1;
      }

      if (
        route === "product"
      )
      {
        state.selectedGalleryUrl =
        "";

        setRoute(
          "product",
          {
            id:
            Number(
              element.dataset.productId
            ),
          }
        );

        return true;
      }

      if (
        route === "collection"
      )
      {
        setRoute(
          "collection",
          {
            slug:
            element.dataset.collectionSlug
            ||
            "",
          }
        );

        return true;
      }

      if (
        route === "campaign"
      )
      {
        const slug =
        element.dataset.campaignSlug
        ||
        "";

        setRoute(
          "campaign",
          {
            slug,
            campaign_slug: slug,
          }
        );

        return true;
      }

      setRoute(
        route
      );

      return true;
    }

    async function handleAction(
      element
    )
    {
      const action =
      element.dataset.action;

      if (
        !action
      )
      {
        return;
      }

      switch (
        action
      )
      {
        case "home":
        {
          setRoute(
            "home"
          );

          break;
        }

        case "open-menu":
        {
          openMenu();

          break;
        }

        case "close-menu":
        {
          closeMenu();

          break;
        }

        case "open-cart":
        {
          openCart();

          break;
        }

        case "close-cart":
        {
          closeCart();

          break;
        }

        case "close-modal":
        {
          closeModal();

          break;
        }

        case "open-search":
        {
          openSearchModal();

          break;
        }

        case "global-search-submit":
        {
          submitGlobalSearch();

          break;
        }

        case "select-hero-collection":
        {
          state.heroCollectionIndex =
          clamp(
            asNumber(
              element.dataset.index,
              0
            ),
            0,
            Math.max(
              0,
              getHeroCollections().length - 1
            )
          );

          renderCurrentRoute();

          break;
        }

        case "toggle-favorite":
        {
          toggleFavorite(
            element.dataset.productId
          );

          break;
        }

        case "add-product":
        {
          addProductToCart(
            element.dataset.productId
          );

          break;
        }

        case "product-v2-compare-toggle":
        {
          productV2ToggleCompare(
            element.dataset.productId
          );

          break;
        }

        case "product-v2-compare-open":
        {
          await productV2OpenComparator();

          break;
        }

        case "product-v2-compare-clear":
        {
          productV2ClearCompare();
          closeModal();

          break;
        }

        case "cart-qty":
        {
          changeCartQuantity(
            element.dataset.cartKey,
            asNumber(
              element.dataset.delta,
              0
            )
          );

          break;
        }

        case "remove-cart-line":
        {
          removeCartLine(
            element.dataset.cartKey
          );

          break;
        }

        case "checkout":
        {
          openCheckout();

          break;
        }

        case "validate-game-discount":
        {
          await validateGameDiscount();

          break;
        }

        case "send-whatsapp-order":
        {
          sendWhatsAppOrder();

          break;
        }

        case "shipping-choice":
        {
          toggleShippingFields();

          break;
        }

        case "catalog-filter":
        {
          state.catalogFilter =
          element.dataset.filter
          ||
          "Todos";

          state.catalogPage =
          1;

          renderCurrentRoute();

          break;
        }

        case "catalog-page":
        {
          state.catalogPage =
          Math.max(
            1,
            asNumber(
              element.dataset.page,
              1
            )
          );

          renderCurrentRoute();

          window.scrollTo(
            {
              top:
              0,

              behavior:
              "smooth",
            }
          );

          break;
        }

        case "clear-catalog":
        {
          state.catalogFilter =
          "Todos";

          state.catalogSearch =
          "";

          state.catalogSort =
          "default";

          state.catalogPage =
          1;

          if (typeof catalogClearAdvancedFilters === "function")
          {
            catalogClearAdvancedFilters();
          }

          if (typeof catalogResetSearchEnhancements === "function")
          {
            catalogResetSearchEnhancements();
          }

          renderCurrentRoute();

          break;
        }

        case "clear-advanced-catalog":
        {
          if (typeof catalogClearAdvancedFilters === "function")
          {
            catalogClearAdvancedFilters();
          }

          state.catalogPage = 1;
          renderCurrentRoute();
          break;
        }

        case "clear-catalog-search":
        {
          state.catalogSearch = "";
          state.catalogPage = 1;

          if (typeof catalogResetSearchEnhancements === "function")
          {
            catalogResetSearchEnhancements();
          }

          renderCurrentRoute();
          break;
        }

        case "catalog-suggestion":
        {
          if (typeof catalogV2SelectSuggestion === "function")
          {
            catalogV2SelectSuggestion(
              element.dataset.value || ""
            );
          }

          break;
        }

        case "select-gallery-image":
        {
          state.selectedGalleryUrl =
          element.dataset.imageUrl
          ||
          "";

          renderCurrentRoute();

          break;
        }

        case "add-decant":
        {
          await addDecantToDraft(
            element.dataset.productId
          );

          break;
        }

        case "remove-decant":
        {
          const index =
          asNumber(
            element.dataset.index,
            -1
          );

          if (
            index >= 0
          )
          {
            state.decantDraft.splice(
              index,
              1
            );

            updateDecantSummaryOnly();
          }

          break;
        }

        case "add-decant-bundle-to-cart":
        {
          addDecantBundleToCart();

          break;
        }

        case "add-gift-product":
        {
          addGiftProductToDraft(
            element.dataset.productId
          );

          break;
        }

        case "remove-gift-product":
        {
          const index =
          asNumber(
            element.dataset.index,
            -1
          );

          if (
            index >= 0
          )
          {
            state.giftDraft.splice(
              index,
              1
            );

            updateGiftSummaryOnly();
          }

          break;
        }

        case "add-gift-bundle-to-cart":
        {
          addGiftBundleToCart();

          break;
        }

        case "save-game-player":
        {
          saveGamePlayerFromForm();

          break;
        }

        case "clear-game-player":
        {
          clearGamePlayer();

          break;
        }

        case "start-game":
        {
          await startGame(
            element.dataset.gameType
          );

          break;
        }

        case "restart-game":
        {
          closeModal();

          restartGame();

          break;
        }

        case "puzzle-piece":
        {
          puzzlePieceClick(
            element.dataset.index
          );

          break;
        }

        case "difference-zone":
        {
          findDifference(
            element.dataset.differenceId
          );

          break;
        }

        case "hidden-tile":
        {
          hiddenTileClick(
            element.dataset.index
          );

          break;
        }

        case "advisor-send":
        {
          await sendAdvisorMessage();

          break;
        }

        case "advisor-prompt":
        {
          const input =
          document.getElementById(
            "advisorInput"
          );

          if (
            input
          )
          {
            input.value =
            element.dataset.prompt
            ||
            "";

            input.focus();
          }

          break;
        }

        case "open-whatsapp":
        {
          openWhatsAppGeneral();

          break;
        }

        case "send-contact-whatsapp":
        {
          sendContactWhatsApp();

          break;
        }

        case "reload-data":
        {
          await loadAllData();

          break;
        }

        case "admin-login":
        {
          await adminLogin();

          break;
        }

        case "admin-recover":
        {
          await adminRecoverPassword();

          break;
        }

        case "admin-logout":
        {
          await adminLogout();

          break;
        }

        case "admin-reload":
        {
          await reloadAdminData();
          break;
        }

        case "admin-dashboard-refresh":
        {
          if (typeof alp48RefreshDashboard === "function")
          {
            await alp48RefreshDashboard();
          }
          break;
        }

        case "admin-dashboard-range":
        {
          if (typeof alp48SetDashboardRange === "function")
          {
            alp48SetDashboardRange(element.dataset.days);
          }
          break;
        }

        case "admin-product-page":
        {
          state.admin.productPage =
          Math.max(
            1,
            Number(element.dataset.page) || 1
          );

          refreshAdminTab();
          break;
        }

        case "admin-load-gallery":
        {
          const productId =
          Number(element.dataset.productId);

          element.disabled = true;
          element.textContent =
          state.language === "en" ? "Loading..." : "Cargando...";

          await ensureProductGallery(productId);
          updateAdminPhotoCell(productId);
          break;
        }

        case "admin-tab":
        {
          state.admin.tab =
          element.dataset.tab
          ||
          "products";

          refreshAdminTab();

          break;
        }

        case "admin-inventory-refresh":
        {
          if (typeof alp50LoadInventory === "function")
          {
            await alp50LoadInventory({ force: true });
          }
          break;
        }

        case "admin-inventory-apply-filters":
        {
          if (typeof alp50ApplyFilters === "function")
          {
            await alp50ApplyFilters();
          }
          break;
        }

        case "admin-inventory-reset-filters":
        {
          if (typeof alp50ResetFilters === "function")
          {
            await alp50ResetFilters();
          }
          break;
        }

        case "admin-inventory-page":
        {
          if (typeof alp50SetPage === "function")
          {
            await alp50SetPage(element.dataset.page);
          }
          break;
        }

        case "admin-inventory-open":
        {
          if (typeof alp50OpenStrategy === "function")
          {
            alp50OpenStrategy(element.dataset.productId);
          }
          break;
        }

        case "admin-inventory-close":
        {
          if (typeof alp50CloseStrategy === "function")
          {
            alp50CloseStrategy();
          }
          break;
        }

        case "admin-inventory-save-strategy":
        {
          if (typeof alp50SaveStrategy === "function")
          {
            await alp50SaveStrategy(element.dataset.productId);
          }
          break;
        }

        case "admin-finance-refresh":
        {
          if (typeof alp51LoadFinance === "function")
          {
            await alp51LoadFinance({ force: true });
          }
          break;
        }

        case "admin-finance-apply-filters":
        {
          if (typeof alp51ApplyFilters === "function")
          {
            await alp51ApplyFilters();
          }
          break;
        }

        case "admin-finance-reset-filters":
        {
          if (typeof alp51ResetFilters === "function")
          {
            alp51ResetFilters();
          }
          break;
        }

        case "admin-finance-page":
        {
          if (typeof alp51SetPage === "function")
          {
            alp51SetPage(element.dataset.page);
          }
          break;
        }

        case "admin-finance-edit-cost":
        {
          if (typeof alp51OpenCostEditor === "function")
          {
            alp51OpenCostEditor(element.dataset.productId);
          }
          break;
        }

        case "admin-finance-close-cost":
        {
          if (typeof alp51CloseCostEditor === "function")
          {
            alp51CloseCostEditor();
          }
          break;
        }

        case "admin-finance-save-cost":
        {
          if (typeof alp51SaveCost === "function")
          {
            await alp51SaveCost(element.dataset.productId);
          }
          break;
        }

        case "admin-packs-refresh":
        {
          if (typeof alp53LoadPacks === "function") await alp53LoadPacks({ force: true });
          break;
        }

        case "admin-packs-section":
        {
          if (typeof alp53SetSection === "function") alp53SetSection(element.dataset.section);
          break;
        }

        case "admin-giftset-new":
        {
          if (typeof alp53NewGiftSet === "function") alp53NewGiftSet();
          break;
        }

        case "admin-giftset-edit":
        {
          if (typeof alp53EditGiftSet === "function") alp53EditGiftSet(element.dataset.id);
          break;
        }

        case "admin-giftset-cancel":
        {
          if (typeof alp53CancelGiftSet === "function") alp53CancelGiftSet();
          break;
        }

        case "admin-giftset-save":
        {
          if (typeof alp53SaveGiftSet === "function") await alp53SaveGiftSet();
          break;
        }

        case "admin-giftset-toggle":
        {
          if (typeof alp53Toggle === "function") await alp53Toggle("gift_set", element.dataset.id, element.dataset.active === "true");
          break;
        }

        case "admin-giftset-component-add":
        {
          if (typeof alp53AddGiftComponent === "function") await alp53AddGiftComponent(element.dataset.id);
          break;
        }

        case "admin-giftset-component-save":
        {
          if (typeof alp53SaveGiftComponent === "function") await alp53SaveGiftComponent(element.dataset.id);
          break;
        }

        case "admin-giftset-component-remove":
        {
          if (typeof alp53RemoveGiftComponent === "function") await alp53RemoveGiftComponent(element.dataset.id);
          break;
        }

        case "admin-giftset-component-move":
        {
          if (typeof alp53MoveComponent === "function") await alp53MoveComponent("gift", element.dataset.id, element.dataset.direction);
          break;
        }

        case "admin-discovery-new":
        {
          if (typeof alp53NewDiscovery === "function") alp53NewDiscovery();
          break;
        }

        case "admin-discovery-edit":
        {
          if (typeof alp53EditDiscovery === "function") alp53EditDiscovery(element.dataset.id);
          break;
        }

        case "admin-discovery-cancel":
        {
          if (typeof alp53CancelDiscovery === "function") alp53CancelDiscovery();
          break;
        }

        case "admin-discovery-save":
        {
          if (typeof alp53SaveDiscovery === "function") await alp53SaveDiscovery();
          break;
        }

        case "admin-discovery-toggle":
        {
          if (typeof alp53Toggle === "function") await alp53Toggle("discovery_box", element.dataset.id, element.dataset.active === "true");
          break;
        }

        case "admin-discovery-component-add":
        {
          if (typeof alp53AddDiscoveryComponent === "function") await alp53AddDiscoveryComponent(element.dataset.id);
          break;
        }

        case "admin-discovery-component-save":
        {
          if (typeof alp53SaveDiscoveryComponent === "function") await alp53SaveDiscoveryComponent(element.dataset.id);
          break;
        }

        case "admin-discovery-component-remove":
        {
          if (typeof alp53RemoveDiscoveryComponent === "function") await alp53RemoveDiscoveryComponent(element.dataset.id);
          break;
        }

        case "admin-discovery-component-move":
        {
          if (typeof alp53MoveComponent === "function") await alp53MoveComponent("discovery", element.dataset.id, element.dataset.direction);
          break;
        }

        case "admin-merch-refresh":
        {
          if (typeof alp52LoadMerchandising === "function")
          {
            await alp52LoadMerchandising({ force: true });
          }
          break;
        }

        case "admin-merch-section":
        {
          if (typeof alp52SetSection === "function")
          {
            alp52SetSection(element.dataset.section);
          }
          break;
        }

        case "admin-campaign-new":
        {
          if (typeof alp52NewCampaign === "function") alp52NewCampaign();
          break;
        }

        case "admin-campaign-edit":
        {
          if (typeof alp52EditCampaign === "function") alp52EditCampaign(element.dataset.id);
          break;
        }

        case "admin-campaign-cancel":
        {
          if (typeof alp52CancelCampaign === "function") alp52CancelCampaign();
          break;
        }

        case "admin-campaign-save":
        {
          if (typeof alp52SaveCampaign === "function") await alp52SaveCampaign();
          break;
        }

        case "admin-campaign-toggle":
        {
          if (typeof alp52ToggleEntity === "function")
          {
            await alp52ToggleEntity("campaign", element.dataset.id, element.dataset.active === "true");
          }
          break;
        }

        case "admin-campaign-product-add":
        {
          if (typeof alp52AddCampaignProduct === "function") await alp52AddCampaignProduct(element.dataset.campaignId);
          break;
        }

        case "admin-campaign-product-remove":
        {
          if (typeof alp52RemoveCampaignProduct === "function") await alp52RemoveCampaignProduct(element.dataset.id);
          break;
        }

        case "admin-campaign-product-move":
        {
          if (typeof alp52MoveCampaignProduct === "function") await alp52MoveCampaignProduct(element.dataset.id, element.dataset.direction);
          break;
        }

        case "admin-campaign-product-featured":
        {
          if (typeof alp52SetCampaignProductFeatured === "function")
          {
            await alp52SetCampaignProductFeatured(element.dataset.id, element.dataset.active === "true");
            if (typeof alp52LoadMerchandising === "function") await alp52LoadMerchandising({ force: true });
          }
          break;
        }

        case "admin-banner-new":
        {
          if (typeof alp52NewBanner === "function") alp52NewBanner();
          break;
        }

        case "admin-banner-edit":
        {
          if (typeof alp52EditBanner === "function") alp52EditBanner(element.dataset.id);
          break;
        }

        case "admin-banner-cancel":
        {
          if (typeof alp52CancelBanner === "function") alp52CancelBanner();
          break;
        }

        case "admin-banner-save":
        {
          if (typeof alp52SaveBanner === "function") await alp52SaveBanner();
          break;
        }

        case "admin-banner-toggle":
        {
          if (typeof alp52ToggleEntity === "function")
          {
            await alp52ToggleEntity("banner", element.dataset.id, element.dataset.active === "true");
          }
          break;
        }

        case "admin-weekly-new":
        {
          if (typeof alp52NewWeekly === "function") alp52NewWeekly();
          break;
        }

        case "admin-weekly-edit":
        {
          if (typeof alp52EditWeekly === "function") alp52EditWeekly(element.dataset.id);
          break;
        }

        case "admin-weekly-cancel":
        {
          if (typeof alp52CancelWeekly === "function") alp52CancelWeekly();
          break;
        }

        case "admin-weekly-save":
        {
          if (typeof alp52SaveWeekly === "function") await alp52SaveWeekly();
          break;
        }

        case "admin-weekly-toggle":
        {
          if (typeof alp52ToggleEntity === "function")
          {
            await alp52ToggleEntity("weekly_fragrance", element.dataset.id, element.dataset.active === "true");
          }
          break;
        }

        case "admin-merch-upload":
        {
          if (typeof alp52UploadMedia === "function")
          {
            await alp52UploadMedia(element.dataset.file, element.dataset.target, element.dataset.folder);
          }
          break;
        }

        case "admin-orders-refresh":
        {
          if (typeof alp49LoadOrders === "function")
          {
            await alp49LoadOrders({ force: true });
          }
          break;
        }

        case "admin-orders-filter":
        {
          if (typeof alp49ApplyFilters === "function")
          {
            alp49ApplyFilters();
          }
          break;
        }

        case "admin-order-page":
        {
          if (typeof alp49SetPage === "function")
          {
            alp49SetPage(element.dataset.page);
          }
          break;
        }

        case "admin-order-open":
        {
          if (typeof alp49OpenOrder === "function")
          {
            await alp49OpenOrder(element.dataset.orderId);
          }
          break;
        }

        case "admin-order-close":
        {
          if (typeof alp49CloseOrder === "function")
          {
            alp49CloseOrder();
          }
          break;
        }

        case "admin-order-confirm-stock":
        {
          if (typeof alp49ConfirmOrderStock === "function")
          {
            await alp49ConfirmOrderStock(element.dataset.orderId);
          }
          break;
        }

        case "admin-order-set-status":
        {
          if (typeof alp49SetOrderStatus === "function")
          {
            await alp49SetOrderStatus(element.dataset.orderId, element.dataset.status);
          }
          break;
        }

        case "admin-order-register-payment":
        {
          if (typeof alp49RegisterPayment === "function")
          {
            await alp49RegisterPayment(element.dataset.orderId);
          }
          break;
        }

        case "admin-order-cancel":
        {
          if (typeof alp49CancelOrder === "function")
          {
            await alp49CancelOrder(element.dataset.orderId);
          }
          break;
        }

        case "admin-order-copy-code":
        {
          if (typeof alp49CopyOrderCode === "function")
          {
            await alp49CopyOrderCode(element.dataset.orderId);
          }
          break;
        }

        case "admin-order-whatsapp":
        {
          if (typeof alp49OpenOrderWhatsApp === "function")
          {
            alp49OpenOrderWhatsApp(element.dataset.orderId);
          }
          break;
        }

        case "admin-customers-refresh":
        {
          if (typeof alp47LoadCustomers === "function")
          {
            await alp47LoadCustomers({ force: true });
          }
          break;
        }

        case "admin-customers-search":
        {
          if (typeof alp47ApplyCustomerSearchFromInput === "function")
          {
            alp47ApplyCustomerSearchFromInput();
          }
          break;
        }

        case "admin-customer-page":
        {
          if (typeof alp47SetCustomerPage === "function")
          {
            alp47SetCustomerPage(element.dataset.page);
          }
          break;
        }

        case "admin-customer-open":
        {
          if (typeof alp47OpenCustomer === "function")
          {
            await alp47OpenCustomer(element.dataset.customerId);
          }
          break;
        }

        case "admin-customer-close":
        {
          if (typeof alp47CloseCustomer === "function")
          {
            alp47CloseCustomer();
          }
          break;
        }

        case "admin-customer-reminder":
        {
          if (typeof alp47OpenReminderWhatsApp === "function")
          {
            alp47OpenReminderWhatsApp(
              element.dataset.customerId,
              element.dataset.productId || null
            );
          }
          break;
        }

        case "admin-award-yesterday":
        {
          await awardYesterdayGameWinner();

          break;
        }

        case "admin-send-game-reward":
        {
          sendGameRewardWhatsApp(
            element.dataset.rewardId
          );

          break;
        }

        case "admin-mark-game-reward-sent":
        {
          await updateGameRewardStatus(
            element.dataset.rewardId,
            "sent"
          );

          break;
        }

        case "admin-mark-game-reward-used":
        {
          await updateGameRewardStatus(
            element.dataset.rewardId,
            "used"
          );

          break;
        }

        case "admin-create-product":
        {
          await createProductFromAdmin();

          break;
        }

        case "admin-save-product":
        {
          await saveAdminProduct(
            element.dataset.productId
          );

          break;
        }

        case "admin-delete-product":
        {
          await deleteAdminProduct(
            element.dataset.productId
          );

          break;
        }

        case "admin-delete-photo":
        {
          await deleteAdminPhoto(
            element.dataset.imageId,
            element.dataset.productId,
            element.dataset.storagePath
          );

          break;
        }

        case "admin-ai-new":
        {
          await fillNewProductWithAI();

          break;
        }

        case "admin-ai-existing":
        {
          await fillExistingProductWithAI(
            element.dataset.productId
          );

          break;
        }

        case "admin-open-image-search":
        {
          openImageSearch(
            element.dataset.imageQuery
          );

          break;
        }

        case "admin-save-contact-settings":
        {
          await saveContactSettings();

          break;
        }

        case "admin-save-shipping-settings":
        {
          await saveShippingSettings();

          break;
        }

        case "admin-save-game-ads-settings":
        {
          await saveGameAdsSettings();

          break;
        }

        case "admin-save-video-settings":
        {
          await saveVideoSettings();

          break;
        }

        case "admin-delete-seasonal-video":
        {
          await deleteSeasonalVideo();

          break;
        }

        case "admin-save-ai-settings":
        {
          await saveAiSettings();

          break;
        }

        case "admin-save-cover-url":
        {
          await saveSiteCoverUrl(
            element.dataset.coverSlot
          );

          break;
        }

        case "admin-save-cover-position":
        {
          await saveSiteCoverPosition(
            element.dataset.coverSlot
          );

          break;
        }

        case "admin-delete-cover":
        {
          await deleteSiteCover(
            element.dataset.coverSlot,
            "cover_images"
          );

          break;
        }

        case "admin-delete-collection-cover":
        {
          await deleteSiteCover(
            element.dataset.collectionSlug,
            "collection_covers"
          );

          break;
        }

        case "admin-save-collection":
        {
          await saveAdminCollection(
            element.dataset.collectionId
          );

          break;
        }

        case "admin-save-game":
        {
          await saveAdminGame(
            element.dataset.gameId
          );

          break;
        }

        default:
        {
          console.debug(
            "Acción no manejada:",
            action
          );
        }
      }
    }

    document.addEventListener(
      "click",
      async (
        event
      ) =>
      {
        const routeElement =
        event.target.closest(
          "[data-route]"
        );

        if (
          routeElement
        )
        {
          event.preventDefault();

          if (
            handleRouteElement(
              routeElement
            )
          )
          {
            return;
          }
        }

        const actionElement =
        event.target.closest(
          "[data-action]"
        );

        if (
          actionElement
        )
        {
          event.preventDefault();

          await handleAction(
            actionElement
          );
        }
      }
    );

    document.addEventListener(
      "change",
      async (
        event
      ) =>
      {
        const target =
        event.target;

        if (
          target.id === "languageSelect"
        )
        {
          state.language =
          target.value === "en"
          ?
          "en"
          :
          "es";

          saveLocalState();

          clearGameTimer();

          renderCurrentRoute();

          return;
        }

        if (
          target.id === "catalogSort"
        )
        {
          state.catalogSort =
          target.value
          ||
          "default";

          state.catalogPage =
          1;

          renderCurrentRoute();

          return;
        }

        if (
          target.matches?.("[data-catalog-filter-key]")
        )
        {
          if (typeof catalogV2SetFilter === "function")
          {
            catalogV2SetFilter(
              target.dataset.catalogFilterKey,
              target.value
            );
          }

          return;
        }

        if (
          target.id === "adminProductPageSize"
        )
        {
          state.admin.productPageSize =
          Math.max(
            10,
            Number(target.value) || 20
          );

          state.admin.productPage = 1;
          refreshAdminTab();
          return;
        }

        if (
          target.id === "giftOption"
        )
        {
          state.selectedGiftOption =
          target.value;

          if (typeof alp41PersistBuilderDrafts === "function")
          {
            alp41PersistBuilderDrafts();
          }

          renderCurrentRoute();

          return;
        }

        if (
          target.matches(
            'input[name="checkoutShipping"]'
          )
        )
        {
          toggleShippingFields();

          return;
        }

        if (
          target.matches(
            "[data-admin-seasonal-video-upload]"
          )
        )
        {
          const file =
          target.files?.[0];

          if (
            file
          )
          {
            try
            {
              adminMessage(
                "Subiendo video...",
                "ok"
              );

              await uploadSeasonalVideoFile(
                file
              );

              refreshAdminTab();

              adminMessage(
                "Video subido correctamente.",
                "ok"
              );
            }
            catch (
              error
            )
            {
              adminMessage(
                error.message,
                "error"
              );
            }
          }

          return;
        }

        if (
          target.matches(
            "[data-admin-cover-upload]"
          )
        )
        {
          const slot =
          target.dataset.adminCoverUpload;

          const file =
          target.files?.[0];

          if (file)
          {
            try
            {
              adminMessage(
                "Subiendo portada...",
                "ok"
              );

              await uploadSiteCoverFile(
                slot,
                file,
                "cover_images"
              );

              refreshAdminTab();

              adminMessage(
                "Portada actualizada correctamente.",
                "ok"
              );
            }
            catch (error)
            {
              adminMessage(
                error.message,
                "error"
              );
            }
          }

          return;
        }

        if (
          target.matches(
            "[data-admin-collection-cover-upload]"
          )
        )
        {
          const slug =
          target.dataset.adminCollectionCoverUpload;

          const file =
          target.files?.[0];

          if (file)
          {
            try
            {
              adminMessage(
                "Subiendo portada de colección...",
                "ok"
              );

              await uploadSiteCoverFile(
                slug,
                file,
                "collection_covers"
              );

              refreshAdminTab();

              adminMessage(
                "Portada de colección actualizada.",
                "ok"
              );
            }
            catch (error)
            {
              adminMessage(
                error.message,
                "error"
              );
            }
          }

          return;
        }

        if (
          target.matches(
            "[data-admin-upload]"
          )
        )
        {
          const productId =
          Number(
            target.dataset.adminUpload
          );

          const files =
          Array.from(
            target.files
            ||
            []
          );

          if (
            files.length
          )
          {
            try
            {
              adminMessage(
                state.language === "en"
                ?
                "Uploading photos..."
                :
                "Subiendo fotos...",
                "ok"
              );

              await uploadProductImages(
                productId,
                files
              );
            }
            catch (
              error
            )
            {
              adminMessage(
                error.message,
                "error"
              );
            }
          }

          return;
        }
      }
    );

    document.addEventListener(
      "input",
      (
        event
      ) =>
      {
        const target =
        event.target;

        if (
          target.id === "adminProductSearch"
        )
        {
          state.admin.productSearch =
          target.value;

          state.admin.productPage = 1;

          const selectionStart = target.selectionStart;
          const selectionEnd = target.selectionEnd;

          refreshAdminTab();

          const fresh =
          document.getElementById("adminProductSearch");

          if (fresh)
          {
            fresh.focus();
            try
            {
              fresh.setSelectionRange(selectionStart, selectionEnd);
            }
            catch (_) {}
          }

          return;
        }

        if (
          target.id === "catalogSearch"
        )
        {
          if (typeof catalogV2OnSearchInput === "function")
          {
            catalogV2OnSearchInput(
              target
            );

            return;
          }

          state.catalogSearch = target.value;
          state.catalogPage = 1;
          renderCurrentRoute();
        }
      }
    );

    document.addEventListener(
      "keydown",
      async (
        event
      ) =>
      {
        if (
          event.key === "Escape"
        )
        {
          closeMenu();

          closeCart();

          closeModal();

          return;
        }

        if (
          event.key === "Enter" &&
          event.target?.id === "globalSearchInput"
        )
        {
          event.preventDefault();

          submitGlobalSearch();

          return;
        }

        if (
          event.key === "Enter" &&
          event.target?.id === "alp50InventorySearch"
        )
        {
          event.preventDefault();

          if (typeof alp50ApplyFilters === "function")
          {
            await alp50ApplyFilters();
          }

          return;
        }

        if (
          event.key === "Enter" &&
          event.target?.id === "advisorInput"
        )
        {
          event.preventDefault();

          await sendAdvisorMessage();
        }
      }
    );

    function validateCartAgainstStock()
    {
      let changed =
      false;

      const next =
      [];

      for (
        const line of
        state.cart
      )
      {
        if (
          line.kind !== "product"
        )
        {
          next.push(
            line
          );

          continue;
        }

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
          changed =
          true;

          continue;
        }

        const maxQty =
        Math.max(
          0,
          product.stock
        );

        if (
          maxQty <= 0
        )
        {
          changed =
          true;

          continue;
        }

        if (
          line.qty > maxQty
        )
        {
          line.qty =
          maxQty;

          changed =
          true;
        }

        next.push(
          line
        );
      }

      state.cart =
      next;

      if (
        changed
      )
      {
        saveLocalState();
      }
    }

    function exposeCompatibilityApi()
    {
      window.goHome =
      () =>
      setRoute(
        "home"
      );

      window.catalog =
      category =>
      {
        state.catalogFilter =
        category
        ||
        "Todos";

        state.catalogPage = 1;

        setRoute(
          "catalog"
        );
      };

      window.showFavorites =
      () =>
      setRoute(
        "favorites"
      );

      window.openCart =
      openCart;

      window.closeCart =
      closeCart;

      window.openMenu =
      openMenu;

      window.closeMenu =
      closeMenu;

      window.closeModal =
      closeModal;

      window.checkout =
      openCheckout;

      window.addCart =
      addProductToCart;

      window.productDetail =
      id =>
      setRoute(
        "product",
        {
          id:
          id,
        }
      );

      window.showContact =
      () =>
      setRoute(
        "contact"
      );

      window.showAbout =
      () =>
      setRoute(
        "about"
      );

      window.showAdmin =
      () =>
      setRoute(
        "admin"
      );

      window.toggleFav =
      toggleFavorite;

      window.adminLogin =
      adminLogin;

      window.signOut =
      adminLogout;

      window.crearProducto =
      createProductFromAdmin;

      window.adminSave =
      saveAdminProduct;

      window.deleteProduct =
      deleteAdminProduct;

      window.uploadProductImages =
      uploadProductImages;
    }

    // Última defensa: si una URL pública falla porque el bucket sigue privado,
    // se firma únicamente ESA imagen visible y se reemplaza sin romper la tarjeta.
    document.addEventListener(
      "error",
      async event =>
      {
        const image = event.target;

        if (
          !(image instanceof HTMLImageElement) ||
          image.dataset.alpStorageRetry === "1"
        )
        {
          return;
        }

        const normalized = normalizeStoragePath(
          image.currentSrc || image.src || ""
        );

        if (
          normalized.kind !== "storage" ||
          !normalized.value
        )
        {
          return;
        }

        image.dataset.alpStorageRetry = "1";

        const signed = await createCachedSignedUrl(normalized.value);

        if (signed)
        {
          runtimeStorageMode = "private";
          writeStorageModeCache("private");
          image.src = signed;
        }
      },
      true
    );

    async function initialize()
    {
      applyLanguageToChrome();

      renderMobileMenu();

      renderFooter();

      updateHeaderCounts();

      exposeCompatibilityApi();

      await loadAllData();

      let initialSpecialRouteApplied = false;

      if (typeof wishlistV2ApplyInitialSharedRoute === "function")
      {
        const appliedSharedWishlist =
        wishlistV2ApplyInitialSharedRoute();

        if (appliedSharedWishlist)
        {
          initialSpecialRouteApplied = true;
          renderCurrentRoute();
        }
      }

      if (
        !initialSpecialRouteApplied &&
        typeof campaignsV2ApplyInitialRoute === "function"
      )
      {
        const appliedCampaign =
        campaignsV2ApplyInitialRoute();

        if (appliedCampaign)
        {
          renderCurrentRoute();
        }
      }

      validateCartAgainstStock();

      updateHeaderCounts();

      window.setInterval(
        () =>
        {
          validateCartAgainstStock();
        },
        45000
      );

      supabaseClient.auth.onAuthStateChange(
        (
          event,
          session
        ) =>
        {
          state.admin.currentUser =
          session?.user
          ||
          null;

          if (
            state.route === "admin" &&
            (
              event === "SIGNED_IN" ||
              event === "SIGNED_OUT" ||
              event === "TOKEN_REFRESHED"
            )
          )
          {
            renderCurrentRoute();
          }
        }
      );
    }

    initialize();
