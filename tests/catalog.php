<?php
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/../search-engine.php';
if (!getenv('DROPDOWNSEARCH_TEST_DSN')) throw new RuntimeException('Set DROPDOWNSEARCH_TEST_DSN to an isolated MySQL/MariaDB database.');
class Db
{
    public static $pdo;
    public static function getInstance() { return new self(); }
    public function executeS($sql) { return self::$pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC); }
    public function getRow($sql) { return self::$pdo->query($sql)->fetch(PDO::FETCH_ASSOC); }
}
Db::$pdo = new PDO(getenv('DROPDOWNSEARCH_TEST_DSN'), getenv('DROPDOWNSEARCH_TEST_USER') ?: 'root', getenv('DROPDOWNSEARCH_TEST_PASSWORD') ?: '', [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
Db::$pdo->exec("SET SESSION sql_mode = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ENGINE_SUBSTITUTION'");
$tables = [
    'product' => 'id_product INT PRIMARY KEY, reference VARCHAR(100), id_manufacturer INT, active INT',
    'product_shop' => 'id_product INT, id_shop INT, active INT, visibility VARCHAR(20), price DECIMAL(20,6), show_price INT',
    'product_lang' => 'id_product INT, id_shop INT, id_lang INT, name VARCHAR(200), description_short TEXT',
    'stock_available' => 'id_product INT, id_product_attribute INT, id_shop INT, id_shop_group INT, quantity INT',
    'category_product' => 'id_product INT, id_category INT', 'category' => 'id_category INT, active INT',
    'category_shop' => 'id_category INT, id_shop INT', 'category_group' => 'id_category INT, id_group INT',
    'category_lang' => 'id_category INT, id_shop INT, id_lang INT, name VARCHAR(200)',
    'manufacturer' => 'id_manufacturer INT, name VARCHAR(100), active INT',
    'product_attribute' => 'id_product INT, id_product_attribute INT',
    'product_attribute_shop' => 'id_product_attribute INT, id_shop INT',
    'product_attribute_combination' => 'id_product_attribute INT, id_attribute INT',
    'attribute' => 'id_attribute INT, id_attribute_group INT, color VARCHAR(100)',
    'attribute_lang' => 'id_attribute INT, id_lang INT, name VARCHAR(100)',
    'attribute_group' => 'id_attribute_group INT', 'attribute_group_lang' => 'id_attribute_group INT, id_lang INT, name VARCHAR(100)',
    'feature_product' => 'id_product INT, id_feature INT, id_feature_value INT', 'feature' => 'id_feature INT',
    'feature_lang' => 'id_feature INT, id_lang INT, name VARCHAR(100)',
    'feature_value' => 'id_feature_value INT', 'feature_value_lang' => 'id_feature_value INT, id_lang INT, value VARCHAR(100)',
];
foreach ($tables as $name => $columns) Db::$pdo->exec("CREATE TEMPORARY TABLE ds_test_$name ($columns) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
function insertRows($name, array $rows) {
    foreach ($rows as $row) {
        $statement = Db::$pdo->prepare('INSERT INTO ds_test_' . $name . ' VALUES (' . implode(',', array_fill(0, count($row), '?')) . ')');
        $statement->execute($row);
    }
}
insertRows('category', [[1, 1], [2, 1], [3, 1], [4, 0]]);
insertRows('category_shop', [[1, 1], [2, 1], [3, 2], [4, 1]]);
insertRows('category_group', [[1, 1], [2, 2], [3, 1], [4, 1]]);
insertRows('category_lang', [[1, 1, 1, 'Public'], [1, 2, 1, 'Other shop translation'], [2, 1, 1, 'Restricted'], [3, 2, 1, 'Other shop'], [4, 1, 1, 'Inactive']]);
foreach (range(1, 8) as $id) {
    insertRows('product', [[$id, 'REF' . $id, $id, 1]]);
    insertRows('product_shop', [[$id, $id === 3 ? 2 : 1, $id === 4 ? 0 : 1, $id === 5 ? 'catalog' : 'both', $id * 10, $id === 8 ? 0 : 1]]);
    insertRows('product_lang', [[$id, $id === 3 ? 2 : 1, 1, 'Lámpara ' . $id, 'Description']]);
    insertRows('stock_available', [[$id, 0, 1, 0, 5]]);
    insertRows('category_product', [[$id, $id === 2 ? 2 : ($id === 3 || $id === 6 ? 3 : ($id === 7 ? 4 : 1))]]);
    insertRows('manufacturer', [[$id, 'Manufacturer ' . $id, 1]]);
    insertRows('product_attribute', [[$id, $id]]);
    insertRows('product_attribute_shop', [[$id, $id === 3 ? 2 : 1]]);
    insertRows('product_attribute_combination', [[$id, $id]]);
    insertRows('attribute', [[$id, 1, '#ffffff']]);
    insertRows('attribute_lang', [[$id, 1, 'Attribute ' . $id]]);
    insertRows('feature_product', [[$id, 1, $id]]);
    insertRows('feature_value', [[$id]]);
    insertRows('feature_value_lang', [[$id, 1, 'Feature ' . $id]]);
}
insertRows('attribute_group', [[1]]); insertRows('attribute_group_lang', [[1, 1, 'Color']]);
insertRows('feature', [[1]]); insertRows('feature_lang', [[1, 1, 'Feature']]);
insertRows('product_lang', [[1, 2, 1, 'Secret translation', 'Secret description']]);
insertRows('category_product', [[1, 2]]);
function ids($rows, $key) { $ids = array_map('intval', array_column($rows, $key)); sort($ids); return $ids; }
function searchIds($query = 'lámpara', $filters = []) { return searchProductsNoDuplicates($query, 1, 20, $filters, 1, 1); }
$result = searchIds();
check(searchIds('L')['total'] === 2, 'Configured one-character search failed');
check(ids($result['products'], 'id_product') === [1, 8] && $result['total'] === 2, 'Anonymous search leaked restricted/inactive/foreign-shop/catalog-only products');
insertRows('product_attribute', [[1, 99]]);
insertRows('product_attribute_shop', [[99, 2]]);
insertRows('product_attribute_combination', [[99, 99]]);
insertRows('attribute', [[99, 1, '#000000']]);
insertRows('attribute_lang', [[99, 1, 'Foreign shop combination']]);
check(searchIds('lámpara', ['attributes_1' => [99]])['total'] === 0, 'Foreign combination filter leaked');
$facets = getAvailableFilters('bombilla', [], 1, 1);
check(ids($facets['categories'], 'id_category') === [1], 'Category permissions or synonyms differ from results');
check(ids($facets['manufacturers'], 'id_manufacturer') === [1, 8], 'Manufacturer facet leak');
check(ids($facets['attributes'][0]['attributes'], 'id_attribute') === [1, 8], 'Attribute facet leak');
check(ids($facets['features'][0]['values'], 'id_feature_value') === [1, 8], 'Feature facet leak');
check($facets['price_range'] === ['min_price' => 10.0, 'max_price' => 10.0], 'Hidden product price leaked');
check(searchIds('Secret')['total'] === 0, 'Foreign shop translation leaked');
check(searchIds("' OR 1=1 --")['total'] === 0, 'SQL quoting failed');
check(searchIds('%%')['total'] === 0 && searchIds('__')['total'] === 0, 'LIKE wildcards were interpreted');
check(ids(searchIds('lámpara', ['price_max' => 100])['products'], 'id_product') === [1], 'Price filter revealed a hidden price');
FrontController::$groups = [2];
check(ids(searchIds()['products'], 'id_product') === [1, 2], 'Customer group access changed');
FrontController::$groups = []; Group::$enabled = false;
check(ids(searchIds()['products'], 'id_product') === [1, 2, 8], 'Disabled group feature changed access');
Group::$enabled = true; Group::$prices = false;
check(!isset(getAvailableFilters('lámpara', [], 1, 1)['price_range']), 'Group price range leaked');
Group::$prices = true; StockAvailable::$shared = true;
insertRows('stock_available', [[1, 0, 0, 7, 9]]);
check(ids(searchIds('lámpara', ['in_stock' => true])['products'], 'id_product') === [1], 'Shared stock scope failed');
insertRows('product_lang', [[1, 1, 2, '100% LED', 'Description']]);
check(searchProductsNoDuplicates('100%', 1, 20, [], 2, 1)['total'] === 1, 'Literal wildcard search failed');
echo "PASS catalog SQL: shops, groups, visibility, facets, prices, quoting, wildcards, shared stock, strict SQL mode\n";
