/**
 * djnova - Backend (Google Apps Script)
 *
 * Web de un DJ configurable desde /admin: el contenido de la web (textos,
 * colores, agenda, galería…), las solicitudes de contratación, los usuarios
 * del panel y los archivos subidos (en una carpeta de Google Drive).
 * Misma estructura que Pedidos ON.
 *
 * Despliegue:
 *   Extensiones > Apps Script > pegar este archivo (y appsscript.json)
 *   > Implementar > Aplicación web
 *   > Ejecutar como: Yo | Quién tiene acceso: Cualquier usuario
 *
 * Primera vez: ejecuta la función `instalar` (botón Ejecutar en el editor, o
 * menú "djnova" de la hoja tras recargarla). Crea las pestañas de
 * ENCABEZADOS, la carpeta de Drive y un admin inicial (la contraseña queda en
 * la pestaña Usuarios). Es idempotente.
 * Funciona como script vinculado a un Sheet o como proyecto independiente
 * (crea el Sheet "djnova" en tu Drive y guarda su ID en SPREADSHEET_ID).
 *
 * Roles:
 *   admin     control total y usuarios.
 *   operador  edita el contenido de la web, sube archivos y gestiona contrataciones.
 *   consulta  solo lectura.
 *
 * Público (sin usuario): getSitio (la web lee su contenido) y
 * enviarContratacion (formulario de la web).
 *
 * Contenido de la web: hasta el primer «Guardar y publicar» del /admin,
 * getSitio devuelve tablas = null y la web muestra su contenido de ejemplo.
 */

// ---------- Estructura ----------

var ENCABEZADOS = {
  Usuarios: ['usuario', 'password', 'rol', 'activo', 'nombre'],
  // Contenido de la web (lo edita el /admin entero de una vez).
  Ajustes: ['clave', 'valor'],
  Secciones: ['id', 'menu', 'visible', 'orden'],
  Numeros: ['numero', 'prefijo', 'etiqueta'],
  Paises: ['bandera', 'nombre', 'regiones', 'ciudades'],
  Barras: ['etiqueta', 'porcentaje'],
  Agenda: ['fecha', 'lugar', 'ciudad', 'estado', 'entradas'],
  Videos: ['youtube', 'titulo'],
  Galeria: ['imagen', 'descripcion'],
  Redes: ['red', 'url'],
  Beneficios: ['texto'],
  // Privado.
  Contrataciones: ['id', 'recibido', 'nombre', 'contacto', 'fechaEvento', 'ciudad', 'evento', 'mensaje', 'estado'],
  Archivos: ['id', 'driveId', 'nombre', 'mime', 'bytes', 'url', 'subidoPor', 'fecha'],
  Config: ['clave', 'valor']
};

/** Columnas numéricas y de casilla: el resto se guarda como texto (formato @). */
var NUMERICAS = ['numero', 'orden', 'porcentaje', 'bytes'];
var CASILLAS = ['activo', 'visible'];
/** Columnas con fecha sin hora ('yyyy-MM-dd'); las demás fechas son ISO con hora. */
var FECHAS_DIA = ['fechaEvento'];

/** Clave que usa el frontend → pestaña del contenido de la web. */
var TABLAS_SITIO = {
  ajustes: 'Ajustes', secciones: 'Secciones', numeros: 'Numeros', paises: 'Paises', barras: 'Barras',
  agenda: 'Agenda', videos: 'Videos', galeria: 'Galeria', redes: 'Redes', beneficios: 'Beneficios'
};

var ROLES = ['admin', 'operador', 'consulta'];
var EDITORES = ['admin', 'operador'];

var ESTADOS_CONTRATACION = ['Nuevo', 'Contactado', 'Negociando', 'Cerrado', 'Descartado'];

var MAX_ARCHIVO_BYTES = 20 * 1024 * 1024;
var CARPETA_RAIZ = 'djnova - Archivos';

var REVISIONES = ['usuarios', 'sitio', 'contrataciones', 'archivos', 'config'];

/** Acciones sin usuario: las usa la web pública. */
var PUBLICAS = ['getSitio', 'enviarContratacion', 'getArchivo'];

/** Tamaño de cada trozo que sirve getArchivo (la respuesta va en base64: +33 %). */
var TROZO_BYTES = 3 * 1024 * 1024;

// ---------- Entrada ----------

/** En las acciones de escritura la respuesta lleva los contadores de revisión (ver jsonOut_). */
var ADJUNTAR_REVISIONES_ = false;

