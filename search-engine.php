<?php
if (!defined('_PS_VERSION_')) {
    exit;
}

require_once __DIR__ . '/config-defaults.php';

function dropdownsearchValidateRequest($query, $page, $limit, $rawFilters, $minLength)
{
    if (!is_string($query) || !mb_check_encoding($query, 'UTF-8') || strlen($query) > 100) {
        throw new InvalidArgumentException('Invalid query.');
    }
    $query = trim($query);
    if (count(preg_split('/\s+/u', $query)) > 10 || mb_strlen($query, 'UTF-8') < $minLength) {
        throw new InvalidArgumentException('Query must meet the minimum length and contain at most 10 words.');
    }
    foreach ([$page, $limit] as $number) {
        if ((!is_int($number) && !is_string($number)) || !preg_match('/^[0-9]{1,6}$/D', (string) $number)) {
            throw new InvalidArgumentException('Invalid pagination.');
        }
    }
    if ($page < 1 || $page > 1000 || $limit < 1 || $limit > 100) {
        throw new InvalidArgumentException('Invalid pagination.');
    }
    if (!is_string($rawFilters) || strlen($rawFilters) > 8192) {
        throw new InvalidArgumentException('Invalid filters.');
    }
    $decoded = json_decode($rawFilters);
    if (!$decoded instanceof stdClass || count(get_object_vars($decoded)) > 16) {
        throw new InvalidArgumentException('Invalid filters.');
    }
    $filters = [];
    foreach (get_object_vars($decoded) as $key => $value) {
        if (in_array($key, ['price_min', 'price_max'], true)) {
            if ((!is_string($value) && !is_int($value) && !is_float($value)) || !is_numeric($value)
                || !is_finite((float) $value) || $value < 0 || $value > 1000000000) {
                throw new InvalidArgumentException('Invalid price.');
            }
            $filters[$key] = (float) $value;
        } elseif ($key === 'in_stock') {
            if (!in_array($value, [true, false, 0, 1, '0', '1'], true)) {
                throw new InvalidArgumentException('Invalid stock filter.');
            }
            $filters[$key] = (bool) $value;
        } elseif (in_array($key, ['categories', 'manufacturers'], true) || preg_match('/^(attributes|features)_[1-9][0-9]{0,9}$/D', $key)) {
            if (!is_array($value) || count($value) > 50) {
                throw new InvalidArgumentException('Invalid filter values.');
            }
            foreach ($value as $id) {
                if ((!is_string($id) && !is_int($id)) || !preg_match('/^[1-9][0-9]{0,9}$/D', (string) $id) || $id > 2147483647) {
                    throw new InvalidArgumentException('Invalid filter ID.');
                }
            }
            $filters[$key] = array_values(array_unique(array_map('intval', $value)));
        } else {
            throw new InvalidArgumentException('Unknown filter.');
        }
    }
    if (isset($filters['price_min'], $filters['price_max']) && $filters['price_min'] > $filters['price_max']) {
        throw new InvalidArgumentException('Invalid price range.');
    }
    if (!dropdownsearchCanShowPrices() && (isset($filters['price_min']) || isset($filters['price_max']))) {
        throw new InvalidArgumentException('Price filters are unavailable.');
    }
    return [$query, (int) $page, (int) $limit, $filters];
}

function dropdownsearchCanShowPrices()
{
    return !Group::isFeatureActive() || (bool) Group::getCurrent()->show_prices;
}

function dropdownsearchCategoryAccess($alias)
{
    if (!Group::isFeatureActive()) {
        return '1=1';
    }
    $groups = array_map('intval', FrontController::getCurrentCustomerGroups());
    if (!$groups) {
        $groups = [(int) Group::getCurrent()->id];
    }
    return 'EXISTS (SELECT 1 FROM ' . _DB_PREFIX_ . 'category_group access_group'
        . ' WHERE access_group.id_category = ' . $alias . '.id_category'
        . ' AND access_group.id_group IN (' . implode(',', $groups) . '))';
}

function dropdownsearchCatalogScope($id_shop)
{
    return "ps.active = 1 AND ps.visibility IN ('both', 'search') AND EXISTS ("
        . 'SELECT 1 FROM ' . _DB_PREFIX_ . 'category_product access_product'
        . ' INNER JOIN ' . _DB_PREFIX_ . 'category access_category ON access_category.id_category = access_product.id_category'
        . ' INNER JOIN ' . _DB_PREFIX_ . 'category_shop access_shop ON access_shop.id_category = access_category.id_category'
        . ' WHERE access_product.id_product = p.id_product AND access_category.active = 1'
        . ' AND access_shop.id_shop = ' . (int) $id_shop
        . ' AND ' . dropdownsearchCategoryAccess('access_category') . ')';
}

function dropdownsearchLike($value)
{
    return pSQL(str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $value));
}

function dropdownsearchQueryWords($query)
{
    $words = preg_split('/\s+/u', trim($query));
    $minimum = count($words) === 1 ? 1 : 2;
    return array_values(array_filter($words, function ($word) use ($minimum) {
        return mb_strlen($word, 'UTF-8') >= $minimum;
    }));
}

function dropdownsearchQueryWhere($query)
{
    global $SYNONYMS;
    $expanded = expandQueryWithSynonyms($query, $SYNONYMS);
    $conditions = [];
    foreach ($expanded['original_words'] as $word) {
        $wordConditions = [];
        foreach ($expanded['synonym_map'][$word] as $synonym) {
            foreach (generateSearchVariations($synonym) as $variation) {
                $escaped = dropdownsearchLike($variation);
                $wordConditions[] = "LOWER(pl.name) LIKE LOWER('%" . $escaped . "%')";
                if ($synonym === $word) {
                    $wordConditions[] = "LOWER(p.reference) LIKE LOWER('%" . $escaped . "%')";
                }
            }
        }
        $conditions[] = '(' . implode(' OR ', array_unique($wordConditions)) . ')';
    }
    return dropdownsearchBuildMatchWhereClause($conditions, dropdownsearchGetMatchMode());
}

