<?php
require_once __DIR__ . '/../../config/config.inc.php';
require_once __DIR__ . '/../../init.php';
require_once __DIR__ . '/search-engine.php';

while (ob_get_level()) {
    ob_end_clean();
}
ini_set('display_errors', '0');
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: private, no-store');
header('X-Content-Type-Options: nosniff');

$MIN_QUERY_LENGTH = max(1, min(10, dropdownsearchGetIntConfig('DROPDOWNSEARCH_MIN_QUERY_LENGTH', 2)));
$DEFAULT_PAGE_LIMIT = max(1, min(100, dropdownsearchGetIntConfig('DROPDOWNSEARCH_PAGE_LIMIT', 20)));

$boostErrors = [];
$BOOST_RULES = dropdownsearchParseBoostRulesText(
    dropdownsearchGetConfigurationText('DROPDOWNSEARCH_BOOST_RULES', dropdownsearchDefaultBoostRulesText()),
    $boostErrors
);
if (!empty($boostErrors)) {
    error_log('DropdownSearch boost configuration ignored: ' . implode(' | ', $boostErrors));
    $BOOST_RULES = dropdownsearchParseBoostRulesText(dropdownsearchDefaultBoostRulesText(), $boostErrors);
}

$synonymErrors = [];
$SYNONYMS = dropdownsearchParseSynonymsText(
    dropdownsearchGetConfigurationText('DROPDOWNSEARCH_SYNONYMS', dropdownsearchDefaultSynonymsText()),
    $synonymErrors
);
if (!empty($synonymErrors)) {
    error_log('DropdownSearch synonyms configuration ignored: ' . implode(' | ', $synonymErrors));
    $SYNONYMS = dropdownsearchParseSynonymsText(dropdownsearchDefaultSynonymsText(), $synonymErrors);
}

try {
    $context = Context::getContext();
    $id_lang = (int) $context->language->id;
    $id_shop = (int) $context->shop->id;

    if (!Module::isEnabled('dropdownsearch') || $id_shop < 1 || $id_lang < 1) {
        http_response_code(404);
        echo json_encode(['error' => 'Search unavailable.']);
        exit;
    }
    $query = Tools::getValue('search_query', Tools::getValue('query', ''));
    list($query, $page, $limit, $filters) = dropdownsearchValidateRequest(
        $query, Tools::getValue('page', '1'), Tools::getValue('limit', (string) $DEFAULT_PAGE_LIMIT),
        Tools::getValue('filters', '{}'), $MIN_QUERY_LENGTH
    );

    $boosted_ids = getBoostIdsForQuery($query, $BOOST_RULES);

    $searchResults = searchProductsNoDuplicates($query, $page, $limit, $filters, $id_lang, $id_shop, $boosted_ids);

    $availableFilters = getAvailableFilters($query, $filters, $id_lang, $id_shop);

    $results = [];
    if (is_array($searchResults['products']) && count($searchResults['products']) > 0) {
        foreach ($searchResults['products'] as $product_data) {
            try {
                $product = new Product((int) $product_data['id_product'], false, $id_lang, $id_shop);

                if (!Validate::isLoadedObject($product) || !$product->active || !$product->checkAccess((int) $context->customer->id)) {
                    continue;
                }

                $link = $context->link;
                $image = getProductMainImageSimple($product);
                $price = dropdownsearchCanShowPrices() && $product->show_price ? getFormattedPriceSimple($product, $context) : null;
                $description = strip_tags($product->description_short);
                $description = Tools::truncate($description, 120);
                $quantity = StockAvailable::getQuantityAvailableByProduct((int) $product->id, 0, $id_shop);

                $manufacturer = '';
                if ($product->id_manufacturer > 0) {
                    $manu = new Manufacturer($product->id_manufacturer, $id_lang, $id_shop);
                    if (Validate::isLoadedObject($manu)) {
                        $manufacturer = $manu->name;
                    }
                }

                $results[] = [
                    'id_product' => (int) $product->id,
                    'name' => $product->name,
                    'description_short' => $description,
                    'reference' => $product->reference,
                    'price' => $price,
                    'quantity' => (int) $quantity,
                    'link' => $link->getProductLink($product),
                    'image' => $image,
                    'in_stock' => $quantity > 0,
                    'manufacturer' => $manufacturer,
                    'relevance_score' => isset($product_data['relevance_score']) ? (float) $product_data['relevance_score'] : 0,
                ];

            } catch (Throwable $e) {
                error_log("Error procesando producto " . $product_data['id_product'] . ": " . $e->getMessage());
                continue;
            }
        }
    }

    $response = [
        'products' => $results,
        'pagination' => [
            'current_page' => $page,
            'total_products' => (int) $searchResults['total'],
            'products_per_page' => $limit,
            'total_pages' => ceil($searchResults['total'] / $limit),
            'has_more' => ($page * $limit) < $searchResults['total']
        ],
        'filters' => $availableFilters
    ];

    $json = json_encode($response, JSON_UNESCAPED_UNICODE | JSON_PARTIAL_OUTPUT_ON_ERROR);

    if ($json === false) {
        throw new Exception('Error encoding JSON: ' . json_last_error_msg());
    }

    echo $json;

} catch (InvalidArgumentException $e) {
    http_response_code(400);
    echo json_encode(['error' => $e->getMessage()]);
} catch (Throwable $e) {
    http_response_code(500);
    error_log("AJAX Search ERROR: " . $e->getMessage());
    echo json_encode(['error' => 'Search unavailable.'], JSON_UNESCAPED_UNICODE);
}
