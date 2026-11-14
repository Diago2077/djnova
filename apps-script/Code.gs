/**
 * djnova — API sobre Google Sheets (Google Apps Script).
 *
 * Pestañas que gestiona:
 *   ajustes        (clave | valor)       → textos, colores, enlaces…
 *   secciones, numeros, paises, barras, agenda, videos, galeria, redes, beneficios
 *                                         → una fila por elemento (públicas)
 *   contrataciones                        → solicitudes del formulario (solo /admin)
 *   usuarios                              → cuentas del /admin (contraseñas cifradas)
 *
 * Roles:
 *   admin   → todo, incluida la gestión de usuarios
 *   editor  → contenido y contrataciones; solo cambia su propia contraseña
 *
 * Propiedades del script (Configuración del proyecto → Propiedades del script):
 *   ADMIN_EMAIL      email del primer administrador
 *   ADMIN_PASSWORD   contraseña inicial (mín. 8). Al primer login se crea la cuenta
 *                    en la pestaña usuarios y esta propiedad se borra sola.
 *   NOTIFY_EMAIL     (opcional) email que recibe aviso de cada contratación
 *   DRIVE_FOLDER_ID  (opcional) carpeta de Drive para archivos; se crea sola si falta
 *
 * Instalación: ver docs/BACKEND.md
 */

var TABLAS_PUBLICAS = ['ajustes', 'secciones', 'numeros', 'paises', 'barras', 'agenda', 'videos', 'galeria', 'redes', 'beneficios'];
var HOJA_CONTRATACIONES = 'contrataciones';
var COLS_CONTRATACIONES = ['recibido', 'nombre', 'contacto', 'fechaEvento', 'ciudad', 'evento', 'mensaje', 'estado'];
var HOJA_USUARIOS = 'usuarios';
var COLS_USUARIOS = ['id', 'nombre', 'email', 'rol', 'activo', 'hash', 'salt', 'ver', 'creado', 'ultimoAcceso'];
var ROLES = ['admin', 'editor'];
var LARGO_MINIMO_PASSWORD = 8;
var CACHE_CONFIG = 'config_v1';
var CACHE_USUARIOS = 'usuarios_v1';
var SESION_SEGUNDOS = 6 * 60 * 60;

// ------------------------------------------------------------------ HTTP

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'config';
  try {
    if (action === 'config') return json({ tablas: leerConfig() });
    return json({ error: 'Acción desconocida' });
  } catch (err) {
    return json({ error: String(err.message || err) });
  }
}

function doPost(e) {
  var b;
  try {
    b = JSON.parse(e.postData.contents);
  } catch (err) {
    return json({ error: 'Petición inválida' });
  }
  try {
    return json(despachar(b));
  } catch (err) {
    return json({ error: String(err.message || err), code: err.code || undefined });
  }
}

function despachar(b) {
  switch (b.action) {
    // Públicas
    case 'booking':
      guardarContratacion(b.data || {});
      return { ok: true };

    // Sesión
    case 'login':
      return login(b.email, b.password);
    case 'me':
      return { perfil: perfilPublico(exigeUsuario(b.token)) };
    case 'logout':
      CacheService.getScriptCache().remove('ses_' + b.token);
      return { ok: true };
    case 'miPassword':
      cambiarMiPassword(exigeUsuario(b.token), b.actual, b.nueva);
      return { ok: true };

    // Contenido y contrataciones (admin y editor)
    case 'save':
      exigeUsuario(b.token);
      guardarConfig(b.tablas);
      return { ok: true };
    case 'upload':
      exigeUsuario(b.token);
      return { url: subirArchivo(b.name, b.mime, b.base64) };
    case 'bookings':
      exigeUsuario(b.token);
      return { items: listarContrataciones() };
    case 'bookingStatus':
      exigeUsuario(b.token);
      cambiarEstado(Number(b.fila), String(b.estado || ''));
      return { ok: true };

    // Gestión de usuarios (solo admin)
    case 'usuarios':
      exigeAdmin(b.token);
      return { items: leerUsuarios().map(perfilPublico) };
    case 'usuarioCrear':
      return { id: crearUsuario(exigeAdmin(b.token), b) };
    case 'usuarioEditar':
      editarUsuario(exigeAdmin(b.token), b);
      return { ok: true };
    case 'usuarioActivo':
      activarUsuario(exigeAdmin(b.token), b.id, !!b.activo);
      return { ok: true };
    case 'usuarioPassword':
      passwordDeUsuario(exigeAdmin(b.token), b.id, b.password);
      return { ok: true };
    case 'usuarioEliminar':
      eliminarUsuario(exigeAdmin(b.token), b.id);
      return { ok: true };

    default:
      throw new Error('Acción desconocida');
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function fallo(msg, code) {
  var e = new Error(msg);
  if (code) e.code = code;
  return e;
}

// ------------------------------------------------------------------ Usuarios: almacenamiento

function hojaUsuarios() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_USUARIOS);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA_USUARIOS);
    hoja.getRange(1, 1, 1, COLS_USUARIOS.length).setValues([COLS_USUARIOS]).setFontWeight('bold');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function leerUsuarios() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get(CACHE_USUARIOS);
  if (hit) return JSON.parse(hit);

  var valores = hojaUsuarios().getDataRange().getDisplayValues();
  var cols = valores[0];
  var lista = [];
  for (var i = 1; i < valores.length; i++) {
    var u = {};
    for (var j = 0; j < cols.length; j++) u[cols[j]] = valores[i][j];
    if (!u.id || !u.email) continue;
    u.activo = /^(true|verdadero|1|si|sí)$/i.test(String(u.activo));
    u.ver = Number(u.ver || 1);
    lista.push(u);
  }
  cache.put(CACHE_USUARIOS, JSON.stringify(lista), 21600);
  return lista;
}

