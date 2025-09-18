const express = require("express");
const fs = require("fs");
const crypto = require("crypto");
const cors = require('cors');
const axios = require('axios');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const FILE = "./usuarios.json";
const SESSION_DURATION = 15 * 60 * 1000;

function getUsuarios() {
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, JSON.stringify([]));
  return JSON.parse(fs.readFileSync(FILE));
}

function saveUsuarios(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

async function getFullUserInfo(user) {
    if (user.rol !== 'profesor') {
        return user;
    }
    try {
        // Intenta obtener datos adicionales del servicio de RH
        const rhResponse = await axios.get(`http://localhost:4000/empleado/usuario/${user.usuario}`);
        return { ...user, ...rhResponse.data };
    } catch (error) {
        // Si falla, no detiene el login. Solo lo registra y continúa.
        console.error(`Error al buscar empleado '${user.usuario}' en RH. Continuando sin datos de RH.`);
        return user; // Devuelve el usuario sin los datos de RH
    }
}

app.post("/login", async (req, res) => {
  const { usuario, contrasena } = req.body;
  const usuarios = getUsuarios();
  const userIndex = usuarios.findIndex(u => u.usuario === usuario && u.contrasena === contrasena);

  if (userIndex === -1) {
    return res.status(401).json({ mensaje: "Credenciales inválidas" });
  }
  
  try {
    const user = usuarios[userIndex];
    const fullUserInfo = await getFullUserInfo(user);

    const sessionToken = crypto.randomBytes(32).toString("hex");
    const tokenExpiresAt = Date.now() + SESSION_DURATION;
    usuarios[userIndex].sessionToken = sessionToken;
    usuarios[userIndex].tokenExpiresAt = tokenExpiresAt;
    saveUsuarios(usuarios);

    delete fullUserInfo.contrasena;
    res.json({ 
      mensaje: "Login exitoso", 
      token: sessionToken,
      usuario: fullUserInfo
    });
  } catch(error) {
    res.status(500).json({ mensaje: error.message });
  }
});

app.post("/verify-token", async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ mensaje: "Token no proporcionado." });
    
    const usuarios = getUsuarios();
    const user = usuarios.find(u => u.sessionToken === token);

    if (!user) return res.status(401).json({ mensaje: "Token inválido." });
    if (Date.now() > user.tokenExpiresAt) return res.status(401).json({ mensaje: "La sesión ha expirado." });
    
    try {
        const fullUserInfo = await getFullUserInfo(user);
        delete fullUserInfo.contrasena;
        res.json({ mensaje: "Token válido", usuario: fullUserInfo });
    } catch(error) {
        res.status(401).json({ mensaje: error.message });
    }
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

app.post("/register", (req, res) => {
  const { usuario, contrasena, rol, matricula } = req.body;
  const usuarios = getUsuarios();

  if (usuarios.find(u => u.usuario === usuario)) {
    return res.status(400).json({ mensaje: "El usuario ya existe" });
  }

  const nuevoUsuario = { usuario, contrasena, rol, matricula };
  usuarios.push(nuevoUsuario);
  saveUsuarios(usuarios);

  res.status(201).json({ mensaje: "Usuario registrado con éxito", usuario: nuevoUsuario });
});