function doGet() {
  return jsonOut_({ ok: true, service: 'djnova' });
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse(e.postData.contents);
  } catch (err) {
    return jsonOut_({ ok: false, error: 'Solicitud inválida' });
  }

  // Las lecturas (list*, get*, login) y las públicas no llevan contadores; todo lo demás sí.
  var accion = String(body.action || '');
  ADJUNTAR_REVISIONES_ = !/^(list|get|login)/i.test(accion) && PUBLICAS.indexOf(accion) === -1;
  SS_ = null;
  HOJAS_ = {};
  PROPS_RECIENTES_ = null;

  try {
    switch (accion) {
      // Públicas
      case 'getSitio':                   return handleGetSitio_(body);
      case 'enviarContratacion':         return handleEnviarContratacion_(body);
      case 'getArchivo':                 return handleGetArchivo_(body);
      // Sesión y usuarios
      case 'login':                      return handleLogin_(body);
      case 'getRevisions':               return handleGetRevisions_(body);
      case 'cambiarMiPassword':          return handleCambiarMiPassword_(body);
      case 'listUsuarios':               return handleListUsuarios_(body);
      case 'createUsuario':              return handleCreateUsuario_(body);
      case 'updateUsuario':              return handleUpdateUsuario_(body);
      case 'deleteUsuario':              return handleDeleteUsuario_(body);
      // Contenido de la web
      case 'guardarSitio':               return handleGuardarSitio_(body);
      // Contrataciones
      case 'listContrataciones':         return handleListContrataciones_(body);
      case 'cambiarEstadoContratacion':  return handleCambiarEstadoContratacion_(body);
      case 'borrarContratacion':         return handleBorrarContratacion_(body);
      // Archivos
      case 'listArchivos':               return handleListArchivos_(body);
      case 'subirArchivo':               return handleSubirArchivo_(body);
      default:                           return jsonOut_({ ok: false, error: 'Acción desconocida' });
    }
  } catch (err) {
    // "codigo" deja que el frontend distinga una sesión caída de cualquier otro error.
    return jsonOut_({ ok: false, error: err.message || ('Error del servidor: ' + err), codigo: err.codigo || '' });
  }
}

// ---------- Autenticación ----------

function handleLogin_(body) {
  var user = findUser_(body.usuario, body.password);
  if (!user) return jsonOut_({ ok: false, error: 'Usuario o contraseña incorrectos' });
  return jsonOut_({ ok: true, usuario: user.usuario, nombre: user.nombre, rol: user.rol });
}

/** Valida credenciales y devuelve el usuario; si no, error con codigo 'SESION'. */
function requireAuth_(body) {
  var user = findUser_(body.usuario, body.password);
  if (!user) {
    var e = new Error('Sesión no válida. Vuelve a iniciar sesión.');
    e.codigo = 'SESION';
    throw e;
  }
  return user;
}

function requireRol_(body, roles) {
  var user = requireAuth_(body);
  if (roles.indexOf(user.rol) === -1) throw new Error('No autorizado para esta acción.');
  return user;
}

function requireAdmin_(body) { return requireRol_(body, ['admin']); }
function requireEditor_(body) { return requireRol_(body, EDITORES); }

/**
 * Las credenciales que ya se validaron se guardan unos minutos en la caché del script (con una huella SHA-256 como
 * clave: la contraseña no se guarda), para no leer la hoja Usuarios en cada llamada. Cualquier cambio de usuarios
 * hecho desde la app invalida la caché al instante (ver conLock_); lo que se edite a mano en la hoja se nota a
 * más tardar a los CACHE_AUTH_SEG segundos.
 */
var CACHE_AUTH_SEG = 300;
var CLAVE_VERSION_AUTH = 'auth_version';

function claveAuth_(nombre, pass) {
  var huella = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, nombre.toUpperCase() + '\n' + pass, Utilities.Charset.UTF_8);
  return 'auth_' + Utilities.base64Encode(huella);
}

/** Invalida todas las credenciales guardadas en caché (cambia la versión con la que se comparan). */
function invalidarAuth_() {
  try { CacheService.getScriptCache().put(CLAVE_VERSION_AUTH, Utilities.getUuid(), 21600); } catch (e) {}
}

function findUser_(usuario, password) {
  var nombre = String(usuario || '').trim();
  var pass = String(password || '');
  if (!nombre || !pass) return null;

  var cache = null, clave = '', version = '';
  try {
    cache = CacheService.getScriptCache();
    clave = claveAuth_(nombre, pass);
    var guardado = cache.getAll([clave, CLAVE_VERSION_AUTH]);
    version = guardado[CLAVE_VERSION_AUTH] || '';
    if (!version) {
      // Sin versión (primera vez o la caché la perdió): se crea una nueva, y con ella se descartan las entradas viejas.
      version = Utilities.getUuid();
      cache.put(CLAVE_VERSION_AUTH, version, 21600);
    } else if (guardado[clave]) {
      var c = JSON.parse(guardado[clave]);
      if (c.v === version) return c.u;
    }
  } catch (e) {
    cache = null; // sin caché disponible se valida contra la hoja, como siempre
  }

  var t = leer_('Usuarios');
  for (var i = 0; i < t.filas.length; i++) {
    var u = t.filas[i];
    // El usuario no distingue mayúsculas/minúsculas; la contraseña sí.
    if (u.usuario.toUpperCase() === nombre.toUpperCase() && String(u.password) === pass && u.activo) {
      var encontrado = { usuario: u.usuario, rol: normalizarRol_(u.rol), nombre: u.nombre };
      if (cache) { try { cache.put(clave, JSON.stringify({ v: version, u: encontrado }), CACHE_AUTH_SEG); } catch (e) {} }
      return encontrado;
    }
  }
  return null;
}

