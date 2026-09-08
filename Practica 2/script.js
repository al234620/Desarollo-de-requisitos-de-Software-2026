const producto = document.getElementById("producto");
const cantidad = document.getElementById("cantidad");
const total = document.getElementById("total");
const detalleTotal = document.getElementById("detalleTotal");
const formPedido = document.getElementById("formPedido");
const ticket = document.getElementById("ticket");
const nombre = document.getElementById("nombre");

const errorNombre = document.getElementById("errorNombre");
const errorCantidad = document.getElementById("errorCantidad");


function obtenerPrecio() {
    return Number(producto.value);
}


function obtenerCantidad() {
    return Number(cantidad.value);
}


function actualizarTotal() {

    let cantidadActual = obtenerCantidad();

    if (!cantidadActual || cantidadActual < 1) {
        cantidadActual = 1;
    }

    if (cantidadActual > 20) {
        cantidadActual = 20;
    }

    cantidad.value = cantidadActual;

    const precio = obtenerPrecio();

    const totalPedido = precio * cantidadActual;

    total.textContent = "$" + totalPedido;

    detalleTotal.textContent =
        cantidadActual + " × $" + precio;
}


function seleccionarProducto(precio) {

    producto.value = precio;

    actualizarTotal();

    document.getElementById("pedido").scrollIntoView({
        behavior: "smooth"
    });
}


function validarFormulario() {

    let valido = true;

    errorNombre.textContent = "";
    errorCantidad.textContent = "";


    if (nombre.value.trim().length < 2) {

        errorNombre.textContent =
            "Escribe un nombre válido.";

        valido = false;
    }


    const cantidadActual = obtenerCantidad();


    if (
        !cantidadActual ||
        cantidadActual < 1 ||
        cantidadActual > 20
    ) {

        errorCantidad.textContent =
            "La cantidad debe estar entre 1 y 20.";

        valido = false;
    }


    return valido;
}


function crearTicket() {

    const opcionSeleccionada =
        producto.options[producto.selectedIndex];

    const nombreProducto =
        opcionSeleccionada.dataset.nombre;

    const precio = obtenerPrecio();

    const cantidadActual = obtenerCantidad();

    const totalPedido =
        precio * cantidadActual;


    const folio =
        Math.floor(1000 + Math.random() * 9000);


    ticket.classList.add("ticket-confirmado");


    ticket.innerHTML = `

        <div class="ticket-icono">
            ✓
        </div>

        <span class="ticket-etiqueta">
            Pedido #${folio}
        </span>

        <h3>
            ¡Pedido realizado!
        </h3>

        <p class="aviso-exito">
            ✓ Tu pedido sí se registró correctamente
        </p>


        <div class="ticket-datos">

            <div class="ticket-fila">

                <span>
                    Nombre
                </span>

                <strong>
                    ${escaparHTML(nombre.value.trim())}
                </strong>

            </div>


            <div class="ticket-fila">

                <span>
                    Producto
                </span>

                <strong>
                    ${nombreProducto}
                </strong>

            </div>


            <div class="ticket-fila">

                <span>
                    Cantidad
                </span>

                <strong>
                    ${cantidadActual}
                </strong>

            </div>


            <div class="ticket-fila ticket-total">

                <span>
                    Total
                </span>

                <strong>
                    $${totalPedido}
                </strong>

            </div>

        </div>


        <p>
            Presenta este número cuando recojas
            tu pedido en la cafetería.
        </p>

    `;
}


function escaparHTML(texto) {

    const elemento =
        document.createElement("div");

    elemento.textContent = texto;

    return elemento.innerHTML;
}


producto.addEventListener(
    "change",
    actualizarTotal
);


cantidad.addEventListener(
    "input",
    actualizarTotal
);


nombre.addEventListener("input", () => {

    if (nombre.value.trim().length >= 2) {

        errorNombre.textContent = "";

    }

});


document
    .getElementById("sumar")
    .addEventListener("click", () => {

        const actual =
            Math.min(
                20,
                obtenerCantidad() + 1
            );

        cantidad.value = actual;

        actualizarTotal();

    });


document
    .getElementById("restar")
    .addEventListener("click", () => {

        const actual =
            Math.max(
                1,
                obtenerCantidad() - 1
            );

        cantidad.value = actual;

        actualizarTotal();

    });


document
    .querySelectorAll(".boton-agregar")
    .forEach((boton) => {

        boton.addEventListener("click", () => {

            seleccionarProducto(
                boton.dataset.producto
            );

        });

    });


formPedido.addEventListener(
    "submit",
    (evento) => {

        evento.preventDefault();


        if (!validarFormulario()) {
            return;
        }


        actualizarTotal();

        crearTicket();

    }
);


actualizarTotal();