function dropdownsearchGetIntConfig($key, $default)
{
    $value = Configuration::get($key);
    if ($value === false || $value === null || $value === '') {
        return (int) $default;
    }

    return (int) $value;
}

function dropdownsearchGetMatchMode()
{
    $mode = Configuration::get('DROPDOWNSEARCH_MATCH_MODE');

    return in_array($mode, ['strict', 'balanced', 'broad'], true) ? $mode : 'balanced';
}

function dropdownsearchBuildMatchWhereClause(array $where_conditions, $match_mode)
{
    $count = count($where_conditions);
    if ($count === 0) {
        return '1=0';
    }

    if ($count === 1 || $match_mode === 'broad') {
        return implode(' OR ', $where_conditions);
    }

    if ($match_mode === 'strict' || $count === 2) {
        return implode(' AND ', $where_conditions);
    }

    $required_matches = max(2, $count - 1);
    $score_parts = [];
    foreach ($where_conditions as $condition) {
        $score_parts[] = 'CASE WHEN ' . $condition . ' THEN 1 ELSE 0 END';
    }

    return '((' . implode(' + ', $score_parts) . ') >= ' . (int) $required_matches . ')';
}

function getBoostIdsForQuery($query, $boost_rules)
{
    $boosted_ids = [];
    $query_lower = mb_strtolower(trim($query), 'UTF-8');
    $query_no_accents = removeAccents($query_lower);

    foreach ($boost_rules as $term => $product_ids) {
        $term_lower = mb_strtolower($term, 'UTF-8');
        $term_no_accents = removeAccents($term_lower);

        // Coincidencia parcial: si la búsqueda contiene el término o viceversa
        if (
            strpos($query_lower, $term_lower) !== false ||
            strpos($term_lower, $query_lower) !== false ||
            strpos($query_no_accents, $term_no_accents) !== false ||
            strpos($term_no_accents, $query_no_accents) !== false
        ) {
            $boosted_ids = array_merge($boosted_ids, $product_ids);
        }
    }

    return array_unique(array_map('intval', $boosted_ids));
}

/**
 * ========================================================================
 * SISTEMA DE TOLERANCIA DE BÚSQUEDA
 * ========================================================================
 */

/**
 * Genera variaciones tolerantes de una palabra
 * - Maneja plurales en español (lámparas → lámpara)
 * - Maneja referencias parciales (PNRB18N → PNRB18, solo quita sufijos alfabéticos)
 * 
 * @param string $word Palabra original
 * @return array Array de variaciones incluyendo la original
 */
function generateSearchVariations($word)
{
    $variations = [$word]; // Siempre incluir la original
    $word_lower = mb_strtolower($word, 'UTF-8');
    $word_length = mb_strlen($word, 'UTF-8');

    // =========================================
    // 1. TOLERANCIA PARA PLURALES EN ESPAÑOL
    // =========================================

    // Terminaciones plurales comunes y sus singulares
    $plural_rules = [
        // Plurales terminados en -es (luces → luz, interruptores → interruptor)
        'aces' => ['az', 'ace'],
        'eces' => ['ez', 'ece'],
        'ices' => ['iz', 'ice'],
        'oces' => ['oz', 'oce'],
        'uces' => ['uz', 'uce'],
        'iones' => ['ión', 'ion'],
        'ores' => ['or'],
        'ares' => ['ar'],
        'eres' => ['er'],
        'les' => ['l'],
        'nes' => ['n'],
        'res' => ['r'],
        'ses' => ['s'],
        'ces' => ['z'],
        'es' => ['e', ''],
        's' => [''],
    ];

    // Aplicar reglas de plural → singular
    foreach ($plural_rules as $plural_ending => $singular_endings) {
        if (mb_substr($word_lower, -mb_strlen($plural_ending)) === $plural_ending) {
            $stem = mb_substr($word, 0, -mb_strlen($plural_ending));
            foreach ($singular_endings as $singular_ending) {
                $singular = $stem . $singular_ending;
                if (mb_strlen($singular) >= 2 && !in_array($singular, $variations)) {
                    $variations[] = $singular;
                }
            }
        }
    }

    // Reglas de singular → plural (por si buscan en singular)
    $singular_rules = [
        'z' => 'ces',
        'ón' => 'ones',
        'on' => 'ones',
        'or' => 'ores',
        'ar' => 'ares',
        'er' => 'eres',
        'l' => 'les',
        'n' => 'nes',
        'r' => 'res',
        's' => 'ses',
    ];

    foreach ($singular_rules as $singular_ending => $plural_ending) {
        if (mb_substr($word_lower, -mb_strlen($singular_ending)) === $singular_ending) {
            $stem = mb_substr($word, 0, -mb_strlen($singular_ending));
            $plural = $stem . $plural_ending;
            if (!in_array($plural, $variations)) {
                $variations[] = $plural;
            }
        }
    }

    // Añadir plural simple con 's' si no termina en s
    if (mb_substr($word_lower, -1) !== 's') {
        $variations[] = $word . 's';
    }

    // =========================================
    // 2. TOLERANCIA PARA REFERENCIAS PARCIALES
    //    Solo quita sufijos ALFABÉTICOS del final
    //    PNRB18N → PNRB18 ✓
    //    PNRB18N → PNRB1 ✗ (no toca números)
    // =========================================

    // Detectar si parece una referencia (contiene números y letras)
    $has_numbers = preg_match('/[0-9]/', $word);
    $has_letters = preg_match('/[a-zA-Z]/', $word);
    $is_reference = $has_numbers && $has_letters;

    if ($is_reference && $word_length >= 4) {
        // Patrón: letras/números seguidos de sufijo alfabético final
        // PNRB18N → PNRB18 (quita N)
        // PNRB18NW → PNRB18 (quita NW)
        // ABC123XYZ → ABC123 (quita XYZ)

        if (preg_match('/^(.+[0-9])([a-zA-Z]+)$/', $word, $matches)) {
            $base_reference = $matches[1]; // Parte sin el sufijo alfabético
            if (mb_strlen($base_reference) >= 3 && !in_array($base_reference, $variations)) {
                $variations[] = $base_reference;
            }
        }
    }

    // =========================================
    // 3. TOLERANCIA PARA ACENTOS
    // =========================================

    // Crear versión sin acentos
    $without_accents = removeAccents($word);
    if ($without_accents !== $word && !in_array($without_accents, $variations)) {
        $variations[] = $without_accents;
    }

    // Crear versiones sin acentos de las variaciones existentes
    $variations_copy = $variations;
    foreach ($variations_copy as $var) {
        $var_no_accent = removeAccents($var);
        if ($var_no_accent !== $var && !in_array($var_no_accent, $variations)) {
            $variations[] = $var_no_accent;
        }
    }

    return array_unique($variations);
}

