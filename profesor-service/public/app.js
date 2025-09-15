document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos del DOM ---
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutButton = document.getElementById('logout-button');
    const gruposSelect = document.getElementById('grupos-select');
    const alumnosTableBody = document.querySelector('#alumnos-table tbody');
    const modal = document.getElementById('password-modal');
    const openModalBtn = document.getElementById('change-password-btn');
    const closeModalBtn = document.querySelector('.close-btn');
    const changePasswordForm = document.getElementById('change-password-form');
    const passwordFeedback = document.getElementById('password-feedback');

    let profesorInfo = null;
    let todosLosGrupos = [];
    let todasLasCalificaciones = [];
    let inactivityTimer;

    // --- Lógica de Autenticación y Carga ---
    async function initializePortal() {
        const token = localStorage.getItem('sessionToken');
        if (!token) {
            window.location.href = 'http://localhost:3000/login.html';
            return;
        }

        try {
            const response = await fetch('http://localhost:3000/verify-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.mensaje);
            }
            
            profesorInfo = data.usuario;

            if (profesorInfo.rol !== 'profesor' || !profesorInfo.numeroEmpleado) {
                throw new Error('La información del profesor está incompleta o el rol es incorrecto.');
            }
            
            welcomeMessage.textContent = `Bienvenido, ${profesorInfo.nombre || profesorInfo.usuario}`;
            await cargarDatosIniciales();
            setupInactivityTimer();

        } catch (error) {
            console.error("Error de validación:", error.message);
            logout(false);
        }
    }

    // --- Lógica de Carga de Datos ---
    async function cargarDatosIniciales() {
        try {
            const [gruposRes, califRes] = await Promise.all([
                fetch('http://localhost:5001/grupos'),
                fetch('http://localhost:5002/calificaciones')
            ]);
            todosLosGrupos = await gruposRes.json();
            todasLasCalificaciones = await califRes.json();
            
            const misGrupos = todosLosGrupos.filter(g => g.profesor && g.profesor.numeroEmpleado === profesorInfo.numeroEmpleado);
            
            gruposSelect.innerHTML = '<option value="">-- Selecciona un Grupo --</option>';
            if (misGrupos.length === 0) {
                 gruposSelect.innerHTML = '<option value="">-- No tienes grupos asignados --</option>';
            } else {
                misGrupos.forEach(grupo => {
                    const option = document.createElement('option');
                    option.value = grupo.id;
                    option.textContent = `${grupo.nombre} (${grupo.carrera})`;
                    option.dataset.grupoData = JSON.stringify(grupo);
                    gruposSelect.appendChild(option);
                });
            }
        } catch(e) { console.error("Error al cargar datos iniciales:", e); }
    }

    // --- Lógica de la Interfaz ---
    gruposSelect.addEventListener('change', dibujarTablaAlumnos);

    function dibujarTablaAlumnos() {
        const selectedOption = gruposSelect.options[gruposSelect.selectedIndex];
        alumnosTableBody.innerHTML = '';
        if (!selectedOption.value) {
            alumnosTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">Selecciona un grupo para ver sus alumnos.</td></tr>';
            return;
        }

        const grupo = JSON.parse(selectedOption.dataset.grupoData);
        
        if (!grupo.alumnos || grupo.alumnos.length === 0) {
            alumnosTableBody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No hay alumnos en este grupo.</td></tr>';
            return;
        }

        grupo.alumnos.forEach(alumno => {
            const calificacionAlumno = todasLasCalificaciones.find(c => c.matricula === alumno.matricula) || {};
            const { parcial1 = '', parcial2 = '', parcial3 = '', final = '' } = calificacionAlumno;
            const estatus = final >= 8 ? 'Aprobado' : (final !== '' ? 'Reprobado' : 'Sin Calificar');
            const estatusClass = final >= 8 ? 'aprobado' : (final !== '' ? 'reprobado' : '');
            
            const row = document.createElement('tr');
            row.dataset.matricula = alumno.matricula;
            row.innerHTML = `
                <td>${alumno.matricula}</td>
                <td>${alumno.nombre}</td>
                <td><input type="number" class="parcial-input" data-parcial="1" min="0" max="10" step="0.1" value="${parcial1}"></td>
                <td><input type="number" class="parcial-input" data-parcial="2" min="0" max="10" step="0.1" value="${parcial2}"></td>
                <td><input type="number" class="parcial-input" data-parcial="3" min="0" max="10" step="0.1" value="${parcial3}"></td>
                <td class="final-score">${final}</td>
                <td class="status ${estatusClass}">${estatus}</td>
                <td><button class="guardar-btn">Guardar</button></td>
            `;
            alumnosTableBody.appendChild(row);
        });
    }

    alumnosTableBody.addEventListener('click', async (e) => {
        if (e.target.classList.contains('guardar-btn')) {
            const row = e.target.closest('tr');
            const matricula = row.dataset.matricula;
            const parcial1 = row.querySelector('[data-parcial="1"]').value;
            const parcial2 = row.querySelector('[data-parcial="2"]').value;
            const parcial3 = row.querySelector('[data-parcial="3"]').value;
            
            const body = {
                matricula,
                parcial1: parcial1 === '' ? null : parcial1,
                parcial2: parcial2 === '' ? null : parcial2,
                parcial3: parcial3 === '' ? null : parcial3,
            };

            try {
                const response = await fetch(`http://localhost:5002/calificaciones`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.mensaje);

                const { final = '' } = result.data;
                const estatus = final >= 8 ? 'Aprobado' : (final !== '' ? 'Reprobado' : 'Sin Calificar');
                const estatusClass = final >= 8 ? 'aprobado' : (final !== '' ? 'reprobado' : '');
                
                row.querySelector('.final-score').textContent = final;
                row.querySelector('.status').textContent = estatus;
                row.querySelector('.status').className = `status ${estatusClass}`;

                let califIndex = todasLasCalificaciones.findIndex(c => c.matricula === matricula);
                if (califIndex > -1) {
                    todasLasCalificaciones[califIndex] = result.data;
                } else {
                    todasLasCalificaciones.push(result.data);
                }
                alert('Calificaciones guardadas.');
            } catch (error) {
                alert(`Error al guardar: ${error.message}`);
            }
        }
    });

    // --- Lógica de Sesión (Logout, Timer, Cambiar Contraseña) ---
    async function logout(showAlert = false) {
        if (showAlert) alert("La sesión ha expirado.");
        const token = localStorage.getItem('sessionToken');
        if (token) {
            try {
                await fetch('http://localhost:3000/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ token })
                });
            } catch (error) {
                console.error("Error al notificar al servidor del logout:", error);
            }
        }
        localStorage.removeItem('sessionToken');
        window.location.href = 'http://localhost:3000/login.html';
    }
    logoutButton.addEventListener('click', () => logout(false));
    
    function setupInactivityTimer() {
        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(() => logout(true), 15 * 60 * 1000);
        };
        window.addEventListener('mousemove', resetTimer, true);
        window.addEventListener('keypress', resetTimer, true);
        resetTimer();
    }

    openModalBtn.onclick = () => { 
        modal.style.display = 'block'; 
        passwordFeedback.textContent = '';
        passwordFeedback.className = 'feedback-message';
        changePasswordForm.reset();
    };
    closeModalBtn.onclick = () => { modal.style.display = 'none'; };
    window.onclick = (event) => { if (event.target == modal) { modal.style.display = 'none'; } };

    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        passwordFeedback.className = 'feedback-message';
        passwordFeedback.textContent = 'Actualizando...';
        const contrasenaActual = document.getElementById('current-password').value;
        const contrasenaNueva = document.getElementById('new-password').value;
        try {
            const response = await fetch('http://localhost:3000/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuario: profesorInfo.usuario,
                    contrasenaActual,
                    contrasenaNueva
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.mensaje);
            alert(result.mensaje);
            logout(false);
        } catch (error) {
            passwordFeedback.textContent = `Error: ${error.message}`;
            passwordFeedback.classList.add('error');
        }
    });
    
    initializePortal();
});