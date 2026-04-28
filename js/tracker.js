// ========== TRACKER DE VISITAS (BLINDADO) ==========
// Bloque independiente — se puede eliminar sin afectar al resto
// Diseñado para NO fallar nunca: cada campo aislado, sanitización doble,
// y validación previa al envío. Si algo falla, se registra como null y sigue.

import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyAT22wMZyUIfoYLtCF7GCyjn41QNF5dEG0",
    authDomain: "reelio-3705b.firebaseapp.com",
    projectId: "reelio-3705b",
    storageBucket: "reelio-3705b.firebasestorage.app",
    messagingSenderId: "579566765924",
    appId: "1:579566765924:web:c73b8bddbc5ee4ba6b5c71"
};

let app, db, auth;
try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
} catch (e) {
    console.error("[Tracker] Error inicializando Firebase:", e);
}

// ========== HELPER: ejecutar función con fallback seguro ==========
function safeRun(fn, fallback = null) {
    try {
        const r = fn();
        return (r === undefined) ? fallback : r;
    } catch { return fallback; }
}

async function safeRunAsync(fn, fallback = null) {
    try {
        const r = await fn();
        return (r === undefined) ? fallback : r;
    } catch { return fallback; }
}

// ========== HELPERS DE TIPO ==========
function safeStr(v, fallback = null) {
    if (v === null || v === undefined) return fallback;
    if (typeof v === 'string') return v;
    try { return String(v); } catch { return fallback; }
}

function safeNum(v, fallback = null) {
    if (typeof v !== 'number') return fallback;
    if (!isFinite(v) || isNaN(v)) return fallback;
    return v;
}

function safeBool(v, fallback = null) {
    if (typeof v === 'boolean') return v;
    return fallback;
}

// ========== FUNCIÓN SANITIZADORA (BLINDADA) ==========
// Garantiza que el objeto sea 100% válido para Firestore:
// - Convierte undefined → null
// - Elimina NaN, Infinity, -Infinity → null
// - Elimina funciones, símbolos, BigInt → null/string
// - Detecta y rompe referencias circulares
// - Preserva FieldValue/Timestamp de Firestore intactos
// - Limita profundidad recursiva para evitar stack overflow
function sanitizeForFirestore(obj, seen = new WeakSet(), depth = 0) {
    const MAX_DEPTH = 30;
    if (depth > MAX_DEPTH) return null;

    if (obj === undefined) return null;
    if (obj === null) return null;
    const type = typeof obj;
    if (type === 'string') return obj;
    if (type === 'boolean') return obj;
    if (type === 'number') {
        if (!isFinite(obj) || isNaN(obj)) return null;
        return obj;
    }
    if (type === 'bigint') return safeStr(obj, null);
    if (type === 'function' || type === 'symbol') return null;
    if (type !== 'object') return null;

    // Referencias circulares
    if (seen.has(obj)) return null;
    seen.add(obj);

    // Objetos especiales de Firestore (FieldValue, Timestamp, etc.)
    try {
        const ctorName = obj.constructor && obj.constructor.name;
        if (ctorName && ctorName !== 'Object' && ctorName !== 'Array') {
            return obj;
        }
    } catch { /* getters que lanzan: continuar como objeto plano */ }

    // Date → ISO string
    if (obj instanceof Date) {
        const t = obj.getTime();
        return isNaN(t) ? null : obj.toISOString();
    }

    // Array
    if (Array.isArray(obj)) {
        const arr = [];
        for (let i = 0; i < obj.length; i++) {
            const v = sanitizeForFirestore(obj[i], seen, depth + 1);
            arr.push(v === undefined ? null : v);
        }
        return arr;
    }

    // Objeto plano
    const result = {};
    let keys = [];
    try { keys = Object.keys(obj); } catch { return null; }
    for (const key of keys) {
        if (typeof key !== 'string') continue;
        let val;
        try { val = obj[key]; } catch { val = null; }
        const sanitized = sanitizeForFirestore(val, seen, depth + 1);
        result[key] = (sanitized === undefined) ? null : sanitized;
    }
    return result;
}