/**
 * Elimina acentos de una cadena
 */
function removeAccents($string)
{
    $accents = [
        'á' => 'a',
        'é' => 'e',
        'í' => 'i',
        'ó' => 'o',
        'ú' => 'u',
        'Á' => 'A',
        'É' => 'E',
        'Í' => 'I',
        'Ó' => 'O',
        'Ú' => 'U',
        'ñ' => 'n',
        'Ñ' => 'N',
        'ü' => 'u',
        'Ü' => 'U'
    ];
    return strtr($string, $accents);
}

/**
 * ========================================================================
 * SISTEMA DE SINÓNIMOS
 * ========================================================================
 */

/**
 * Obtiene los sinónimos de una palabra o frase
 * 
 * @param string $word Palabra o frase a buscar sinónimos
 * @param array $synonyms_config Configuración de sinónimos
 * @return array Array de sinónimos (incluye la palabra original)
 */
function getSynonyms($word, $synonyms_config)
{
    $word_lower = mb_strtolower(trim($word), 'UTF-8');
    $word_no_accents = removeAccents($word_lower);
    $found_synonyms = [$word]; // Siempre incluir la original

    foreach ($synonyms_config as $synonym_group) {
        $group_lower = array_map(function ($s) {
            return mb_strtolower(trim($s), 'UTF-8');
        }, $synonym_group);

        // Verificar si la palabra está en este grupo (con o sin acentos)
        $is_in_group = false;
        foreach ($group_lower as $synonym) {
            if (
                $synonym === $word_lower ||
                $synonym === $word_no_accents ||
                removeAccents($synonym) === $word_no_accents
            ) {
                $is_in_group = true;
                break;
            }
        }

        // Si está en el grupo, añadir todos los sinónimos
        if ($is_in_group) {
            foreach ($synonym_group as $synonym) {
                if (!in_array($synonym, $found_synonyms)) {
                    $found_synonyms[] = $synonym;
                }
                // También añadir versión sin acentos
                $syn_no_accent = removeAccents($synonym);
                if ($syn_no_accent !== $synonym && !in_array($syn_no_accent, $found_synonyms)) {
                    $found_synonyms[] = $syn_no_accent;
                }
            }
        }
    }

    return array_unique($found_synonyms);
}

/**
 * Expande una consulta de búsqueda con sinónimos
 * Mantiene las palabras originales y añade sus sinónimos
 * 
 * @param string $query Consulta original
 * @param array $synonyms_config Configuración de sinónimos
 * @return array ['original_words' => [...], 'expanded_words' => [...], 'synonym_map' => [...]]
 */
function expandQueryWithSynonyms($query, $synonyms_config)
{
    $words = dropdownsearchQueryWords($query);

    $original_words = [];
    $expanded_words = [];
    $synonym_map = []; // Para saber qué sinónimos corresponden a qué palabra

    foreach ($words as $word) {
        $original_words[] = $word;
        $synonyms = getSynonyms($word, $synonyms_config);

        $synonym_map[$word] = $synonyms;

        foreach ($synonyms as $syn) {
            if (!in_array($syn, $expanded_words)) {
                $expanded_words[] = $syn;
            }
        }
    }

    // También buscar sinónimos de frases completas (para frases de 2+ palabras)
    if (count($words) >= 2) {
        $full_query = implode(' ', $words);
        $full_synonyms = getSynonyms($full_query, $synonyms_config);

        if (count($full_synonyms) > 1) { // Si encontró sinónimos además de la original
            $synonym_map[$full_query] = $full_synonyms;
            foreach ($full_synonyms as $syn) {
                if (!in_array($syn, $expanded_words)) {
                    $expanded_words[] = $syn;
                }
            }
        }
    }

    return [
        'original_words' => $original_words,
        'expanded_words' => $expanded_words,
        'synonym_map' => $synonym_map
    ];
}

