// Configuración personalizada por grupo
const groupConfig = {
    'padre': { 
        color: '#1f77b4',    // Azul
        radius: 40,          // Tamaño del nodo
        linkWidth: 5,        // Grosor de los enlaces
        linkColor: '#1f77b4', // Color de los enlaces
        showLabel: true,     // Mostrar texto al lado del nodo
        tooltipText: d => `Padre: ${d.name}`,  // Texto en el tooltip
        fontSize: '20px'     // Tamaño de la fuente de la etiqueta
    },
    'producto': { 
        color: '#ff7f0e',    // Naranja
        radius: 20,
        linkWidth: 7,
        linkColor: '#ff7f0e',       
        showLabel: false,    // Mostrar texto al lado del nodo
        tooltipText: d => `Producto: ${d.name}`,  // Texto en el tooltip
        fontSize: '12px'     // Tamaño de la fuente de la etiqueta
    },
    'estrategico': { 
        color: '#2ca02c',    // Verde
        radius: 30,
        linkWidth: 10,
        linkColor: '#2ca02c',
        showLabel: false,    // Mostrar texto al lado del nodo
        tooltipText: d => `Estrategia: ${d.name}`,  // Texto en el tooltip
        fontSize: '12px'     // Tamaño de la fuente de la etiqueta
    },
    'microproyecto': { 
        color: '#d62728',    // Rojo
        radius: 20,
        linkWidth: 6,
        linkColor: '#d62728',
        showLabel: false,    // Mostrar texto al lado del nodo
        tooltipText: d => `Microproyecto: ${d.name}`,  // Texto en el tooltip
        fontSize: '12px'     // Tamaño de la fuente de la etiqueta
    },
    'usuario': { 
        color: '#9467bd',    // Púrpura
        radius: 35,
        linkWidth: 4,
        linkColor: '#9467bd',
        showLabel: true,     // Mostrar texto al lado del nodo
        tooltipText: d => `Usuario: ${d.name}`,  // Texto en el tooltip
        fontSize: '16px'     // Tamaño de la fuente de la etiqueta
    }
};

// Crear el tooltip
const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0)
    .style("position", "absolute")
    .style("background-color", "white")
    .style("padding", "10px")  // Ajuste del padding para que el texto no toque los bordes
    .style("border", "1px solid #ccc")
    .style("border-radius", "4px")
    .style("pointer-events", "none")
    .style("white-space", "normal")  // Permitir que el texto ocupe varias líneas si es necesario
    .style("max-width", "200px");  // Limitar el ancho máximo del tooltip

// Crear el SVG y configurar el zoom
const svg = d3.select("svg")
    .attr("width", 800)
    .attr("height", 600)
    .call(d3.zoom().on("zoom", (event) => {
        svg.attr("transform", event.transform);
    }))
    .append("g");  // Añadir un grupo donde se escalará todo el contenido

// Función para centrar y hacer zoom inicial al gráfico
function applyInitialZoom() {
    const scale = 0.8;  // Factor de escala para ver todos los nodos
    const translate = [500, 100];  // Coordenadas para centrar el gráfico
    svg.attr("transform", `translate(${translate}) scale(${scale})`);
}

// Función para obtener el color del enlace basado en el grupo de origen
function getLinkColor(sourceGroup) {
    return groupConfig[sourceGroup] ? groupConfig[sourceGroup].linkColor : '#999';
}

// Función para obtener el grosor del enlace basado en el grupo de origen
function getLinkWidth(sourceGroup) {
    return groupConfig[sourceGroup] ? groupConfig[sourceGroup].linkWidth : 1;
}

// Función para posicionar el tooltip correctamente
function positionTooltip(event) {
    const tooltipWidth = tooltip.node().offsetWidth;
    const tooltipHeight = tooltip.node().offsetHeight;
    const pageWidth = window.innerWidth;
    const pageHeight = window.innerHeight;
    let left = event.pageX + 10;
    let top = event.pageY - 28;

    // Verificar si el tooltip se sale del borde derecho
    if (left + tooltipWidth > pageWidth) {
        left = event.pageX - tooltipWidth - 10;
    }

    // Verificar si el tooltip se sale del borde inferior
    if (top + tooltipHeight > pageHeight) {
        top = event.pageY - tooltipHeight - 10;
    }

    tooltip
        .style("left", `${left}px`)
        .style("top", `${top}px`);
}

// Cargar los datos desde el endpoint '/api/generar-json'
d3.json('/api/generar-json').then(data => {
    const width = 800;
    const height = 600;

    // Inicializar la simulación de fuerzas
    const simulation = d3.forceSimulation(data.nodes)
        .force("link", d3.forceLink(data.links)
            .id(d => d.id)
            .distance(400))  // Ajusta la distancia entre los nodos
        .force("charge", d3.forceManyBody().strength(-500))  // Fuerza de repulsión entre nodos
        .force("center", d3.forceCenter(width / 2, height / 2));

    // Dibujar enlaces (links)
    const link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(data.links)
        .enter().append("line")
        .attr("class", "link")
        .attr("stroke", d => getLinkColor(d.source.group))  // Color según el grupo de origen
        .attr("stroke-width", d => getLinkWidth(d.source.group));  // Grosor según el grupo de origen

    // Dibujar nodos
    const node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(data.nodes)
        .enter().append("circle")
        .attr("class", "node")
        .attr("r", d => groupConfig[d.group] ? groupConfig[d.group].radius : 10)  // Tamaño del nodo según el grupo
        .attr("fill", d => groupConfig[d.group] ? groupConfig[d.group].color : '#000')  // Color del nodo según el grupo
        .call(d3.drag()
            .on("start", dragstarted)
            .on("drag", dragged)
            .on("end", dragended))
        .on("mouseover", (event, d) => {
            tooltip.transition()
                .duration(200)
                .style("opacity", .9);
            // Mostrar contenido del tooltip según el grupo
            tooltip.html(groupConfig[d.group]?.tooltipText(d));
        })
        .on("mousemove", positionTooltip)  // Posicionar el tooltip según el mouse
        .on("mouseout", () => {
            tooltip.transition()
                .duration(500)
                .style("opacity", 0);
        });

    // Dibujar etiquetas
    const labels = svg.append("g")
        .attr("class", "labels")
        .selectAll("text")
        .data(data.nodes)
        .enter().append("text")
        .attr("class", "label")
        .attr("x", d => d.x + groupConfig[d.group]?.radius + 5 || 15)  // Posicionar etiqueta ligeramente a la derecha del nodo
        .attr("y", d => d.y + 3)  // Alineación vertical de la etiqueta
        .text(d => groupConfig[d.group]?.showLabel ? d.name : '')  // Mostrar el nombre solo si está permitido por el grupo
        .attr("font-size", d => groupConfig[d.group]?.fontSize || '10px')  // Ajustar el tamaño de la fuente según el grupo
        .attr("fill", "#000");  // Color negro para las etiquetas

    // Aplicar el zoom inicial
    applyInitialZoom();

    // Actualizar la posición de nodos y enlaces
    simulation.on("tick", () => {
        link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        node
            .attr("cx", d => d.x)
            .attr("cy", d => d.y);

        labels  // Mantener las etiquetas sincronizadas con los nodos
            .attr("x", d => d.x + groupConfig[d.group]?.radius + 5 || 15)
            .attr("y", d => d.y + 3);
    });

    // Funciones de arrastre
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
    }
});
