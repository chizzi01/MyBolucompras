import React, { useEffect, useState } from 'react';
import '../App.css'; // Asegúrate de que la ruta sea correcta
import { TextField, Button } from '@mui/material';
// import emailjs from 'emailjs-com';

const Preguntas = () => {
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [mensaje, setMensaje] = useState('');

  return (
    <div className="backPreguntas">

      <div className="faq-section">
        <h2>Preguntas Frecuentes</h2>
        <div className="faq-item">
          <h3>¿Qué es un gasto repetitivo?</h3>
          <p>Un gasto repetitivo es un costo que se incurre en intervalos regulares como gastos semanales de un monto fijo o suscripciones mensuales.</p>
        </div>
        <div className="faq-item">
          <h3>¿Puedo editar un gasto ya finalizado?</h3>
          <p>No, una vez que un gasto ha sido finalizado no se puede editar. Si necesitas hacer cambios, puedes eliminar el gasto y crear uno nuevo.</p>
        </div>
        <div className="faq-item">
          <h3>¿Puedo generar una planilla de excel a partir de mis gastos?</h3>
          <p>Sí, puedes exportar tus gastos a una planilla de excel. Para hacerlo, ve hacia abajo de la tabla de gastos y clickea en "Exportar a excel".</p>
        </div>
        <div className="faq-item">
          <h3>¿Cómo puedo eliminar un gasto?</h3>
          <p>Para eliminar un gasto, toca en el boton eliminar en la linea del gasto correspondiente</p>
        </div>
        <div className="faq-item">
          <h3>¿Cómo puedo editar un gasto?</h3>
          <p>Para editar un gasto, toca en el boton editar en la linea del gasto correspondiente</p>
        </div>
        <div className="faq-item">
          <h3>¿Cómo puedo agregar un gasto?</h3>
          <p>Para agregar un gasto, clickea en el botón superior izquierdo "+" y elige el tipo de gasto</p>
        </div>
      </div>
    </div>
  );
};

export default Preguntas;