/**
 * ========================================================================
 * BÚSQUEDA PRINCIPAL - CON PRIORIZACIÓN DE MÚLTIPLES COINCIDENCIAS
 * ========================================================================
 * 
 * ★★★ CAMBIO PRINCIPAL EN v2.4.0 ★★★
 * 
 * Ahora el scoring cuenta CUÁNTAS palabras de la búsqueda coinciden con el 
 * nombre del producto, y da más puntos a productos que coinciden con MÁS palabras.
 * 
 * ★★★ NUEVO EN v2.4.1: PRIORIZACIÓN POR POSICIÓN ★★★
 * 
 * Si NO es una búsqueda de referencia, se bonifica que las palabras aparezcan
 * al INICIO del título del producto.
 * 
 * Ejemplo: Búsqueda "interruptor cruzamiento"
 * - "Lámpara con interruptor" = palabras al final = menos puntos
 * - "Interruptor simple cruzamiento" = palabras al inicio = más puntos
 * 
 * Sistema de puntuación:
 * - Boost configurado: +3000
 * - Coincidencia exacta nombre: +2000
 * - Coincidencia exacta referencia: +1900  
 * - Nombre empieza con búsqueda completa: +500
 * - Primera palabra al inicio del título: +200 (solo si no es referencia)
 * - Palabra al inicio del título: +150 por palabra (solo si no es referencia)
 * - Palabra en posición temprana (primeros 25 chars): +80 (solo si no es referencia)
 * - Por CADA palabra en nombre: +200
 * - Por CADA palabra en referencia: +150
 * - TODAS las palabras coinciden: +500 bonus
 * - En stock: +50
 */
