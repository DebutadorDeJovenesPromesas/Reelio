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
    updateDoc,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL,
    deleteObject,
    listAll
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
const storage = getStorage(app);
const googleProvider = new GoogleAuthProvider();

// ========== FUNCIONES DE UI ==========
const messageBox = document.getElementById('message-box');

function showMessage(message, type = 'success') {
    if (!messageBox) return;
    
    messageBox.textContent = message;
    messageBox.classList.remove('hidden', 'opacity-0', 'bg-red-600/20', 'text-red-400', 'bg-green-600/20', 'text-green-400', 'bg-yellow-600/20', 'text-yellow-400', 'bg-blue-600/20', 'text-blue-400');
    messageBox.classList.add('opacity-100');
    
    const styles = {
        success: ['bg-green-600/20', 'text-green-400', 'border', 'border-green-600/50'],
        warning: ['bg-yellow-600/20', 'text-yellow-400', 'border', 'border-yellow-600/50'],
        error: ['bg-red-600/20', 'text-red-400', 'border', 'border-red-600/50'],
        info: ['bg-blue-600/20', 'text-blue-400', 'border', 'border-blue-600/50']
    };
    
    messageBox.classList.add(...(styles[type] || styles.error));

    setTimeout(() => {
        messageBox.classList.remove('opacity-100');
        messageBox.classList.add('opacity-0');
        setTimeout(() => messageBox.classList.add('hidden'), 300);
    }, 4000);
}

function setLoading(buttonId, isLoading) {
    const btn = document.getElementById(buttonId);
    const btnText = document.getElementById(buttonId + '-text');
    const btnSpinner = document.getElementById(buttonId + '-spinner');
    
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
    const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d@$!%*?&]{8,}$/;
    return re.test(password);
}

function validateUsername(username) {
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
        rol: 'usuario'
    };

    await setDoc(userRef, userData, { merge: true });
    return userData;
}

async function getUserProfile(uid) {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
        return userSnap.data();
    }
    return null;
}

async function updateLastAccess(uid) {
    const userRef = doc(db, "users", uid);
    await setDoc(userRef, { ultimoAcceso: serverTimestamp() }, { merge: true });
}

// ========== FUNCIONES DE STORAGE ==========
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

async function uploadProfilePhoto(file, uid) {
    try {
        if (!file.type.startsWith('image/')) {
            return { success: false, error: 'El archivo debe ser una imagen.' };
        }

        const maxSize = 5 * 1024 * 1024;
        if (file.size > maxSize) {
            return { success: false, error: 'La imagen no debe superar los 5MB.' };
        }

        let imageToUpload;
        try {
            imageToUpload = await compressImage(file, 500, 0.8);
        } catch (compressError) {
            console.warn('No se pudo comprimir, subiendo original:', compressError);
            imageToUpload = file;
        }

        const storageRef = ref(storage, 'usuarios/' + uid + '/avatar.jpg');
        const snapshot = await uploadBytes(storageRef, imageToUpload, {
            contentType: 'image/jpeg'
        });

        const downloadURL = await getDownloadURL(snapshot.ref);

        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
            photoURL: downloadURL,
            photoUpdatedAt: serverTimestamp()
        });

        if (auth.currentUser) {
            await updateProfile(auth.currentUser, {
                photoURL: downloadURL
            });
        }

        return { success: true, downloadURL };

    } catch (error) {
        console.error('Error al subir foto de perfil:', error);
        
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

async function deleteProfilePhoto(uid) {
    try {
        const storageRef = ref(storage, 'usuarios/' + uid + '/avatar.jpg');
        await deleteObject(storageRef);
        
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
            photoURL: '',
            photoUpdatedAt: serverTimestamp()
        });

        if (auth.currentUser) {
            await updateProfile(auth.currentUser, {
                photoURL: ''
            });
        }

        return { success: true };
    } catch (error) {
        console.error('Error al eliminar foto:', error);
        
        if (error.code === 'storage/object-not-found') {
            return { success: true };
        }
        
        return { success: false, error: 'Error al eliminar la foto.' };
    }
}

