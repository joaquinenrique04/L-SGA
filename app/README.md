# Proyecto: Generador de Carta de Servicio (FTTH/HFC)

Este proyecto genera una carta de servicio a partir de datos de un archivo Excel y selecciones de equipos/materiales. Está organizado para facilitar mantenimiento y ampliaciones.

## Estructura de carpetas

```
/admin
  admin.html        # Panel para gestionar catálogos personalizados (localStorage)
  admin.js
/src
  /data
    categorias-servicio.js   # window.categoriasServicio
    equipos-data.js          # window.equiposPorMedio, window.decoPorMedio, window.retiradosPorMedio
    materiales-servicio.js   # window.materialesPorServicio
  /logic
    excel.js         # Carga/borra Excel (XLSX), expone window.borrarArchivo
    state.js         # Lógica de negocio (filtrar, normalizar, integrar personalizados, etc.)
  /ui
    render.js        # Render y acciones de UI (actualizarTexto, marcar/desmarcar, etc.)
    modal-drops.js   # Modal y opciones de drops
/styles
  base.css           # Reglas globales
  components.css     # Componentes, layouts, formularios, modales
index.html           # App principal
admin.html           # Acceso al panel de administración
script.js            # Bootstrap (initApp)
style.backup.css     # Backup del CSS original
README.md
```

## Requisitos

- Navegador moderno.
- (Incluido) **XLSX.js** por CDN para leer Excel: `https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js`

> No es obligatorio servidor local porque los scripts están en formato tradicional (no ES Modules). Si en el futuro migras a `type="module"`, usa un servidor local (p. ej. `python -m http.server 8000`).

## Cómo usar

1. Abre **`index.html`**.
2. En “Cargar archivo Excel”, selecciona un `.xlsx`/`.xls`. Se toma la **primera hoja**.
3. En “Buscar por SOT”, escribe el número de SOT y pulsa **Buscar** para cargar los datos encontrados en el Excel.
   - Al buscar una nueva SOT, la app limpia automáticamente las series usadas en la SOT anterior para evitar que queden equipos instalados o retirados mezclados.
4. Elige **Medio**, **Categoría**, **Servicio** y los **equipos** (instalados/retirados).  
   - Al elegir equipos instalados, la carta añade “**Equipos instalados**” debajo de la línea de asteriscos.
   - Si agregas retirados, añade “**Equipos retirados**” **después** del bloque de **MATERIALES**.
5. Usa **“Copiar texto”** para copiar la carta.
6. **“Borrar archivo”** limpia el Excel cargado y campos relacionados.

### Interfaz principal

- `index.html` usa un diseño tipo dashboard operativo para pruebas visuales.
- El formulario queda en la columna izquierda y la vista previa del acta queda fija en la columna derecha en pantallas grandes.
- Los bloques largos de equipos instalados, retirados y materiales usan acordeones para reducir desplazamiento.

### Panel de administración

- Abre **`admin.html`** para gestionar cuatro listas principales: **Servicios**, **Equipos instalados**, **Equipos retirados** y **Materiales**.
- El administrador usa pestañas para mostrar una lista a la vez y reducir el desplazamiento vertical.
- Se guardan en `localStorage`:
  - `customServices`: `{ medio, categoria, servicio, materiales: [...] }`
  - `customEquipos`: equipos instalados personalizados.
  - `customEquiposRetirados`: equipos retirados personalizados.
  - `catalogoMateriales`: catálogo maestro de materiales `{ id, codigo, nombre, unidad, medio, activo }`.
  - `materialesAutomaticosPorEquipo`: materiales automáticos asociados a un modelo exacto de equipo instalado.
- La app integra estos catálogos al cargar (ver `integrarServiciosPersonalizados()` en `state.js`).
- La sección **Materiales** es la fuente principal para asociar materiales a servicios y equipos instalados.
- En **Servicios**, los materiales pueden seleccionarse desde el catálogo maestro e indicar cantidad por servicio.
- Al editar un modelo de equipo instalado aparece **Materiales automáticos para este equipo**. Allí se busca el material por código o nombre y se ingresa la cantidad por equipo instalado. Cantidad vacía o `0` no se guarda.

## Dónde editar qué

- **Catálogos base**: `src/data/*`
  - `categorias-servicio.js` → textos por medio/categoría/servicio.
  - `equipos-data.js` → equipos y retirados por medio, incl. decos.
  - `materiales-servicio.js` → materiales por servicio (bloque *** MATERIALES ***).
- **Lógica**: `src/logic/state.js`
  - Normalización de servicio, filtros, integración de personalizados.
  - Búsqueda por SOT y limpieza de series anteriores antes de aplicar una nueva SOT.
- **UI**: `src/ui/render.js` y `src/ui/modal-drops.js`
  - Render de selects/tablas, modal de drops.
  - `getEquipoKey()` genera la clave exacta `MEDIO::TIPO::MODELO` para vincular materiales a modelos instalados.
  - `calcularMaterialesAutomaticosPorEquiposInstalados()` lee `materialesAutomaticosPorEquipo`, revisa equipos instalados con serie y devuelve materiales automáticos recalculados desde cero.
  - `consolidarMateriales()` une materiales manuales y automáticos por `materialId`, código o nombre para evitar duplicados.
- **Excel**: `src/logic/excel.js`
  - Carga y limpieza del libro Excel (usa `XLSX` CDN).

## Flujo de inicialización

`script.js` ejecuta `initApp()` en `DOMContentLoaded`:
1. Integra catálogos personalizados (localStorage).
2. Configura medio inicial (HFC).
3. Llama a `actualizarTexto()` para pintar el estado inicial.

## Convenciones de código

- Mantener **datos** en `/src/data` (en `window.*` para compatibilidad con HTML estático).
- Colocar **lógica** en `/src/logic` y **UI** en `/src/ui`.
- Evitar duplicar funciones en múltiples archivos; exponer en `window.*` solo lo necesario para el HTML.

## Solución de problemas

- **No se carga el Excel**: verifica que el archivo tenga al menos una hoja y no esté protegido. Solo se usa la **primera hoja**.
- **No aparecen materiales**: confirma que el servicio exista en `materialesPorServicio` o que lo hayas añadido en el panel admin.
- **Cambios no se reflejan**: limpia caché del navegador o borra `localStorage` (pestaña Application de DevTools).
- **Orden de secciones**: recuerda que “Equipos retirados” va **al final** del texto, después de **MATERIALES**.

## Desarrollo (opcional)

Si migras a ES Modules (imports en lugar de `window.*`):
- Cambia `<script src="script.js">` por `<script type="module" src="script.js">` y exporta/importa desde `src/*`.
- Sirve con un server local (ej.: `python -m http.server 8000` → `http://localhost:8000/`).

## Empaquetado del .exe

- El instalador se genera con `npm run dist` usando Electron Builder.
- La configuración `build.files` de `package.json` incluye solo la app, `main.js`, `preload.js` y `package.json`.
- Se excluyen `dist`, `build`, `out`, instaladores y comprimidos para evitar que builds anteriores entren dentro del nuevo `.exe`.

## Licencia

Uso interno del proyecto. Ajusta según tus necesidades.
