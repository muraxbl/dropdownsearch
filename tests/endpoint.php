<?php
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$root = sys_get_temp_dir() . '/dropdownsearch-endpoint-' . bin2hex(random_bytes(6));
$module = $root . '/modules/dropdownsearch';
mkdir($module, 0700, true); mkdir($root . '/config');
foreach (['ajax-search.php', 'search-engine.php', 'config-defaults.php'] as $file) copy(__DIR__ . '/../' . $file, $module . '/' . $file);
$bootstrap = var_export(__DIR__ . '/bootstrap.php', true);
file_put_contents($root . '/config/config.inc.php', '<?php require ' . $bootstrap . ';' . <<<'PHP'
class Context {
    public static function getContext() { return (object) ['language' => (object) ['id' => 1], 'shop' => (object) ['id' => 1]]; }
}
class Module {
    public static function isEnabled($name) { return getenv('DS_TEST_ENABLED') !== '0'; }
}
class Tools {
    public static function getValue($key, $default = false) { $input = json_decode(getenv('DS_TEST_REQUEST'), true); return $input[$key] ?? $default; }
}
class Db {
    public static function getInstance() { return new self(); }
    public function executeS($sql) { throw new RuntimeException('SELECT private_table FROM /private/shop/config.php'); }
}
register_shutdown_function(function () { fwrite(STDERR, 'HTTP_STATUS=' . (http_response_code() ?: 200)); });
PHP
);
file_put_contents($root . '/init.php', '<?php');
try {
    $cases = [
        [['search_query' => []], '1', 400],
        [['search_query' => 'lamp', 'filters' => []], '1', 400],
        [['search_query' => 'lamp', 'filters' => '{"price_min":"1e999"}'], '1', 400],
        [['search_query' => 'lamp'], '0', 404],
        [['search_query' => 'lamp'], '1', 500],
    ];
    foreach ($cases as $case) {
        $process = proc_open([PHP_BINARY, $module . '/ajax-search.php'], [1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, null,
            array_merge(getenv(), ['DS_TEST_REQUEST' => json_encode($case[0]), 'DS_TEST_ENABLED' => $case[1]]));
        $body = stream_get_contents($pipes[1]); $stderr = stream_get_contents($pipes[2]);
        fclose($pipes[1]); fclose($pipes[2]); $exit = proc_close($process);
        if ($exit !== 0 || strpos($stderr, 'HTTP_STATUS=' . $case[2]) === false || !is_array(json_decode($body, true))) throw new RuntimeException('Invalid endpoint response: ' . $body);
        if (strpos($body, 'private') !== false || strpos($body, 'SELECT') !== false) throw new RuntimeException('Endpoint exposed internal details');
    }
    echo "PASS endpoint: malformed requests, disabled module, generic errors and HTTP status\n";
} finally {
    foreach (glob($module . '/*') as $file) unlink($file);
    unlink($root . '/config/config.inc.php'); unlink($root . '/init.php');
    rmdir($module); rmdir($root . '/modules'); rmdir($root . '/config'); rmdir($root);
}