function searchProductsNoDuplicates($query, $page, $limit, $filters, $id_lang, $id_shop, $boosted_ids = [])
{
    global $SYNONYMS;

    $db = Db::getInstance();
    $query_escaped = pSQL($query);
    $query_like = dropdownsearchLike($query);

    // Separar palabras y filtrar las muy cortas
    $query_words = dropdownsearchQueryWords($query);
    $num_words = count($query_words);

    // ★★★ EXPANDIR BÚSQUEDA CON SINÓNIMOS ★★★
    $expanded = expandQueryWithSynonyms($query, $SYNONYMS);
    $synonym_map = $expanded['synonym_map'];

    // =========================================
    // CONSTRUIR SISTEMA DE SCORING MEJORADO
    // =========================================

    $scoring_parts = [];

    // 1. BOOST: Productos prioritarios (+3000 puntos)
    if (!empty($boosted_ids)) {
        $boost_ids_str = implode(',', array_map('intval', $boosted_ids));
        $scoring_parts[] = "CASE WHEN p.id_product IN (" . $boost_ids_str . ") THEN 3000 ELSE 0 END";
    }

    // 2. Coincidencia EXACTA completa (máxima prioridad natural)
    $scoring_parts[] = "CASE 
        WHEN LOWER(pl.name) = LOWER('" . $query_escaped . "') THEN 2000
        WHEN LOWER(p.reference) = LOWER('" . $query_escaped . "') THEN 1900
        ELSE 0 
    END";

    // 3. Coincidencia al INICIO del nombre
    $scoring_parts[] = "CASE 
        WHEN LOWER(pl.name) LIKE LOWER('" . $query_like . "%') THEN 500
        WHEN LOWER(p.reference) LIKE LOWER('" . $query_like . "%') THEN 450
        ELSE 0 
    END";

    // 4. ★★★ CLAVE: Contar coincidencias de palabras individuales ★★★
    // Cada palabra que coincide suma puntos (200 por palabra en nombre, 150 en referencia)
    // Esto hace que productos con MÁS palabras coincidentes aparezcan primero
    // ★★★ AHORA INCLUYE SINÓNIMOS ★★★

    $word_match_scores = [];
    foreach ($query_words as $word) {
        // Obtener variaciones morfológicas
        $variations = generateSearchVariations($word);

        // Obtener sinónimos de esta palabra
        $word_synonyms = isset($synonym_map[$word]) ? $synonym_map[$word] : [$word];

        $word_conditions_name = [];
        $word_conditions_ref = [];

        // Condiciones para palabra original y sus variaciones (mayor peso)
        foreach ($variations as $variation) {
            $var_escaped = dropdownsearchLike($variation);
            $word_conditions_name[] = "LOWER(pl.name) LIKE LOWER('%" . $var_escaped . "%')";
            $word_conditions_ref[] = "LOWER(p.reference) LIKE LOWER('%" . $var_escaped . "%')";
        }

        // Suma 200 puntos si la palabra original coincide en el nombre
        $word_match_scores[] = "CASE WHEN (" . implode(' OR ', $word_conditions_name) . ") THEN 200 ELSE 0 END";
        // Suma 150 puntos si coincide en la referencia
        $word_match_scores[] = "CASE WHEN (" . implode(' OR ', $word_conditions_ref) . ") THEN 150 ELSE 0 END";

        // Condiciones para sinónimos (menor peso que palabra original)
        if (count($word_synonyms) > 1) {
            $synonym_conditions_name = [];
            foreach ($word_synonyms as $syn) {
                if (mb_strtolower($syn) !== mb_strtolower($word)) { // Excluir la palabra original
                    $syn_variations = generateSearchVariations($syn);
                    foreach ($syn_variations as $syn_var) {
                        $syn_escaped = dropdownsearchLike($syn_var);
                        $synonym_conditions_name[] = "LOWER(pl.name) LIKE LOWER('%" . $syn_escaped . "%')";
                    }
                }
            }
            if (!empty($synonym_conditions_name)) {
                // Suma 100 puntos si un sinónimo coincide (menos que palabra original)
                $word_match_scores[] = "CASE WHEN (" . implode(' OR ', $synonym_conditions_name) . ") THEN 100 ELSE 0 END";
            }
        }
    }

    // 4b. ★★★ NUEVO: Bonificar posición de palabras al INICIO del título ★★★
    // Si NO es búsqueda de referencia, priorizar que las palabras estén al principio
    // "Interruptor cruzamiento..." aparece antes que "Lámpara con interruptor..."

    $is_reference_search = (count($query_words) == 1) &&
        preg_match('/^[a-zA-Z]*[0-9]+[a-zA-Z0-9]*$/', $query_words[0]);

    if (!$is_reference_search) {
        foreach ($query_words as $index => $word) {
            $variations = generateSearchVariations($word);
            $start_conditions = [];
            $early_conditions = [];

            foreach ($variations as $variation) {
                $var_escaped = dropdownsearchLike($variation);

                // Palabra al INICIO del título (+150 puntos)
                $start_conditions[] = "LOWER(pl.name) LIKE LOWER('" . $var_escaped . "%')";
                $start_conditions[] = "LOWER(pl.name) LIKE LOWER('" . $var_escaped . " %')";

                // Palabra en las primeras posiciones (después de 1-2 palabras iniciales) (+80 puntos)
                // Ej: "Panel LED downlight" - "downlight" está temprano aunque no al inicio
                $early_conditions[] = "LOWER(pl.name) LIKE LOWER('% " . $var_escaped . " %')";
                $early_conditions[] = "LOWER(pl.name) LIKE LOWER('% " . $var_escaped . "')";
            }

            // Bonus mayor si la palabra está al inicio
            $word_match_scores[] = "CASE WHEN (" . implode(' OR ', $start_conditions) . ") THEN 150 ELSE 0 END";

            // Bonus menor si está en posición temprana (entre las primeras palabras)
            // Usamos LOCATE para verificar posición aproximada
            $first_variation = pSQL($variations[0]);
            $word_match_scores[] = "CASE 
                WHEN LOCATE(LOWER('" . $first_variation . "'), LOWER(pl.name)) > 0 
                     AND LOCATE(LOWER('" . $first_variation . "'), LOWER(pl.name)) <= 25 
                THEN 80 
                ELSE 0 
            END";
        }

        // Bonus extra si la PRIMERA palabra de búsqueda está al inicio del título
        // Esto es muy importante: "interruptor X" debe priorizar productos que EMPIECEN con "interruptor"
        if (!empty($query_words)) {
            $first_word = $query_words[0];
            $first_variations = generateSearchVariations($first_word);
            $first_word_start = [];

            foreach ($first_variations as $variation) {
                $var_escaped = dropdownsearchLike($variation);
                $first_word_start[] = "LOWER(pl.name) LIKE LOWER('" . $var_escaped . "%')";
            }

            // +200 puntos extra si el título EMPIEZA con la primera palabra de búsqueda
            $scoring_parts[] = "CASE WHEN (" . implode(' OR ', $first_word_start) . ") THEN 200 ELSE 0 END";
        }
    }

    // 5. BONUS especial si TODAS las palabras coinciden (multiplica relevancia)
    if ($num_words > 1) {
        $all_words_conditions = [];
        foreach ($query_words as $word) {
            $variations = generateSearchVariations($word);
            $var_conditions = [];
            foreach ($variations as $variation) {
                $var_escaped = dropdownsearchLike($variation);
                $var_conditions[] = "LOWER(pl.name) LIKE LOWER('%" . $var_escaped . "%')";
            }
            $all_words_conditions[] = "(" . implode(' OR ', $var_conditions) . ")";
        }

        // Si TODAS las palabras coinciden en el nombre: +500 bonus
        $scoring_parts[] = "CASE WHEN (" . implode(' AND ', $all_words_conditions) . ") THEN 500 ELSE 0 END";
    }

    // 6. Bonus por stock disponible
    $scoring_parts[] = "CASE WHEN sa.quantity > 0 THEN 50 ELSE 0 END";

    // Combinar todos los scores
    $all_scoring = array_merge($scoring_parts, $word_match_scores);
    $total_score_expression = "(" . implode(" + ", $all_scoring) . ")";

    // =========================================
    // CONSTRUIR WHERE CLAUSE (con tolerancia)
    // =========================================

    $where_clause = dropdownsearchQueryWhere($query);

    // =========================================
    // APLICAR FILTROS (sin cambios)
    // =========================================

    $filter_joins = [];
    $filter_conditions = [];

    // Filtro: Solo en stock
    if (isset($filters['in_stock']) && $filters['in_stock']) {
        $filter_conditions[] = "sa.quantity > 0";
    }

    // Filtro: Categorías
    if (isset($filters['categories']) && is_array($filters['categories']) && !empty($filters['categories'])) {
        $cat_ids = array_map('intval', $filters['categories']);
        $filter_joins[] = "INNER JOIN " . _DB_PREFIX_ . "category_product cp ON p.id_product = cp.id_product";
        $filter_conditions[] = "cp.id_category IN (" . implode(',', $cat_ids) . ")";
    }

    // Filtro: Fabricantes
    if (isset($filters['manufacturers']) && is_array($filters['manufacturers']) && !empty($filters['manufacturers'])) {
        $manu_ids = array_map('intval', $filters['manufacturers']);
        $filter_conditions[] = "p.id_manufacturer IN (" . implode(',', $manu_ids) . ")";
    }

    // Filtro: Precio mínimo
    if (isset($filters['price_min']) && is_numeric($filters['price_min'])) {
        $filter_conditions[] = "ps.show_price = 1 AND ps.price >= " . (float) $filters['price_min'];
    }

    // Filtro: Precio máximo
    if (isset($filters['price_max']) && is_numeric($filters['price_max'])) {
        $filter_conditions[] = "ps.show_price = 1 AND ps.price <= " . (float) $filters['price_max'];
    }

    // Filtro: Atributos (por grupo)
    foreach ($filters as $key => $values) {
        if (strpos($key, 'attributes_') === 0 && is_array($values) && !empty($values)) {
            $id_attribute_group = (int) str_replace('attributes_', '', $key);
            $attr_ids = array_map('intval', $values);

            $filter_joins[] = "
                INNER JOIN " . _DB_PREFIX_ . "product_attribute pa_{$id_attribute_group} 
                    ON p.id_product = pa_{$id_attribute_group}.id_product
                INNER JOIN " . _DB_PREFIX_ . "product_attribute_shop pas_{$id_attribute_group}
                    ON (pa_{$id_attribute_group}.id_product_attribute = pas_{$id_attribute_group}.id_product_attribute AND pas_{$id_attribute_group}.id_shop = " . (int) $id_shop . ")
                INNER JOIN " . _DB_PREFIX_ . "product_attribute_combination pac_{$id_attribute_group} 
                    ON pa_{$id_attribute_group}.id_product_attribute = pac_{$id_attribute_group}.id_product_attribute
            ";
            $filter_conditions[] = "pac_{$id_attribute_group}.id_attribute IN (" . implode(',', $attr_ids) . ")";
        }
    }

    // Filtro: Características (features)
    foreach ($filters as $key => $values) {
        if (strpos($key, 'features_') === 0 && is_array($values) && !empty($values)) {
            $id_feature = (int) str_replace('features_', '', $key);
            $feat_ids = array_map('intval', $values);

            $filter_joins[] = "
                INNER JOIN " . _DB_PREFIX_ . "feature_product fp_{$id_feature} 
                    ON p.id_product = fp_{$id_feature}.id_product
            ";
            $filter_conditions[] = "fp_{$id_feature}.id_feature = " . $id_feature;
            $filter_conditions[] = "fp_{$id_feature}.id_feature_value IN (" . implode(',', $feat_ids) . ")";
        }
    }

    $offset = ($page - 1) * $limit;

    // Construir JOINs adicionales de filtros
    $additional_joins = !empty($filter_joins) ? implode(' ', array_unique($filter_joins)) : '';

    // Construir condiciones adicionales de filtros
    $additional_conditions = !empty($filter_conditions) ? ' AND ' . implode(' AND ', $filter_conditions) : '';

    // =========================================
    // CONSULTA PRINCIPAL SIN DUPLICADOS
    // =========================================

    $sql = "
    SELECT 
        p.id_product,
        pl.name,
        pl.description_short,
        p.reference,
        p.id_manufacturer,
        " . $total_score_expression . " AS relevance_score
    FROM " . _DB_PREFIX_ . "product p
    INNER JOIN " . _DB_PREFIX_ . "product_lang pl 
        ON (p.id_product = pl.id_product AND pl.id_lang = " . (int) $id_lang . " AND pl.id_shop = " . (int) $id_shop . ")
    INNER JOIN " . _DB_PREFIX_ . "product_shop ps 
        ON (p.id_product = ps.id_product AND ps.id_shop = " . (int) $id_shop . ")
    LEFT JOIN " . _DB_PREFIX_ . "stock_available sa 
        ON (p.id_product = sa.id_product AND sa.id_product_attribute = 0 " . StockAvailable::addSqlShopRestriction(null, (int) $id_shop, 'sa') . ")
    " . $additional_joins . "
    WHERE " . dropdownsearchCatalogScope($id_shop) . "
        AND (" . $where_clause . ")
        " . $additional_conditions . "
    GROUP BY p.id_product, pl.name, pl.description_short, p.reference, p.id_manufacturer, sa.quantity
    HAVING relevance_score > 0
    ORDER BY relevance_score DESC, sa.quantity DESC, pl.name ASC, p.id_product ASC
    LIMIT " . (int) $limit . " OFFSET " . (int) $offset;

    // Consulta para contar SOLO productos únicos
    $count_sql = "
    SELECT COUNT(DISTINCT p.id_product) as total
    FROM " . _DB_PREFIX_ . "product p
    INNER JOIN " . _DB_PREFIX_ . "product_lang pl 
        ON (p.id_product = pl.id_product AND pl.id_lang = " . (int) $id_lang . " AND pl.id_shop = " . (int) $id_shop . ")
    INNER JOIN " . _DB_PREFIX_ . "product_shop ps 
        ON (p.id_product = ps.id_product AND ps.id_shop = " . (int) $id_shop . ")
    LEFT JOIN " . _DB_PREFIX_ . "stock_available sa 
        ON (p.id_product = sa.id_product AND sa.id_product_attribute = 0 " . StockAvailable::addSqlShopRestriction(null, (int) $id_shop, 'sa') . ")
    " . $additional_joins . "
    WHERE " . dropdownsearchCatalogScope($id_shop) . "
        AND (" . $where_clause . ")
        " . $additional_conditions;

    $total_result = $db->executeS($count_sql);
    if ($total_result === false) {
        throw new RuntimeException('Search count failed.');
    }
    $total = (int) $total_result[0]['total'];

    $products = $db->executeS($sql);
    if ($products === false) {
        throw new RuntimeException('Search failed.');
    }

    return [
        'products' => $products ? $products : [],
        'total' => $total,
        'page' => $page,
        'limit' => $limit
    ];
}

