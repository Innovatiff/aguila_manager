// ══════════════════════════════════════════════════════════
//  El Águila — Gerencia en el teléfono
//
//  La misma base de datos que el software de escritorio; esta app es la
//  vista de bolsillo de la gerente: panel, chat, viajes, pedidos y
//  permisos. Lo que exige pantalla grande —nómina, horario, reporte del
//  contador— se queda en el escritorio a propósito.
//
//  Sólo entra la gerencia: una cuenta con ficha en Colaboradores es del
//  portal del colaborador y se rechaza aquí.
// ══════════════════════════════════════════════════════════

firebase.initializeApp({
  apiKey: "AIzaSyDtOfZXPEP-k_gvvu3Lvt307mOLBWezMrw",
  authDomain: "domcub.firebaseapp.com",
  projectId: "domcub",
  storageBucket: "domcub.firebasestorage.app",
  messagingSenderId: "329163319008",
  appId: "1:329163319008:web:1c7d3e71252ec4f5641285",
  measurementId: "G-668H2W780D"
});
// Clave pública de notificaciones push (VAPID); la misma del resto.
const VAPID_KEY = "BDyHLK04-tsVFXfN8sIXgKgGmM0qZpYgoblgKqVLIWgH8J0oktFacUXlTIKt2nFQPMqPmzamcTt3S7zOkIRjB74";

const db   = firebase.firestore();
const auth = firebase.auth();

// ── Tiendas ──
const STORES = {
  '1': { name:'Tienda Despensas', short:'Despensas', color:'#b45309', soft:'#fef3c7' },
  '2': { name:'Tienda Cocina',    short:'Cocina',    color:'#0e7490', soft:'#cffafe' }
};
const STORE_IDS  = ['1','2'];
const storeName  = id => (STORES[id]||{}).name  || '—';
const storeShort = id => (STORES[id]||{}).short || '—';

// La tienda visible del panel; en teléfono se cambia con dos fichas
function tiendaActiva() {
  const v = localStorage.getItem('elaguila_store_m');
  return (v === '1' || v === '2') ? v : '1';
}
function setTienda(v) { localStorage.setItem('elaguila_store_m', v); }

// ── Fechas en español ──
const MESES  = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const MCORTO = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const DIAS   = ['domingo','lunes','martes','miércoles','jueves','viernes','sábado'];
const DCORTO = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

