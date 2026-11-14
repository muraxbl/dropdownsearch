/**
 * Sistema de Hash para URLs Compartibles
 * Integra con el buscador existente
 */

document.addEventListener('DOMContentLoaded', function() {
   // console.log('🔗 Search hash system loading...');
    
    setTimeout(function() {
        if (typeof window.searchHashSystem === 'undefined') {
            window.searchHashSystem = new SearchHashSystem();
        }
    }, 700); // Esperar a que se carguen otros sistemas
});

class SearchHashSystem {
    constructor() {
        this.version = 'v1';
        const moduleConfig = window.dropdownsearchConfig || {};
        this.minQueryLength = Number.isFinite(parseInt(moduleConfig.minQueryLength, 10)) ? Math.max(1, parseInt(moduleConfig.minQueryLength, 10)) : 2;
        this.init();
        //console.log('🔗 SearchHashSystem initialized');
    }

    init() {
        // Verificar si hay búsqueda en la URL al cargar
        this.checkUrlOnLoad();
        
        // Escuchar cambios en búsquedas para actualizar URL
        this.interceptSearches();
        
        // Crear botón de compartir
        this.addShareButton();
        
        // Escuchar cierre del buscador para limpiar hash
        this.listenForSearchClose();
        
        // Escuchar cambios en navegación
        window.addEventListener('popstate', () => {
            this.handleHashChange();
        });

        window.addEventListener('hashchange', () => {
            this.handleHashChange();
        });
    }