function escribirUsuarios(lista) {
  var hoja = hojaUsuarios();
  var datos = [COLS_USUARIOS].concat(lista.map(function (u) {
    return COLS_USUARIOS.map(function (c) { return u[c] == null ? '' : String(u[c]); });
  }));
  hoja.clearContents();
  var rango = hoja.getRange(1, 1, datos.length, COLS_USUARIOS.length);
  rango.setNumberFormat('@');
  rango.setValues(datos);
  hoja.getRange(1, 1, 1, COLS_USUARIOS.length).setFontWeight('bold');
  CacheService.getScriptCache().remove(CACHE_USUARIOS);
}

/** Lee, modifica y guarda la lista de usuarios bajo bloqueo. */
function conUsuarios(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    CacheService.getScriptCache().remove(CACHE_USUARIOS);
    var lista = leerUsuarios();
    var r = fn(lista);
    escribirUsuarios(lista);
    return r;
  } finally {
    lock.releaseLock();
  }
}

function perfilPublico(u) {
  return { id: u.id, nombre: u.nombre, email: u.email, rol: u.rol, activo: !!u.activo, creado: u.creado, ultimoAcceso: u.ultimoAcceso };
}

function normEmail(e) {
  return String(e || '').trim().toLowerCase();
}

function validarEmail(e) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw fallo('Email inválido.');
}

function validarPassword(p) {
  if (String(p || '').length < LARGO_MINIMO_PASSWORD) {
    throw fallo('La contraseña necesita al menos ' + LARGO_MINIMO_PASSWORD + ' caracteres.');
  }
}

function adminsActivos(lista) {
  return lista.filter(function (u) { return u.rol === 'admin' && u.activo; }).length;
}

// ------------------------------------------------------------------ Usuarios: contraseñas

function hashPassword(password, salt) {
  var key = Utilities.newBlob(salt).getBytes();
  var h = Utilities.computeHmacSha256Signature(Utilities.newBlob(String(password)).getBytes(), key);
  for (var i = 0; i < 400; i++) h = Utilities.computeHmacSha256Signature(h, key);
  return Utilities.base64Encode(h);
}

function nuevoSalt() {
  return Utilities.getUuid().replace(/-/g, '');
}

