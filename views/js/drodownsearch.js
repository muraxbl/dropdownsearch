/**
 * JavaScript para el módulo de búsqueda desplegable
 * modules/dropdownsearch/views/js/dropdownsearch.js
 */

document.addEventListener('DOMContentLoaded', function() {
    
    // Variables principales
    const moduleConfig = window.dropdownsearchConfig || {};
    const triggerSelector = moduleConfig.triggerSelector || '#search-icon';
    const searchOverlay = document.getElementById('dropdown-search-overlay');
    const searchInput = document.getElementById('dropdown-search-input');
    const closeBtn = document.getElementById('close-search');
    const searchResults = document.getElementById('search-results');
    const resultsContainer = document.querySelector('.search-results-list');
    const loadingDiv = document.querySelector('.search-loading');
    const noResultsDiv = document.querySelector('.no-results');
    
    let searchTimeout;
    let currentRequest;
    let searchTriggers;
    
    try {
        searchTriggers = document.querySelectorAll(triggerSelector);
    } catch (error) {
        console.warn('DropdownSearch: invalid trigger selector', triggerSelector);
        return;
    }

    // Verificar que existe el elemento de activación
    if (!searchTriggers.length) {
        console.warn('DropdownSearch: trigger selector not found', triggerSelector);
        return;
    }
    
    /**
     * Inicializar eventos
     */
    function initEvents() {
        // Evento click en elemento de activación
        searchTriggers.forEach(function(searchTrigger) {
            searchTrigger.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                openSearch();
            });
        });
        
        // Evento click en botón cerrar
        closeBtn.addEventListener('click', function(e) {
            e.preventDefault();
            closeSearch();
        });
        
        // Evento click en overlay (cerrar al hacer click fuera)
        searchOverlay.addEventListener('click', function(e) {
            if (e.target === searchOverlay) {
                closeSearch();
            }
        });
        
        // Evento keyup en input de búsqueda
        searchInput.addEventListener('keyup', function(e) {
            if (e.key === 'Escape') {
                closeSearch();
                return;
            }
            
            const query = this.value.trim();
            
            // Limpiar timeout anterior
            clearTimeout(searchTimeout);
            
            if (query.length >= 2) {
                // Delay moderado antes de buscar (500ms)
                searchTimeout = setTimeout(() => {
                    performSearch(query);
                }, 500);
            } else {
                clearResults();
            }
        });
        
        // Evento keydown para navegación con teclado
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                focusFirstResult();
            }
        });
        
        // Navegación con teclado en resultados
        document.addEventListener('keydown', function(e) {
            if (!searchOverlay.classList.contains('active')) return;
            
            const focusedElement = document.activeElement;
            const results = resultsContainer.querySelectorAll('.search-result-item');
            
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                navigateResults(e.key, results, focusedElement);
            } else if (e.key === 'Enter' && focusedElement.classList.contains('search-result-item')) {
                focusedElement.click();
            }
        });
    }
    
    /**
     * Abrir búsqueda
     */
    function openSearch() {
        searchOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Focus en input con pequeño delay para animación
        setTimeout(() => {
            searchInput.focus();
        }, 100);
    }
    
    /**
     * Cerrar búsqueda
     */
    function closeSearch() {
        searchOverlay.classList.remove('active');
        document.body.style.overflow = '';
        searchInput.value = '';
        clearResults();
        
        // Cancelar peticiones pendientes
        if (currentRequest) {
            currentRequest.abort();
        }
        clearTimeout(searchTimeout);
    }
    
    /**
     * Realizar búsqueda AJAX
     */
    function performSearch(query) {
        // Cancelar petición anterior si existe
        if (currentRequest) {
            currentRequest.abort();
        }
        
        showLoading();
        
        // Crear petición AJAX
        currentRequest = new XMLHttpRequest();
        
        // URL del módulo para peticiones AJAX
        const ajaxUrl = baseDir + 'modules/dropdownsearch/ajax-search.php';
        
        currentRequest.open('POST', ajaxUrl, true);
        currentRequest.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        currentRequest.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        
        currentRequest.onreadystatechange = function() {
            if (this.readyState === 4) {
                if (this.status === 200) {
                    try {
                        const results = JSON.parse(this.responseText);
                        displayResults(results);
                    } catch (error) {
                        console.error('Error parsing JSON:', error);
                        showError('Error al procesar los resultados');
                    }
                } else if (this.status !== 0) { // 0 = aborted
                    console.error('Error en la petición:', this.status);
                    showError('Error en la búsqueda');
                }
                hideLoading();
            }
        };
        
        currentRequest.onerror = function() {
            console.error('Error de red');
            showError('Error de conexión');
            hideLoading();
        };
        
        // Enviar petición
        currentRequest.send('action=search&query=' + encodeURIComponent(query));
    }
    
    /**
     * Mostrar loading
     */
    function showLoading() {
        loadingDiv.style.display = 'block';
        resultsContainer.style.display = 'none';
        noResultsDiv.style.display = 'none';
    }
    
    /**
     * Ocultar loading
     */
    function hideLoading() {
        loadingDiv.style.display = 'none';
    }
    
    /**
     * Mostrar error
     */
    function showError(message) {
        resultsContainer.innerHTML = `
            <div class="search-error">
                <p style="text-align: center; padding: 20px; color: #e74c3c;">
                    ${message}
                </p>
            </div>
        `;
        resultsContainer.style.display = 'block';
        noResultsDiv.style.display = 'none';
    }
    
    /**
     * Mostrar resultados
     */
    function displayResults(results) {
        if (results.length === 0) {
            noResultsDiv.style.display = 'block';
            resultsContainer.style.display = 'none';
            return;
        }
        
        let html = '';
        results.forEach((product, index) => {
            const imageHtml = product.image 
                ? `<img src="${product.image}" alt="${product.name}" class="search-result-image" loading="lazy">`
                : `<div class="search-result-image-placeholder">Sin imagen</div>`;
            
            const description = product.description_short 
                ? truncateText(product.description_short, 80)
                : '';
                
            html += `
                <a href="${product.link}" class="search-result-item" tabindex="0" style="animation-delay: ${0.1 + (index * 0.05)}s">
                    ${imageHtml}
                    <div class="search-result-info">
                        <div class="search-result-name">${highlightQuery(product.name, searchInput.value)}</div>
                        ${description ? `<div class="search-result-description">${description}</div>` : ''}
                        <div class="search-result-price">${product.price}</div>
                    </div>
                </a>
            `;
        });
        
        resultsContainer.innerHTML = html;
        resultsContainer.style.display = 'block';
        noResultsDiv.style.display = 'none';
        
        // Añadir eventos click a los resultados
        addResultsEvents();
    }
    
    /**
     * Añadir eventos a los resultados
     */
    function addResultsEvents() {
        const resultItems = resultsContainer.querySelectorAll('.search-result-item');
        resultItems.forEach(item => {
            item.addEventListener('click', function(e) {
                // El enlace se manejará naturalmente
                closeSearch();
            });
        });
    }
    
    /**
     * Limpiar resultados
     */
    function clearResults() {
        resultsContainer.innerHTML = '';
        resultsContainer.style.display = 'none';
        noResultsDiv.style.display = 'none';
        hideLoading();
    }
    
    /**
     * Navegación con teclado
     */
    function navigateResults(direction, results, currentFocus) {
        if (results.length === 0) return;
        
        let currentIndex = -1;
        for (let i = 0; i < results.length; i++) {
            if (results[i] === currentFocus) {
                currentIndex = i;
                break;
            }
        }
        
        if (direction === 'ArrowDown') {
            currentIndex = currentIndex < results.length - 1 ? currentIndex + 1 : 0;
        } else if (direction === 'ArrowUp') {
            currentIndex = currentIndex > 0 ? currentIndex - 1 : results.length - 1;
        }
        
        if (currentIndex >= 0) {
            results[currentIndex].focus();
        }
    }
    
    /**
     * Focus en primer resultado
     */
    function focusFirstResult() {
        const firstResult = resultsContainer.querySelector('.search-result-item');
        if (firstResult) {
            firstResult.focus();
        }
    }
    
    /**
     * Truncar texto
     */
    function truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength).trim() + '...';
    }
    
    /**
     * Resaltar query en texto
     */
    function highlightQuery(text, query) {
        if (!query || query.length < 2) return text;
        
        const regex = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
        return text.replace(regex, '<strong>$1</strong>');
    }
    
    // Inicializar cuando el DOM esté listo
    initEvents();
    
    // Verificar si baseDir está definido, si no, usar valor por defecto
    if (typeof baseDir === 'undefined') {
        window.baseDir = '/';
        console.warn('baseDir no definido, usando valor por defecto "/"');
    }
});
