document.getElementById("loginForm").addEventListener("submit", async (e) => {
      e.preventDefault();

      const usuario = document.getElementById("usuario").value;
      const contrasena = document.getElementById("contrasena").value;

      const res = await fetch("http://localhost:3000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, contrasena })
      });

      const data = await res.json();

      if (res.ok) {
        if (data.rol === "rh") {
          window.location.href = "http://localhost:4000/rh.html";
        } else {
          alert("Acceso permitido para rol: " + data.rol + " (pero sin interfaz definida)");
        }
      } else {
        alert(data.mensaje);
      }
    });