// ---------- Revisiones ----------
// Un contador por tabla en PropertiesService para que el frontend pregunte
// "¿cambió algo?" sin leer ninguna hoja. Se incrementa dentro del lock de cada
// escritura. Editar el Sheet a mano NO lo incrementa (para eso está el menú
// djnova > Publicar cambios hechos a mano).

/** Propiedades del script tal como quedaron tras el último incremento de esta ejecución (evita volver a leerlas). */
var PROPS_RECIENTES_ = null;

/** Sube en uno el contador de cada revisión indicada, con una sola lectura y una sola escritura de propiedades. */
function bumpRevisiones_(claves) {
  if (!claves.length) return;
  var props = PropertiesService.getScriptProperties();
  var todas = props.getProperties();
  var nuevas = {};
  claves.forEach(function (k) { nuevas['rev_' + k] = String((Number(todas['rev_' + k]) || 0) + 1); });
  props.setProperties(nuevas);
  Object.keys(nuevas).forEach(function (k) { todas[k] = nuevas[k]; });
  PROPS_RECIENTES_ = todas;
}

function revisionesActuales_() {
  var props = PROPS_RECIENTES_ || PropertiesService.getScriptProperties().getProperties();
  var revisiones = {};
  REVISIONES.forEach(function (k) { revisiones[k] = Number(props['rev_' + k]) || 0; });
  return revisiones;
}

function handleGetRevisions_(body) {
  requireAuth_(body);
  return jsonOut_({ ok: true, revisiones: revisionesActuales_() });
}

/** Ejecuta `fn` con el lock del script tomado y sube las revisiones indicadas. */
function conLock_(revs, fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var r = fn();
    bumpRevisiones_(revs);
    // Altas, cambios y bajas de usuarios (y de contraseñas): las credenciales en caché dejan de valer ya.
    if (revs.indexOf('usuarios') !== -1) invalidarAuth_();
    return r;
  } finally {
    lock.releaseLock();
  }
}

// ---------- Usuarios ----------

function handleListUsuarios_(body) {
  requireAdmin_(body);
  var usuarios = leer_('Usuarios').filas.filter(function (u) { return u.usuario; }).map(function (u) {
    return { usuario: u.usuario, nombre: u.nombre, rol: normalizarRol_(u.rol), activo: u.activo };
  });
  return jsonOut_({ ok: true, usuarios: usuarios });
}

function handleCreateUsuario_(body) {
  requireAdmin_(body);
  var nombre = String(body.nuevoUsuario || '').trim().toUpperCase();
  var password = String(body.nuevaPassword || '');
  if (!nombre) throw new Error('El nombre de usuario es obligatorio.');
  if (!password) throw new Error('La contraseña inicial es obligatoria.');
  conLock_(['usuarios'], function () {
    if (usuarioPorNombre_(nombre)) throw new Error('Ya existe un usuario con ese nombre.');
    agregar_('Usuarios', {
      usuario: nombre, password: password, rol: normalizarRol_(body.rol),
      activo: body.activo !== false, nombre: texto_(body.nombre, 80)
    });
  });
  return jsonOut_({ ok: true });
}

function handleUpdateUsuario_(body) {
  requireAdmin_(body);
  var objetivo = String(body.targetUsuario || '').trim();
  if (!objetivo) throw new Error('Falta el usuario a editar.');
  var rol = normalizarRol_(body.rol);
  var activo = body.activo !== false;
  var nuevoNombre = String(body.nuevoUsuario || '').trim().toUpperCase();
  var nuevaPassword = String(body.nuevaPassword || '');

  var final = conLock_(['usuarios'], function () {
    var u = usuarioPorNombre_(objetivo);
    if (!u) throw new Error('El usuario ya no existe.');
    var eraAdminActivo = normalizarRol_(u.rol) === 'admin' && u.activo;
    if (eraAdminActivo && !(rol === 'admin' && activo) && contarAdminsActivos_() <= 1) {
      throw new Error('No puedes quitar el último Admin activo.');
    }
    var seRenombra = !!nuevoNombre && nuevoNombre !== u.usuario.toUpperCase();
    if (seRenombra && usuarioPorNombre_(nuevoNombre)) throw new Error('Ya existe un usuario con ese nombre.');
    if (seRenombra) u.usuario = nuevoNombre;
    u.rol = rol;
    u.activo = activo;
    u.nombre = texto_(body.nombre, 80);
    if (nuevaPassword) u.password = nuevaPassword;
    escribir_('Usuarios', u);
    return u.usuario;
  });
  return jsonOut_({ ok: true, usuario: final });
}

