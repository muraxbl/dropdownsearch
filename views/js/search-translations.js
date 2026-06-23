/**
 * Sistema de traducciones centralizado para dropdownsearch
 * Archivo JavaScript puro - No necesita PHP
 * 
 * modules/dropdownsearch/views/js/search-translations.js
 */

(function() {
    'use strict';

    // Detectar idioma actual desde PrestaShop
    const currentLangId = (typeof prestashop !== 'undefined' && prestashop.language) 
        ? parseInt(prestashop.language.id) 
        : 4; // Default: español

    // Todas las traducciones del módulo
    const allTranslations = {
        1: { // 🇬🇧 English
            // Búsqueda
            search_placeholder: 'What are you looking for?',
            searching: 'Searching...',
            no_results: 'No results found',
            products_found: 'products found',
            product_found: 'product found',
            search_error: 'Search error',
            connection_error: 'Connection error',
            loading: 'Loading...',
            
            // Filtros
            filters: 'Filters',
            clear_filters: 'Clear filters',
            active_filters: 'Active filters:',
            categories: 'Categories',
            manufacturers: 'Manufacturers',
            price: 'Price',
            price_min: 'Min. price',
            price_max: 'Max. price',
            attributes: 'Attributes',
            features: 'Features',
            in_stock_only: 'Only products in stock',
            in_stock: 'In stock',
            out_of_stock: 'Out of stock',
            
            // Paginación
            load_more: 'Load more',
            scroll_for_more: 'Scroll for more results',
            all_results_loaded: 'All results loaded',
            
            // Compartir
            share_search: 'Share search',
            link_copied: 'Link copied to clipboard!',
            copy_error: 'Error copying link',
            no_search_to_share: 'No search to share',
            
            // Otros
            ref: 'Ref'
        },
        
        2: { // 🇵🇹 Português
            // Búsqueda
            search_placeholder: 'O que você está procurando?',
            searching: 'Pesquisando...',
            no_results: 'Nenhum resultado encontrado',
            products_found: 'produtos encontrados',
            product_found: 'produto encontrado',
            search_error: 'Erro na pesquisa',
            connection_error: 'Erro de conexão',
            loading: 'Carregando...',
            
            // Filtros
            filters: 'Filtros',
            clear_filters: 'Limpar filtros',
            active_filters: 'Filtros ativos:',
            categories: 'Categorias',
            manufacturers: 'Fabricantes',
            price: 'Preço',
            price_min: 'Preço mín.',
            price_max: 'Preço máx.',
            attributes: 'Atributos',
            features: 'Características',
            in_stock_only: 'Apenas produtos em estoque',
            in_stock: 'Em estoque',
            out_of_stock: 'Sem estoque',
            
            // Paginación
            load_more: 'Carregar mais',
            scroll_for_more: 'Role para mais resultados',
            all_results_loaded: 'Todos os resultados carregados',
            
            // Compartir
            share_search: 'Compartilhar pesquisa',
            link_copied: 'Link copiado para a área de transferência!',
            copy_error: 'Erro ao copiar link',
            no_search_to_share: 'Nenhuma pesquisa para compartilhar',
            
            // Otros
            ref: 'Ref'
        },
        
        4: { // 🇪🇸 Español
            // Búsqueda
            search_placeholder: '¿Qué estás buscando?',
            searching: 'Buscando...',
            no_results: 'No se encontraron resultados',
            products_found: 'productos encontrados',
            product_found: 'producto encontrado',
            search_error: 'Error en la búsqueda',
            connection_error: 'Error de conexión',
            loading: 'Cargando...',
            
            // Filtros
            filters: 'Filtros',
            clear_filters: 'Limpiar filtros',
            active_filters: 'Filtros activos:',
            categories: 'Categorías',
            manufacturers: 'Fabricantes',
            price: 'Precio',
            price_min: 'Precio mín.',
            price_max: 'Precio máx.',
            attributes: 'Atributos',
            features: 'Características',
            in_stock_only: 'Solo productos en stock',
            in_stock: 'En stock',
            out_of_stock: 'Sin stock',
            
            // Paginación
            load_more: 'Cargar más',
            scroll_for_more: 'Desplázate para más resultados',
            all_results_loaded: 'Todos los resultados cargados',
            
            // Compartir
            share_search: 'Compartir búsqueda',
            link_copied: '¡Enlace copiado al portapapeles!',
            copy_error: 'Error al copiar enlace',
            no_search_to_share: 'No hay búsqueda para compartir',
            
            // Otros
            ref: 'Ref'
        },
        
        5: { // 🇫🇷 Français
            // Búsqueda
            search_placeholder: 'Que cherchez-vous?',
            searching: 'Recherche...',
            no_results: 'Aucun résultat trouvé',
            products_found: 'produits trouvés',
            product_found: 'produit trouvé',
            search_error: 'Erreur de recherche',
            connection_error: 'Erreur de connexion',
            loading: 'Chargement...',
            
            // Filtros
            filters: 'Filtres',
            clear_filters: 'Effacer les filtres',
            active_filters: 'Filtres actifs:',
            categories: 'Catégories',
            manufacturers: 'Fabricants',
            price: 'Prix',
            price_min: 'Prix min.',
            price_max: 'Prix max.',
            attributes: 'Attributs',
            features: 'Caractéristiques',
            in_stock_only: 'Seulement produits en stock',
            in_stock: 'En stock',
            out_of_stock: 'Rupture de stock',
            
            // Paginación
            load_more: 'Charger plus',
            scroll_for_more: 'Faites défiler pour plus',
            all_results_loaded: 'Tous les résultats chargés',
            
            // Compartir
            share_search: 'Partager la recherche',
            link_copied: 'Lien copié dans le presse-papiers!',
            copy_error: 'Erreur de copie du lien',
            no_search_to_share: 'Aucune recherche à partager',
            
            // Otros
            ref: 'Réf'
        },
        
        6: { // 🇩🇪 Deutsch
            // Búsqueda
            search_placeholder: 'Was suchen Sie?',
            searching: 'Suchen...',
            no_results: 'Keine Ergebnisse gefunden',
            products_found: 'Produkte gefunden',
            product_found: 'Produkt gefunden',
            search_error: 'Suchfehler',
            connection_error: 'Verbindungsfehler',
            loading: 'Laden...',
            
            // Filtros
            filters: 'Filter',
            clear_filters: 'Filter löschen',
            active_filters: 'Aktive Filter:',
            categories: 'Kategorien',
            manufacturers: 'Hersteller',
            price: 'Preis',
            price_min: 'Min. Preis',
            price_max: 'Max. Preis',
            attributes: 'Attribute',
            features: 'Merkmale',
            in_stock_only: 'Nur vorrätige Produkte',
            in_stock: 'Auf Lager',
            out_of_stock: 'Nicht vorrätig',
            
            // Paginación
            load_more: 'Mehr laden',
            scroll_for_more: 'Scrollen für mehr',
            all_results_loaded: 'Alle Ergebnisse geladen',
            
            // Compartir
            share_search: 'Suche teilen',
            link_copied: 'Link in Zwischenablage kopiert!',
            copy_error: 'Fehler beim Kopieren',
            no_search_to_share: 'Keine Suche zum Teilen',
            
            // Otros
            ref: 'Art.-Nr.'
        },
        
        7: { // 🇮🇹 Italiano
            // Búsqueda
            search_placeholder: 'Cosa stai cercando?',
            searching: 'Ricerca...',
            no_results: 'Nessun risultato trovato',
            products_found: 'prodotti trovati',
            product_found: 'prodotto trovato',
            search_error: 'Errore di ricerca',
            connection_error: 'Errore di connessione',
            loading: 'Caricamento...',
            
            // Filtros
            filters: 'Filtri',
            clear_filters: 'Cancella filtri',
            active_filters: 'Filtri attivi:',
            categories: 'Categorie',
            manufacturers: 'Produttori',
            price: 'Prezzo',
            price_min: 'Prezzo min.',
            price_max: 'Prezzo max.',
            attributes: 'Attributi',
            features: 'Caratteristiche',
            in_stock_only: 'Solo prodotti disponibili',
            in_stock: 'Disponibile',
            out_of_stock: 'Esaurito',
            
            // Paginación
            load_more: 'Carica altro',
            scroll_for_more: 'Scorri per altri risultati',
            all_results_loaded: 'Tutti i risultati caricati',
            
            // Compartir
            share_search: 'Condividi ricerca',
            link_copied: 'Link copiato negli appunti!',
            copy_error: 'Errore copia link',
            no_search_to_share: 'Nessuna ricerca da condividere',
            
            // Otros
            ref: 'Rif'
        }
    };

    // Establecer traducciones para el idioma actual (con fallback a español)
    window.searchTranslations = allTranslations[currentLangId] || allTranslations[4];

    // Función helper para obtener traducciones
    window.t = function(key, defaultValue) {
        return window.searchTranslations[key] || defaultValue || key;
    };

    // Log para verificar
    const languageNames = {
        1: 'English',
        2: 'Português',
        4: 'Español',
        5: 'Français',
        6: 'Deutsch',
        7: 'Italiano'
    };

    console.log('✅ Search translations loaded:', languageNames[currentLangId] || 'Unknown', `(ID: ${currentLangId})`);
    
    // Debug: mostrar algunas traducciones
    if (window.location.search.includes('debug=translations')) {
        console.table(window.searchTranslations);
    }
})();