async function deleteAllUserData(uid) {
    try {
        console.log('Iniciando eliminación de datos del usuario:', uid);
        
        try {
            const userStorageRef = ref(storage, 'usuarios/' + uid);
            const filesList = await listAll(userStorageRef);
            
            const deletePromises = filesList.items.map(item => deleteObject(item));
            await Promise.all(deletePromises);
            
            console.log('Eliminados ' + filesList.items.length + ' archivos de Storage');
        } catch (storageError) {
            if (storageError.code !== 'storage/object-not-found') {
                console.warn('Error al eliminar archivos de Storage:', storageError);
            }
        }
        
        try {
            const userRef = doc(db, "users", uid);
            await deleteDoc(userRef);
            console.log('Documento de usuario eliminado de Firestore');
        } catch (firestoreError) {
            console.error('Error al eliminar documento de Firestore:', firestoreError);
            throw firestoreError;
        }
        
        return { success: true };
        
    } catch (error) {
        console.error('Error al eliminar datos del usuario:', error);
        return { success: false, error: 'Error al eliminar los datos del usuario.' };
    }
}

async function deleteUserAccount() {
    try {
        const user = auth.currentUser;
        
        if (!user) {
            return { success: false, error: 'No hay usuario autenticado.' };
        }
        
        const uid = user.uid;
        
        const deleteDataResult = await deleteAllUserData(uid);
        
        if (!deleteDataResult.success) {
            console.warn('Advertencia: No se pudieron eliminar todos los datos:', deleteDataResult.error);
        }
        
        await user.delete();
        
        console.log('Cuenta de usuario eliminada completamente');
        return { success: true };
        
    } catch (error) {
        console.error('Error al eliminar cuenta:', error);
        
        let errorMessage = 'Error al eliminar la cuenta.';
        if (error.code === 'auth/requires-recent-login') {
            errorMessage = 'Por seguridad, necesitas volver a iniciar sesión antes de eliminar tu cuenta.';
        }
        
        return { success: false, error: errorMessage };
    }
}

