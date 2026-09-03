/* ============================================================
   CONTRATÁ YA — Datos de demostración
   Todo ficticio. Reemplazar por la base real en producción.
   ============================================================ */

// Las 14 localidades del Partido de la Costa, de norte a sur.
// El orden importa: define el "riel de la costa" que estructura toda la interfaz.
const LOCALIDADES = [
  'San Clemente del Tuyú',
  'Las Toninas',
  'Costa Chica',
  'Santa Teresita',
  'Mar del Tuyú',
  'Costa del Este',
  'Aguas Verdes',
  'La Lucila del Mar',
  'Costa Azul',
  'San Bernardo',
  'Mar de Ajó',
  'Nueva Atlantis',
  'Punta Médanos',
  'Costa Esmeralda'
];

const RUBROS = [
  { id: 'albanileria',   nombre: 'Albañilería',      glifo: '▤' },
  { id: 'electricidad',  nombre: 'Electricidad',     glifo: '⚡' },
  { id: 'plomeria',      nombre: 'Plomería',         glifo: '≋' },
  { id: 'gas',           nombre: 'Gas matriculado',  glifo: '◈' },
  { id: 'pintura',       nombre: 'Pintura',          glifo: '▨' },
  { id: 'techos',        nombre: 'Techos',           glifo: '◤' },
  { id: 'carpinteria',   nombre: 'Carpintería',      glifo: '▦' },
  { id: 'herreria',      nombre: 'Herrería',         glifo: '⌗' },
  { id: 'climatizacion', nombre: 'Aire y calefacción', glifo: '❋' },
  { id: 'piletas',       nombre: 'Piletas',          glifo: '◯' },
  { id: 'durlock',       nombre: 'Durlock',          glifo: '▭' },
  { id: 'pisos',         nombre: 'Pisos y revestimientos', glifo: '▩' },
  { id: 'destapaciones', nombre: 'Destapaciones',    glifo: '◉' },
  { id: 'jardineria',    nombre: 'Parquización',     glifo: '❦' },
  { id: 'contratista',   nombre: 'Obra completa',    glifo: '⬢' }
];

const URGENCIAS = [
  { id: 'urgente',   nombre: 'Es una urgencia', detalle: 'Hoy o mañana' },
  { id: 'semana',    nombre: 'Esta semana',     detalle: 'Dentro de 7 días' },
  { id: 'planeado',  nombre: 'Sin apuro',       detalle: 'Estoy presupuestando' }
];

// Niveles de verificación — cada capa es automática, sin intervención humana.
const CAPAS_VERIFICACION = [
  { id: 'telefono', nombre: 'Teléfono',        metodo: 'Código por SMS',                   peso: 1 },
  { id: 'email',    nombre: 'Correo',          metodo: 'Enlace de confirmación',           peso: 1 },
  { id: 'cuit',     nombre: 'CUIT activo',     metodo: 'Consulta al padrón de AFIP',       peso: 2 },
  { id: 'identidad',nombre: 'Identidad',       metodo: 'DNI + selfie con prueba de vida',  peso: 3 },
  { id: 'zona',     nombre: 'Zona de trabajo', metodo: 'Ubicación confirmada en la costa', peso: 1 }
];

