const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const { Client } = require('pg'); // Importa el cliente de PostgreSQL
const natural = require('natural');
const TfIdf = natural.TfIdf;

// Configura los datos de conexión
const client = new Client({
    user: 'dbmasteruser',          // Usuario de PostgreSQL
    host: 'ls-ef6cea836d847f09c85f3d354ae9db50bd1912c5.c1a60uoi6neh.us-east-1.rds.amazonaws.com', // Host de la base de datos
    database: 'PDB_USB',       // Nombre de la base de datos
    password: 'x|8)]Xu5q6&[^8Ps[OiMDo*NppV5!H1g',   // Contraseña del usuario
    port: 5432,
    ssl: {
        rejectUnauthorized: false,   // Verifica el certificado
    }
});

// Conectar a la base de datos
client.connect(err => {
    if (err) {
        console.error('Error conectando a la base de datos con SSL', err.stack);
    } else {
        console.log('Conectado a la base de datos PostgreSQL con SSL');
    }
});

// Función para obtener datos de la base de datos y construir el JSON
async function obtenerDatosYConstruirJSON() {
    const query = `
        SELECT p.codigo_padre, p.nombre_articulador_producto, 
               pe.codigo_proyecto, pe.nombre_proyecto, 
               mp.codigo_microproyecto, mp.nombre_microproyecto
        FROM productos_padres p
        JOIN proyectos_estrategicos pe ON p.codigo_padre = pe.producto_padre
        LEFT JOIN microproyectos mp ON pe.codigo_proyecto = mp.proyecto_asociado;
    `;

    try {
        const result = await client.query(query);

        // Crear arrays para nodos y links
        const nodes = [];
        const links = [];
        const nodosUnicos = new Map();

        result.rows.forEach((fila) => {
            const { codigo_padre, nombre_articulador_producto, codigo_proyecto, nombre_proyecto, codigo_microproyecto, nombre_microproyecto } = fila;

            // Añadir el nodo del producto si no existe
            if (!nodosUnicos.has(codigo_padre)) {
                nodes.push({
                    id: codigo_padre,
                    name: nombre_articulador_producto,
                    group: 'productos',
                });
                nodosUnicos.set(codigo_padre, true);
            }

            // Añadir el nodo del proyecto si no existe
            if (!nodosUnicos.has(codigo_proyecto)) {
                nodes.push({
                    id: codigo_proyecto,
                    name: nombre_proyecto,
                    group: 'proyectos',
                });
                nodosUnicos.set(codigo_proyecto, true);
            }

            // Añadir el nodo del microproyecto si existe y no está añadido
            if (codigo_microproyecto && !nodosUnicos.has(codigo_microproyecto)) {
                nodes.push({
                    id: codigo_microproyecto,
                    name: nombre_microproyecto,
                    group: 'microproyectos',
                });
                nodosUnicos.set(codigo_microproyecto, true);

                // Añadir el enlace entre el proyecto y el microproyecto
                links.push({
                    source: codigo_proyecto,
                    target: codigo_microproyecto,
                });
            }

            // Añadir el enlace entre el producto y el proyecto
            links.push({
                source: codigo_padre,
                target: codigo_proyecto,
            });
        });

        // Construir el JSON final
        return {
            nodes: nodes,
            links: links,
        };
    } catch (error) {
        console.error('Error al obtener los datos:', error);
        throw error;
    }
}

// Middleware para procesar JSON en el cuerpo de la solicitud
app.use(express.json());  // Este middleware permite procesar JSON en las solicitudes


