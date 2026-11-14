<?php
if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}
define('_PS_VERSION_', '1.7.8.11');
define('_DB_PREFIX_', 'ds_test_');
class Group
{
    public static $enabled = true;
    public static $id = 1;
    public static $prices = true;
    public static function isFeatureActive() { return self::$enabled; }
    public static function getCurrent() { return (object) ['id' => self::$id, 'show_prices' => self::$prices]; }
}
class FrontController
{
    public static $groups = [];
    public static function getCurrentCustomerGroups() { return self::$groups; }
}
class Configuration
{
    public static $values = [];
    public static function get($key) { return self::$values[$key] ?? false; }
}
class StockAvailable
{
    public static $shared = false;
    public static function addSqlShopRestriction($sql, $shop, $alias) {
        return self::$shared ? " AND $alias.id_shop = 0 AND $alias.id_shop_group = 7" : " AND $alias.id_shop = " . (int) $shop . " AND $alias.id_shop_group = 0";
    }
}
function pSQL($value) {
    return str_replace(["\\", "'", "\0", "\n", "\r"], ["\\\\", "\\'", "\\0", "\\n", "\\r"], $value);
}
function check($condition, $message) {
    if (!$condition) throw new RuntimeException($message);
}
$SYNONYMS = [['bombilla', 'lámpara']];