const PROFESIONALES = [
  {
    id: 1, nombre: 'Rubén Alcaraz', rubro: 'albanileria', localidad: 'San Bernardo',
    foto: '/img/gente/p01.svg',
    anios: 22, trabajos: 148, puntaje: 4.9, respuesta: 12,
    verificacion: ['telefono','email','cuit','identidad','zona'], plan: 'pro',
    desde: 45000, bio: 'Revoques, contrapisos y ampliaciones. Trabajo con equipo propio de tres personas. Presupuesto sin cargo en el día.',
    especialidades: ['Revoque fino', 'Contrapisos', 'Ampliaciones', 'Mampostería'],
    resenas: [
      { autor: 'Marina G.', local: 'San Bernardo', puntaje: 5, texto: 'Levantó la pared del fondo en cuatro días. Dejó todo limpio.' },
      { autor: 'Diego P.', local: 'Costa Azul', puntaje: 5, texto: 'Cumplió el precio que pasó por escrito. Sin sorpresas.' }
    ]
  },
  {
    id: 2, nombre: 'Vanina Ferreyra', rubro: 'electricidad', localidad: 'Santa Teresita',
    foto: '/img/gente/p02.svg',
    anios: 11, trabajos: 96, puntaje: 4.8, respuesta: 8,
    verificacion: ['telefono','email','cuit','identidad','zona'], plan: 'pro',
    desde: 38000, bio: 'Matriculada categoría III. Tableros, puesta a tierra y certificados para habilitación comercial.',
    especialidades: ['Tableros', 'Puesta a tierra', 'Certificados', 'Luminarias'],
    resenas: [
      { autor: 'Hernán V.', local: 'Mar del Tuyú', puntaje: 5, texto: 'Hizo el tablero nuevo del local y me firmó el certificado.' },
      { autor: 'Silvia R.', local: 'Santa Teresita', puntaje: 4, texto: 'Muy prolija. Llegó una hora tarde pero avisó.' }
    ]
  },
  {
    id: 3, nombre: 'Coco Maidana', rubro: 'plomeria', localidad: 'Mar de Ajó',
    foto: '/img/gente/p03.svg',
    anios: 17, trabajos: 210, puntaje: 4.7, respuesta: 5,
    verificacion: ['telefono','email','cuit','zona'], plan: 'verificado',
    desde: 30000, bio: 'Destapaciones con máquina, cambio de termotanques y cañerías. Atiendo urgencias los siete días.',
    especialidades: ['Destapaciones', 'Termotanques', 'Cañerías', 'Urgencias'],
    resenas: [
      { autor: 'Laura M.', local: 'Mar de Ajó', puntaje: 5, texto: 'Un domingo a las once de la noche. Vino igual.' },
      { autor: 'Tito B.', local: 'Nueva Atlantis', puntaje: 4, texto: 'Resolvió rápido. El precio de la urgencia es alto pero avisado.' }
    ]
  },
  {
    id: 4, nombre: 'Estudio Ranchos', rubro: 'contratista', localidad: 'Costa del Este',
    foto: '/img/gente/p04.svg',
    anios: 9, trabajos: 34, puntaje: 4.9, respuesta: 20,
    verificacion: ['telefono','email','cuit','identidad','zona'], plan: 'pro',
    desde: 900000, bio: 'Empresa constructora. Obra nueva y refacción integral llave en mano, con dirección técnica y seguro de obra.',
    especialidades: ['Obra nueva', 'Llave en mano', 'Dirección técnica', 'Seguro de obra'],
    resenas: [
      { autor: 'Familia Sosa', local: 'Costa del Este', puntaje: 5, texto: 'Casa de cero en once meses. Entregaron dentro del plazo.' },
      { autor: 'Ana C.', local: 'Aguas Verdes', puntaje: 5, texto: 'Reformaron el dúplex entero. Muy serios con los pagos y las etapas.' }
    ]
  },
  {
    id: 5, nombre: 'Nicolás Ibarrola', rubro: 'techos', localidad: 'Las Toninas',
    foto: '/img/gente/p05.svg',
    anios: 14, trabajos: 127, puntaje: 4.6, respuesta: 15,
    verificacion: ['telefono','email','cuit','zona'], plan: 'verificado',
    desde: 52000, bio: 'Techos de chapa y tejas, canaletas y membrana. Especialista en filtraciones por viento de mar.',
    especialidades: ['Chapa', 'Membrana', 'Canaletas', 'Filtraciones'],
    resenas: [
      { autor: 'Roberto D.', local: 'Las Toninas', puntaje: 5, texto: 'Encontró la filtración que otros tres no habían visto.' },
      { autor: 'Paula N.', local: 'Costa Chica', puntaje: 4, texto: 'Buen trabajo. Tardó más de lo pactado por la lluvia.' }
    ]
  },
  {
    id: 6, nombre: 'Marcos Quiñones', rubro: 'pintura', localidad: 'San Clemente del Tuyú',
    foto: '/img/gente/p06.svg',
    anios: 8, trabajos: 88, puntaje: 4.8, respuesta: 10,
    verificacion: ['telefono','email','cuit','identidad','zona'], plan: 'verificado',
    desde: 25000, bio: 'Pintura interior y exterior con tratamiento antisalitre. Trabajo en casas de fin de semana con el dueño ausente.',
    especialidades: ['Antisalitre', 'Exteriores', 'Empapelado', 'Casas cerradas'],
    resenas: [
      { autor: 'Gustavo L.', local: 'San Clemente del Tuyú', puntaje: 5, texto: 'Me mandó fotos todos los días. Vivo en Capital, fue clave.' },
      { autor: 'Cecilia A.', local: 'Las Toninas', puntaje: 5, texto: 'El frente quedó como nuevo después de dos inviernos feos.' }
    ]
  },
  {
    id: 7, nombre: 'Damián Ortellado', rubro: 'gas', localidad: 'La Lucila del Mar',
    foto: '/img/gente/p07.svg',
    anios: 19, trabajos: 143, puntaje: 5.0, respuesta: 9,
    verificacion: ['telefono','email','cuit','identidad','zona'], plan: 'pro',
    desde: 42000, bio: 'Gasista matriculado. Instalaciones nuevas, pruebas de hermeticidad y trámites ante la distribuidora.',
    especialidades: ['Matriculado', 'Hermeticidad', 'Calefactores', 'Trámites'],
    resenas: [
      { autor: 'Norma T.', local: 'La Lucila del Mar', puntaje: 5, texto: 'Hizo la instalación y el trámite completo. Me ahorró vueltas.' },
      { autor: 'Julián E.', local: 'Costa Azul', puntaje: 5, texto: 'Detectó una pérdida vieja. Trabajo impecable.' }
    ]
  },
  {
    id: 8, nombre: 'Sabrina Luccini', rubro: 'durlock', localidad: 'Costa Azul',
    foto: '/img/gente/p08.svg',
    anios: 7, trabajos: 71, puntaje: 4.7, respuesta: 14,
    verificacion: ['telefono','email','cuit','zona'], plan: 'gratis',
    desde: 28000, bio: 'Cielorrasos, tabiques y muebles a medida en durlock. Terminaciones para pintar sin retoques.',
    especialidades: ['Cielorrasos', 'Tabiques', 'Nichos', 'Aislación'],
    resenas: [
      { autor: 'Federico M.', local: 'Costa Azul', puntaje: 5, texto: 'Dividió el ambiente en dos días. Terminación perfecta.' },
      { autor: 'Lucrecia P.', local: 'San Bernardo', puntaje: 4, texto: 'Buen trabajo y buen precio.' }
    ]
  },
  {
    id: 9, nombre: 'Walter Cañete', rubro: 'piletas', localidad: 'Costa Esmeralda',
    foto: '/img/gente/p09.svg',
    anios: 13, trabajos: 62, puntaje: 4.9, respuesta: 18,
    verificacion: ['telefono','email','cuit','identidad','zona'], plan: 'pro',
    desde: 35000, bio: 'Construcción y mantenimiento de piletas. Contrato de temporada para propietarios que no viven en la costa.',
    especialidades: ['Mantenimiento', 'Construcción', 'Bombas', 'Temporada'],
    resenas: [
      { autor: 'Consorcio Médanos', local: 'Costa Esmeralda', puntaje: 5, texto: 'Mantiene las dos piletas del complejo hace tres temporadas.' },
      { autor: 'Eduardo R.', local: 'Punta Médanos', puntaje: 5, texto: 'Contrato anual. Nunca tuve que llamarlo, va solo.' }
    ]
  },
  {
    id: 10, nombre: 'Julio Barrionuevo', rubro: 'herreria', localidad: 'Mar del Tuyú',
    foto: '/img/gente/p10.svg',
    anios: 26, trabajos: 189, puntaje: 4.8, respuesta: 11,
    verificacion: ['telefono','email','cuit','identidad','zona'], plan: 'verificado',
    desde: 40000, bio: 'Rejas, portones y estructuras. Herrería tratada contra la corrosión del ambiente marino.',
    especialidades: ['Rejas', 'Portones', 'Estructuras', 'Anticorrosivo'],
    resenas: [
      { autor: 'Mónica S.', local: 'Mar del Tuyú', puntaje: 5, texto: 'Portón corredizo con motor. Trabajo de otra época, en el buen sentido.' },
      { autor: 'Pablo I.', local: 'Santa Teresita', puntaje: 4, texto: 'Muy buen producto. La entrega demoró dos semanas más.' }
    ]
  },
  {
    id: 11, nombre: 'Yésica Roldán', rubro: 'pisos', localidad: 'Aguas Verdes',
    foto: '/img/gente/p11.svg',
    anios: 10, trabajos: 104, puntaje: 4.7, respuesta: 13,
    verificacion: ['telefono','email','cuit','zona'], plan: 'verificado',
    desde: 32000, bio: 'Colocación de cerámicos, porcelanato y vinílico. Nivelación de contrapisos incluida.',
    especialidades: ['Porcelanato', 'Vinílico', 'Nivelación', 'Zócalos'],
    resenas: [
      { autor: 'Andrés F.', local: 'Aguas Verdes', puntaje: 5, texto: 'Porcelanato grande sin una junta despareja.' },
      { autor: 'Karina O.', local: 'La Lucila del Mar', puntaje: 4, texto: 'Prolija y puntual.' }
    ]
  },
  {
    id: 12, nombre: 'Sergio Paniagua', rubro: 'climatizacion', localidad: 'Nueva Atlantis',
    foto: '/img/gente/p12.svg',
    anios: 12, trabajos: 156, puntaje: 4.6, respuesta: 7,
    verificacion: ['telefono','email','cuit','identidad','zona'], plan: 'verificado',
    desde: 29000, bio: 'Instalación y service de aires acondicionados. Carga de gas y limpieza de filtros antes de temporada.',
    especialidades: ['Instalación', 'Service', 'Carga de gas', 'Split'],
    resenas: [
      { autor: 'Marcela D.', local: 'Nueva Atlantis', puntaje: 5, texto: 'Instaló tres equipos en un día.' },
      { autor: 'Ramiro C.', local: 'Mar de Ajó', puntaje: 4, texto: 'Buen precio y responde rápido por mensaje.' }
    ]
  },
  {
    id: 13, nombre: 'Lucas Verón', rubro: 'carpinteria', localidad: 'Punta Médanos',
    foto: '/img/gente/p13.svg',
    anios: 15, trabajos: 79, puntaje: 4.9, respuesta: 16,
    verificacion: ['telefono','email','cuit','identidad','zona'], plan: 'pro',
    desde: 48000, bio: 'Muebles a medida, decks y pérgolas en madera tratada para intemperie de costa.',
    especialidades: ['Decks', 'Pérgolas', 'Muebles a medida', 'Madera tratada'],
    resenas: [
      { autor: 'Verónica A.', local: 'Punta Médanos', puntaje: 5, texto: 'El deck lleva dos temporadas impecable.' },
      { autor: 'Martín S.', local: 'Costa Esmeralda', puntaje: 5, texto: 'Diseñó la pérgola conmigo. Muy buen criterio.' }
    ]
  },
  {
    id: 14, nombre: 'Ezequiel Ledesma', rubro: 'destapaciones', localidad: 'Costa Chica',
    foto: '/img/gente/p14.svg',
    anios: 6, trabajos: 231, puntaje: 4.5, respuesta: 4,
    verificacion: ['telefono','email','zona'], plan: 'gratis',
    desde: 22000, bio: 'Destapaciones de cloacas y pluviales con máquina rotativa. Cámara de inspección disponible.',
    especialidades: ['Cloacas', 'Pluviales', 'Cámara de inspección', 'Urgencias'],
    resenas: [
      { autor: 'Beatriz N.', local: 'Costa Chica', puntaje: 5, texto: 'Vino en cuarenta minutos un feriado.' },
      { autor: 'Osvaldo M.', local: 'Santa Teresita', puntaje: 4, texto: 'Resolvió el problema. Podría dejar más limpio al terminar.' }
    ]
  },
  {
    id: 15, nombre: 'Camila Duarte', rubro: 'jardineria', localidad: 'Costa del Este',
    foto: '/img/gente/p15.svg',
    anios: 9, trabajos: 118, puntaje: 4.8, respuesta: 12,
    verificacion: ['telefono','email','cuit','identidad','zona'], plan: 'verificado',
    desde: 20000, bio: 'Parquización con especies que resisten viento y salitre. Mantenimiento mensual de casas cerradas.',
    especialidades: ['Especies de costa', 'Mantenimiento', 'Riego', 'Poda'],
    resenas: [
      { autor: 'Elena V.', local: 'Costa del Este', puntaje: 5, texto: 'Sabe qué planta aguanta acá y qué planta no. Eso vale oro.' },
      { autor: 'Jorge P.', local: 'Aguas Verdes', puntaje: 5, texto: 'Mantiene el jardín todo el año, yo voy solo en enero.' }
    ]
  }
];


