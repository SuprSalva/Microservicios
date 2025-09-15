document.addEventListener('DOMContentLoaded', () => {
    // --- Elementos del DOM ---
    const welcomeMessage = document.getElementById('welcome-message');
    const logoutBtn = document.getElementById('logout-button'); // botón de logout
    // ... y el resto de tus elementos ...
    
    let profesorInfo = null;

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
            if (!response.ok) {
                throw new Error(data.mensaje);
            }
            
            profesorInfo = data.usuario;

            if (profesorInfo.rol !== 'profesor' || !profesorInfo.numeroEmpleado) {
                throw new Error('La información del profesor está incompleta o el rol es incorrecto.');
            }
            
            welcomeMessage.textContent = `Bienvenido, ${profesorInfo.nombre || profesorInfo.usuario}`;
            cargarGrupos();
        } catch (error) {
            console.error("Error de validación:", error.message);
            logout();
        }
    }

    async function logout() {
        localStorage.removeItem('sessionToken');
        window.location.href = 'http://localhost:3000/login.html';
    }

    async function cargarGrupos() {
        // tu lógica para cargar grupos
    }

    // --- Aquí sincronizas el botón con la función ---
    logoutBtn.addEventListener('click', logout);

    // Inicializamos
    initializePortal();
});
