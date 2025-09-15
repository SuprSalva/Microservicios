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

// --- Funciones para Manejar Archivos JSON ---
function readData(filePath) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(filePath));
}

function writeData(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}


// --- Rutas para Alumnos ---

// Obtener todos los alumnos
app.get("/alumnos", (req, res) => {
  res.json(readData(ALUMNOS_FILE));
});

// Registrar un nuevo alumno
app.post("/alumnos", async (req, res) => {
  const { matricula, nombre, carrera, semestre, usuario, contrasena } = req.body;
  const alumnos = readData(ALUMNOS_FILE);

  if (alumnos.find(a => a.matricula === matricula)) {
    return res.status(400).json({ mensaje: "El alumno con esta matrícula ya existe." });
  }

  const nuevoAlumno = { matricula, nombre, carrera, semestre };
  alumnos.push(nuevoAlumno);
  writeData(ALUMNOS_FILE, alumnos);

  try {
    // Registrar también en el servicio de autenticación
    await axios.post("http://localhost:3000/register", {
      usuario,
      contrasena,
      rol: "alumno",
      matricula, // Enviamos la matrícula para asociarla
    });
    res.status(201).json({ mensaje: "Alumno registrado con éxito", alumno: nuevoAlumno });
  } catch (error) {
    // Si falla el registro en auth-service, revertimos la creación del alumno local
    const alumnosActualizados = readData(ALUMNOS_FILE).filter(a => a.matricula !== matricula);
    writeData(ALUMNOS_FILE, alumnosActualizados);
    
    console.error("Error registrando en auth-service:", error.response ? error.response.data : error.message);
    res.status(500).json({ mensaje: "Error al registrar el usuario en el servicio de autenticación." });
  }
});

// Obtener un alumno específico
app.get("/alumnos/:matricula", (req, res) => {
  const { matricula } = req.params;
  const alumnos = readData(ALUMNOS_FILE);
  const alumno = alumnos.find(a => a.matricula === matricula);

  if (!alumno) {
    return res.status(404).json({ mensaje: "Alumno no encontrado" });
  }
  res.json(alumno);
});


// Actualizar información de un alumno
app.put("/alumnos/:matricula", (req, res) => {
  const { matricula } = req.params;
  const { nombre, carrera, semestre } = req.body;
  const alumnos = readData(ALUMNOS_FILE);

  const alumnoIndex = alumnos.findIndex(a => a.matricula === matricula);
  if (alumnoIndex === -1) {
    return res.status(404).json({ mensaje: "Alumno no encontrado" });
  }

  // Actualizar solo los campos proporcionados
  if (nombre) alumnos[alumnoIndex].nombre = nombre;
  if (carrera) alumnos[alumnoIndex].carrera = carrera;
  if (semestre) alumnos[alumnoIndex].semestre = semestre;

  writeData(ALUMNOS_FILE, alumnos);
  res.json({ mensaje: "Alumno actualizado con éxito", alumno: alumnos[alumnoIndex] });
});


// --- Rutas para Grupos ---

// Obtener todos los grupos (o filtrados por profesor)
app.get("/grupos", (req, res) => {
    const grupos = readData(GRUPOS_FILE);
    const numeroEmpleado = req.query.numeroEmpleado;

    if (numeroEmpleado) {
        const gruposDelProfesor = grupos.filter(g => g.profesor && g.profesor.numeroEmpleado === numeroEmpleado);
        return res.json(gruposDelProfesor);
    }

    res.json(grupos);
});

// Crear un nuevo grupo
app.post("/grupos", async (req, res) => {
  const { nombre, carrera } = req.body;
  const grupos = readData(GRUPOS_FILE);

  if (grupos.find(g => g.nombre === nombre)) {
    return res.status(400).json({ mensaje: "El grupo ya existe" });
  }

  const nuevoGrupo = { 
    id: Date.now().toString(),
    nombre, 
    carrera,
    alumnos: [], // Se inicia vacío
    profesor: null // Se inicia sin profesor
  };
  
  grupos.push(nuevoGrupo);
  writeData(GRUPOS_FILE, grupos);

  res.status(201).json({ mensaje: "Grupo creado con éxito", grupo: nuevoGrupo });
});