const toDateStr = d => { const x=new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`; };
const todayStr = () => toDateStr(new Date());
const parseD = v => v ? new Date(String(v).includes('T') ? v : v+'T00:00:00') : null;

function fDate(v)      { const d=parseD(v); return d&&!isNaN(d) ? `${d.getDate()} ${MCORTO[d.getMonth()]} ${d.getFullYear()}` : '—'; }
function fDateShort(v) { const d=parseD(v); return d&&!isNaN(d) ? `${d.getDate()} ${MCORTO[d.getMonth()]}` : '—'; }
function fDateLong(d)  { const x=new Date(d); return `${DIAS[x.getDay()]}, ${x.getDate()} de ${MESES[x.getMonth()]}`; }
function fTime(v) {
  if (!v) return '—';
  const d = v && v.toDate ? v.toDate() : new Date(v);
  if (isNaN(d)) return '—';
  let h = d.getHours(); const m = String(d.getMinutes()).padStart(2,'0');
  const s = h < 12 ? 'a. m.' : 'p. m.'; h = h % 12 || 12;
  return `${h}:${m} ${s}`;
}
function relTime(ts) {
  if (!ts) return '';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = (Date.now() - d.getTime())/1000;
  if (s < 60)     return 'ahora';
  if (s < 3600)   return `${Math.floor(s/60)} min`;
  if (s < 86400)  return fTime(d);
  if (s < 172800) return 'ayer';
  return fDateShort(toDateStr(d));
}

// Números en español; se agrupa a mano porque el CLDR no separa 4 cifras
function agrupaES(n, dec = 2) {
  const num = Number(n) || 0;
  const [ent, d] = Math.abs(num).toFixed(dec).split('.');
  const miles = ent.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (num < 0 ? '-' : '') + miles + (dec ? ',' + d : '');
}
const money = n => ((Number(n)||0) < 0 ? '-$' : '$') + agrupaES(Math.abs(Number(n)||0), 2);
const numES = (n, dec = 1) => agrupaES(n, dec);

function durLabel(min) {
  if (min == null) return '—';
  const h = Math.floor(min/60), m = min%60;
  return h ? `${h} h ${String(m).padStart(2,'0')} min` : `${m} min`;
}

const esc = s => String(s==null?'':s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

// ── Avatares ──
const AV = ['#4f46e5','#0891b2','#059669','#d97706','#dc2626','#7c3aed','#0284c7','#be185d'];
function avColor(n){ let h=0; for(const c of (n||'')) h=(h*31+c.charCodeAt(0))%AV.length; return AV[Math.abs(h)%AV.length]; }
function inits(n){ const p=(n||'').trim().split(' ');
  return (p.length>=2 ? p[0][0]+p[p.length-1][0] : (n||'?').slice(0,2)).toUpperCase(); }
function avatar(n, size) {
  const s = size||40;
  return `<div class="avatar" style="width:${s}px;height:${s}px;background:${avColor(n)};font-size:${Math.round(s*0.36)}px">${inits(n)}</div>`;
}

// ── Avisos ──
function toast(msg, kind) {
  let host = document.querySelector('.toasts');
  if (!host) { host=document.createElement('div'); host.className='toasts'; document.body.appendChild(host); }
  const ic = { ok:'checkmark-circle-outline', err:'alert-circle-outline', info:'information-circle-outline' }[kind||'info'];
  const el = document.createElement('div');
  el.className = 'toast ' + (kind||'info');
  el.innerHTML = `<ion-icon name="${ic}"></ion-icon><span>${esc(msg)}</span>`;
  host.appendChild(el);
  setTimeout(() => { el.style.opacity='0'; setTimeout(()=>el.remove(),300); }, 3200);
}

// ── Hoja inferior ──
function openSheet(html) {
  document.getElementById('sheetBody').innerHTML = html;
  document.getElementById('sheetBg').classList.add('on');
  document.getElementById('sheet').classList.add('on');
}
function closeSheet() {
  document.getElementById('sheetBg').classList.remove('on');
  document.getElementById('sheet').classList.remove('on');
}

// ══════════════════════════════════════════════════════════
//  Sesión — sólo gerencia
// ══════════════════════════════════════════════════════════
let ME = null;   // { uid, pid: 'mgr:...', name, email }

async function loadSession(user) {
  // Una cuenta con ficha en Colaboradores es del portal, no de aquí.
  const colab = await db.collection('Colaboradores').doc(user.uid).get();
  if (colab.exists) {
    throw new Error('Esta aplicación es de la gerencia. Entra con tu cuenta en el portal del colaborador.');
  }

  const ref = db.collection('Main').doc(user.uid);
  const doc = await ref.get();
  let p;
  if (doc.exists) p = doc.data();
  else {
    // Cuenta de gerencia creada directo en Firebase: se crea la ficha aquí
    p = { name: (user.email || '').split('@')[0], email: user.email, role: 'manager' };
    await ref.set({ ...p, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
  }

  ME = { uid: user.uid, pid: 'mgr:' + user.uid, name: p.name || user.email, email: user.email };

  // Identidad para las reglas del chat
  await db.collection('UserIndex').doc(user.uid).set({
    pid: ME.pid, name: ME.name, role: p.role || 'manager',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  return ME;
}

// ══════════════════════════════════════════════════════════
//  Datos
// ══════════════════════════════════════════════════════════
async function getEmployees() {
  const snap = await db.collection('Employees').get();
  return snap.docs.map(d => ({ id:d.id, ...d.data() }));
}
async function getJobs() {
  const snap = await db.collection('Jobs').get();
  return snap.docs.map(d => ({ id:d.id, ...d.data() }));
}
async function getOpenClockIns() {
  const snap = await db.collection('ClockIns').where('clockOut','==',null).get();
  return snap.docs.map(d => ({ id:d.id, ...d.data() }));
}
async function getClockInsHoy() {
  const snap = await db.collection('ClockIns').where('date','==',todayStr()).get();
  return snap.docs.map(d => ({ id:d.id, ...d.data() }));
}

// ── Permisos ──
async function getTimeOff() {
  const snap = await db.collection('TimeOff').get();
  return snap.docs.map(d => ({ id:d.id, ...d.data() }))
    .sort((a,b) => String(b.startDate||'').localeCompare(String(a.startDate||'')));
}
async function updateTimeOff(id, data) { await db.collection('TimeOff').doc(id).update(data); }

/**
 * Al aprobar un permiso, la persona sale sola del horario de esos días.
 * Copia exacta de la lógica del escritorio: mismo dato, mismo efecto.
 */
function lunesDe(fecha) {
  const d = fecha instanceof Date ? new Date(fecha) : parseD(fecha);
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return toDateStr(d);
}
async function quitarDelHorario(employeeId, desde, hasta) {
  const semanas = new Set();
  let d = parseD(desde);
  const fin = parseD(hasta);
  while (d <= fin) { semanas.add(lunesDe(d)); d = new Date(d); d.setDate(d.getDate()+7); }
  semanas.add(lunesDe(fin));

  let quitados = 0;
  for (const lunes of semanas) {
    for (const store of STORE_IDS) {
      const ref = db.collection('Horarios').doc(`${lunes}_${store}`);
      const doc = await ref.get();
      if (!doc.exists) continue;
      const shifts = doc.data().shifts || {};
      const mios = shifts[employeeId];
      if (!mios) continue;
      let cambio = false;
      for (const fecha of Object.keys(mios)) {
        if (fecha >= desde && fecha <= hasta) { delete mios[fecha]; cambio = true; quitados++; }
      }
      if (cambio) {
        if (!Object.keys(mios).length) delete shifts[employeeId];
        await ref.set({ ...doc.data(), shifts,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp() });
      }
    }
  }
  return quitados;
}

// ── Registros de viaje ──
const msDe = ts => ts && ts.toMillis ? ts.toMillis() : 0;

async function getRegistros(filtros) {
  let q = db.collection('Registros');
  if (filtros && filtros.store) q = q.where('store','==',filtros.store);
  const snap = await q.get();
  let rows = snap.docs.map(d => ({ id:d.id, ...d.data() }));
  if (filtros && filtros.desde) rows = rows.filter(r => r.date >= filtros.desde);
  if (filtros && filtros.hasta) rows = rows.filter(r => r.date <= filtros.hasta);
  return rows.sort((a,b) => String(b.date).localeCompare(String(a.date)) || msDe(b.horaSalida) - msDe(a.horaSalida));
}
async function cerrarViaje(id, kmLlegada, horaLlegada) {
  const doc = await db.collection('Registros').doc(id).get();
  if (!doc.exists) throw new Error('Ese viaje ya no existe');
  const r = doc.data();
  const km = Math.round((kmLlegada - r.kmSalida) * 10) / 10;
  const minutos = r.horaSalida && horaLlegada
    ? Math.max(0, Math.round((horaLlegada.toMillis() - r.horaSalida.toMillis()) / 60000)) : null;
  await db.collection('Registros').doc(id).update({
    kmLlegada, horaLlegada, km, minutos, status: 'completado' });
  return { km, minutos };
}

// ── Pedidos ──
async function getPedidos(store) {
  let q = db.collection('Pedidos');
  if (store) q = q.where('store','==',store);
  const snap = await q.get();
  return snap.docs.map(d => ({ id:d.id, ...d.data() }))
    .sort((a,b) => String(b.date||'').localeCompare(String(a.date||'')));
}
async function updatePedido(id, data) { await db.collection('Pedidos').doc(id).update(data); }

// ── Chat (idéntico al del resto de aplicaciones) ──
const ANUNCIOS = 'anuncios';
const dmId = (a,b) => 'dm_' + [a,b].sort().join('__');

async function ensureDm(otherPid, names) {
  const id = dmId(ME.pid, otherPid);
  await db.collection('Chats').doc(id).set({
    type:'dm', participants:[ME.pid, otherPid], names:names||{}
  }, { merge:true });
  return id;
}

async function sendMessage(chatId, text) {
  const t = String(text||'').trim();
  if (!t) return;
  await db.collection('Messages').add({
    chatId, senderId: ME.pid, senderName: ME.name, senderRole:'manager',
    text: t, createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await db.collection('Chats').doc(chatId).set({
    lastMessage: t.slice(0,80), lastSender: ME.pid,
    lastAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge:true });
}

function listenMessages(chatId, cb) {
  return db.collection('Messages').where('chatId','==',chatId)
    .onSnapshot(s => cb(s.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b) => (a.createdAt?.toMillis?.()||0) - (b.createdAt?.toMillis?.()||0))),
      e => console.error('listenMessages', e));
}

function listenChats(cb) {
  const st = { mine:[], anuncios:null };
  const emit = () => cb(st.anuncios ? st.mine.concat([st.anuncios]) : st.mine);
  const a = db.collection('Chats').where('participants','array-contains',ME.pid)
    .onSnapshot(s => { st.mine = s.docs.map(d=>({id:d.id,...d.data()})); emit(); },
                e => console.error('chats mine', e));
  const b = db.collection('Chats').doc(ANUNCIOS)
    .onSnapshot(d => { st.anuncios = d.exists ? {id:d.id,...d.data()} : null; emit(); },
                e => console.error('chats anuncios', e));
  return () => { a(); b(); };
}

// ── Fotos en el chat ──
function conTiempo(promesa, ms, queHacia) {
  return Promise.race([
    promesa,
    new Promise((_, fail) => setTimeout(
      () => fail(new Error('Se agotó el tiempo ' + queHacia)), ms))
  ]);
}
function aBlob(canvas, calidad) {
  return new Promise((ok, fail) => {
    if (!canvas.toBlob) {
      try {
        const s = canvas.toDataURL('image/jpeg', calidad).split(',')[1];
        const bin = atob(s);
        const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        return ok(new Blob([buf], { type:'image/jpeg' }));
      } catch (e) { return fail(e); }
    }
    canvas.toBlob(b => b ? ok(b) : fail(new Error('No se pudo comprimir la imagen')),
                  'image/jpeg', calidad);
  });
}
async function encogerImagen(file, maxLado = 1200, calidad = 0.68) {
  const dibujar = (fuente, w0, h0) => {
    const e = Math.min(1, maxLado / Math.max(w0, h0));
    const w = Math.max(1, Math.round(w0*e)), h = Math.max(1, Math.round(h0*e));
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingQuality = 'medium';
    ctx.drawImage(fuente, 0, 0, w, h);
    return { c, w, h };
  };
  if (typeof createImageBitmap === 'function') {
    let bmp = null;
    try {
      bmp = await conTiempo(createImageBitmap(file), 15000, 'al abrir la foto');
      const { c, w, h } = dibujar(bmp, bmp.width, bmp.height);
      const blob = await conTiempo(aBlob(c, calidad), 15000, 'al comprimir la foto');
      return { blob, w, h };
    } catch (e) { console.warn('createImageBitmap no sirvió:', e); }
    finally { if (bmp && bmp.close) bmp.close(); }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await conTiempo(new Promise((ok, fail) => {
      const i = new Image();
      i.onload = () => ok(i);
      i.onerror = () => fail(new Error('No se pudo abrir esa imagen'));
      i.src = url;
    }), 15000, 'al abrir la foto');
    const { c, w, h } = dibujar(img, img.naturalWidth||img.width, img.naturalHeight||img.height);
    const blob = await conTiempo(aBlob(c, calidad), 15000, 'al comprimir la foto');
    return { blob, w, h };
  } finally { URL.revokeObjectURL(url); }
}

async function enviarFoto(chatId, file, onProgreso) {
  if (file.type && !file.type.startsWith('image/')) throw new Error('Sólo se pueden enviar imágenes');
  if (file.size > 12 * 1024 * 1024) throw new Error('La imagen es demasiado grande');

  if (onProgreso) onProgreso(null);
  let blob, w = 0, h = 0;
  try { ({ blob, w, h } = await encogerImagen(file)); }
  catch (e) { console.warn('se sube original:', e); blob = file; }

  const nombre = `${Date.now()}_${Math.random().toString(36).slice(2,9)}.jpg`;
  const ref = firebase.storage().ref(`chat/${chatId}/${nombre}`);
  const tarea = ref.put(blob, { contentType: blob.type || 'image/jpeg' });
  await new Promise((ok, fail) => {
    tarea.on('state_changed',
      s => { if (onProgreso && s.totalBytes) onProgreso(Math.round(s.bytesTransferred/s.totalBytes*100)); },
      fail, ok);
  });
  const url = await ref.getDownloadURL();

  await db.collection('Messages').add({
    chatId, senderId: ME.pid, senderName: ME.name, senderRole:'manager',
    type:'image', url, w, h, text:'',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await db.collection('Chats').doc(chatId).set({
    lastMessage:'Foto', lastSender: ME.pid,
    lastAt: firebase.firestore.FieldValue.serverTimestamp()
  }, { merge:true });
}

// ── Sin leer (por dispositivo, como en el resto) ──
const leidoKey = () => 'elaguila_leido_' + (ME ? ME.pid : 'anon');
function leidoMap() {
  try { return JSON.parse(localStorage.getItem(leidoKey()) || '{}'); }
  catch (e) { return {}; }
}
function marcarLeido(chatId) {
  const m = leidoMap();
  m[chatId] = Date.now();
  try { localStorage.setItem(leidoKey(), JSON.stringify(m)); } catch (e) {}
}
function sinLeer(chats) {
  const l = leidoMap();
  return chats.filter(c => {
    const t = msDe(c.lastAt);
    return t && c.lastSender !== ME.pid && t > (l[c.id] || 0);
  }).sort((a,b) => msDe(b.lastAt) - msDe(a.lastAt));
}

// ══ Visto y reacciones ══
//
// "Visto" se comparte: al tener una conversación abierta se anota la hora
// en Chats/{id}.vistos[miPid], y el que envió ve el "Visto" bajo su
// mensaje. La marca local de arriba sigue mandando para el punto rojo.

const vistoEscrito = {};   // anti-bucle: escribir dispara el snapshot que
                           // vuelve aquí; sólo se escribe si hay algo nuevo.
function marcarVisto(chatId, lastAtMs) {
  if (!ME) return;
  const t = lastAtMs || Date.now();
  if (vistoEscrito[chatId] && vistoEscrito[chatId] >= t) return;
  vistoEscrito[chatId] = t;
  const campo = {}; campo['vistos.' + ME.pid] = firebase.firestore.FieldValue.serverTimestamp();
  db.collection('Chats').doc(chatId).update(campo)
    .catch(e => console.warn('marcarVisto', e));
}

const REACCION = { up:'👍', love:'❤️', down:'👎' };

// Poner, cambiar o quitar (si ya era la misma) la reacción propia.
async function reaccionar(msgId, tipo, actual) {
  const campo = {};
  campo['reacciones.' + ME.pid] =
    actual === tipo ? firebase.firestore.FieldValue.delete() : tipo;
  await db.collection('Messages').doc(msgId).update(campo);
}

// ── Notificaciones push ──
async function activarPush() {
  try {
    if (!VAPID_KEY || !('serviceWorker' in navigator) || !('Notification' in window)
        || !firebase.messaging) return false;
    const permiso = await Notification.requestPermission();
    if (permiso !== 'granted') return false;
    const reg = await navigator.serviceWorker.register('firebase-messaging-sw.js');
    const messaging = firebase.messaging();
    const token = await messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
    if (!token) return false;
    await db.collection('PushTokens').doc(token).set({
      pid: ME.pid, name: ME.name,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge:true });
    messaging.onMessage(p => {
      const n = p.notification || {};
      if (n.title) toast(n.title + ': ' + (n.body || ''), 'info');
    });
    return true;
  } catch (err) { console.error('activarPush:', err); return false; }
}

function setupPush() {
  if (!VAPID_KEY || !('Notification' in window)) {
    if (esIOS() && !estaInstalada()) avisarInstalar();
    return;
  }
  if (Notification.permission === 'granted') { activarPush(); return; }
  if (Notification.permission === 'denied')  return;
  if (localStorage.getItem('elaguila_push_no_m')) return;

  const bar = document.createElement('div');
  bar.className = 'push-ask';
  bar.innerHTML = `
    <ion-icon name="notifications-outline"></ion-icon>
    <div style="flex:1">
      <div class="push-ask-t">Avisos en tu teléfono</div>
      <div class="push-ask-s">Mensajes, viajes y pedidos, sin abrir la app</div>
    </div>
    <button class="push-si">Activar</button>
    <button class="push-no" aria-label="Ahora no"><ion-icon name="close-outline"></ion-icon></button>`;
  bar.querySelector('.push-si').onclick = async () => {
    const ok = await activarPush();
    toast(ok ? 'Avisos activados' : 'No se pudieron activar', ok ? 'ok' : 'err');
    bar.remove();
  };
  bar.querySelector('.push-no').onclick = () => {
    localStorage.setItem('elaguila_push_no_m', '1');
    bar.remove();
  };
  document.querySelector('.appbar').insertAdjacentElement('afterend', bar);
}

const esIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const estaInstalada = () => window.navigator.standalone === true
  || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);

function avisarInstalar() {
  if (localStorage.getItem('elaguila_instalar_no_m')) return;
  const bar = document.createElement('div');
  bar.className = 'push-ask';
  bar.innerHTML = `
    <ion-icon name="share-outline"></ion-icon>
    <div style="flex:1">
      <div class="push-ask-t">Instala la app para recibir avisos</div>
      <div class="push-ask-s">Toca <strong>Compartir</strong> abajo y elige <strong>Añadir a inicio</strong>.</div>
    </div>
    <button class="push-no" aria-label="Ahora no"><ion-icon name="close-outline"></ion-icon></button>`;
  bar.querySelector('.push-no').onclick = () => {
    localStorage.setItem('elaguila_instalar_no_m', '1');
    bar.remove();
  };
  document.querySelector('.appbar').insertAdjacentElement('afterend', bar);
}
