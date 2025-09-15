const express = require("express");
const fs = require("fs");
const axios = require("axios");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const CALIFICACIONES_FILE = "./calificaciones.json";

function getCalificaciones() {
  if (!fs.existsSync(CALIFICACIONES_FILE)) {
    fs.writeFileSync(CALIFICACIONES_FILE, JSON.stringify([]));
  }
  return JSON.parse(fs.readFileSync(CALIFICACIONES_FILE));
}

function saveCalificaciones(data) {
  fs.writeFileSync(CALIFICACIONES_FILE, JSON.stringify(data, null, 2));
}

// Ruta para obtener todas las calificaciones
app.get("/calificaciones", (req, res) => {
    res.json(getCalificaciones());
});

// Ruta para guardar o actualizar las calificaciones de un alumno
app.post("/calificaciones", async (req, res) => {
    const { matricula, grupoId, parcial1, parcial2, parcial3 } = req.body;
    const calificaciones = getCalificaciones();

    let califIndex = calificaciones.findIndex(c => c.matricula === matricula && c.grupoId === grupoId);

    if (califIndex === -1) {
        calificaciones.push({ matricula, grupoId });
        califIndex = calificaciones.length - 1;
    }
    
    const registro = calificaciones[califIndex];
    
    // Asignamos las calificaciones, asegurándonos de que sean números
    registro.parcial1 = parcial1 !== null ? parseFloat(parcial1) : null;
    registro.parcial2 = parcial2 !== null ? parseFloat(parcial2) : null;
    registro.parcial3 = parcial3 !== null ? parseFloat(parcial3) : null;

    // Calculamos la suma de las notas que no son nulas
    const notas = [registro.parcial1, registro.parcial2, registro.parcial3];
    const sum = notas.reduce((acc, nota) => acc + (nota || 0), 0);
    
    // **LA CORRECCIÓN ESTÁ AQUÍ**
    // Se divide la suma entre el número total de parciales (3)
    registro.final = parseFloat((sum / 3).toFixed(2));
    
    saveCalificaciones(calificaciones);
    res.json({ mensaje: "Calificaciones guardadas con éxito", data: registro });
});

// Ruta para cambiar la contraseña (sin cambios)
app.post("/change-password", async (req, res) => {
    const { usuario, contrasenaActual, contrasenaNueva } = req.body;
    try {
        const response = await axios.post("http://localhost:3000/change-password", {
            usuario, contrasenaActual, contrasenaNueva,
        });
        res.json(response.data);
    } catch (error) {
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : {};
        res.status(status).json(data);
    }
});

app.get("/grupos", async (req, res) => {
  try {
    const response = await axios.get("http://localhost:5001/grupos", {
      params: req.query,
    });
    res.json(response.data);
  } catch (error) {
    console.error("Error al obtener los grupos:", error.message);
    res.status(500).json({ mensaje: "Error al obtener los grupos" });
  }
});

app.get("/grupos/:id/alumnos", async (req, res) => {
  try {
    const { id } = req.params;
    
    // 1. Llama al servicio escolar para obtener la lista COMPLETA de grupos.
    const response = await axios.get("http://localhost:5001/grupos");
    const grupos = response.data;

    // 2. Busca el grupo específico en la lista que acabamos de obtener.
    const grupo = grupos.find(g => g.id === id);

    if (!grupo) {
      return res.status(404).json({ mensaje: "Grupo no encontrado" });
    }

    // 3. Si el grupo existe pero no tiene alumnos, devuelve un array vacío.
    if (!grupo.alumnos || !Array.isArray(grupo.alumnos)) {
        return res.json([]);
    }

    // 4. Devuelve el array de alumnos (con matrícula y nombre) del grupo.
    res.json(grupo.alumnos);

  } catch (error) {
    console.error("Error al obtener los alumnos del grupo:", error.message);
    res.status(500).json({ mensaje: "Error al procesar la solicitud de alumnos" });
  }
});
app.listen(5002, () => {
  console.log("Servicio de Profesores (con calificaciones) corriendo en http://localhost:5002");
});