function handleDeleteUsuario_(body) {
  var actual = requireAdmin_(body);
  var objetivo = String(body.targetUsuario || '').trim();
  if (!objetivo) throw new Error('Falta el usuario a borrar.');
  if (objetivo.toUpperCase() === actual.usuario.toUpperCase()) throw new Error('No puedes borrarte a ti mismo.');
  conLock_(['usuarios'], function () {
    var u = usuarioPorNombre_(objetivo);
    if (!u) throw new Error('El usuario ya no existe.');
    if (normalizarRol_(u.rol) === 'admin' && u.activo && contarAdminsActivos_() <= 1) {
      throw new Error('No puedes borrar el último Admin activo.');
    }
    borrarFila_(hoja_('Usuarios'), u._fila);
  });
  return jsonOut_({ ok: true });
}

function handleCambiarMiPassword_(body) {
  var user = requireAuth_(body);
  var nuevaPassword = String(body.nuevaPassword || '');
  if (!nuevaPassword) throw new Error('La nueva contraseña es obligatoria.');
  conLock_([], function () {
    var u = usuarioPorNombre_(user.usuario);
    if (!u) throw new Error('El usuario ya no existe.');
    u.password = nuevaPassword;
    escribir_('Usuarios', u);
    invalidarAuth_(); // la contraseña vieja deja de valer ya, no cuando venza la caché
  });
  return jsonOut_({ ok: true });
}

function usuarioPorNombre_(nombre) {
  var buscado = String(nombre).trim().toUpperCase();
  var filas = leer_('Usuarios').filas;
  for (var i = 0; i < filas.length; i++) {
    if (filas[i].usuario.toUpperCase() === buscado) return filas[i];
  }
  return null;
}

function contarAdminsActivos_() {
  return leer_('Usuarios').filas.filter(function (u) { return normalizarRol_(u.rol) === 'admin' && u.activo; }).length;
}

// ---------- Contenido de la web ----------

/**
 * Lo lee la web pública en cada visita. Se guarda en la caché del script con la
 * revisión «sitio» en la clave: guardar desde el /admin la sube y la caché vieja
 * deja de usarse sola. Revisión 0 = nunca se publicó → tablas null (contenido de ejemplo).
 */
function handleGetSitio_() {
  var rev = revisionesActuales_().sitio;
  if (!rev) return jsonOut_({ ok: true, tablas: null, revision: 0 });

  var cache = null;
  var clave = 'sitio_' + rev;
  try {
    cache = CacheService.getScriptCache();
    var hit = cache.get(clave);
    if (hit) return jsonOut_({ ok: true, tablas: JSON.parse(hit), revision: rev });
  } catch (e) {
    cache = null;
  }

  var tablas = {};
  Object.keys(TABLAS_SITIO).forEach(function (k) {
    tablas[k] = leer_(TABLAS_SITIO[k]).filas.filter(filaConDatos_).map(limpiar_);
  });
  var texto = JSON.stringify(tablas);
  if (cache && texto.length < 95000) { try { cache.put(clave, texto, 21600); } catch (e) {} }
  return jsonOut_({ ok: true, tablas: tablas, revision: rev });
}

/** Una fila vale si tiene algún texto: las vacías (o solo con casillas sin marcar) se ignoran. */
function filaConDatos_(f) {
  return Object.keys(f).some(function (k) { return k !== '_fila' && typeof f[k] === 'string' && f[k] !== ''; });
}

/** Reemplaza el contenido de la web: cada pestaña queda exactamente con las filas recibidas. */
function handleGuardarSitio_(body) {
  requireEditor_(body);
  var tablas = body.tablas;
  if (!tablas || typeof tablas !== 'object') throw new Error('Faltan los datos de la web.');
  var listas = {};
  Object.keys(TABLAS_SITIO).forEach(function (k) {
    if (!(k in tablas)) return;
    if (!Array.isArray(tablas[k])) throw new Error('Datos inválidos en ' + k + '.');
    if (tablas[k].length > 500) throw new Error('Demasiadas filas en ' + k + '.');
    var nombre = TABLAS_SITIO[k];
    listas[nombre] = tablas[k].map(function (f) { return normalizarFila_(nombre, f || {}); });
  });
  conLock_(['sitio'], function () {
    Object.keys(listas).forEach(function (nombre) { reemplazar_(nombre, listas[nombre]); });
  });
  return jsonOut_({ ok: true });
}

/** Objeto con las columnas de la pestaña y sus tipos (casilla, número o texto). */
function normalizarFila_(nombre, f) {
  var o = {};
  ENCABEZADOS[nombre].forEach(function (c) {
    if (CASILLAS.indexOf(c) !== -1) o[c] = esActivo_(f[c]);
    else if (NUMERICAS.indexOf(c) !== -1) o[c] = Number(String(f[c] == null ? '' : f[c]).replace(',', '.')) || 0;
    else o[c] = texto_(f[c], 5000);
  });
  return o;
}

