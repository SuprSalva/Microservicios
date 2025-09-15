const express = require("express");
const fs = require("fs");
const axios = require("axios");
const app = express();
app.use(express.json());
app.use(express.static("public"));

const FILE = "./empleados.json";

function getEmpleados() {
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(FILE));
}

function saveEmpleados(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

app.get("/empleados", (req, res) => {
  res.json(getEmpleados());
});

app.get("/empleados/:numeroEmpleado", (req, res) => {
  const { numeroEmpleado } = req.params;
  const empleados = getEmpleados();
  const empleado = empleados.find(e => e.numeroEmpleado === numeroEmpleado);
  if (!empleado) {
    return res.status(404).json({ mensaje: "Empleado no encontrado" });
  }
  res.json(empleado);
});

app.get("/empleado/usuario/:usuario", (req, res) => {
  const { usuario } = req.params;
  const empleados = getEmpleados();
  const empleado = empleados.find(e => e.usuario === usuario);
  if (!empleado) {
    return res.status(404).json({ mensaje: "Empleado no encontrado para ese usuario" });
  }
  res.json(empleado);
});

app.post("/empleados", async (req, res) => {
  const { numeroEmpleado, nombre, puesto, usuario, contrasena } = req.body;
  const empleados = getEmpleados();
  if (empleados.find(e => e.numeroEmpleado === numeroEmpleado)) {
    return res.status(400).json({ mensaje: "Empleado ya existe" });
  }

  const nuevoEmpleado = { numeroEmpleado, nombre, puesto, usuario };
  empleados.push(nuevoEmpleado);
  saveEmpleados(empleados);

  try {
    await axios.post("http://localhost:3000/register", {
      usuario, contrasena, rol: puesto.toLowerCase(),
    });
  } catch (error) {
    return res.status(500).json({ mensaje: "Error registrando en auth-service" });
  }
  res.json({ mensaje: "Empleado agregado con éxito", empleado: nuevoEmpleado });
});

app.listen(4000, () => {
  console.log("Servicio de RH (VERSIÓN ESTABLE) corriendo en http://localhost:4000/rh.html");
});