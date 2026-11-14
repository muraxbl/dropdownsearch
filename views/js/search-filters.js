/**
 * Sistema de Filtros para Búsqueda - Integrado con dropdownsearch-simple.js
 * Con sistema de traducciones fallback incluido
 */

// ==========================================
// FALLBACK: Definir t() si no existe
// ==========================================
if (typeof window.t !== 'function') {
    console.warn('⚠️ Translations not loaded from translations.php, using inline fallback');
    
    // Detectar idioma actual desde PrestaShop
    const currentLangId = (typeof prestashop !== 'undefined' && prestashop.language) 
        ? parseInt(prestashop.language.id) 
        : 4; // Default: español

    // Traducciones inline como backup
    const inlineTranslations = {
        1: { // English
            filters: 'Filters',
            clear_filters: 'Clear filters',
            active_filters: 'Active filters:',
            categories: 'Categories',
            manufacturers: 'Manufacturers',
            price: 'Price',
            price_min: 'Min. price',
            price_max: 'Max. price',
            attributes: 'Attributes',
            features: 'Features',
            in_stock_only: 'Only products in stock',
            in_stock: 'In stock',
            out_of_stock: 'Out of stock',
            ref: 'Ref',
            products_found: 'products found',
            product_found: 'product found',
            searching: 'Searching...',
            no_results: 'No results found',
            search_error: 'Search error',
            loading: 'Loading...'
        },
        2: { // Português
            filters: 'Filtros',
            clear_filters: 'Limpar filtros',
            active_filters: 'Filtros ativos:',
            categories: 'Categorias',
            manufacturers: 'Fabricantes',
            price: 'Preço',
            price_min: 'Preço mín.',
            price_max: 'Preço máx.',
            attributes: 'Atributos',
            features: 'Características',
            in_stock_only: 'Apenas produtos em estoque',
            in_stock: 'Em estoque',
            out_of_stock: 'Sem estoque',
            ref: 'Ref',
            products_found: 'produtos encontrados',
            product_found: 'produto encontrado',
            searching: 'Pesquisando...',
            no_results: 'Nenhum resultado encontrado',
            search_error: 'Erro na pesquisa',
            loading: 'Carregando...'
        },
        4: { // Español
            filters: 'Filtros',
            clear_filters: 'Limpiar filtros',
            active_filters: 'Filtros activos:',
            categories: 'Categorías',
            manufacturers: 'Fabricantes',
            price: 'Precio',
            price_min: 'Precio mín.',
            price_max: 'Precio máx.',
            attributes: 'Atributos',
            features: 'Características',
            in_stock_only: 'Solo productos en stock',
            in_stock: 'En stock',
            out_of_stock: 'Sin stock',
            ref: 'Ref',
            products_found: 'productos encontrados',
            product_found: 'producto encontrado',
            searching: 'Buscando...',
            no_results: 'No se encontraron resultados',
            search_error: 'Error en la búsqueda',
            loading: 'Cargando...'
        },
        5: { // Français
            filters: 'Filtres',
            clear_filters: 'Effacer les filtres',
            active_filters: 'Filtres actifs:',
            categories: 'Catégories',
            manufacturers: 'Fabricants',
            price: 'Prix',
            price_min: 'Prix min.',
            price_max: 'Prix max.',
            attributes: 'Attributs',
            features: 'Caractéristiques',
            in_stock_only: 'Seulement produits en stock',
            in_stock: 'En stock',
            out_of_stock: 'Rupture de stock',
            ref: 'Réf',
            products_found: 'produits trouvés',
            product_found: 'produit trouvé',
            searching: 'Recherche...',
            no_results: 'Aucun résultat trouvé',
            search_error: 'Erreur de recherche',
            loading: 'Chargement...'
        },
        6: { // Deutsch
            filters: 'Filter',
            clear_filters: 'Filter löschen',
            active_filters: 'Aktive Filter:',
            categories: 'Kategorien',
            manufacturers: 'Hersteller',
            price: 'Preis',
            price_min: 'Min. Preis',
            price_max: 'Max. Preis',
            attributes: 'Attribute',
            features: 'Merkmale',
            in_stock_only: 'Nur vorrätige Produkte',
            in_stock: 'Auf Lager',
            out_of_stock: 'Nicht vorrätig',
            ref: 'Art.-Nr.',
            products_found: 'Produkte gefunden',
            product_found: 'Produkt gefunden',
            searching: 'Suchen...',
            no_results: 'Keine Ergebnisse gefunden',
            search_error: 'Suchfehler',
            loading: 'Laden...'
        },
        7: { // Italiano
            filters: 'Filtri',
            clear_filters: 'Cancella filtri',
            active_filters: 'Filtri attivi:',
            categories: 'Categorie',
            manufacturers: 'Produttori',
            price: 'Prezzo',
            price_min: 'Prezzo min.',
            price_max: 'Prezzo max.',
            attributes: 'Attributi',
            features: 'Caratteristiche',
            in_stock_only: 'Solo prodotti disponibili',
            in_stock: 'Disponibile',
            out_of_stock: 'Esaurito',
            ref: 'Rif',
            products_found: 'prodotti trovati',
            product_found: 'prodotto trovato',
            searching: 'Ricerca...',
            no_results: 'Nessun risultato trovato',
            search_error: 'Errore di ricerca',
            loading: 'Caricamento...'
        }
    };

    // Establecer traducciones (con fallback a español)
    window.searchTranslations = inlineTranslations[currentLangId] || inlineTranslations[4];

    // Definir función t()
    window.t = function(key, defaultValue) {
        return window.searchTranslations[key] || defaultValue || key;
    };

    //.log('✅ Inline translations loaded for language ID:', currentLangId);
}