/**
 * ========================================================================
 * OBTENER FILTROS DISPONIBLES (con tolerancia)
 * ========================================================================
 */
function getAvailableFilters($query, $active_filters, $id_lang, $id_shop)
{
    $filters = [];

    $base_where = dropdownsearchQueryWhere($query);

    // 1. CATEGORÍAS disponibles
    $categories = getCategoriesFilter($base_where, $id_lang, $id_shop);
    if (!empty($categories)) {
        $filters['categories'] = $categories;
    }

    // 2. FABRICANTES disponibles
    $manufacturers = getManufacturersFilter($base_where, $id_lang, $id_shop);
    if (!empty($manufacturers)) {
        $filters['manufacturers'] = $manufacturers;
    }

    // 3. RANGO DE PRECIOS
    $price_range = dropdownsearchCanShowPrices() ? getPriceRangeFilter($base_where, $id_lang, $id_shop) : null;
    if (dropdownsearchCanShowPrices() && $price_range) {
        $filters['price_range'] = $price_range;
    }

    // 4. ATRIBUTOS (talla, color, etc.) disponibles
    $attributes = getAttributesFilter($base_where, $id_lang, $id_shop);
    if (!empty($attributes)) {
        $filters['attributes'] = $attributes;
    }

    // 5. CARACTERÍSTICAS disponibles
    $features = getFeaturesFilter($base_where, $id_lang, $id_shop);
    if (!empty($features)) {
        $filters['features'] = $features;
    }

    return $filters;
}

