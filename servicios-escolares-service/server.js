const express = require("express");
const fs = require("fs");
const axios = require("axios");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const ALUMNOS_FILE = "./alumnos.json";
const GRUPOS_FILE = "./grupos.json";

// Funciones para manejar archivos JSON
function getAlumnos() {
  if (!fs.existsSync(ALUMNOS_FILE)) {
    fs.writeFileSync(ALUMNOS_FILE, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(ALUMNOS_FILE));
}

function saveAlumnos(data) {
  fs.writeFileSync(ALUMNOS_FILE, JSON.stringify(data, null, 2));
}

function getGrupos() {
  if (!fs.existsSync(GRUPOS_FILE)) {
    fs.writeFileSync(GRUPOS_FILE, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(GRUPOS_FILE));
}

function saveGrupos(data) {
  fs.writeFileSync(GRUPOS_FILE, JSON.stringify(data, null, 2));
}

// Rutas para alumnos
app.get("/alumnos", (req, res) => {
  res.json(getAlumnos());
});

app.post("/alumnos", async (req, res) => {
  const { matricula, nombre, carrera, semestre, usuario, contrasena } = req.body;
  const alumnos = getAlumnos();

  if (alumnos.find(a => a.matricula === matricula)) {
    return res.status(400).json({ mensaje: "El alumno ya existe" });
  }

  const nuevoAlumno = { matricula, nombre, carrera, semestre };
  alumnos.push(nuevoAlumno);
  saveAlumnos(alumnos);

  try {
    // Registrar también en auth-service
    await axios.post("http://localhost:3000/register", {
      usuario,
      contrasena,
      rol: "alumno"
    });
  } catch (error) {
    return res.status(500).json({ mensaje: "Error registrando en auth-service" });
  }

  res.json({ mensaje: "Alumno registrado con éxito", alumno: nuevoAlumno });
});

// Rutas para grupos
app.get("/grupos", (req, res) => {
  res.json(getGrupos());
});

app.post("/grupos", async (req, res) => {
  const { nombre, carrera } = req.body;
  const grupos = getGrupos();

  if (grupos.find(g => g.nombre === nombre)) {
    return res.status(400).json({ mensaje: "El grupo ya existe" });
  }

  const nuevoGrupo = { 
    id: Date.now().toString(),
    nombre, 
    carrera,
    alumnos: [],
    profesor: null
  };
  
  grupos.push(nuevoGrupo);
  saveGrupos(grupos);

  res.json({ mensaje: "Grupo creado con éxito", grupo: nuevoGrupo });
});

// Agregar alumno a grupo
app.post("/grupos/:id/alumnos", (req, res) => {
  const { id } = req.params;
  const { matricula } = req.body;
  const grupos = getGrupos();
  const alumnos = getAlumnos();

  const grupo = grupos.find(g => g.id === id);
  if (!grupo) {
    return res.status(404).json({ mensaje: "Grupo no encontrado" });
  }

  const alumno = alumnos.find(a => a.matricula === matricula);
  if (!alumno) {
    return res.status(404).json({ mensaje: "Alumno no encontrado" });
  }

  if (grupo.alumnos.find(a => a.matricula === matricula)) {
    return res.status(400).json({ mensaje: "El alumno ya está en el grupo" });
  }

  grupo.alumnos.push({ matricula: alumno.matricula, nombre: alumno.nombre });
  saveGrupos(grupos);

  res.json({ mensaje: "Alumno agregado al grupo con éxito", grupo });
});

// Asignar profesor a grupo
app.post("/grupos/:id/profesor", async (req, res) => {
  const { id } = req.params;
  const { numeroEmpleado } = req.body;
  const grupos = getGrupos();

  const grupo = grupos.find(g => g.id === id);
  if (!grupo) {
    return res.status(404).json({ mensaje: "Grupo no encontrado" });
  }

  try {
    // Obtener información del profesor desde RH
    const response = await axios.get(`http://localhost:4000/empleados/${numeroEmpleado}`);
    const profesor = response.data;
    
    if (profesor.puesto !== "profesor") {
      return res.status(400).json({ mensaje: "El empleado no es un profesor" });
    }

    grupo.profesor = {
      numeroEmpleado: profesor.numeroEmpleado,
      nombre: profesor.nombre
    };
    
    saveGrupos(grupos);
    res.json({ mensaje: "Profesor asignado al grupo con éxito", grupo });
  } catch (error) {
    res.status(404).json({ mensaje: "Profesor no encontrado en RH" });
  }
});

app.listen(5001, () => {
  console.log("Servicio de Servicios Escolares corriendo en http://localhost:5001/servicios-escolares.html");
});

// Actualizar información de un alumno
app.put("/alumnos/:matricula", (req, res) => {
  const { matricula } = req.params;
  const { nombre, carrera, semestre } = req.body;
  const alumnos = getAlumnos();

  const alumnoIndex = alumnos.findIndex(a => a.matricula === matricula);
  if (alumnoIndex === -1) {
    return res.status(404).json({ mensaje: "Alumno no encontrado" });
  }

  // Actualizar los campos proporcionados
  if (nombre) alumnos[alumnoIndex].nombre = nombre;
  if (carrera) alumnos[alumnoIndex].carrera = carrera;
  if (semestre) alumnos[alumnoIndex].semestre = semestre;

  saveAlumnos(alumnos);
  res.json({ mensaje: "Alumno actualizado con éxito", alumno: alumnos[alumnoIndex] });
});

// Obtener un alumno específico
app.get("/alumnos/:matricula", (req, res) => {
  const { matricula } = req.params;
  const alumnos = getAlumnos();

  const alumno = alumnos.find(a => a.matricula === matricula);
  if (!alumno) {
    return res.status(404).json({ mensaje: "Alumno no encontrado" });
  }

  res.json(alumno);
});