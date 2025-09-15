const express = require('express');
const axios = require('axios');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Ruta para que el alumno obtenga sus grupos
app.get('/mis-grupos', async (req, res) => {
    const { matricula } = req.query;
    if (!matricula) {
        return res.status(400).json({ mensaje: 'Matrícula no proporcionada' });
    }
    try {
        const response = await axios.get(`http://localhost:5001/alumnos/${matricula}/grupos`);
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al obtener los grupos del alumno' });
    }
});

// Ruta para que el alumno obtenga sus calificaciones
app.get('/mis-calificaciones', async (req, res) => {
    const { matricula } = req.query;
    if (!matricula) {
        return res.status(400).json({ mensaje: 'Matrícula no proporcionada' });
    }
    try {
        // Obtenemos TODAS las calificaciones del servicio de profesores
        const response = await axios.get('http://localhost:5002/calificaciones');
        
        // Filtramos para obtener solo las que pertenecen a este alumno
        const misCalificaciones = response.data.filter(c => c.matricula === matricula);
        
        res.json(misCalificaciones || []); // Devolvemos un array con todas sus calificaciones
    } catch (error) {
        console.error("Error al obtener calificaciones:", error.message);
        res.status(500).json({ mensaje: 'Error al obtener las calificaciones' });
    }
});

// Ruta para cambiar la contraseña (proxy a auth-service)
app.post('/change-password', async (req, res) => {
    try {
        const response = await axios.post('http://localhost:3000/change-password', req.body);
        res.json(response.data);
    } catch (error) {
        const status = error.response ? error.response.status : 500;
        const data = error.response ? error.response.data : { mensaje: 'Error interno del servidor' };
        res.status(status).json(data);
    }
});


app.listen(5003, () => {
    console.log('Servicio de Alumnos corriendo en http://localhost:5003');
});