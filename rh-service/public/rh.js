async function cargarEmpleados() {
    const res = await fetch("http://localhost:4000/empleados");
    const empleados = await res.json();

    const tabla = document.getElementById("tablaEmpleados");
    tabla.innerHTML = "";

    const puestosMap = {
        "rh": "Recursos Humanos",
        "servicios escolares": "Servicios Escolares",
        "profesor": "Profesor"
    };

    empleados.forEach(e => {
        const puestoLegible = puestosMap[e.puesto] || e.puesto;

        const row = `
            <tr>
                <td>${e.numeroEmpleado}</td>
                <td>${e.nombre}</td>
                <td>${puestoLegible}</td>
            </tr>
        `;
        tabla.innerHTML += row;
    });
}

document.getElementById("empleadoForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const nuevoEmpleado = {
        numeroEmpleado: document.getElementById("numeroEmpleado").value,
        nombre: document.getElementById("nombre").value,
        puesto: document.getElementById("puesto").value,
        usuario: document.getElementById("usuario").value,
        contrasena: document.getElementById("contrasena").value
    };

    const res = await fetch("http://localhost:4000/empleados", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevoEmpleado)
    });

    const data = await res.json();
    if (res.ok) {
        alert(data.mensaje);
        cargarEmpleados();
        e.target.reset();
    } else {
        alert(data.mensaje);
    }
});

document.getElementById("btnLogout").addEventListener("click", () => {
    window.location.href = "http://localhost:3000/login.html";
});

cargarEmpleados();