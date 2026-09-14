"use strict";

// AromaLParfum Frontend V2 — Paso 39
// Módulo: configuración, traducciones, Supabase y estado global

const I18N =
    {
      "es":
      {
        "top.shipping":
        "Envío seguro y confiable",
        "top.secondary":
        "Atención personalizada",
        "nav.perfumes":
        "Perfumes",
        "nav.best":
        "Más vendidos",
        "nav.collections":
        "Colecciones",
        "nav.decants":
        "Decants",
        "nav.gifts":
        "Ideas para regalar",
        "nav.games":
        "Aroma Games",
        "nav.about":
        "Acerca de",
        "nav.contact":
        "Contacto",
        "nav.favorites":
        "Favoritos",
        "nav.admin":
        "Administración",
        "hero.eyebrow":
        "Colecciones pensadas para cada momento",
        "hero.title":
        "Fragancias para cada historia.",
        "hero.description":
        "Explorá colecciones por estación, ocasión y estilo. Encontrá un aroma para el día, la noche, una cita o ese regalo especial.",
        "hero.cta":
        "Explorar colección",
        "hero.benefit1":
        "Selección cuidada",
        "hero.benefit2":
        "Fragancias para cada ocasión",
        "hero.benefit3":
        "Regalos personalizados",
        "hero.benefit4":
        "Elegido con pasión",
        "category.women":
        "Perfumes de mujer",
        "category.men":
        "Perfumes de hombre",
        "category.unisex":
        "Fragancias unisex",
        "category.giftsets":
        "Sets de regalo",
        "category.giftideas":
        "Ideas para regalar",
        "category.care":
        "Cuidado personal",
        "category.discovery":
        "Discovery Sets",
        "featured.eyebrow":
        "Selección AromaLParfum",
        "featured.title":
        "Fragancias destacadas",
        "featured.viewall":
        "Ver todos los perfumes",
        "new.eyebrow":
        "Recién llegados",
        "new.title":
        "Nuevas fragancias",
        "best.eyebrow":
        "Elegidos por nuestros clientes",
        "best.title":
        "Más agregados al carrito",
        "best.description":
        "Esta selección se actualiza automáticamente según los perfumes que los clientes agregan al carrito con mayor frecuencia.",
        "promo.decant.eyebrow":
        "Discovery Sets",
        "promo.decant.title":
        "Armá tu combo de decants.",
        "promo.decant.description":
        "Elegí tus fragancias favoritas en 3 ml, 5 ml, 10 ml o 30 ml y creá un combo a tu medida.",
        "promo.decant.cta":
        "Armar mi combo",
        "promo.gift.eyebrow":
        "El arte de regalar",
        "promo.gift.title":
        "Regalos que hablan por vos.",
        "promo.gift.description":
        "Combiná perfumes, cuidado personal y presentaciones especiales para crear un regalo único.",
        "promo.gift.cta":
        "Armar mi regalo",
        "services.shipping.title":
        "Envío seguro y confiable",
        "services.shipping.text":
        "Coordinamos cada entrega con vos.",
        "services.support.title":
        "Asesoramiento",
        "services.support.text":
        "Te ayudamos a encontrar tu fragancia.",
        "services.secure.title":
        "Compra segura",
        "services.secure.text":
        "Pedido confirmado por WhatsApp.",
        "services.choice.title":
        "Selección especial",
        "services.choice.text":
        "Perfumes elegidos para distintos estilos.",
        "catalog.eyebrow":
        "Catálogo",
        "catalog.title":
        "Todos los perfumes",
        "catalog.search":
        "Buscar perfume, marca o familia olfativa...",
        "catalog.sort":
        "Ordenar",
        "catalog.sort.default":
        "Recomendados",
        "catalog.sort.low":
        "Precio: menor a mayor",
        "catalog.sort.high":
        "Precio: mayor a menor",
        "catalog.sort.name":
        "Nombre A-Z",
        "catalog.sort.stock":
        "Con stock primero",
        "catalog.empty":
        "No encontramos productos con esos filtros.",
        "product.view":
        "Ver perfume",
        "product.add":
        "Agregar al carrito",
        "product.out":
        "Sin stock",
        "product.available":
        "Disponible",
        "product.new":
        "Nuevo",
        "product.featured":
        "Destacado",
        "product.best":
        "Más vendido",
        "product.family":
        "Familia olfativa",
        "product.size":
        "Tamaño",
        "product.stock":
        "Stock",
        "product.duration":
        "Duración",
        "product.projection":
        "Proyección",
        "product.use":
        "Uso recomendado",
        "product.seasons":
        "Estaciones",
        "product.occasions":
        "Ocasiones",
        "product.notes.top":
        "Salida",
        "product.notes.heart":
        "Corazón",
        "product.notes.base":
        "Fondo",
        "product.brand":
        "Marca",
        "product.category":
        "Categoría",
        "product.gender":
        "Género",
        "cart.title":
        "Tu carrito",
        "cart.empty":
        "Tu carrito está vacío.",
        "cart.subtotal":
        "Subtotal",
        "cart.total":
        "Total",
        "cart.checkout":
        "Finalizar pedido",
        "cart.remove":
        "Eliminar",
        "cart.quantity":
        "Cantidad",
        "checkout.title":
        "Finalizar pedido",
        "checkout.client":
        "Datos del cliente",
        "checkout.name":
        "Nombre y apellido",
        "checkout.phone":
        "Teléfono",
        "checkout.email":
        "Correo electrónico",
        "checkout.payment":
        "Método de pago",
        "checkout.payment.transfer":
        "Transferencia",
        "checkout.payment.cash":
        "Efectivo",
        "checkout.payment.mp":
        "Mercado Pago",
        "checkout.payment.other":
        "Otro",
        "checkout.shipping":
        "¿Con envío?",
        "checkout.yes":
        "Sí",
        "checkout.no":
        "No",
        "checkout.address":
        "Dirección",
        "checkout.city":
        "Ciudad",
        "checkout.province":
        "Provincia",
        "checkout.postal":
        "Código postal",
        "checkout.summary":
        "Resumen del pedido",
        "checkout.send":
        "Enviar pedido por WhatsApp",
        "favorites.eyebrow":
        "Guardados",
        "favorites.title":
        "Tus favoritos",
        "favorites.empty":
        "Todavía no tenés perfumes favoritos.",
        "favorites.cta":
        "Descubrir perfumes",
        "collections.eyebrow":
        "Colecciones temáticas",
        "collections.title":
        "Elegí por estación u ocasión",
        "collections.empty":
        "Todavía no hay colecciones activas.",
        "decants.eyebrow":
        "Tu selección",
        "decants.title":
        "Armá tu combo de decants",
        "decants.description":
        "Elegí perfumes y presentaciones de hasta 30 ml. El precio se calcula automáticamente según el tamaño elegido.",
        "decants.size":
        "Tamaño",
        "decants.add":
        "Agregar al combo",
        "decants.selection":
        "Tu combo",
        "decants.empty":
        "Todavía no agregaste decants.",
        "decants.total":
        "Total del combo",
        "decants.cart":
        "Agregar combo al carrito",
        "decants.limit":
        "Llegaste al máximo de este combo.",
        "gifts.eyebrow":
        "Regalos personalizados",
        "gifts.title":
        "Armá tu propio regalo",
        "gifts.description":
        "Elegí una ocasión y combiná productos para crear un regalo especial.",
        "gifts.occasion":
        "Ocasión",
        "gifts.products":
        "Elegí los productos",
        "gifts.selection":
        "Tu regalo",
        "gifts.empty":
        "Todavía no agregaste productos.",
        "gifts.cart":
        "Agregar regalo al carrito",
        "gifts.limit":
        "Llegaste al máximo de productos permitido para este regalo.",
        "games.eyebrow":
        "Aroma Games",
        "games.title":
        "Jugá con tus fragancias favoritas",
        "games.description":
        "Elegí entre rompecabezas, cinco diferencias y encontrá el perfume.",
        "games.puzzle":
        "Rompecabezas",
        "games.puzzle.desc":
        "Reconstruí la imagen del perfume ordenando 20 piezas.",
        "games.diff":
        "Encontrá las 5 diferencias",
        "games.diff.desc":
        "Compará las dos imágenes y encontrá las cinco modificaciones.",
        "games.hidden":
        "Encontrá el perfume",
        "games.hidden.desc":
        "Ubicá el perfume correcto entre todas las opciones antes de que termine el tiempo.",
        "games.play":
        "Jugar",
        "games.restart":
        "Reiniciar",
        "games.back":
        "Volver a juegos",
        "games.time":
        "Tiempo",
        "games.moves":
        "Movimientos",
        "games.found":
        "Encontradas",
        "games.win":
        "¡Completaste el juego!",
        "games.lose":
        "Se terminó el tiempo. Probá otra vez.",
        "advisor.eyebrow":
        "Asesor personalizado",
        "advisor.title":
        "Encontrá tu perfume ideal",
        "advisor.description":
        "Contanos qué aromas te gustan, cuándo querés usarlo y tu presupuesto.",
        "advisor.placeholder":
        "Ej.: quiero algo dulce, masculino, para una cita y hasta $50000...",
        "advisor.send":
        "Consultar",
        "advisor.disabled":
        "El asesor IA está preparado pero temporalmente pausado hasta activar saldo de API.",
        "advisor.fallback":
        "Mientras la IA está pausada, podés usar nuestros filtros y colecciones para encontrar una fragancia.",
        "about.eyebrow":
        "Nuestra historia",
        "about.title":
        "Acerca de AromaLParfum",
        "about.p1":
        "AromaLParfum nace de nuestra pasión por el mundo de las fragancias y de la idea de acercar perfumes únicos a cada persona.",
        "about.p2":
        "Creamos este espacio para descubrir fragancias árabes, argentinas, de diseñador y de nicho, seleccionadas para distintos estilos, momentos y personalidades.",
        "about.p3":
        "Para nosotros, un perfume es una forma de expresión, un recuerdo y una parte de nuestra identidad.",
        "contact.eyebrow":
        "Hablemos",
        "contact.title":
        "Contacto",
        "contact.whatsapp":
        "WhatsApp",
        "contact.instagram":
        "Instagram",
        "contact.email":
        "Email",
        "contact.hours":
        "Horarios",
        "contact.message":
        "Mensaje",
        "contact.send":
        "Enviar",
        "footer.know":
        "Mantenete al día",
        "footer.know.text":
        "Descubrí nuevos perfumes, colecciones y propuestas de AromaLParfum.",
        "footer.shop":
        "Tienda",
        "footer.about":
        "AromaLParfum",
        "footer.help":
        "Ayuda",
        "footer.rights":
        "Todos los derechos reservados.",
        "admin.title":
        "Administración",
        "admin.login":
        "Ingresá con tu cuenta de administrador",
        "admin.email":
        "Email",
        "admin.password":
        "Contraseña",
        "admin.enter":
        "Ingresar",
        "admin.logout":
        "Cerrar sesión",
        "admin.products":
        "Productos",
        "admin.new":
        "Agregar perfume",
        "admin.settings":
        "Configuración",
        "admin.collections":
        "Colecciones",
        "admin.games":
        "Juegos",
        "admin.stats":
        "Estadísticas",
        "admin.save":
        "Guardar",
        "admin.delete":
        "Eliminar",
        "admin.photos":
        "Fotos",
        "admin.upload":
        "Subir fotos",
        "admin.ai.title":
        "Completar ficha con IA",
        "admin.ai.desc":
        "Escribí el nombre de una fragancia. La IA completará los datos para que los revises antes de guardar.",
        "admin.ai.button":
        "Completar con IA",
        "admin.ai.disabled":
        "IA pausada: falta activar saldo de API.",
        "admin.name":
        "Nombre",
        "admin.price":
        "Precio",
        "admin.ml":
        "ML",
        "admin.stock":
        "Stock",
        "admin.category":
        "Categoría",
        "admin.gender":
        "Género",
        "admin.family":
        "Familia",
        "admin.description":
        "Descripción",
        "admin.top":
        "Salida",
        "admin.heart":
        "Corazón",
        "admin.base":
        "Fondo",
        "admin.duration":
        "Duración",
        "admin.projection":
        "Proyección",
        "admin.use":
        "Uso recomendado",
        "admin.brand":
        "Marca",
        "admin.seasons":
        "Estaciones",
        "admin.occasions":
        "Ocasiones",
        "admin.type":
        "Tipo de producto",
        "admin.featured":
        "Destacado",
        "admin.newflag":
        "Nuevo",
        "admin.created":
        "Producto creado correctamente.",
        "admin.updated":
        "Producto actualizado.",
        "admin.deleted":
        "Producto eliminado.",
        "admin.error":
        "Ocurrió un error.",
        "common.loading":
        "Cargando...",
        "common.back":
        "Volver",
        "common.cancel":
        "Cancelar",
        "common.close":
        "Cerrar",
        "common.yes":
        "Sí",
        "common.no":
        "No",
        "common.all":
        "Todos",
        "common.none":
        "Ninguno",
        "common.consult":
        "Consultar",
        "common.retry":
        "Reintentar",
        "common.save":
        "Guardar",
        "common.select":
        "Seleccionar",
      },
      "en":
      {
        "top.shipping":
        "Safe and reliable shipping",
        "top.secondary":
        "Personalized assistance",
        "nav.perfumes":
        "Perfumes",
        "nav.best":
        "Best sellers",
        "nav.collections":
        "Collections",
        "nav.decants":
        "Decants",
        "nav.gifts":
        "Gift ideas",
        "nav.games":
        "Aroma Games",
        "nav.about":
        "About",
        "nav.contact":
        "Contact",
        "nav.favorites":
        "Favorites",
        "nav.admin":
        "Admin",
        "hero.eyebrow":
        "Collections for every moment",
        "hero.title":
        "Fragrances for every story.",
        "hero.description":
        "Explore collections by season, occasion and style. Find a scent for the day, the night, a date or a special gift.",
        "hero.cta":
        "Explore collection",
        "hero.benefit1":
        "Curated selection",
        "hero.benefit2":
        "Fragrances for every occasion",
        "hero.benefit3":
        "Personalized gifts",
        "hero.benefit4":
        "Chosen with passion",
        "category.women":
        "Women's perfumes",
        "category.men":
        "Men's perfumes",
        "category.unisex":
        "Unisex fragrances",
        "category.giftsets":
        "Gift sets",
        "category.giftideas":
        "Gift ideas",
        "category.care":
        "Personal care",
        "category.discovery":
        "Discovery Sets",
        "featured.eyebrow":
        "AromaLParfum selection",
        "featured.title":
        "Featured fragrances",
        "featured.viewall":
        "View all fragrances",
        "new.eyebrow":
        "Just arrived",
        "new.title":
        "New fragrances",
        "best.eyebrow":
        "Chosen by our customers",
        "best.title":
        "Most added to cart",
        "best.description":
        "This selection updates automatically based on the fragrances customers add to cart most often.",
        "promo.decant.eyebrow":
        "Discovery Sets",
        "promo.decant.title":
        "Build your decant set.",
        "promo.decant.description":
        "Choose your favorite fragrances in 3 ml, 5 ml, 10 ml or 30 ml and create a set that fits you.",
        "promo.decant.cta":
        "Build my set",
        "promo.gift.eyebrow":
        "The art of gifting",
        "promo.gift.title":
        "Gifts that speak for you.",
        "promo.gift.description":
        "Combine fragrances, personal care and special presentations to create a unique gift.",
        "promo.gift.cta":
        "Build my gift",
        "services.shipping.title":
        "Safe and reliable shipping",
        "services.shipping.text":
        "We coordinate every delivery with you.",
        "services.support.title":
        "Personal advice",
        "services.support.text":
        "We help you find your fragrance.",
        "services.secure.title":
        "Secure purchase",
        "services.secure.text":
        "Order confirmed through WhatsApp.",
        "services.choice.title":
        "Special selection",
        "services.choice.text":
        "Fragrances chosen for different styles.",
        "catalog.eyebrow":
        "Catalog",
        "catalog.title":
        "All fragrances",
        "catalog.search":
        "Search fragrance, brand or olfactory family...",
        "catalog.sort":
        "Sort",
        "catalog.sort.default":
        "Recommended",
        "catalog.sort.low":
        "Price: low to high",
        "catalog.sort.high":
        "Price: high to low",
        "catalog.sort.name":
        "Name A-Z",
        "catalog.sort.stock":
        "In-stock first",
        "catalog.empty":
        "No products match those filters.",
        "product.view":
        "View fragrance",
        "product.add":
        "Add to cart",
        "product.out":
        "Out of stock",
        "product.available":
        "Available",
        "product.new":
        "New",
        "product.featured":
        "Featured",
        "product.best":
        "Best seller",
        "product.family":
        "Olfactory family",
        "product.size":
        "Size",
        "product.stock":
        "Stock",
        "product.duration":
        "Longevity",
        "product.projection":
        "Projection",
        "product.use":
        "Recommended use",
        "product.seasons":
        "Seasons",
        "product.occasions":
        "Occasions",
        "product.notes.top":
        "Top notes",
        "product.notes.heart":
        "Heart notes",
        "product.notes.base":
        "Base notes",
        "product.brand":
        "Brand",
        "product.category":
        "Category",
        "product.gender":
        "Gender",
        "cart.title":
        "Your cart",
        "cart.empty":
        "Your cart is empty.",
        "cart.subtotal":
        "Subtotal",
        "cart.total":
        "Total",
        "cart.checkout":
        "Checkout",
        "cart.remove":
        "Remove",
        "cart.quantity":
        "Quantity",
        "checkout.title":
        "Checkout",
        "checkout.client":
        "Customer details",
        "checkout.name":
        "Full name",
        "checkout.phone":
        "Phone",
        "checkout.email":
        "Email",
        "checkout.payment":
        "Payment method",
        "checkout.payment.transfer":
        "Bank transfer",
        "checkout.payment.cash":
        "Cash",
        "checkout.payment.mp":
        "Mercado Pago",
        "checkout.payment.other":
        "Other",
        "checkout.shipping":
        "Shipping?",
        "checkout.yes":
        "Yes",
        "checkout.no":
        "No",
        "checkout.address":
        "Address",
        "checkout.city":
        "City",
        "checkout.province":
        "Province / State",
        "checkout.postal":
        "Postal code",
        "checkout.summary":
        "Order summary",
        "checkout.send":
        "Send order via WhatsApp",
        "favorites.eyebrow":
        "Saved",
        "favorites.title":
        "Your favorites",
        "favorites.empty":
        "You don't have favorite fragrances yet.",
        "favorites.cta":
        "Discover fragrances",
        "collections.eyebrow":
        "Themed collections",
        "collections.title":
        "Choose by season or occasion",
        "collections.empty":
        "There are no active collections yet.",
        "decants.eyebrow":
        "Your selection",
        "decants.title":
        "Build your decant set",
        "decants.description":
        "Choose fragrances and sizes up to 30 ml. Price is calculated automatically based on the selected size.",
        "decants.size":
        "Size",
        "decants.add":
        "Add to set",
        "decants.selection":
        "Your set",
        "decants.empty":
        "You haven't added decants yet.",
        "decants.total":
        "Set total",
        "decants.cart":
        "Add set to cart",
        "decants.limit":
        "You reached the maximum for this set.",
        "gifts.eyebrow":
        "Personalized gifts",
        "gifts.title":
        "Build your own gift",
        "gifts.description":
        "Choose an occasion and combine products to create a special gift.",
        "gifts.occasion":
        "Occasion",
        "gifts.products":
        "Choose products",
        "gifts.selection":
        "Your gift",
        "gifts.empty":
        "You haven't added products yet.",
        "gifts.cart":
        "Add gift to cart",
        "gifts.limit":
        "You reached the product limit for this gift.",
        "games.eyebrow":
        "Aroma Games",
        "games.title":
        "Play with your favorite fragrances",
        "games.description":
        "Choose between puzzle, five differences and find the perfume.",
        "games.puzzle":
        "Perfume puzzle",
        "games.puzzle.desc":
        "Rebuild the fragrance image by arranging 20 pieces.",
        "games.diff":
        "Find the 5 differences",
        "games.diff.desc":
        "Compare both images and spot the five modifications.",
        "games.hidden":
        "Find the perfume",
        "games.hidden.desc":
        "Locate the correct fragrance among all options before time runs out.",
        "games.play":
        "Play",
        "games.restart":
        "Restart",
        "games.back":
        "Back to games",
        "games.time":
        "Time",
        "games.moves":
        "Moves",
        "games.found":
        "Found",
        "games.win":
        "You completed the game!",
        "games.lose":
        "Time is up. Try again.",
        "advisor.eyebrow":
        "Personal advisor",
        "advisor.title":
        "Find your ideal fragrance",
        "advisor.description":
        "Tell us what scents you like, when you want to wear it and your budget.",
        "advisor.placeholder":
        "Example: I want something sweet, masculine, for a date, under $50000...",
        "advisor.send":
        "Ask",
        "advisor.disabled":
        "The AI advisor is ready but temporarily paused until API credit is activated.",
        "advisor.fallback":
        "While AI is paused, use our filters and collections to find a fragrance.",
        "about.eyebrow":
        "Our story",
        "about.title":
        "About AromaLParfum",
        "about.p1":
        "AromaLParfum was born from our passion for fragrance and the idea of bringing unique perfumes closer to every person.",
        "about.p2":
        "We created this space to discover Arabic, Argentine, designer and niche fragrances selected for different styles, moments and personalities.",
        "about.p3":
        "For us, a perfume is a form of expression, a memory and part of our identity.",
        "contact.eyebrow":
        "Let's talk",
        "contact.title":
        "Contact",
        "contact.whatsapp":
        "WhatsApp",
        "contact.instagram":
        "Instagram",
        "contact.email":
        "Email",
        "contact.hours":
        "Hours",
        "contact.message":
        "Message",
        "contact.send":
        "Send",
        "footer.know":
        "Stay in the know",
        "footer.know.text":
        "Discover new fragrances, collections and AromaLParfum ideas.",
        "footer.shop":
        "Shop",
        "footer.about":
        "AromaLParfum",
        "footer.help":
        "Help",
        "footer.rights":
        "All rights reserved.",
        "admin.title":
        "Administration",
        "admin.login":
        "Sign in with your administrator account",
        "admin.email":
        "Email",
        "admin.password":
        "Password",
        "admin.enter":
        "Sign in",
        "admin.logout":
        "Sign out",
        "admin.products":
        "Products",
        "admin.new":
        "Add fragrance",
        "admin.settings":
        "Settings",
        "admin.collections":
        "Collections",
        "admin.games":
        "Games",
        "admin.stats":
        "Statistics",
        "admin.save":
        "Save",
        "admin.delete":
        "Delete",
        "admin.photos":
        "Photos",
        "admin.upload":
        "Upload photos",
        "admin.ai.title":
        "Fill product sheet with AI",
        "admin.ai.desc":
        "Enter a fragrance name. AI will fill the data so you can review it before saving.",
        "admin.ai.button":
        "Fill with AI",
        "admin.ai.disabled":
        "AI paused: API credit must be activated.",
        "admin.name":
        "Name",
        "admin.price":
        "Price",
        "admin.ml":
        "ML",
        "admin.stock":
        "Stock",
        "admin.category":
        "Category",
        "admin.gender":
        "Gender",
        "admin.family":
        "Family",
        "admin.description":
        "Description",
        "admin.top":
        "Top",
        "admin.heart":
        "Heart",
        "admin.base":
        "Base",
        "admin.duration":
        "Longevity",
        "admin.projection":
        "Projection",
        "admin.use":
        "Recommended use",
        "admin.brand":
        "Brand",
        "admin.seasons":
        "Seasons",
        "admin.occasions":
        "Occasions",
        "admin.type":
        "Product type",
        "admin.featured":
        "Featured",
        "admin.newflag":
        "New",
        "admin.created":
        "Product created successfully.",
        "admin.updated":
        "Product updated.",
        "admin.deleted":
        "Product deleted.",
        "admin.error":
        "An error occurred.",
        "common.loading":
        "Loading...",
        "common.back":
        "Back",
        "common.cancel":
        "Cancel",
        "common.close":
        "Close",
        "common.yes":
        "Yes",
        "common.no":
        "No",
        "common.all":
        "All",
        "common.none":
        "None",
        "common.consult":
        "Ask us",
        "common.retry":
        "Retry",
        "common.save":
        "Save",
        "common.select":
        "Select",
      },
    };