document.addEventListener('DOMContentLoaded', function() {
   // console.log('🔍 Search filters module loading...');
    
    // Esperar a que se inicialice el módulo principal
    setTimeout(function() {
        if (typeof window.enhancedSearchFilters === 'undefined') {
            window.enhancedSearchFilters = new SearchFiltersManager();
        }
    }, 500);
});

class SearchFiltersManager {
    constructor() {
        this.activeFilters = {};
        this.availableFilters = {};
        this.isLoading = false;
        this.isPanelOpen = false;
        this.basePerformSearch = null;
        this.moduleConfig = window.dropdownsearchConfig || {};
        this.minQueryLength = Number.isFinite(parseInt(this.moduleConfig.minQueryLength, 10)) ? Math.max(1, parseInt(this.moduleConfig.minQueryLength, 10)) : 2;
        this.pageLimit = Number.isFinite(parseInt(this.moduleConfig.pageLimit, 10)) ? Math.max(1, parseInt(this.moduleConfig.pageLimit, 10)) : 20;
        
        // Referencias a elementos del módulo principal
        this.searchInput = document.getElementById('dropdown-search-input');
        this.searchOverlay = document.getElementById('dropdown-search-overlay');
        this.resultsContainer = document.querySelector('.search-results-list');
        
       // console.log('🔍 SearchFiltersManager initialized');
        this.init();
    }

    init() {
        this.createFiltersPanel();
        this.bindEvents();
        this.interceptOriginalSearch();
    }

