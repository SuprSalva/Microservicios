const express = require("express");
const fs = require("fs");
const axios = require("axios"); // Se utiliza axios para comunicar con auth-service
const app = express();
app.use(express.json());
app.use(express.static("public"));

const FILE = "./empleados.json";

function getEmpleados() {
  return JSON.parse(fs.readFileSync(FILE));
}

function saveEmpleados(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// Listamos los empleados para mostrarlos en la tabla
app.get("/empleados", (req, res) => {
  res.json(getEmpleados());
});

// Agregar un nuevo empleado
app.post("/empleados", async (req, res) => {
  const { numeroEmpleado, nombre, puesto, usuario, contrasena } = req.body;
  const empleados = getEmpleados();

  if (empleados.find(e => e.numeroEmpleado === numeroEmpleado)) {
    return res.status(400).json({ mensaje: "Empleado ya existe" });
  }

  const nuevoEmpleado = { numeroEmpleado, nombre, puesto };
  empleados.push(nuevoEmpleado);
  saveEmpleados(empleados);

  try {
    // Aqui registramos también en auth-service
    await axios.post("http://localhost:3000/register", {
      usuario,
      contrasena,
      rol: puesto.toLowerCase()
    });
  } catch (error) {
    return res.status(500).json({ mensaje: "Error registrando en auth-service" });
  }

  res.json({ mensaje: "Empleado agregado con éxito", empleado: nuevoEmpleado });
});

app.listen(4000, () => {
  console.log("Servicio de RH corriendo en http://localhost:4000/rh.html");
});