// ---------- Contrataciones ----------

/** Formulario público de la web: sin usuario, con honeypot y límite por minuto. */
function handleEnviarContratacion_(body) {
  var d = body.datos || {};
  if (d.web) return jsonOut_({ ok: true }); // honeypot: los bots rellenan el campo oculto
  var fila = {
    id: nuevoId_(),
    recibido: new Date().toISOString(),
    nombre: sinFormula_(texto_(d.nombre, 120)),
    contacto: sinFormula_(texto_(d.contacto, 120)),
    fechaEvento: texto_(d.fechaEvento, 10),
    ciudad: sinFormula_(texto_(d.ciudad, 120)),
    evento: sinFormula_(texto_(d.evento, 160)),
    mensaje: sinFormula_(texto_(d.mensaje, 2000)),
    estado: 'Nuevo'
  };
  if (!fila.nombre || !fila.contacto) throw new Error('Nombre y contacto son obligatorios.');
  if (fila.fechaEvento && !fechaValida_(fila.fechaEvento)) fila.fechaEvento = '';

  var cache = CacheService.getScriptCache();
  var n = Number(cache.get('contrataciones_minuto') || 0);
  if (n > 20) throw new Error('Demasiadas solicitudes, inténtalo en unos minutos.');
  cache.put('contrataciones_minuto', String(n + 1), 60);

  conLock_(['contrataciones'], function () { agregar_('Contrataciones', fila); });

  var email = leerConfig_().emailAvisos;
  if (email) {
    try {
      MailApp.sendEmail({
        to: email,
        subject: 'Nueva solicitud de contratación: ' + fila.nombre,
        body: [
          'Nombre: ' + fila.nombre,
          'Contacto: ' + fila.contacto,
          'Fecha: ' + (fila.fechaEvento || '-'),
          'Ciudad: ' + (fila.ciudad || '-'),
          'Evento: ' + (fila.evento || '-'),
          '',
          fila.mensaje
        ].join('\n')
      });
    } catch (e) {
      // Sin aviso por email la solicitud igual queda guardada.
    }
  }
  return jsonOut_({ ok: true });
}

function handleListContrataciones_(body) {
  requireAuth_(body);
  var lista = leer_('Contrataciones').filas.filter(function (c) { return c.id; }).map(limpiar_);
  // Más recientes primero.
  lista.sort(function (a, b) { return String(b.recibido).localeCompare(String(a.recibido)); });
  return jsonOut_({ ok: true, contrataciones: lista });
}

function handleCambiarEstadoContratacion_(body) {
  requireEditor_(body);
  var estado = String(body.estado || '');
  if (ESTADOS_CONTRATACION.indexOf(estado) === -1) throw new Error('Estado no válido.');
  conLock_(['contrataciones'], function () {
    var c = buscar_(leer_('Contrataciones'), 'id', String(body.id || ''));
    if (!c) throw new Error('La solicitud ya no existe.');
    c.estado = estado;
    escribir_('Contrataciones', c);
  });
  return jsonOut_({ ok: true });
}

function handleBorrarContratacion_(body) {
  requireAdmin_(body);
  conLock_(['contrataciones'], function () {
    var c = buscar_(leer_('Contrataciones'), 'id', String(body.id || ''));
    if (!c) throw new Error('La solicitud ya no existe.');
    borrarFila_(hoja_('Contrataciones'), c._fila);
  });
  return jsonOut_({ ok: true });
}

// ---------- Archivos (Google Drive) ----------

function handleListArchivos_(body) {
  requireAuth_(body);
  var lista = leer_('Archivos').filas.filter(function (a) { return a.id; }).map(limpiar_);
  lista.sort(function (a, b) { return String(b.fecha).localeCompare(String(a.fecha)); });
  return jsonOut_({ ok: true, archivos: lista });
}

/** Sube un archivo a raíz/<tipo> y devuelve la URL pública para usarla en la web. */
function handleSubirArchivo_(body) {
  var user = requireEditor_(body);
  var nombre = texto_(body.nombre, 150).replace(/[\\/]/g, '-') || 'archivo';
  var mime = texto_(body.mime, 100) || 'application/octet-stream';
  var bytes = Utilities.base64Decode(String(body.base64 || ''));
  if (!bytes.length) throw new Error('El archivo está vacío.');
  if (bytes.length > MAX_ARCHIVO_BYTES) throw new Error('El archivo supera los 20 MB.');

  var tipo = mime.indexOf('image/') === 0 ? 'Imagenes'
    : mime.indexOf('audio/') === 0 ? 'Audio'
    : mime.indexOf('video/') === 0 ? 'Video' : 'Documentos';

  // Drive se escribe fuera del lock (puede tardar); la fila, dentro.
  var archivo = hijaPorNombre_(carpetaRaiz_(), tipo).createFile(Utilities.newBlob(bytes, mime, nombre));
  try {
    archivo.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  } catch (e) {
    // Algunas cuentas de Workspace no permiten compartir por enlace: el archivo queda privado y la web no lo verá.
  }
  var driveId = archivo.getId();
  var url = tipo === 'Imagenes'
    ? 'https://lh3.googleusercontent.com/d/' + driveId
    : 'https://drive.google.com/uc?export=download&id=' + driveId;

  conLock_(['archivos'], function () {
    agregar_('Archivos', {
      id: nuevoId_(), driveId: driveId, nombre: nombre, mime: mime, bytes: bytes.length,
      url: url, subidoPor: user.usuario, fecha: new Date().toISOString()
    });
  });
  return jsonOut_({ ok: true, driveId: driveId, url: url });
}