const CONFIG =
{
  supabaseUrl:
  "https://klppiznssciyveufmoff.supabase.co",

  supabaseKey:
  "sb_publishable_lMSak0Ze-NYWwq3SCpqEaA_7UrVFU3T",

  storageBucket:
  "perfumes",

  // Modo automático: si el bucket es público usa URLs públicas estables.
  // Si sigue privado, cae automáticamente a URLs firmadas en lote.
  storagePublic:
  "auto",

  productImagesTable:
  "product_images",

  whatsappNumber:
  "5491144293913",

  adminEmails:
  [
    "defanissantiago@gmail.com",
  ],

  defaultAiEndpoint:
  "quick-processor",

  signedUrlSeconds:
  60 * 60 * 24 * 7,

  newDays:
  10,

  maxImageBytes:
  8 * 1024 * 1024,

  defaultDecantSizes:
  [
    3,
    5,
    10,
    30,
  ],

  collectionFallbacks:
  [
    {
      slug:
      "primavera",

      nombre_es:
      "Colección de Primavera",

      nombre_en:
      "Spring Collection",

      descripcion_es:
      "Fragancias frescas, florales y luminosas para la primavera.",

      descripcion_en:
      "Fresh, floral and luminous fragrances for spring.",

      tipo:
      "seasonal",

      estacion:
      "Primavera",

      ocasion:
      null,

      emoji:
      "🌸",

      orden:
      1,
    },

    {
      slug:
      "verano",

      nombre_es:
      "Colección de Verano",

      nombre_en:
      "Summer Collection",

      descripcion_es:
      "Fragancias cítricas, frescas y acuáticas para los días cálidos.",

      descripcion_en:
      "Fresh, citrus and aquatic fragrances for warm days.",

      tipo:
      "seasonal",

      estacion:
      "Verano",

      ocasion:
      null,

      emoji:
      "☀️",

      orden:
      2,
    },

    {
      slug:
      "otono",

      nombre_es:
      "Colección de Otoño",

      nombre_en:
      "Autumn Collection",

      descripcion_es:
      "Aromas especiados, amaderados y envolventes.",

      descripcion_en:
      "Spicy, woody and warm fragrances.",

      tipo:
      "seasonal",

      estacion:
      "Otoño",

      ocasion:
      null,

      emoji:
      "🍂",

      orden:
      3,
    },

    {
      slug:
      "invierno",

      nombre_es:
      "Colección de Invierno",

      nombre_en:
      "Winter Collection",

      descripcion_es:
      "Perfumes intensos, dulces y cálidos para el invierno.",

      descripcion_en:
      "Intense, sweet and warm fragrances for winter.",

      tipo:
      "seasonal",

      estacion:
      "Invierno",

      ocasion:
      null,

      emoji:
      "❄️",

      orden:
      4,
    },

    {
      slug:
      "noche-de-cita",

      nombre_es:
      "Noche de Cita",

      nombre_en:
      "Date Night",

      descripcion_es:
      "Fragancias seductoras y elegantes para una noche especial.",

      descripcion_en:
      "Seductive and elegant fragrances for a special night.",

      tipo:
      "occasion",

      estacion:
      null,

      ocasion:
      "Citas",

      emoji:
      "❤️",

      orden:
      5,
    },
  ],
};