function igualSeguro(a, b) {
  if (a.length !== b.length) return false;
  var r = 0;
  for (var i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// ------------------------------------------------------------------ Sesión

function login(email, password) {
  email = normEmail(email);
  password = String(password || '');
  var cache = CacheService.getScriptCache();
  var claveFallos = 'lf_' + email;
  var fallos = Number(cache.get(claveFallos) || 0);
  if (fallos >= 5) throw fallo('Demasiados intentos. Espera 10 minutos.');

  var lista = leerUsuarios();
  if (!lista.length) bootstrapAdmin(email, password);
  lista = leerUsuarios();

  var u = null;
  for (var i = 0; i < lista.length; i++) if (lista[i].email === email) u = lista[i];

  // Mismo mensaje exista o no el email: no se filtra quién tiene cuenta.
  if (!u || !igualSeguro(hashPassword(password, u.salt), u.hash)) {
    cache.put(claveFallos, String(fallos + 1), 600);
    Utilities.sleep(600);
    throw fallo('Email o contraseña incorrectos.');
  }
  if (!u.activo) throw fallo('Tu usuario está desactivado. Contacta al administrador.');

  cache.remove(claveFallos);
  var token = Utilities.getUuid() + Utilities.getUuid();
  cache.put('ses_' + token, JSON.stringify({ id: u.id, ver: u.ver }), SESION_SEGUNDOS);

  conUsuarios(function (l) {
    l.forEach(function (x) { if (x.id === u.id) x.ultimoAcceso = new Date().toISOString(); });
  });
  return { token: token, perfil: perfilPublico(u) };
}

/** Primer arranque: crea el admin inicial a partir de las propiedades del script. */
function bootstrapAdmin(email, password) {
  var props = PropertiesService.getScriptProperties();
  var adminEmail = normEmail(props.getProperty('ADMIN_EMAIL'));
  var adminPass = props.getProperty('ADMIN_PASSWORD') || '';
  if (!adminEmail || !adminPass) {
    throw fallo('Todavía no hay usuarios. Configura ADMIN_EMAIL y ADMIN_PASSWORD en las propiedades del script.');
  }
  if (email !== adminEmail || password !== adminPass) return;
  validarPassword(adminPass);
  conUsuarios(function (lista) {
    if (lista.length) return;
    var salt = nuevoSalt();
    lista.push({
      id: Utilities.getUuid(),
      nombre: 'Administrador',
      email: adminEmail,
      rol: 'admin',
      activo: true,
      hash: hashPassword(adminPass, salt),
      salt: salt,
      ver: 1,
      creado: new Date().toISOString(),
      ultimoAcceso: '',
    });
  });
  props.deleteProperty('ADMIN_PASSWORD');
}

/** Valida el token, que el usuario siga existiendo y activo, y renueva la sesión. */
function exigeUsuario(token) {
  if (!token) throw fallo('Sesión caducada. Vuelve a entrar.', 'AUTH');
  var cache = CacheService.getScriptCache();
  var raw = cache.get('ses_' + token);
  if (!raw) throw fallo('Sesión caducada. Vuelve a entrar.', 'AUTH');
  var ses = JSON.parse(raw);
  var u = null;
  leerUsuarios().forEach(function (x) { if (x.id === ses.id) u = x; });
  // ver cambia al cambiar la contraseña: invalida las sesiones abiertas.
  if (!u || !u.activo || Number(u.ver) !== Number(ses.ver)) {
    cache.remove('ses_' + token);
    throw fallo('Sesión caducada. Vuelve a entrar.', 'AUTH');
  }
  cache.put('ses_' + token, raw, SESION_SEGUNDOS);
  return u;
}

function exigeAdmin(token) {
  var u = exigeUsuario(token);
  if (u.rol !== 'admin') throw fallo('No tienes permiso para esta operación.');
  return u;
}

function cambiarMiPassword(actor, actual, nueva) {
  if (!igualSeguro(hashPassword(String(actual || ''), actor.salt), actor.hash)) {
    throw fallo('La contraseña actual no es correcta.');
  }
  validarPassword(nueva);
  conUsuarios(function (lista) {
    lista.forEach(function (u) {
      if (u.id !== actor.id) return;
      u.salt = nuevoSalt();
      u.hash = hashPassword(nueva, u.salt);
      u.ver = Number(u.ver) + 1;
    });
  });
}

// ------------------------------------------------------------------ Usuarios: gestión (admin)

function buscar(lista, id) {
  for (var i = 0; i < lista.length; i++) if (lista[i].id === id) return lista[i];
  throw fallo('Usuario no encontrado.');
}

function crearUsuario(actor, b) {
  var nombre = String(b.nombre || '').trim().slice(0, 80);
  var email = normEmail(b.email);
  var rol = ROLES.indexOf(b.rol) >= 0 ? b.rol : 'editor';
  if (!nombre) throw fallo('Falta el nombre.');
  validarEmail(email);
  validarPassword(b.password);
  return conUsuarios(function (lista) {
    if (lista.some(function (u) { return u.email === email; })) throw fallo('Ya existe un usuario con ese email.');
    var salt = nuevoSalt();
    var id = Utilities.getUuid();
    lista.push({
      id: id, nombre: nombre, email: email, rol: rol, activo: true,
      hash: hashPassword(b.password, salt), salt: salt, ver: 1,
      creado: new Date().toISOString(), ultimoAcceso: '',
    });
    return id;
  });
}

function editarUsuario(actor, b) {
  var nombre = String(b.nombre || '').trim().slice(0, 80);
  var email = normEmail(b.email);
  var rol = ROLES.indexOf(b.rol) >= 0 ? b.rol : 'editor';
  if (!nombre) throw fallo('Falta el nombre.');
  validarEmail(email);
  conUsuarios(function (lista) {
    var u = buscar(lista, b.id);
    if (lista.some(function (x) { return x.email === email && x.id !== u.id; })) {
      throw fallo('Ya existe un usuario con ese email.');
    }
    if (u.rol === 'admin' && rol !== 'admin' && u.activo && adminsActivos(lista) <= 1) {
      throw fallo('Tiene que quedar al menos un administrador activo.');
    }
    if (u.id === actor.id && rol !== 'admin') throw fallo('No puedes quitarte tu propio rol de administrador.');
    u.nombre = nombre;
    u.email = email;
    u.rol = rol;
  });
}

function activarUsuario(actor, id, activo) {
  if (id === actor.id && !activo) throw fallo('No puedes desactivar tu propia cuenta.');
  conUsuarios(function (lista) {
    var u = buscar(lista, id);
    if (!activo && u.rol === 'admin' && u.activo && adminsActivos(lista) <= 1) {
      throw fallo('Tiene que quedar al menos un administrador activo.');
    }
    u.activo = activo;
  });
}

function passwordDeUsuario(actor, id, password) {
  validarPassword(password);
  conUsuarios(function (lista) {
    var u = buscar(lista, id);
    u.salt = nuevoSalt();
    u.hash = hashPassword(password, u.salt);
    u.ver = Number(u.ver) + 1;
  });
}

function eliminarUsuario(actor, id) {
  if (id === actor.id) throw fallo('No puedes eliminar tu propia cuenta.');
  conUsuarios(function (lista) {
    var u = buscar(lista, id);
    if (u.rol === 'admin' && u.activo && adminsActivos(lista) <= 1) {
      throw fallo('Tiene que quedar al menos un administrador activo.');
    }
    lista.splice(lista.indexOf(u), 1);
  });
}

// ------------------------------------------------------------------ Configuración de la web

function leerConfig() {
  var cache = CacheService.getScriptCache();
  var hit = cache.get(CACHE_CONFIG);
  if (hit) return JSON.parse(hit);

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tablas = {};
  TABLAS_PUBLICAS.forEach(function (nombre) {
    var hoja = ss.getSheetByName(nombre);
    if (hoja) tablas[nombre] = leerHoja(hoja);
  });

  var texto = JSON.stringify(tablas);
  if (texto.length < 95000) cache.put(CACHE_CONFIG, texto, 21600);
  return tablas;
}

function leerHoja(hoja) {
  var valores = hoja.getDataRange().getDisplayValues();
  if (valores.length < 1) return [];
  var cols = valores[0].map(function (c) { return String(c).trim(); });
  var filas = [];
  for (var i = 1; i < valores.length; i++) {
    var fila = {};
    var vacia = true;
    for (var j = 0; j < cols.length; j++) {
      if (!cols[j]) continue;
      fila[cols[j]] = valores[i][j];
      if (valores[i][j] !== '') vacia = false;
    }
    if (!vacia) filas.push(fila);
  }
  return filas;
}

function guardarConfig(tablas) {
  if (!tablas || typeof tablas !== 'object') throw fallo('Datos inválidos');
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    Object.keys(tablas).forEach(function (nombre) {
      if (TABLAS_PUBLICAS.indexOf(nombre) === -1) return; // nunca toca usuarios ni contrataciones
      escribirHoja(ss, nombre, tablas[nombre] || []);
    });
    CacheService.getScriptCache().remove(CACHE_CONFIG);
  } finally {
    lock.releaseLock();
  }
}

function escribirHoja(ss, nombre, filas) {
  var hoja = ss.getSheetByName(nombre) || ss.insertSheet(nombre);
  var cols = [];
  filas.forEach(function (f) {
    Object.keys(f).forEach(function (k) { if (cols.indexOf(k) === -1) cols.push(k); });
  });
  if (!cols.length) {
    // Lista vacía: conserva la cabecera para que se pueda rellenar a mano.
    var cab = hoja.getLastColumn() > 0 ? hoja.getRange(1, 1, 1, hoja.getLastColumn()).getValues()[0] : [];
    hoja.clearContents();
    if (cab.length) hoja.getRange(1, 1, 1, cab.length).setValues([cab]);
    return;
  }
  var datos = [cols].concat(filas.map(function (f) {
    return cols.map(function (c) { return f[c] == null ? '' : String(f[c]); });
  }));
  hoja.clearContents();
  var rango = hoja.getRange(1, 1, datos.length, cols.length);
  rango.setNumberFormat('@'); // texto plano: evita que Sheets convierta fechas o números
  rango.setValues(datos);
  hoja.getRange(1, 1, 1, cols.length).setFontWeight('bold');
  hoja.setFrozenRows(1);
}

// ------------------------------------------------------------------ Archivos (Drive)

function carpeta() {
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('DRIVE_FOLDER_ID');
  if (id) {
    try { return DriveApp.getFolderById(id); } catch (e) { /* se recrea */ }
  }
  var f = DriveApp.createFolder('djnova - archivos subidos');
  props.setProperty('DRIVE_FOLDER_ID', f.getId());
  return f;
}

function subirArchivo(nombre, mime, base64) {
  if (!base64) throw fallo('Archivo vacío');
  var blob = Utilities.newBlob(Utilities.base64Decode(base64), mime || 'application/octet-stream', nombre || 'archivo');
  var file = carpeta().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  var id = file.getId();
  if (/^image\//.test(mime)) return 'https://lh3.googleusercontent.com/d/' + id;
  return 'https://drive.google.com/uc?export=download&id=' + id;
}

// ------------------------------------------------------------------ Contrataciones

function hojaContrataciones() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(HOJA_CONTRATACIONES);
  if (!hoja) {
    hoja = ss.insertSheet(HOJA_CONTRATACIONES);
    hoja.getRange(1, 1, 1, COLS_CONTRATACIONES.length).setValues([COLS_CONTRATACIONES]).setFontWeight('bold');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

function limpiar(v, max) {
  // Evita fórmulas inyectadas en la hoja (=, +, -, @ al inicio).
  var s = String(v == null ? '' : v).slice(0, max || 500).trim();
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function guardarContratacion(d) {
  if (d.web) return; // honeypot: los bots rellenan el campo oculto
  if (!d.nombre || !d.contacto) throw fallo('Nombre y contacto son obligatorios');

  var cache = CacheService.getScriptCache();
  var n = Number(cache.get('bookings_min') || 0);
  if (n > 20) throw fallo('Demasiadas solicitudes, inténtalo en unos minutos.');
  cache.put('bookings_min', String(n + 1), 60);

  var lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    var hoja = hojaContrataciones();
    var fila = [
      new Date().toISOString(),
      limpiar(d.nombre, 120),
      limpiar(d.contacto, 120),
      limpiar(d.fechaEvento, 20),
      limpiar(d.ciudad, 120),
      limpiar(d.evento, 160),
      limpiar(d.mensaje, 2000),
      'Nuevo',
    ];
    // Texto plano para que Sheets no reinterprete fechas.
    hoja.getRange(hoja.getLastRow() + 1, 1, 1, fila.length).setNumberFormat('@').setValues([fila]);
  } finally {
    lock.releaseLock();
  }

  var email = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL');
  if (email) {
    MailApp.sendEmail({
      to: email,
      subject: 'Nueva solicitud de contratación: ' + d.nombre,
      body: [
        'Nombre: ' + d.nombre,
        'Contacto: ' + d.contacto,
        'Fecha: ' + (d.fechaEvento || '-'),
        'Ciudad: ' + (d.ciudad || '-'),
        'Evento: ' + (d.evento || '-'),
        '',
        d.mensaje || '',
      ].join('\n'),
    });
  }
}

function listarContrataciones() {
  var valores = hojaContrataciones().getDataRange().getDisplayValues();
  var cols = valores[0];
  var items = [];
  for (var i = valores.length - 1; i >= 1; i--) {
    var it = { fila: i + 1 };
    for (var j = 0; j < cols.length; j++) it[cols[j]] = valores[i][j];
    items.push(it);
  }
  return items;
}

function cambiarEstado(fila, estado) {
  var hoja = hojaContrataciones();
  if (fila < 2 || fila > hoja.getLastRow()) throw fallo('Fila inválida');
  hoja.getRange(fila, COLS_CONTRATACIONES.indexOf('estado') + 1).setValue(limpiar(estado, 40));
}

// ------------------------------------------------------------------ Utilidades manuales

/** Ejecútala una vez desde el editor para autorizar permisos (Drive, Mail, Sheets). */
function autorizar() {
  carpeta();
  hojaContrataciones();
  hojaUsuarios();
  MailApp.getRemainingDailyQuota();
}

/** Si editas la hoja a mano, ejecútala para que la web y el admin vean los cambios al momento. */
function limpiarCache() {
  CacheService.getScriptCache().removeAll([CACHE_CONFIG, CACHE_USUARIOS]);
}

/** Activador simple: al editar la hoja a mano se limpia la caché automáticamente. */
function onEdit() {
  limpiarCache();
}
