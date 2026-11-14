<?php
/**
 * Módulo de Búsqueda Desplegable para PrestaShop 1.7
 * Con sistema de filtros avanzado, URLs compartibles y traducciones multiidioma
 * 
 * @author Luis C
 * @version 2.3.0
 */

if (!defined('_PS_VERSION_')) {
    exit;
}

require_once dirname(__FILE__) . '/config-defaults.php';

class DropdownSearch extends Module
{
    const CONFIG_TRIGGER_SELECTOR = 'DROPDOWNSEARCH_TRIGGER_SELECTOR';
    const CONFIG_TYPING_DELAY = 'DROPDOWNSEARCH_TYPING_DELAY';
    const CONFIG_MIN_QUERY_LENGTH = 'DROPDOWNSEARCH_MIN_QUERY_LENGTH';
    const CONFIG_PAGE_LIMIT = 'DROPDOWNSEARCH_PAGE_LIMIT';
    const CONFIG_MATCH_MODE = 'DROPDOWNSEARCH_MATCH_MODE';
    const CONFIG_BOOST_RULES = 'DROPDOWNSEARCH_BOOST_RULES';
    const CONFIG_SYNONYMS = 'DROPDOWNSEARCH_SYNONYMS';
    const CONFIG_LAYOUT_MODE = 'DROPDOWNSEARCH_LAYOUT_MODE';
    const CONFIG_DROPDOWN_WIDTH = 'DROPDOWNSEARCH_DROPDOWN_WIDTH';
    const CONFIG_COLOR_PRIMARY = 'DROPDOWNSEARCH_COLOR_PRIMARY';
    const CONFIG_COLOR_LINK = 'DROPDOWNSEARCH_COLOR_LINK';
    const CONFIG_COLOR_SECONDARY = 'DROPDOWNSEARCH_COLOR_SECONDARY';
    const CONFIG_COLOR_PRICE = 'DROPDOWNSEARCH_COLOR_PRICE';
    const DEFAULT_TRIGGER_SELECTOR = '#search-icon';
    const DEFAULT_TYPING_DELAY = 300;
    const DEFAULT_MIN_QUERY_LENGTH = 2;
    const DEFAULT_PAGE_LIMIT = 20;
    const DEFAULT_MATCH_MODE = 'balanced';
    const DEFAULT_LAYOUT_MODE = 'fullscreen';
    const DEFAULT_DROPDOWN_WIDTH = 'popup';
    const DEFAULT_COLOR_PRIMARY = '#007cba';
    const DEFAULT_COLOR_LINK = '#007bff';
    const DEFAULT_COLOR_SECONDARY = '#f8f9fa';
    const DEFAULT_COLOR_PRICE = '#e74c3c';

    public function __construct()
    {
        $this->name = 'dropdownsearch';
        $this->tab = 'search_filter';
        $this->version = '2.3.1';
        $this->author = 'Luis C';
        $this->need_instance = 0;

        parent::__construct();

        $this->displayName = $this->l('Búsqueda Desplegable Avanzada');
        $this->description = $this->l('Módulo de búsqueda con despliegue dinámico, filtros avanzados, URLs compartibles y traducciones');
        $this->confirmUninstall = $this->l('¿Estás seguro de que quieres desinstalar este módulo?');

        $this->ps_versions_compliancy = array('min' => '1.7', 'max' => _PS_VERSION_);
    }

    public function install()
    {
        return parent::install() &&
            Configuration::updateValue(self::CONFIG_TRIGGER_SELECTOR, self::DEFAULT_TRIGGER_SELECTOR) &&
            Configuration::updateValue(self::CONFIG_TYPING_DELAY, self::DEFAULT_TYPING_DELAY) &&
            Configuration::updateValue(self::CONFIG_MIN_QUERY_LENGTH, self::DEFAULT_MIN_QUERY_LENGTH) &&
            Configuration::updateValue(self::CONFIG_PAGE_LIMIT, self::DEFAULT_PAGE_LIMIT) &&
            Configuration::updateValue(self::CONFIG_MATCH_MODE, self::DEFAULT_MATCH_MODE) &&
            Configuration::updateValue(self::CONFIG_BOOST_RULES, dropdownsearchDefaultBoostRulesText(), false) &&
            Configuration::updateValue(self::CONFIG_SYNONYMS, dropdownsearchDefaultSynonymsText(), false) &&
            Configuration::updateValue(self::CONFIG_LAYOUT_MODE, self::DEFAULT_LAYOUT_MODE) &&
            Configuration::updateValue(self::CONFIG_DROPDOWN_WIDTH, self::DEFAULT_DROPDOWN_WIDTH) &&
            Configuration::updateValue(self::CONFIG_COLOR_PRIMARY, self::DEFAULT_COLOR_PRIMARY) &&
            Configuration::updateValue(self::CONFIG_COLOR_LINK, self::DEFAULT_COLOR_LINK) &&
            Configuration::updateValue(self::CONFIG_COLOR_SECONDARY, self::DEFAULT_COLOR_SECONDARY) &&
            Configuration::updateValue(self::CONFIG_COLOR_PRICE, self::DEFAULT_COLOR_PRICE) &&
            $this->registerHook('displayHeader') &&
            $this->registerHook('displayBeforeBodyClosingTag');
    }

    public function uninstall()
    {
        return Configuration::deleteByName(self::CONFIG_TRIGGER_SELECTOR) &&
            Configuration::deleteByName(self::CONFIG_TYPING_DELAY) &&
            Configuration::deleteByName(self::CONFIG_MIN_QUERY_LENGTH) &&
            Configuration::deleteByName(self::CONFIG_PAGE_LIMIT) &&
            Configuration::deleteByName(self::CONFIG_MATCH_MODE) &&
            Configuration::deleteByName(self::CONFIG_BOOST_RULES) &&
            Configuration::deleteByName(self::CONFIG_SYNONYMS) &&
            Configuration::deleteByName(self::CONFIG_LAYOUT_MODE) &&
            Configuration::deleteByName(self::CONFIG_DROPDOWN_WIDTH) &&
            Configuration::deleteByName(self::CONFIG_COLOR_PRIMARY) &&
            Configuration::deleteByName(self::CONFIG_COLOR_LINK) &&
            Configuration::deleteByName(self::CONFIG_COLOR_SECONDARY) &&
            Configuration::deleteByName(self::CONFIG_COLOR_PRICE) &&
            parent::uninstall();
    }

    /**
     * Hook para añadir CSS y JS en el header
     */
    public function hookDisplayHeader()
    {
        Media::addJsDef([
            'dropdownsearchConfig' => [
                'triggerSelector' => $this->getTriggerSelector(),
                'typingDelay' => $this->getTypingDelay(),
                'minQueryLength' => $this->getMinQueryLength(),
                'pageLimit' => $this->getPageLimit(),
                'layoutMode' => $this->getLayoutMode(),
                'dropdownWidth' => $this->getDropdownWidth(),
            ],
        ]);

        // CSS principal
        $this->context->controller->registerStylesheet(
            'module-dropdownsearch-css',
            'modules/dropdownsearch/views/css/dropdownsearch.css',
            ['media' => 'all', 'priority' => 200]
        );

        // CSS para filtros
        $this->context->controller->registerStylesheet(
            'module-dropdownsearch-filters-css',
            'modules/dropdownsearch/views/css/search-filters.css',
            ['media' => 'all', 'priority' => 201]
        );

        // CSS para sistema de hash
        $this->context->controller->registerStylesheet(
            'module-dropdownsearch-hash-css',
            'modules/dropdownsearch/views/css/search-hash-system.css',
            ['media' => 'all', 'priority' => 202]
        );

        // JavaScript de traducciones (PRIMERO - debe cargarse antes que el resto)
        $this->context->controller->registerJavascript(
            'module-dropdownsearch-translations',
            'modules/dropdownsearch/views/js/search-translations.js',
            ['position' => 'bottom', 'priority' => 199]
        );

        $this->context->controller->registerJavascript(
            'module-dropdownsearch-security',
            'modules/dropdownsearch/views/js/search-security.js',
            ['position' => 'bottom', 'priority' => 198]
        );

        // JavaScript principal
        $this->context->controller->registerJavascript(
            'module-dropdownsearch-js',
            'modules/dropdownsearch/views/js/dropdownsearch-simple.js',
            ['position' => 'bottom', 'priority' => 200]
        );

        // JavaScript para filtros
        $this->context->controller->registerJavascript(
            'module-dropdownsearch-filters-js',
            'modules/dropdownsearch/views/js/search-filters.js',
            ['position' => 'bottom', 'priority' => 201]
        );

        // JavaScript para sistema de hash
        $this->context->controller->registerJavascript(
            'module-dropdownsearch-hash-js',
            'modules/dropdownsearch/views/js/search-hash-system.js',
            ['position' => 'bottom', 'priority' => 202]
        );
    }

    /**
     * Hook para mostrar el contenedor de búsqueda
     */
    public function hookDisplayBeforeBodyClosingTag()
    {
        $this->context->smarty->assign([
            'dropdownsearch_layout_class' => 'dropdown-search-overlay--' . $this->getLayoutMode() . ' dropdown-search-overlay--' . $this->getDropdownWidth(),
            'dropdownsearch_style' => $this->getCssVariablesStyle(),
        ]);

        return $this->display(__FILE__, 'views/templates/hook/search-container.tpl');
    }

    /**
     * Procesa las peticiones AJAX de búsqueda
     */
    public function getContent()
    {
        $output = '';

        if (Tools::isSubmit('ajax')) {
            $this->processAjaxSearch();
        }

        if (Tools::isSubmit('submitDropdownSearch')) {
            $output .= $this->processConfiguration();
        }

        $output .= $this->displayForm();
        return $output;
    }

    /**
     * Guarda la configuración del módulo.
     */
    private function processConfiguration()
    {
        $token = Tools::getValue('token');
        if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST' || !is_string($token)
            || !hash_equals(Tools::getAdminTokenLite('AdminModules'), $token)) {
            return $this->displayError($this->l('Solicitud de configuración no válida.'));
        }

        $selector = trim((string) Tools::getValue(self::CONFIG_TRIGGER_SELECTOR));
        $typingDelay = (int) Tools::getValue(self::CONFIG_TYPING_DELAY);
        $minQueryLength = (int) Tools::getValue(self::CONFIG_MIN_QUERY_LENGTH);
        $pageLimit = (int) Tools::getValue(self::CONFIG_PAGE_LIMIT);
        $matchMode = trim((string) Tools::getValue(self::CONFIG_MATCH_MODE));
        $boostRules = $this->buildBoostRulesTextFromRequest();
        $synonyms = $this->buildSynonymsTextFromRequest();
        $layoutMode = trim((string) Tools::getValue(self::CONFIG_LAYOUT_MODE));
        $dropdownWidth = trim((string) Tools::getValue(self::CONFIG_DROPDOWN_WIDTH));
        $colorPrimary = trim((string) Tools::getValue(self::CONFIG_COLOR_PRIMARY));
        $colorLink = trim((string) Tools::getValue(self::CONFIG_COLOR_LINK));
        $colorSecondary = trim((string) Tools::getValue(self::CONFIG_COLOR_SECONDARY));
        $colorPrice = trim((string) Tools::getValue(self::CONFIG_COLOR_PRICE));

        if ($selector === '') {
            return $this->displayError($this->l('El selector CSS no puede estar vacío.'));
        }

        if ($typingDelay < 0 || $typingDelay > 3000) {
            return $this->displayError($this->l('El delay de escritura debe estar entre 0 y 3000 ms.'));
        }

        if ($minQueryLength < 1 || $minQueryLength > 10) {
            return $this->displayError($this->l('La longitud mínima debe estar entre 1 y 10 caracteres.'));
        }

        if ($pageLimit < 1 || $pageLimit > 100) {
            return $this->displayError($this->l('El límite de productos por página debe estar entre 1 y 100.'));
        }

        if (!in_array($matchMode, ['strict', 'balanced', 'broad'], true)) {
            return $this->displayError($this->l('El modo de coincidencia no es válido.'));
        }

        $boostErrors = [];
        dropdownsearchParseBoostRulesText($boostRules, $boostErrors);
        if (!empty($boostErrors)) {
            return $this->displayError($this->l('Hay errores en las reglas de boost:') . '<br>' . implode('<br>', array_map('htmlspecialchars', $boostErrors)));
        }

        $synonymErrors = [];
        dropdownsearchParseSynonymsText($synonyms, $synonymErrors);
        if (!empty($synonymErrors)) {
            return $this->displayError($this->l('Hay errores en los sinónimos:') . '<br>' . implode('<br>', array_map('htmlspecialchars', $synonymErrors)));
        }

        if (!in_array($layoutMode, ['fullscreen', 'below_input'], true)) {
            return $this->displayError($this->l('El formato de visualización no es válido.'));
        }

        if (!in_array($dropdownWidth, ['full_width', 'popup'], true)) {
            return $this->displayError($this->l('El ancho del buscador no es válido.'));
        }

        foreach ([$colorPrimary, $colorLink, $colorSecondary, $colorPrice] as $color) {
            if (!$this->isHexColor($color)) {
                return $this->displayError($this->l('Los colores deben tener formato hexadecimal. Ejemplo: #007cba.'));
            }
        }

        Configuration::updateValue(self::CONFIG_TRIGGER_SELECTOR, $selector);
        Configuration::updateValue(self::CONFIG_TYPING_DELAY, $typingDelay);
        Configuration::updateValue(self::CONFIG_MIN_QUERY_LENGTH, $minQueryLength);
        Configuration::updateValue(self::CONFIG_PAGE_LIMIT, $pageLimit);
        Configuration::updateValue(self::CONFIG_MATCH_MODE, $matchMode);
        Configuration::updateValue(self::CONFIG_BOOST_RULES, $boostRules, false);
        Configuration::updateValue(self::CONFIG_SYNONYMS, $synonyms, false);
        Configuration::updateValue(self::CONFIG_LAYOUT_MODE, $layoutMode);
        Configuration::updateValue(self::CONFIG_DROPDOWN_WIDTH, $dropdownWidth);
        Configuration::updateValue(self::CONFIG_COLOR_PRIMARY, $colorPrimary);
        Configuration::updateValue(self::CONFIG_COLOR_LINK, $colorLink);
        Configuration::updateValue(self::CONFIG_COLOR_SECONDARY, $colorSecondary);
        Configuration::updateValue(self::CONFIG_COLOR_PRICE, $colorPrice);

