import React from 'react';
import '../App.css';
import { HiHome } from "react-icons/hi2";
import { FaCalculator } from "react-icons/fa6";
import { GoAlertFill } from "react-icons/go";
import { FaCircleQuestion } from "react-icons/fa6";
import { Link } from 'react-router-dom';

function Header() {
  return (
    <header>
      <nav className="navbar">
        <div className="logo-container">
        <img className="logonav" src="./img/icon-bgremove.png" alt="Logo" />
        </div>
        <div>
          <div className="navbar-links">
            <ul className="nav-items">
              <li className='align-items'><HiHome size={20} /><Link to="/"> INICIO</Link></li>
              <span></span>
              <li className='align-items'><FaCalculator size={20} /><a href="ms-calculator://"> CALCULADORA</a></li>
              <span></span>
              <li className='align-items'><FaCircleQuestion size={20} /> <Link to="/preguntas">PREGUNTAS</Link></li>
              <span></span>
            </ul>
          </div>
        </div>
      </nav>
    </header>
  );
}

export default Header;