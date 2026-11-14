document.addEventListener('DOMContentLoaded', function() {

    const moduleConfig = window.dropdownsearchConfig || {};
    const triggerSelector = moduleConfig.triggerSelector || '#search-icon';
    const typingDelay = Number.isFinite(parseInt(moduleConfig.typingDelay, 10)) ? Math.max(0, parseInt(moduleConfig.typingDelay, 10)) : 300;
    const minQueryLength = Number.isFinite(parseInt(moduleConfig.minQueryLength, 10)) ? Math.max(1, parseInt(moduleConfig.minQueryLength, 10)) : 2;
    const pageLimit = Number.isFinite(parseInt(moduleConfig.pageLimit, 10)) ? Math.max(1, parseInt(moduleConfig.pageLimit, 10)) : 20;
    const searchOverlay = document.getElementById('dropdown-search-overlay');
    const layoutMode = searchOverlay && searchOverlay.classList.contains('dropdown-search-overlay--below_input')
        ? 'below_input'
        : (moduleConfig.layoutMode || 'fullscreen');
    const dropdownWidth = searchOverlay && searchOverlay.classList.contains('dropdown-search-overlay--full_width')
        ? 'full_width'
        : (moduleConfig.dropdownWidth || 'popup');
    const searchInput = document.getElementById('dropdown-search-input');
    const closeBtn = document.getElementById('close-search');
    const searchResults = document.getElementById('search-results');
    const resultsContainer = document.querySelector('.search-results-list');
    const loadingDiv = document.querySelector('.search-loading');
    const noResultsDiv = document.querySelector('.no-results');

    let searchTimeout;
    let currentRequest;

    let currentQuery = '';
    let currentPage = 1;
    let isLoading = false;
    let hasMoreResults = true;
    let totalResults = 0;

    let searchHistory = [];
    const MAX_HISTORY_ITEMS = 10;
    let historyContainer;
    let showingHistory = false;
    let activeTriggerElement = null;

    let searchTriggers;

    try {
        searchTriggers = document.querySelectorAll(triggerSelector);
    } catch (error) {
        console.warn('DropdownSearch: invalid trigger selector', triggerSelector);
        return;
    }

    if (!searchTriggers.length) {
        console.warn('DropdownSearch: trigger selector not found', triggerSelector);
        return;
    }

    searchTriggers.forEach(function(searchTrigger) {
        searchTrigger.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            activeTriggerElement = searchTrigger;
            showSearchOverlay();
        });
    });

    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            hideSearchOverlay();
        });
    }

    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && searchOverlay && searchOverlay.classList.contains('active')) {
            hideSearchOverlay();
        }
    });

    if (searchOverlay) {
        searchOverlay.addEventListener('click', function(e) {
            if (e.target === searchOverlay) {
                hideSearchOverlay();
            }
        });
    }

    if (searchInput) {

        historyContainer = document.createElement('div');
        historyContainer.className = 'search-history';
        historyContainer.style.display = 'none';

        searchInput.parentNode.insertBefore(historyContainer, searchInput.nextSibling);

        searchInput.addEventListener('focus', function() {
            if (searchHistory.length > 0 && this.value.trim() === '') {
                showSearchHistory();
            }
        });

        searchInput.addEventListener('input', function() {
            const query = this.value.trim();

            if (query.length > 0) {
                hideSearchHistory();
            } else if (searchHistory.length > 0) {
                showSearchHistory();
            }

            if (searchTimeout) {
                clearTimeout(searchTimeout);
            }

            if (currentRequest) {
                currentRequest.abort();
                currentRequest = null;
            }

            if (query.length < minQueryLength) {
                clearResults();
                return;
            }

            if (query !== currentQuery) {
                currentQuery = query;
                currentPage = 1;
                hasMoreResults = true;
                totalResults = 0;
                clearResults();
            }

            searchTimeout = setTimeout(function() {
                performSearch(query, 1, true);
            }, typingDelay);
        });

        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                const query = this.value.trim();
                if (query.length >= minQueryLength) {
                    hideSearchHistory();
                    currentQuery = query;
                    currentPage = 1;
                    hasMoreResults = true;
                    clearResults();
                    performSearch(query, 1, true);
                }
            } else if (e.key === 'ArrowDown' && showingHistory) {
                e.preventDefault();
                navigateHistory(1);
            } else if (e.key === 'ArrowUp' && showingHistory) {
                e.preventDefault();
                navigateHistory(-1);
            }
        });

        if (searchResults) {
            searchResults.addEventListener('scroll', function() {

                if (this.scrollTop + this.clientHeight >= this.scrollHeight - 200 &&
                    hasMoreResults && !isLoading && currentQuery.length >= minQueryLength) {

                    const nextPage = currentPage + 1;

                    const loadMoreIndicator = document.querySelector('.load-more-indicator');
                    if (loadMoreIndicator) {
                        loadMoreIndicator.style.opacity = '0';
                        setTimeout(() => loadMoreIndicator.remove(), 300);
                    }

                    performSearch(currentQuery, nextPage, false);
                }
            });
        }
    }

    function showSearchOverlay() {

        if (searchOverlay) {

            updateOverlayPosition();
            searchOverlay.classList.add('active');
            document.body.classList.add('search-overlay-open');

            if (searchInput) {
                setTimeout(function() {
                    searchInput.focus();

                }, 100);
            } else {
                console.warn('DropdownSearch: search input not found');
            }
        } else {
            console.error('DropdownSearch: search overlay not found');
        }
    }

    function hideSearchOverlay() {
        if (searchOverlay) {

            searchOverlay.classList.remove('active');
            document.body.classList.remove('search-overlay-open');
            resetOverlayPosition();
            clearResults();

            if (searchInput) {
                searchInput.value = '';
            }
        }
    }

    function performSearch(query, page = 1, isNewSearch = true) {

        if (!query || query.length < minQueryLength) {
            clearResults();
            return;
        }

        document.dispatchEvent(new CustomEvent('dropdownsearch:search', {
            detail: {
                query: query,
                page: page,
                isNewSearch: isNewSearch
            }
        }));

        if (isNewSearch) {
            showLoading();
            hideSearchHistory();
        } else {

            showLoadingMore();
        }

        isLoading = true;

        if (currentRequest && isNewSearch) {
            currentRequest.abort();
        }

        const searchUrl = '/modules/dropdownsearch/ajax-search.php';

        currentRequest = new XMLHttpRequest();
        currentRequest.open('POST', searchUrl, true);
        currentRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        currentRequest.setRequestHeader('X-Requested-With', 'XMLHttpRequest');

        currentRequest.onreadystatechange = function() {
            if (this.readyState === 4) {
                isLoading = false;

                if (this.status === 200) {

                    try {
                        const response = JSON.parse(this.responseText);

                        if (window.enhancedSearchFilters && typeof window.enhancedSearchFilters.handleSearchResponse === 'function') {
                            window.enhancedSearchFilters.handleSearchResponse(response, isNewSearch);
                        }

                        if (response.products && Array.isArray(response.products)) {

                            if (response.products.length > 0) {

                                if (response.pagination) {
                                    currentPage = response.pagination.current_page;
                                    hasMoreResults = response.pagination.has_more;
                                    totalResults = response.pagination.total_products;

                                }

                                if (isNewSearch) {
                                    addToSearchHistory(query);
                                }
                                displayResults(response.products, query, isNewSearch, totalResults);
                            } else {
                                if (isNewSearch) {
                                    displayNoResults(query);
                                } else {

                                    hasMoreResults = false;
                                }
                            }
                        }

                        else if (Array.isArray(response)) {
                            if (response.length > 0) {
                                addToSearchHistory(query);
                                displayResults(response, query, isNewSearch);
                            } else {
                                if (isNewSearch) {
                                    displayNoResults(query);
                                }
                            }
                        }

                        else if (response.error) {
                            console.error('Error de búsqueda:', response.error);
                            if (isNewSearch) {
                                displayNoResults(query);
                            }
                        }

                    } catch (error) {
                        console.error('Error parsing search results:', error);
                        if (isNewSearch) {
                            displayNoResults(query);
                        }
                    }
                } else if (this.status !== 0) {
                    console.error('Error en la petición:', this.status, this.statusText);
                    if (isNewSearch) {
                        displayNoResults(query);
                    }
                }

                hideLoading();
                hideLoadingMore();
            }
        };

        const activeFilters = window.enhancedSearchFilters && typeof window.enhancedSearchFilters.getActiveFilters === 'function'
            ? window.enhancedSearchFilters.getActiveFilters()
            : {};

        const params = 'search_query=' + encodeURIComponent(query) +
                      '&page=' + page +
                      '&limit=' + pageLimit +
                      '&filters=' + encodeURIComponent(JSON.stringify(activeFilters));

        currentRequest.send(params);
    }

    function showLoading() {
        if (loadingDiv) {
            loadingDiv.style.display = 'block';
        }
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
        if (noResultsDiv) {
            noResultsDiv.style.display = 'none';
        }
    }

    function hideLoading() {
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
    }

    function displayResults(results, query, isNewSearch = true, totalFound = 0) {
        if (!resultsContainer || !Array.isArray(results)) {
            displayNoResults(query);
            return;
        }

        if (isNewSearch) {
            resultsContainer.innerHTML = '';

            if (totalFound > 0) {
                const countDiv = document.createElement('div');
                countDiv.className = 'search-results-count';
                const productText = totalFound === 1
                    ? t('product_found', 'product found')
                    : t('products_found', 'products found');
                countDiv.textContent = `${totalFound} ${productText}`;
                resultsContainer.appendChild(countDiv);
            }
        }

        const oldLoadMoreDiv = document.querySelector('.load-more-indicator');
        if (oldLoadMoreDiv) {
            oldLoadMoreDiv.remove();
        }

        results.forEach(function(product, index) {
            const resultItem = createResultItem(product);

            if (!isNewSearch) {
                resultItem.style.opacity = '0';
                resultItem.style.transform = 'translateY(20px)';
                resultsContainer.appendChild(resultItem);

                setTimeout(() => {
                    resultItem.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    resultItem.style.opacity = '1';
                    resultItem.style.transform = 'translateY(0)';
                }, index * 50);
            } else {
                resultsContainer.appendChild(resultItem);
            }
        });

        resultsContainer.style.display = 'block';
        if (noResultsDiv) {
            noResultsDiv.style.display = 'none';
        }

        if (hasMoreResults && !isNewSearch) {

            setTimeout(() => {
                addLoadMoreIndicator();
            }, results.length * 50 + 200);
        } else if (hasMoreResults && isNewSearch) {
            addLoadMoreIndicator();
        }

        if (!hasMoreResults && !isNewSearch) {
            setTimeout(() => {
                addEndIndicator();
            }, results.length * 50 + 200);
        }
    }

    function updateOverlayPosition() {
        if (!searchOverlay || layoutMode === 'fullscreen' || !activeTriggerElement) {
            return;
        }

        const rect = activeTriggerElement.getBoundingClientRect();
        const margin = 8;
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft || 0;
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop || 0;
        const popupWidth = Math.min(520, viewportWidth - (margin * 2));
        const viewportTop = Math.max(margin, rect.bottom + margin);
        const availableHeight = Math.max(240, viewportHeight - viewportTop - margin);

        searchOverlay.style.setProperty('--dropdownsearch-anchor-top', `${viewportTop + scrollTop}px`);
        searchOverlay.style.setProperty('--dropdownsearch-available-height', `${availableHeight}px`);

        if (dropdownWidth === 'full_width') {
            searchOverlay.style.setProperty('--dropdownsearch-anchor-left', `${scrollLeft + margin}px`);
            searchOverlay.style.setProperty('--dropdownsearch-anchor-width', `${viewportWidth - (margin * 2)}px`);
        } else {
            const left = scrollLeft + Math.min(Math.max(margin, rect.left), viewportWidth - popupWidth - margin);
            searchOverlay.style.setProperty('--dropdownsearch-anchor-left', `${left}px`);
            searchOverlay.style.setProperty('--dropdownsearch-anchor-width', `${popupWidth}px`);
        }
    }

    function resetOverlayPosition() {
        if (!searchOverlay) return;

        searchOverlay.style.removeProperty('--dropdownsearch-anchor-top');
        searchOverlay.style.removeProperty('--dropdownsearch-anchor-left');
        searchOverlay.style.removeProperty('--dropdownsearch-anchor-width');
        searchOverlay.style.removeProperty('--dropdownsearch-available-height');
    }

    window.addEventListener('resize', function() {
        if (searchOverlay && searchOverlay.classList.contains('active')) {
            updateOverlayPosition();
        }
    });

    window.addEventListener('scroll', function() {
        if (searchOverlay && searchOverlay.classList.contains('active') && layoutMode !== 'fullscreen') {
            updateOverlayPosition();
        }
    }, true);

    window.performSearch = performSearch;
    window.originalDisplayResults = displayResults;

    function addLoadMoreIndicator() {
        if (!document.querySelector('.load-more-indicator') && hasMoreResults) {
            const loadMoreDiv = document.createElement('div');
            loadMoreDiv.className = 'load-more-indicator';
            loadMoreDiv.innerHTML = '<p><i class="scroll-icon">↓</i> Desplázate para cargar más resultados...</p>';

            loadMoreDiv.style.opacity = '0';
            loadMoreDiv.style.transform = 'translateY(10px)';
            resultsContainer.appendChild(loadMoreDiv);

            setTimeout(() => {
                loadMoreDiv.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                loadMoreDiv.style.opacity = '1';
                loadMoreDiv.style.transform = 'translateY(0)';
            }, 100);
        }
    }

    function addEndIndicator() {
        if (!document.querySelector('.end-results-indicator')) {
            const endDiv = document.createElement('div');
            endDiv.className = 'end-results-indicator';
            endDiv.innerHTML = '<p>✓ Has visto todos los resultados</p>';

            endDiv.style.opacity = '0';
            endDiv.style.transform = 'translateY(10px)';
            resultsContainer.appendChild(endDiv);

            setTimeout(() => {
                endDiv.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                endDiv.style.opacity = '1';
                endDiv.style.transform = 'translateY(0)';
            }, 100);
        }
    }

    function showLoadingMore() {
        let loadingMoreDiv = document.querySelector('.loading-more');
        if (!loadingMoreDiv) {
            loadingMoreDiv = document.createElement('div');
            loadingMoreDiv.className = 'loading-more';
            loadingMoreDiv.innerHTML = '<p>Cargando más resultados...</p>';
            if (resultsContainer) {
                resultsContainer.appendChild(loadingMoreDiv);
            }
        }
        loadingMoreDiv.style.display = 'block';
    }

    function hideLoadingMore() {
        const loadingMoreDiv = document.querySelector('.loading-more');
        if (loadingMoreDiv) {
            loadingMoreDiv.style.display = 'none';
        }
    }

    function createResultItem(product) {
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

        const contentDiv = document.createElement('div');
        contentDiv.className = 'result-content';

        const title = document.createElement('h4');
        title.className = 'result-title';
        title.textContent = product.name || '';

        const priceDiv = document.createElement('div');
        priceDiv.className = 'result-price';
        priceDiv.textContent = product.price || '';

        if (product.reference) {
            const refDiv = document.createElement('div');
            refDiv.className = 'result-reference';
            refDiv.textContent = t('ref', 'Ref') + ': ' + product.reference;
            contentDiv.appendChild(refDiv);
        }

        contentDiv.appendChild(title);
        contentDiv.appendChild(priceDiv);

        item.appendChild(imageDiv);
        item.appendChild(contentDiv);

        const productUrl = window.dropdownsearchSecurity.url(product.link);
        if (productUrl) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', function() {
                window.location.href = productUrl;
            });
        }

        return item;
    }

    function displayNoResults(query) {
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }

        if (noResultsDiv) {
            noResultsDiv.textContent = t('no_results', 'No results found') + ' \"' + (query || '') + '\"';
            noResultsDiv.style.display = 'block';
        }
    }

    function clearResults() {
        if (resultsContainer) {
            resultsContainer.innerHTML = '';
            resultsContainer.style.display = 'none';
        }

        if (noResultsDiv) {
            noResultsDiv.style.display = 'none';
        }

        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
    }

    function addToSearchHistory(query) {
        if (!query || query.length < minQueryLength) return;

        const existingIndex = searchHistory.findIndex(item =>
            item.query.toLowerCase() === query.toLowerCase()
        );

        if (existingIndex > -1) {

            searchHistory.unshift(searchHistory.splice(existingIndex, 1)[0]);
        } else {

            searchHistory.unshift({
                query: query,
                timestamp: new Date().toISOString(),
                count: 1
            });
        }

        if (searchHistory.length > MAX_HISTORY_ITEMS) {
            searchHistory = searchHistory.slice(0, MAX_HISTORY_ITEMS);
        }

    }

    function showSearchHistory() {
        if (!historyContainer || searchHistory.length === 0) return;

        historyContainer.innerHTML = '<h4>Búsquedas recientes</h4>';

        searchHistory.forEach(function(item, index) {
            const historyItem = document.createElement('div');
            historyItem.className = 'history-item';
            historyItem.setAttribute('data-query', item.query);

            const querySpan = document.createElement('span');
            querySpan.className = 'history-query';
            querySpan.textContent = item.query;

            const timeSpan = document.createElement('span');
            timeSpan.className = 'history-time';
            timeSpan.textContent = formatTimeAgo(item.timestamp);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'history-delete';
            deleteBtn.innerHTML = '×';
            deleteBtn.setAttribute('data-index', index);

            historyItem.appendChild(querySpan);
            historyItem.appendChild(timeSpan);
            historyItem.appendChild(deleteBtn);

            historyItem.addEventListener('click', function(e) {
                if (!e.target.classList.contains('history-delete')) {
                    const query = this.getAttribute('data-query');
                    searchInput.value = query;
                    hideSearchHistory();
                    performSearch(query);
                }
            });

            deleteBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                const index = parseInt(this.getAttribute('data-index'));
                removeFromHistory(index);
            });

            historyContainer.appendChild(historyItem);
        });

        historyContainer.style.display = 'block';
        showingHistory = true;
    }

    function hideSearchHistory() {
        if (historyContainer) {
            historyContainer.style.display = 'none';
            showingHistory = false;
        }
    }

    function removeFromHistory(index) {
        if (index >= 0 && index < searchHistory.length) {
            searchHistory.splice(index, 1);
            if (searchHistory.length > 0) {
                showSearchHistory();
            } else {
                hideSearchHistory();
            }
        }
    }

    function navigateHistory(direction) {

        const historyItems = historyContainer.querySelectorAll('.history-item');
        if (historyItems.length === 0) return;

        if (direction > 0 && historyItems[0]) {
            const query = historyItems[0].getAttribute('data-query');
            searchInput.value = query;
            hideSearchHistory();
        }
    }

    function formatTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diff = Math.floor((now - time) / 1000);

        if (diff < 60) return 'hace un momento';
        if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
        return `hace ${Math.floor(diff / 86400)}d`;
    }
});
