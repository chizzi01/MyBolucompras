// src/services/notificaciones/filtro.js
// Decide si una notificación de una app cualquiera parece ser una compra con
// tarjeta. No depende de saber el package name del banco: el texto de una
// notificación de compra real es lo bastante distintivo (monto + verbo de
// pago) como para separarlo de mensajería, juegos, etc. sin una whitelist.

const PATRON_MONTO = /\$\s*[\d.,]+/;

const PALABRAS_COMPRA = [
  /pagaste/i,
  /compra(ste)?\b/i,
  /consumo/i,
  /operaci[oó]n (aprobada|realizada)/i,
];

const PALABRAS_EXCLUIR = [
  /recibiste/i,
  /te envi[oó]/i,
  /resumen/i,
  /vencimiento/i,
  /rechazad/i,
  /promoci[oó]n/i,
  /oferta/i,
];

function esNotificacionDeCompra({ titulo = '', texto = '' }) {
  const contenido = `${titulo}\n${texto}`;
  if (!PATRON_MONTO.test(contenido)) return false;
  if (PALABRAS_EXCLUIR.some((rx) => rx.test(contenido))) return false;
  return PALABRAS_COMPRA.some((rx) => rx.test(contenido));
}

module.exports = { esNotificacionDeCompra };
