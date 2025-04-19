let db;

document.addEventListener("DOMContentLoaded", () => {
  const request = indexedDB.open("TiendaDB", 1);

  request.onupgradeneeded = (e) => {
    db = e.target.result;

    const usuarioStore = db.createObjectStore("usuarios", { keyPath: "id", autoIncrement: true });
    usuarioStore.createIndex("nombre", "nombre", { unique: false });

    const productoStore = db.createObjectStore("productos", { keyPath: "id", autoIncrement: true });
    productoStore.createIndex("nombre", "nombre", { unique: false });

    const pedidoStore = db.createObjectStore("pedidos", { keyPath: "id", autoIncrement: true });
    pedidoStore.createIndex("usuarioId", "usuarioId", { unique: false });
    pedidoStore.createIndex("productoId", "productoId", { unique: false });
  };

  request.onsuccess = (e) => {
    db = e.target.result;
    mostrarDatos();
    cargarOpcionesSelect();
  };

  // ========== FORMULARIOS ==========
  document.getElementById("usuarioForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const id = document.getElementById("usuarioId").value;
    const nombre = document.getElementById("usuarioNombre").value;
    const email = document.getElementById("usuarioEmail").value;
    const telefono = document.getElementById("usuarioTelefono").value;
    const datos = { nombre, email, telefono };
    const trans = db.transaction(["usuarios"], "readwrite");
    const store = trans.objectStore("usuarios");
    if (id) {
      datos.id = Number(id);
      store.put(datos);
    } else {
      store.add(datos);
    }
    trans.oncomplete = () => {
      this.reset();
      mostrarUsuarios();
      cargarOpcionesSelect();
    };
  });

  document.getElementById("productoForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const id = document.getElementById("productoId").value;
    const nombre = document.getElementById("productoNombre").value;
    const precio = Number(document.getElementById("productoPrecio").value);
    const stock = Number(document.getElementById("productoStock").value);
    const datos = { nombre, precio, stock };
    const trans = db.transaction(["productos"], "readwrite");
    const store = trans.objectStore("productos");
    if (id) {
      datos.id = Number(id);
      store.put(datos);
    } else {
      store.add(datos);
    }
    trans.oncomplete = () => {
      this.reset();
      mostrarProductos();
      cargarOpcionesSelect();
    };
  });

  document.getElementById("pedidoForm").addEventListener("submit", function (e) {
    e.preventDefault();
    const id = document.getElementById("pedidoId").value;
    const usuarioId = Number(document.getElementById("pedidoUsuarioId").value);
    const productoId = Number(document.getElementById("pedidoProductoId").value);
    const cantidad = Number(document.getElementById("pedidoCantidad").value);
    const direccion = document.getElementById("pedidoDireccion").value;

    const trans = db.transaction(["productos", "pedidos"], "readwrite");
    const productoStore = trans.objectStore("productos");
    const pedidoStore = trans.objectStore("pedidos");

    const productoReq = productoStore.get(productoId);
    productoReq.onsuccess = () => {
      const producto = productoReq.result;
      if (!producto || producto.stock < cantidad) {
        alert("Stock insuficiente o producto no encontrado.");
        return;
      }

      if (!id) {
        producto.stock -= cantidad;
        productoStore.put(producto);
      }

      const datos = { usuarioId, productoId, cantidad, direccion };
      if (id) {
        datos.id = Number(id);
        pedidoStore.put(datos);
      } else {
        pedidoStore.add(datos);
      }

      trans.oncomplete = () => {
        document.getElementById("pedidoForm").reset();
        mostrarPedidos();
        mostrarProductos();
      };
    };
  });
});

// ========== FUNCIONES ==========
function cargarOpcionesSelect() {
  const usuarioSelect = document.getElementById("pedidoUsuarioId");
  const productoSelect = document.getElementById("pedidoProductoId");

  usuarioSelect.innerHTML = "";
  productoSelect.innerHTML = "";

  const transUsuarios = db.transaction("usuarios", "readonly").objectStore("usuarios");
  transUsuarios.openCursor().onsuccess = (e) => {
    const cursor = e.target.result;
    if (cursor) {
      const { id, nombre } = cursor.value;
      usuarioSelect.innerHTML += `<option value="${id}">${nombre}</option>`;
      cursor.continue();
    }
  };

  const transProductos = db.transaction("productos", "readonly").objectStore("productos");
  transProductos.openCursor().onsuccess = (e) => {
    const cursor = e.target.result;
    if (cursor) {
      const { id, nombre } = cursor.value;
      productoSelect.innerHTML += `<option value="${id}">${nombre}</option>`;
      cursor.continue();
    }
  };
}

