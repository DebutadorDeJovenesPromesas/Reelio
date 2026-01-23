// ========== CONFIGURACIÓN FIREBASE ==========
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-analytics.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    sendPasswordResetEmail,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup,
    setPersistence,
    browserLocalPersistence,
    browserSessionPersistence
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc,
    serverTimestamp,
    query,
    where,
    collection,
    getDocs,
    updateDoc
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
// ========== NUEVO: IMPORTAR FIREBASE STORAGE ==========
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL,
    deleteObject
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-storage.js";

// ========== CONFIGURACIÓN DE FIREBASE ==========
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
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app); // ← NUEVO: Inicializar Storage
const googleProvider = new GoogleAuthProvider();

// ========== FUNCIONES DE UI ==========
const messageBox = document.getElementById('message-box');

function showMessage(message, type = 'success') {
    if (!messageBox) return;
    
    messageBox.textContent = message;
    messageBox.classList.remove('hidden', 'opacity-0', 'bg-red-600/20', 'text-red-400', 'bg-green-600/20', 'text-green-400', 'bg-yellow-600/20', 'text-yellow-400');
    messageBox.classList.add('opacity-100');
    
    if (type === 'success') {
        messageBox.classList.add('bg-green-600/20', 'text-green-400', 'border', 'border-green-600/50');
    } else if (type === 'warning') {
        messageBox.classList.add('bg-yellow-600/20', 'text-yellow-400', 'border', 'border-yellow-600/50');
    } else {
        messageBox.classList.add('bg-red-600/20', 'text-red-400', 'border', 'border-red-600/50');
    }

    setTimeout(() => {
        messageBox.classList.remove('opacity-100');
        messageBox.classList.add('opacity-0');
        setTimeout(() => messageBox.classList.add('hidden'), 300);
    }, 4000);
}

function setLoading(buttonId, isLoading) {
    const btn = document.getElementById(buttonId);
    const btnText = document.getElementById(`${buttonId}-text`);
    const btnSpinner = document.getElementById(`${buttonId}-spinner`);
    
    if (btn && btnText && btnSpinner) {
        btn.disabled = isLoading;
        btnText.classList.toggle('hidden', isLoading);
        btnSpinner.classList.toggle('hidden', !isLoading);
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

function getPasswordStrength(password) {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[@$!%*?&]/.test(password)) strength++;
    return strength;
}

// ========== VERIFICACIONES EN FIRESTORE ==========
async function checkUsernameExists(username) {
    try {
        const q = query(collection(db, "users"), where("username", "==", username.toLowerCase()));
        const querySnapshot = await getDocs(q);
        return !querySnapshot.empty;
    } catch (error) {
        console.error('Error al verificar username:', error);
        return false;
    }
}

// ========== FUNCIONES DE AUTENTICACIÓN ==========

// Crear perfil de usuario en Firestore
async function createUserProfile(user, additionalData = {}) {
    const userRef = doc(db, "users", user.uid);
    
    const userData = {
        uid: user.uid,
        email: user.email,
        nombreCompleto: additionalData.nombreCompleto || user.displayName || '',
        username: additionalData.username || '',
        photoURL: user.photoURL || '',
        fechaRegistro: serverTimestamp(),
        ultimoAcceso: serverTimestamp(),
        estado: 'activo',
        rol: 'usuario' // Puede ser 'usuario', 'admin', 'moderador', etc.
    };

    await setDoc(userRef, userData, { merge: true });
    return userData;
}

// Obtener perfil de usuario
async function getUserProfile(uid) {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
        return userSnap.data();
    }
    return null;
}

// Actualizar último acceso
async function updateLastAccess(uid) {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, { ultimoAcceso: serverTimestamp() }, { merge: true });
}

// ========== FUNCIONES DE STORAGE (NUEVO) ==========

/**
 * Comprime una imagen antes de subirla
 * @param {File} file - El archivo de imagen original
 * @param {number} maxWidth - Ancho máximo de la imagen
 * @param {number} quality - Calidad de la compresión (0-1)
 * @returns {Promise<Blob>} - Blob de la imagen comprimida
 */
