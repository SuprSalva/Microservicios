document.addEventListener("DOMContentLoaded", () => {
  // --- Elementos del DOM ---
  const welcomeMessage = document.getElementById("welcome-message");
  const logoutBtn = document.getElementById("logout-button");
  const changePasswordBtn = document.getElementById("change-password-btn");
  const passwordModal = document.getElementById("password-modal");
  const closeModalBtn = document.querySelector(".close-btn");
  const changePasswordForm = document.getElementById("change-password-form");
  const passwordFeedback = document.getElementById("password-feedback");
  const gruposSelect = document.getElementById("grupos-select");
  const alumnosTableBody = document.querySelector("#alumnos-table tbody");

  let profesorInfo = null;
  let calificaciones = [];
  let grupoSeleccionadoId = null; // Variable para guardar el ID del grupo actual

  // --- Funciones de Inicialización y Autenticación ---

  async function initializePortal() {
    let token = localStorage.getItem("sessionToken");
    if (!token) {
      const params = new URLSearchParams(window.location.search);
      token = params.get("token");
      if (token) {
        localStorage.setItem("sessionToken", token);
        window.history.replaceState(null, "", window.location.pathname);
      } else {
        window.location.href = "http://localhost:3000/login.html";
        return;
      }
    }

    try {
      const response = await fetch("http://localhost:3000/verify-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.mensaje);
      }

      profesorInfo = data.usuario;

      if (profesorInfo.rol !== "profesor" || !profesorInfo.numeroEmpleado) {
        throw new Error(
          "La información del profesor está incompleta o el rol es incorrecto."
        );
      }

      welcomeMessage.textContent = `Bienvenido, ${
        profesorInfo.nombre || profesorInfo.usuario
      }`;
      cargarGrupos();
    } catch (error) {
      console.error("Error de validación:", error.message);
      logout();
    }
  }

  async function logout() {
    localStorage.removeItem("sessionToken");
    window.location.href = "http://localhost:3000/login.html";
  }

  // --- Funciones para Cargar Datos ---

  async function cargarGrupos() {
    try {
      const response = await fetch(
        `http://localhost:5002/grupos?numeroEmpleado=${profesorInfo.numeroEmpleado}`
      );
      const grupos = await response.json();

      gruposSelect.innerHTML = '<option value="">-- Mis Grupos --</option>'; // Limpiar opciones
      grupos.forEach((grupo) => {
        const option = document.createElement("option");
        option.value = grupo.id;
        option.textContent = grupo.nombre;
        gruposSelect.appendChild(option);
      });
    } catch (error) {
      console.error("Error al cargar grupos:", error);
    }
  }

  async function cargarAlumnos(grupoId) {
    grupoSeleccionadoId = grupoId; // Guardamos el ID del grupo
    if (!grupoId) {
      alumnosTableBody.innerHTML = "";
      return;
    }

    try {
      // Obtenemos alumnos y calificaciones en paralelo para más eficiencia
      const [alumnosRes, califRes] = await Promise.all([
        fetch(`http://localhost:5002/grupos/${grupoId}/alumnos`),
        fetch("http://localhost:5002/calificaciones"),
      ]);

      if (!alumnosRes.ok) throw new Error("Error al cargar alumnos");
      if (!califRes.ok) throw new Error("Error al cargar calificaciones");

      const alumnos = await alumnosRes.json();
      calificaciones = await califRes.json();

      renderAlumnos(alumnos);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      alumnosTableBody.innerHTML = `<tr><td colspan="8">Error al cargar los datos del grupo.</td></tr>`;
    }
  }

  // --- Funciones para Renderizar y Guardar ---

  function renderAlumnos(alumnos) {
    alumnosTableBody.innerHTML = "";
    if (!alumnos || alumnos.length === 0) {
      alumnosTableBody.innerHTML =
        '<tr><td colspan="8">No hay alumnos en este grupo.</td></tr>';
      return;
    }

    alumnos.forEach((alumno) => {
      // Buscamos la calificación que coincida con el alumno Y el grupo
      const calif =
        calificaciones.find(
          (c) =>
            c.matricula === alumno.matricula && c.grupoId === grupoSeleccionadoId
        ) || {};

      const final = calif.final != null ? calif.final.toFixed(2) : "-";
      const estatus =
        final !== "-" ? (final >= 6 ? "Aprobado" : "Reprobado") : "-";
      const estatusClass =
        final !== "-"
          ? final >= 6
            ? "status-aprobado"
            : "status-reprobado"
          : "";

      const row = document.createElement("tr");
      row.dataset.matricula = alumno.matricula;
      row.innerHTML = `
        <td>${alumno.matricula}</td>
        <td>${alumno.nombre}</td>
        <td><input type="number" class="calif-input" data-parcial="1" value="${
          calif.parcial1 || ""
        }" min="0" max="10" step="0.1"></td>
        <td><input type="number" class="calif-input" data-parcial="2" value="${
          calif.parcial2 || ""
        }" min="0" max="10" step="0.1"></td>
        <td><input type="number" class="calif-input" data-parcial="3" value="${
          calif.parcial3 || ""
        }" min="0" max="10" step="0.1"></td>
        <td class="final-calif">${final}</td>
        <td class="estatus-cell ${estatusClass}">${estatus}</td>
        <td><button class="save-btn">Guardar</button></td>
      `;
      alumnosTableBody.appendChild(row);
    });
  }

  async function guardarCalificaciones(matricula) {
    const row = document.querySelector(`tr[data-matricula="${matricula}"]`);
    const inputs = row.querySelectorAll(".calif-input");

    const body = {
      matricula,
      grupoId: grupoSeleccionadoId,
      parcial1: inputs[0].value ? parseFloat(inputs[0].value) : null,
      parcial2: inputs[1].value ? parseFloat(inputs[1].value) : null,
      parcial3: inputs[2].value ? parseFloat(inputs[2].value) : null,
    };

    try {
      const response = await fetch("http://localhost:5002/calificaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.mensaje || "Error al guardar");
      }

      // Actualizamos la calificación en nuestra variable local para mantener la consistencia
      const index = calificaciones.findIndex(
        (c) =>
          c.matricula === matricula && c.grupoId === grupoSeleccionadoId
      );
      if (index > -1) {
        calificaciones[index] = data.data;
      } else {
        calificaciones.push(data.data);
      }


      // Actualizar la fila con los nuevos datos
      const finalCell = row.querySelector(".final-calif");
      const estatusCell = row.querySelector(".estatus-cell");

      const final = data.data.final != null ? data.data.final.toFixed(2) : "-";
      const estatus =
        final !== "-" ? (final >= 6 ? "Aprobado" : "Reprobado") : "-";

      finalCell.textContent = final;
      estatusCell.textContent = estatus;

      estatusCell.className = "estatus-cell"; // Limpiar clases
      if (estatus !== "-") {
        estatusCell.classList.add(
          final >= 6 ? "status-aprobado" : "status-reprobado"
        );
      }

      alert("Calificaciones guardadas con éxito");
    } catch (error) {
      console.error("Error al guardar:", error);
      alert(`Error al guardar: ${error.message}`);
    }
  }
  
    // --- Lógica para el modal de cambio de contraseña ---
    changePasswordBtn.addEventListener('click', () => {
        passwordModal.style.display = 'block';
    });

    closeModalBtn.addEventListener('click', () => {
        passwordModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == passwordModal) {
            passwordModal.style.display = 'none';
        }
    });

    changePasswordForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const contrasenaActual = document.getElementById('current-password').value;
        const contrasenaNueva = document.getElementById('new-password').value;

        try {
            const response = await fetch('http://localhost:5002/change-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuario: profesorInfo.usuario,
                    contrasenaActual,
                    contrasenaNueva
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.mensaje);
            }

            passwordFeedback.textContent = data.mensaje;
            passwordFeedback.style.color = 'green';
            setTimeout(() => {
                passwordModal.style.display = 'none';
                passwordFeedback.textContent = '';
                changePasswordForm.reset();
            }, 2000);

        } catch (error) {
            passwordFeedback.textContent = error.message;
            passwordFeedback.style.color = 'red';
        }
    });
    
  // --- Event Listeners ---
  gruposSelect.addEventListener("change", (event) => {
    cargarAlumnos(event.target.value);
  });

  alumnosTableBody.addEventListener("click", (event) => {
    if (event.target.classList.contains("save-btn")) {
      const row = event.target.closest("tr");
      const matricula = row.dataset.matricula;
      guardarCalificaciones(matricula);
    }
  });

  logoutBtn.addEventListener("click", logout);

  // Inicializamos
  initializePortal();
});