<?php


if (!defined('_PS_VERSION_')) {
    exit;
}

if (!function_exists('dropdownsearchDefaultBoostRulesText')) {
    function dropdownsearchDefaultBoostRulesText()
    {
        return implode("\n", [
            'lámpara=1062,1063,1064,1050,1065',
            'portalámparas=728,624,797,581,978',
        ]);
    }
}

if (!function_exists('dropdownsearchDefaultSynonymsText')) {
    function dropdownsearchDefaultSynonymsText()
    {
        return implode("\n", [
            'casquillo, portalámparas, socket, soporte bombilla, porta lámpara, portabombillas, porta lámparas',
            'blanco, white',
            'negro, black',
            'gris, grey, gray',
        ]);
    }
}

if (!function_exists('dropdownsearchGetConfigurationText')) {
    function dropdownsearchGetConfigurationText($key, $default)
    {
        $value = Configuration::get($key);

        return ($value === false || $value === null) ? $default : (string) $value;
    }
}

if (!function_exists('dropdownsearchIsConfigComment')) {
    function dropdownsearchIsConfigComment($line)
    {
        return strpos($line, '#') === 0 || strpos($line, '//') === 0;
    }
}

if (!function_exists('dropdownsearchParseBoostRulesText')) {
    function dropdownsearchParseBoostRulesText($raw, &$errors = [])
    {
        $rules = [];
        $errors = [];
        $lines = preg_split('/\r\n|\r|\n/', (string) $raw);

        foreach ($lines as $index => $line) {
            $line = trim($line);
            if ($line === '' || dropdownsearchIsConfigComment($line)) {
                continue;
            }

            if (strpos($line, '=') === false) {
                $errors[] = 'Línea ' . ($index + 1) . ': falta "=" en la regla de boost.';
                continue;
            }

            list($term, $idsText) = explode('=', $line, 2);
            $term = trim($term);
            $idsText = trim($idsText);

            if ($term === '') {
                $errors[] = 'Línea ' . ($index + 1) . ': el término de boost está vacío.';
                continue;
            }

            $ids = [];
            foreach (preg_split('/[,\s]+/', $idsText) as $id) {
                $id = trim($id);
                if ($id === '') {
                    continue;
                }
                if (!ctype_digit($id) || (int) $id <= 0) {
                    $errors[] = 'Línea ' . ($index + 1) . ': "' . $id . '" no es un ID de producto válido.';
                    continue;
                }
                $ids[] = (int) $id;
            }

            $ids = array_values(array_unique($ids));
            if (empty($ids)) {
                $errors[] = 'Línea ' . ($index + 1) . ': la regla no tiene IDs de producto válidos.';
                continue;
            }

            $rules[$term] = $ids;
        }

        return $rules;
    }
}

if (!function_exists('dropdownsearchParseSynonymsText')) {
    function dropdownsearchParseSynonymsText($raw, &$errors = [])
    {
        $groups = [];
        $errors = [];
        $lines = preg_split('/\r\n|\r|\n/', (string) $raw);

        foreach ($lines as $index => $line) {
            $line = trim($line);
            if ($line === '' || dropdownsearchIsConfigComment($line)) {
                continue;
            }

            $terms = array_values(array_unique(array_filter(array_map('trim', explode(',', $line)), function ($term) {
                return $term !== '';
            })));

            if (count($terms) < 2) {
                $errors[] = 'Línea ' . ($index + 1) . ': cada grupo de sinónimos debe tener al menos dos términos separados por coma.';
                continue;
            }

            $groups[] = $terms;
        }

        return $groups;
    }
}