const supabaseClient =
supabase.createClient(
  CONFIG.supabaseUrl,
  CONFIG.supabaseKey,
  {
    auth:
    {
      persistSession:
      true,

      autoRefreshToken:
      true,

      detectSessionInUrl:
      true,
    },
  }
);


function safeJsonParse(
  raw,
  fallback
)
{
  try
  {
    if (
      raw === null ||
      raw === undefined ||
      raw === ""
    )
    {
      return fallback;
    }

    return JSON.parse(
      raw
    );
  }
  catch (
    error
  )
  {
    console.warn(
      "JSON inválido:",
      error
    );

    return fallback;
  }
}

function normalizeStoredCart(
  rawCart
)
{
  if (
    !Array.isArray(
      rawCart
    )
  )
  {
    return [];
  }

  return rawCart
    .map(
      (
        item
      ) =>
      {
        if (
          !item ||
          typeof item !== "object"
        )
        {
          return null;
        }

        if (
          item.kind
        )
        {
          return {
            ...item,
            qty:
            Math.max(
              1,
              Number(
                item.qty
              ) ||
              1
            ),
          };
        }

        if (
          item.id !== undefined
        )
        {
          return {
            kind:
            "product",

            key:
            "product:" +
            item.id,

            id:
            Number(
              item.id
            ),

            productId:
            Number(
              item.id
            ),

            qty:
            Math.max(
              1,
              Number(
                item.qty
              ) ||
              1
            ),
          };
        }

        return null;
      }
    )
    .filter(
      Boolean
    );
}


