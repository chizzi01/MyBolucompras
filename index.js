const nodemailer = require('nodemailer');
const dotenv = require('dotenv').config();
const XLSX = require("xlsx");
const jsonfile = require('jsonfile');



function agregarDatosObjeto(id, objeto, fecha, medio, cuotas, tipo, banco, cantidad, precio) {

  var NuevoObjeto = {
    id: id,
    isFijo: false,
    objeto: objeto.charAt(0).toUpperCase()
      + objeto.slice(1),
    fecha: fecha.split("-").reverse().join("/"),
    medio: medio,
    cuotas: Number(cuotas),
    tipo: tipo,
    banco: banco,
    cantidad: cantidad,
    precio: "$ " + Number(precio) / Number(cuotas)
  };

  // console.log(NuevoObjeto);
  return NuevoObjeto;
}



function agregarDatosObjetoFijo(id, objeto, fecha, medio, cuotas, banco, cantidad, precio) {

  var NuevoObjeto = {
    id: id,
    isFijo: true,
    objeto: objeto.charAt(0).toUpperCase()
      + objeto.slice(1),
    fecha: fecha.split("-").reverse().join("/"),
    medio: medio,
    cuotas: cuotas,
    tipo: "debito",
    banco: banco,
    cantidad: cantidad,
    precio: "$ " + (precio * cantidad)
  };

  // console.log(NuevoObjeto);
  return NuevoObjeto;
}

function mostrarModalIncompleto() {
  let modalIncompleto = document.getElementById("datosIncompletos");
  modalIncompleto.classList.remove("hide");
  let cerrarModalIncompleto = document.getElementById("cerrarModalIncompleto");
  cerrarModalIncompleto.addEventListener("click", function () {
    modalIncompleto.classList.add("hide");
  });
}

let fechaVencimiento = localStorage.getItem("vencimiento");
// calcular la cantidad de cuotas restantes en base a la fecha actual y si es que no tiene cuotas restantes devuelve 0 
function calcularCuotasRestantes(fecha, cuotas, formData) {
  let fechaActual = new Date().toISOString().slice(0, 10);
  fechaActual = fechaActual.split("-").reverse().join("/");
  // console.log(fechaActual);
  let fechaCompra = fecha.split("-").reverse().join("/");
  // console.log(fechaCompra);
  let fechaActualDia = fechaActual.split("/")[0];
  let fechaActualMes = fechaActual.split("/")[1];
  let fechaActualAnio = fechaActual.split("/")[2];
  let fechaCompraDia = fechaCompra.split("/")[0];
  let fechaCompraMes = fechaCompra.split("/")[1];
  let fechaCompraAnio = fechaCompra.split("/")[2];
  let diferenciaAnios = fechaActualAnio - fechaCompraAnio;
  // console.log("diferencia años:" + diferenciaAnios);
  let diferenciaMeses = fechaActualMes - fechaCompraMes;
  // console.log( "diferencia meses:" + diferenciaMeses);
  let diferenciaDias = fechaActualDia - fechaCompraDia;
  // console.log("diferencia dias:" + diferenciaDias);
  let diferenciaTotal = diferenciaAnios * 12 + diferenciaMeses;
  // console.log("diferencia total:" + diferenciaTotal);

  if (diferenciaTotal >= cuotas) {
    formData.cuotas = 0;
  }
  else {
    formData.cuotas = cuotas - diferenciaTotal;
    // console.log("cuotas restantes:" + formData.cuotas);
  }

  return formData.cuotas;
}

