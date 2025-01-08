import React from 'react';
import '../App.css';

function Footer({ totalGastado, tarjetaUsada, bancoUsado }) {
  return (
    <div className="footer-align">
      <div className="data-container">
        <div className="totales">
          <h2 id="totalGastado">Total gastado: <span style={{color: '#6EFF6E' }}>${parseFloat(totalGastado).toFixed(2)}</span></h2>
          <h2 id="tarjetaUsada">Medio o tarjeta más usado/a: <span style={{color: '#7BB9FF' }}>{tarjetaUsada}</span></h2>
          <h2 id="bancoUsado">Banco más usado: <span style={{color: '#FFB63F' }}>{bancoUsado}</span></h2>
        </div>
      </div>
      <footer id="contacto">
        <div id="footerSiro">
          <div className="contentFooterSiro">
            <ul className="list-textSiro">
              <li>Powered by:</li>
              <a href="https://chizzi01.github.io/Cv-React/" target="_blank" rel="Agustin Chizzini Melo">
              Agustin Chizzini Melo
              </a>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Footer;