// ========== FUNCIONES DE REGISTRO Y LOGIN ==========
async function registerWithEmail(email, password, fullname, username) {
    try {
        const usernameExists = await checkUsernameExists(username);
        if (usernameExists) {
            throw new Error('Este nombre de usuario ya está en uso.');
        }

        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateProfile(user, {
            displayName: fullname
        });

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

async function loginWithEmail(email, password, rememberMe = false) {
    try {
        const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
        await setPersistence(auth, persistence);

        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await updateLastAccess(user.uid);

        return { success: true, user };
    } catch (error) {
        console.error('Error en login:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

async function loginWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;

        const existingProfile = await getUserProfile(user.uid);
        
        if (!existingProfile) {
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

async function createGoogleUserProfile(user, username) {
    try {
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

async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email);
        return { success: true };
    } catch (error) {
        console.error('Error al enviar email de recuperación:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

async function logout() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        console.error('Error al cerrar sesión:', error);
        return { success: false, error: getErrorMessage(error) };
    }
}

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
let isRedirecting = false;

onAuthStateChanged(auth, async (user) => {
    if (isRedirecting) return;
    
    const currentPath = window.location.pathname;
    const isLoginPage = currentPath.includes('index.html') || currentPath.endsWith('/') || currentPath === '';
    const isAppPage = currentPath.includes('app.html');
    
    if (user) {
        console.log('Usuario autenticado:', user.email);
        
        const profile = await getUserProfile(user.uid);
        
        if (isLoginPage && profile && profile.username) {
            isRedirecting = true;
            showMessage('¡Bienvenido de nuevo! Redirigiendo...', 'success');
            setTimeout(() => {
                window.location.replace('./app.html');
            }, 500);
        }
    } else {
        console.log('Usuario no autenticado');
        
        if (isAppPage) {
            isRedirecting = true;
            window.location.replace('./index.html');
        }
    }
});

// ========== EVENT LISTENERS ==========
document.addEventListener('DOMContentLoaded', () => {
    const tabLogin = document.getElementById('tab-login');
    const tabRegister = document.getElementById('tab-register');
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const googleUsernameInput = document.getElementById('google-username');
    const googleUsernameError = document.getElementById('google-username-error');
    const googleUsernameSuccess = document.getElementById('google-username-success');
    const googleUsernameHint = document.getElementById('google-username-hint');

    // ========== TABS ==========
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

    // ========== VALIDACIÓN DE USERNAME EN TIEMPO REAL ==========
    const usernameInput = document.getElementById('reg-username');
    const usernameHint = document.getElementById('username-hint');
    const usernameError = document.getElementById('username-error');
    const usernameSuccess = document.getElementById('username-success');
    
    let usernameCheckTimeout = null;
    let lastCheckedUsername = '';

    if (usernameInput) {
        usernameInput.addEventListener('input', async () => {
            const username = usernameInput.value.trim().toLowerCase();
            
            if (usernameCheckTimeout) {
                clearTimeout(usernameCheckTimeout);
            }
            
            usernameInput.classList.remove('border-green-500', 'border-red-500', 'border-yellow-500');
            usernameInput.classList.add('border-gray-600');
            
            if (username.length === 0) {
                usernameHint.textContent = '3-20 caracteres. Solo letras, números y guiones bajos (_)';
                usernameHint.classList.remove('hidden', 'text-yellow-400');
                usernameHint.classList.add('text-gray-500');
                usernameError.classList.add('hidden');
                usernameSuccess.classList.add('hidden');
                return;
            }
            
            if (!validateUsername(username)) {
                usernameHint.classList.add('hidden');
                usernameSuccess.classList.add('hidden');
                usernameError.classList.remove('hidden');
                usernameInput.classList.remove('border-gray-600');
                usernameInput.classList.add('border-red-500');
                
                if (username.length < 3) {
                    usernameError.innerHTML = '<span class="flex items-center gap-1"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> Mínimo 3 caracteres</span>';
                } else if (username.length > 20) {
                    usernameError.innerHTML = '<span class="flex items-center gap-1"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> Máximo 20 caracteres</span>';
                } else {
                    usernameError.innerHTML = '<span class="flex items-center gap-1"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> Solo letras, números y guiones bajos (_)</span>';
                }
            } else {
                usernameError.classList.add('hidden');
                usernameSuccess.classList.add('hidden');
                usernameHint.classList.remove('hidden', 'text-gray-500');
                usernameHint.classList.add('text-yellow-400');
                usernameHint.innerHTML = '<span class="flex items-center gap-1"><svg class="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg> Verificando disponibilidad...</span>';
                usernameInput.classList.remove('border-gray-600');
                usernameInput.classList.add('border-yellow-500');
                
                usernameCheckTimeout = setTimeout(async () => {
                    if (username === lastCheckedUsername) return;
                    lastCheckedUsername = username;
                    
                    try {
                        const exists = await checkUsernameExists(username);
                        
                        if (usernameInput.value.trim().toLowerCase() !== username) return;
                        
                        usernameHint.classList.add('hidden');
                        usernameInput.classList.remove('border-yellow-500');
                        
                        if (exists) {
                            usernameError.innerHTML = '<span class="flex items-center gap-1"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> Este nombre de usuario ya está en uso</span>';
                            usernameError.classList.remove('hidden');
                            usernameSuccess.classList.add('hidden');
                            usernameInput.classList.add('border-red-500');
                        } else {
                            usernameSuccess.innerHTML = '<span class="flex items-center gap-1"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> ¡Nombre de usuario disponible!</span>';
                            usernameSuccess.classList.remove('hidden');
                            usernameError.classList.add('hidden');
                            usernameInput.classList.add('border-green-500');
                        }
                    } catch (error) {
                        console.error('Error verificando username:', error);
                        usernameHint.textContent = '3-20 caracteres. Solo letras, números y guiones bajos (_)';
                        usernameHint.classList.remove('hidden', 'text-yellow-400');
                        usernameHint.classList.add('text-gray-500');
                        usernameInput.classList.remove('border-yellow-500');
                        usernameInput.classList.add('border-gray-600');
                    }
                }, 500);
            }
        });
    }

    // ========== VALIDACIÓN DE EMAIL EN TIEMPO REAL ==========
    const emailInput = document.getElementById('reg-email');
    const emailHint = document.getElementById('email-hint');
    const emailError = document.getElementById('email-error');
    const emailSuccess = document.getElementById('email-success');
    
    if (emailInput) {
        emailInput.addEventListener('input', () => {
            const email = emailInput.value.trim();
            
            emailInput.classList.remove('border-green-500', 'border-red-500');
            emailInput.classList.add('border-gray-600');
            
            if (emailHint) emailHint.classList.add('hidden');
            if (emailError) emailError.classList.add('hidden');
            if (emailSuccess) emailSuccess.classList.add('hidden');
            
            if (email.length === 0) return;
            
            if (!validateEmail(email)) {
                emailInput.classList.remove('border-gray-600');
                emailInput.classList.add('border-red-500');
                if (emailError) {
                    emailError.innerHTML = '<span class="flex items-center gap-1 text-red-400"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> Correo electrónico no válido</span>';
                    emailError.classList.remove('hidden');
                }
            } else {
                emailInput.classList.remove('border-gray-600');
                emailInput.classList.add('border-green-500');
                if (emailSuccess) {
                    emailSuccess.innerHTML = '<span class="flex items-center gap-1 text-green-400"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Email válido</span>';
                    emailSuccess.classList.remove('hidden');
                }
            }
        });
    }

    // ========== VALIDACIÓN DE CONTRASEÑA EN TIEMPO REAL ==========
    const regPasswordInput = document.getElementById('reg-password');
    const passwordStrengthBar = document.getElementById('password-strength');
    const passwordStrengthText = document.getElementById('password-strength-text');
    
    function updatePasswordRequirements(password) {
        const requirements = {
            'req-length': password.length >= 8,
            'req-upper': /[A-Z]/.test(password),
            'req-lower': /[a-z]/.test(password),
            'req-number': /\d/.test(password),
            'req-chars': /^[a-zA-Z\d@$!%*?&]*$/.test(password) && password.length > 0
        };

        let passedCount = 0;

        for (const [id, passed] of Object.entries(requirements)) {
            const element = document.getElementById(id);
            if (element) {
                const icon = element.querySelector('.req-icon');
                if (passed) {
                    element.classList.remove('text-gray-500', 'text-red-400');
                    element.classList.add('text-green-400');
                    if (icon) icon.textContent = '✓';
                    passedCount++;
                } else if (password.length > 0) {
                    element.classList.remove('text-gray-500', 'text-green-400');
                    element.classList.add('text-red-400');
                    if (icon) icon.textContent = '✗';
                } else {
                    element.classList.remove('text-green-400', 'text-red-400');
                    element.classList.add('text-gray-500');
                    if (icon) icon.textContent = '○';
                }
            }
        }

        return passedCount;
    }

    if (regPasswordInput && passwordStrengthBar) {
        regPasswordInput.addEventListener('input', () => {
            const password = regPasswordInput.value;
            const passedCount = updatePasswordRequirements(password);
            
            passwordStrengthBar.className = 'password-strength';
            
            regPasswordInput.classList.remove('border-green-500', 'border-red-500', 'border-yellow-500');
            regPasswordInput.classList.add('border-gray-600');
            
            if (password.length === 0) {
                passwordStrengthBar.style.width = '0%';
                passwordStrengthBar.style.background = '#374151';
            } else if (passedCount <= 2) {
                passwordStrengthBar.classList.add('strength-weak');
                passwordStrengthBar.style.width = '33%';
                passwordStrengthBar.style.background = '#ef4444';
                regPasswordInput.classList.remove('border-gray-600');
                regPasswordInput.classList.add('border-red-500');
            } else if (passedCount <= 4) {
                passwordStrengthBar.classList.add('strength-medium');
                passwordStrengthBar.style.width = '66%';
                passwordStrengthBar.style.background = '#f59e0b';
                regPasswordInput.classList.remove('border-gray-600');
                regPasswordInput.classList.add('border-yellow-500');
            } else {
                passwordStrengthBar.classList.add('strength-strong');
                passwordStrengthBar.style.width = '100%';
                passwordStrengthBar.style.background = '#10b981';
                regPasswordInput.classList.remove('border-gray-600');
                regPasswordInput.classList.add('border-green-500');
            }
            
            if (passwordStrengthText) {
                if (password.length === 0) {
                    passwordStrengthText.textContent = '';
                } else if (passedCount <= 2) {
                    passwordStrengthText.textContent = 'Débil';
                    passwordStrengthText.className = 'text-xs text-red-400 ml-2';
                } else if (passedCount <= 4) {
                    passwordStrengthText.textContent = 'Media';
                    passwordStrengthText.className = 'text-xs text-yellow-400 ml-2';
                } else {
                    passwordStrengthText.textContent = 'Fuerte';
                    passwordStrengthText.className = 'text-xs text-green-400 ml-2';
                }
            }
        });
    }

    // ========== VALIDACIÓN DE CONFIRMACIÓN DE CONTRASEÑA ==========
    const confirmPasswordInput = document.getElementById('reg-confirm-password');
    const passwordMatchError = document.getElementById('password-match-error');
    const passwordMatchSuccess = document.getElementById('password-match-success');

    if (confirmPasswordInput && regPasswordInput) {
        const checkPasswordMatch = () => {
            const password = regPasswordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            
            confirmPasswordInput.classList.remove('border-green-500', 'border-red-500');
            confirmPasswordInput.classList.add('border-gray-600');
            
            if (passwordMatchError) passwordMatchError.classList.add('hidden');
            if (passwordMatchSuccess) passwordMatchSuccess.classList.add('hidden');
            
            if (confirmPassword.length === 0) return;
            
            if (confirmPassword !== password) {
                confirmPasswordInput.classList.remove('border-gray-600');
                confirmPasswordInput.classList.add('border-red-500');
                if (passwordMatchError) {
                    passwordMatchError.innerHTML = '<span class="flex items-center gap-1"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg> Las contraseñas no coinciden</span>';
                    passwordMatchError.classList.remove('hidden');
                }
            } else {
                confirmPasswordInput.classList.remove('border-gray-600');
                confirmPasswordInput.classList.add('border-green-500');
                if (passwordMatchSuccess) {
                    passwordMatchSuccess.innerHTML = '<span class="flex items-center gap-1"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg> Las contraseñas coinciden</span>';
                    passwordMatchSuccess.classList.remove('hidden');
                }
            }
        };
        
        confirmPasswordInput.addEventListener('input', checkPasswordMatch);
        regPasswordInput.addEventListener('input', () => {
            if (confirmPasswordInput.value.length > 0) {
                checkPasswordMatch();
            }
        });
    }

    // ========== TOGGLE PASSWORD VISIBILITY - LOGIN ==========
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

    // ========== TOGGLE PASSWORD VISIBILITY - REGISTER ==========
    const toggleRegPassword = document.getElementById('toggle-reg-password');
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

    // ========== LOGIN FORM SUBMIT ==========
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
                setTimeout(() => {
                    window.location.href = './app.html';
                }, 1000);
            } else {
                showMessage(result.error, 'error');
                setLoading('login-btn', false);
            }
        });
    }

    // ========== REGISTER FORM SUBMIT ==========
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fullname = document.getElementById('reg-fullname').value.trim();
            const username = document.getElementById('reg-username').value.trim().toLowerCase();
            const email = document.getElementById('reg-email').value.trim();
            const password = document.getElementById('reg-password').value;
            const confirmPassword = document.getElementById('reg-confirm-password').value;
            const termsAccepted = document.getElementById('reg-terms').checked;

            if (!fullname || !username || !email || !password || !confirmPassword) {
                showMessage('Por favor, completa todos los campos.', 'error');
                return;
            }

            if (!validateUsername(username)) {
                showMessage('El nombre de usuario no es válido. Usa 3-20 caracteres (letras, números, guiones bajos).', 'error');
                return;
            }

            if (usernameError && !usernameError.classList.contains('hidden')) {
                showMessage('Por favor, elige un nombre de usuario disponible.', 'error');
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
                setTimeout(() => {
                    window.location.href = './app.html';
                }, 1000);
            } else {
                showMessage(result.error, 'error');
                setLoading('register-btn', false);
            }
        });
    }

    // ========== GOOGLE LOGIN ==========
    const googleLoginBtn = document.getElementById('google-login-btn');
    const usernameModal = document.getElementById('username-modal');
    const usernameForm = document.getElementById('username-form');
    const googleUserNameDisplay = document.getElementById('google-user-name');
    const googleUserEmailDisplay = document.getElementById('google-user-email');
    const googleUserPhotoDisplay = document.getElementById('google-user-photo');
    
    let currentGoogleUser = null;

    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', async () => {
            const result = await loginWithGoogle();
            
            if (result.success) {
                if (result.needsUsername) {
                    currentGoogleUser = result.user;
                    
                    const displayName = result.user.displayName || 'Usuario';
                    const firstName = displayName.split(' ')[0];
                    if (googleUserNameDisplay) googleUserNameDisplay.textContent = firstName;
                    
                    if (googleUserEmailDisplay) {
                        googleUserEmailDisplay.textContent = result.user.email || '';
                    }
                    
                    if (googleUserPhotoDisplay && result.user.photoURL) {
                        googleUserPhotoDisplay.innerHTML = '<img src="' + result.user.photoURL + '" class="w-full h-full rounded-full object-cover" alt="Foto de perfil">';
                    }
                    
                    usernameModal.classList.remove('hidden');
                    if (googleUsernameInput) googleUsernameInput.focus();
                } else {
                    showMessage('¡Bienvenido! Redirigiendo...', 'success');
                    setTimeout(() => {
                        window.location.replace('./app.html');
                    }, 500);
                }
            } else {
                showMessage(result.error, 'error');
            }
        });
    }

    // ========== GOOGLE USERNAME VALIDATION ==========
    if (googleUsernameInput) {
        let googleUsernameCheckTimeout = null;
        let lastCheckedGoogleUsername = '';
        
        googleUsernameInput.addEventListener('input', async () => {
            const username = googleUsernameInput.value.trim().toLowerCase();
            
            if (googleUsernameCheckTimeout) {
                clearTimeout(googleUsernameCheckTimeout);
            }
            
            googleUsernameInput.classList.remove('border-green-500', 'border-red-500', 'border-yellow-500');
            googleUsernameInput.classList.add('border-gray-600');
            
            if (googleUsernameError) googleUsernameError.classList.add('hidden');
            if (googleUsernameSuccess) googleUsernameSuccess.classList.add('hidden');
            if (googleUsernameHint) googleUsernameHint.classList.remove('hidden');
            
            if (username.length === 0) {
                if (googleUsernameHint) {
                    googleUsernameHint.innerHTML = '<svg class="w-4 h-4 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> 3-20 caracteres. Solo letras, números y guiones bajos (_)';
                    googleUsernameHint.classList.remove('text-yellow-400');
                    googleUsernameHint.classList.add('text-gray-500');
                }
                return;
            }
            
            if (!validateUsername(username)) {
                if (googleUsernameHint) googleUsernameHint.classList.add('hidden');
                if (googleUsernameError) {
                    googleUsernameError.classList.remove('hidden');
                    googleUsernameInput.classList.remove('border-gray-600');
                    googleUsernameInput.classList.add('border-red-500');
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
                if (googleUsernameHint) {
                    googleUsernameHint.innerHTML = '<svg class="w-4 h-4 inline mr-1 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path></svg> Verificando disponibilidad...';
                    googleUsernameHint.classList.remove('text-gray-500');
                    googleUsernameHint.classList.add('text-yellow-400');
                    googleUsernameInput.classList.remove('border-gray-600');
                    googleUsernameInput.classList.add('border-yellow-500');
                }
                
                googleUsernameCheckTimeout = setTimeout(async () => {
                    if (username === lastCheckedGoogleUsername) return;
                    lastCheckedGoogleUsername = username;
                    
                    try {
                        const exists = await checkUsernameExists(username);
                        
                        if (googleUsernameInput.value.trim().toLowerCase() !== username) return;
                        
                        if (googleUsernameHint) googleUsernameHint.classList.add('hidden');
                        googleUsernameInput.classList.remove('border-yellow-500');
                        
                        if (exists) {
                            if (googleUsernameError) {
                                googleUsernameError.classList.remove('hidden');
                                googleUsernameInput.classList.add('border-red-500');
                                const errorText = googleUsernameError.querySelector('span');
                                if (errorText) {
                                    errorText.textContent = 'Este nombre de usuario ya está en uso';
                                }
                            }
                            if (googleUsernameSuccess) googleUsernameSuccess.classList.add('hidden');
                        } else {
                            if (googleUsernameSuccess) {
                                googleUsernameSuccess.classList.remove('hidden');
                                googleUsernameInput.classList.add('border-green-500');
                                const successText = googleUsernameSuccess.querySelector('span');
                                if (successText) {
                                    successText.textContent = '¡Nombre de usuario disponible!';
                                }
                            }
                            if (googleUsernameError) googleUsernameError.classList.add('hidden');
                        }
                    } catch (error) {
                        console.error('Error verificando username:', error);
                        if (googleUsernameHint) {
                            googleUsernameHint.innerHTML = '<svg class="w-4 h-4 inline mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg> 3-20 caracteres. Solo letras, números y guiones bajos (_)';
                            googleUsernameHint.classList.remove('text-yellow-400');
                            googleUsernameHint.classList.add('text-gray-500');
                            googleUsernameHint.classList.remove('hidden');
                        }
                        googleUsernameInput.classList.remove('border-yellow-500');
                        googleUsernameInput.classList.add('border-gray-600');
                    }
                }, 500);
            }
        });
    }

    // ========== GOOGLE USERNAME FORM SUBMIT ==========
    if (usernameForm) {
        usernameForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = googleUsernameInput.value.trim().toLowerCase();
            
            if (!validateUsername(username)) {
                showMessage('Nombre de usuario no válido.', 'error');
                return;
            }
            
            if (googleUsernameError && !googleUsernameError.classList.contains('hidden')) {
                showMessage('Por favor, elige un nombre de usuario disponible.', 'error');
                return;
            }
            
            setLoading('save-username-btn', true);
            
            const result = await createGoogleUserProfile(currentGoogleUser, username);
            
            if (result.success) {
                showMessage('¡Registro completado! Redirigiendo...', 'success');
                usernameModal.classList.add('hidden');
                setTimeout(() => {
                    window.location.replace('./app.html');
                }, 500);
            } else {
                showMessage(result.error, 'error');
                setLoading('save-username-btn', false);
            }
        });
    }

    // ========== FORGOT PASSWORD ==========
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
    deleteProfilePhoto,
    deleteAllUserData,
    deleteUserAccount
};