// Definir palabras vacías (similar a stop_words en Python)
const stopWords = [
    'un', 'una', 'unas', 'unos', 'uno', 'sobre', 'todo', 'también', 'tras', 'otro', 'algún', 'alguno', 'alguna',
    'algunos', 'algunas', 'ser', 'es', 'soy', 'eres', 'esos', 'esas', 'ese', 'aqui', 'estoy', 'estamos', 'esta', 'estais',
    'estan', 'como', 'en', 'para', 'detrás', 'ya', 'puede', 'puedo', 'por', 'qué', 'donde', 'quien', 'con', 'mi', 'mis',
    'tu', 'te', 'ti', 'nos', 'lo', 'los', 'las', 'el', 'la', 'si', 'no', 'siempre', 'siendo', 'fue', 'estaba', 'estaban',
    'estuve', 'estuvo', 'estado', 'he', 'has', 'ha', 'hemos', 'han', 'soy', 'es', 'son', 'eres', 'RAP', 'the', 'and', 'is', 'in', 'it', 'you', 'that', 'he', 'was', 'for', 'on', 'are', 'with', 'as', 'I', 'his', 'they', 
    'be', 'at', 'one', 'have', 'this', 'from', 'or', 'had', 'by', 'not', 'word', 'but', 'what', 'some', 'we', 'can', 
    'out', 'other', 'were', 'all', 'there', 'when', 'up', 'use', 'your', 'how', 'said', 'an', 'each', 'she', 'which', 
    'do', 'their', 'if', 'will', 'way', 'about', 'many', 'then', 'them', 'write', 'would', 'like', 'so', 'these', 
    'her', 'long', 'make', 'thing', 'see', 'him', 'two', 'has', 'look', 'more', 'day', 'could', 'go', 'come', 'did', 
    'number', 'sound', 'no', 'most', 'people', 'my', 'over', 'know', 'water', 'than', 'call', 'first', 'who', 'may', 
    'down', 'side', 'been', 'now', 'find'
];

// Umbral para la similitud
const THRESHOLD = 0.65;

// Función para limpiar y lematizar el texto
function lematizarTexto(texto) {
    // Convertir a minúsculas y eliminar palabras vacías
    return texto
        .toLowerCase()
        .split(/\s+/)  // Tokenización simple
        .filter(word => !stopWords.includes(word))  // Eliminar stopwords
        .join(' ');
}

// Función para generar bigramas
function generarBigramas(texto) {
    const palabras = texto.split(' ');
    const bigramas = [];
    for (let i = 0; i < palabras.length - 1; i++) {
        bigramas.push(`${palabras[i]} ${palabras[i + 1]}`);
    }
    return bigramas;
}

// Función para calcular la similitud del coseno usando TF-IDF y bigramas
function calcularSimilitudCoseno(texto1, texto2) {
    const tfidf = new TfIdf();

    // Lematizar y limpiar los textos
    const textoLematizado1 = lematizarTexto(texto1);
    const textoLematizado2 = lematizarTexto(texto2);

    // Generar bigramas
    const bigramas1 = generarBigramas(textoLematizado1).join(' ');
    const bigramas2 = generarBigramas(textoLematizado2).join(' ');

    // Añadir documentos como bigramas
    tfidf.addDocument(bigramas1);
    tfidf.addDocument(bigramas2);

    // Vectorización usando TF-IDF
    const vector1 = [];
    const vector2 = [];

    tfidf.listTerms(0).forEach(item => vector1.push(item.tfidf));
    tfidf.listTerms(1).forEach(item => vector2.push(item.tfidf));

    // Calcular la similitud del coseno
    const dotProduct = vector1.reduce((sum, value, i) => sum + value * (vector2[i] || 0), 0);
    const magnitude1 = Math.sqrt(vector1.reduce((sum, value) => sum + value * value, 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, value) => sum + value * value, 0));

    return magnitude1 && magnitude2 ? dotProduct / (magnitude1 * magnitude2) : 0;
}

// Función para calcular la similitud y guardar en la tabla productos_microproyectos_similitud
async function calcularSimilitudYGuardar(usuarioId, productos) {
    try {
        console.log(`Calculando similitudes para el usuario con ID: ${usuarioId}`);

        // Obtener microproyectos desde la base de datos
        const result = await client.query('SELECT id, nombre_microproyecto, objetivo_microproyecto FROM microproyectos');
        console.log(`Microproyectos obtenidos: ${result.rows.length}`);

        // Iterar sobre productos y microproyectos para calcular similitudes
        for (let producto of productos) {
            if (!producto) continue;  // Si el producto está vacío, lo omitimos

            const productoResult = await client.query('SELECT id FROM productos WHERE usuario_id = $1 AND producto = $2', [usuarioId, producto]);

            if (productoResult.rowCount === 0) continue;  // Si el producto no existe, lo omitimos

            const productoId = productoResult.rows[0].id;

            for (let microproyecto of result.rows) {
                if (!microproyecto.objetivo_microproyecto) continue;  // Omitimos microproyectos sin objetivos

                // Calcular la similitud usando lematización, bigramas y limpieza de textos
                const similitud = calcularSimilitudCoseno(producto, microproyecto.objetivo_microproyecto);

                // Solo guardamos las similitudes que superen el umbral
                if (similitud >= THRESHOLD) {
                    console.log(`Guardando similitud (${similitud}) entre el producto ${productoId} y el microproyecto ${microproyecto.id}`);
                    await client.query(
                        'INSERT INTO productos_microproyectos_similitud (producto_id, microproyecto_id, similitud) VALUES ($1, $2, $3)',
                        [productoId, microproyecto.id, similitud]
                    );
                }
            }
        }

        console.log("Similitudes calculadas y guardadas exitosamente.");
    } catch (error) {
        console.error('Error al calcular la similitud y guardar:', error);
    }
}



