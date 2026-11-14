<?php
require __DIR__ . '/bootstrap.php';
class Module {
    public function l($text) { return $text; }
    public function displayError($text) { return 'ERROR:' . $text; }
}
class Tools {
    public static $token = 'valid-token';
    public static function getValue($key, $default = false) {
        if ($key !== 'token') throw new RuntimeException('Configuration was processed without CSRF validation');
        return self::$token;
    }
    public static function getAdminTokenLite($controller) { return 'valid-token'; }
}
require __DIR__ . '/../dropdownsearch.php';
$reflection = new ReflectionClass('DropdownSearch');
$module = $reflection->newInstanceWithoutConstructor();
$method = $reflection->getMethod('processConfiguration'); $method->setAccessible(true);
foreach ([['GET', 'valid-token'], ['POST', 'invalid-token'], ['POST', []]] as $case) {
    $_SERVER['REQUEST_METHOD'] = $case[0]; Tools::$token = $case[1];
    check(strpos($method->invoke($module), 'ERROR:') === 0, 'Unsafe configuration request accepted');
}
echo "PASS configuration: POST and admin CSRF token required before processing\n";