/**
 * Obtener categorías disponibles en resultados
 */
function getCategoriesFilter($base_where, $id_lang, $id_shop)
{
    $db = Db::getInstance();

    $sql = "
    SELECT DISTINCT 
        c.id_category,
        cl.name,
        COUNT(DISTINCT p.id_product) as product_count
    FROM " . _DB_PREFIX_ . "product p
    INNER JOIN " . _DB_PREFIX_ . "product_lang pl 
        ON (p.id_product = pl.id_product AND pl.id_lang = " . (int) $id_lang . " AND pl.id_shop = " . (int) $id_shop . ")
    INNER JOIN " . _DB_PREFIX_ . "product_shop ps 
        ON (p.id_product = ps.id_product AND ps.id_shop = " . (int) $id_shop . ")
    INNER JOIN " . _DB_PREFIX_ . "category_product cp ON p.id_product = cp.id_product
    INNER JOIN " . _DB_PREFIX_ . "category c ON cp.id_category = c.id_category
    INNER JOIN " . _DB_PREFIX_ . "category_shop cs ON (c.id_category = cs.id_category AND cs.id_shop = " . (int) $id_shop . ")
    INNER JOIN " . _DB_PREFIX_ . "category_lang cl ON (c.id_category = cl.id_category AND cl.id_lang = " . (int) $id_lang . " AND cl.id_shop = " . (int) $id_shop . ")
    WHERE " . dropdownsearchCatalogScope($id_shop) . "
        AND c.active = 1
        AND " . dropdownsearchCategoryAccess('c') . "
        AND (" . $base_where . ")
    GROUP BY c.id_category, cl.name
    HAVING product_count > 0
    ORDER BY cl.name ASC
    LIMIT 50";

    $results = $db->executeS($sql);

    if (!$results) {
        return [];
    }

    $categories = [];
    foreach ($results as $row) {
        $categories[] = [
            'id_category' => (int) $row['id_category'],
            'name' => $row['name'],
            'product_count' => (int) $row['product_count']
        ];
    }

    return $categories;
}

/**
 * Obtener fabricantes disponibles en resultados
 */
function getManufacturersFilter($base_where, $id_lang, $id_shop)
{
    $db = Db::getInstance();

    $sql = "
    SELECT DISTINCT 
        m.id_manufacturer,
        m.name,
        COUNT(DISTINCT p.id_product) as product_count
    FROM " . _DB_PREFIX_ . "product p
    INNER JOIN " . _DB_PREFIX_ . "product_lang pl 
        ON (p.id_product = pl.id_product AND pl.id_lang = " . (int) $id_lang . " AND pl.id_shop = " . (int) $id_shop . ")
    INNER JOIN " . _DB_PREFIX_ . "product_shop ps 
        ON (p.id_product = ps.id_product AND ps.id_shop = " . (int) $id_shop . ")
    INNER JOIN " . _DB_PREFIX_ . "manufacturer m ON p.id_manufacturer = m.id_manufacturer
    WHERE " . dropdownsearchCatalogScope($id_shop) . "
        AND m.active = 1
        AND p.id_manufacturer > 0
        AND (" . $base_where . ")
    GROUP BY m.id_manufacturer, m.name
    HAVING product_count > 0
    ORDER BY m.name ASC
    LIMIT 50";

    $results = $db->executeS($sql);

    if (!$results) {
        return [];
    }

    $manufacturers = [];
    foreach ($results as $row) {
        $manufacturers[] = [
            'id_manufacturer' => (int) $row['id_manufacturer'],
            'name' => $row['name'],
            'product_count' => (int) $row['product_count']
        ];
    }

    return $manufacturers;
}

/**
 * Obtener rango de precios de resultados
 */
function getPriceRangeFilter($base_where, $id_lang, $id_shop)
{
    if (!dropdownsearchCanShowPrices()) {
        return null;
    }
    $db = Db::getInstance();

    $sql = "
    SELECT 
        MIN(ps.price) as min_price,
        MAX(ps.price) as max_price
    FROM " . _DB_PREFIX_ . "product p
    INNER JOIN " . _DB_PREFIX_ . "product_lang pl 
        ON (p.id_product = pl.id_product AND pl.id_lang = " . (int) $id_lang . " AND pl.id_shop = " . (int) $id_shop . ")
    INNER JOIN " . _DB_PREFIX_ . "product_shop ps 
        ON (p.id_product = ps.id_product AND ps.id_shop = " . (int) $id_shop . ")
    WHERE " . dropdownsearchCatalogScope($id_shop) . "
        AND ps.show_price = 1
        AND (" . $base_where . ")";

    $result = $db->getRow($sql);

    if (!$result || !isset($result['min_price'])) {
        return null;
    }

    return [
        'min_price' => (float) $result['min_price'],
        'max_price' => (float) $result['max_price']
    ];
}

/**
 * Obtener atributos disponibles (talla, color, etc.)
 */
