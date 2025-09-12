const express = require("express");
const fs = require("fs");
const app = express();
app.use(express.json());
app.use(express.static("public"));

const FILE = "./usuarios.json";

// Esta funcion sirve para obtener los usuarios desde el archivo usuarios.json
function getUsuarios() {
  return JSON.parse(fs.readFileSync(FILE));
}

// Esta funcion sirve para guardar un usuario en el archivo usuarios.json
function saveUsuarios(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

app.post("/login", (req, res) => {
  const { usuario, contrasena } = req.body;
  const usuarios = getUsuarios();

  const user = usuarios.find(
    u => u.usuario === usuario && u.contrasena === contrasena
  );

  if (!user) {
    return res.status(401).json({ mensaje: "Credenciales inválidas" });
  }

  res.json({ mensaje: "Login exitoso", rol: user.rol });
});

// Registrar un nuevo usuario, esto se usará en rh-service
app.post("/register", (req, res) => {
  const { usuario, contrasena, rol } = req.body;
  const usuarios = getUsuarios();

  if (usuarios.find(u => u.usuario === usuario)) {
    return res.status(400).json({ mensaje: "El usuario ya existe" });
  }

  usuarios.push({ usuario, contrasena, rol });
  saveUsuarios(usuarios);

  res.json({ mensaje: "Usuario registrado con éxito" });
});

app.listen(3000, () => {
  console.log("Servicio de Login corriendo en http://localhost:3000/login.html");
});