    /**
     * Crear el panel de filtros
     */
    createFiltersPanel() {
        if (!this.searchInput || !this.searchInput.parentNode) {
           // console.warn('⚠️ Search input not found, filters panel not created');
            return;
        }

        const filtersHTML = `
            <div class="search-filters-panel is-collapsed" style="display: none;">
                <div class="filters-header">
                    <button type="button" class="filters-panel-toggle" aria-expanded="false">
                        <span>${t('filters', 'Filters')}</span>
                        <svg class="filters-panel-toggle-icon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z"/>
                        </svg>
                    </button>
                    <button type="button" class="clear-filters-btn" style="display: none;">
                        ${t('clear_filters', 'Clear filters')}
                    </button>
                </div>
                
                <div class="active-filters" style="display: none;">
                    <div class="active-filters-title">${t('active_filters', 'Active filters:')}</div>
                    <div class="active-filters-list"></div>
                </div>

                <div class="filters-content">
                    <!-- Categorías -->
                    <div class="filter-group" data-filter="categories">
                        <div class="filter-group-header">
                            <h4>${t('categories', 'Categories')}</h4>
                            <svg class="filter-toggle" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                            </svg>
                        </div>
                        <div class="filter-options"></div>
                    </div>

                    <!-- Fabricantes -->
                    <div class="filter-group" data-filter="manufacturers">
                        <div class="filter-group-header">
                            <h4>${t('manufacturers', 'Manufacturers')}</h4>
                            <svg class="filter-toggle" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                            </svg>
                        </div>
                        <div class="filter-options"></div>
                    </div>

                    <!-- Precio -->
                    <div class="filter-group" data-filter="price">
                        <div class="filter-group-header">
                            <h4>${t('price', 'Price')}</h4>
                            <svg class="filter-toggle" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                            </svg>
                        </div>
                        <div class="filter-options">
                            <div class="price-range-inputs">
                                <input type="number" class="price-min" placeholder="${t('price_min', 'Min. price')}" step="0.01" min="0">
                                <span class="price-separator">-</span>
                                <input type="number" class="price-max" placeholder="${t('price_max', 'Max. price')}" step="0.01" min="0">
                            </div>
                        </div>
                    </div>

                    <!-- Atributos -->
                    <div class="filter-group" data-filter="attributes">
                        <div class="filter-group-header">
                            <h4>${t('attributes', 'Attributes')}</h4>
                            <svg class="filter-toggle" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                            </svg>
                        </div>
                        <div class="filter-options"></div>
                    </div>

                    <!-- Características -->
                    <div class="filter-group" data-filter="features">
                        <div class="filter-group-header">
                            <h4>${t('features', 'Features')}</h4>
                            <svg class="filter-toggle" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                            </svg>
                        </div>
                        <div class="filter-options"></div>
                    </div>

                    <!-- Solo en stock -->
                    <div class="filter-group" data-filter="stock">
                        <div class="filter-option">
                            <label class="filter-checkbox">
                                <input type="checkbox" data-filter-type="in_stock" value="1">
                                <span class="checkmark"></span>
                                ${t('in_stock_only', 'Only products in stock')}
                            </label>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Insertar después del wrapper del input de búsqueda
        this.searchInput.parentNode.insertAdjacentHTML('afterend', filtersHTML);
        this.filtersPanel = document.querySelector('.search-filters-panel');
        //console.log('✅ Filters panel created');
    }

    /**
     * Vincular eventos
     */
    bindEvents() {
        if (!this.filtersPanel) return;

        // Toggle de grupos de filtros
        this.filtersPanel.addEventListener('click', (e) => {
            const panelToggle = e.target.closest('.filters-panel-toggle');
            if (panelToggle) {
                this.toggleFiltersPanel();
                return;
            }

            const header = e.target.closest('.filter-group-header');
            if (header) {
                this.toggleFilterGroup(header.closest('.filter-group'));
            }
        });

        // Cambios en filtros
        this.filtersPanel.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                this.handleFilterChange(e);
            }
        });

        // Inputs de precio
        const priceInputs = this.filtersPanel.querySelectorAll('.price-min, .price-max');
        priceInputs.forEach(input => {
            let timeout;
            input.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(() => {
                    this.handlePriceChange();
                }, 500);
            });
        });

        // Limpiar filtros
        const clearBtn = this.filtersPanel.querySelector('.clear-filters-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }
    }

    /**
     * Interceptar la función de búsqueda original
     */
    interceptOriginalSearch() {
        // Reemplazar la función performSearch global
        if (typeof window.performSearch === 'function') {
            const originalPerformSearch = window.performSearch;
            this.basePerformSearch = originalPerformSearch;
            window.performSearch = (query, page = 1, isNewSearch = true) => {
               // console.log(`🔍 Intercepted search: "${query}", page ${page}, filters:`, this.activeFilters);
                this.performSearchWithFilters(query, page, isNewSearch);
            };
        } else {
            // Si no existe, crearla
            window.performSearch = (query, page = 1, isNewSearch = true) => {
                this.performSearchWithFilters(query, page, isNewSearch);
            };
        }
    }

    /**
     * Realizar búsqueda con filtros
     */
    async performSearchWithFilters(query, page = 1, isNewSearch = true) {
        if (typeof this.basePerformSearch === 'function') {
            this.basePerformSearch(query, page, isNewSearch);
            return;
        }

        if (this.isLoading) return;
        
        //console.log(`🔍 Search with filters: "${query}", page ${page}, filters:`, this.activeFilters);
        
        this.isLoading = true;
        
        if (isNewSearch) {
            this.showFilters();
            this.showLoading();
        }

        try {
            const searchUrl = '/modules/dropdownsearch/ajax-search.php';
            
            // Preparar parámetros
            const formData = new URLSearchParams();
            formData.append('search_query', query);
            formData.append('page', page);
            formData.append('limit', this.pageLimit);
            formData.append('filters', JSON.stringify(this.activeFilters));

            const response = await fetch(searchUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(t('search_error', 'Search error'));
            }

            const data = await response.json();
            //console.log('🔍 Search response:', data);
            this.handleSearchResponse(data, isNewSearch);
            
            // Usar el sistema de display original pero mejorado
            if (data.products) {
                this.displayResults(data.products, query, isNewSearch, data.pagination);
            }
            
        } catch (error) {
           // console.error('Search error:', error);
            this.showError(t('search_error', 'Search error'));
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    /**
     * Mostrar panel de filtros
     */
    showFilters() {
        if (this.filtersPanel) {
            this.filtersPanel.style.display = 'block';
        }
    }

    /**
     * Crear filtros básicos cuando no hay datos del servidor
     */
    createBasicFilters() {
        // Stock filter - siempre visible
        const stockGroup = this.filtersPanel.querySelector('[data-filter="stock"]');
        if (stockGroup) {
            stockGroup.style.display = 'block';
        }

        const priceGroup = this.filtersPanel.querySelector('[data-filter="price"]');
        if (priceGroup) {
            priceGroup.style.display = 'block';
        }
    }

    toggleFiltersPanel() {
        this.setFiltersPanelOpen(!this.isPanelOpen);
    }

    setFiltersPanelOpen(isOpen) {
        if (!this.filtersPanel) return;

        this.isPanelOpen = isOpen;
        this.filtersPanel.classList.toggle('is-collapsed', !isOpen);

        const toggle = this.filtersPanel.querySelector('.filters-panel-toggle');
        if (toggle) {
            toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
    }

    /**
     * Toggle grupo de filtros
     */
    toggleFilterGroup(group) {
        const options = group.querySelector('.filter-options');
        const toggle = group.querySelector('.filter-toggle');
        
        if (options.style.display === 'none' || options.style.display === '') {
            options.style.display = 'block';
            toggle.style.transform = 'rotate(180deg)';
        } else {
            options.style.display = 'none';
            toggle.style.transform = 'rotate(0deg)';
        }
    }

    /**
     * Manejar cambio en filtros
     */
    handleFilterChange(e) {
        const filterType = e.target.dataset.filterType;
        const value = e.target.value;
        const isChecked = e.target.checked;

       // console.log(`Filter change: ${window.dropdownsearchSecurity.escape(filterType)}=${value}, checked=${isChecked}`);

        if (filterType === 'in_stock') {
            if (isChecked) {
                this.activeFilters[filterType] = true;
            } else {
                delete this.activeFilters[filterType];
            }
        } else {
            if (!this.activeFilters[filterType]) {
                this.activeFilters[filterType] = [];
            }

            if (isChecked) {
                if (!this.activeFilters[filterType].includes(value)) {
                    this.activeFilters[filterType].push(value);
                }
            } else {
                const index = this.activeFilters[filterType].indexOf(value);
                if (index > -1) {
                    this.activeFilters[filterType].splice(index, 1);
                }
                if (this.activeFilters[filterType].length === 0) {
                    delete this.activeFilters[filterType];
                }
            }
        }

        this.updateActiveFiltersDisplay();
        
        // Realizar nueva búsqueda
        const query = this.searchInput ? this.searchInput.value.trim() : '';
        if (query.length >= this.minQueryLength || Object.keys(this.activeFilters).length > 0) {
            this.performSearchWithFilters(query, 1, true);
        }
    }

    /**
     * Manejar cambio en filtros de precio
     */
    handlePriceChange() {
        const priceMin = document.querySelector('.price-min').value;
        const priceMax = document.querySelector('.price-max').value;

        if (priceMin) {
            this.activeFilters.price_min = parseFloat(priceMin);
        } else {
            delete this.activeFilters.price_min;
        }

        if (priceMax) {
            this.activeFilters.price_max = parseFloat(priceMax);
        } else {
            delete this.activeFilters.price_max;
        }

        this.updateActiveFiltersDisplay();
        
        // Realizar nueva búsqueda
        const query = this.searchInput ? this.searchInput.value.trim() : '';
        if (query.length >= this.minQueryLength || Object.keys(this.activeFilters).length > 0) {
            this.performSearchWithFilters(query, 1, true);
        }
    }

    /**
     * Actualizar interfaz de filtros
     */
    updateFiltersUI() {
        this.showFilters();
        this.updateCategoriesFilter();
        this.updateManufacturersFilter();
        this.updateAttributesFilter();
        this.updateFeaturesFilter();
        this.updatePriceRange();
        this.createBasicFilters();
    }

    handleSearchResponse(data, isNewSearch = true) {
        if (!data || !data.filters) return;

        this.availableFilters = data.filters;
        this.updateFiltersUI();

        if (isNewSearch && !this.hasActiveFilters()) {
            this.setFiltersPanelOpen(false);
        }
    }

    hasActiveFilters() {
        return Object.keys(this.activeFilters).length > 0;
    }

    /**
     * Actualizar filtro de categorías
     */
    updateCategoriesFilter() {
        const container = document.querySelector('[data-filter="categories"] .filter-options');
        const group = document.querySelector('[data-filter="categories"]');
        if (!container || !this.availableFilters.categories || !this.availableFilters.categories.length) {
            if (group) group.style.display = 'none';
            return;
        }

        if (group) group.style.display = 'block';

        let html = '';
        this.availableFilters.categories.forEach(category => {
            const isChecked = this.activeFilters.categories && this.activeFilters.categories.includes(category.id_category.toString());
            html += `
                <label class="filter-option filter-checkbox">
                    <input type="checkbox" data-filter-type="categories" value="${window.dropdownsearchSecurity.escape(category.id_category)}" ${isChecked ? 'checked' : ''}>
                    <span class="checkmark"></span>
                    <span class="filter-label">
                        ${window.dropdownsearchSecurity.escape(category.name)}
                        <span class="product-count">(${window.dropdownsearchSecurity.escape(category.product_count)})</span>
                    </span>
                </label>
            `;
        });
        container.innerHTML = html;
    }

    /**
     * Actualizar filtro de fabricantes
     */
    updateManufacturersFilter() {
        const container = document.querySelector('[data-filter="manufacturers"] .filter-options');
        const group = document.querySelector('[data-filter="manufacturers"]');
        if (!container || !this.availableFilters.manufacturers || !this.availableFilters.manufacturers.length) {
            if (group) group.style.display = 'none';
            return;
        }

        if (group) group.style.display = 'block';

        let html = '';
        this.availableFilters.manufacturers.forEach(manufacturer => {
            const isChecked = this.activeFilters.manufacturers && this.activeFilters.manufacturers.includes(manufacturer.id_manufacturer.toString());
            html += `
                <label class="filter-option filter-checkbox">
                    <input type="checkbox" data-filter-type="manufacturers" value="${window.dropdownsearchSecurity.escape(manufacturer.id_manufacturer)}" ${isChecked ? 'checked' : ''}>
                    <span class="checkmark"></span>
                    <span class="filter-label">
                        ${window.dropdownsearchSecurity.escape(manufacturer.name)}
                        <span class="product-count">(${window.dropdownsearchSecurity.escape(manufacturer.product_count)})</span>
                    </span>
                </label>
            `;
        });
        container.innerHTML = html;
    }

    /**
     * Actualizar filtro de atributos
     */
    updateAttributesFilter() {
        const container = document.querySelector('[data-filter="attributes"] .filter-options');
        const groupContainer = document.querySelector('[data-filter="attributes"]');
        if (!container || !this.availableFilters.attributes || !this.availableFilters.attributes.length) {
            if (groupContainer) groupContainer.style.display = 'none';
            return;
        }

        if (groupContainer) groupContainer.style.display = 'block';

        let html = '';
        this.availableFilters.attributes.forEach(group => {
            html += `<div class="attribute-group">
                <div class="attribute-group-name">${window.dropdownsearchSecurity.escape(group.name)}</div>
            `;
            
            group.attributes.forEach(attr => {
                const filterKey = `attributes_${group.id_attribute_group}`;
                const isChecked = this.activeFilters[filterKey] && this.activeFilters[filterKey].includes(attr.id_attribute.toString());
                
                html += `
                    <label class="filter-option filter-checkbox">
                        <input type="checkbox" data-filter-type="${window.dropdownsearchSecurity.escape(filterKey)}" value="${window.dropdownsearchSecurity.escape(attr.id_attribute)}" ${isChecked ? 'checked' : ''}>
                        <span class="checkmark"></span>
                        <span class="filter-label">
                            ${attr.color ? `<span class="color-swatch" style="background-color: ${window.dropdownsearchSecurity.escape(/^#[0-9a-f]{3,8}$/i.test(attr.color) ? attr.color : 'transparent')}"></span>` : ''}
                            ${window.dropdownsearchSecurity.escape(attr.name)}
                            <span class="product-count">(${window.dropdownsearchSecurity.escape(attr.product_count)})</span>
                        </span>
                    </label>
                `;
            });
            html += '</div>';
        });
        container.innerHTML = html;
    }

    /**
     * Actualizar filtro de características
     */
    updateFeaturesFilter() {
        const container = document.querySelector('[data-filter="features"] .filter-options');
        const groupContainer = document.querySelector('[data-filter="features"]');
        if (!container || !this.availableFilters.features || !this.availableFilters.features.length) {
            if (groupContainer) groupContainer.style.display = 'none';
            return;
        }

        if (groupContainer) groupContainer.style.display = 'block';

        let html = '';
        this.availableFilters.features.forEach(feature => {
            html += `<div class="feature-group">
                <div class="feature-group-name">${window.dropdownsearchSecurity.escape(feature.name)}</div>
            `;
            
            feature.values.forEach(value => {
                const filterKey = `features_${feature.id_feature}`;
                const isChecked = this.activeFilters[filterKey] && this.activeFilters[filterKey].includes(value.id_feature_value.toString());
                
                html += `
                    <label class="filter-option filter-checkbox">
                        <input type="checkbox" data-filter-type="${window.dropdownsearchSecurity.escape(filterKey)}" value="${window.dropdownsearchSecurity.escape(value.id_feature_value)}" ${isChecked ? 'checked' : ''}>
                        <span class="checkmark"></span>
                        <span class="filter-label">
                            ${window.dropdownsearchSecurity.escape(value.value)}
                            <span class="product-count">(${window.dropdownsearchSecurity.escape(value.product_count)})</span>
                        </span>
                    </label>
                `;
            });
            html += '</div>';
        });
        container.innerHTML = html;
    }

    /**
     * Actualizar rango de precios
     */
    updatePriceRange() {
        const priceGroup = document.querySelector('[data-filter="price"]');
        if (priceGroup) priceGroup.style.display = this.availableFilters.price_range ? 'block' : 'none';
        if (!this.availableFilters.price_range) return;
        
        const priceMin = document.querySelector('.price-min');
        const priceMax = document.querySelector('.price-max');
        
        if (priceMin) {
            priceMin.placeholder = `${t('price_min', 'Min. price')} ${parseFloat(this.availableFilters.price_range.min_price).toFixed(2)}€`;
        }
        if (priceMax) {
            priceMax.placeholder = `${t('price_max', 'Max. price')} ${parseFloat(this.availableFilters.price_range.max_price).toFixed(2)}€`;
        }
    }

    /**
     * Actualizar visualización de filtros activos
     */
    updateActiveFiltersDisplay() {
        const container = document.querySelector('.active-filters-list');
        const activeFiltersDiv = document.querySelector('.active-filters');
        const clearBtn = document.querySelector('.clear-filters-btn');
        
        if (!container) return;

        let html = '';
        let hasActiveFilters = false;

        Object.keys(this.activeFilters).forEach(filterType => {
            const filterValue = this.activeFilters[filterType];
            
            if (filterType === 'in_stock' && filterValue) {
                html += `<span class="active-filter-tag">${t('in_stock', 'In stock')} <button class="remove-filter" data-filter="in_stock">×</button></span>`;
                hasActiveFilters = true;
            }
            
            if (filterType === 'price_min' && filterValue) {
                html += `<span class="active-filter-tag">${t('price_min', 'Min. price')}: ${window.dropdownsearchSecurity.escape(filterValue)}€ <button class="remove-filter" data-filter="price_min">×</button></span>`;
                hasActiveFilters = true;
            }
            
            if (filterType === 'price_max' && filterValue) {
                html += `<span class="active-filter-tag">${t('price_max', 'Max. price')}: ${window.dropdownsearchSecurity.escape(filterValue)}€ <button class="remove-filter" data-filter="price_max">×</button></span>`;
                hasActiveFilters = true;
            }
            
            if (Array.isArray(filterValue) && filterValue.length > 0) {
                const label = this.getFilterLabel(filterType);
                html += `<span class="active-filter-tag">${window.dropdownsearchSecurity.escape(label)} (${filterValue.length}) <button class="remove-filter" data-filter="${window.dropdownsearchSecurity.escape(filterType)}">×</button></span>`;
                hasActiveFilters = true;
            }
        });

        container.innerHTML = html;
        if (activeFiltersDiv) activeFiltersDiv.style.display = hasActiveFilters ? 'block' : 'none';
        if (clearBtn) clearBtn.style.display = hasActiveFilters ? 'inline-flex' : 'none';

        // Vincular eventos de eliminación
        container.addEventListener('click', (e) => {
            if (e.target.classList.contains('remove-filter')) {
                this.removeFilter(e.target.dataset.filter);
            }
        });
    }

    /**
     * Obtener etiqueta de filtro
     */
    getFilterLabel(filterType) {
        const labels = {
            'categories': t('categories', 'Categories'),
            'manufacturers': t('manufacturers', 'Manufacturers'),
            'in_stock': t('in_stock', 'In stock')
        };
        
        if (filterType.startsWith('attributes_')) {
            return t('attributes', 'Attributes');
        }
        if (filterType.startsWith('features_')) {
            return t('features', 'Features');
        }
        
        return labels[filterType] || filterType;
    }

    /**
     * Remover filtro específico
     */
    removeFilter(filterType) {
        if (filterType === 'in_stock' || filterType === 'price_min' || filterType === 'price_max') {
            delete this.activeFilters[filterType];
            
            if (filterType.startsWith('price_')) {
                const input = document.querySelector(`.${filterType.replace('_', '-')}`);
                if (input) input.value = '';
            } else if (filterType === 'in_stock') {
                const checkbox = document.querySelector('input[data-filter-type="in_stock"]');
                if (checkbox) checkbox.checked = false;
            }
        } else {
            delete this.activeFilters[filterType];
            
            // Desmarcar todos los checkboxes de este tipo
            document.querySelectorAll('.search-filters-panel input').forEach(cb => {
                if (cb.dataset.filterType !== filterType) return;
                cb.checked = false;
            });
        }

        this.updateActiveFiltersDisplay();
        
        // Realizar nueva búsqueda
        const query = this.searchInput ? this.searchInput.value.trim() : '';
        if (query.length >= this.minQueryLength || Object.keys(this.activeFilters).length > 0) {
            this.performSearchWithFilters(query, 1, true);
        }
    }

    /**
     * Limpiar todos los filtros
     */
    clearAllFilters() {
        this.activeFilters = {};
        
        // Desmarcar todos los checkboxes
        document.querySelectorAll('.search-filters-panel input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        
        // Limpiar inputs de precio
        document.querySelectorAll('.price-min, .price-max').forEach(input => {
            input.value = '';
        });

        this.updateActiveFiltersDisplay();
        
        // Realizar nueva búsqueda
        const query = this.searchInput ? this.searchInput.value.trim() : '';
        if (query.length >= this.minQueryLength) {
            this.performSearchWithFilters(query, 1, true);
        }
    }

    /**
     * Mostrar resultados (reutiliza el sistema existente con mejoras)
     */
    displayResults(products, query, isNewSearch, pagination) {
      // console.log(`Displaying ${products.length} products`);
        
        // Usar la función displayResults original si existe
        if (typeof window.originalDisplayResults === 'function') {
            window.originalDisplayResults(products, query, isNewSearch, pagination ? pagination.total_products : 0);
        } else {
            // Implementación fallback
            this.displayResultsFallback(products, query, isNewSearch, pagination);
        }
    }

    /**
     * Implementación fallback para mostrar resultados
     */
    displayResultsFallback(products, query, isNewSearch, pagination) {
        if (!this.resultsContainer) return;

        if (isNewSearch) {
            this.resultsContainer.innerHTML = '';
            
            if (pagination && pagination.total_products > 0) {
                const countDiv = document.createElement('div');
                countDiv.className = 'search-results-count';
                
                // Usar singular o plural según corresponda
                const productText = pagination.total_products === 1 
                    ? t('product_found', 'product found')
                    : t('products_found', 'products found');
                
                countDiv.textContent = `${pagination.total_products} ${productText}`;
                this.resultsContainer.appendChild(countDiv);
            }
        }

        products.forEach(product => {
            const productElement = this.createProductElement(product);
            this.resultsContainer.appendChild(productElement);
        });

        this.resultsContainer.style.display = 'block';
    }

    /**
     * Crear elemento de producto mejorado con datos adicionales
     */
    createProductElement(product) {
        const item = document.createElement('div');
        item.className = 'search-result-item';

        // Imagen
        const imageDiv = document.createElement('div');
        imageDiv.className = 'result-image';
        
        const img = document.createElement('img');
        img.src = window.dropdownsearchSecurity.url(product.image) || '/img/p/en-default-medium_default.jpg';
        img.alt = product.name || '';
        img.onerror = function() {
            this.src = '/img/p/en-default-medium_default.jpg';
        };
        imageDiv.appendChild(img);

        // Contenido
        const infoDiv = document.createElement('div');
        infoDiv.className = 'search-result-info';

        // Título
        const title = document.createElement('h4');
        title.className = 'result-title';
        title.textContent = product.name || '';

        // Referencia
        if (product.reference) {
            const refDiv = document.createElement('div');
            refDiv.className = 'result-reference';
            refDiv.textContent = t('ref', 'Ref') + ': ' + product.reference;
            infoDiv.appendChild(refDiv);
        }

        // Fabricante
        if (product.manufacturer) {
            const manufacturerDiv = document.createElement('div');
            manufacturerDiv.className = 'result-manufacturer';
            manufacturerDiv.textContent = product.manufacturer;
            infoDiv.appendChild(manufacturerDiv);
        }

        // Descripción
        if (product.description_short) {
            const desc = document.createElement('p');
            desc.className = 'search-result-description';
            desc.textContent = product.description_short;
            infoDiv.appendChild(desc);
        }

        // Precio
        const priceDiv = document.createElement('div');
        priceDiv.className = 'search-result-price';
        priceDiv.textContent = product.price || '';

        // Stock
        const stockDiv = document.createElement('div');
        stockDiv.className = `result-stock ${product.in_stock ? 'in-stock' : 'out-of-stock'}`;
        
        const stockText = product.in_stock 
            ? `${t('in_stock', 'In stock')} (${product.quantity})`
            : t('out_of_stock', 'Out of stock');
        
        stockDiv.textContent = stockText;

        infoDiv.appendChild(title);
        infoDiv.appendChild(priceDiv);
        infoDiv.appendChild(stockDiv);

        // Ensamblar
        item.appendChild(imageDiv);
        item.appendChild(infoDiv);

        // Click handler
        const productUrl = window.dropdownsearchSecurity.url(product.link);
        if (productUrl) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', function() {
                window.open(productUrl, '_blank', 'noopener,noreferrer');
            });
        }

        return item;
    }

    /**
     * Estados de carga
     */
    showLoading() {
        const loadingDiv = document.querySelector('.search-loading');
        if (loadingDiv) {
            loadingDiv.style.display = 'block';
            const loadingText = loadingDiv.querySelector('p');
            if (loadingText) {
                loadingText.textContent = t('searching', 'Searching...');
            }
        }
    }

    hideLoading() {
        const loadingDiv = document.querySelector('.search-loading');
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
    }

    showError(message) {
        const noResultsDiv = document.querySelector('.no-results');
        if (noResultsDiv) {
            noResultsDiv.style.display = 'block';
            noResultsDiv.textContent = `${t('search_error', 'Error')}: ${message}`;
        }
    }

    /**
     * API pública para integración con sistema de hash
     */
    getActiveFilters() {
        return this.activeFilters;
    }

    setActiveFilters(filters) {
        this.activeFilters = window.dropdownsearchSecurity.filters(filters);
        this.updateActiveFiltersDisplay();
        // Actualizar checkboxes y inputs según los filtros
        this.applyFiltersToUI();
    }

    applyFiltersToUI() {
        // Limpiar todo primero
        document.querySelectorAll('.search-filters-panel input').forEach(input => {
            input.checked = false;
            if (input.type === 'number') input.value = '';
        });

        // Aplicar filtros activos
        Object.keys(this.activeFilters).forEach(filterType => {
            const filterValue = this.activeFilters[filterType];

            if (filterType === 'in_stock' && filterValue) {
                const checkbox = document.querySelector('input[data-filter-type="in_stock"]');
                if (checkbox) checkbox.checked = true;
            } else if (filterType === 'price_min') {
                const input = document.querySelector('.price-min');
                if (input) input.value = filterValue;
            } else if (filterType === 'price_max') {
                const input = document.querySelector('.price-max');
                if (input) input.value = filterValue;
            } else if (Array.isArray(filterValue)) {
                filterValue.forEach(value => {
                    const checkbox = Array.from(document.querySelectorAll('.search-filters-panel input')).find(input => input.dataset.filterType === filterType && input.value === String(value));
                    if (checkbox) checkbox.checked = true;
                });
            }
        });
    }
}

// Hacer disponible globalmente para integración
window.SearchFiltersManager = SearchFiltersManager;