function mostrarDatos() {
  mostrarUsuarios();
  mostrarProductos();
  mostrarPedidos();
}

function mostrarUsuarios() {
  const tabla = document.querySelector("#usuariosTabla tbody");
  tabla.innerHTML = "";
  const store = db.transaction("usuarios", "readonly").objectStore("usuarios");
  store.openCursor().onsuccess = (e) => {
    const cursor = e.target.result;
    if (cursor) {
      const { id, nombre, email, telefono } = cursor.value;
      tabla.innerHTML += `<tr>
        <td>${id}</td><td>${nombre}</td><td>${email}</td><td>${telefono}</td>
        <td>
          <button class="btn btn-warning btn-sm" onclick='editarUsuario(${JSON.stringify(cursor.value)})'>Editar</button>
          <button class="btn btn-danger btn-sm" onclick='eliminar("usuarios", ${id}, mostrarUsuarios)'>Eliminar</button>
        </td></tr>`;
      cursor.continue();
    }
  };
}

function mostrarProductos() {
  const tabla = document.querySelector("#productosTabla tbody");
  tabla.innerHTML = "";
  const store = db.transaction("productos", "readonly").objectStore("productos");
  store.openCursor().onsuccess = (e) => {
    const cursor = e.target.result;
    if (cursor) {
      const { id, nombre, precio, stock } = cursor.value;
      tabla.innerHTML += `<tr>
        <td>${id}</td><td>${nombre}</td><td>${precio}</td><td>${stock}</td>
        <td>
          <button class="btn btn-warning btn-sm" onclick='editarProducto(${JSON.stringify(cursor.value)})'>Editar</button>
          <button class="btn btn-danger btn-sm" onclick='eliminar("productos", ${id}, mostrarProductos)'>Eliminar</button>
        </td></tr>`;
      cursor.continue();
    }
  };
}

function mostrarPedidos() {
  const tabla = document.querySelector("#pedidosTabla tbody");
  tabla.innerHTML = "";

  const trans = db.transaction(["pedidos", "usuarios", "productos"], "readonly");
  const pedidoStore = trans.objectStore("pedidos");

  pedidoStore.openCursor().onsuccess = (e) => {
    const cursor = e.target.result;
    if (cursor) {
      const { id, usuarioId, productoId, cantidad, direccion } = cursor.value;

      const usuarioReq = trans.objectStore("usuarios").get(usuarioId);
      const productoReq = trans.objectStore("productos").get(productoId);

      usuarioReq.onsuccess = () => {
        productoReq.onsuccess = () => {
          const usuario = usuarioReq.result;
          const producto = productoReq.result;

          const usuarioNombre = usuario ? usuario.nombre : "N/A";
          const productoNombre = producto ? producto.nombre : "N/A";

          tabla.innerHTML += `<tr>
            <td>${id}</td>
            <td>${usuarioNombre}</td>
            <td>${productoNombre}</td>
            <td>${cantidad}</td>
            <td>${direccion}</td>
            <td>
              <button class="btn btn-warning btn-sm" onclick='editarPedido(${JSON.stringify(cursor.value)})'>Editar</button>
              <button class="btn btn-danger btn-sm" onclick='eliminar("pedidos", ${id}, mostrarPedidos)'>Eliminar</button>
            </td>
          </tr>`;
        };
      };
      cursor.continue();
    }
  };
}

function eliminar(storeName, id, callback) {
  const trans = db.transaction([storeName], "readwrite");
  const store = trans.objectStore(storeName);
  store.delete(id);
  trans.oncomplete = callback;
}

function editarUsuario(data) {
  document.getElementById("usuarioId").value = data.id;
  document.getElementById("usuarioNombre").value = data.nombre;
  document.getElementById("usuarioEmail").value = data.email;
  document.getElementById("usuarioTelefono").value = data.telefono;
}

function editarProducto(data) {
  document.getElementById("productoId").value = data.id;
  document.getElementById("productoNombre").value = data.nombre;
  document.getElementById("productoPrecio").value = data.precio;
  document.getElementById("productoStock").value = data.stock;
}

function editarPedido(data) {
  document.getElementById("pedidoId").value = data.id;
  document.getElementById("pedidoUsuarioId").value = data.usuarioId;
  document.getElementById("pedidoProductoId").value = data.productoId;
  document.getElementById("pedidoCantidad").value = data.cantidad;
  document.getElementById("pedidoDireccion").value = data.direccion;
}