// ========== FUNCIONES AUXILIARES (todas blindadas) ==========

async function getLocationFromIP() {
    // Intento 1: ipapi.co
    try {
        const ctrl = new AbortController();
        const timeoutId = setTimeout(() => ctrl.abort(), 6000);
        const res = await fetch("https://ipapi.co/json/", { signal: ctrl.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
            const data = await res.json();
            if (data && typeof data === 'object') return data;
        }
    } catch {}
    // Intento 2: ipinfo.io
    try {
        const ctrl = new AbortController();
        const timeoutId = setTimeout(() => ctrl.abort(), 6000);
        const res = await fetch("https://ipinfo.io/json", { signal: ctrl.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
            const data = await res.json();
            if (data && typeof data === 'object') {
                let lat = null, lon = null;
                if (typeof data.loc === 'string' && data.loc.includes(',')) {
                    const parts = data.loc.split(',');
                    lat = safeNum(parseFloat(parts[0]));
                    lon = safeNum(parseFloat(parts[1]));
                }
                return {
                    ip: safeStr(data.ip),
                    country_name: safeStr(data.country),
                    country: safeStr(data.country),
                    region: safeStr(data.region),
                    city: safeStr(data.city),
                    postal: safeStr(data.postal),
                    latitude: lat,
                    longitude: lon,
                    timezone: safeStr(data.timezone),
                    org: safeStr(data.org)
                };
            }
        }
    } catch {}
    return {};
}

function getWebGLInfo() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return null;
        const debugInfo = safeRun(() => gl.getExtension('WEBGL_debug_renderer_info'));
        return {
            vendor: safeStr(safeRun(() =>
                debugInfo
                    ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
                    : gl.getParameter(gl.VENDOR)
            )),
            renderer: safeStr(safeRun(() =>
                debugInfo
                    ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
                    : gl.getParameter(gl.RENDERER)
            )),
            version: safeStr(safeRun(() => gl.getParameter(gl.VERSION))),
            shadingLanguageVersion: safeStr(safeRun(() => gl.getParameter(gl.SHADING_LANGUAGE_VERSION))),
            maxTextureSize: safeNum(safeRun(() => gl.getParameter(gl.MAX_TEXTURE_SIZE))),
            maxViewportDims: safeRun(() => {
                const v = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
                if (!v) return null;
                return Array.from(v).map(n => safeNum(n));
            })
        };
    } catch { return null; }
}

async function getBatteryInfo() {
    try {
        if (typeof navigator.getBattery !== 'function') return null;
        const battery = await navigator.getBattery();
        if (!battery) return null;
        return {
            nivel: safeNum(battery.level),
            cargando: safeBool(battery.charging),
            tiempoCarga: (battery.chargingTime === Infinity) ? null : safeNum(battery.chargingTime),
            tiempoDescarga: (battery.dischargingTime === Infinity) ? null : safeNum(battery.dischargingTime)
        };
    } catch { return null; }
}

function getAudioHardware() {
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        const audioCtx = new Ctx();
        const sampleRate = safeNum(audioCtx.sampleRate);
        const maxChannels = safeNum(audioCtx.destination && audioCtx.destination.maxChannelCount);
        try { audioCtx.close(); } catch {}
        return { sampleRate, maxChannels };
    } catch { return null; }
}

function getUserAgentHints() {
    try {
        const ua = navigator.userAgentData;
        if (!ua || !Array.isArray(ua.brands)) return null;
        return {
            brands: ua.brands.map(b => ({
                brand: safeStr(b && b.brand, "unknown"),
                version: safeStr(b && b.version, "unknown")
            })),
            mobile: safeBool(ua.mobile),
            platform: safeStr(ua.platform)
        };
    } catch { return null; }
}