// Usuarios que contratan. También tienen foto y calificación:
// los profesionales los puntúan al terminar cada trabajo.
const CLIENTES = [
  { id:101, nombre:'Marina Gauna', localidad:'Santa Teresita', foto:'/img/gente/c01.svg',
    puntaje:4.9, contrataciones:7, desde:'2024', ausente:false,
    pedido:{ rubro:'albanileria', urgencia:'semana', detalle:'Necesito levantar una pared en el fondo y revocar. Los materiales los pongo yo.', presupuesto:'$150.000 a $250.000' },
    resenas:[
      { autor:'Rubén A.', rubro:'Albañilería', puntaje:5, texto:'Pagó el día que terminamos. Explicó bien lo que quería desde el principio.' },
      { autor:'Yésica R.', rubro:'Pisos', puntaje:5, texto:'Muy clara con el pedido y dejó la casa libre para trabajar.' }
    ] },
  { id:102, nombre:'Diego Peralta', localidad:'San Bernardo', foto:'/img/gente/c02.svg',
    puntaje:4.7, contrataciones:12, desde:'2023', ausente:false,
    pedido:{ rubro:'electricidad', urgencia:'urgente', detalle:'Salta la térmica cada vez que enciendo el aire. Casa de 1994, instalación vieja.', presupuesto:'$40.000 a $80.000' },
    resenas:[
      { autor:'Vanina F.', rubro:'Electricidad', puntaje:5, texto:'Sabe lo que necesita y no regatea el trabajo bien hecho.' },
      { autor:'Sergio P.', rubro:'Climatización', puntaje:4, texto:'Todo bien. Tardó un par de días en pagar la segunda parte.' }
    ] },
  { id:103, nombre:'Elena Vidal', localidad:'Costa del Este', foto:'/img/gente/c03.svg',
    puntaje:5.0, contrataciones:9, desde:'2022', ausente:true,
    pedido:{ rubro:'jardineria', urgencia:'planeado', detalle:'Casa de fin de semana. Busco mantenimiento mensual del jardín, no vivo acá.', presupuesto:'$20.000 por mes' },
    resenas:[
      { autor:'Camila D.', rubro:'Parquización', puntaje:5, texto:'Contrato anual, paga por adelantado todos los meses. Un lujo.' },
      { autor:'Marcos Q.', rubro:'Pintura', puntaje:5, texto:'Confía y deja trabajar. Me dio las llaves sin problema.' }
    ] },
  { id:104, nombre:'Hernán Vázquez', localidad:'Mar del Tuyú', foto:'/img/gente/c04.svg',
    puntaje:4.6, contrataciones:5, desde:'2025', ausente:false,
    pedido:{ rubro:'herreria', urgencia:'semana', detalle:'Portón corredizo para la entrada, 4 metros. Con motor si entra en presupuesto.', presupuesto:'$400.000 a $600.000' },
    resenas:[
      { autor:'Julio B.', rubro:'Herrería', puntaje:5, texto:'Buen tipo, paga sin vueltas.' },
      { autor:'Vanina F.', rubro:'Electricidad', puntaje:4, texto:'Cambió el pedido a mitad de camino pero reconoció la diferencia.' }
    ] },
  { id:105, nombre:'Osvaldo Miranda', localidad:'Mar de Ajó', foto:'/img/gente/c05.svg',
    puntaje:4.4, contrataciones:16, desde:'2022', ausente:false,
    pedido:{ rubro:'destapaciones', urgencia:'urgente', detalle:'Cloaca tapada, sale agua por la rejilla del patio. Es alquiler temporario, tengo gente el sábado.', presupuesto:'$25.000 a $45.000' },
    resenas:[
      { autor:'Ezequiel L.', rubro:'Destapaciones', puntaje:4, texto:'Llama seguido pero paga siempre.' },
      { autor:'Coco M.', rubro:'Plomería', puntaje:5, texto:'Tiene varias unidades, es cliente de todo el año.' }
    ] },
  { id:106, nombre:'Cecilia Aguirre', localidad:'Las Toninas', foto:'/img/gente/c06.svg',
    puntaje:4.8, contrataciones:6, desde:'2024', ausente:true,
    pedido:{ rubro:'techos', urgencia:'semana', detalle:'Se filtra agua en el dormitorio después de la tormenta. Necesito que revisen el techo entero.', presupuesto:'$80.000 a $200.000' },
    resenas:[
      { autor:'Nicolás I.', rubro:'Techos', puntaje:5, texto:'Me mandó fotos del problema antes de ir. Ahorró un viaje al pedo.' },
      { autor:'Marcos Q.', rubro:'Pintura', puntaje:5, texto:'Paga la mitad al empezar y el resto al terminar, como se debe.' }
    ] },
  { id:107, nombre:'Rodrigo Sosa', localidad:'San Clemente del Tuyú', foto:'/img/gente/c07.svg',
    puntaje:4.9, contrataciones:4, desde:'2025', ausente:false,
    pedido:{ rubro:'contratista', urgencia:'planeado', detalle:'Quiero construir una casa de 90 metros en un lote propio. Busco presupuesto llave en mano.', presupuesto:'$45.000.000 aprox.' },
    resenas:[
      { autor:'Estudio Ranchos', rubro:'Obra completa', puntaje:5, texto:'Cliente serio, con el terreno escriturado y los planos listos.' }
    ] },
  { id:108, nombre:'Norma Toledo', localidad:'La Lucila del Mar', foto:'/img/gente/c08.svg',
    puntaje:5.0, contrataciones:11, desde:'2021', ausente:false,
    pedido:{ rubro:'gas', urgencia:'semana', detalle:'Quiero instalar un calefactor tiro balanceado en el living. Necesito matriculado con certificado.', presupuesto:'$60.000 a $110.000' },
    resenas:[
      { autor:'Damián O.', rubro:'Gas', puntaje:5, texto:'La mejor clienta que tuve. Paga en el acto y convida mate.' },
      { autor:'Sabrina L.', rubro:'Durlock', puntaje:5, texto:'Recomienda a todo el barrio. Vale oro.' }
    ] },
  { id:109, nombre:'Fabián Ruiz', localidad:'Costa Azul', foto:'/img/gente/c09.svg',
    puntaje:4.3, contrataciones:3, desde:'2026', ausente:false,
    pedido:{ rubro:'pintura', urgencia:'planeado', detalle:'Pintar el frente de la casa antes de la temporada. Tiene salitre, hay que tratarlo.', presupuesto:'$90.000 a $160.000' },
    resenas:[
      { autor:'Marcos Q.', rubro:'Pintura', puntaje:4, texto:'Buen trato. Se demoró unos días con el pago final.' }
    ] },
  { id:110, nombre:'Paula Nieva', localidad:'Costa Chica', foto:'/img/gente/c10.svg',
    puntaje:4.8, contrataciones:8, desde:'2023', ausente:true,
    pedido:{ rubro:'piletas', urgencia:'planeado', detalle:'Mantenimiento de pileta por temporada. La casa se alquila, necesito alguien de confianza.', presupuesto:'$35.000 por mes' },
    resenas:[
      { autor:'Walter C.', rubro:'Piletas', puntaje:5, texto:'Contrato de temporada renovado tres veces. Cero problemas.' },
      { autor:'Camila D.', rubro:'Parquización', puntaje:5, texto:'Organizada y clara con los tiempos.' }
    ] }
];

// Criterios de calificación de cada lado.
const CRITERIOS = {
  alProfesional: ['Calidad del trabajo', 'Cumplió el plazo', 'Respetó el precio', 'Dejó limpio'],
  alCliente:     ['Pagó en fecha', 'Fue claro con el pedido', 'Dio acceso a la obra', 'Trato']
};

// Sponsors: comercios locales del rubro materiales.
// Modelo de exclusividad por rubro + localidad.
const SPONSORS = [
  { id:'faro',     nombre:'Corralón El Faro',        rubroComercio:'Materiales',  localidades:['San Bernardo','Costa Azul','La Lucila del Mar'], beneficio:'12% en cemento y hierro', color:'#F0A63A' },
  { id:'medano',   nombre:'Ferretería Médano',       rubroComercio:'Ferretería',  localidades:['Santa Teresita','Mar del Tuyú','Costa Chica'],   beneficio:'10% en herramienta eléctrica', color:'#2FB2A6' },
  { id:'tuyu',     nombre:'Sanitarios del Tuyú',     rubroComercio:'Sanitarios',  localidades:['San Clemente del Tuyú','Las Toninas'],           beneficio:'15% en griferías', color:'#7E9BD4' },
  { id:'atlantica',nombre:'Pinturería Atlántica',    rubroComercio:'Pinturería',  localidades:['Mar de Ajó','Nueva Atlantis','Punta Médanos'],   beneficio:'18% en látex exterior', color:'#E4574C' },
  { id:'esmeralda',nombre:'Aberturas Esmeralda',     rubroComercio:'Aberturas',   localidades:['Costa del Este','Aguas Verdes','Costa Esmeralda'], beneficio:'Flete sin cargo en la zona', color:'#C39BD3' }
];

