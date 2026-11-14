(function() {
    'use strict';

    const currentLangId = (typeof prestashop !== 'undefined' && prestashop.language)
        ? parseInt(prestashop.language.id)
        : 4;

    const allTranslations = {
        1: {

            search_placeholder: 'What are you looking for?',
            searching: 'Searching...',
            no_results: 'No results found',
            products_found: 'products found',
            product_found: 'product found',
            search_error: 'Search error',
            connection_error: 'Connection error',
            loading: 'Loading...',

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

            load_more: 'Load more',
            scroll_for_more: 'Scroll for more results',
            all_results_loaded: 'All results loaded',

            share_search: 'Share search',
            link_copied: 'Link copied to clipboard!',
            copy_error: 'Error copying link',
            no_search_to_share: 'No search to share',

            ref: 'Ref'
        },

        2: {

            search_placeholder: 'O que você está procurando?',
            searching: 'Pesquisando...',
            no_results: 'Nenhum resultado encontrado',
            products_found: 'produtos encontrados',
            product_found: 'produto encontrado',
            search_error: 'Erro na pesquisa',
            connection_error: 'Erro de conexão',
            loading: 'Carregando...',

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

            load_more: 'Carregar mais',
            scroll_for_more: 'Role para mais resultados',
            all_results_loaded: 'Todos os resultados carregados',

            share_search: 'Compartilhar pesquisa',
            link_copied: 'Link copiado para a área de transferência!',
            copy_error: 'Erro ao copiar link',
            no_search_to_share: 'Nenhuma pesquisa para compartilhar',

            ref: 'Ref'
        },

        4: {

            search_placeholder: '¿Qué estás buscando?',
            searching: 'Buscando...',
            no_results: 'No se encontraron resultados',
            products_found: 'productos encontrados',
            product_found: 'producto encontrado',
            search_error: 'Error en la búsqueda',
            connection_error: 'Error de conexión',
            loading: 'Cargando...',

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

            load_more: 'Cargar más',
            scroll_for_more: 'Desplázate para más resultados',
            all_results_loaded: 'Todos los resultados cargados',

            share_search: 'Compartir búsqueda',
            link_copied: '¡Enlace copiado al portapapeles!',
            copy_error: 'Error al copiar enlace',
            no_search_to_share: 'No hay búsqueda para compartir',

            ref: 'Ref'
        },

        5: {

            search_placeholder: 'Que cherchez-vous?',
            searching: 'Recherche...',
            no_results: 'Aucun résultat trouvé',
            products_found: 'produits trouvés',
            product_found: 'produit trouvé',
            search_error: 'Erreur de recherche',
            connection_error: 'Erreur de connexion',
            loading: 'Chargement...',

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

            load_more: 'Charger plus',
            scroll_for_more: 'Faites défiler pour plus',
            all_results_loaded: 'Tous les résultats chargés',

            share_search: 'Partager la recherche',
            link_copied: 'Lien copié dans le presse-papiers!',
            copy_error: 'Erreur de copie du lien',
            no_search_to_share: 'Aucune recherche à partager',

            ref: 'Réf'
        },

        6: {

            search_placeholder: 'Was suchen Sie?',
            searching: 'Suchen...',
            no_results: 'Keine Ergebnisse gefunden',
            products_found: 'Produkte gefunden',
            product_found: 'Produkt gefunden',
            search_error: 'Suchfehler',
            connection_error: 'Verbindungsfehler',
            loading: 'Laden...',

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

            load_more: 'Mehr laden',
            scroll_for_more: 'Scrollen für mehr',
            all_results_loaded: 'Alle Ergebnisse geladen',

            share_search: 'Suche teilen',
            link_copied: 'Link in Zwischenablage kopiert!',
            copy_error: 'Fehler beim Kopieren',
            no_search_to_share: 'Keine Suche zum Teilen',

            ref: 'Art.-Nr.'
        },

        7: {

            search_placeholder: 'Cosa stai cercando?',
            searching: 'Ricerca...',
            no_results: 'Nessun risultato trovato',
            products_found: 'prodotti trovati',
            product_found: 'prodotto trovato',
            search_error: 'Errore di ricerca',
            connection_error: 'Errore di connessione',
            loading: 'Caricamento...',

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

            load_more: 'Carica altro',
            scroll_for_more: 'Scorri per altri risultati',
            all_results_loaded: 'Tutti i risultati caricati',

            share_search: 'Condividi ricerca',
            link_copied: 'Link copiato negli appunti!',
            copy_error: 'Errore copia link',
            no_search_to_share: 'Nessuna ricerca da condividere',

            ref: 'Rif'
        }
    };

    window.searchTranslations = allTranslations[currentLangId] || allTranslations[4];

    window.t = function(key, defaultValue) {
        return window.searchTranslations[key] || defaultValue || key;
    };

})();
