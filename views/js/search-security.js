window.dropdownsearchSecurity = Object.freeze({
    escape(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, character => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[character]);
    },

    url(value) {
        if (typeof value !== 'string' || !value.trim()) return '';
        try {
            const url = new URL(value, window.location.href);
            return ['https:', 'http:'].includes(url.protocol) ? url.href : '';
        } catch (error) {
            return '';
        }
    },

    filters(value) {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
        const filters = {};
        for (const [key, item] of Object.entries(value).slice(0, 16)) {
            if (/^price_(min|max)$/.test(key)) {
                if ((typeof item === 'number' || typeof item === 'string') && String(item).trim()
                    && Number.isFinite(Number(item)) && Number(item) >= 0 && Number(item) <= 1000000000) {
                    filters[key] = Number(item);
                }
            } else if (key === 'in_stock') {
                if ([true, false, 0, 1, '0', '1'].includes(item)) filters[key] = Boolean(Number(item));
            } else if (/^(categories|manufacturers|(?:attributes|features)_[1-9][0-9]{0,9})$/.test(key) && Array.isArray(item)) {
                filters[key] = [...new Set(item.slice(0, 50).filter(id =>
                    (typeof id === 'string' || typeof id === 'number')
                    && /^[1-9][0-9]{0,9}$/.test(String(id)) && Number(id) <= 2147483647
                ).map(String))];
            }
        }
        return filters;
    }
});