function getMediaQueryPrefs() {
    try {
        if (typeof window.matchMedia !== 'function') return null;
        const mq = (q) => safeRun(() => window.matchMedia(q).matches, false);
        return {
            colorScheme: mq('(prefers-color-scheme: dark)') ? 'dark' :
                         mq('(prefers-color-scheme: light)') ? 'light' : 'unknown',
            reducedMotion: mq('(prefers-reduced-motion: reduce)'),
            contrast: mq('(prefers-contrast: high)') ? 'high' :
                      mq('(prefers-contrast: low)') ? 'low' : 'no-preference'
        };
    } catch { return null; }
}

function getMimeTypes() {
    const mimes = [];
    try {
        if (!navigator.mimeTypes || typeof navigator.mimeTypes.length !== 'number') return [];
        for (let i = 0; i < navigator.mimeTypes.length; i++) {
            try {
                const m = navigator.mimeTypes[i];
                if (!m) continue;
                mimes.push({
                    type: safeStr(m.type),
                    suffix: safeStr(m.suffixes || m.suffix),
                    description: safeStr(m.description)
                });
            } catch {}
        }
    } catch {}
    return mimes;
}

function getCanvasFingerprint() {
    try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return null;
        ctx.textBaseline = "top";
        ctx.font = "14px Arial";
        ctx.fillText("fingerprint", 2, 2);
        const url = canvas.toDataURL();
        return safeStr(url ? url.slice(-50) : null);
    } catch { return null; }
}

function getAudioFingerprint() {
    try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        const audioCtx = new Ctx();
        const oscillator = audioCtx.createOscillator();
        const analyser = audioCtx.createAnalyser();
        const gain = audioCtx.createGain();
        gain.gain.value = 0;
        oscillator.connect(analyser);
        analyser.connect(gain);
        gain.connect(audioCtx.destination);
        oscillator.start(0);
        const data = new Float32Array(analyser.frequencyBinCount);
        analyser.getFloatFrequencyData(data);
        const fp = Array.from(data.slice(0, 10)).map(n => safeNum(n, 0)).join(",");
        try { oscillator.stop(); } catch {}
        try { audioCtx.close(); } catch {}
        return fp;
    } catch { return null; }
}

function getFonts() {
    const fontesTest = ["Arial", "Verdana", "Times New Roman", "Courier New", "Georgia", "Comic Sans MS", "Impact", "Tahoma", "Trebuchet MS", "Palatino"];
    const fontesDetectadas = [];
    try {
        const testCanvas = document.createElement("canvas");
        const testCtx = testCanvas.getContext("2d");
        if (!testCtx) return [];
        const baseFont = "monospace";
        testCtx.font = `12px ${baseFont}`;
        const baseWidth = testCtx.measureText("abcdefghijklmnopqrstuvwxyz").width;
        for (const font of fontesTest) {
            try {
                testCtx.font = `12px "${font}", ${baseFont}`;
                if (testCtx.measureText("abcdefghijklmnopqrstuvwxyz").width !== baseWidth) {
                    fontesDetectadas.push(font);
                }
            } catch {}
        }
    } catch {}
    return fontesDetectadas;
}

function getGeolocationGPS() {
    return new Promise((resolve) => {
        try {
            if (!navigator.geolocation || typeof navigator.geolocation.getCurrentPosition !== 'function') {
                return resolve(null);
            }
            let resolved = false;
            const finish = (val) => {
                if (resolved) return;
                resolved = true;
                resolve(val);
            };
            // Salvavidas por encima del timeout nativo
            setTimeout(() => finish(null), 7000);
            navigator.geolocation.getCurrentPosition(
                pos => {
                    try {
                        if (!pos || !pos.coords) return finish(null);
                        finish({
                            lat: safeNum(pos.coords.latitude),
                            lon: safeNum(pos.coords.longitude),
                            precision: safeNum(pos.coords.accuracy),
                            altitud: safeNum(pos.coords.altitude),
                            precisionAltitud: safeNum(pos.coords.altitudeAccuracy),
                            velocidad: safeNum(pos.coords.speed),
                            rumbo: safeNum(pos.coords.heading),
                            timestamp: safeNum(pos.timestamp)
                        });
                    } catch { finish(null); }
                },
                () => finish(null),
                { timeout: 5000, maximumAge: 60000, enableHighAccuracy: false }
            );
        } catch { resolve(null); }
    });
}

function getConnectionInfo(nav) {
    try {
        const conexion = nav.connection || nav.mozConnection || nav.webkitConnection;
        return {
            tipo: safeStr(conexion && conexion.effectiveType),
            velocidadBajada: safeNum(conexion && conexion.downlink),
            rtt: safeNum(conexion && conexion.rtt),
            ahorroDatos: safeBool(conexion && conexion.saveData, false),
            tipoRed: safeStr(conexion && conexion.type),
            online: safeBool(nav.onLine, false)
        };
    } catch { return null; }
}

function getPlugins(nav) {
    const plugins = [];
    try {
        if (!nav.plugins || typeof nav.plugins.length !== 'number') return plugins;
        for (let i = 0; i < nav.plugins.length; i++) {
            try {
                const name = safeStr(nav.plugins[i] && nav.plugins[i].name);
                if (name) plugins.push(name);
            } catch {}
        }
    } catch {}
    return plugins;
}

function getUserData(user) {
    if (!user) return null;
    try {
        let proveedor = [];
        try {
            if (Array.isArray(user.providerData)) {
                proveedor = user.providerData.map(p => safeStr(p && p.providerId, "unknown"));
            }
        } catch {}
        return {
            uid: safeStr(user.uid),
            email: safeStr(user.email),
            nombre: safeStr(user.displayName),
            fotoPerfil: safeStr(user.photoURL),
            emailVerificado: safeBool(user.emailVerified, false),
            proveedor: proveedor
        };
    } catch { return null; }
}

function getTimeInfo() {
    try {
        let tz = null;
        try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch {}
        return {
            zonaHoraria: safeStr(tz),
            offsetUTC: safeNum(safeRun(() => new Date().getTimezoneOffset())),
            horaLocal: safeRun(() => new Date().toISOString())
        };
    } catch { return null; }
}

function getPerformanceInfo() {
    try {
        if (typeof performance === 'undefined') return null;
        // API moderna
        if (typeof performance.getEntriesByType === 'function') {
            const navEntries = performance.getEntriesByType('navigation');
            if (Array.isArray(navEntries) && navEntries.length > 0 && navEntries[0]) {
                const t = navEntries[0];
                const carga = safeNum(t.loadEventEnd - t.startTime);
                if (carga !== null && carga > 0) return { tiempoCarga: carga };
            }
        }
        // API legacy
        if (performance.timing && performance.timing.loadEventEnd && performance.timing.navigationStart) {
            const carga = performance.timing.loadEventEnd - performance.timing.navigationStart;
            return { tiempoCarga: safeNum(carga) };
        }
        return null;
    } catch { return null; }
}

