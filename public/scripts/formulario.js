// Agregar más campos de productos
document.getElementById('agregarProducto').addEventListener('click', function() {
    // Crea un nuevo campo de entrada con las clases de Bootstrap
    const nuevoProducto = document.createElement('input');
    nuevoProducto.setAttribute('type', 'text');
    nuevoProducto.setAttribute('name', 'producto[]'); // Asegúrate de que el 'name' sea un array
    nuevoProducto.setAttribute('class', 'form-control producto mt-2'); // Añade la clase 'producto'
    nuevoProducto.setAttribute('required', true);

    // Añade el nuevo campo al contenedor de productos
    document.getElementById('productos').appendChild(nuevoProducto);
});

// Manejo del formulario
document.getElementById('usuarioForm').addEventListener('submit', function (event) {
    event.preventDefault();

    // Recoger los datos del formulario
    const formData = new FormData(event.target);
    
    // Recoger los valores de todos los campos de producto con la clase 'producto'
    const productos = formData.getAll('producto[]'); // Recoge todos los productos como un array

    // Preparar los datos para enviar al servidor
    const data = {
        nombre: formData.get('nombre'),
        apellido: formData.get('apellido'),
        cedula: formData.get('cedula'),
        productos: productos
    };

    // Enviar los datos al servidor usando fetch
    fetch('/api/usuarios', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
    })
    .then(response => response.json())
    .then(result => {
        if (result.error) {
            alert(`Error: ${result.error}`);
        } else {
            alert(result.message); // Mensaje si los datos se envían con éxito
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Ocurrió un error al procesar la solicitud.');
    });
});