/**
 * Público: sirve en trozos un archivo subido desde el /admin (audio, video, PDF).
 * Drive no deja usar sus enlaces como fuente de <audio>/<video> desde otra web, así
 * que la web pide los trozos aquí y los reensambla en el navegador.
 * Solo sirve archivos registrados en la pestaña Archivos (nunca otros de tu Drive).
 */
function handleGetArchivo_(body) {
  var id = String(body.driveId || '').replace(/[^A-Za-z0-9_-]/g, '');
  var reg = buscar_(leer_('Archivos'), 'driveId', id);
  if (!reg || String(reg.mime).indexOf('image/') === 0) throw new Error('Archivo no disponible.');

  var bytes = DriveApp.getFileById(id).getBlob().getBytes();
  var partes = Math.max(1, Math.ceil(bytes.length / TROZO_BYTES));
  var parte = Math.floor(Number(body.parte)) || 0;
  if (parte < 0 || parte >= partes) throw new Error('Trozo fuera de rango.');

  var trozo = bytes.slice(parte * TROZO_BYTES, (parte + 1) * TROZO_BYTES);
  return jsonOut_({
    ok: true, mime: String(reg.mime), bytes: bytes.length, parte: parte, partes: partes,
    base64: Utilities.base64Encode(trozo)
  });
}

/** Carpeta raíz de la app (la crea `instalar`). */
function carpetaRaiz_() {
  var id = leerConfig_().carpetaDriveId;
  if (id) {
    try {
      return DriveApp.getFolderById(id);
    } catch (e) {
      throw new Error('No se encuentra la carpeta de archivos en Drive. Ejecuta "instalar" de nuevo.');
    }
  }
  throw new Error('Falta la carpeta de archivos en Drive. Ejecuta "instalar".');
}

function hijaPorNombre_(padre, nombre) {
  var it = padre.getFoldersByName(nombre);
  return it.hasNext() ? it.next() : padre.createFolder(nombre);
}

// ---------- Configuración ----------
// Pestaña Config (privada): carpetaDriveId y emailAvisos (se edita a mano en la hoja).

function leerConfig_() {
  var cfg = {};
  leer_('Config').filas.forEach(function (r) { if (r.clave) cfg[r.clave] = r.valor; });
  return cfg;
}

function guardarConfig_(clave, valor) {
  var t = leer_('Config');
  var fila = buscar_(t, 'clave', clave);
  if (fila) {
    fila.valor = valor;
    escribir_('Config', fila);
  } else {
    agregar_('Config', { clave: clave, valor: valor });
  }
}

// ---------- Instalación ----------

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('djnova')
    .addItem('Instalar / reparar hoja', 'instalar')
    .addItem('Publicar cambios hechos a mano', 'publicarCambiosManuales')
    .addToUi();
}

/**
 * Crea las pestañas y encabezados que falten, formatos, validaciones, la
 * carpeta de Drive y un admin si no hay ninguno.
 * Es idempotente: se puede ejecutar varias veces sin pisar datos.
 */