app.post('/api/usuarios', async (req, res) => {
    const { nombre, apellido, cedula, productos } = req.body;

    try {
        console.log('Inicio del proceso para insertar usuario y productos.');
        
        // Verificar si ya existe un usuario con la misma cédula
        const usuarioExistente = await client.query('SELECT id FROM usuarios WHERE cedula = $1', [cedula]);

        let usuarioId;
        if (usuarioExistente.rowCount > 0) {
            // Usuario ya existe, obtener su ID
            usuarioId = usuarioExistente.rows[0].id;
            console.log(`Usuario con cédula ${cedula} ya existe. Asignando nuevos productos.`);
        } else {
            // Usuario no existe, crear uno nuevo
            await client.query('BEGIN');
            const usuarioResult = await client.query(
                'INSERT INTO usuarios (nombre, apellido, cedula) VALUES ($1, $2, $3) RETURNING id',
                [nombre, apellido, cedula]
            );
            usuarioId = usuarioResult.rows[0].id;
            console.log(`Usuario creado con ID ${usuarioId}`);
            await client.query('COMMIT');
        }

        // Insertar productos asociados
        const insertProductosQuery = 'INSERT INTO productos (usuario_id, producto) VALUES ($1, $2)';
        for (let producto of productos) {
            await client.query(insertProductosQuery, [usuarioId, producto]);
            console.log(`Producto ${producto} insertado para el usuario ${usuarioId}`);
        }

        console.log('Todos los productos insertados correctamente. Llamando a la función calcularSimilitudYGuardar.');

        // Calcular y almacenar la similitud entre productos y microproyectos
        await calcularSimilitudYGuardar(usuarioId, productos);

        console.log('Similitud calculada y guardada con éxito.');

        res.json({ message: 'Productos asignados y similitud calculada correctamente.' });

    } catch (error) {
        if (error.code === '23505') {
            res.status(400).json({ error: 'La cédula ya está registrada en otro usuario' });
        } else {
            console.error('Error al insertar o actualizar los datos:', error);
            res.status(500).json({ error: 'Error al almacenar los datos' });
        }
    }
});