function calcularCuotasRestantesCredito(fecha, cuotas, formData) {

  let fechaActual = new Date(fechaVencimiento).toISOString().slice(0, 10);

  fechaActual = fechaActual.split("-").reverse().join("/");
  let fechaCompra = fecha.split("-").reverse().join("/");
  let fechaActualDia = parseInt(fechaActual.split("/")[0]);
  let fechaActualMes = parseInt(fechaActual.split("/")[1]);
  let fechaActualAnio = parseInt(fechaActual.split("/")[2]);
  let fechaCompraDia = parseInt(fechaCompra.split("/")[0]);
  let fechaCompraMes = parseInt(fechaCompra.split("/")[1]);
  let fechaCompraAnio = parseInt(fechaCompra.split("/")[2]);
  let diferenciaAnios = fechaActualAnio - fechaCompraAnio;
  let diferenciaMeses = fechaActualMes - fechaCompraMes;
  let diferenciaDias = fechaActualDia - fechaCompraDia;
  let diferenciaTotal = diferenciaAnios * 12 + diferenciaMeses;

  if (diferenciaDias < 0) {
    diferenciaTotal -= 1;
  }
  if (diferenciaTotal >= cuotas) {
    formData.cuotas = 0;
  }
  else {
    formData.cuotas = cuotas - diferenciaTotal;
  }

  return formData.cuotas;
}

let modalAlertaVencimiento = document.getElementById("modal-alertaVencimiento");
let fechaVencimientoActual = localStorage.getItem("vencimiento");
fechaVencimiento = new Date(fechaVencimientoActual);
let fechaActual = new Date();
let diferenciaEnMilisegundos = fechaVencimiento - fechaActual;
let diferenciaEnDias = Math.floor(diferenciaEnMilisegundos / (1000 * 60 * 60 * 24));

console.log(diferenciaEnDias);

if (diferenciaEnDias < 0) {
  modalAlertaVencimiento.classList.remove("hide");
  let html = document.querySelector("#gastos");
  html.style.filter = "blur(5px)";
  let cerrarAlertaVencimiento = document.getElementById("cerrarAlertaVencimiento");
  cerrarAlertaVencimiento.addEventListener("click", function () {
    modalAlertaVencimiento.classList.add("hide");
    html.style.filter = "blur(0px)";
  });
}




// function obtenerListaObjetos() {
//   fetch("../data.json")
//     .then(function (response) {
//       return response;
//     })
// }

//write to data.json file without overwriting
function guardarDatos(NuevoObjeto) {
  // const fs = require('fs');

  const fileContents = jsonfile.readFileSync(`./data.json`);
  // the object you want to save



  let object = [];
  object = fileContents;

  object.push(NuevoObjeto);

  // write the object to a file as a JSON string
  jsonfile.writeFileSync(`./data.json`, object);

  // read the object back from the file

  const loadedObject = fileContents;

  // console.log(loadedObject);

}


function generateNewId() {
  return Math.floor(Math.random() * 1000000);
}


// fetch to data.json 
// const path = require('path');

// const filePath = path.resolve(__dirname, 'release-builds', 'data.json');