const PLANES = [
  {
    id: 'gratis', nombre: 'Gratis', precio: 0, precioTexto: 'Sin costo',
    resumen: 'Para empezar a recibir trabajos hoy mismo.',
    incluye: [
      '10 contactos por mes',
      'Perfil con rubro y localidad',
      'Calificaciones a la vista',
      'Verificación de teléfono y correo'
    ],
    excluye: ['Sello de verificado', 'Prioridad en el orden', 'Beneficios en comercios']
  },
  {
    id: 'verificado', nombre: 'Verificado', precio: 9900, precioTexto: '$9.900 por mes',
    resumen: 'Para el que ya vive de esto y quiere que se note.',
    destacado: true,
    incluye: [
      'Contactos sin límite',
      'Sello de verificado en el perfil',
      'Identidad y CUIT confirmados',
      'Galería de trabajos anteriores',
      'Respuesta pública a las reseñas',
      'Beneficios en comercios adheridos'
    ],
    excluye: ['Destacado de localidad', 'Presupuestos desde la app']
  },
  {
    id: 'pro', nombre: 'Pro', precio: 24900, precioTexto: '$24.900 por mes',
    resumen: 'Para equipos y contratistas que quieren ocupar la zona.',
    incluye: [
      'Todo lo del plan Verificado',
      'Primer lugar en tu localidad',
      'Hasta 3 localidades a la vez',
      'Presupuestos y firma desde la app',
      'Estadísticas de vistas y contactos',
      'Perfil de empresa con equipo'
    ],
    excluye: []
  }
];

if (typeof module !== 'undefined') {
  module.exports = { LOCALIDADES, RUBROS, URGENCIAS, CAPAS_VERIFICACION, PROFESIONALES, CLIENTES, CRITERIOS, SPONSORS, PLANES };
}