    /**
     * Escuchar cuando se cierra el buscador para limpiar el hash
     */
    listenForSearchClose() {
        // Método 1: Observar cambios en la clase del overlay
        const searchOverlay = document.getElementById('dropdown-search-overlay');
        if (searchOverlay) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                        // Si el overlay ya no tiene la clase 'active', limpiar hash
                        if (!searchOverlay.classList.contains('active')) {
                            this.clearHash();
                        }
                    }
                });
            });
            
            observer.observe(searchOverlay, { attributes: true });
        }
        
        // Método 2: Escuchar click en botón cerrar
        const closeBtn = document.getElementById('close-search');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.clearHash();
            });
        }
        
        // Método 3: Escuchar tecla Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const overlay = document.getElementById('dropdown-search-overlay');
                if (overlay && overlay.classList.contains('active')) {
                    // Se va a cerrar, limpiar hash
                    setTimeout(() => this.clearHash(), 100);
                }
            }
        });
        
        // Método 4: Escuchar click en el overlay (fuera del contenedor)
        if (searchOverlay) {
            searchOverlay.addEventListener('click', (e) => {
                if (e.target === searchOverlay) {
                    this.clearHash();
                }
            });
        }
    }

    /**
     * Limpiar el hash de la URL
     */
    clearHash() {
        if (window.location.hash) {
            // Usar replaceState para no añadir entrada al historial
            history.replaceState(null, '', window.location.pathname + window.location.search);
            //console.log('🔗 Hash cleared from URL');
        }
    }

    /**
     * Crear hash único para búsqueda
     */
    createHash(searchParams) {
        try {
            const params = {
                query: searchParams.query || '',
                filters: searchParams.filters || {},
                page: searchParams.page || 1,
                timestamp: Date.now(),
                version: this.version
            };

            const jsonString = JSON.stringify(params);
            const encoded = btoa(encodeURIComponent(jsonString));
            return encoded.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
        } catch (error) {
            console.error('Error creating hash:', error);
            return null;
        }
    }

    /**
     * Decodificar hash
     */
    decodeHash(hash) {
        try {
            if (typeof hash !== 'string' || hash.length > 32768) return null;
            const normalized = hash.replace(/-/g, '+').replace(/_/g, '/');
            const padded = normalized + '='.repeat((4 - normalized.length % 4) % 4);
            const decoded = decodeURIComponent(atob(padded));
            const params = JSON.parse(decoded);
            if (!params || typeof params.query !== 'string' || new TextEncoder().encode(params.query).length > 100
                || params.query.trim().split(/\s+/u).length > 10) return null;
            return { query: params.query, filters: window.dropdownsearchSecurity.filters(params.filters), page: 1 };
        } catch (error) {
            console.error('Error decoding hash:', error);
            return null;
        }
    }

    /**
     * Actualizar URL con hash de búsqueda
     */
    updateUrl(searchParams) {
        const hash = this.createHash(searchParams);
        if (hash) {
            const newUrl = `${window.location.pathname}${window.location.search}#search=${hash}`;
            history.replaceState(null, '', newUrl); // replaceState en lugar de pushState
           // console.log('🔗 URL updated:', newUrl);
        }
    }

    /**
     * Obtener búsqueda desde URL
     */
    getSearchFromUrl() {
        const urlHash = window.location.hash;
        const match = urlHash.match(/^#search=(.+)$/);
        
        if (match) {
            return this.decodeHash(match[1]);
        }
        return null;
    }

    /**
     * Verificar búsqueda en URL al cargar
     */
    checkUrlOnLoad() {
        const searchParams = this.getSearchFromUrl();
        if (searchParams && searchParams.query) {
           // console.log('🔗 Found search in URL:', searchParams);
            setTimeout(() => {
                this.executeSearchFromUrl(searchParams);
            }, 1000);
        }
    }

    /**
     * Ejecutar búsqueda desde URL
     */
    executeSearchFromUrl(searchParams) {
        const searchInput = document.getElementById('dropdown-search-input');
        const searchOverlay = document.getElementById('dropdown-search-overlay');
        
        if (searchInput && searchOverlay) {
            // Abrir buscador
            searchOverlay.classList.add('active');
            document.body.classList.add('search-overlay-open');
            
            // Establecer búsqueda
            searchInput.value = searchParams.query;
            searchInput.focus();
            
            // Aplicar filtros si los hay
            if (window.enhancedSearchFilters && searchParams.filters) {
                window.enhancedSearchFilters.setActiveFilters(searchParams.filters);
            }
            
            // Ejecutar búsqueda
            if (typeof window.performSearch === 'function') {
                window.performSearch(searchParams.query, 1, true);
            }
        }
    }

    /**
     * Interceptar búsquedas para actualizar URL
     */
    interceptSearches() {
        // Escuchar eventos de input en el buscador
        const searchInput = document.getElementById('dropdown-search-input');
        if (searchInput) {
            let hashTimeout;
            
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                if (query.length >= this.minQueryLength) {
                    clearTimeout(hashTimeout);
                    hashTimeout = setTimeout(() => {
                        this.updateUrlForCurrentSearch(query);
                    }, 1000); // Actualizar URL después de 1 segundo de inactividad
                }
            });
        }

        document.addEventListener('dropdownsearch:search', (e) => {
            const detail = e.detail || {};
            const query = detail.query ? detail.query.trim() : '';
            if (query.length >= this.minQueryLength) {
                this.updateUrlForCurrentSearch(query);
            }
        });

        // También interceptar cuando se ejecuta performSearch
        const originalPerformSearch = window.performSearch;
        if (typeof originalPerformSearch === 'function') {
            window.performSearch = (...args) => {
                const result = originalPerformSearch.apply(this, args);
                
                // Actualizar URL después de la búsqueda
                setTimeout(() => {
                    const query = args[0];
                    if (query && query.length >= this.minQueryLength) {
                        this.updateUrlForCurrentSearch(query);
                    }
                }, 500);
                
                return result;
            };
        }
    }

    /**
     * Actualizar URL para búsqueda actual
     */
    updateUrlForCurrentSearch(query) {
        const searchParams = { query: query };
        
        // Incluir filtros si están disponibles
        if (window.enhancedSearchFilters) {
            searchParams.filters = window.enhancedSearchFilters.getActiveFilters();
        }
        
        this.updateUrl(searchParams);
    }

    /**
     * Manejar cambios en hash
     */
    handleHashChange() {
        const searchParams = this.getSearchFromUrl();
        if (searchParams) {
            this.executeSearchFromUrl(searchParams);
        }
    }

    /**
     * Crear URL compartible
     */
    createShareableUrl(query, filters = {}) {
        const searchParams = { query, filters };
        const hash = this.createHash(searchParams);
        return hash ? `${window.location.origin}${window.location.pathname}#search=${hash}` : null;
    }

    /**
     * Copiar enlace al portapapeles
     */
    async copySearchLink() {
        const searchInput = document.getElementById('dropdown-search-input');
        if (!searchInput || !searchInput.value.trim()) {
            this.showNotification(t('no_search_to_share', 'No search to share'), 'error');
            return;
        }

        try {
            const query = searchInput.value.trim();
            const filters = window.enhancedSearchFilters ? window.enhancedSearchFilters.getActiveFilters() : {};
            const shareableUrl = this.createShareableUrl(query, filters);
            
            if (shareableUrl) {
                await navigator.clipboard.writeText(shareableUrl);
                this.showNotification(t('link_copied', 'Link copied to clipboard!'));
                console.log('🔗 Shared URL:', shareableUrl);
            } else {
                throw new Error('No se pudo crear la URL');
            }
        } catch (error) {
            console.error('Error copying link:', error);
            this.showNotification(t('copy_error', 'Error copying link'), 'error');
        }
    }

    /**
     * Añadir botón de compartir
     */
    addShareButton() {
        // Esperar a que aparezcan resultados para añadir el botón
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    const resultsContainer = document.querySelector('.search-results-list');
                    const searchInput = document.getElementById('dropdown-search-input');
                    
                    if (resultsContainer && searchInput && searchInput.value.trim().length >= 2) {
                        this.insertShareButton(resultsContainer);
                    }
                }
            });
        });
        
        const searchResults = document.getElementById('search-results');
        if (searchResults) {
            observer.observe(searchResults, { childList: true, subtree: true });
        }
    }

    /**
     * Insertar botón de compartir en resultados
     */
    insertShareButton(resultsContainer) {
        // Verificar si ya existe
        if (resultsContainer.querySelector('.search-share-button')) {
            return;
        }

        // Crear botón
        const shareButton = document.createElement('div');
        shareButton.className = 'search-share-button';
        shareButton.innerHTML = `
            <button class="share-search-btn" title="Compartir esta búsqueda">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92S19.61 16.08 18 16.08z"/>
                </svg>
                ${t('share_search', 'Share search')}
            </button>
        `;

        // Estilos
        shareButton.style.cssText = `
            text-align: center;
            padding: 10px;
            border-top: 1px solid #eee;
            background: #f8f9fa;
        `;

        const button = shareButton.querySelector('.share-search-btn');
        button.style.cssText = `
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            background: #007bff;
            color: white;
            font-size: 13px;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
        `;

        // Eventos
        button.addEventListener('click', () => {
            this.copySearchLink();
        });

        button.addEventListener('mouseenter', () => {
            button.style.background = '#0056b3';
            button.style.transform = 'translateY(-1px)';
        });

        button.addEventListener('mouseleave', () => {
            button.style.background = '#007bff';
            button.style.transform = 'translateY(0)';
        });

        // Insertar al final del contenedor
        resultsContainer.appendChild(shareButton);
    }

    /**
     * Mostrar notificación
     */
    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.className = `search-hash-notification search-hash-notification--${type}`;
        notification.textContent = message;
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            background-color: ${type === 'error' ? '#e74c3c' : '#27ae60'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 10000;
            font-size: 14px;
            font-family: system-ui, sans-serif;
            font-weight: 500;
            transform: translateX(100%);
            transition: transform 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                document.body.removeChild(notification);
            }, 300);
        }, 3000);
    }
}

// API pública
window.SearchHashSystem = SearchHashSystem;