async function compressImage(file, maxWidth = 500, quality = 0.8) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                
                // Calcular nuevo tamaño manteniendo proporción
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                
                canvas.width = width;
                canvas.height = height;
                
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error('Error al comprimir la imagen'));
                        }
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = () => reject(new Error('Error al cargar la imagen'));
        };
        reader.onerror = () => reject(new Error('Error al leer el archivo'));
    });
}

/**
 * Sube la foto de perfil de un usuario a Firebase Storage
 * @param {File} file - El archivo de imagen a subir
 * @param {string} uid - El UID del usuario
 * @returns {Promise<{success: boolean, downloadURL?: string, error?: string}>}
 */
async function uploadProfilePhoto(file, uid) {
    try {
        // Validar que sea una imagen
        if (!file.type.startsWith('image/')) {
            return { success: false, error: 'El archivo debe ser una imagen.' };
        }

        // Validar tamaño máximo (5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            return { success: false, error: 'La imagen no debe superar los 5MB.' };
        }

        // Comprimir la imagen
        let imageToUpload;
        try {
            imageToUpload = await compressImage(file, 500, 0.8);
        } catch (compressError) {
            console.warn('No se pudo comprimir, subiendo original:', compressError);
            imageToUpload = file;
        }

        // Crear referencia en Storage: usuarios/{uid}/avatar.jpg
        const storageRef = ref(storage, `usuarios/${uid}/avatar.jpg`);

        // Subir el archivo
        const snapshot = await uploadBytes(storageRef, imageToUpload, {
            contentType: 'image/jpeg'
        });

        // Obtener la URL de descarga
        const downloadURL = await getDownloadURL(snapshot.ref);

        // Actualizar el documento del usuario en Firestore
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
            photoURL: downloadURL,
            photoUpdatedAt: serverTimestamp()
        });

        // También actualizar el perfil de Auth (opcional pero recomendado)
        if (auth.currentUser) {
            await updateProfile(auth.currentUser, {
                photoURL: downloadURL
            });
        }

        return { success: true, downloadURL };

    } catch (error) {
        console.error('Error al subir foto de perfil:', error);
        
        // Mensajes de error específicos
        let errorMessage = 'Error al subir la imagen.';
        if (error.code === 'storage/unauthorized') {
            errorMessage = 'No tienes permiso para subir archivos.';
        } else if (error.code === 'storage/canceled') {
            errorMessage = 'Subida cancelada.';
        } else if (error.code === 'storage/retry-limit-exceeded') {
            errorMessage = 'Error de conexión. Inténtalo de nuevo.';
        }
        
        return { success: false, error: errorMessage };
    }
}

/**
 * Elimina la foto de perfil actual del usuario
 * @param {string} uid - El UID del usuario
 * @returns {Promise<{success: boolean, error?: string}>}
 */
async function deleteProfilePhoto(uid) {
    try {
        // Referencia al archivo
        const storageRef = ref(storage, `usuarios/${uid}/avatar.jpg`);
        
        // Intentar eliminar
        await deleteObject(storageRef);
        
        // Actualizar Firestore
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
            photoURL: '',
            photoUpdatedAt: serverTimestamp()
        });

        // Actualizar Auth
        if (auth.currentUser) {
            await updateProfile(auth.currentUser, {
                photoURL: ''
            });
        }

        return { success: true };
    } catch (error) {
        console.error('Error al eliminar foto:', error);
        
        // Si el archivo no existe, no es un error real
        if (error.code === 'storage/object-not-found') {
            return { success: true };
        }
        
        return { success: false, error: 'Error al eliminar la foto.' };
    }
}

// ========== FIN FUNCIONES DE STORAGE ==========

