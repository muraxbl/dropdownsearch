{*
* Template para el contenedor de búsqueda desplegable
* modules/dropdownsearch/views/templates/hook/search-container.tpl
*}

<div id="dropdown-search-overlay" class="dropdown-search-overlay {$dropdownsearch_layout_class|escape:'html':'UTF-8'}" style="{$dropdownsearch_style|escape:'html':'UTF-8'}">
    <div class="dropdown-search-container">
        <div class="search-input-wrapper">
            <input type="text" 
                   id="dropdown-search-input" 
                   class="search-input" 
                   placeholder="{l s='¿Qué estás buscando?' mod='dropdownsearch'}"
                   autocomplete="off">
            <button type="button" id="close-search" class="close-search-btn">
                <i class="material-icons">close</i>
            </button>
        </div>
        
        <div id="search-results" class="search-results">
            <div class="search-loading" style="display: none;">
                <div class="loading-spinner"></div>
                <p>{l s='Buscando...' mod='dropdownsearch'}</p>
            </div>
            
            <div class="search-results-list"></div>
            
            <div class="no-results" style="display: none;">
                <p>{l s='No se encontraron resultados' mod='dropdownsearch'}</p>
            </div>
        </div>
    </div>
</div>