function instalar() {
  var ss = getSpreadsheet_(true);
  var creadas = [];

  Object.keys(ENCABEZADOS).forEach(function (nombre) {
    var sheet = ss.getSheetByName(nombre);
    if (!sheet) {
      var primera = ss.getSheets()[0];
      var vacia = ss.getSheets().length === 1 && primera.getLastRow() === 0 && primera.getName() !== nombre;
      sheet = vacia ? primera.setName(nombre) : ss.insertSheet(nombre);
      creadas.push(nombre);
    }
    var cols = ENCABEZADOS[nombre];
    sheet.getRange(1, 1, 1, cols.length).setValues([cols]).setFontWeight('bold').setBackground('#ede7f6');
    sheet.setFrozenRows(1);
    // Texto plano salvo números y casillas: así Sheets no convierte fechas ni textos como "0012".
    cols.forEach(function (c, i) {
      if (NUMERICAS.indexOf(c) === -1 && CASILLAS.indexOf(c) === -1) {
        sheet.getRange(2, i + 1, sheet.getMaxRows() - 1, 1).setNumberFormat('@');
      }
    });
  });

  aplicarValidaciones_(ss);
  var mensaje = creadas.length ? 'Pestañas creadas: ' + creadas.join(', ') + '. ' : 'Las pestañas ya existían. ';

  var cfg = leerConfig_();
  if (!('emailAvisos' in cfg)) {
    guardarConfig_('emailAvisos', '');
    mensaje += 'Para recibir un email con cada contratación, pon tu email en Config > emailAvisos. ';
  }
  var carpetaOk = false;
  if (cfg.carpetaDriveId) {
    try { DriveApp.getFolderById(cfg.carpetaDriveId); carpetaOk = true; } catch (e) {}
  }
  if (!carpetaOk) {
    var carpeta = DriveApp.createFolder(CARPETA_RAIZ);
    ['Imagenes', 'Audio', 'Video', 'Documentos'].forEach(function (t) { hijaPorNombre_(carpeta, t); });
    guardarConfig_('carpetaDriveId', carpeta.getId());
    mensaje += 'Carpeta de Drive creada: ' + carpeta.getUrl() + ' . ';
  }

  if (contarAdminsActivos_() === 0) {
    var password = Utilities.getUuid().replace(/-/g, '').slice(0, 10);
    agregar_('Usuarios', { usuario: 'ADMIN', password: password, rol: 'admin', activo: true, nombre: 'Administrador' });
    mensaje += 'Admin inicial: usuario ADMIN, contraseña ' + password +
      ' (también está en la pestaña Usuarios; cámbiala al entrar). ';
  }

  if (!revisionesActuales_().sitio) {
    mensaje += 'La web muestra contenido de ejemplo hasta el primer «Guardar y publicar» del /admin. ';
  }

  mensaje += 'Hoja: ' + ss.getUrl();
  Logger.log(mensaje);
  try { ss.toast(mensaje, 'djnova', 30); } catch (e) {}
  return mensaje;
}

/**
 * Lo que se edita a mano en la hoja no sube las revisiones: este menú las sube
 * para que la web y el /admin lo vean ya (y no a las 6 h, cuando vence la caché).
 */
function publicarCambiosManuales() {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    bumpRevisiones_(['sitio', 'contrataciones', 'usuarios', 'archivos', 'config']);
    invalidarAuth_();
  } finally {
    lock.releaseLock();
  }
  try { SpreadsheetApp.getActiveSpreadsheet().toast('Cambios publicados en la web.', 'djnova', 10); } catch (e) {}
}

/** Listas desplegables y casillas para que editar a mano la hoja no rompa valores. */
function aplicarValidaciones_(ss) {
  var lista = function (valores) {
    return SpreadsheetApp.newDataValidation().requireValueInList(valores, true).setAllowInvalid(false).build();
  };
  var casilla = SpreadsheetApp.newDataValidation().requireCheckbox().build();
  var filas = 1000;
  var poner = function (hoja, col, regla) {
    ss.getSheetByName(hoja).getRange(2, ENCABEZADOS[hoja].indexOf(col) + 1, filas, 1).setDataValidation(regla);
  };
  Object.keys(ENCABEZADOS).forEach(function (h) {
    CASILLAS.forEach(function (c) { if (ENCABEZADOS[h].indexOf(c) !== -1) poner(h, c, casilla); });
  });
  poner('Usuarios', 'rol', lista(ROLES));
  poner('Contrataciones', 'estado', lista(ESTADOS_CONTRATACION));
}

// ---------- Acceso a la hoja ----------
// Cada pestaña se lee como objetos con las claves de ENCABEZADOS (más `_fila`,
// el número de fila 1-based) y se escribe con el mismo orden de columnas.

/** Hoja de cálculo y pestañas ya abiertas en esta ejecución: abrirlas en cada acceso cuesta cientos de milisegundos. */
var SS_ = null;
var HOJAS_ = {};

function getSpreadsheet_(crear) {
  if (SS_) return SS_;
  var ss = abrirSpreadsheet_(crear);
  SS_ = ss;
  return ss;
}

function abrirSpreadsheet_(crear) {
  var activa = SpreadsheetApp.getActiveSpreadsheet();
  if (activa) return activa;
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SPREADSHEET_ID');
  if (id) {
    try {
      return SpreadsheetApp.openById(id);
    } catch (e) {
      throw new Error('No se pudo abrir la hoja (SPREADSHEET_ID). Revisa el ID y los permisos.');
    }
  }
  if (!crear) throw new Error('El backend no está configurado: ejecuta la función "instalar" una vez.');
  var ss = SpreadsheetApp.create('djnova');
  props.setProperty('SPREADSHEET_ID', ss.getId());
  Logger.log('Hoja creada: ' + ss.getUrl());
  return ss;
}

function hoja_(nombre) {
  if (HOJAS_[nombre]) return HOJAS_[nombre];
  var sheet = getSpreadsheet_(false).getSheetByName(nombre);
  if (!sheet) throw new Error('No existe la pestaña "' + nombre + '" en la hoja de cálculo. Ejecuta "instalar".');
  HOJAS_[nombre] = sheet;
  return sheet;
}