const state =
{
  language:
  localStorage.getItem(
    "alp_language"
  ) ||
  "es",

  route:
  document.body?.dataset.entry === "admin"
  ? "admin"
  : "home",

  routePayload:
  {},

  products:
  [],

  productImages:
  {},

  productImageMeta:
  {},

  productColumns:
  new Set(),

  popularity:
  new Map(),

  siteSettings:
  {},

  siteCoverMeta:
  {},

  seasonalVideoMeta:
  {
    path:
    "",

    url:
    "",
  },

  collectionCoverMeta:
  {},

  homeMerchandising:
  {
    weekly_fragrance:
    null,

    campaigns:
    [],

    banners:
    [],
  },

  homeMerchandisingLoaded:
  false,

  collections:
  [],

  gameConfigs:
  [],

  dailyLeaderboard:
  [],

  gameRewards:
  [],

  gamePlayer:
  safeJsonParse(
    localStorage.getItem(
      "alp_game_player"
    ),
    null
  ),

  checkoutDiscount:
  null,

  productTypes:
  [],

  comboTemplates:
  [],

  comboProducts:
  [],

  decantSizes:
  [],

  giftOptions:
  [],

  favorites:
  safeJsonParse(
    localStorage.getItem(
      "alp_fav"
    ),
    []
  ),

  cart:
  normalizeStoredCart(
    safeJsonParse(
      localStorage.getItem(
        "alp_cart"
      ),
      []
    )
  ),

  catalogFilter:
  "Todos",

  catalogSort:
  "default",

  catalogSearch:
  "",

  catalogPage:
  1,

  catalogPageSize:
  24,

  catalogAdvancedFilters:
  {
    gender: "",
    style: "",
    occasion: "",
    season: "",
    origin: "",
    family: "",
    priceMin: "",
    priceMax: "",
  },

  catalogSmartIds:
  null,

  catalogSmartQuery:
  "",

  catalogSmartOrder:
  [],

  catalogSuggestions:
  [],

  catalogSuggestionsQuery:
  "",

  catalogSearchLoading:
  false,

  allProductImagesLoaded:
  false,

  productGalleryLoaded:
  new Set(),

  productGalleryLoading:
  new Map(),

  heroCollectionIndex:
  0,

  selectedProductId:
  null,

  selectedGalleryUrl:
  "",

  decantDraft:
  [],

  giftDraft:
  [],

  selectedGiftOption:
  null,

  game:
  {
    type:
    null,

    productId:
    null,

    startedAt:
    null,

    timerId:
    null,

    remaining:
    0,

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
  },

  advisorMessages:
  [],

  admin:
  {
    tab:
    "products",

    currentUser:
    null,

    aiDraft:
    null,

    editingProductId:
    null,

    // Admin liviano: nunca renderizamos cientos de filas de una sola vez.
    productSearch:
    "",

    productPage:
    1,

    productPageSize:
    20,
  },

  loading:
  true,

  lastError:
  null,
};

