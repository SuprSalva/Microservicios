const express = require("express");
const fs = require("fs");
const crypto = require("crypto");
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const FILE = "./usuarios.json";
const SESSION_DURATION = 15 * 60 * 1000;

// --- Funciones auxiliares ---
function getUsuarios() {
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify([]));
  return JSON.parse(fs.readFileSync(FILE));
}
function saveUsuarios(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// --- Endpoints ---

app.post("/login", (req, res) => {
  const { usuario, contrasena } = req.body;
  const usuarios = getUsuarios();
  const userIndex = usuarios.findIndex(u => u.usuario === usuario && u.contrasena === contrasena);

  if (userIndex === -1) {
    return res.status(401).json({ mensaje: "Credenciales inválidas" });
  }

  const sessionToken = crypto.randomBytes(32).toString("hex");
  const tokenExpiresAt = Date.now() + SESSION_DURATION;

  usuarios[userIndex].sessionToken = sessionToken;
  usuarios[userIndex].tokenExpiresAt = tokenExpiresAt;
  saveUsuarios(usuarios);

  const { contrasena: _, ...userSinContrasena } = usuarios[userIndex];
  res.json({ 
    mensaje: "Login exitoso", 
    token: sessionToken,
    usuario: userSinContrasena 
  });
});

app.post("/verify-token", (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ mensaje: "Token no proporcionado." });
    
    const usuarios = getUsuarios();
    const user = usuarios.find(u => u.sessionToken === token);

    if (!user) return res.status(401).json({ mensaje: "Token inválido." });
    if (Date.now() > user.tokenExpiresAt) return res.status(401).json({ mensaje: "La sesión ha expirado." });
    
    const { contrasena: _, ...userSinContrasena } = user;
    res.json({ mensaje: "Token válido", usuario: userSinContrasena });
});

app.post("/logout", (req, res) => {
    const { token } = req.body;
    if (token) {
        const usuarios = getUsuarios();
        const userIndex = usuarios.findIndex(u => u.sessionToken === token);
        if (userIndex !== -1) {
            delete usuarios[userIndex].sessionToken;
            delete usuarios[userIndex].tokenExpiresAt;
            saveUsuarios(usuarios);
        }
    }
    res.json({ mensaje: "Sesión cerrada con éxito" });
});

app.post("/change-password", (req, res) => {
    const { usuario, contrasenaActual, contrasenaNueva } = req.body;
    const usuarios = getUsuarios();
    const userIndex = usuarios.findIndex(u => u.usuario === usuario && u.contrasena === contrasenaActual);

    if (userIndex === -1) {
        return res.status(401).json({ mensaje: "La contraseña actual no es correcta." });
    }

    usuarios[userIndex].contrasena = contrasenaNueva;
    delete usuarios[userIndex].sessionToken;
    delete usuarios[userIndex].tokenExpiresAt;
    saveUsuarios(usuarios);

    res.json({ mensaje: "Contraseña actualizada. Por favor, inicia sesión de nuevo." });
});

app.listen(3000, () => {
  console.log("Servicio de Login (VERSIÓN ESTABLE) corriendo en http://localhost:3000/login.html");
});