// ========== RECOLECCIÓN PRINCIPAL ==========
async function recogerDatos(user) {
    const nav = window.navigator || {};
    const scr = window.screen || {};

    // Cada bloque aislado: si falla, queda en null y el resto continúa
    const geoCoords      = await safeRunAsync(() => getGeolocationGPS());
    const ipData         = await safeRunAsync(() => getLocationFromIP(), {});
    const gpuInfo        = safeRun(() => getWebGLInfo());
    const batteryInfo    = await safeRunAsync(() => getBatteryInfo());
    const audioHardware  = safeRun(() => getAudioHardware());
    const userAgentHints = safeRun(() => getUserAgentHints());
    const mediaPrefs     = safeRun(() => getMediaQueryPrefs());
    const mimeTypes      = safeRun(() => getMimeTypes(), []);
    const canvasFp       = safeRun(() => getCanvasFingerprint());
    const audioFp        = safeRun(() => getAudioFingerprint());
    const fonts          = safeRun(() => getFonts(), []);
    const datosConexion  = safeRun(() => getConnectionInfo(nav));
    const plugins        = safeRun(() => getPlugins(nav), []);
    const usuarioData    = safeRun(() => getUserData(user));
    const tiempo         = safeRun(() => getTimeInfo());
    const rendimiento    = safeRun(() => getPerformanceInfo());

    const ipSafe = (ipData && typeof ipData === 'object') ? ipData : {};

    const datos = {
        timestamp: serverTimestamp(),
        pagina: safeStr(safeRun(() => window.location.href)),
        referrer: safeStr(safeRun(() => document.referrer)),

        usuario: usuarioData,

        ip: safeStr(ipSafe.ip),
        localizacionIP: {
            pais: safeStr(ipSafe.country_name),
            codigoPais: safeStr(ipSafe.country),
            region: safeStr(ipSafe.region),
            ciudad: safeStr(ipSafe.city),
            codigoPostal: safeStr(ipSafe.postal),
            latitud: safeNum(ipSafe.latitude),
            longitud: safeNum(ipSafe.longitude),
            timezone: safeStr(ipSafe.timezone),
            isp: safeStr(ipSafe.org)
        },

        geolocalizacionGPS: geoCoords,

        navegador: {
            userAgent: safeStr(nav.userAgent),
            vendor: safeStr(nav.vendor),
            productSub: safeStr(nav.productSub),
            appVersion: safeStr(nav.appVersion),
            idioma: safeStr(nav.language),
            idiomasAceptados: safeRun(() => Array.isArray(nav.languages) ? [...nav.languages].map(l => safeStr(l)).filter(x => x !== null) : null),
            cookiesHabilitadas: safeBool(nav.cookieEnabled, false),
            doNotTrack: safeStr(nav.doNotTrack),
            plataforma: safeStr(nav.platform),
            plugins: Array.isArray(plugins) ? plugins : [],
            mimeTypes: (Array.isArray(mimeTypes) && mimeTypes.length > 0) ? mimeTypes : null,
            userAgentHints: userAgentHints,
            preferencias: mediaPrefs,
            webdriver: safeBool(nav.webdriver, false),
            pdfViewerEnabled: safeBool(nav.pdfViewerEnabled)
        },

        pantalla: {
            anchoPantalla: safeNum(scr.width),
            altoPantalla: safeNum(scr.height),
            anchoDisponible: safeNum(scr.availWidth),
            altoDisponible: safeNum(scr.availHeight),
            anchoVentana: safeNum(window.innerWidth),
            altoVentana: safeNum(window.innerHeight),
            profundidadColor: safeNum(scr.colorDepth),
            profundidadPixel: safeNum(scr.pixelDepth),
            pixelRatio: safeNum(window.devicePixelRatio),
            orientacion: safeStr(safeRun(() => scr.orientation && scr.orientation.type)),
            orientacionAngulo: safeNum(safeRun(() => scr.orientation && scr.orientation.angle)),
            tocoPantalla: safeBool(safeRun(() => (nav.maxTouchPoints || 0) > 0), false),
            maxTouchPoints: safeNum(nav.maxTouchPoints, 0)
        },

        hardware: {
            memoriaRAM_GB: safeNum(nav.deviceMemory),
            nucleosCPU: safeNum(nav.hardwareConcurrency),
            gpu: gpuInfo,
            bateria: batteryInfo,
            audio: audioHardware
        },

        conexion: datosConexion,
        tiempo: tiempo,

        fingerprint: {
            canvas: safeStr(canvasFp),
            audio: safeStr(audioFp),
            fuentes: Array.isArray(fonts) ? fonts : []
        },

        rendimiento: rendimiento
    };

    // --- Guardar en Firestore (sanitización doble pasada) ---
    if (db) {
        try {
            // Pasada 1: limpieza completa
            let datosLimpios = sanitizeForFirestore(datos);
            // Pasada 2 (paranoia): JSON-roundtrip excluyendo el timestamp
            try {
                const ts = datosLimpios.timestamp;
                const sinTs = { ...datosLimpios };
                delete sinTs.timestamp;
                const roundtripped = JSON.parse(JSON.stringify(sinTs, (k, v) => {
                    if (v === undefined) return null;
                    if (typeof v === 'number' && (!isFinite(v) || isNaN(v))) return null;
                    if (typeof v === 'function' || typeof v === 'symbol') return null;
                    if (typeof v === 'bigint') return v.toString();
                    return v;
                }));
                datosLimpios = { ...roundtripped, timestamp: ts };
            } catch {}
            await addDoc(collection(db, "info"), datosLimpios);
            console.log("[Tracker] Datos guardados en Firestore.");
        } catch (e) {
            console.error("[Tracker] Error guardando datos:", e);
            // Reintento mínimo con datos esenciales
            try {
                await addDoc(collection(db, "info"), {
                    timestamp: serverTimestamp(),
                    pagina: safeStr(safeRun(() => window.location.href), "desconocida"),
                    error: safeStr(e && e.message, "error"),
                    fallback: true
                });
                console.log("[Tracker] Guardado fallback realizado.");
            } catch (e2) {
                console.error("[Tracker] Fallback también falló:", e2);
            }
        }
    }

    // --- EmailJS (totalmente independiente) ---
    try {
        const ctrl = new AbortController();
        const timeoutId = setTimeout(() => ctrl.abort(), 8000);
        await fetch("https://api.emailjs.com/api/v1.0/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: ctrl.signal,
            body: JSON.stringify({
                service_id: "service_otbfn5t",
                template_id: "template_dq6t7op",
                user_id: "j-ljQD4zAO0e-qT7K",
                template_params: {
                    pagina: safeStr(datos.pagina, "Desconocida"),
                    ip: safeStr(datos.ip, "Desconocida"),
                    ciudad: safeStr(datos.localizacionIP && datos.localizacionIP.ciudad, "Desconocida"),
                    pais: safeStr(datos.localizacionIP && datos.localizacionIP.pais, "Desconocido"),
                    usuario: safeStr(datos.usuario && datos.usuario.email, "No logueado"),
                    hora: safeStr(datos.tiempo && datos.tiempo.horaLocal, new Date().toISOString()),
                    name: "Reelio Tracker"
                }
            })
        });
        clearTimeout(timeoutId);
        console.log("[Tracker] Email enviado.");
    } catch (e) {
        console.error("[Tracker] Error enviando email:", e);
    }
}

// ========== ARRANQUE BLINDADO ==========
try {
    if (auth) {
        let yaEjecutado = false;
        const ejecutar = (user) => {
            if (yaEjecutado) return;
            yaEjecutado = true;
            try {
                recogerDatos(user).catch(e => console.error("[Tracker] Error no capturado:", e));
            } catch (e) {
                console.error("[Tracker] Error lanzando recogerDatos:", e);
            }
        };
        try {
            onAuthStateChanged(auth, (user) => ejecutar(user), () => ejecutar(null));
        } catch (e) {
            console.error("[Tracker] onAuthStateChanged falló, ejecutando sin auth:", e);
            ejecutar(null);
        }
        // Salvavidas: si auth no responde en 10s, ejecutar igual sin user
        setTimeout(() => ejecutar(null), 10000);
    } else {
        recogerDatos(null).catch(e => console.error("[Tracker] Error sin auth:", e));
    }
} catch (e) {
    console.error("[Tracker] Error fatal en arranque:", e);
}

// ========== FIN TRACKER ==========