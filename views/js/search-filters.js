if (typeof window.t !== 'function') {
    window.t = (key, fallback) => (window.searchTranslations || {})[key] || fallback || key;
}

document.addEventListener('DOMContentLoaded', function() {

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

        this.searchInput = document.getElementById('dropdown-search-input');
        this.searchOverlay = document.getElementById('dropdown-search-overlay');
        this.resultsContainer = document.querySelector('.search-results-list');

        this.init();
    }

    init() {
        this.createFiltersPanel();
        this.bindEvents();
        this.interceptOriginalSearch();
    }

    createFiltersPanel() {
        if (!this.searchInput || !this.searchInput.parentNode) {

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

                    <div class="filter-group" data-filter="categories">
                        <div class="filter-group-header">
                            <h4>${t('categories', 'Categories')}</h4>
                            <svg class="filter-toggle" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                            </svg>
                        </div>
                        <div class="filter-options"></div>
                    </div>


                    <div class="filter-group" data-filter="manufacturers">
                        <div class="filter-group-header">
                            <h4>${t('manufacturers', 'Manufacturers')}</h4>
                            <svg class="filter-toggle" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                            </svg>
                        </div>
                        <div class="filter-options"></div>
                    </div>


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


                    <div class="filter-group" data-filter="attributes">
                        <div class="filter-group-header">
                            <h4>${t('attributes', 'Attributes')}</h4>
                            <svg class="filter-toggle" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                            </svg>
                        </div>
                        <div class="filter-options"></div>
                    </div>


                    <div class="filter-group" data-filter="features">
                        <div class="filter-group-header">
                            <h4>${t('features', 'Features')}</h4>
                            <svg class="filter-toggle" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                            </svg>
                        </div>
                        <div class="filter-options"></div>
                    </div>


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

        this.searchInput.parentNode.insertAdjacentHTML('afterend', filtersHTML);
        this.filtersPanel = document.querySelector('.search-filters-panel');

    }

    bindEvents() {
        if (!this.filtersPanel) return;

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

        this.filtersPanel.addEventListener('click', (event) => {
            if (event.target.classList.contains('remove-filter')) {
                this.removeFilter(event.target.dataset.filter);
            }
        });

        this.filtersPanel.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                this.handleFilterChange(e);
            }
        });

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

        const clearBtn = this.filtersPanel.querySelector('.clear-filters-btn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }
    }

    interceptOriginalSearch() {

        if (typeof window.performSearch === 'function') {
            const originalPerformSearch = window.performSearch;
            this.basePerformSearch = originalPerformSearch;
            window.performSearch = (query, page = 1, isNewSearch = true) => {

                this.performSearchWithFilters(query, page, isNewSearch);
            };
        } else {

            window.performSearch = (query, page = 1, isNewSearch = true) => {
                this.performSearchWithFilters(query, page, isNewSearch);
            };
        }
    }

    async performSearchWithFilters(query, page = 1, isNewSearch = true) {
        if (typeof this.basePerformSearch === 'function') {
            this.basePerformSearch(query, page, isNewSearch);
            return;
        }

        if (this.isLoading) return;

        this.isLoading = true;

        if (isNewSearch) {
            this.showFilters();
            this.showLoading();
        }

        try {
            const searchUrl = '/modules/dropdownsearch/ajax-search.php';

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

            this.handleSearchResponse(data, isNewSearch);

            if (data.products) {
                this.displayResults(data.products, query, isNewSearch, data.pagination);
            }

        } catch (error) {

            this.showError(t('search_error', 'Search error'));
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }

    showFilters() {
        if (this.filtersPanel) {
            this.filtersPanel.style.display = 'block';
        }
    }

    createBasicFilters() {

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

    handleFilterChange(e) {
        const filterType = e.target.dataset.filterType;
        const value = e.target.value;
        const isChecked = e.target.checked;

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

        const query = this.searchInput ? this.searchInput.value.trim() : '';
        if (query.length >= this.minQueryLength || Object.keys(this.activeFilters).length > 0) {
            this.performSearchWithFilters(query, 1, true);
        }
    }

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

        const query = this.searchInput ? this.searchInput.value.trim() : '';
        if (query.length >= this.minQueryLength || Object.keys(this.activeFilters).length > 0) {
            this.performSearchWithFilters(query, 1, true);
        }
    }

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


    }

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

            document.querySelectorAll('.search-filters-panel input').forEach(cb => {
                if (cb.dataset.filterType !== filterType) return;
                cb.checked = false;
            });
        }

        this.updateActiveFiltersDisplay();

        const query = this.searchInput ? this.searchInput.value.trim() : '';
        if (query.length >= this.minQueryLength || Object.keys(this.activeFilters).length > 0) {
            this.performSearchWithFilters(query, 1, true);
        }
    }

    clearAllFilters() {
        this.activeFilters = {};

        document.querySelectorAll('.search-filters-panel input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });

        document.querySelectorAll('.price-min, .price-max').forEach(input => {
            input.value = '';
        });

        this.updateActiveFiltersDisplay();

        const query = this.searchInput ? this.searchInput.value.trim() : '';
        if (query.length >= this.minQueryLength) {
            this.performSearchWithFilters(query, 1, true);
        }
    }

    displayResults(products, query, isNewSearch, pagination) {

        if (typeof window.originalDisplayResults === 'function') {
            window.originalDisplayResults(products, query, isNewSearch, pagination ? pagination.total_products : 0);
        } else {

            this.displayResultsFallback(products, query, isNewSearch, pagination);
        }
    }

    displayResultsFallback(products, query, isNewSearch, pagination) {
        if (!this.resultsContainer) return;

        if (isNewSearch) {
            this.resultsContainer.innerHTML = '';

            if (pagination && pagination.total_products > 0) {
                const countDiv = document.createElement('div');
                countDiv.className = 'search-results-count';

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

    createProductElement(product) {
        const item = document.createElement('div');
        item.className = 'search-result-item';

        const imageDiv = document.createElement('div');
        imageDiv.className = 'result-image';

        const img = document.createElement('img');
        img.src = window.dropdownsearchSecurity.url(product.image) || '/img/p/en-default-medium_default.jpg';
        img.alt = product.name || '';
        img.onerror = function() {
            this.onerror = null;
            this.src = '/img/p/en-default-medium_default.jpg';
        };
        imageDiv.appendChild(img);

        const infoDiv = document.createElement('div');
        infoDiv.className = 'search-result-info';

        const title = document.createElement('h4');
        title.className = 'result-title';
        title.textContent = product.name || '';

        if (product.reference) {
            const refDiv = document.createElement('div');
            refDiv.className = 'result-reference';
            refDiv.textContent = t('ref', 'Ref') + ': ' + product.reference;
            infoDiv.appendChild(refDiv);
        }

        if (product.manufacturer) {
            const manufacturerDiv = document.createElement('div');
            manufacturerDiv.className = 'result-manufacturer';
            manufacturerDiv.textContent = product.manufacturer;
            infoDiv.appendChild(manufacturerDiv);
        }

        if (product.description_short) {
            const desc = document.createElement('p');
            desc.className = 'search-result-description';
            desc.textContent = product.description_short;
            infoDiv.appendChild(desc);
        }

        const priceDiv = document.createElement('div');
        priceDiv.className = 'search-result-price';
        priceDiv.textContent = product.price || '';

        const stockDiv = document.createElement('div');
        stockDiv.className = `result-stock ${product.in_stock ? 'in-stock' : 'out-of-stock'}`;

        const stockText = product.in_stock
            ? `${t('in_stock', 'In stock')} (${product.quantity})`
            : t('out_of_stock', 'Out of stock');

        stockDiv.textContent = stockText;

        infoDiv.appendChild(title);
        infoDiv.appendChild(priceDiv);
        infoDiv.appendChild(stockDiv);

        item.appendChild(imageDiv);
        item.appendChild(infoDiv);

        const productUrl = window.dropdownsearchSecurity.url(product.link);
        if (productUrl) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', function() {
                window.open(productUrl, '_blank', 'noopener,noreferrer');
            });
        }

        return item;
    }

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

    getActiveFilters() {
        return this.activeFilters;
    }

    setActiveFilters(filters) {
        this.activeFilters = window.dropdownsearchSecurity.filters(filters);
        this.updateActiveFiltersDisplay();

        this.applyFiltersToUI();
    }

    applyFiltersToUI() {

        document.querySelectorAll('.search-filters-panel input').forEach(input => {
            input.checked = false;
            if (input.type === 'number') input.value = '';
        });

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

window.SearchFiltersManager = SearchFiltersManager;