// --- Rutas para Alumnos y Profesores en Grupos ---

// Obtener los alumnos de un grupo específico
app.get("/grupos/:id/alumnos", (req, res) => {
  try {
    const grupos = readData(GRUPOS_FILE);
    const alumnos = readData(ALUMNOS_FILE);
    const grupo = grupos.find(g => g.id === req.params.id);

    if (!grupo) {
      return res.status(404).json({ mensaje: "Grupo no encontrado" });
    }

    if (!Array.isArray(grupo.alumnos)) {
        return res.status(500).json({ mensaje: "El formato de alumnos en el grupo es incorrecto." });
    }
    
    // Devolvemos la información completa de los alumnos que están en el grupo
    const alumnosDelGrupo = alumnos.filter(a => grupo.alumnos.includes(a.matricula));
    res.json(alumnosDelGrupo);

  } catch (error) {
    console.error("Error al obtener alumnos del grupo:", error);
    res.status(500).json({ mensaje: "Error interno al procesar la solicitud." });
  }
});


// Agregar un alumno a un grupo
app.post("/grupos/:id/alumnos", (req, res) => {
  const { id } = req.params;
  const { matricula } = req.body;
  const grupos = readData(GRUPOS_FILE);
  const alumnos = readData(ALUMNOS_FILE);

  const grupoIndex = grupos.findIndex(g => g.id === id);
  if (grupoIndex === -1) {
    return res.status(404).json({ mensaje: "Grupo no encontrado" });
  }

  if (!alumnos.find(a => a.matricula === matricula)) {
    return res.status(404).json({ mensaje: "Alumno no encontrado" });
  }

  if (grupos[grupoIndex].alumnos.includes(matricula)) {
    return res.status(400).json({ mensaje: "El alumno ya está en el grupo" });
  }

  grupos[grupoIndex].alumnos.push(matricula);
  writeData(GRUPOS_FILE, grupos);

  res.json({ mensaje: "Alumno agregado al grupo con éxito", grupo: grupos[grupoIndex] });
});


// Asignar un profesor a un grupo
app.post("/grupos/:id/profesor", async (req, res) => {
  const { id } = req.params;
  const { numeroEmpleado } = req.body;
  const grupos = readData(GRUPOS_FILE);

  const grupoIndex = grupos.findIndex(g => g.id === id);
  if (grupoIndex === -1) {
    return res.status(404).json({ mensaje: "Grupo no encontrado" });
  }

  try {
    // Validar que el empleado exista en el servicio de RH
    const response = await axios.get(`http://localhost:4000/empleados/${numeroEmpleado}`);
    const profesor = response.data;
    
    if (profesor.puesto.toLowerCase() !== "profesor") {
      return res.status(400).json({ mensaje: "El empleado no es un profesor." });
    }

    grupos[grupoIndex].profesor = {
      numeroEmpleado: profesor.numeroEmpleado,
      nombre: profesor.nombre
    };
    
    writeData(GRUPOS_FILE, grupos);
    res.json({ mensaje: "Profesor asignado al grupo con éxito", grupo: grupos[grupoIndex] });

  } catch (error) {
    if (error.response && error.response.status === 404) {
        return res.status(404).json({ mensaje: "Profesor no encontrado en Recursos Humanos." });
    }
    console.error("Error al asignar profesor:", error.message);
    res.status(500).json({ mensaje: "Error al contactar el servicio de Recursos Humanos." });
  }
});


// --- Iniciar Servidor ---
app.listen(5001, () => {
  console.log("Servicio de Servicios Escolares corriendo en http://localhost:5001");
});