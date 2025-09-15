document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById("login-form");
    if (!loginForm) {
        console.error("No se encontró el formulario de login. Revisa el HTML.");
        return;
    }

    loginForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const usuario = document.getElementById("usuario").value;
        const contrasena = document.getElementById("contrasena").value;
        const mensajeError = document.getElementById("mensaje-error");
        mensajeError.textContent = '';

        try {
            const response = await fetch("http://localhost:3000/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ usuario, contrasena }),
            });

            const data = await response.json();

            if (response.ok) {
                const token = data.token;
                const rol = data.usuario.rol;
                
                // Redirección con el token en la URL
                if (rol === 'rh') {
                    window.location.href = `http://localhost:4000/rh.html?token=${token}`;
                } else if (rol === 'servicios escolares') {
                    window.location.href = `http://localhost:5001/servicios-escolares.html?token=${token}`;
                } else if (rol === 'profesor') {
                    window.location.href = `http://localhost:5002/?token=${token}`;
                } else {
                    mensajeError.textContent = `Rol "${rol}" no reconocido.`;
                }
            } else {
                mensajeError.textContent = data.mensaje || "Error en el inicio de sesión";
            }
        } catch (error) {
            mensajeError.textContent = "No se pudo conectar al servicio de login.";
        }
    });
});