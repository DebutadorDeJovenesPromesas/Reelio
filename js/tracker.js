// ========== TRACKER DE VISITAS ==========
// Bloque independiente — se puede eliminar sin afectar al resto

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

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

// ========== FUNCIÓN SANITIZADORA ==========
// Reemplaza recursivamente cualquier undefined por null
function sanitizeForFirestore(obj) {
    return JSON.parse(JSON.stringify(obj, (key, value) =>
        value === undefined ? null : value
    ));
}

// ========== FUNCIONES AUXILIARES (todas seguras) ==========

async function getLocationFromIP() {
    try {
        const res = await fetch("https://ipapi.co/json/");
        if (!res.ok) throw new Error("No ok");
        return await res.json();
    } catch {
        try {
            const res = await fetch("https://ipinfo.io/json?token=sin-token");
            if (!res.ok) throw new Error("No ok");
            const data = await res.json();
            return {
                ip: data.ip,
                country_name: data.country,
                country: data.country,
                region: data.region,
                city: data.city,
                postal: data.postal,
                latitude: data.loc ? parseFloat(data.loc.split(",")[0]) : null,
                longitude: data.loc ? parseFloat(data.loc.split(",")[1]) : null,
                timezone: data.timezone,
                org: data.org
            };
        } catch {
            return {};
        }
    }
}

function getWebGLInfo() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) return null;
        // Firefox: usar RENDERER en lugar de UNMASKED_VENDOR_WEBGL
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        if (!debugInfo) return null;
        return {
            vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL),
            renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL),
            version: gl.getParameter(gl.VERSION),
            shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
            maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
            maxViewportDims: gl.getParameter(gl.MAX_VIEWPORT_DIMS)
        };
    } catch { return null; }
}

async function getBatteryInfo() {
    if (typeof navigator.getBattery !== 'function') return null;
    try {
        const battery = await navigator.getBattery();
        return {
            nivel: battery.level,
            cargando: battery.charging,
            tiempoCarga: battery.chargingTime === Infinity ? null : battery.chargingTime,
            tiempoDescarga: battery.dischargingTime === Infinity ? null : battery.dischargingTime
        };
    } catch { return null; }
}

function getAudioHardware() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const sampleRate = audioCtx.sampleRate;
        const maxChannels = audioCtx.destination.maxChannelCount;
        audioCtx.close();
        return { sampleRate, maxChannels };
    } catch { return null; }
}

function getUserAgentHints() {
    try {
        const ua = navigator.userAgentData;
        if (!ua || !ua.brands) return null;
        return {
            brands: ua.brands.map(b => ({
                brand: b.brand ?? "unknown",
                version: b.version ?? "unknown"
            })),
            mobile: ua.mobile,
            platform: ua.platform
        };
    } catch { return null; }
}

function getMediaQueryPrefs() {
    try {
        return {
            colorScheme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' :
                         window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'unknown',
            reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
            contrast: window.matchMedia('(prefers-contrast: high)').matches ? 'high' :
                      window.matchMedia('(prefers-contrast: low)').matches ? 'low' : 'no-preference'
        };
    } catch { return null; }
}

function getMimeTypes() {
    const mimes = [];
    try {
        if (!navigator.mimeTypes) return [];
        for (let i = 0; i < navigator.mimeTypes.length; i++) {
            mimes.push({
                type: navigator.mimeTypes[i].type,
                suffix: navigator.mimeTypes[i].suffix,
                description: navigator.mimeTypes[i].description
            });
        }
    } catch {}
    return mimes;
}

function getCanvasFingerprint() {
    try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        ctx.textBaseline = "top";
        ctx.font = "14px Arial";
        ctx.fillText("fingerprint", 2, 2);
        return canvas.toDataURL().slice(-50);
    } catch { return null; }
}

function getAudioFingerprint() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
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
        const fp = data.slice(0, 10).join(",");
        oscillator.stop();
        audioCtx.close();
        return fp;
    } catch { return null; }
}

