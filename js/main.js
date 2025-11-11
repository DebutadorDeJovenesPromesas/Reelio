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

// Función para guardar usuario en JSON
function saveUserToJSON(userData) {
    // Obtener usuarios existentes o crear array vacío
    let users = JSON.parse(localStorage.getItem('waitlistUsers')) || [];
    
    // Agregar nuevo usuario
    users.push({
        ...userData,
        id: Date.now(), // ID único basado en timestamp
        registrationDate: new Date().toISOString()
    });
    
    // Guardar en localStorage
    localStorage.setItem('waitlistUsers', JSON.stringify(users));
    
    // Opcional: También podrías enviar los datos a un servidor aquí
    // sendToServer(userData);
}

// Función para descargar los datos como archivo JSON
function downloadUserData() {
    const users = JSON.parse(localStorage.getItem('waitlistUsers')) || [];
    if (users.length === 0) {
        showMessage('No hay datos para descargar', 'error');
        return;
    }
    
    const dataStr = JSON.stringify(users, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `reelio_users_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showMessage('Datos descargados exitosamente', 'success');
}

// Función para validar email
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Función para validar usuario de Instagram
function isValidInstagram(username) {
    if (!username) return true; // Opcional
    const instagramRegex = /^[a-zA-Z0-9._]{1,30}$/;
    return instagramRegex.test(username);
}

document.addEventListener('DOMContentLoaded', () => {
    const waitlistForm = document.getElementById('waitlist-form');

    if (waitlistForm) {
        waitlistForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const instagram = document.getElementById('instagram').value.trim();
            const tiktok = document.getElementById('tiktok').value.trim();
            const notifications = document.getElementById('notifications').checked;

            // Validaciones
            if (!name || !email) {
                showMessage('Por favor, completa todos los campos requeridos.', 'error');
                return;
            }

            if (!isValidEmail(email)) {
                showMessage('Por favor, ingresa un correo electrónico válido.', 'error');
                return;
            }

            if (instagram && !isValidInstagram(instagram)) {
                showMessage('Por favor, ingresa un usuario de Instagram válido.', 'error');
                return;
            }

            // Crear objeto de usuario
            const userData = {
                name,
                email,
                instagram: instagram || null,
                tiktok: tiktok || null,
                notifications,
                ipAddress: 'N/A' // En un entorno real, esto vendría del servidor
            };

            // Guardar usuario
            saveUserToJSON(userData);
            
            // Mostrar mensaje de éxito
            const socialText = instagram ? ` (@${instagram})` : '';
            showMessage(`¡Gracias, ${name}${socialText}! Tu correo (${email}) ha sido agregado a la lista de espera. Te notificaremos pronto.`, 'success');
            
            // Resetear formulario
            waitlistForm.reset();
            
            // Opcional: Mostrar contador de registros
            updateRegistrationCounter();
        });
    }

    // Actualizar contador de registros (opcional)
    function updateRegistrationCounter() {
        const users = JSON.parse(localStorage.getItem('waitlistUsers')) || [];
        console.log(`Total de usuarios registrados: ${users.length}`);
    }

    // Inicializar contador
    updateRegistrationCounter();
});

// Función para administradores: Ver datos en consola
function viewUserData() {
    const users = JSON.parse(localStorage.getItem('waitlistUsers')) || [];
    console.log('Usuarios registrados:', users);
    return users;
}

// Función para administradores: Limpiar datos (solo para desarrollo)
function clearUserData() {
    if (confirm('¿Estás seguro de que quieres eliminar todos los datos de usuarios?')) {
        localStorage.removeItem('waitlistUsers');
        showMessage('Datos eliminados correctamente', 'success');
    }
}