function leer_(nombre) {
  var sheet = hoja_(nombre);
  var cols = ENCABEZADOS[nombre];
  var rows = sheet.getDataRange().getValues();
  var filas = [];
  for (var i = 1; i < rows.length; i++) {
    var o = { _fila: i + 1 };
    for (var j = 0; j < cols.length; j++) o[cols[j]] = valorCelda_(cols[j], rows[i][j], nombre);
    filas.push(o);
  }
  return { sheet: sheet, filas: filas };
}

function valorCelda_(col, v, hoja) {
  if (CASILLAS.indexOf(col) !== -1) return esActivo_(v);
  if (NUMERICAS.indexOf(col) !== -1) return Number(v) || 0;
  if (v instanceof Date) {
    // Si Sheets convirtió una celda en fecha: las de solo día vuelven a 'yyyy-MM-dd', el resto a ISO.
    // 'fecha' es un día en la Agenda, pero un instante en Archivos.
    var esDia = FECHAS_DIA.indexOf(col) !== -1 || (col === 'fecha' && hoja === 'Agenda');
    return esDia ? Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd') : v.toISOString();
  }
  return String(v == null ? '' : v).trim();
}

function aFila_(nombre, obj) {
  return ENCABEZADOS[nombre].map(function (c) {
    var v = obj[c];
    if (CASILLAS.indexOf(c) !== -1) return v === true;
    if (NUMERICAS.indexOf(c) !== -1) return Number(v) || 0;
    return v == null ? '' : String(v);
  });
}

function agregar_(nombre, obj) {
  hoja_(nombre).appendRow(aFila_(nombre, obj));
}

function escribir_(nombre, obj) {
  var fila = aFila_(nombre, obj);
  hoja_(nombre).getRange(obj._fila, 1, 1, fila.length).setValues([fila]);
}

/**
 * Deja la pestaña con exactamente estas filas (para el contenido de la web, que
 * se guarda entero). Solo borra valores: conserva formatos, casillas y listas.
 */
function reemplazar_(nombre, objs) {
  var sheet = hoja_(nombre);
  var cols = ENCABEZADOS[nombre].length;
  var ultima = sheet.getLastRow();
  if (ultima > 1) sheet.getRange(2, 1, ultima - 1, cols).clearContent();
  if (!objs.length) return;
  var faltan = objs.length + 1 - sheet.getMaxRows();
  if (faltan > 0) sheet.insertRowsAfter(sheet.getMaxRows(), faltan);
  sheet.getRange(2, 1, objs.length, cols).setValues(objs.map(function (o) { return aFila_(nombre, o); }));
}

function buscar_(tabla, col, valor) {
  var v = String(valor || '');
  if (!v) return null;
  for (var i = 0; i < tabla.filas.length; i++) {
    if (tabla.filas[i][col] === v) return tabla.filas[i];
  }
  return null;
}

/**
 * Borra una fila. Sheets no deja eliminar todas las filas no inmovilizadas:
 * si solo queda una fila de datos, se agrega una vacía antes de borrar.
 */
function borrarFila_(sheet, fila) {
  if (sheet.getMaxRows() - sheet.getFrozenRows() <= 1) sheet.insertRowAfter(sheet.getMaxRows());
  sheet.deleteRow(fila);
}

/** Copia sin `_fila`, para mandar al frontend. */
function limpiar_(o) {
  var x = {};
  Object.keys(o).forEach(function (k) { if (k !== '_fila') x[k] = o[k]; });
  return x;
}

// ---------- Normalización ----------

function nuevoId_() { return Utilities.getUuid().replace(/-/g, '').slice(0, 12); }

function texto_(v, max) { return String(v == null ? '' : v).trim().slice(0, max); }

/** Lo que escribe un visitante no puede empezar como fórmula (=, +, -, @). */
function sinFormula_(s) { return /^[=+\-@]/.test(s) ? "'" + s : s; }

function fechaValida_(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  var p = s.split('-');
  var d = new Date(Date.UTC(Number(p[0]), Number(p[1]) - 1, Number(p[2])));
  return d.toISOString().slice(0, 10) === s;
}

function normalizarRol_(valor) {
  var r = String(valor || '').trim().toLowerCase();
  return ROLES.indexOf(r) === -1 ? 'consulta' : r;
}

/** Acepta TRUE, SI, SÍ, X o 1 (casilla de verificación) como verdadero. */
function esActivo_(valor) {
  if (valor === true) return true;
  if (valor === false) return false;
  var t = String(valor).trim().toUpperCase().replace('Í', 'I');
  return t === 'TRUE' || t === 'SI' || t === 'X' || t === '1' || t === 'VERDADERO';
}

function jsonOut_(obj) {
  // Tras una escritura que salió bien se devuelven los contadores ya incrementados: el frontend refresca sin pedirlos antes.
  if (ADJUNTAR_REVISIONES_ && obj && obj.ok === true && !obj.revisiones) obj.revisiones = revisionesActuales_();
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
