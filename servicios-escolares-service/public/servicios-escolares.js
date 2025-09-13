let grupoActual = null;

// Cargar alumnos y grupos al iniciar
document.addEventListener("DOMContentLoaded", () => {
  cargarAlumnos();
  cargarGrupos();
});

// Función para cargar alumnos
async function cargarAlumnos() {
  try {
    const res = await fetch("http://localhost:5001/alumnos");
    const alumnos = await res.json();

    const tabla = document.getElementById("tablaAlumnos");
    tabla.innerHTML = "";

    alumnos.forEach(a => {
      const row = `
       <tr>
          <td>${a.matricula}</td>
          <td>${a.nombre}</td>
          <td>${a.carrera}</td>
          <td>${a.semestre}</td>
          <td>
            <button class="btn btn-sm btn-warning" onclick="abrirModalEditarAlumno('${a.matricula}')">
              Editar
            </button>
          </td>
        </tr>
      `;
      tabla.innerHTML += row;
    });
  } catch (error) {
    console.error("Error cargando alumnos:", error);
  }
}

// Función para cargar grupos
async function cargarGrupos() {
  try {
    const res = await fetch("http://localhost:5001/grupos");
    const grupos = await res.json();

    const contenedor = document.getElementById("listaGrupos");
    contenedor.innerHTML = "";

    grupos.forEach(g => {
      const grupoCard = `
        <div class="card grupo-card mb-3">
          <div class="card-header d-flex justify-content-between align-items-center">
            <h5 class="mb-0">${g.nombre} - ${g.carrera}</h5>
            <div>
              <button class="btn btn-sm btn-outline-primary me-1" onclick="abrirModalAgregarAlumno('${g.id}')">
                Agregar Alumno
              </button>
              <button class="btn btn-sm btn-outline-success" onclick="abrirModalAsignarProfesor('${g.id}')">
                Asignar Profesor
              </button>
            </div>
          </div>
          <div class="card-body">
            <h6>Profesor:</h6>
            <div class="profesor-item mb-3">
              ${g.profesor ? `${g.profesor.nombre} (${g.profesor.numeroEmpleado})` : 'Sin asignar'}
            </div>
            
            <h6>Alumnos:</h6>
            <div id="alumnos-${g.id}">
              ${g.alumnos.length > 0 ? 
                g.alumnos.map(a => `
                  <div class="alumno-item">${a.nombre} (${a.matricula})</div>
                `).join('') : 
                '<p class="text-muted">No hay alumnos en este grupo</p>'
              }
            </div>
          </div>
        </div>
      `;
      contenedor.innerHTML += grupoCard;
    });
  } catch (error) {
    console.error("Error cargando grupos:", error);
  }
}

// Formulario para registrar alumno
document.getElementById("alumnoForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nuevoAlumno = {
    matricula: document.getElementById("matricula").value,
    nombre: document.getElementById("nombreAlumno").value,
    carrera: document.getElementById("carrera").value,
    semestre: document.getElementById("semestre").value,
    usuario: document.getElementById("usuarioAlumno").value,
    contrasena: document.getElementById("contrasenaAlumno").value
  };

  try {
    const res = await fetch("http://localhost:5001/alumnos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevoAlumno)
    });

    const data = await res.json();
    if (res.ok) {
      alert(data.mensaje);
      cargarAlumnos();
      e.target.reset();
    } else {
      alert(data.mensaje);
    }
  } catch (error) {
    alert("Error al registrar alumno");
  }
});

// Formulario para crear grupo
document.getElementById("grupoForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const nuevoGrupo = {
    nombre: document.getElementById("nombreGrupo").value,
    carrera: document.getElementById("carreraGrupo").value
  };

  try {
    const res = await fetch("http://localhost:5001/grupos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nuevoGrupo)
    });

    const data = await res.json();
    if (res.ok) {
      alert(data.mensaje);
      cargarGrupos();
      e.target.reset();
    } else {
      alert(data.mensaje);
    }
  } catch (error) {
    alert("Error al crear grupo");
  }
});

// Funciones para modales
function abrirModalAgregarAlumno(grupoId) {
  grupoActual = grupoId;
  new bootstrap.Modal(document.getElementById('modalAgregarAlumno')).show();
}

function abrirModalAsignarProfesor(grupoId) {
  grupoActual = grupoId;
  new bootstrap.Modal(document.getElementById('modalAsignarProfesor')).show();
}

// Confirmar agregar alumno
document.getElementById("btnConfirmarAgregar").addEventListener("click", async () => {
  const matricula = document.getElementById("matriculaAgregar").value;

  try {
    const res = await fetch(`http://localhost:5001/grupos/${grupoActual}/alumnos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matricula })
    });

    const data = await res.json();
    if (res.ok) {
      alert(data.mensaje);
      cargarGrupos();
      bootstrap.Modal.getInstance(document.getElementById('modalAgregarAlumno')).hide();
      document.getElementById("matriculaAgregar").value = "";
    } else {
      alert(data.mensaje);
    }
  } catch (error) {
    alert("Error al agregar alumno al grupo");
  }
});

// Confirmar asignar profesor
document.getElementById("btnConfirmarProfesor").addEventListener("click", async () => {
  const numeroEmpleado = document.getElementById("numeroEmpleadoProfesor").value;

  try {
    const res = await fetch(`http://localhost:5001/grupos/${grupoActual}/profesor`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ numeroEmpleado })
    });

    const data = await res.json();
    if (res.ok) {
      alert(data.mensaje);
      cargarGrupos();
      bootstrap.Modal.getInstance(document.getElementById('modalAsignarProfesor')).hide();
      document.getElementById("numeroEmpleadoProfesor").value = "";
    } else {
      alert(data.mensaje);
    }
  } catch (error) {
    alert("Error al asignar profesor al grupo");
  }
});

// Cerrar sesión
document.getElementById("btnLogout").addEventListener("click", () => {
  window.location.href = "http://localhost:3000/login.html";
});

// Función para abrir el modal de edición
async function abrirModalEditarAlumno(matricula) {
  try {
    const res = await fetch(`http://localhost:5001/alumnos/${matricula}`);
    const alumno = await res.json();
    
    document.getElementById('editMatricula').value = alumno.matricula;
    document.getElementById('editNombre').value = alumno.nombre;
    document.getElementById('editCarrera').value = alumno.carrera;
    document.getElementById('editSemestre').value = alumno.semestre;
    
    new bootstrap.Modal(document.getElementById('modalEditarAlumno')).show();
  } catch (error) {
    alert('Error al cargar datos del alumno');
  }
}

// Función para guardar los cambios
document.getElementById('btnGuardarCambios').addEventListener('click', async () => {
  const matricula = document.getElementById('editMatricula').value;
  const nombre = document.getElementById('editNombre').value;
  const carrera = document.getElementById('editCarrera').value;
  const semestre = document.getElementById('editSemestre').value;

  try {
    const res = await fetch(`http://localhost:5001/alumnos/${matricula}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre, carrera, semestre })
    });

    const data = await res.json();
    if (res.ok) {
      alert(data.mensaje);
      cargarAlumnos();
      bootstrap.Modal.getInstance(document.getElementById('modalEditarAlumno')).hide();
    } else {
      alert(data.mensaje);
    }
  } catch (error) {
    alert('Error al actualizar alumno');
  }
});