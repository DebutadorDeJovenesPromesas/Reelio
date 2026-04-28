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

async function getLocationFromIP() {
    try {
        const res = await fetch("https://ipapi.co/json/");
        return await res.json();
    } catch {
        return {};
    }
}

async function recogerDatos(user) {
    const nav = window.navigator;
    const scr = window.screen;

    // Geolocalización del navegador (solo si el usuario acepta el permiso)
    let geoCoords = null;
    try {
        geoCoords = await new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                pos => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, precision: pos.coords.accuracy }),
                () => resolve(null),
                { timeout: 5000 }
            );
        });
    } catch { }

    // Datos de IP y localización aproximada
    const ipData = await getLocationFromIP();

    // Canvas fingerprint
    let canvasFingerprint = null;
    try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        ctx.textBaseline = "top";
        ctx.font = "14px Arial";
        ctx.fillText("fingerprint", 2, 2);
        canvasFingerprint = canvas.toDataURL().slice(-50);
    } catch { }

    // Audio fingerprint
    let audioFingerprint = null;
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
        audioFingerprint = data.slice(0, 10).join(",");
        oscillator.stop();
        audioCtx.close();
    } catch { }

    // Fuentes disponibles (método de detección por canvas)
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
    } catch { }

    // Memoria y hardware
    const memoria = nav.deviceMemory || null;
    const nucleosCPU = nav.hardwareConcurrency || null;

    // Conexión de red
    const conexion = nav.connection || nav.mozConnection || nav.webkitConnection;
    const datosConexion = conexion ? {
        tipo: conexion.effectiveType || null,
        velocidadBajada: conexion.downlink || null,
        rtt: conexion.rtt || null,
        ahorroDatos: conexion.saveData || false
    } : null;

    // Plugins del navegador
    const plugins = [];
    for (let i = 0; i < nav.plugins.length; i++) {
        plugins.push(nav.plugins[i].name);
    }

    const datos = {
        timestamp: serverTimestamp(),
        pagina: window.location.href,
        referrer: document.referrer || null,

        // Usuario autenticado (si está logueado en Reelio)
        usuario: user ? {
            uid: user.uid,
            email: user.email,
            nombre: user.displayName || null,
            fotoPerfil: user.photoURL || null,
            emailVerificado: user.emailVerified,
            proveedor: user.providerData.map(p => p.providerId)
        } : null,

        // IP y localización por IP
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
            isp: ipData.org || null,
        },

        // Geolocalización GPS (si el usuario acepta)
        geolocalizacionGPS: geoCoords,

        // Navegador y sistema
        navegador: {
            userAgent: nav.userAgent,
            idioma: nav.language,
            idiomasAceptados: nav.languages ? [...nav.languages] : null,
            cookiesHabilitadas: nav.cookieEnabled,
            doNotTrack: nav.doNotTrack,
            plataforma: nav.platform,
            plugins: plugins,
        },

        // Pantalla y dispositivo
        pantalla: {
            anchoPantalla: scr.width,
            altoPantalla: scr.height,
            anchoVentana: window.innerWidth,
            altoVentana: window.innerHeight,
            profundidadColor: scr.colorDepth,
            pixelRatio: window.devicePixelRatio || null,
            orientacion: scr.orientation ? scr.orientation.type : null,
            tocoPantalla: nav.maxTouchPoints > 0,
            maxTouchPoints: nav.maxTouchPoints,
        },

        // Hardware
        hardware: {
            memoriaRAM_GB: memoria,
            nucleosCPU: nucleosCPU,
        },

        // Red
        conexion: datosConexion,

        // Tiempo y zona horaria
        tiempo: {
            zonaHoraria: Intl.DateTimeFormat().resolvedOptions().timeZone,
            offsetUTC: new Date().getTimezoneOffset(),
            horaLocal: new Date().toISOString(),
        },

        // Fingerprints
        fingerprint: {
            canvas: canvasFingerprint,
            audio: audioFingerprint,
            fuentes: fontesDetectadas,
        },

        // Rendimiento
        rendimiento: performance.timing ? {
            tiempoCarga: performance.timing.loadEventEnd - performance.timing.navigationStart || null,
        } : null,
    };

    try {
        await addDoc(collection(db, "info"), datos);
        console.log("[Tracker] Datos guardados en Firestore.");
    } catch (e) {
        console.error("[Tracker] Error guardando datos:", e);
    }
}

// Esperar a saber si hay usuario logueado antes de guardar
onAuthStateChanged(auth, (user) => {
    recogerDatos(user);
});

// ========== FIN TRACKER ==========