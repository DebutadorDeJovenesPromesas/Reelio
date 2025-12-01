// ========== CONFIGURACIÓN FIREBASE ==========
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-analytics.js";
import { getFirestore, collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

// Tu configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAT22wMZyUIfoYLtCF7GCyjn41QNF5dEG0",
    authDomain: "reelio-3705b.firebaseapp.com",
    projectId: "reelio-3705b",
    storageBucket: "reelio-3705b.firebasestorage.app",
    messagingSenderId: "579566765924",
    appId: "1:579566765924:web:c73b8bddbc5ee4ba6b5c71",
    measurementId: "G-7J6CQZVMPM"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);

// ========== FUNCIONES DE UI ==========
const messageBox = document.getElementById('message-box');

function showMessage(message, type = 'success') {
    messageBox.textContent = message;
    messageBox.classList.remove('hidden', 'opacity-0', 'bg-red-600/20', 'text-red-400', 'bg-green-600/20', 'text-green-400');
    messageBox.classList.add('opacity-100');
    
    if (type === 'success') {
        messageBox.classList.add('bg-green-600/20', 'text-green-400');
    } else {
        messageBox.classList.add('bg-red-600/20', 'text-red-400');
    }

    setTimeout(() => {
        messageBox.classList.remove('opacity-100');
        messageBox.classList.add('opacity-0');
        setTimeout(() => messageBox.classList.add('hidden'), 300);
    }, 3000);
}

// ========== LÓGICA DEL FORMULARIO ==========
document.addEventListener('DOMContentLoaded', () => {
    const waitlistForm = document.getElementById('waitlist-form');

    if (waitlistForm) {
        waitlistForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();

            if (name && email) {
                showMessage('Procesando tu registro...', 'success');
                
                try {
                    // Guardar en Firestore
                    await addDoc(collection(db, "waitlist"), {
                        nombre: name,
                        email: email,
                        fechaRegistro: serverTimestamp()
                    });
                    
                    showMessage(`¡Gracias, ${name}! Te has registrado exitosamente en la lista de espera.`, 'success');
                    waitlistForm.reset();
                    
                } catch (error) {
                    console.error('Error al guardar en Firebase:', error);
                    showMessage('Error al registrarte. Intenta de nuevo.', 'error');
                }
            } else {
                showMessage('Por favor, completa todos los campos requeridos.', 'error');
            }
        });
    }

    // Smooth scrolling para enlaces internos
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});