function getAttributesFilter($base_where, $id_lang, $id_shop)
{
    $db = Db::getInstance();

    $sql = "
    SELECT DISTINCT
        ag.id_attribute_group,
        agl.name as group_name,
        a.id_attribute,
        al.name as attribute_name,
        a.color,
        COUNT(DISTINCT p.id_product) as product_count
    FROM " . _DB_PREFIX_ . "product p
    INNER JOIN " . _DB_PREFIX_ . "product_lang pl 
        ON (p.id_product = pl.id_product AND pl.id_lang = " . (int) $id_lang . " AND pl.id_shop = " . (int) $id_shop . ")
    INNER JOIN " . _DB_PREFIX_ . "product_shop ps 
        ON (p.id_product = ps.id_product AND ps.id_shop = " . (int) $id_shop . ")
    INNER JOIN " . _DB_PREFIX_ . "product_attribute pa ON p.id_product = pa.id_product
    INNER JOIN " . _DB_PREFIX_ . "product_attribute_shop pas ON (pa.id_product_attribute = pas.id_product_attribute AND pas.id_shop = " . (int) $id_shop . ")
    INNER JOIN " . _DB_PREFIX_ . "product_attribute_combination pac ON pa.id_product_attribute = pac.id_product_attribute
    INNER JOIN " . _DB_PREFIX_ . "attribute a ON pac.id_attribute = a.id_attribute
    INNER JOIN " . _DB_PREFIX_ . "attribute_lang al ON (a.id_attribute = al.id_attribute AND al.id_lang = " . (int) $id_lang . ")
    INNER JOIN " . _DB_PREFIX_ . "attribute_group ag ON a.id_attribute_group = ag.id_attribute_group
    INNER JOIN " . _DB_PREFIX_ . "attribute_group_lang agl ON (ag.id_attribute_group = agl.id_attribute_group AND agl.id_lang = " . (int) $id_lang . ")
    WHERE " . dropdownsearchCatalogScope($id_shop) . "
        AND (" . $base_where . ")
    GROUP BY ag.id_attribute_group, agl.name, a.id_attribute, al.name, a.color
    HAVING product_count > 0
    ORDER BY agl.name, al.name
    LIMIT 200";

    $results = $db->executeS($sql);

    if (!$results) {
        return [];
    }

    // Agrupar por attribute_group
    $grouped = [];
    foreach ($results as $row) {
        $id_group = (int) $row['id_attribute_group'];

        if (!isset($grouped[$id_group])) {
            $grouped[$id_group] = [
                'id_attribute_group' => $id_group,
                'name' => $row['group_name'],
                'attributes' => []
            ];
        }

        $grouped[$id_group]['attributes'][] = [
            'id_attribute' => (int) $row['id_attribute'],
            'name' => $row['attribute_name'],
            'color' => $row['color'],
            'product_count' => (int) $row['product_count']
        ];
    }

    return array_values($grouped);
}

/**
 * Obtener características disponibles
 */
function getFeaturesFilter($base_where, $id_lang, $id_shop)
{
    $db = Db::getInstance();

    $sql = "
    SELECT DISTINCT
        f.id_feature,
        fl.name as feature_name,
        fv.id_feature_value,
        fvl.value as feature_value,
        COUNT(DISTINCT p.id_product) as product_count
    FROM " . _DB_PREFIX_ . "product p
    INNER JOIN " . _DB_PREFIX_ . "product_lang pl 
        ON (p.id_product = pl.id_product AND pl.id_lang = " . (int) $id_lang . " AND pl.id_shop = " . (int) $id_shop . ")
    INNER JOIN " . _DB_PREFIX_ . "product_shop ps 
        ON (p.id_product = ps.id_product AND ps.id_shop = " . (int) $id_shop . ")
    INNER JOIN " . _DB_PREFIX_ . "feature_product fp ON p.id_product = fp.id_product
    INNER JOIN " . _DB_PREFIX_ . "feature f ON fp.id_feature = f.id_feature
    INNER JOIN " . _DB_PREFIX_ . "feature_lang fl ON (f.id_feature = fl.id_feature AND fl.id_lang = " . (int) $id_lang . ")
    INNER JOIN " . _DB_PREFIX_ . "feature_value fv ON fp.id_feature_value = fv.id_feature_value
    INNER JOIN " . _DB_PREFIX_ . "feature_value_lang fvl ON (fv.id_feature_value = fvl.id_feature_value AND fvl.id_lang = " . (int) $id_lang . ")
    WHERE " . dropdownsearchCatalogScope($id_shop) . "
        AND (" . $base_where . ")
    GROUP BY f.id_feature, fl.name, fv.id_feature_value, fvl.value
    HAVING product_count > 0
    ORDER BY fl.name, fvl.value
    LIMIT 200";

    $results = $db->executeS($sql);

    if (!$results) {
        return [];
    }

    // Agrupar por feature
    $grouped = [];
    foreach ($results as $row) {
        $id_feature = (int) $row['id_feature'];

        if (!isset($grouped[$id_feature])) {
            $grouped[$id_feature] = [
                'id_feature' => $id_feature,
                'name' => $row['feature_name'],
                'values' => []
            ];
        }

        $grouped[$id_feature]['values'][] = [
            'id_feature_value' => (int) $row['id_feature_value'],
            'value' => $row['feature_value'],
            'product_count' => (int) $row['product_count']
        ];
    }

    return array_values($grouped);
}

/**
 * ========================================================================
 * FUNCIONES AUXILIARES
 * ========================================================================
 */

/**
 * Obtener imagen principal del producto
 */
function getProductMainImageSimple($product)
{
    try {
        $context = Context::getContext();
        $id_image = Product::getCover((int) $product->id);

        if ($id_image) {
            $link = $context->link;
            return $link->getImageLink(
                $product->link_rewrite,
                (int) $product->id . '-' . (int) $id_image['id_image'],
                'medium_default'
            );
        }

        return $context->shop->getBaseURL() . 'img/p/' . $context->language->iso_code . '-default-medium_default.jpg';

    } catch (Throwable $e) {
        error_log("Error getting product image: " . $e->getMessage());
        return '';
    }
}

/**
 * Formatear precio del producto
 */
function getFormattedPriceSimple($product, $context)
{
    try {
        $price = Product::getPriceStatic(
            (int) $product->id,
            true,
            null,
            6,
            null,
            false,
            true,
            1
        );
        return Tools::displayPrice($price, $context->currency);
    } catch (Throwable $e) {
        error_log("Error getting product price: " . $e->getMessage());
        return null;
    }
}
