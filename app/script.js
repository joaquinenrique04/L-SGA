// script.js — versión anterior (sin dedupe de servicios)
let datosExcel   = [];
let libroCargado = null;
let medioActual  = 'hfc'; // Por defecto: HFC

// =================== DROPS (FTTH) ===================
window.materialesDrops = [];
const DROPS_DATA = {
  50:  { code: "1062883", label: "CABLE FO FASTCONNECT DROP 50M",  length: 50  },
  80:  { code: "1062884", label: "CABLE FO FASTCONNECT DROP 80M",  length: 80  },
  100: { code: "1062885", label: "CABLE FO FASTCONNECT DROP 100M", length: 100 },
  150: { code: "1042794", label: "FASTCONNECT DROP CABLE 150MTS",  length: 150 },
  220: { code: "1061553", label: "FASTCONNECT DROP CABLE 220MTS",  length: 220 },
  300: { code: "1063812", label: "CABLE FO FASTCONNECT DROP 300M (14138979)", length: 300 }
};

// Inyectar drops al texto final si aplica (conservar comportamiento original)
(function(){
  const _orig = window.actualizarTexto;
  const DROP_CODES = ["1062883","1062884","1062885","1042794","1061553","1063812","1062235"];
  window.actualizarTexto = function() {
    if (typeof _orig === 'function') _orig();
    try {
      const esFTTH = (typeof medioActual !== 'undefined' && medioActual === 'ftth');
      const salida = document.getElementById('textoSalida');
      if (salida && esFTTH) {
        let texto = salida.textContent || '';
        // Limpia anteriores drops duplicados
        const lines = texto.split('\n').filter(line => {
          const code = (line.match(/^(\d{7})/) || [])[1];
          return !(code && DROP_CODES.includes(code));
        });
        texto = lines.join('\n');
        // Agrega los drops actuales
        if (Array.isArray(window.materialesDrops) && materialesDrops.length > 0) {
          if (/\*\*\*\s*MATERIALES\s*\*\*\*/.test(texto)) {
            if (!/\n$/.test(texto)) texto += '\n';
            texto += window.materialesDrops.join('\n');
          } else {
            texto += `\n\n***   MATERIALES  ***\n${window.materialesDrops.join('\n')}`;
          }
        }
        salida.textContent = texto;
      }
    } catch(_) {}
    if (typeof actualizarVisibilidadBtnDrops === 'function') actualizarVisibilidadBtnDrops();
  };
  document.addEventListener('DOMContentLoaded', function(){ if (typeof actualizarVisibilidadBtnDrops==='function') actualizarVisibilidadBtnDrops(); });
})();

// Bootstrap de la aplicación (comportamiento anterior)
function initApp() {
  try {
    if (typeof integrarServiciosPersonalizados === 'function') integrarServiciosPersonalizados();
    if (typeof configurarMedio === 'function') configurarMedio('hfc');
    if (typeof marcarBoton === 'function') marcarBoton('btnHFC');
    if (typeof desmarcarBoton === 'function') { desmarcarBoton('btnFTTH'); desmarcarBoton('btnMantenimiento'); desmarcarBoton('btnPostventa'); }
    if (typeof marcarBoton === 'function') marcarBoton('btnInstalacion');
    if (typeof cambiarCategoria === 'function') cambiarCategoria('instalacion');
    if (typeof actualizarTexto === 'function') actualizarTexto();
  } catch (e) { console.error('Error en initApp:', e); }
}
document.addEventListener('DOMContentLoaded', initApp);