        return $this->displayConfirmation($this->l('Configuración actualizada correctamente.'));
    }

    /**
     * Devuelve el selector CSS que abre el buscador.
     */
    private function getTriggerSelector()
    {
        $selector = trim((string) Configuration::get(self::CONFIG_TRIGGER_SELECTOR));

        return $selector !== '' ? $selector : self::DEFAULT_TRIGGER_SELECTOR;
    }

    private function getTypingDelay()
    {
        $value = Configuration::get(self::CONFIG_TYPING_DELAY);
        if ($value === false || $value === null || $value === '') {
            return self::DEFAULT_TYPING_DELAY;
        }

        $delay = (int) $value;

        return $delay >= 0 ? $delay : self::DEFAULT_TYPING_DELAY;
    }

    private function getMinQueryLength()
    {
        $value = Configuration::get(self::CONFIG_MIN_QUERY_LENGTH);
        if ($value === false || $value === null || $value === '') {
            return self::DEFAULT_MIN_QUERY_LENGTH;
        }

        $length = (int) $value;

        return $length > 0 ? $length : self::DEFAULT_MIN_QUERY_LENGTH;
    }

    private function getPageLimit()
    {
        $value = Configuration::get(self::CONFIG_PAGE_LIMIT);
        if ($value === false || $value === null || $value === '') {
            return self::DEFAULT_PAGE_LIMIT;
        }

        $limit = (int) $value;

        return $limit > 0 ? $limit : self::DEFAULT_PAGE_LIMIT;
    }

    private function getMatchMode()
    {
        $mode = Configuration::get(self::CONFIG_MATCH_MODE);

        return in_array($mode, ['strict', 'balanced', 'broad'], true) ? $mode : self::DEFAULT_MATCH_MODE;
    }

    private function getBoostRulesText()
    {
        return dropdownsearchGetConfigurationText(self::CONFIG_BOOST_RULES, dropdownsearchDefaultBoostRulesText());
    }

    private function getSynonymsText()
    {
        return dropdownsearchGetConfigurationText(self::CONFIG_SYNONYMS, dropdownsearchDefaultSynonymsText());
    }

    private function getLayoutMode()
    {
        $mode = Configuration::get(self::CONFIG_LAYOUT_MODE);

        return in_array($mode, ['fullscreen', 'below_input'], true) ? $mode : self::DEFAULT_LAYOUT_MODE;
    }

    private function getDropdownWidth()
    {
        $width = Configuration::get(self::CONFIG_DROPDOWN_WIDTH);

        return in_array($width, ['full_width', 'popup'], true) ? $width : self::DEFAULT_DROPDOWN_WIDTH;
    }

    private function getColorValue($key, $default)
    {
        $color = trim((string) Configuration::get($key));

        return $this->isHexColor($color) ? $color : $default;
    }

    private function isHexColor($color)
    {
        return (bool) preg_match('/^#[0-9a-fA-F]{6}$/', (string) $color);
    }

    private function getCssVariablesStyle()
    {
        $variables = [
            '--dropdownsearch-primary' => $this->getColorValue(self::CONFIG_COLOR_PRIMARY, self::DEFAULT_COLOR_PRIMARY),
            '--dropdownsearch-link' => $this->getColorValue(self::CONFIG_COLOR_LINK, self::DEFAULT_COLOR_LINK),
            '--dropdownsearch-secondary' => $this->getColorValue(self::CONFIG_COLOR_SECONDARY, self::DEFAULT_COLOR_SECONDARY),
            '--dropdownsearch-price' => $this->getColorValue(self::CONFIG_COLOR_PRICE, self::DEFAULT_COLOR_PRICE),
        ];

        $style = [];
        foreach ($variables as $name => $value) {
            $style[] = $name . ':' . $value;
        }

        return implode(';', $style);
    }

    private function buildBoostRulesTextFromRequest()
    {
        $terms = Tools::getValue('DROPDOWNSEARCH_BOOST_TERM');
        $idsRows = Tools::getValue('DROPDOWNSEARCH_BOOST_IDS');

        if (!is_array($terms) || !is_array($idsRows)) {
            return (string) Tools::getValue(self::CONFIG_BOOST_RULES);
        }

        $lines = [];
        $max = max(count($terms), count($idsRows));

        for ($i = 0; $i < $max; $i++) {
            $term = isset($terms[$i]) ? trim((string) $terms[$i]) : '';
            $idsText = isset($idsRows[$i]) ? trim((string) $idsRows[$i]) : '';

            if ($term === '' && $idsText === '') {
                continue;
            }

            $ids = array_values(array_filter(array_map('trim', preg_split('/[,\s]+/', $idsText)), function ($id) {
                return $id !== '';
            }));

            $lines[] = $term . '=' . implode(',', $ids);
        }

        return implode("\n", $lines);
    }

    private function buildSynonymsTextFromRequest()
    {
        $terms = Tools::getValue('DROPDOWNSEARCH_SYNONYM_TERM');
        $synonymRows = Tools::getValue('DROPDOWNSEARCH_SYNONYM_VALUES');

        if (!is_array($terms) || !is_array($synonymRows)) {
            return (string) Tools::getValue(self::CONFIG_SYNONYMS);
        }

        $lines = [];
        $max = max(count($terms), count($synonymRows));

        for ($i = 0; $i < $max; $i++) {
            $term = isset($terms[$i]) ? trim((string) $terms[$i]) : '';
            $synonymsText = isset($synonymRows[$i]) ? trim((string) $synonymRows[$i]) : '';

            if ($term === '' && $synonymsText === '') {
                continue;
            }

            $synonyms = array_values(array_filter(array_map('trim', explode(',', $synonymsText)), function ($synonym) {
                return $synonym !== '';
            }));

            array_unshift($synonyms, $term);
            $lines[] = implode(', ', array_unique($synonyms));
        }

        return implode("\n", $lines);
    }

    private function getBoostRuleRows()
    {
        $errors = [];
        $rules = dropdownsearchParseBoostRulesText($this->getBoostRulesText(), $errors);
        $rows = [];

        foreach ($rules as $term => $ids) {
            $rows[] = [
                'term' => $term,
                'ids' => implode(', ', array_map('intval', $ids)),
            ];
        }

        return !empty($rows) ? $rows : [['term' => '', 'ids' => '']];
    }

    private function getSynonymRows()
    {
        $errors = [];
        $groups = dropdownsearchParseSynonymsText($this->getSynonymsText(), $errors);
        $rows = [];

        foreach ($groups as $group) {
            $term = array_shift($group);
            $rows[] = [
                'term' => $term,
                'synonyms' => implode(', ', $group),
            ];
        }

        return !empty($rows) ? $rows : [['term' => '', 'synonyms' => '']];
    }

    private function renderBehaviorPanel()
    {
        return '<section class="dropdownsearch-card">
            <div class="dropdownsearch-card-header">
                <div>
                    <span class="dropdownsearch-card-kicker">' . htmlspecialchars($this->l('Búsqueda'), ENT_QUOTES, 'UTF-8') . '</span>
                    <h3><i class="icon-bolt"></i> ' . htmlspecialchars($this->l('Comportamiento'), ENT_QUOTES, 'UTF-8') . '</h3>
                </div>
            </div>
            <div class="dropdownsearch-card-body">
                ' . $this->renderTextInput(self::CONFIG_TRIGGER_SELECTOR, $this->l('Selector de activación'), $this->getTriggerSelector(), $this->l('Selector CSS del elemento que abrirá la búsqueda. Ejemplos: #search-icon, .header-search-button, [data-toggle-search].')) . '
                <div class="dropdownsearch-grid dropdownsearch-grid--three">
                    ' . $this->renderTextInput(self::CONFIG_TYPING_DELAY, $this->l('Delay de escritura'), $this->getTypingDelay(), $this->l('Milisegundos de espera después de terminar de escribir.'), 'ms') . '
                    ' . $this->renderTextInput(self::CONFIG_MIN_QUERY_LENGTH, $this->l('Longitud mínima'), $this->getMinQueryLength(), $this->l('Caracteres mínimos para lanzar la búsqueda.')) . '
                    ' . $this->renderTextInput(self::CONFIG_PAGE_LIMIT, $this->l('Productos por página'), $this->getPageLimit(), $this->l('Número de productos solicitados por página AJAX.')) . '
                </div>
            </div>
        </section>';
    }

    private function renderAppearancePanel()
    {
        return '<section class="dropdownsearch-card">
            <div class="dropdownsearch-card-header">
                <div>
                    <span class="dropdownsearch-card-kicker">' . htmlspecialchars($this->l('Frontend'), ENT_QUOTES, 'UTF-8') . '</span>
                    <h3><i class="icon-tint"></i> ' . htmlspecialchars($this->l('Apariencia'), ENT_QUOTES, 'UTF-8') . '</h3>
                </div>
            </div>
            <div class="dropdownsearch-card-body">
                <div class="dropdownsearch-grid dropdownsearch-grid--two">
                    ' . $this->renderSelectInput(self::CONFIG_LAYOUT_MODE, $this->l('Formato'), $this->getLayoutMode(), [
                        'fullscreen' => $this->l('Fullscreen'),
                        'below_input' => $this->l('Debajo del input de búsqueda'),
                    ]) . '
                    ' . $this->renderSelectInput(self::CONFIG_DROPDOWN_WIDTH, $this->l('Ancho en modo debajo del input'), $this->getDropdownWidth(), [
                        'full_width' => $this->l('Ancho completo'),
                        'popup' => $this->l('Popup'),
                    ], $this->l('Solo aplica cuando el formato es "Debajo del input de búsqueda".')) . '
                </div>
                <div class="dropdownsearch-grid dropdownsearch-grid--four">
                    ' . $this->renderColorInput(self::CONFIG_COLOR_PRIMARY, $this->l('Color principal'), $this->getColorValue(self::CONFIG_COLOR_PRIMARY, self::DEFAULT_COLOR_PRIMARY)) . '
                    ' . $this->renderColorInput(self::CONFIG_COLOR_LINK, $this->l('Color de enlace'), $this->getColorValue(self::CONFIG_COLOR_LINK, self::DEFAULT_COLOR_LINK)) . '
                    ' . $this->renderColorInput(self::CONFIG_COLOR_SECONDARY, $this->l('Color secundario'), $this->getColorValue(self::CONFIG_COLOR_SECONDARY, self::DEFAULT_COLOR_SECONDARY)) . '
                    ' . $this->renderColorInput(self::CONFIG_COLOR_PRICE, $this->l('Color precio'), $this->getColorValue(self::CONFIG_COLOR_PRICE, self::DEFAULT_COLOR_PRICE)) . '
                </div>
            </div>
        </section>';
    }

    private function renderRelevancePanel()
    {
        return '<section class="dropdownsearch-card">
            <div class="dropdownsearch-card-header">
                <div>
                    <span class="dropdownsearch-card-kicker">' . htmlspecialchars($this->l('Ranking'), ENT_QUOTES, 'UTF-8') . '</span>
                    <h3><i class="icon-search"></i> ' . htmlspecialchars($this->l('Relevancia'), ENT_QUOTES, 'UTF-8') . '</h3>
                </div>
            </div>
            <div class="dropdownsearch-card-body">
                ' . $this->renderSelectInput(self::CONFIG_MATCH_MODE, $this->l('Modo de coincidencia'), $this->getMatchMode(), [
                    'balanced' => $this->l('Equilibrado'),
                    'strict' => $this->l('Estricto'),
                    'broad' => $this->l('Amplio'),
                ], $this->l('Equilibrado exige todos los términos en búsquedas de dos palabras y permite más tolerancia en búsquedas largas. Estricto exige todos los términos. Amplio conserva el comportamiento anterior.')) . '
                ' . $this->renderBoostRulesTable() . '
                ' . $this->renderSynonymsTable() . '
            </div>
        </section>';
    }

    private function renderBoostRulesTable()
    {
        $rowsHtml = '';
        foreach ($this->getBoostRuleRows() as $row) {
            $rowsHtml .= $this->renderBoostRuleRow($row['term'], $row['ids']);
        }

        return '<div class="dropdownsearch-table-block">
            <div class="dropdownsearch-table-heading">
                <div>
                    <h4>' . htmlspecialchars($this->l('Reglas de boost'), ENT_QUOTES, 'UTF-8') . '</h4>
                    <p>' . htmlspecialchars($this->l('Cuando el usuario busque ese término, estos productos ganan prioridad.'), ENT_QUOTES, 'UTF-8') . '</p>
                </div>
                <button type="button" class="btn btn-default dropdownsearch-add-row" data-target="#dropdownsearch-boost-rules">
                    <i class="icon-plus"></i> ' . htmlspecialchars($this->l('Añadir regla'), ENT_QUOTES, 'UTF-8') . '
                </button>
            </div>
                <div class="table-responsive">
                    <table class="table dropdownsearch-table" id="dropdownsearch-boost-rules">
                        <thead>
                            <tr>
                                <th>' . htmlspecialchars($this->l('Término de búsqueda'), ENT_QUOTES, 'UTF-8') . '</th>
                                <th>' . htmlspecialchars($this->l('IDs de producto priorizados'), ENT_QUOTES, 'UTF-8') . '</th>
                                <th class="text-right" style="width:60px;">' . htmlspecialchars($this->l('Acción'), ENT_QUOTES, 'UTF-8') . '</th>
                            </tr>
                        </thead>
                        <tbody>' . $rowsHtml . '</tbody>
                    </table>
                </div>
                <p class="help-block">' . htmlspecialchars($this->l('Separa IDs con comas o espacios.'), ENT_QUOTES, 'UTF-8') . '</p>
        </div>';
    }

    private function renderBoostRuleRow($term, $ids)
    {
        return '<tr>
            <td><input type="text" name="DROPDOWNSEARCH_BOOST_TERM[]" value="' . htmlspecialchars((string) $term, ENT_QUOTES, 'UTF-8') . '" class="form-control" placeholder="' . htmlspecialchars($this->l('Ej: lámpara'), ENT_QUOTES, 'UTF-8') . '"></td>
            <td><input type="text" name="DROPDOWNSEARCH_BOOST_IDS[]" value="' . htmlspecialchars((string) $ids, ENT_QUOTES, 'UTF-8') . '" class="form-control" placeholder="' . htmlspecialchars($this->l('Ej: 1062, 1063, 1064'), ENT_QUOTES, 'UTF-8') . '"></td>
            <td class="text-right"><button type="button" class="btn btn-default dropdownsearch-remove-row"><i class="icon-trash"></i></button></td>
        </tr>';
    }

    private function renderSynonymsTable()
    {
        $rowsHtml = '';
        foreach ($this->getSynonymRows() as $row) {
            $rowsHtml .= $this->renderSynonymRow($row['term'], $row['synonyms']);
        }

        return '<div class="dropdownsearch-table-block">
            <div class="dropdownsearch-table-heading">
                <div>
                    <h4>' . htmlspecialchars($this->l('Sinónimos'), ENT_QUOTES, 'UTF-8') . '</h4>
                    <p>' . htmlspecialchars($this->l('Los grupos son bidireccionales: buscar cualquiera de estos términos amplía la búsqueda con el resto.'), ENT_QUOTES, 'UTF-8') . '</p>
                </div>
                <button type="button" class="btn btn-default dropdownsearch-add-row" data-target="#dropdownsearch-synonyms">
                    <i class="icon-plus"></i> ' . htmlspecialchars($this->l('Añadir grupo'), ENT_QUOTES, 'UTF-8') . '
                </button>
            </div>
                <div class="table-responsive">
                    <table class="table dropdownsearch-table" id="dropdownsearch-synonyms">
                        <thead>
                            <tr>
                                <th>' . htmlspecialchars($this->l('Término principal'), ENT_QUOTES, 'UTF-8') . '</th>
                                <th>' . htmlspecialchars($this->l('Sinónimos'), ENT_QUOTES, 'UTF-8') . '</th>
                                <th class="text-right" style="width:60px;">' . htmlspecialchars($this->l('Acción'), ENT_QUOTES, 'UTF-8') . '</th>
                            </tr>
                        </thead>
                        <tbody>' . $rowsHtml . '</tbody>
                    </table>
                </div>
        </div>';
    }

    private function renderSynonymRow($term, $synonyms)
    {
        return '<tr>
            <td><input type="text" name="DROPDOWNSEARCH_SYNONYM_TERM[]" value="' . htmlspecialchars((string) $term, ENT_QUOTES, 'UTF-8') . '" class="form-control" placeholder="' . htmlspecialchars($this->l('Ej: bombilla'), ENT_QUOTES, 'UTF-8') . '"></td>
            <td><input type="text" name="DROPDOWNSEARCH_SYNONYM_VALUES[]" value="' . htmlspecialchars((string) $synonyms, ENT_QUOTES, 'UTF-8') . '" class="form-control" placeholder="' . htmlspecialchars($this->l('Ej: lámpara, foco luz'), ENT_QUOTES, 'UTF-8') . '"></td>
            <td class="text-right"><button type="button" class="btn btn-default dropdownsearch-remove-row"><i class="icon-trash"></i></button></td>
        </tr>';
    }

    private function renderTextInput($name, $label, $value, $help = '', $suffix = '')
    {
        $input = '<input type="text" name="' . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . '" value="' . htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8') . '" class="form-control">';
        if ($suffix !== '') {
            $input = '<div class="input-group">' . $input . '<span class="input-group-addon">' . htmlspecialchars($suffix, ENT_QUOTES, 'UTF-8') . '</span></div>';
        }

        return $this->renderFormGroup($label, $input, $help);
    }

    private function renderColorInput($name, $label, $value)
    {
        $safeName = htmlspecialchars($name, ENT_QUOTES, 'UTF-8');
        $safeValue = htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8');
        $input = '<div class="input-group">
            <span class="input-group-addon" style="background:' . $safeValue . ';width:42px;"></span>
            <input type="color" name="' . $safeName . '" value="' . $safeValue . '" class="form-control" style="height:38px;padding:4px;">
        </div>';

        return $this->renderFormGroup($label, $input, $this->l('Formato hexadecimal, por ejemplo #007cba.'));
    }

    private function renderSelectInput($name, $label, $value, array $options, $help = '')
    {
        $html = '<select name="' . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . '" class="form-control">';
        foreach ($options as $optionValue => $optionLabel) {
            $selected = (string) $optionValue === (string) $value ? ' selected="selected"' : '';
            $html .= '<option value="' . htmlspecialchars($optionValue, ENT_QUOTES, 'UTF-8') . '"' . $selected . '>' . htmlspecialchars($optionLabel, ENT_QUOTES, 'UTF-8') . '</option>';
        }
        $html .= '</select>';

        return $this->renderFormGroup($label, $html, $help);
    }

    private function renderTextareaInput($name, $label, $value, $help = '', $rows = 8)
    {
        $html = '<textarea name="' . htmlspecialchars($name, ENT_QUOTES, 'UTF-8') . '" rows="' . (int) $rows . '" class="form-control" style="font-family:monospace;">' . htmlspecialchars((string) $value, ENT_QUOTES, 'UTF-8') . '</textarea>';

        return $this->renderFormGroup($label, $html, $help);
    }

    private function renderFormGroup($label, $input, $help = '')
    {
        return '<div class="dropdownsearch-field">
            <label>' . htmlspecialchars($label, ENT_QUOTES, 'UTF-8') . '</label>
            <div>
                ' . $input . '
                ' . ($help !== '' ? '<p class="help-block">' . htmlspecialchars($help, ENT_QUOTES, 'UTF-8') . '</p>' : '') . '
            </div>
        </div>';
    }

    private function renderModuleSummary()
    {
        return '<section class="dropdownsearch-card dropdownsearch-status-card">
            <div class="dropdownsearch-card-header">
                <div>
                    <span class="dropdownsearch-card-kicker">' . htmlspecialchars($this->l('Diagnóstico'), ENT_QUOTES, 'UTF-8') . '</span>
                    <h3><i class="icon-info-circle"></i> ' . htmlspecialchars($this->l('Estado del módulo'), ENT_QUOTES, 'UTF-8') . '</h3>
                </div>
            </div>
            <div class="dropdownsearch-card-body dropdownsearch-status-grid">
                <span><span class="label label-success">OK</span> ajax-search.php</span>
                <span><span class="label label-success">OK</span> dropdownsearch-simple.js</span>
                <span><span class="label label-success">OK</span> search-filters.js</span>
                <p>' . htmlspecialchars($this->l('El módulo usa la configuración guardada para estilos, paginación, comportamiento y relevancia.'), ENT_QUOTES, 'UTF-8') . '</p>
            </div>
        </section>';
    }

    /**
     * Procesa la búsqueda AJAX - Mantenido para compatibilidad
     */
    private function processAjaxSearch()
    {
        if (!Tools::getValue('query')) {
            die(json_encode(['error' => 'No query provided']));
        }

        $query = Tools::getValue('query');
        $id_lang = (int) $this->context->language->id;
        $id_shop = (int) $this->context->shop->id;

        // Usar el sistema de búsqueda nativo de PrestaShop
        $products = Product::searchByName($id_lang, $query, null, null, null, null, true, false, 10);

        $results = [];
        foreach ($products as $product) {
            $product_obj = new Product($product['id_product'], false, $id_lang);
            $link = new Link();

            $results[] = [
                'id_product' => $product['id_product'],
                'name' => $product['name'],
                'description_short' => strip_tags($product_obj->description_short),
                'price' => Tools::displayPrice($product_obj->getPrice(true, null, 6)),
                'link' => $link->getProductLink($product_obj),
                'image' => $this->getProductImageUrl($product_obj)
            ];
        }

        header('Content-Type: application/json');
        die(json_encode($results));
    }

    /**
     * Obtiene la URL de la imagen del producto
     */
    private function getProductImageUrl($product)
    {
        $image = Image::getCover($product->id);
        if ($image) {
            $link = new Link();
            return $link->getImageLink($product->link_rewrite, $image['id_image'], 'home_default');
        }
        return '';
    }

    /**
     * Formulario de configuración
     */
    private function displayForm()
    {
        $currentIndex = $this->context->link->getAdminLink('AdminModules', false)
            . '&configure=' . $this->name
            . '&tab_module=' . $this->tab
            . '&module_name=' . $this->name;
        $token = Tools::getAdminTokenLite('AdminModules');
        $action = htmlspecialchars($currentIndex . '&token=' . $token, ENT_QUOTES, 'UTF-8');

        return $this->renderConfigurationStyles() . '<div class="dropdownsearch-admin">
            <form method="post" action="' . $action . '" class="defaultForm dropdownsearch-form">
                <div class="dropdownsearch-hero">
                    <div>
                        <span class="dropdownsearch-eyebrow">' . htmlspecialchars($this->l('Módulo PrestaShop'), ENT_QUOTES, 'UTF-8') . '</span>
                        <h2><i class="icon-cogs"></i> ' . htmlspecialchars($this->l('Búsqueda desplegable'), ENT_QUOTES, 'UTF-8') . '</h2>
                        <p>' . htmlspecialchars($this->l('Configura comportamiento, aspecto, filtros de relevancia y experiencia de búsqueda AJAX.'), ENT_QUOTES, 'UTF-8') . '</p>
                    </div>
                    <button type="submit" name="submitDropdownSearch" class="btn btn-primary dropdownsearch-save-top">
                        <i class="process-icon-save"></i> ' . htmlspecialchars($this->l('Guardar cambios'), ENT_QUOTES, 'UTF-8') . '
                    </button>
                </div>
                <div class="dropdownsearch-layout">
                    ' . $this->renderBehaviorPanel() . '
                    ' . $this->renderAppearancePanel() . '
                    ' . $this->renderRelevancePanel() . '
                </div>
                <div class="dropdownsearch-footer">
                    <button type="submit" name="submitDropdownSearch" class="btn btn-primary">
                        <i class="process-icon-save"></i> ' . htmlspecialchars($this->l('Guardar cambios'), ENT_QUOTES, 'UTF-8') . '
                    </button>
                </div>
            </form>
            ' . $this->renderModuleSummary() . '
        </div>' . $this->renderConfigurationScripts();
    }

    private function renderConfigurationStyles()
    {
        return '<style>
            .dropdownsearch-admin {
                --ds-admin-border: #d7dce3;
                --ds-admin-muted: #6c7785;
                --ds-admin-text: #1f2933;
                --ds-admin-soft: #f5f7fa;
                --ds-admin-primary: #25b9d7;
                color: var(--ds-admin-text);
                max-width: 1220px;
            }

            .dropdownsearch-admin * {
                box-sizing: border-box;
            }

            .dropdownsearch-form {
                margin: 0;
            }

            .dropdownsearch-hero,
            .dropdownsearch-card,
            .dropdownsearch-status-card {
                background: #fff;
                border: 1px solid var(--ds-admin-border);
                border-radius: 8px;
                box-shadow: 0 1px 2px rgba(31, 41, 51, 0.06);
            }

            .dropdownsearch-hero {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 24px;
                padding: 24px 28px;
                margin-bottom: 18px;
            }

            .dropdownsearch-hero h2 {
                margin: 4px 0 6px;
                font-size: 24px;
                line-height: 1.25;
                font-weight: 600;
            }

            .dropdownsearch-hero p,
            .dropdownsearch-card p,
            .dropdownsearch-status-grid p {
                margin: 0;
                color: var(--ds-admin-muted);
            }

            .dropdownsearch-eyebrow,
            .dropdownsearch-card-kicker {
                display: block;
                color: var(--ds-admin-primary);
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0;
                text-transform: uppercase;
            }

            .dropdownsearch-layout {
                display: grid;
                gap: 18px;
            }

            .dropdownsearch-card-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 16px;
                padding: 18px 22px;
                border-bottom: 1px solid #eef1f4;
            }

            .dropdownsearch-card-header h3 {
                margin: 4px 0 0;
                font-size: 18px;
                line-height: 1.3;
                font-weight: 600;
            }

            .dropdownsearch-card-body {
                padding: 22px;
            }

            .dropdownsearch-grid {
                display: grid;
                gap: 18px;
            }

            .dropdownsearch-grid--two {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            .dropdownsearch-grid--three {
                grid-template-columns: repeat(3, minmax(0, 1fr));
            }

            .dropdownsearch-grid--four {
                grid-template-columns: repeat(4, minmax(0, 1fr));
                margin-top: 8px;
            }

            .dropdownsearch-field {
                margin-bottom: 18px;
            }

            .dropdownsearch-grid .dropdownsearch-field {
                margin-bottom: 0;
            }

            .dropdownsearch-field label,
            .dropdownsearch-table-heading h4 {
                display: block;
                margin: 0 0 7px;
                font-size: 13px;
                font-weight: 600;
                color: var(--ds-admin-text);
            }

            .dropdownsearch-admin .form-control {
                min-height: 38px;
                border-color: #c7d1dc;
                border-radius: 6px;
                box-shadow: none;
            }

            .dropdownsearch-admin .form-control:focus {
                border-color: var(--ds-admin-primary);
                box-shadow: 0 0 0 2px rgba(37, 185, 215, 0.16);
            }

            .dropdownsearch-admin .help-block {
                margin: 7px 0 0;
                color: var(--ds-admin-muted);
                font-size: 12px;
            }

            .dropdownsearch-admin .input-group-addon {
                border-color: #c7d1dc;
                border-radius: 6px 0 0 6px;
            }

            .dropdownsearch-table-block {
                padding: 18px;
                border: 1px solid #e5e9ef;
                border-radius: 8px;
                background: var(--ds-admin-soft);
            }

            .dropdownsearch-table-block + .dropdownsearch-table-block {
                margin-top: 18px;
            }

            .dropdownsearch-table-heading {
                display: flex;
                align-items: flex-start;
                justify-content: space-between;
                gap: 16px;
                margin-bottom: 14px;
            }

            .dropdownsearch-table-heading p {
                margin: 0;
                font-size: 12px;
            }

            .dropdownsearch-table {
                margin-bottom: 0;
                background: #fff;
                border: 1px solid #e5e9ef;
                border-radius: 8px;
                overflow: hidden;
            }

            .dropdownsearch-table th {
                color: #4a5563;
                font-size: 12px;
                font-weight: 700;
                background: #f8fafc;
                border-bottom: 1px solid #e5e9ef !important;
                white-space: nowrap;
            }

            .dropdownsearch-table td {
                vertical-align: middle !important;
            }

            .dropdownsearch-footer {
                display: flex;
                justify-content: flex-end;
                margin-top: 18px;
                padding: 18px 0 0;
            }

            .dropdownsearch-status-card {
                margin-top: 18px;
            }

            .dropdownsearch-status-grid {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 12px;
            }

            .dropdownsearch-status-grid p {
                grid-column: 1 / -1;
            }

            @media (max-width: 991px) {
                .dropdownsearch-hero {
                    align-items: flex-start;
                    flex-direction: column;
                }

                .dropdownsearch-grid--two,
                .dropdownsearch-grid--three,
                .dropdownsearch-grid--four,
                .dropdownsearch-status-grid {
                    grid-template-columns: 1fr;
                }

                .dropdownsearch-table-heading {
                    flex-direction: column;
                }

                .dropdownsearch-save-top {
                    width: 100%;
                }
            }
        </style>';
    }

    private function renderConfigurationScripts()
    {
        return '<script>
            (function () {
                function bindRemoveButtons(scope) {
                    var buttons = (scope || document).querySelectorAll(".dropdownsearch-remove-row");
                    for (var i = 0; i < buttons.length; i++) {
                        buttons[i].onclick = function () {
                            var row = this.closest ? this.closest("tr") : null;
                            var tbody = row ? row.parentNode : null;
                            if (!row || !tbody) {
                                return;
                            }
                            if (tbody.querySelectorAll("tr").length > 1) {
                                tbody.removeChild(row);
                                return;
                            }
                            var inputs = row.querySelectorAll("input");
                            for (var j = 0; j < inputs.length; j++) {
                                inputs[j].value = "";
                            }
                        };
                    }
                }

                function createBoostRow() {
                    return "<tr>" +
                        "<td><input type=\"text\" name=\"DROPDOWNSEARCH_BOOST_TERM[]\" class=\"form-control\" placeholder=\"Ej: lámpara\"></td>" +
                        "<td><input type=\"text\" name=\"DROPDOWNSEARCH_BOOST_IDS[]\" class=\"form-control\" placeholder=\"Ej: 1062, 1063, 1064\"></td>" +
                        "<td class=\"text-right\"><button type=\"button\" class=\"btn btn-default dropdownsearch-remove-row\"><i class=\"icon-trash\"></i></button></td>" +
                    "</tr>";
                }

                function createSynonymRow() {
                    return "<tr>" +
                        "<td><input type=\"text\" name=\"DROPDOWNSEARCH_SYNONYM_TERM[]\" class=\"form-control\" placeholder=\"Ej: bombilla\"></td>" +
                        "<td><input type=\"text\" name=\"DROPDOWNSEARCH_SYNONYM_VALUES[]\" class=\"form-control\" placeholder=\"Ej: lámpara, foco luz\"></td>" +
                        "<td class=\"text-right\"><button type=\"button\" class=\"btn btn-default dropdownsearch-remove-row\"><i class=\"icon-trash\"></i></button></td>" +
                    "</tr>";
                }

                var addButtons = document.querySelectorAll(".dropdownsearch-add-row");
                for (var i = 0; i < addButtons.length; i++) {
                    addButtons[i].onclick = function () {
                        var table = document.querySelector(this.getAttribute("data-target"));
                        var tbody = table ? table.querySelector("tbody") : null;
                        if (!tbody) {
                            return;
                        }
                        tbody.insertAdjacentHTML("beforeend", table.id === "dropdownsearch-boost-rules" ? createBoostRow() : createSynonymRow());
                        bindRemoveButtons(tbody);
                    };
                }

                bindRemoveButtons(document);
            })();
        </script>';
    }
}
