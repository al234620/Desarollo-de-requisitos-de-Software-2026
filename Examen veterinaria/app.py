from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    session,
    send_from_directory,
    send_file
)

from werkzeug.security import check_password_hash
from werkzeug.utils import secure_filename

import csv
import io
import json
from pathlib import Path


# =====================================================
# USUARIOS DEL SISTEMA
# =====================================================

USUARIOS = {
    "empleado1": "pbkdf2:sha256:600000$e481ef6e46254bbe$d2d0193734e766e7855534e09f2a40daf49cec04506122ae42452946283efd47",
    "empleado2": "pbkdf2:sha256:600000$d002ca65cc40e1da$b5905b1237205e5775f79bc7e5995142654e36ae74b302749d9bcbb90d9941bb"
}

SECRET_KEY = "clinica-veterinaria-2026-clave-segura"


# =====================================================
# APLICACIÓN FLASK
# =====================================================

app = Flask(__name__)
app.secret_key = SECRET_KEY


# =====================================================
# CARPETAS Y ARCHIVOS
# =====================================================

BASE_DIR = Path(__file__).resolve().parent
FOTOS_DIR = BASE_DIR / "fotos"
PACIENTES_FILE = BASE_DIR / "pacientes.json"

FOTOS_DIR.mkdir(exist_ok=True)


# =====================================================
# FUNCIONES PARA LOS DATOS
# =====================================================

def cargar_pacientes():
    if not PACIENTES_FILE.exists():
        return []

    with open(PACIENTES_FILE, "r", encoding="utf-8") as archivo:
        return json.load(archivo)


def guardar_pacientes(pacientes):
    with open(PACIENTES_FILE, "w", encoding="utf-8") as archivo:
        json.dump(
            pacientes,
            archivo,
            ensure_ascii=False,
            indent=4
        )


def sesion_iniciada():
    return session.get("logged_in", False)


# =====================================================
# MOSTRAR FOTOGRAFÍAS
# =====================================================

@app.route("/fotos/<nombre>")
def foto(nombre):
    return send_from_directory(FOTOS_DIR, nombre)


# =====================================================
# INICIO DE SESIÓN
# =====================================================

@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        usuario = request.form.get("username", "").strip()
        password = request.form.get("password", "")

        hash_guardado = USUARIOS.get(usuario)

        if hash_guardado and check_password_hash(hash_guardado, password):
            session["logged_in"] = True
            session["usuario"] = usuario
            return redirect(url_for("index"))

        return render_template(
            "login.html",
            error="Usuario o contraseña incorrectos"
        )

    return render_template("login.html", error=None)


# =====================================================
# PÁGINA PRINCIPAL Y CONSULTA
# =====================================================

@app.route("/")
def index():
    if not sesion_iniciada():
        return redirect(url_for("login"))

    pacientes = cargar_pacientes()
    busqueda = request.args.get("buscar", "").strip().lower()

    pacientes_mostrados = []

    for indice, paciente in enumerate(pacientes):
        coincide = (
            not busqueda
            or busqueda in paciente.get("Nombre", "").lower()
            or busqueda in paciente.get("Tipo de animal", "").lower()
            or busqueda in paciente.get("Servicio", "").lower()
        )

        if coincide:
            paciente_mostrado = paciente.copy()
            paciente_mostrado["_indice"] = indice
            pacientes_mostrados.append(paciente_mostrado)

    return render_template(
        "index.html",
        usuario=session.get("usuario"),
        pacientes=pacientes_mostrados,
        total_pacientes=len(pacientes),
        busqueda=request.args.get("buscar", "")
    )


# =====================================================
# REGISTRAR NUEVA CITA
# =====================================================

@app.route("/nueva_cita", methods=["POST"])
def nueva_cita():
    if not sesion_iniciada():
        return redirect(url_for("login"))

    pacientes = cargar_pacientes()

    nombre = request.form.get("nombre", "").strip()
    tipo_animal = request.form.get("tipo_animal", "").strip()
    servicio = request.form.get("servicio", "").strip()
    fecha = request.form.get("fecha", "").strip()
    hora = request.form.get("hora", "").strip()
    costo = request.form.get("costo", "").strip()

    archivo = request.files.get("foto")
    nombre_foto = ""

    if archivo and archivo.filename:
        nombre_foto = secure_filename(archivo.filename)
        archivo.save(FOTOS_DIR / nombre_foto)

    nuevo_paciente = {
        "Nombre": nombre,
        "Tipo de animal": tipo_animal,
        "Servicio": servicio,
        "Fecha": fecha,
        "Costo de la cita": costo,
        "Hora": hora,
        "foto": nombre_foto
    }

    pacientes.append(nuevo_paciente)
    guardar_pacientes(pacientes)

    return redirect(url_for("index"))


# =====================================================
# ELIMINAR REGISTRO
# =====================================================

@app.route("/eliminar/<int:indice>", methods=["POST"])
def eliminar(indice):
    if not sesion_iniciada():
        return redirect(url_for("login"))

    pacientes = cargar_pacientes()

    if 0 <= indice < len(pacientes):
        pacientes.pop(indice)
        guardar_pacientes(pacientes)

    return redirect(url_for("index"))


# =====================================================
# EXPORTAR A CSV PARA EXCEL
# =====================================================

@app.route("/exportar")
def exportar():
    if not sesion_iniciada():
        return redirect(url_for("login"))

    pacientes = cargar_pacientes()

    salida = io.StringIO()
    campos = [
        "Nombre",
        "Tipo de animal",
        "Servicio",
        "Fecha",
        "Costo de la cita",
        "Hora",
        "foto"
    ]

    escritor = csv.DictWriter(salida, fieldnames=campos)
    escritor.writeheader()
    escritor.writerows(pacientes)

    contenido = salida.getvalue().encode("utf-8-sig")
    archivo_csv = io.BytesIO(contenido)
    archivo_csv.seek(0)

    return send_file(
        archivo_csv,
        mimetype="text/csv; charset=utf-8",
        as_attachment=True,
        download_name="Pacientes.csv"
    )


# =====================================================
# CERRAR SESIÓN
# =====================================================

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))


# =====================================================
# EJECUTAR FLASK
# =====================================================

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )
