/**
 * Módulo de Búsqueda Desplegable
 * JavaScript corregido para usar ajax-search.php
 */

document.addEventListener('DOMContentLoaded', function() {
    // Variables principales
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

    // Debug: verificar elementos
    /*console.log('🔍 Elements found:', {
        triggerSelector: triggerSelector,
        searchOverlay: !!searchOverlay,
        searchInput: !!searchInput,
        closeBtn: !!closeBtn
    });*/

    // Variables de control
    let searchTimeout;
    let currentRequest;
    
    // NUEVO: Variables para paginación lazy
    let currentQuery = '';
    let currentPage = 1;
    let isLoading = false;
    let hasMoreResults = true;
    let totalResults = 0;
    
    // NUEVO: Sistema de historial de búsqueda (en memoria)
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

    // Event Listeners adicionales - RESTAURADOS
    if (closeBtn) {
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            hideSearchOverlay();
        });
    }

    // Cerrar con ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && searchOverlay && searchOverlay.classList.contains('active')) {
            hideSearchOverlay();
        }
    });

    // Cerrar al hacer click fuera
    if (searchOverlay) {
        searchOverlay.addEventListener('click', function(e) {
            if (e.target === searchOverlay) {
                hideSearchOverlay();
            }
        });
    }

    // Búsqueda con delay - RESTAURADO + HISTORIAL
    if (searchInput) {
        // NUEVO: Crear contenedor de historial dinámicamente
        historyContainer = document.createElement('div');
        historyContainer.className = 'search-history';
        historyContainer.style.display = 'none';
        
        // Insertar historial después del input
        searchInput.parentNode.insertBefore(historyContainer, searchInput.nextSibling);
        
        // Mostrar historial al hacer focus (si hay)
        searchInput.addEventListener('focus', function() {
            if (searchHistory.length > 0 && this.value.trim() === '') {
                showSearchHistory();
            }
        });
        
        searchInput.addEventListener('input', function() {
            const query = this.value.trim();
            
            // Ocultar historial si hay texto
            if (query.length > 0) {
                hideSearchHistory();
            } else if (searchHistory.length > 0) {
                showSearchHistory();
            }
            
            // Cancelar búsqueda anterior
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

            // NUEVO: Resetear paginación para nueva búsqueda
            if (query !== currentQuery) {
                currentQuery = query;
                currentPage = 1;
                hasMoreResults = true;
                totalResults = 0;
                clearResults();
            }

            // Delay para evitar demasiadas peticiones
            searchTimeout = setTimeout(function() {
                performSearch(query, 1, true); // true = nueva búsqueda
            }, typingDelay);
        });

        // Submit en Enter
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
        
        // NUEVO: Scroll infinito para cargar más resultados - MEJORADO
        if (searchResults) {
            searchResults.addEventListener('scroll', function() {
                // Solo cargar si está cerca del final (margen más pequeño para mejor UX)
                if (this.scrollTop + this.clientHeight >= this.scrollHeight - 200 && 
                    hasMoreResults && !isLoading && currentQuery.length >= minQueryLength) {
                    
                    const nextPage = currentPage + 1;
                    console.log(`🔄 Solicitando página ${nextPage} para query: "${currentQuery}"`);
                    
                    // Ocultar inmediatamente el indicador "desplázate para cargar más"
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

    /**
     * Mostrar overlay de búsqueda
     */
    function showSearchOverlay() {
       // console.log('🔍 showSearchOverlay called');
        //console.log('🔍 searchOverlay element:', !!searchOverlay);
        
        if (searchOverlay) {
            //console.log('🔍 Showing overlay...');
            // CORREGIDO: Solo usar clase active, como funcionaba antes
            updateOverlayPosition();
            searchOverlay.classList.add('active');
            document.body.classList.add('search-overlay-open');
            
            if (searchInput) {
                setTimeout(function() {
                    searchInput.focus();
                    //console.log('🔍 Input focused');
                }, 100);
            } else {
                console.warn('❌ searchInput not found');
            }
        } else {
            console.error('❌ searchOverlay element not found!');
        }
    }

    /**
     * Ocultar overlay de búsqueda
     */
    function hideSearchOverlay() {
        if (searchOverlay) {
            // CORREGIDO: Solo remover clase active
            searchOverlay.classList.remove('active');
            document.body.classList.remove('search-overlay-open');
            resetOverlayPosition();
            clearResults();
            
            if (searchInput) {
                searchInput.value = '';
            }
        }
    }

    /**
     * Realizar búsqueda - ACTUALIZADO para paginación lazy
     */
    function performSearch(query, page = 1, isNewSearch = true) {
       // console.log(`🔍 performSearch llamado con: query="${query}", page=${page}, isNewSearch=${isNewSearch}`);
        //console.log(`📊 Estado actual: currentPage=${currentPage}, hasMoreResults=${hasMoreResults}`);
        
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
            // Mostrar indicador de carga para más resultados
            showLoadingMore();
        }
        
        isLoading = true;

        // Cancelar petición anterior solo si es nueva búsqueda
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
                    //console.log('🔍 Raw response:', this.responseText);
                    
                    try {
                        const response = JSON.parse(this.responseText);
                        //console.log('🔍 Parsed response:', response);

                        if (window.enhancedSearchFilters && typeof window.enhancedSearchFilters.handleSearchResponse === 'function') {
                            window.enhancedSearchFilters.handleSearchResponse(response, isNewSearch);
                        }
                        
                        // Manejar nuevo formato con paginación
                        if (response.products && Array.isArray(response.products)) {
                            //console.log(response.products);
                            if (response.products.length > 0) {
                                // Actualizar variables de paginación
                                if (response.pagination) {
                                    const previousPage = currentPage;
                                    currentPage = response.pagination.current_page; // CORREGIDO: actualizar la página actual
                                    hasMoreResults = response.pagination.has_more;
                                    totalResults = response.pagination.total_products;
                                    
                                    //console.log(`📄 Página actualizada de ${previousPage} a ${currentPage}. Más resultados: ${hasMoreResults}, Total: ${totalResults}`);
                                }
                                
                                if (isNewSearch) {
                                    addToSearchHistory(query);
                                }
                                displayResults(response.products, query, isNewSearch, totalResults);
                            } else {
                                if (isNewSearch) {
                                    displayNoResults(query);
                                } else {
                                    // No hay más resultados en esta página
                                    hasMoreResults = false;
                                    console.log('🔚 No hay más resultados disponibles');
                                }
                            }
                        }
                        // Compatibilidad con formato antiguo (por si acaso)
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
                        // Manejar errores del servidor
                        else if (response.error) {
                            console.error('Error de búsqueda:', response.error);
                            if (isNewSearch) {
                                displayNoResults(query);
                            }
                        }
                        
                    } catch (error) {
                        console.error('Error parsing search results:', error);
                        console.error('Response was:', this.responseText);
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

        // Enviar parámetros incluyendo página
        const activeFilters = window.enhancedSearchFilters && typeof window.enhancedSearchFilters.getActiveFilters === 'function'
            ? window.enhancedSearchFilters.getActiveFilters()
            : {};

        const params = 'search_query=' + encodeURIComponent(query) +
                      '&page=' + page +
                      '&limit=' + pageLimit +
                      '&filters=' + encodeURIComponent(JSON.stringify(activeFilters));
        
        //console.log(`📤 Enviando petición: ${params}`);
        currentRequest.send(params);
    }

    /**
     * Mostrar loading
     */
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

    /**
     * Ocultar loading
     */
    function hideLoading() {
        if (loadingDiv) {
            loadingDiv.style.display = 'none';
        }
    }

    /**
     * Mostrar resultados - ACTUALIZADO para mejor UX de paginación
     */
    function displayResults(results, query, isNewSearch = true, totalFound = 0) {
        if (!resultsContainer || !Array.isArray(results)) {
            displayNoResults(query);
            return;
        }

        // Si es nueva búsqueda, limpiar resultados anteriores
        if (isNewSearch) {
            resultsContainer.innerHTML = '';
            
            // Añadir contador de resultados si está disponible
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

        // Remover indicador anterior antes de añadir nuevos productos
        const oldLoadMoreDiv = document.querySelector('.load-more-indicator');
        if (oldLoadMoreDiv) {
            oldLoadMoreDiv.remove();
        }

        // Generar HTML de resultados y añadirlos con pequeña animación
        results.forEach(function(product, index) {
            const resultItem = createResultItem(product);
            
            // Animación sutil de entrada para nuevos elementos (solo si no es nueva búsqueda)
            if (!isNewSearch) {
                resultItem.style.opacity = '0';
                resultItem.style.transform = 'translateY(20px)';
                resultsContainer.appendChild(resultItem);
                
                // Animar entrada con delay progresivo
                setTimeout(() => {
                    resultItem.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    resultItem.style.opacity = '1';
                    resultItem.style.transform = 'translateY(0)';
                }, index * 50); // 50ms de delay entre cada producto
            } else {
                resultsContainer.appendChild(resultItem);
            }
        });

        // Mostrar contenedor de resultados
        resultsContainer.style.display = 'block';
        if (noResultsDiv) {
            noResultsDiv.style.display = 'none';
        }
        
        // Añadir indicador de "cargar más" al final si hay más resultados
        if (hasMoreResults && !isNewSearch) {
            // Esperar a que terminen las animaciones antes de mostrar el indicador
            setTimeout(() => {
                addLoadMoreIndicator();
            }, results.length * 50 + 200);
        } else if (hasMoreResults && isNewSearch) {
            addLoadMoreIndicator();
        }
        
        // Si no hay más resultados, añadir indicador de "fin"
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
    
    /**
     * Añadir indicador de "cargar más"
     */
    function addLoadMoreIndicator() {
        if (!document.querySelector('.load-more-indicator') && hasMoreResults) {
            const loadMoreDiv = document.createElement('div');
            loadMoreDiv.className = 'load-more-indicator';
            loadMoreDiv.innerHTML = '<p><i class="scroll-icon">↓</i> Desplázate para cargar más resultados...</p>';
            
            // Animación de entrada
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
    
    /**
     * Añadir indicador de "fin de resultados"
     */
    function addEndIndicator() {
        if (!document.querySelector('.end-results-indicator')) {
            const endDiv = document.createElement('div');
            endDiv.className = 'end-results-indicator';
            endDiv.innerHTML = '<p>✓ Has visto todos los resultados</p>';
            
            // Animación de entrada
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

    /**
     * Mostrar loading para más resultados
     */
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

    /**
     * Ocultar loading para más resultados
     */
    function hideLoadingMore() {
        const loadingMoreDiv = document.querySelector('.loading-more');
        if (loadingMoreDiv) {
            loadingMoreDiv.style.display = 'none';
        }
    }

    /**
     * Crear elemento de resultado
     */
    function createResultItem(product) {
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
        const contentDiv = document.createElement('div');
        contentDiv.className = 'result-content';

        const title = document.createElement('h4');
        title.className = 'result-title';
        title.textContent = product.name || '';

        const description = document.createElement('p');
        description.className = 'result-description';
        description.textContent = product.description_short || '';

        const priceDiv = document.createElement('div');
        priceDiv.className = 'result-price';
        priceDiv.textContent = product.price || '';

        // Referencia si existe
        if (product.reference) {
            const refDiv = document.createElement('div');
            refDiv.className = 'result-reference';
            refDiv.textContent = t('ref', 'Ref') + ': ' + product.reference;
            contentDiv.appendChild(refDiv);
        }

        contentDiv.appendChild(title);
        contentDiv.appendChild(priceDiv);

        // Ensamblar item
        item.appendChild(imageDiv);
        item.appendChild(contentDiv);

        // Click handler para ir al producto
        const productUrl = window.dropdownsearchSecurity.url(product.link);
        if (productUrl) {
            item.style.cursor = 'pointer';
            item.addEventListener('click', function() {
                window.location.href = productUrl;
            });
        }

        return item;
    }

    /**
     * Mostrar mensaje de no resultados
     */
    function displayNoResults(query) {
        if (resultsContainer) {
            resultsContainer.style.display = 'none';
        }
        
        if (noResultsDiv) {
            noResultsDiv.textContent = t('no_results', 'No results found') + ' \"' + (query || '') + '\"';
            noResultsDiv.style.display = 'block';
        }
    }

    /**
     * Limpiar resultados
     */
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
    
    // NUEVO: Funciones de historial de búsqueda
    
    /**
     * Añadir término al historial
     */
    function addToSearchHistory(query) {
        if (!query || query.length < minQueryLength) return;
        
        // Evitar duplicados
        const existingIndex = searchHistory.findIndex(item => 
            item.query.toLowerCase() === query.toLowerCase()
        );
        
        if (existingIndex > -1) {
            // Mover al principio si ya existe
            searchHistory.unshift(searchHistory.splice(existingIndex, 1)[0]);
        } else {
            // Añadir nuevo al principio
            searchHistory.unshift({
                query: query,
                timestamp: new Date().toISOString(),
                count: 1
            });
        }
        
        // Mantener solo los últimos MAX_HISTORY_ITEMS
        if (searchHistory.length > MAX_HISTORY_ITEMS) {
            searchHistory = searchHistory.slice(0, MAX_HISTORY_ITEMS);
        }
        
        //console.log('📝 Historial actualizado:', searchHistory);
    }
    
    /**
     * Mostrar historial de búsqueda
     */
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
            
            // Click para usar búsqueda del historial
            historyItem.addEventListener('click', function(e) {
                if (!e.target.classList.contains('history-delete')) {
                    const query = this.getAttribute('data-query');
                    searchInput.value = query;
                    hideSearchHistory();
                    performSearch(query);
                }
            });
            
            // Click para eliminar del historial
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
    
    /**
     * Ocultar historial
     */
    function hideSearchHistory() {
        if (historyContainer) {
            historyContainer.style.display = 'none';
            showingHistory = false;
        }
    }
    
    /**
     * Eliminar elemento del historial
     */
    function removeFromHistory(index) {
        if (index >= 0 && index < searchHistory.length) {
            searchHistory.splice(index, 1);
            if (searchHistory.length > 0) {
                showSearchHistory(); // Refrescar vista
            } else {
                hideSearchHistory();
            }
        }
    }
    
    /**
     * Navegar por historial con flechas
     */
    function navigateHistory(direction) {
        // Implementación básica - seleccionar siguiente/anterior
        const historyItems = historyContainer.querySelectorAll('.history-item');
        if (historyItems.length === 0) return;
        
        // Por simplicidad, seleccionar el primero con flecha abajo
        if (direction > 0 && historyItems[0]) {
            const query = historyItems[0].getAttribute('data-query');
            searchInput.value = query;
            hideSearchHistory();
        }
    }
    
    /**
     * Formatear tiempo transcurrido
     */
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