// Registro con email y contraseña
async function registerWithEmail(email, password, fullname, username) {
    try {
        // Verificar si el username ya existe
        const usernameExists = await checkUsernameExists(username);
        if (usernameExists) {
            throw new Error('Este nombre de usuario ya está en uso.');
        }

        // Crear usuario en Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Actualizar perfil con nombre
        await updateProfile(user, {
            displayName: fullname
        });

        // Crear perfil en Firestore
        await createUserProfile(user, {
            nombreCompleto: fullname,
            username: username.toLowerCase()
        });

        return { success: true, user };
    } catch (error) {
        console.error('Error en registro:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

// Login con email y contraseña
async function loginWithEmail(email, password, rememberMe = false) {
    try {
        // Configurar persistencia según "recordarme"
        const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistence);

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Actualizar último acceso
        await updateLastAccess(user.uid);

        return { success: true, user };
    } catch (error) {
        console.error('Error en login:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

// Login con Google
async function loginWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        // Verificar si el usuario ya tiene perfil
        const existingProfile = await getUserProfile(user.uid);
        
        if (!existingProfile) {
            // Usuario nuevo de Google - necesita elegir username
            return { success: true, user, needsUsername: true };
        } else {
            await updateLastAccess(user.uid);
            return { success: true, user, needsUsername: false };
        }
    } catch (error) {
        console.error('Error en login con Google:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

// Crear perfil para usuario de Google (después de elegir username)
async function createGoogleUserProfile(user, username) {
    try {
        // Verificar si el username ya existe
        const usernameExists = await checkUsernameExists(username);
        if (usernameExists) {
            return { success: false, error: 'Este nombre de usuario ya está en uso.' };
        }

        await createUserProfile(user, {
            nombreCompleto: user.displayName || '',
            username: username.toLowerCase()
        });

        return { success: true };
    } catch (error) {
        console.error('Error al crear perfil de Google:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

// Recuperar contraseña
async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true };
    } catch (error) {
        console.error('Error al enviar email de recuperación:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

// Cerrar sesión
async function logout() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

// Traducir errores de Firebase
function getErrorMessage(error) {
    const errorMessages = {
        'auth/email-already-in-use': 'Este correo electrónico ya está registrado.',
        'auth/invalid-email': 'El correo electrónico no es válido.',
        'auth/operation-not-allowed': 'Operación no permitida.',
        'auth/weak-password': 'La contraseña es demasiado débil.',
        'auth/user-disabled': 'Esta cuenta ha sido deshabilitada.',
        'auth/user-not-found': 'No existe una cuenta con este correo electrónico.',
        'auth/wrong-password': 'Contraseña incorrecta.',
        'auth/invalid-credential': 'Credenciales inválidas. Verifica tu email y contraseña.',
        'auth/too-many-requests': 'Demasiados intentos. Por favor, espera unos minutos.',
        'auth/popup-closed-by-user': 'Se cerró la ventana de inicio de sesión.',
        'auth/network-request-failed': 'Error de conexión. Verifica tu internet.'
    };

    return errorMessages[error.code] || error.message || 'Ha ocurrido un error inesperado.';
}

// ========== OBSERVER DE AUTENTICACIÓN ==========
onAuthStateChanged(auth, async (user) => {
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('index.html') || currentPath.endsWith('/') || currentPath === '';
    const isAppPage = currentPath.includes('app.html');
    
    if (user) {
        // Usuario autenticado
        console.log('Usuario autenticado:', user.email);
        
        // Verificar si tiene perfil completo (con username)
        const profile = await getUserProfile(user.uid);
        
        if (isLoginPage && profile && profile.username) {
            // Tiene perfil completo, redirigir a app
            window.location.replace('./app.html');
        }
    } else {
        // Usuario no autenticado
        console.log('Usuario no autenticado');
        
        // Si estamos en app.html, redirigir a login
        if (isAppPage) {
            window.location.replace('./index.html');
        }
    }
});

// ========== EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', () => {
    // Tabs
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');

    if (tabLogin && tabRegister) {
        tabLogin.addEventListener('click', () => {
            tabLogin.classList.add('active', 'text-white');
            tabLogin.classList.remove('text-gray-400');
            tabRegister.classList.remove('active', 'text-white');
            tabRegister.classList.add('text-gray-400');
            loginForm.classList.remove('hidden');
            registerForm.classList.add('hidden');
        });

        tabRegister.addEventListener('click', () => {
            tabRegister.classList.add('active', 'text-white');
            tabRegister.classList.remove('text-gray-400');
            tabLogin.classList.remove('active', 'text-white');
            tabLogin.classList.add('text-gray-400');
            registerForm.classList.remove('hidden');
            loginForm.classList.add('hidden');
        });
    }

    // Validación de username en tiempo real
    const usernameInput = document.getElementById('reg-username');
    const usernameHint = document.getElementById('username-hint');
    const usernameError = document.getElementById('username-error');
    const usernameSuccess = document.getElementById('username-success');

    if (usernameInput) {
        usernameInput.addEventListener('input', () => {
            const username = usernameInput.value.trim();
            
            if (username.length === 0) {
                usernameHint.classList.remove('hidden');
                usernameError.classList.add('hidden');
                usernameSuccess.classList.add('hidden');
            } else if (!validateUsername(username)) {
                usernameHint.classList.add('hidden');
                usernameError.classList.remove('hidden');
                usernameSuccess.classList.add('hidden');
                
                // Mensaje específico según el error
                if (username.length < 3) {
                    usernameError.textContent = '✗ Mínimo 3 caracteres';
                } else if (username.length > 20) {
                    usernameError.textContent = '✗ Máximo 20 caracteres';
                } else {
                    usernameError.textContent = '✗ Solo letras, números y guiones bajos (_)';
                }
            } else {
                usernameHint.classList.add('hidden');
                usernameError.classList.add('hidden');
                usernameSuccess.classList.remove('hidden');
            }
        });
    }

    // Toggle password visibility - Login
    const toggleLoginPassword = document.getElementById('toggle-login-password');
    const loginPasswordInput = document.getElementById('login-password');
    const loginEye = document.getElementById('login-eye');
    const loginEyeOff = document.getElementById('login-eye-off');

    if (toggleLoginPassword) {
        toggleLoginPassword.addEventListener('click', () => {
            const type = loginPasswordInput.type === 'password' ? 'text' : 'password';
            loginPasswordInput.type = type;
            loginEye.classList.toggle('hidden');
            loginEyeOff.classList.toggle('hidden');
        });
    }

    // Toggle password visibility - Register
    const toggleRegPassword = document.getElementById('toggle-reg-password');
    const regPasswordInput = document.getElementById('reg-password');
    const regEye = document.getElementById('reg-eye');
    const regEyeOff = document.getElementById('reg-eye-off');

    if (toggleRegPassword) {
        toggleRegPassword.addEventListener('click', () => {
            const type = regPasswordInput.type === 'password' ? 'text' : 'password';
            regPasswordInput.type = type;
            regEye.classList.toggle('hidden');
            regEyeOff.classList.toggle('hidden');
        });
    }

    // Password strength indicator con checks visuales
    const passwordStrengthBar = document.getElementById('password-strength');

    // Función para actualizar requisitos visuales
    function updatePasswordRequirements(password) {
        const requirements = {
            'req-length': password.length >= 8,
            'req-upper': /[A-Z]/.test(password),
            'req-lower': /[a-z]/.test(password),
            'req-number': /\d/.test(password),
            'req-chars': /^[a-zA-Z\d@$!%*?&]*$/.test(password) && password.length > 0
        };

        for (const [id, passed] of Object.entries(requirements)) {
            const element = document.getElementById(id);
            if (element) {
                const icon = element.querySelector('.req-icon');
                if (passed) {
                    element.classList.remove('text-gray-500', 'text-red-400');
                    element.classList.add('text-green-400');
                    icon.textContent = '✓';
                } else if (password.length > 0) {
                    element.classList.remove('text-gray-500', 'text-green-400');
                    element.classList.add('text-red-400');
                    icon.textContent = '✗';
                } else {
                    element.classList.remove('text-green-400', 'text-red-400');
                    element.classList.add('text-gray-500');
                    icon.textContent = '○';
                }
            }
        }

        return Object.values(requirements).filter(Boolean).length;
    }

    if (regPasswordInput && passwordStrengthBar) {
        regPasswordInput.addEventListener('input', () => {
            const password = regPasswordInput.value;
            const passedCount = updatePasswordRequirements(password);
            
            passwordStrengthBar.className = 'password-strength';
            
            if (password.length === 0) {
                passwordStrengthBar.style.width = '0%';
            } else if (passedCount <= 2) {
                passwordStrengthBar.classList.add('strength-weak');
            } else if (passedCount <= 4) {
                passwordStrengthBar.classList.add('strength-medium');
            } else {
                passwordStrengthBar.classList.add('strength-strong');
            }
        });
    }

    // Password match validation
    const confirmPasswordInput = document.getElementById('reg-confirm-password');
    const passwordMatchError = document.getElementById('password-match-error');

    if (confirmPasswordInput && regPasswordInput) {
        confirmPasswordInput.addEventListener('input', () => {
            if (confirmPasswordInput.value && confirmPasswordInput.value !== regPasswordInput.value) {
                passwordMatchError.classList.remove('hidden');
            } else {
                passwordMatchError.classList.add('hidden');
            }
        });
    }

    // Login form submit
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-password').value;
            const rememberMe = document.getElementById('remember-me').checked;

            if (!validateEmail(email)) {
                showMessage('Por favor, introduce un correo electrónico válido.', 'error');
                return;
            }

            setLoading('login-btn', true);

            const result = await loginWithEmail(email, password, rememberMe);

            if (result.success) {
                showMessage('¡Bienvenido de nuevo! Redirigiendo...', 'success');
                // La redirección se maneja en onAuthStateChanged
            } else {
                showMessage(result.error, 'error');
                setLoading('login-btn', false);
            }
        });
    }

    // Register form submit
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fullname = document.getElementById('reg-fullname').value.trim();
            const username = document.getElementById('reg-username').value.trim().toLowerCase();
            const email = document.getElementById('reg-email').value.trim();
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

            setLoading('register-btn', true);

            const result = await registerWithEmail(email, password, fullname, username);

            if (result.success) {
                showMessage('¡Cuenta creada exitosamente! Redirigiendo...', 'success');
                // La redirección se maneja en onAuthStateChanged
            } else {
                showMessage(result.error, 'error');
                setLoading('register-btn', false);
            }
        });
    }

    // Google login
    const googleLoginBtn = document.getElementById('google-login-btn');
    const usernameModal = document.getElementById('username-modal');
    const usernameForm = document.getElementById('username-form');
    const googleUsernameInput = document.getElementById('google-username');
    const googleUsernameError = document.getElementById('google-username-error');
    const googleUsernameSuccess = document.getElementById('google-username-success');
    const googleUsernameHint = document.getElementById('google-username-hint');
    const googleUserNameDisplay = document.getElementById('google-user-name');
    const googleUserEmailDisplay = document.getElementById('google-user-email');
    const googleUserPhotoDisplay = document.getElementById('google-user-photo');
    
    let currentGoogleUser = null; // Para guardar el usuario de Google temporalmente

    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            const result = await loginWithGoogle();
            
            if (result.success) {
                if (result.needsUsername) {
                    // Mostrar modal para elegir username
                    currentGoogleUser = result.user;
                    
                    // Mostrar nombre del usuario
                    const displayName = result.user.displayName || 'Usuario';
                    const firstName = displayName.split(' ')[0];
                    googleUserNameDisplay.textContent = firstName;
                    
                    // Mostrar email
                    if (googleUserEmailDisplay) {
                        googleUserEmailDisplay.textContent = result.user.email || '';
                    }
                    
                    // Mostrar foto de Google si existe
                    if (googleUserPhotoDisplay && result.user.photoURL) {
                        googleUserPhotoDisplay.innerHTML = `<img src="${result.user.photoURL}" class="w-full h-full rounded-full object-cover" alt="Foto de perfil">`;
                    }
                    
                    usernameModal.classList.remove('hidden');
                    googleUsernameInput.focus();
                } else {
                    showMessage('¡Bienvenido! Redirigiendo...', 'success');
                    window.location.replace('./app.html');
                }
            } else {
                showMessage(result.error, 'error');
            }
        });
    }

    // Validación de username en modal de Google con feedback visual mejorado
    if (googleUsernameInput) {
        googleUsernameInput.addEventListener('input', () => {
            const username = googleUsernameInput.value.trim();
            
            // Ocultar todos los mensajes primero
            if (googleUsernameError) googleUsernameError.classList.add('hidden');
            if (googleUsernameSuccess) googleUsernameSuccess.classList.add('hidden');
            if (googleUsernameHint) googleUsernameHint.classList.remove('hidden');
            
            if (username.length === 0) {
                // Campo vacío, mostrar hint
                return;
            }
            
            if (!validateUsername(username)) {
                // Username inválido
                if (googleUsernameHint) googleUsernameHint.classList.add('hidden');
                if (googleUsernameError) {
                    googleUsernameError.classList.remove('hidden');
                    const errorText = googleUsernameError.querySelector('span');
                    if (errorText) {
                        if (username.length < 3) {
                            errorText.textContent = 'Mínimo 3 caracteres';
                        } else if (username.length > 20) {
                            errorText.textContent = 'Máximo 20 caracteres';
                        } else {
                            errorText.textContent = 'Solo letras, números y guiones bajos (_)';
                        }
                    }
                }
            } else {
                // Username válido
                if (googleUsernameHint) googleUsernameHint.classList.add('hidden');
                if (googleUsernameSuccess) googleUsernameSuccess.classList.remove('hidden');
            }
        });
    }

    // Submit del formulario de username (Google)
    if (usernameForm) {
        usernameForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = googleUsernameInput.value.trim().toLowerCase();
            
            if (!validateUsername(username)) {
                showMessage('Nombre de usuario no válido.', 'error');
                return;
            }
            
            setLoading('save-username-btn', true);
            
            const result = await createGoogleUserProfile(currentGoogleUser, username);
            
            if (result.success) {
                showMessage('¡Registro completado! Redirigiendo...', 'success');
                usernameModal.classList.add('hidden');
                window.location.replace('./app.html');
            } else {
                showMessage(result.error, 'error');
                setLoading('save-username-btn', false);
            }
        });
    }

    // Forgot password modal
    const forgotPasswordBtn = document.getElementById('forgot-password-btn');
    const forgotPasswordModal = document.getElementById('forgot-password-modal');
    const closeForgotModal = document.getElementById('close-forgot-modal');
    const forgotPasswordForm = document.getElementById('forgot-password-form');

    if (forgotPasswordBtn && forgotPasswordModal) {
        forgotPasswordBtn.addEventListener('click', () => {
            forgotPasswordModal.classList.remove('hidden');
        });

        closeForgotModal.addEventListener('click', () => {
            forgotPasswordModal.classList.add('hidden');
        });

        forgotPasswordModal.addEventListener('click', (e) => {
            if (e.target === forgotPasswordModal) {
                forgotPasswordModal.classList.add('hidden');
            }
        });

        forgotPasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('forgot-email').value.trim();

            if (!validateEmail(email)) {
                showMessage('Por favor, introduce un correo electrónico válido.', 'error');
                return;
            }

            setLoading('send-reset-btn', true);

            const result = await resetPassword(email);

            if (result.success) {
                showMessage('Se ha enviado un enlace de recuperación a tu correo.', 'success');
                forgotPasswordModal.classList.add('hidden');
                forgotPasswordForm.reset();
            } else {
                showMessage(result.error, 'error');
            }

            setLoading('send-reset-btn', false);
        });
    }
});

// Exportar funciones para uso en otras páginas
export { 
    auth, 
    db, 
    storage,
    logout, 
    getUserProfile, 
    onAuthStateChanged, 
    createGoogleUserProfile, 
    checkUsernameExists,
    uploadProfilePhoto,
    deleteProfilePhoto
};