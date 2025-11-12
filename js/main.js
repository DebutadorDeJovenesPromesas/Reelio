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

document.addEventListener('DOMContentLoaded', () => {
    const waitlistForm = document.getElementById('waitlist-form');

    if (waitlistForm) {
        waitlistForm.addEventListener('submit', async function(event) { // Añadir 'async'
            event.preventDefault();
            
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;

            if (name && email) {
                // 1. Enviar datos al servidor para el correo
                try {
                    const response = await fetch('/send-email', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({ name, email, targetEmail: 'appreelio@gmail.com' }),
                    });
                    
                    // Nota: Esta parte asume que el servidor enviará el correo y responderá con éxito
                    if (response.ok) {
                        showMessage(`¡Gracias, ${name}! Tu correo (${email}) ha sido agregado a la lista de espera.`, 'success');
                        waitlistForm.reset();
                    } else {
                        // El servidor respondió, pero con un error (ej: 400, 500)
                        showMessage('Hubo un error al registrarte. Intenta de nuevo más tarde.', 'error');
                    }
                } catch (error) {
                    // Falló la conexión al servidor
                    console.error('Error al enviar la solicitud:', error);
                    showMessage('Error de conexión. Intenta de nuevo más tarde.', 'error');
                }
            } else {
                showMessage('Por favor, completa todos los campos requeridos.', 'error');
            }
        });
    }
});