app.get('/api/similitud', async (req, res) => {
    try {
        const result = await client.query(`
            SELECT p.producto, mp.nombre_microproyecto, ps.similitud
            FROM productos_microproyectos_similitud ps
            JOIN productos p ON ps.producto_id = p.id
            JOIN microproyectos mp ON ps.microproyecto_id = mp.id;
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Error al obtener los datos de similitud:', error);
        res.status(500).json({ error: 'Error al obtener los datos de similitud' });
    }
});



// Ruta para generar un nuevo JSON a partir de las comparaciones para el gráfico Force-Directed
app.get('/api/generar-json', async (req, res) => {
    try {
        // Consulta para obtener proyectos padres y proyectos estratégicos
        const productosPadresQuery = `
            SELECT p.codigo_padre, p.nombre_articulador_producto, 
                   pe.codigo_proyecto, pe.nombre_proyecto
            FROM productos_padres p
            JOIN proyectos_estrategicos pe ON p.codigo_padre = pe.producto_padre;
        `;
        const productosPadresResult = await client.query(productosPadresQuery);

        // Consulta para obtener proyectos estratégicos y microproyectos
        const proyectosEstrategicosQuery = `
            SELECT pe.codigo_proyecto, pe.nombre_proyecto, 
                   mp.codigo_microproyecto, mp.nombre_microproyecto
            FROM proyectos_estrategicos pe
            LEFT JOIN microproyectos mp ON pe.codigo_proyecto = mp.proyecto_asociado;
        `;
        const proyectosEstrategicosResult = await client.query(proyectosEstrategicosQuery);

        // Consulta para obtener productos, usuarios y microproyectos con similitud
        const productosSimilitudQuery = `
            SELECT p.producto, mp.codigo_microproyecto, mp.nombre_microproyecto, ps.similitud,
                   u.nombre AS usuario_nombre, u.apellido AS usuario_apellido
            FROM productos_microproyectos_similitud ps
            JOIN productos p ON ps.producto_id = p.id
            JOIN microproyectos mp ON ps.microproyecto_id = mp.id
            JOIN usuarios u ON p.usuario_id = u.id;
        `;
        const productosSimilitudResult = await client.query(productosSimilitudQuery);

        // Crear arrays para nodos y enlaces
        const nodes = [];
        const links = [];
        const nodosUnicos = new Map();

        // Agregar nodos y enlaces de productos padres y proyectos estratégicos
        productosPadresResult.rows.forEach(row => {
            const { codigo_padre, nombre_articulador_producto, codigo_proyecto, nombre_proyecto } = row;

            if (!nodosUnicos.has(codigo_padre)) {
                nodes.push({ id: codigo_padre, name: nombre_articulador_producto, group: 'padre' });
                nodosUnicos.set(codigo_padre, true);
            }

            if (!nodosUnicos.has(codigo_proyecto)) {
                nodes.push({ id: codigo_proyecto, name: nombre_proyecto, group: 'estrategico' });
                nodosUnicos.set(codigo_proyecto, true);
            }

            links.push({ source: codigo_padre, target: codigo_proyecto });
        });

        // Agregar nodos y enlaces de proyectos estratégicos y microproyectos
        proyectosEstrategicosResult.rows.forEach(row => {
            const { codigo_proyecto, codigo_microproyecto, nombre_microproyecto } = row;

            if (codigo_microproyecto && !nodosUnicos.has(codigo_microproyecto)) {
                nodes.push({ id: codigo_microproyecto, name: nombre_microproyecto, group: 'microproyecto' });
                nodosUnicos.set(codigo_microproyecto, true);
            }

            if (codigo_microproyecto) {
                links.push({ source: codigo_proyecto, target: codigo_microproyecto });
            }
        });

        // Agregar nodos y enlaces de productos, usuarios y microproyectos con similitud
        productosSimilitudResult.rows.forEach(row => {
            const { producto, codigo_microproyecto, nombre_microproyecto, similitud, usuario_nombre, usuario_apellido } = row;

            const nombre_completo_usuario = `${usuario_nombre} ${usuario_apellido}`;

            // Agregar nodo del usuario si no existe
            if (!nodosUnicos.has(nombre_completo_usuario)) {
                nodes.push({ id: nombre_completo_usuario, name: nombre_completo_usuario, group: 'usuario' });
                nodosUnicos.set(nombre_completo_usuario, true);
            }

            // Agregar nodo del producto si no existe
            if (!nodosUnicos.has(producto)) {
                nodes.push({ id: producto, name: producto, group: 'producto' });
                nodosUnicos.set(producto, true);
            }

            // Crear el enlace entre el producto y su usuario
            links.push({ source: nombre_completo_usuario, target: producto });

            // Crear el enlace entre el producto y el microproyecto
            if (codigo_microproyecto) {
                links.push({ source: producto, target: codigo_microproyecto, value: similitud });
            }
        });

        const jsonResult = { nodes, links };
        res.json(jsonResult);

    } catch (error) {
        console.error('Error al generar el JSON:', error);
        res.status(500).json({ error: 'Error al generar los datos del gráfico' });
    }
});







// Ruta para servir el archivo JSON generado dinámicamente
app.get('/data/graph', async (req, res) => {
    try {
        const graphData = await obtenerDatosYConstruirJSON();
        res.json(graphData);
    } catch (error) {
        res.status(500).json({ error: 'Error al generar los datos del gráfico' });
    }
});

// Ruta para servir la página HTML
app.use(express.static(path.join(__dirname, 'public')));

app.listen(3090, () => {
    console.log('Servidor corriendo en http://localhost:3090');
});
