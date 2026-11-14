<?php
require __DIR__ . '/bootstrap.php';
require __DIR__ . '/../search-engine.php';
$valid = dropdownsearchValidateRequest('  lámpara led  ', '2', '20', '{"categories":["1",2,2],"price_min":"0","in_stock":true}', 2);
check($valid === ['lámpara led', 2, 20, ['categories' => [1, 2], 'price_min' => 0.0, 'in_stock' => true]], 'Valid request changed');
$base = ['lámpara', '1', '20', '{}', 2];
$invalid = [
    [0, []], [0, "\xff"], [0, str_repeat('x', 101)], [0, str_repeat('led ', 11)], [0, 'x'],
    [1, []], [1, '-1'], [1, '1001'], [1, '1e3'], [2, '0'], [2, '101'],
    [3, []], [3, 'null'], [3, '[]'], [3, '{broken'], [3, '{"unknown":1}'],
    [3, '{"attributes_1evil":[1]}'], [3, '{"features_1":[[1]]}'], [3, '{"categories":["1 OR 1=1"]}'],
    [3, '{"categories":[0]}'], [3, '{"price_min":"1e999"}'], [3, '{"price_min":-1}'],
    [3, '{"price_min":20,"price_max":10}'], [3, '{"in_stock":{}}'],
    [3, json_encode(['categories' => array_fill(0, 51, 1)])], [3, str_repeat(' ', 8193)],
];
foreach ($invalid as $case) {
    $args = $base;
    $args[$case[0]] = $case[1];
    try { dropdownsearchValidateRequest(...$args); throw new RuntimeException('Invalid request was accepted: ' . json_encode($case)); }
    catch (InvalidArgumentException $expected) {}
}
Group::$prices = false;
try { dropdownsearchValidateRequest('lamp', '1', '20', '{"price_min":0}', 2); throw new RuntimeException('Hidden price inference allowed'); }
catch (InvalidArgumentException $expected) {}
check(getPriceRangeFilter('1=1', 1, 1) === null, 'Hidden price range leaked');
echo 'PASS request validation (' . (count($invalid) + 3) . " cases)\n";
