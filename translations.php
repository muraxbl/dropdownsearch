<?php


if (!defined('_PS_VERSION_')) {
    exit;
}

require_once(dirname(__FILE__) . '/../../config/config.inc.php');
require_once(dirname(__FILE__) . '/../../init.php');

$context = Context::getContext();
$id_lang = (int) $context->language->id;

$translations = [

    'search_placeholder' => [
        1 => 'What are you looking for?',
        2 => 'O que você está procurando?',
        4 => '¿Qué estás buscando?',
        5 => 'Que cherchez-vous?',
        6 => 'Was suchen Sie?',
        7 => 'Cosa stai cercando?'
    ],

    'searching' => [
        1 => 'Searching...',
        2 => 'Pesquisando...',
        4 => 'Buscando...',
        5 => 'Recherche...',
        6 => 'Suchen...',
        7 => 'Ricerca...'
    ],

    'no_results' => [
        1 => 'No results found',
        2 => 'Nenhum resultado encontrado',
        4 => 'No se encontraron resultados',
        5 => 'Aucun résultat trouvé',
        6 => 'Keine Ergebnisse gefunden',
        7 => 'Nessun risultato trovato'
    ],

    'products_found' => [
        1 => 'products found',
        2 => 'produtos encontrados',
        4 => 'productos encontrados',
        5 => 'produits trouvés',
        6 => 'Produkte gefunden',
        7 => 'prodotti trovati'
    ],

    'product_found' => [
        1 => 'product found',
        2 => 'produto encontrado',
        4 => 'producto encontrado',
        5 => 'produit trouvé',
        6 => 'Produkt gefunden',
        7 => 'prodotto trovato'
    ],

    'filters' => [
        1 => 'Filters',
        2 => 'Filtros',
        4 => 'Filtros',
        5 => 'Filtres',
        6 => 'Filter',
        7 => 'Filtri'
    ],

    'clear_filters' => [
        1 => 'Clear filters',
        2 => 'Limpar filtros',
        4 => 'Limpiar filtros',
        5 => 'Effacer les filtres',
        6 => 'Filter löschen',
        7 => 'Cancella filtri'
    ],

    'active_filters' => [
        1 => 'Active filters:',
        2 => 'Filtros ativos:',
        4 => 'Filtros activos:',
        5 => 'Filtres actifs:',
        6 => 'Aktive Filter:',
        7 => 'Filtri attivi:'
    ],

    'categories' => [
        1 => 'Categories',
        2 => 'Categorias',
        4 => 'Categorías',
        5 => 'Catégories',
        6 => 'Kategorien',
        7 => 'Categorie'
    ],

    'manufacturers' => [
        1 => 'Manufacturers',
        2 => 'Fabricantes',
        4 => 'Fabricantes',
        5 => 'Fabricants',
        6 => 'Hersteller',
        7 => 'Produttori'
    ],

    'price' => [
        1 => 'Price',
        2 => 'Preço',
        4 => 'Precio',
        5 => 'Prix',
        6 => 'Preis',
        7 => 'Prezzo'
    ],

    'price_min' => [
        1 => 'Min. price',
        2 => 'Preço mín.',
        4 => 'Precio mín.',
        5 => 'Prix min.',
        6 => 'Min. Preis',
        7 => 'Prezzo min.'
    ],

    'price_max' => [
        1 => 'Max. price',
        2 => 'Preço máx.',
        4 => 'Precio máx.',
        5 => 'Prix max.',
        6 => 'Max. Preis',
        7 => 'Prezzo max.'
    ],

    'attributes' => [
        1 => 'Attributes',
        2 => 'Atributos',
        4 => 'Atributos',
        5 => 'Attributs',
        6 => 'Attribute',
        7 => 'Attributi'
    ],

    'features' => [
        1 => 'Features',
        2 => 'Características',
        4 => 'Características',
        5 => 'Caractéristiques',
        6 => 'Merkmale',
        7 => 'Caratteristiche'
    ],

    'in_stock_only' => [
        1 => 'Only products in stock',
        2 => 'Apenas produtos em estoque',
        4 => 'Solo productos en stock',
        5 => 'Seulement produits en stock',
        6 => 'Nur vorrätige Produkte',
        7 => 'Solo prodotti disponibili'
    ],

    'in_stock' => [
        1 => 'In stock',
        2 => 'Em estoque',
        4 => 'En stock',
        5 => 'En stock',
        6 => 'Auf Lager',
        7 => 'Disponibile'
    ],

    'out_of_stock' => [
        1 => 'Out of stock',
        2 => 'Sem estoque',
        4 => 'Sin stock',
        5 => 'Rupture de stock',
        6 => 'Nicht vorrätig',
        7 => 'Esaurito'
    ],

    'load_more' => [
        1 => 'Load more',
        2 => 'Carregar mais',
        4 => 'Cargar más',
        5 => 'Charger plus',
        6 => 'Mehr laden',
        7 => 'Carica altro'
    ],

    'loading' => [
        1 => 'Loading...',
        2 => 'Carregando...',
        4 => 'Cargando...',
        5 => 'Chargement...',
        6 => 'Laden...',
        7 => 'Caricamento...'
    ],

    'scroll_for_more' => [
        1 => 'Scroll for more results',
        2 => 'Role para mais resultados',
        4 => 'Desplázate para más resultados',
        5 => 'Faites défiler pour plus',
        6 => 'Scrollen für mehr',
        7 => 'Scorri per altri risultati'
    ],

    'all_results_loaded' => [
        1 => 'All results loaded',
        2 => 'Todos os resultados carregados',
        4 => 'Todos los resultados cargados',
        5 => 'Tous les résultats chargés',
        6 => 'Alle Ergebnisse geladen',
        7 => 'Tutti i risultati caricati'
    ],

    'share_search' => [
        1 => 'Share search',
        2 => 'Compartilhar pesquisa',
        4 => 'Compartir búsqueda',
        5 => 'Partager la recherche',
        6 => 'Suche teilen',
        7 => 'Condividi ricerca'
    ],

    'link_copied' => [
        1 => 'Link copied to clipboard!',
        2 => 'Link copiado para a área de transferência!',
        4 => '¡Enlace copiado al portapapeles!',
        5 => 'Lien copié dans le presse-papiers!',
        6 => 'Link in Zwischenablage kopiert!',
        7 => 'Link copiato negli appunti!'
    ],

    'copy_error' => [
        1 => 'Error copying link',
        2 => 'Erro ao copiar link',
        4 => 'Error al copiar enlace',
        5 => 'Erreur de copie du lien',
        6 => 'Fehler beim Kopieren',
        7 => 'Errore copia link'
    ],

    'no_search_to_share' => [
        1 => 'No search to share',
        2 => 'Nenhuma pesquisa para compartilhar',
        4 => 'No hay búsqueda para compartir',
        5 => 'Aucune recherche à partager',
        6 => 'Keine Suche zum Teilen',
        7 => 'Nessuna ricerca da condividere'
    ],

    'search_error' => [
        1 => 'Search error',
        2 => 'Erro na pesquisa',
        4 => 'Error en la búsqueda',
        5 => 'Erreur de recherche',
        6 => 'Suchfehler',
        7 => 'Errore di ricerca'
    ],

    'connection_error' => [
        1 => 'Connection error',
        2 => 'Erro de conexão',
        4 => 'Error de conexión',
        5 => 'Erreur de connexion',
        6 => 'Verbindungsfehler',
        7 => 'Errore di connessione'
    ],

    'ref' => [
        1 => 'Ref',
        2 => 'Ref',
        4 => 'Ref',
        5 => 'Réf',
        6 => 'Art.-Nr.',
        7 => 'Rif'
    ]
];

$currentTranslations = [];
foreach ($translations as $key => $langs) {
    $currentTranslations[$key] = isset($langs[$id_lang]) ? $langs[$id_lang] : $langs[4];
}

header('Content-Type: application/javascript; charset=utf-8');
header('Cache-Control: max-age=3600');

echo 'window.searchTranslations = ' . json_encode($currentTranslations, JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) . ';';
echo 'window.t = function (key, defaultValue) { return window.searchTranslations[key] || defaultValue || key; };';