function getFonts() {
    const fontesTest = ["Arial", "Verdana", "Times New Roman", "Courier New", "Georgia", "Comic Sans MS", "Impact", "Tahoma", "Trebuchet MS", "Palatino"];
    const fontesDetectadas = [];
    try {
        const testCanvas = document.createElement("canvas");
        const testCtx = testCanvas.getContext("2d");
        const baseFont = "monospace";
        testCtx.font = `12px ${baseFont}`;
        const baseWidth = testCtx.measureText("abcdefghijklmnopqrstuvwxyz").width;
        for (const font of fontesTest) {
            testCtx.font = `12px ${font}, ${baseFont}`;
            if (testCtx.measureText("abcdefghijklmnopqrstuvwxyz").width !== baseWidth) {
                fontesDetectadas.push(font);
            }
        }
    } catch {}
    return fontesDetectadas;
}

// ========== RECOLECCIÓN PRINCIPAL ==========
async function recogerDatos(user) {
    const nav = window.navigator;
    const scr = window.screen;

    // Geolocalización GPS
    let geoCoords = null;
    try {
        geoCoords = await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                pos => resolve({
                    lat: pos.coords.latitude,
                    lon: pos.coords.longitude,
                    precision: pos.coords.accuracy,
                    altitud: pos.coords.altitude || null,
                    precisionAltitud: pos.coords.altitudeAccuracy || null,
                    velocidad: pos.coords.speed || null,
                    rumbo: pos.coords.heading || null,
                    timestamp: pos.timestamp
                }),
                () => resolve(null),
                { timeout: 5000 }
            );
        });
    } catch {}

    // IP
    let ipData = {};
    try { ipData = await getLocationFromIP(); } catch {}

    // Datos extra
    let gpuInfo = null;
    try { gpuInfo = getWebGLInfo(); } catch {}

    let batteryInfo = null;
    try { batteryInfo = await getBatteryInfo(); } catch {}

    let audioHardware = null;
    try { audioHardware = getAudioHardware(); } catch {}

    let userAgentHints = null;
    try { userAgentHints = getUserAgentHints(); } catch {}

    let mediaPrefs = null;
    try { mediaPrefs = getMediaQueryPrefs(); } catch {}

    let mimeTypes = [];
    try { mimeTypes = getMimeTypes(); } catch {}

    let canvasFp = null;
    try { canvasFp = getCanvasFingerprint(); } catch {}

    let audioFp = null;
    try { audioFp = getAudioFingerprint(); } catch {}

    let fonts = [];
    try { fonts = getFonts(); } catch {}

    // Conexión de red
    let datosConexion = null;
    try {
        const conexion = nav.connection || nav.mozConnection || nav.webkitConnection;
        datosConexion = {
            tipo: conexion?.effectiveType || null,
            velocidadBajada: conexion?.downlink || null,
            rtt: conexion?.rtt || null,
            ahorroDatos: conexion?.saveData || false,
            tipoRed: conexion?.type || null,
            online: nav.onLine
        };
    } catch {}

    // Plugins
    let plugins = [];
    try {
        for (let i = 0; i < nav.plugins.length; i++) {
            plugins.push(nav.plugins[i].name);
        }
    } catch {}

    // Datos de usuario (con protección extra)
    let usuarioData = null;
    if (user) {
        try {
            usuarioData = {
                uid: user.uid,
                email: user.email,
                nombre: user.displayName || null,
                fotoPerfil: user.photoURL || null,
                emailVerificado: user.emailVerified,
                proveedor: user.providerData
                    ? user.providerData.map(p => p?.providerId ?? "unknown")
                    : []
            };
        } catch { usuarioData = null; }
    }

    // Ensamblar datos finales
    const datos = {
        timestamp: serverTimestamp(),
        pagina: window.location.href,
        referrer: document.referrer || null,

        usuario: usuarioData,

        ip: ipData.ip || null,
        localizacionIP: {
            pais: ipData.country_name || null,
            codigoPais: ipData.country || null,
            region: ipData.region || null,
            ciudad: ipData.city || null,
            codigoPostal: ipData.postal || null,
            latitud: ipData.latitude || null,
            longitud: ipData.longitude || null,
            timezone: ipData.timezone || null,
            isp: ipData.org || null
        },

        geolocalizacionGPS: geoCoords,

        navegador: {
            userAgent: nav.userAgent,
            vendor: nav.vendor || null,
            productSub: nav.productSub || null,
            appVersion: nav.appVersion || null,
            idioma: nav.language,
            idiomasAceptados: nav.languages ? [...nav.languages] : null,
            cookiesHabilitadas: nav.cookieEnabled,
            doNotTrack: nav.doNotTrack || null,
            plataforma: nav.platform || null,
            plugins: plugins,
            mimeTypes: mimeTypes.length > 0 ? mimeTypes : null,
            userAgentHints: userAgentHints,
            preferencias: mediaPrefs,
            webdriver: nav.webdriver || false,
            pdfViewerEnabled: typeof nav.pdfViewerEnabled === 'boolean' ? nav.pdfViewerEnabled : null
        },

        pantalla: {
            anchoPantalla: scr.width,
            altoPantalla: scr.height,
            anchoDisponible: scr.availWidth || null,
            altoDisponible: scr.availHeight || null,
            anchoVentana: window.innerWidth,
            altoVentana: window.innerHeight,
            profundidadColor: scr.colorDepth,
            profundidadPixel: scr.pixelDepth || null,
            pixelRatio: window.devicePixelRatio || null,
            orientacion: scr.orientation?.type || null,
            orientacionAngulo: scr.orientation?.angle || null,
            tocoPantalla: nav.maxTouchPoints > 0,
            maxTouchPoints: nav.maxTouchPoints
        },

        hardware: {
            memoriaRAM_GB: nav.deviceMemory || null,
            nucleosCPU: nav.hardwareConcurrency || null,
            gpu: gpuInfo,
            bateria: batteryInfo,
            audio: audioHardware
        },

        conexion: datosConexion,

        tiempo: {
            zonaHoraria: Intl.DateTimeFormat().resolvedOptions().timeZone,
            offsetUTC: new Date().getTimezoneOffset(),
            horaLocal: new Date().toISOString()
        },

        fingerprint: {
            canvas: canvasFp,
            audio: audioFp,
            fuentes: fonts
        },

        rendimiento: (typeof performance.timing !== 'undefined' && performance.timing.loadEventEnd) ? {
            tiempoCarga: performance.timing.loadEventEnd - performance.timing.navigationStart || null
        } : null
    };

    // --- Guardar en Firestore (versión sanitizada) ---
    try {
        await addDoc(collection(db, "info"), sanitizeForFirestore(datos));
        console.log("[Tracker] Datos guardados en Firestore.");
    } catch (e) {
        console.error("[Tracker] Error guardando datos:", e);
    }

    // --- EmailJS ---
    try {
        await fetch("https://api.emailjs.com/api/v1.0/email/send", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                service_id: "service_otbfn5t",
                template_id: "template_dq6t7op",
                user_id: "j-ljQD4zAO0e-qT7K",
                template_params: {
                    pagina: datos.pagina || "Desconocida",
                    ip: datos.ip || "Desconocida",
                    ciudad: datos.localizacionIP?.ciudad || "Desconocida",
                    pais: datos.localizacionIP?.pais || "Desconocido",
                    usuario: datos.usuario?.email || "No logueado",
                    hora: datos.tiempo?.horaLocal || new Date().toISOString(),
                    name: "Reelio Tracker"
                }
            })
        });
        console.log("[Tracker] Email enviado.");
    } catch (e) {
        console.error("[Tracker] Error enviando email:", e);
    }
}

// Iniciar tracker
onAuthStateChanged(auth, (user) => {
    recogerDatos(user);
});

// ========== FIN TRACKER ==========