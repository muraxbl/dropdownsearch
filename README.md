# Dropdown Search Module for PrestaShop 1.7

Módulo avanzado de búsqueda predictiva y filtrado dinámico asíncrono para PrestaShop 1.7. Implementa un motor de búsqueda personalizado con soporte para tolerancia de errores, sinónimos y reglas de priorización (*boosting*).

## 🚀 Características Principales

* **Búsqueda Predictiva Inteligente:** Priorización por coincidencia múltiple de palabras y posición temprana de términos.
* **Tolerancia Avanzada:** Gestión nativa de plurales, acentos y búsquedas por referencias parciales.
* **Sistema de Sinónimos Configurable:** Soporte para sinónimos bidireccionales administrables desde el panel de control.
* **Reglas de Boost:** Permite bonificar o priorizar productos específicos asociados a términos de búsqueda clave.
* **Filtros Avanzados en Frontend:** Filtrado en tiempo real por categorías, fabricantes, precios, atributos y características.

## 📁 Estructura del Repositorio

```text
dropdownsearch/
├── translations/          # Archivos de traducción del módulo
├── views/
│   ├── css/               # Hojas de estilo para la interfaz de búsqueda y filtros
│   ├── js/                # Controladores de eventos del DOM y sistema de hash de URLs
│   └── templates/hook/    # Plantillas Smarty (.tpl) para la integración en los hooks
├── ajax-search.php        # Manejador principal de peticiones AJAX y lógica de filtrado
├── config-defaults.php    # Helpers y valores de configuración inicial (sinónimos/boost por defecto)
├── config_es.xml          # Descriptor de configuración del módulo en español
└── dropdownsearch.php     # Controlador principal e interfaz del Backoffice de PrestaShop