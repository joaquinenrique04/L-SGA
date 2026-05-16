/**
 * custom-services.bundle.js (OPCIONAL)
 * 
 * Este archivo permite "fijar en código" los servicios/materiales personalizados
 * para que se apliquen siempre que se cargue la app, sin depender del localStorage.
 * Cárgalo DESPUÉS de materiales-servicio.js y ANTES de admin.js / script principal.
 *
 * Cómo funciona:
 *  - Define window.CUSTOM_SERVICES_BUNDLED como un arreglo de servicios.
 *  - Si existe, la app lo mezcla con lo que viene en el código (prioridad: localStorage > bundle > código).
 *
 * Formato de cada item:
 *   {
 *     medio: "hfc" | "ftth",                // minúsculas
 *     categoria: "instalacion" | "mantenimiento" | "postventa",
 *     servicio: "TEXTO EXACTO DEL SERVICIO",
 *     materiales: ["código - descripción : cantidad", "..."]
 *   }
 */
(function(){
  window.CUSTOM_SERVICES_BUNDLED = [
    // EJEMPLO:
    // {
    //   medio: "hfc",
    //   categoria: "instalacion",
    //   servicio: "SE REALIZA INSTALACION DE 1PLAY HFC IAV - SERVICIO QUEDA OPERATIVO",
    //   materiales: [
    //     "1002950 - ATADORES DE IDENTIFICACION DE ABONADO: 01",
    //     "1051091 - PROTECTOR DE HUMEDAD PARA CONECTOR RG6: 01"
    //   ]
    // },
  ];
})();