let total = 0;
cargarTabla = () => {

  try {
    jsonfile.readFileSync("data.json");
  } catch (error) {
    jsonfile.writeFileSync("data.json", []);
  }

  try {
    var formData = jsonfile.readFileSync(`data.json`);
    if (formData.length == 0) {
      console.log("no hay datos");
      return;
    }


    verificacion = localStorage.getItem("verificacion");


    if (localStorage.getItem("verificacion") === null) {
      const seenIds = {};
      formData.forEach(element => {
        // Si este ID ya ha sido visto, generar un nuevo ID

        if (seenIds[element.id]) {
          element.id = generateNewId();
        }

        // Marcar este ID como visto
        seenIds[element.id] = true;
      });

      jsonfile.writeFileSync("data.json", formData);
      localStorage.setItem("verificacion", "1");
    }
  } catch (error) {
    console.error(error);
    return;
  }


  formData.forEach(element => {
    element.fecha = element.fecha.split("/").reverse().join("-");
  });
  formData = formData.sort(function (a, b) {
    return new Date(a.fecha) - new Date(b.fecha);
  });
  formData.forEach(element => {
    element.fecha = element.fecha.split("-").reverse().join("/");
  });


  // console.log(formData);

  //calcular el restante de cuotas en base a la fecha actual y la fecha de compra y si es que no tiene cuotas restantes devuelve 0
  formData.forEach(element => {
    if (element.tipo == "debito") {
      element.cuotas = calcularCuotasRestantes(element.fecha, element.cuotas, formData);
    }
    else if (element.tipo == "credito") {
      element.cuotas = calcularCuotasRestantesCredito(element.fecha, element.cuotas, formData);
    }
    // console.log( "cuotas restantes:" + element.cuotas);
  });

  //guardar bandera en el local storage para saber si es la primera vez que se carga la pagina

  // si las cuotas restantes son 0, se elimina el objeto del array
  if (localStorage.getItem("bandera") === "0") {
    formData = formData.filter((item) => item.cuotas !== 0);
  }
  else {
    formData = formData;
  }

  formData.forEach(element => {
    element.precio = element.precio.replace("$", "");
    element.precio = parseFloat(element.precio).toFixed(2);
  });

  formData.forEach(element => {
    element.precio = "$" + element.precio;
  });

  let switchBtn = document.getElementById("switchBtn");
  switchBtn.addEventListener("click", () => {
    if (switchBtn.checked) {
      localStorage.setItem("bandera", "1");
      window.location.reload();
    } else {
      localStorage.setItem("bandera", "0");
      window.location.reload();
    }
  });


  if (localStorage.getItem("bandera") === "1") {
    switchBtn.checked = true;
    let todas = document.getElementById("todas");
    todas.classList.add("iluminate");
  }

  if (localStorage.getItem("bandera") === "0") {
    switchBtn.checked = false;
    let delMes = document.getElementById("delMes");
    delMes.classList.add("iluminate");
  }

  // ordena la tabla por fecha de forma descendente


  var table = document.getElementById("tabla");

  // Recorre cada registro en los datos
  formData.forEach(element => {
    const deleteButton = document.createElement("button");
    deleteButton.classList.add("delete-btn");
    deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
    let loadedObject = jsonfile.readFileSync(`./data.json`);
    let modalEliminar = document.getElementById("modal-eliminar");
    deleteButton.addEventListener("click", () => {
      modalEliminar.classList.remove("hide");
      modalEliminar.classList.add("animation-slideInUp");
      html.style.filter = "blur(5px)";
      let eliminarRegistro = document.getElementById("eliminar-registro");
      let cancelar = document.getElementById("cancelar");
      eliminarRegistro.addEventListener("click", function () {
        row.remove();
        loadedObject = loadedObject.filter((item) => item.id !== element.id);
        jsonfile.writeFileSync(`./data.json`, loadedObject);
        window.location.reload();
      });

      cancelar.addEventListener("click", function () {
        modalEliminar.classList.add("hide");
        html.style.filter = "blur(0px)";
      });


    });


    const editButton = document.createElement("button");
    let modalEditar = document.getElementById("modal-editar");
    editButton.classList.add("edit-btn");
    editButton.innerHTML = '<i class="fas fa-edit"></i>';
    editButton.addEventListener("click", () => {
      modalEditar.classList.remove("hide");
      modalEditar.classList.add("animation-slideInUp");
      html.style.filter = "blur(5px)";
      let modificar = document.getElementById("modificar");
      let cancelarEdit = document.getElementById("cancelarEdit");
      let objetoEdit = document.getElementById("objetoEdit");
      let fechaEdit = document.getElementById("fechaEdit");
      let medioEdit = document.getElementById("medioEdit");
      let cuotasEdit = document.getElementById("cuotasEdit");
      let bancoEdit = document.getElementById("bancoEdit");
      let tipoEdit = document.getElementById("tipoEdit");
      let cantidadEdit = document.getElementById("cantidadEdit");
      let precioEdit = document.getElementById("precioEdit");
      let repeticionesEdit = document.getElementById("repeticionesEdit");
      let periodoEdit = document.getElementById("periodoEdit");
      let montoEdit = document.getElementById("montoEdit");
      objetoEdit.value = element.objeto;
      fechaEdit.value = element.fecha.split("/").reverse().join("-");
      medioEdit.value = element.medio;
      cuotasEdit.value = element.cuotas;
      bancoEdit.value = element.banco;
      tipoEdit.value = element.tipo;
      cantidadEdit.value = element.cantidad;
      element.precio = element.precio.replace("$", "");
      element.precio = element.precio.replace(" ", "");
      if (element.isFijo === true) {
        precioEdit.value = element.precio / element.cantidad;
        repeticionesEdit.innerText = "Repeticiones";
        periodoEdit.innerText = "Periodo";
        montoEdit.innerText = "Monto";
      }
      if (element.isFijo === false) {
        precioEdit.value = element.precio * element.cuotas;
      }

      modificar.addEventListener("click", function () {
        let objetoEdit = document.getElementById("objetoEdit");
        let fechaEdit = document.getElementById("fechaEdit");
        let medioEdit = document.getElementById("medioEdit");
        let cuotasEdit = document.getElementById("cuotasEdit");
        let bancoEdit = document.getElementById("bancoEdit");
        let tipoEdit = document.getElementById("tipoEdit");
        let cantidadEdit = document.getElementById("cantidadEdit");
        let precioEdit = document.getElementById("precioEdit");
        let objeto = objetoEdit.value;
        let fecha = fechaEdit.value;
        let medio = medioEdit.value;
        let cuotas = cuotasEdit.value;
        let banco = bancoEdit.value;
        let tipo = tipoEdit.value;
        let cantidad = cantidadEdit.value;
        let precio = precioEdit.value;
        precio = precio.replace("$", "");
        precio = precio.replace(" ", "");
        precio = parseFloat(precio);
        let idElemento = element.id;
        if (element.isFijo === true) {
          precio = (precio * cantidad);
        }
        else {
          precio = precio / cuotas;
        }
        let ObjetoEditado = {
          id: idElemento,
          isFijo: element.isFijo,
          objeto: objeto,
          fecha: fecha.split("-").reverse().join("/"),
          medio: medio,
          cuotas: cuotas,
          banco: banco,
          tipo: tipo,
          cantidad: cantidad,
          precio: "$ " + precio
        }
        row.remove();
        loadedObject = loadedObject.filter((item) => item.id !== element.id);
        jsonfile.writeFileSync(`./data.json`, loadedObject);
        guardarDatos(ObjetoEditado);
        modalEditar.classList.add("hide");
        // window.location.reload();
      });

      cancelarEdit.addEventListener("click", function () {
        modalEditar.classList.add("hide");
        html.style.filter = "blur(0px)";
      });
    });

    // Crea una nueva fila en la tabla
    var row = table.insertRow();

    // Agrega cada dato del formulario como una nueva celda en la fila
    var objetoCell = row.insertCell(0);
    objetoCell.innerHTML = element.objeto;

    var fechaCell = row.insertCell(1);
    fechaCell.innerHTML = element.fecha;

    var medioCell = row.insertCell(2);
    medioCell.innerHTML = element.medio;

    var cuotasCell = row.insertCell(3);
    cuotasCell.innerHTML = element.cuotas;

    var bancoCell = row.insertCell(4);
    bancoCell.innerHTML = element.banco;

    var cantidadCell = row.insertCell(5);
    cantidadCell.innerHTML = element.cantidad;

    var precioCell = row.insertCell(6);
    precioCell.innerHTML = element.precio;

    var buttonCell = row.insertCell(7);
    var buttonWrapper = document.createElement('div');
    buttonWrapper.style.display = 'flex';
    buttonWrapper.style.justifyContent = 'space-between';
    buttonWrapper.style.alignItems = 'center';
    buttonWrapper.style.width = '100%'; // Asegúrate de que el div ocupe todo el ancho de la celda
    deleteButton.classList.add('flex-grow');
    buttonWrapper.appendChild(deleteButton);
    if (element.cuotas > 0) {
      editButton.classList.add('flex-grow');
      buttonWrapper.appendChild(editButton);
    }
    buttonCell.appendChild(buttonWrapper);

  });
  // calcula el total gastado
  formData.forEach(element => {
    element.precio = element.precio.split("$")[1];
    total += parseFloat(element.precio);
    total = parseFloat(total.toFixed(2));
    // el total sea un numero con decimales de 2 cifras 


  });
  let totalGastado = document.getElementById("totalGastado");
  totalGastado.innerHTML = "<i class='fa-solid fa-coins'></i> Total gastado: <span style='color: #6EFF6E '>" + "$" + total.toString() + "</span>";


  //calcula la tarjeta mas usada
  let tarjetaUsada = document.getElementById("tarjetaUsada");
  let tarjetas = [];
  formData.forEach(element => {
    tarjetas.push(element.medio);
  });
  let tarjetaMasUsada = tarjetas.sort((a, b) =>
    tarjetas.filter(v => v === a).length
    - tarjetas.filter(v => v === b).length
  ).pop();
  if (tarjetaMasUsada === undefined) {
    tarjetaMasUsada = 'Ninguna';
  }
  tarjetaUsada.innerHTML = "<i class='fa-solid fa-credit-card'></i> Medio o tarjeta más usado/a: <span style='color: #7BB9FF '>" + tarjetaMasUsada.toString() + "</span>";

  //calcula el banco mas usado
  let bancoUsado = document.getElementById("bancoUsado");
  let bancos = [];
  formData.forEach(element => {
    bancos.push(element.banco);
  });
  let bancoMasUsado = bancos.sort((a, b) =>
    bancos.filter(v => v === a).length
    - bancos.filter(v => v === b).length
  ).pop();

  // add diferent colors to the most used bank
  if (bancoMasUsado === undefined) {
    bancoMasUsado = 'Ninguno';
  }
  bancoUsado.innerHTML = "<i class='fa-solid fa-bank'></i> Banco más usado: <span style='color: #FFB63F'>" + bancoMasUsado.toString(); + "</span>";

  let mesBolucompras = document.getElementById("mesBolucompras");
  let mesActual = new Date().getMonth();
  let meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  if (localStorage.getItem("bandera") === "0") {
    mesBolucompras.innerHTML = "Mis Bolucompras del mes de: <span style='color: #7BB9FF'>" + meses[mesActual] + "</span>";
  }
  else if (localStorage.getItem("bandera") === "1") {
    mesBolucompras.innerHTML = "<span style='color: #7BB9FF'>Todas</span> mis Bolucompras";
  }


  let fondosGuardados = localStorage.getItem("fondos");


  let agregarFondos = document.getElementById("agregarFondos-btn");
  agregarFondos.addEventListener("click", function () {
    let modalAgregarFondos = document.getElementById("modalAgregarFondos");
    modalAgregarFondos.classList.remove("hide");
    let html = document.querySelector("#gastos");
    html.style.filter = "blur(5px)";
    let guardarFondos = document.getElementById("guardarFondos-btn");
    guardarFondos.addEventListener("click", function () {
      let fondos = document.getElementById("agregarFondos").value;
      if (fondos === "") {
        mostrarModalIncompleto();
      } else {
        fondosGuardados = localStorage.setItem("fondos", parseFloat(fondosGuardados) + parseFloat(fondos));
        modalAgregarFondos.classList.add("hide");
        html.style.filter = "blur(0px)";
        window.location.reload();
      }
    });
    let editarFondosBtn = document.getElementById("editarFondos-btn");
    editarFondosBtn.addEventListener("click", function () {
      editarFondosBtn.classList.add("hide");
      let labelSumar = document.getElementById("labelSumar");
      labelSumar.innerText = "Editar fondos";
      let fondos = document.getElementById("agregarFondos");
      fondos.classList.add("hide");
      let editarFondos = document.getElementById("editarFondos");
      editarFondos.classList.remove("hide");
      editarFondos.value = parseFloat(fondosGuardados);
      let guardarFondos = document.getElementById("guardarFondos-btn");
      guardarFondos.classList.add("hide");
      let editarFondosGuardar = document.getElementById("editarFondosGuardar-btn");
      editarFondosGuardar.classList.remove("hide");
      editarFondosGuardar.addEventListener("click", function () {
        let fondosEditados = document.getElementById("editarFondos").value;
        fondosGuardados = localStorage.setItem("fondos", parseFloat(fondosEditados));
        modalAgregarFondos.classList.add("hide");
        html.style.filter = "blur(0px)";
        window.location.reload();
      });
    });

    let cancelarAgregarFondos = document.getElementById("cancelarAgregarFondos");
    cancelarAgregarFondos.addEventListener("click", function () {
      modalAgregarFondos.classList.add("hide");
      html.style.filter = "blur(0px)";
      window.location.reload();
    });
  }
  );

  let fondosActuales = document.getElementById("fondos");

  let fondosRestados = parseFloat(parseFloat(fondosGuardados) - total).toFixed(2);
  // console.log(fondosRestados);

  fondosActuales.innerHTML = "<i class='fa-solid fa-wallet'></i> Fondos : <span style='color: #FFB63F'>" + "$" + fondosRestados + "</span>";

  if (localStorage.getItem("fondos") === "NaN" || localStorage.getItem("fondos") === null) {
    console.log("entro");
    localStorage.setItem("fondos", "0");
    fondosRestados = 0;

    // console.log(fondosRestados);
  }

  // console.log(fondosGuardados);


  let agregarFechaVencimiento = document.getElementById("vencimientoTarjeta-btn");
  agregarFechaVencimiento.addEventListener("click", function () {
    let modalAgregarFechaVencimiento = document.getElementById("modal-vencimiento");
    modalAgregarFechaVencimiento.classList.remove("hide");
    let html = document.querySelector("#gastos");
    fechaVencimiento = localStorage.getItem("vencimiento");
    let campoVencimiento = document.getElementById("vencimientoTarjeta");
    campoVencimiento.value = fechaVencimiento;
    html.style.filter = "blur(5px)";
    let guardarVencimiento = document.getElementById("guardarVencimiento");
    guardarVencimiento.addEventListener("click", function () {
      let vencimiento = document.getElementById("vencimientoTarjeta").value;
      localStorage.setItem("vencimiento", vencimiento);
      modalAgregarFechaVencimiento.classList.add("hide");
      html.style.filter = "blur(0px)";
      window.location.reload();
    });

    let cancelarVencimiento = document.getElementById("cancelarVencimiento");
    cancelarVencimiento.addEventListener("click", function () {
      modalAgregarFechaVencimiento.classList.add("hide");
      html.style.filter = "blur(0px)";
    });

  });







  document.getElementById("export-btn").addEventListener("click", function () {
    var toExcel = formData;

    if (localStorage.getItem("bandera") === 0) {
      toExcel.forEach(element => {
        if (element.cuotas === 0) {
          delete element;
        }
      });
    }


    toExcel.forEach(elemento => {
      delete elemento.isFijo;
      delete elemento.id;
    });
    var headers = Object.keys(toExcel[0]);
    toExcel = toExcel.map(function (row) {
      var obj = {};
      headers.forEach(function (header, index) {
        obj[header.toUpperCase()] = row[header];
      });
      return obj;
    });
    var workbook = XLSX.utils.book_new();
    var worksheet = XLSX.utils.json_to_sheet(toExcel, { header: headers.map(function (header) { return header.toUpperCase(); }) });
    XLSX.utils.book_append_sheet(workbook, worksheet, "Data");
    var file = new Blob([XLSX.write(workbook, { type: "array", bookType: "xlsx" })], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(file, "MyBolucompras.xlsx");
    setTimeout(function () {
      window.location.reload();
    }, 1000);


  });



}

cargarTabla();


let modalAgregar = document.getElementById("modal-agregar");
let agregar = document.getElementById("agregar-btn");
let table = document.getElementById("tabla");
let html = document.querySelector("#gastos");

agregar.addEventListener("click", function () {
  modalAgregar.classList.remove("hide");
  modalAgregar.classList.add("animation-slideInUp");
  html.style.filter = "blur(5px)";
});



let tipo = document.getElementById("tipo");
let cuotas = document.getElementById("cuotas");

tipo.addEventListener('change', function () {
  if (this.value === 'debito') {
    cuotas.style.display = 'none';
    cuotas.value = 1;
  } else if (this.value === 'credito') {
    cuotas.style.display = '';
  }
});

let guardar = document.getElementById("guardar");
guardar.addEventListener("click", event => {
  //prevent default action
  event.preventDefault();

  let id = generateUniqueId();
  let objeto = document.getElementById("objeto").value;
  let fecha = document.getElementById("fecha").value;
  let medio = document.getElementById("medio").value;
  let tipo = document.getElementById("tipo");
  let cuotas = document.getElementById("cuotas");
  cuotas = cuotas.value;
  tipo = tipo.value;
  let banco = document.getElementById("banco").value;
  let cantidad = document.getElementById("cantidad").value;
  let precio = document.getElementById("precio").value;

  console.log("objeto: ", objeto, "fecha: ", fecha, "medio: ", medio, "cuotas: ", cuotas, "tipo: ", tipo, "banco: ", banco, "cantidad: ", cantidad, "precio: ", precio);
  if (objeto == "" || fecha == "" || precio == "" || tipo == undefined || medio == undefined || banco == undefined) {
    mostrarModalIncompleto();
  }
  else {
    if (medio == "Mediopago" || medio == undefined) {
      medio = "Sin medio de pago";
    }
    if (banco == "Banco" || banco == undefined) {
      banco = "Ninguno";
    }
    if (tipo == "Tipo" || tipo == undefined) {
      tipo = "debito";
    }
    if (cantidad == "" || cantidad == undefined) {
      cantidad = 1;
    }
    if (cuotas == "" || cuotas == undefined) {
      cuotas = 1;
    }
    guardarDatos(agregarDatosObjeto(id, objeto, fecha, medio, cuotas, tipo, banco, cantidad, precio));
    modalAgregar.classList.add("hide");
    html.style.filter = "blur(0px)";
    window.location.reload();
  }
});

let eliminar = document.getElementById("eliminar");
eliminar.addEventListener("click", function () {
  modalAgregar.classList.add("hide");
  html.style.filter = "blur(0px)";
});


let modalAgregarFijo = document.getElementById("modal-agregarFijo");
let agregarFijo = document.getElementById("agregarFijo-btn");

agregarFijo.addEventListener("click", function () {
  modalAgregarFijo.classList.remove("hide");
  modalAgregarFijo.classList.add("animation-slideInUp");
  html.style.filter = "blur(5px)";
});

function generateUniqueId() {
  let id = Math.floor(Math.random() * 1000000); // Genera un número aleatorio entre 0 y 999999
  let existingElement = document.getElementById(id.toString());

  while (existingElement) { // Mientras el elemento exista, genera un nuevo ID
    id = Math.floor(Math.random() * 1000000);
    existingElement = document.getElementById(id.toString());
  }


  return id;
}

let guardarFijo = document.getElementById("guardarFijo");
guardarFijo.addEventListener("click", event => {
  event.preventDefault();
  let id = generateUniqueId();
  let objeto = document.getElementById("objetoFijo").value;
  let fecha = document.getElementById("fechaFijo").value;
  let medio = document.getElementById("medioFijo").value;
  let cuotas = document.getElementById("cuotasFijo").value;
  let banco = document.getElementById("bancoFijo").value;
  let cantidad = document.getElementById("cantidadFijo").value;
  let precio = document.getElementById("precioFijo").value;

  if (objeto == "" || fecha == "" || cuotas == "" || banco == "" || cantidad == "" || precio == "") {
    mostrarModalIncompleto();
  }
  else {
    if (medio == "Mediopago" || medio == undefined) {
      medio = "Sin medio de pago";
    }
    if (banco == "Banco" || banco == undefined) {
      banco = "Ninguno";
    }
    if (tipo == "Tipo" || tipo == undefined) {
      tipo = "debito";
    }
    if (cantidad == "" || cantidad == undefined) {
      cantidad = 1;
    }
    if (cuotas == "" || cuotas == undefined) {
      cuotas = 1;
    }
    guardarDatos(agregarDatosObjetoFijo(id, objeto, fecha, medio, cuotas, banco, cantidad, precio));
    modalAgregarFijo.classList.add("hide");
    window.location.reload();
  }
});

let eliminarFijo = document.getElementById("eliminarFijo");
eliminarFijo.addEventListener("click", function () {
  modalAgregarFijo.classList.add("hide");
  html.style.filter = "blur(0px)";
});



// Obtener el video por su ID o selector
var video = document.getElementById('mi-video'); // Reemplaza 'miVideo' con el ID o selector de tu video

// Obtener la altura de la ventana del navegador
var windowHeight = window.innerHeight;

// Calcular el punto de detención a los 90vh
var stopPoint = windowHeight * 0.8;

// Variable para controlar el estado de reproducción del video
var isPlaying = true;

// Detectar el desplazamiento vertical de la ventana del navegador
window.addEventListener('scroll', function () {
  // Obtener la posición actual del desplazamiento vertical
  var scrollPosition = window.pageYOffset || document.documentElement.scrollTop;

  // Comparar la posición actual con el punto de detención
  if (scrollPosition >= stopPoint && isPlaying) {
    // Detener la reproducción del video
    video.pause();
    isPlaying = false;
  } else if (scrollPosition < stopPoint && !isPlaying) {
    // Reanudar la reproducción del video
    video.play();
    isPlaying = true;
  }
});

// selecciona el botón de flecha
const arrowButton = document.querySelector('.ca3-scroll-down-link');

// obtiene la posición inicial de la sección de gastos
const gastosSection = document.querySelector('#inicio');
const gastosSectionTop = gastosSection.offsetTop;

// verifica la posición de desplazamiento de la página y agrega la clase "hidden" al botón de flecha si se ha desplazado más allá de la posición inicial de la sección
window.addEventListener('scroll', () => {
  if (window.pageYOffset > gastosSectionTop) {
    arrowButton.classList.add('hidden');
  } else {
    arrowButton.classList.remove('hidden');
  }
});

document.addEventListener('DOMContentLoaded', (event) => {
  const arrowButton = document.querySelector('#ca3-scroll-down-arrow');
  if (arrowButton) {
    arrowButton.addEventListener('click', function (event) {
      event.preventDefault(); // evita el comportamiento predeterminado de la flecha

      var navbarHeight = document.getElementById('navbar').offsetHeight; // obtiene la altura del navbar
      var sectionTop = document.getElementById('gastos').offsetTop - navbarHeight; // obtiene la posición superior de la sección y resta la altura del navbar
      window.scrollTo({ top: sectionTop, behavior: 'smooth' }); // desplaza a la sección con margen para mostrar el navbar completo
    });
  }
});

