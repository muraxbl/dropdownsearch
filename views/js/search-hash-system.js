document.addEventListener('DOMContentLoaded', function() {

    setTimeout(function() {
        if (typeof window.searchHashSystem === 'undefined') {
            window.searchHashSystem = new SearchHashSystem();
        }
    }, 700);
});

class SearchHashSystem {
    constructor() {
        this.version = 'v1';
        const moduleConfig = window.dropdownsearchConfig || {};
        this.minQueryLength = Number.isFinite(parseInt(moduleConfig.minQueryLength, 10)) ? Math.max(1, parseInt(moduleConfig.minQueryLength, 10)) : 2;
        this.init();

    }

    init() {

        this.checkUrlOnLoad();

        this.interceptSearches();

        this.addShareButton();

        this.listenForSearchClose();

        window.addEventListener('popstate', () => {
            this.handleHashChange();
        });

        window.addEventListener('hashchange', () => {
            this.handleHashChange();
        });
    }

    listenForSearchClose() {

        const searchOverlay = document.getElementById('dropdown-search-overlay');
        if (searchOverlay) {
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'class') {

                        if (!searchOverlay.classList.contains('active')) {
                            this.clearHash();
                        }
                    }
                });
            });

            observer.observe(searchOverlay, { attributes: true });
        }

        const closeBtn = document.getElementById('close-search');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.clearHash();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const overlay = document.getElementById('dropdown-search-overlay');
                if (overlay && overlay.classList.contains('active')) {

                    setTimeout(() => this.clearHash(), 100);
                }
            }
        });

        if (searchOverlay) {
            searchOverlay.addEventListener('click', (e) => {
                if (e.target === searchOverlay) {
                    this.clearHash();
                }
            });
        }
    }

    clearHash() {
        if (window.location.hash) {

            history.replaceState(null, '', window.location.pathname + window.location.search);

        }
    }

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

    updateUrl(searchParams) {
        const hash = this.createHash(searchParams);
        if (hash) {
            const newUrl = `${window.location.pathname}${window.location.search}#search=${hash}`;
            history.replaceState(null, '', newUrl);

        }
    }

    getSearchFromUrl() {
        const urlHash = window.location.hash;
        const match = urlHash.match(/^#search=(.+)$/);

        if (match) {
            return this.decodeHash(match[1]);
        }
        return null;
    }

    checkUrlOnLoad() {
        const searchParams = this.getSearchFromUrl();
        if (searchParams && searchParams.query) {

            setTimeout(() => {
                this.executeSearchFromUrl(searchParams);
            }, 1000);
        }
    }

    executeSearchFromUrl(searchParams) {
        const searchInput = document.getElementById('dropdown-search-input');
        const searchOverlay = document.getElementById('dropdown-search-overlay');

        if (searchInput && searchOverlay) {

            searchOverlay.classList.add('active');
            document.body.classList.add('search-overlay-open');

            searchInput.value = searchParams.query;
            searchInput.focus();

            if (window.enhancedSearchFilters && searchParams.filters) {
                window.enhancedSearchFilters.setActiveFilters(searchParams.filters);
            }

            if (typeof window.performSearch === 'function') {
                window.performSearch(searchParams.query, 1, true);
            }
        }
    }

    interceptSearches() {

        const searchInput = document.getElementById('dropdown-search-input');
        if (searchInput) {
            let hashTimeout;

            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.trim();
                if (query.length >= this.minQueryLength) {
                    clearTimeout(hashTimeout);
                    hashTimeout = setTimeout(() => {
                        this.updateUrlForCurrentSearch(query);
                    }, 1000);
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

        const originalPerformSearch = window.performSearch;
        if (typeof originalPerformSearch === 'function') {
            window.performSearch = (...args) => {
                const result = originalPerformSearch.apply(this, args);

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

    updateUrlForCurrentSearch(query) {
        const searchParams = { query: query };

        if (window.enhancedSearchFilters) {
            searchParams.filters = window.enhancedSearchFilters.getActiveFilters();
        }

        this.updateUrl(searchParams);
    }

    handleHashChange() {
        const searchParams = this.getSearchFromUrl();
        if (searchParams) {
            this.executeSearchFromUrl(searchParams);
        }
    }

    createShareableUrl(query, filters = {}) {
        const searchParams = { query, filters };
        const hash = this.createHash(searchParams);
        return hash ? `${window.location.origin}${window.location.pathname}#search=${hash}` : null;
    }

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
            } else {
                throw new Error('No se pudo crear la URL');
            }
        } catch (error) {
            console.error('Error copying link:', error);
            this.showNotification(t('copy_error', 'Error copying link'), 'error');
        }
    }

    addShareButton() {

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

    insertShareButton(resultsContainer) {

        if (resultsContainer.querySelector('.search-share-button')) {
            return;
        }

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

        resultsContainer.appendChild(shareButton);
    }

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

window.SearchHashSystem = SearchHashSystem;
