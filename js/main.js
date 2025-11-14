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
        waitlistForm.addEventListener('submit', async function(event) {
            event.preventDefault();
            
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;

            if (name && email) {
                // Mostrar mensaje de carga
                showMessage('Procesando tu registro...', 'success');
                
                try {
                    // TU ID DE FORMSPREE: mzzyzbjl
                    const response = await fetch('https://formspree.io/f/mzzyzbjl', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            name: name,
                            email: email,
                            _subject: `Nuevo registro Reelio: ${name}`,
                            _replyto: email,
                            message: `Nuevo usuario registrado en la lista de espera:\n\nNombre: ${name}\nEmail: ${email}\n\nFecha: ${new Date().toLocaleString()}`
                        }),
                    });
                    
                    if (response.ok) {
                        showMessage(`¡Gracias, ${name}! Te has registrado exitosamente en la lista de espera.`, 'success');
                        waitlistForm.reset();
                    } else {
                        showMessage('Hubo un error al registrarte. Intenta de nuevo.', 'error');
                    }
                } catch (error) {
                    console.error('Error:', error);
                    showMessage('Error de conexión. Intenta de nuevo.', 'error');
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