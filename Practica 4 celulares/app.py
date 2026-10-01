from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    session,
    send_from_directory
)

from werkzeug.security import check_password_hash
from werkzeug.utils import secure_filename

import json
from pathlib import Path


# =====================================================
# CREDENCIALES
# =====================================================

APP_USER = "Andre" #Ejemplo Jaime
# Escribe aquí el usuario que utilizarás para iniciar sesión.
# Ejemplo: "jaime"


APP_PW_HASH = APP_PW_HASH = "scrypt:32768:8:1$WoICOoys2Ocq5OT6$088b4e2fec334072bc95aca6ab2d0dce259590caf2c71ee7d9159e83c536b9983459085bededabc0c07276bf6535f690514d125501a658c7a0bd9b535f2a8f52"  # Ejemplo: "scrypt:32768:8:1$...$..."
# Ejemplo: "scrypt:32768:8:1$...$..."


SECRET_KEY = "Poposita" # Pon una clave larga y aleatoria  
# Escribe una clave secreta larga y aleatoria.

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

EQUIPOS_FILE = BASE_DIR / "equipos.json"


# Crear la carpeta de fotos si no existe

FOTOS_DIR.mkdir(exist_ok=True)


# =====================================================
# CARGAR EQUIPOS
# =====================================================

def cargar_equipos():

    if not EQUIPOS_FILE.exists():
        return []

    with open(
        EQUIPOS_FILE,
        "r",
        encoding="utf-8"
    ) as archivo:

        return json.load(archivo)


# =====================================================
# GUARDAR EQUIPOS
# =====================================================

def guardar_equipos(equipos):

    with open(
        EQUIPOS_FILE,
        "w",
        encoding="utf-8"
    ) as archivo:

        json.dump(
            equipos,
            archivo,
            ensure_ascii=False,
            indent=4
        )


# =====================================================
# MOSTRAR FOTOGRAFÍAS
# =====================================================

@app.route("/fotos/<nombre>")
def foto(nombre):

    return send_from_directory(
        FOTOS_DIR,
        nombre
    )


# =====================================================
# INICIO DE SESIÓN
# =====================================================

@app.route(
    "/login",
    methods=["GET", "POST"]
)
def login():

    if request.method == "POST":

        usuario = request.form.get(
            "username",
            ""
        ).strip()

        password = request.form.get(
            "password",
            ""
        )


        # Comprobar usuario y contraseña

        if (
            usuario == APP_USER
            and check_password_hash(
                APP_PW_HASH,
                password
            )
        ):

            session["logged_in"] = True

            session["usuario"] = usuario

            return redirect(
                url_for("index")
            )


        return render_template(
            "login.html",
            error="Usuario o contraseña incorrectos"
        )


    return render_template(
        "login.html",
        error=None
    )


# =====================================================
# PÁGINA PRINCIPAL
# =====================================================

@app.route("/")
def index():

    # Comprobar que el usuario inició sesión

    if not session.get("logged_in"):

        return redirect(
            url_for("login")
        )


    equipos = cargar_equipos()


    return render_template(
        "index.html",
        usuario=session.get("usuario"),
        equipos=equipos
    )


# =====================================================
# REGISTRAR NUEVO EQUIPO
# =====================================================

@app.route(
    "/nuevo_equipo",
    methods=["POST"]
)
def nuevo_equipo():

    # Comprobar sesión

    if not session.get("logged_in"):

        return redirect(
            url_for("login")
        )


    equipos = cargar_equipos()


    # -----------------------------------------------
    # DATOS DEL CLIENTE Y EQUIPO
    # -----------------------------------------------

    cliente = request.form.get(
        "cliente",
        ""
    ).strip()


    marca = request.form.get(
        "marca",
        ""
    ).strip()


    modelo = request.form.get(
        "modelo",
        ""
    ).strip()


    problema = request.form.get(
        "problema",
        ""
    ).strip()


    costo = request.form.get(
        "costo",
        ""
    ).strip()


    estado = request.form.get(
        "estado",
        "Pendiente"
    )


    # -----------------------------------------------
    # FOTOGRAFÍA
    # -----------------------------------------------

    archivo = request.files.get("foto")

    nombre_foto = ""


    if archivo and archivo.filename:

        nombre_foto = secure_filename(
            archivo.filename
        )

        archivo.save(
            FOTOS_DIR / nombre_foto
        )


    # -----------------------------------------------
    # CREAR REGISTRO
    # -----------------------------------------------

    nuevo_equipo = {

        "cliente": cliente,

        "marca": marca,

        "modelo": modelo,

        "problema": problema,

        "costo": costo,

        "estado": estado,

        "foto": nombre_foto
    }


    equipos.append(
        nuevo_equipo
    )


    guardar_equipos(
        equipos
    )


    return redirect(
        url_for("index")
    )


# =====================================================
# CERRAR SESIÓN
# =====================================================

@app.route("/logout")
def logout():

    session.clear()

    return redirect(
        url_for("login")
    )


# =====================================================
# EJECUTAR FLASK
# =====================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )
