// ========== CONFIGURACIÓN FIREBASE ==========
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-analytics.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

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
    messageBox.classList.remove('hidden', 'opacity-0', 'bg-red-600/20', 'text-red-400', 'bg-green-600/20', 'text-green-400', 'bg-yellow-600/20', 'text-yellow-400');
    messageBox.classList.add('opacity-100');
    
    if (type === 'success') {
        messageBox.classList.add('bg-green-600/20', 'text-green-400');
    } else if (type === 'warning') {
        messageBox.classList.add('bg-yellow-600/20', 'text-yellow-400');
    } else {
        messageBox.classList.add('bg-red-600/20', 'text-red-400');
    }

    setTimeout(() => {
        messageBox.classList.remove('opacity-100');
        messageBox.classList.add('opacity-0');
        setTimeout(() => messageBox.classList.add('hidden'), 300);
    }, 4000);
}

// ========== VERIFICACIONES EN FIREBASE ==========
async function checkEmailExists(email) {
    try {
        const q = query(collection(db, "waitlist"), where("email", "==", email.toLowerCase()));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    } catch (error) {
        console.error('Error al verificar email:', error);
        return false;
    }
}

async function checkUsernameExists(username) {
    try {
        const q = query(collection(db, "waitlist"), where("username", "==", username.toLowerCase()));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    } catch (error) {
        console.error('Error al verificar username:', error);
        return false;
    }
}

// ========== VALIDACIONES ==========
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function validatePassword(password) {
    // Mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return re.test(password);
}

function validateUsername(username) {
    // Solo letras, números y guiones bajos, entre 3 y 20 caracteres
    const re = /^[a-zA-Z0-9_]{3,20}$/;
    return re.test(username);
}

// ========== MODAL DE REGISTRO ==========
function createRegistrationModal() {
    // Verificar si ya existe
    if (document.getElementById('registration-modal')) return;

    const modalHTML = `
        <div id="registration-modal" class="registration-modal" role="dialog" aria-labelledby="reg-modal-title" aria-hidden="true">
            <div class="registration-modal-content">
                <div class="registration-modal-header">
                    <h3 id="reg-modal-title">🎉 ¡Únete a Reelio!</h3>
                    <button id="reg-modal-close" class="registration-modal-close" aria-label="Cerrar">&times;</button>
                </div>
                <div class="registration-modal-body">
                    <p class="registration-subtitle">Completa tus datos para unirte a la lista de espera</p>
                    
                    <form id="complete-registration-form" class="registration-form">
                        <div class="form-group">
                            <label for="reg-fullname">Nombre Completo *</label>
                            <input type="text" id="reg-fullname" name="fullname" placeholder="Ej: Juan García López" required>
                            <span class="field-hint">Tu nombre real completo</span>
                        </div>
                        
                        <div class="form-group">
                            <label for="reg-username">Nombre de Usuario *</label>
                            <div class="username-input-wrapper">
                                <span class="username-prefix">@</span>
                                <input type="text" id="reg-username" name="username" placeholder="tu_usuario" required>
                            </div>
                            <span class="field-hint">3-20 caracteres. Solo letras, números y guiones bajos</span>
                            <span id="username-error" class="field-error hidden">Nombre de usuario inválido</span>
                        </div>
                        
                        <div class="form-group">
                            <label for="reg-email">Correo Electrónico *</label>
                            <input type="email" id="reg-email" name="email" placeholder="tu@email.com" required>
                            <span class="field-hint">Este será tu correo de acceso</span>
                        </div>
                        
                        <div class="form-group">
                            <label for="reg-password">Contraseña *</label>
                            <div class="password-input-wrapper">
                                <input type="password" id="reg-password" name="password" placeholder="••••••••" required>
                                <button type="button" id="toggle-password" class="toggle-password" aria-label="Mostrar contraseña">
                                    <svg id="eye-icon" class="eye-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                    <svg id="eye-off-icon" class="eye-icon hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                </button>
                            </div>
                            <span class="field-hint">Mínimo 8 caracteres, una mayúscula, una minúscula y un número</span>
                            <span id="password-error" class="field-error hidden">La contraseña no cumple los requisitos</span>
                        </div>
                        
                        <div class="form-group">
                            <label for="reg-confirm-password">Confirmar Contraseña *</label>
                            <input type="password" id="reg-confirm-password" name="confirm-password" placeholder="••••••••" required>
                            <span id="confirm-password-error" class="field-error hidden">Las contraseñas no coinciden</span>
                        </div>
                        
                        <div class="form-group checkbox-group">
                            <label class="checkbox-label">
                                <input type="checkbox" id="reg-terms" name="terms" required>
                                <span class="checkbox-custom"></span>
                                <span class="checkbox-text">
                                    Acepto la <a href="politica-privacidad.html" target="_blank">Política de Privacidad</a> 
                                    y los <a href="terminos-condiciones.html" target="_blank">Términos y Condiciones</a>
                                </span>
                            </label>
                        </div>
                        
                        <button type="submit" id="reg-submit-btn" class="registration-submit-btn">
                            <span id="reg-btn-text">Completar Registro</span>
                            <span id="reg-btn-loading" class="hidden">
                                <svg class="spinner" viewBox="0 0 24 24">
                                    <circle class="spinner-circle" cx="12" cy="12" r="10" fill="none" stroke-width="3"></circle>
                                </svg>
                                Registrando...
                            </span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    `;

    const styles = `
        <style id="registration-modal-styles">
            .registration-modal {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.8);
                backdrop-filter: blur(8px);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                visibility: hidden;
                transition: all 0.3s ease;
                padding: 1rem;
            }

            .registration-modal.active {
                opacity: 1;
                visibility: visible;
            }

            .registration-modal-content {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                border: 1px solid rgba(6, 182, 212, 0.3);
                border-radius: 1.5rem;
                width: 100%;
                max-width: 480px;
                max-height: 90vh;
                overflow-y: auto;
                transform: scale(0.9) translateY(20px);
                transition: transform 0.3s ease;
                box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            }

            .registration-modal.active .registration-modal-content {
                transform: scale(1) translateY(0);
            }

            .registration-modal-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 1.5rem;
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .registration-modal-header h3 {
                font-size: 1.5rem;
                font-weight: 700;
                color: white;
                margin: 0;
            }

            .registration-modal-close {
                background: none;
                border: none;
                color: #9ca3af;
                font-size: 2rem;
                cursor: pointer;
                line-height: 1;
                padding: 0;
                transition: color 0.2s;
            }

            .registration-modal-close:hover {
                color: white;
            }

            .registration-modal-body {
                padding: 1.5rem;
            }

            .registration-subtitle {
                color: #9ca3af;
                margin-bottom: 1.5rem;
                text-align: center;
            }

            .registration-form {
                display: flex;
                flex-direction: column;
                gap: 1.25rem;
            }

            .form-group {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }

            .form-group label {
                color: #e5e7eb;
                font-weight: 500;
                font-size: 0.9rem;
            }

            .form-group input[type="text"],
            .form-group input[type="email"],
            .form-group input[type="password"] {
                width: 100%;
                padding: 0.75rem 1rem;
                background: rgba(55, 65, 81, 0.5);
                border: 1px solid rgba(75, 85, 99, 0.5);
                border-radius: 0.75rem;
                color: white;
                font-size: 1rem;
                transition: all 0.2s;
            }

            .form-group input:focus {
                outline: none;
                border-color: #06b6d4;
                box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2);
            }

            .form-group input::placeholder {
                color: #6b7280;
            }

            .field-hint {
                font-size: 0.75rem;
                color: #6b7280;
            }

            .field-error {
                font-size: 0.75rem;
                color: #f87171;
            }

            .field-error.hidden {
                display: none;
            }

            .username-input-wrapper {
                display: flex;
                align-items: center;
                background: rgba(55, 65, 81, 0.5);
                border: 1px solid rgba(75, 85, 99, 0.5);
                border-radius: 0.75rem;
                transition: all 0.2s;
            }

            .username-input-wrapper:focus-within {
                border-color: #06b6d4;
                box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2);
            }

            .username-prefix {
                padding: 0.75rem 0 0.75rem 1rem;
                color: #06b6d4;
                font-weight: 600;
            }

            .username-input-wrapper input {
                border: none !important;
                background: transparent !important;
                box-shadow: none !important;
                padding-left: 0.25rem !important;
            }

            .password-input-wrapper {
                display: flex;
                align-items: center;
                background: rgba(55, 65, 81, 0.5);
                border: 1px solid rgba(75, 85, 99, 0.5);
                border-radius: 0.75rem;
                transition: all 0.2s;
            }

            .password-input-wrapper:focus-within {
                border-color: #06b6d4;
                box-shadow: 0 0 0 3px rgba(6, 182, 212, 0.2);
            }

            .password-input-wrapper input {
                flex: 1;
                border: none !important;
                background: transparent !important;
                box-shadow: none !important;
            }

            .toggle-password {
                background: none;
                border: none;
                padding: 0.75rem;
                cursor: pointer;
                color: #6b7280;
                transition: color 0.2s;
            }

            .toggle-password:hover {
                color: #06b6d4;
            }

            .eye-icon {
                width: 20px;
                height: 20px;
            }

            .eye-icon.hidden {
                display: none;
            }

            .checkbox-group {
                margin-top: 0.5rem;
            }

            .checkbox-label {
                display: flex;
                align-items: flex-start;
                gap: 0.75rem;
                cursor: pointer;
            }

            .checkbox-label input[type="checkbox"] {
                display: none;
            }

            .checkbox-custom {
                width: 20px;
                height: 20px;
                min-width: 20px;
                border: 2px solid rgba(75, 85, 99, 0.8);
                border-radius: 4px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                margin-top: 2px;
            }

            .checkbox-label input[type="checkbox"]:checked + .checkbox-custom {
                background: linear-gradient(135deg, #06b6d4, #c026d3);
                border-color: transparent;
            }

            .checkbox-label input[type="checkbox"]:checked + .checkbox-custom::after {
                content: '✓';
                color: white;
                font-size: 12px;
                font-weight: bold;
            }

            .checkbox-text {
                color: #9ca3af;
                font-size: 0.85rem;
                line-height: 1.4;
            }

            .checkbox-text a {
                color: #06b6d4;
                text-decoration: none;
            }

            .checkbox-text a:hover {
                text-decoration: underline;
            }

            .registration-submit-btn {
                width: 100%;
                padding: 1rem;
                background: linear-gradient(135deg, #c026d3, #db2777);
                border: none;
                border-radius: 0.75rem;
                color: white;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.5rem;
                margin-top: 0.5rem;
            }

            .registration-submit-btn:hover:not(:disabled) {
                transform: translateY(-2px);
                box-shadow: 0 10px 20px -5px rgba(192, 38, 211, 0.4);
            }

            .registration-submit-btn:disabled {
                opacity: 0.7;
                cursor: not-allowed;
            }

            .spinner {
                width: 20px;
                height: 20px;
                animation: spin 1s linear infinite;
            }

            .spinner-circle {
                stroke: white;
                stroke-dasharray: 60;
                stroke-dashoffset: 45;
            }

            @keyframes spin {
                100% { transform: rotate(360deg); }
            }

            /* Scrollbar personalizado */
            .registration-modal-content::-webkit-scrollbar {
                width: 8px;
            }

            .registration-modal-content::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.2);
                border-radius: 4px;
            }

            .registration-modal-content::-webkit-scrollbar-thumb {
                background: rgba(6, 182, 212, 0.5);
                border-radius: 4px;
            }

            .registration-modal-content::-webkit-scrollbar-thumb:hover {
                background: rgba(6, 182, 212, 0.7);
            }

            @media (max-width: 480px) {
                .registration-modal-content {
                    max-height: 95vh;
                    border-radius: 1rem;
                }

                .registration-modal-header {
                    padding: 1rem;
                }

                .registration-modal-body {
                    padding: 1rem;
                }

                .registration-modal-header h3 {
                    font-size: 1.25rem;
                }
            }
        </style>
    `;

    document.head.insertAdjacentHTML('beforeend', styles);
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    setupModalEventListeners();
}

function setupModalEventListeners() {
    const modal = document.getElementById('registration-modal');
    const closeBtn = document.getElementById('reg-modal-close');
    const form = document.getElementById('complete-registration-form');
    const togglePassword = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('reg-password');
    const confirmPasswordInput = document.getElementById('reg-confirm-password');
    const usernameInput = document.getElementById('reg-username');

    // Cerrar modal
    closeBtn.addEventListener('click', closeRegistrationModal);
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeRegistrationModal();
    });

    // Cerrar con Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.classList.contains('active')) {
            closeRegistrationModal();
        }
    });

    // Toggle visibilidad contraseña
    togglePassword.addEventListener('click', () => {
        const eyeIcon = document.getElementById('eye-icon');
        const eyeOffIcon = document.getElementById('eye-off-icon');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            eyeIcon.classList.add('hidden');
            eyeOffIcon.classList.remove('hidden');
        } else {
            passwordInput.type = 'password';
            eyeIcon.classList.remove('hidden');
            eyeOffIcon.classList.add('hidden');
        }
    });

    // Validación en tiempo real del username
    usernameInput.addEventListener('input', () => {
        const error = document.getElementById('username-error');
        if (usernameInput.value && !validateUsername(usernameInput.value)) {
            error.classList.remove('hidden');
        } else {
            error.classList.add('hidden');
        }
    });

    // Validación en tiempo real de la contraseña
    passwordInput.addEventListener('input', () => {
        const error = document.getElementById('password-error');
        if (passwordInput.value && !validatePassword(passwordInput.value)) {
            error.classList.remove('hidden');
        } else {
            error.classList.add('hidden');
        }
    });

    // Validación en tiempo real de confirmar contraseña
    confirmPasswordInput.addEventListener('input', () => {
        const error = document.getElementById('confirm-password-error');
        if (confirmPasswordInput.value && confirmPasswordInput.value !== passwordInput.value) {
            error.classList.remove('hidden');
        } else {
            error.classList.add('hidden');
        }
    });

    // Submit del formulario
    form.addEventListener('submit', handleCompleteRegistration);
}

function openRegistrationModal() {
    createRegistrationModal();
    
    const modal = document.getElementById('registration-modal');
    const form = document.getElementById('complete-registration-form');
    
    // Resetear formulario
    if (form) form.reset();
    
    // Ocultar errores
    document.querySelectorAll('.field-error').forEach(el => el.classList.add('hidden'));
    
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    
    // Focus en el primer campo
    setTimeout(() => {
        document.getElementById('reg-fullname').focus();
    }, 100);
}

function closeRegistrationModal() {
    const modal = document.getElementById('registration-modal');
    if (modal) {
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }
}

async function handleCompleteRegistration(event) {
    event.preventDefault();
    
    const submitBtn = document.getElementById('reg-submit-btn');
    const btnText = document.getElementById('reg-btn-text');
    const btnLoading = document.getElementById('reg-btn-loading');
    
    const fullname = document.getElementById('reg-fullname').value.trim();
    const username = document.getElementById('reg-username').value.trim().toLowerCase();
    const email = document.getElementById('reg-email').value.trim().toLowerCase();
    const password = document.getElementById('reg-password').value;
    const confirmPassword = document.getElementById('reg-confirm-password').value;
    const termsAccepted = document.getElementById('reg-terms').checked;

    // Validaciones
    if (!fullname || !username || !email || !password || !confirmPassword) {
        showMessage('Por favor, completa todos los campos.', 'error');
        return;
    }

    if (!validateUsername(username)) {
        showMessage('El nombre de usuario no es válido. Usa 3-20 caracteres (letras, números, guiones bajos).', 'error');
        return;
    }

    if (!validateEmail(email)) {
        showMessage('Por favor, introduce un correo electrónico válido.', 'error');
        return;
    }

    if (!validatePassword(password)) {
        showMessage('La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número.', 'error');
        return;
    }

    if (password !== confirmPassword) {
        showMessage('Las contraseñas no coinciden.', 'error');
        return;
    }

    if (!termsAccepted) {
        showMessage('Debes aceptar la Política de Privacidad y los Términos y Condiciones.', 'error');
        return;
    }

    // Mostrar loading
    submitBtn.disabled = true;
    btnText.classList.add('hidden');
    btnLoading.classList.remove('hidden');

    try {
        // Verificar si el email ya existe
        const emailExists = await checkEmailExists(email);
        if (emailExists) {
            showMessage('Este correo electrónico ya está registrado en la lista de espera.', 'error');
            submitBtn.disabled = false;
            btnText.classList.remove('hidden');
            btnLoading.classList.add('hidden');
            return;
        }

        // Verificar si el username ya existe
        const usernameExists = await checkUsernameExists(username);
        if (usernameExists) {
            showMessage('Este nombre de usuario ya está en uso. Por favor, elige otro.', 'error');
            submitBtn.disabled = false;
            btnText.classList.remove('hidden');
            btnLoading.classList.add('hidden');
            return;
        }

        // Guardar en Firestore
        await addDoc(collection(db, "waitlist"), {
            nombreCompleto: fullname,
            username: username,
            email: email,
            // NOTA: En producción, NUNCA guardes contraseñas en texto plano
            // Esto es solo temporal para la lista de espera
            // Cuando lances la app, usa Firebase Auth con hash de contraseñas
            passwordTemp: password,
            fechaRegistro: serverTimestamp(),
            estado: 'pendiente'
        });

        showMessage(`¡Bienvenido/a, ${fullname}! Te has registrado exitosamente en la lista de espera. 🎉`, 'success');
        
        // Cerrar modal
        closeRegistrationModal();

    } catch (error) {
        console.error('Error al guardar en Firebase:', error);
        showMessage('Error al completar el registro. Por favor, intenta de nuevo.', 'error');
    } finally {
        submitBtn.disabled = false;
        btnText.classList.remove('hidden');
        btnLoading.classList.add('hidden');
    }
}

// ========== INICIALIZACIÓN ==========
document.addEventListener('DOMContentLoaded', () => {
    // Pre-crear el modal para mejor rendimiento
    createRegistrationModal();

    // Botón del header "Únete Ahora"
    const headerRegisterBtn = document.getElementById('header-register-btn');
    if (headerRegisterBtn) {
        headerRegisterBtn.addEventListener('click', openRegistrationModal);
    }

    // Botón del hero "Encuentra tu Grupo de Fiesta"
    const heroRegisterBtn = document.getElementById('hero-register-btn');
    if (heroRegisterBtn) {
        heroRegisterBtn.addEventListener('click', openRegistrationModal);
    }

    // Botón principal "Registrarme en la Lista de Espera"
    const mainRegisterBtn = document.getElementById('main-register-btn');
    if (mainRegisterBtn) {
        mainRegisterBtn.addEventListener('click', openRegistrationModal);
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