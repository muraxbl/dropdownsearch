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
├── ajax-search.php        # Endpoint JSON y procesamiento de la respuesta
├── search-engine.php      # Validación, consultas y control de acceso al catálogo
├── config-defaults.php    # Helpers y valores de configuración inicial (sinónimos/boost por defecto)
├── config_es.xml          # Descriptor de configuración del módulo en español
└── dropdownsearch.php     # Controlador principal e interfaz del Backoffice de PrestaShop
```

## Seguridad y comprobaciones

La versión 2.3.1 limita las búsquedas y las facetas a la tienda actual y a las categorías accesibles al grupo del visitante. Respeta la visibilidad de búsqueda y los precios ocultos, valida la forma y el tamaño de las peticiones y trata los valores de los filtros como texto.

El endpoint acepta consultas de hasta 100 bytes y 10 palabras, páginas de 1 a 1000, de 1 a 100 productos por página y hasta 16 filtros (50 IDs por filtro). Requiere un módulo habilitado. No usa Typesense ni incorpora dependencias de ejecución.

```sh
php tests/request.php
php tests/endpoint.php
php tests/configuration.php
DROPDOWNSEARCH_TEST_DSN="mysql:host=127.0.0.1;dbname=dropdownsearch_test;charset=utf8mb4" php tests/catalog.php
node tests/browser.mjs
```

Las pruebas SQL requieren PDO MySQL y una base de datos MariaDB aislada; solo crean tablas temporales en esa conexión. Se pueden indicar `DROPDOWNSEARCH_TEST_USER` y `DROPDOWNSEARCH_TEST_PASSWORD`. La prueba de navegador requiere Chrome; `CHROME_PATH` permite indicar otro ejecutable compatible. GitHub Actions ejecuta las comprobaciones en cada PR y cambio de `main`.

Estas pruebas cubren el motor y los límites del módulo con adaptadores de PrestaShop de prueba. La instalación, las personalizaciones del tema y la integración completa deben verificarse en una tienda PrestaShop de pruebas antes de actualizar una instalación en producción. Tras actualizar, vacía la caché de PrestaShop y los recursos combinados de JavaScript.
