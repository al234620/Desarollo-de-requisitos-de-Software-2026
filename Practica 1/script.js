function solicitarCita(){

let nombre = document.getElementById("nombre").value;
let mascota = document.getElementById("mascota").value;
let fecha = document.getElementById("fecha").value;

document.getElementById("mensaje").innerHTML=
"Cita Solicitada para" + mascota + "por" + nombre +
"eldia" + fecha;
}