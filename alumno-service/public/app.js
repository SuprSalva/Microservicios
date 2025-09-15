document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos del DOM (sin cambios) ---
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutBtn = document.getElementById('logout-button');
    const calificacionesContainer = document.getElementById('calificaciones-container');
    const changePasswordBtn = document.getElementById('change-password-btn');
    const passwordModal = document.getElementById('password-modal');
    const closeModalBtn = document.querySelector('.close-btn');
    const changePasswordForm = document.getElementById('change-password-form');
    const passwordFeedback = document.getElementById('password-feedback');

    let alumnoInfo = null;

    // --- Funciones de Inicialización y Autenticación (sin cambios) ---
    async function initializePortal() {
        let token = localStorage.getItem('sessionToken');
        if (!token) {
            const params = new URLSearchParams(window.location.search);
            token = params.get('token');
            if (token) {
                localStorage.setItem('sessionToken', token);
                window.history.replaceState(null, '', window.location.pathname);
            } else {
                window.location.href = 'http://localhost:3000/login.html';
                return;
            }
        }

        try {
            const response = await fetch('http://localhost:3000/verify-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });

            const data = await response.json();
            if (!response.ok) throw new Error(data.mensaje);
            
            alumnoInfo = data.usuario;

            if (alumnoInfo.rol !== 'alumno' || !alumnoInfo.matricula) {
                throw new Error('La información del alumno es incompleta o el rol es incorrecto.');
            }
            
            welcomeMessage.textContent = `Bienvenido, ${alumnoInfo.nombre || alumnoInfo.usuario}`;
            cargarDatosAlumno();

        } catch (error) {
            console.error("Error de validación:", error.message);
            logout();
        }
    }

    // --- Carga de Datos (sin cambios) ---
    async function cargarDatosAlumno() {
        try {
            const [gruposRes, califRes] = await Promise.all([
                fetch(`http://localhost:5003/mis-grupos?matricula=${alumnoInfo.matricula}`),
                fetch(`http://localhost:5003/mis-calificaciones?matricula=${alumnoInfo.matricula}`)
            ]);

            const grupos = await gruposRes.json();
            const calificaciones = await califRes.json();

            renderCalificaciones(grupos, calificaciones);

        } catch (error) {
            console.error("Error al cargar datos del alumno:", error);
            calificacionesContainer.innerHTML = '<p>No se pudieron cargar tus datos.</p>';
        }
    }
    
    /**
     * MODIFICACIÓN CLAVE:
     * Esta función ahora crea una tabla que puede mostrar múltiples grupos y sus
     * calificaciones correspondientes.
     */
    function renderCalificaciones(grupos, calificaciones) {
        calificacionesContainer.innerHTML = ''; // Limpiar el contenedor

        if (!grupos || grupos.length === 0) {
            calificacionesContainer.innerHTML = '<p>Aún no estás inscrito en ningún grupo.</p>';
            return;
        }
    
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Grupo</th>
                    <th>Profesor</th>
                    <th>Parcial 1</th>
                    <th>Parcial 2</th>
                    <th>Parcial 3</th>
                    <th>Final</th>
                    <th>Estatus</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');

        grupos.forEach(grupo => {
            // Buscamos la calificación específica para este grupo y alumno
            const calif = calificaciones.find(c => c.grupoId === grupo.id) || {};
            
            const final = calif.final != null ? calif.final.toFixed(2) : '-';
            const estatus = final !== '-' ? (final >= 6 ? 'Aprobado' : 'Reprobado') : '-';
            const estatusClass = final !== '-' ? (final >= 6 ? 'status-aprobado' : 'status-reprobado') : '';

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${grupo.nombre}</td>
                <td>${grupo.profesor ? grupo.profesor.nombre : 'No asignado'}</td>
                <td>${calif.parcial1 || '-'}</td>
                <td>${calif.parcial2 || '-'}</td>
                <td>${calif.parcial3 || '-'}</td>
                <td><b>${final}</b></td>
                <td class="${estatusClass}">${estatus}</td>
            `;
            tbody.appendChild(row);
        });

        calificacionesContainer.appendChild(table);
    }
    
    // --- Logout y Modal de Contraseña (sin cambios) ---
    function logout() {
        localStorage.removeItem('sessionToken');
        window.location.href = 'http://localhost:3000/login.html';
    }

    changePasswordBtn.addEventListener('click', () => {
        passwordModal.style.display = 'block';
    });

    closeModalBtn.addEventListener('click', () => {
        passwordModal.style.display = 'none';
    });

    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const contrasenaActual = document.getElementById('current-password').value;
        const contrasenaNueva = document.getElementById('new-password').value;

        try {
            const response = await fetch('http://localhost:5003/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuario: alumnoInfo.usuario,
                    contrasenaActual,
                    contrasenaNueva,
                })
            });
            const data = await response.json();

            if (!response.ok) throw new Error(data.mensaje);

            passwordFeedback.textContent = data.mensaje;
            passwordFeedback.style.color = 'green';
            setTimeout(() => passwordModal.style.display = 'none', 2000);
        } catch (error) {
            passwordFeedback.textContent = error.message;
            passwordFeedback.style.color = 'red';
        }
    });

    logoutBtn.addEventListener('click', logout);
    initializePortal();
});