// ========== SISTEMA DE COOKIES PARA REELIO ==========
// Este archivo gestiona el consentimiento de cookies según RGPD/LSSI

(function() {
    'use strict';

    // Configuración
    const COOKIE_NAME = 'reelio_cookie_consent';
    const COOKIE_EXPIRY_DAYS = 365;

    // Estado del consentimiento
    let consentState = {
        necessary: true,  // Siempre activas
        analytics: false,
        marketing: false
    };

    // ========== FUNCIONES DE COOKIES ==========
    
    function setCookie(name, value, days) {
        const date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = "expires=" + date.toUTCString();
        document.cookie = name + "=" + JSON.stringify(value) + ";" + expires + ";path=/;SameSite=Lax";
    }

    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i].trim();
            if (c.indexOf(nameEQ) === 0) {
                try {
                    return JSON.parse(c.substring(nameEQ.length));
                } catch (e) {
                    return null;
                }
            }
        }
        return null;
    }

    function deleteCookie(name) {
        document.cookie = name + '=; Max-Age=-99999999; path=/';
    }

    // ========== GESTIÓN DE CONSENTIMIENTO ==========

    function saveConsent(consent) {
        consentState = { ...consentState, ...consent };
        setCookie(COOKIE_NAME, consentState, COOKIE_EXPIRY_DAYS);
        applyConsent();
        hideBanner();
    }

    function loadConsent() {
        const saved = getCookie(COOKIE_NAME);
        if (saved) {
            consentState = saved;
            return true;
        }
        return false;
    }

    function applyConsent() {
        // Si se aceptan cookies de analytics, inicializar Google Analytics/Firebase
        if (consentState.analytics) {
            enableAnalytics();
        } else {
            disableAnalytics();
        }

        // Disparar evento personalizado para que otros scripts puedan reaccionar
        window.dispatchEvent(new CustomEvent('cookieConsentUpdated', { 
            detail: consentState 
        }));
    }

    function enableAnalytics() {
        // Habilitar Google Analytics / Firebase Analytics
        window['ga-disable-G-7J6CQZVMPM'] = false;
        
        // Si gtag existe, actualizar consentimiento
        if (typeof gtag === 'function') {
            gtag('consent', 'update', {
                'analytics_storage': 'granted'
            });
        }
        console.log('📊 Analytics habilitado');
    }

    function disableAnalytics() {
        // Deshabilitar Google Analytics
        window['ga-disable-G-7J6CQZVMPM'] = true;
        
        if (typeof gtag === 'function') {
            gtag('consent', 'update', {
                'analytics_storage': 'denied'
            });
        }
        
        // Eliminar cookies de Google Analytics existentes
        const cookiesToDelete = ['_ga', '_gid', '_gat', '_ga_7J6CQZVMPM'];
        cookiesToDelete.forEach(cookie => {
            deleteCookie(cookie);
        });
        console.log('📊 Analytics deshabilitado');
    }

    // ========== INTERFAZ DEL BANNER ==========

    function createBanner() {
        // Verificar si ya existe
        if (document.getElementById('cookie-banner')) return;

        const bannerHTML = `
            <div id="cookie-banner" class="cookie-banner" role="dialog" aria-labelledby="cookie-title" aria-describedby="cookie-desc">
                <div class="cookie-content">
                    <div class="cookie-text">
                        <h3 id="cookie-title">🍪 Utilizamos cookies</h3>
                        <p id="cookie-desc">
                            Usamos cookies propias y de terceros para analizar el uso de la web y mejorar tu experiencia. 
                            Puedes aceptar todas, configurarlas o rechazar las no esenciales.
                            <a href="politica-cookies.html" class="cookie-link">Más información</a>
                        </p>
                    </div>
                    <div class="cookie-buttons">
                        <button id="cookie-accept-all" class="cookie-btn cookie-btn-primary">
                            Aceptar todas
                        </button>
                        <button id="cookie-reject" class="cookie-btn cookie-btn-secondary">
                            Solo esenciales
                        </button>
                        <button id="cookie-configure" class="cookie-btn cookie-btn-tertiary">
                            Configurar
                        </button>
                    </div>
                </div>
            </div>

            <!-- Modal de configuración -->
            <div id="cookie-modal" class="cookie-modal" role="dialog" aria-labelledby="modal-title" aria-hidden="true">
                <div class="cookie-modal-content">
                    <div class="cookie-modal-header">
                        <h3 id="modal-title">⚙️ Configuración de Cookies</h3>
                        <button id="cookie-modal-close" class="cookie-modal-close" aria-label="Cerrar">&times;</button>
                    </div>
                    <div class="cookie-modal-body">
                        
                        <div class="cookie-category">
                            <div class="cookie-category-header">
                                <div class="cookie-category-info">
                                    <h4>Cookies Necesarias</h4>
                                    <p>Esenciales para el funcionamiento básico del sitio. No se pueden desactivar.</p>
                                </div>
                                <label class="cookie-switch disabled">
                                    <input type="checkbox" checked disabled>
                                    <span class="cookie-slider"></span>
                                </label>
                            </div>
                        </div>

                        <div class="cookie-category">
                            <div class="cookie-category-header">
                                <div class="cookie-category-info">
                                    <h4>Cookies de Análisis</h4>
                                    <p>Nos ayudan a entender cómo usas la web para mejorarla. Usamos Firebase Analytics.</p>
                                </div>
                                <label class="cookie-switch">
                                    <input type="checkbox" id="cookie-analytics">
                                    <span class="cookie-slider"></span>
                                </label>
                            </div>
                        </div>

                        <div class="cookie-category">
                            <div class="cookie-category-header">
                                <div class="cookie-category-info">
                                    <h4>Cookies de Marketing</h4>
                                    <p>Permiten mostrarte contenido personalizado en otras plataformas.</p>
                                </div>
                                <label class="cookie-switch">
                                    <input type="checkbox" id="cookie-marketing">
                                    <span class="cookie-slider"></span>
                                </label>
                            </div>
                        </div>

                    </div>
                    <div class="cookie-modal-footer">
                        <button id="cookie-save-preferences" class="cookie-btn cookie-btn-primary">
                            Guardar preferencias
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Añadir estilos
        const styles = `
            <style id="cookie-styles">
                .cookie-banner {
                    position: fixed;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border-top: 1px solid rgba(6, 182, 212, 0.3);
                    padding: 1.25rem;
                    z-index: 9999;
                    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.5);
                    animation: slideUp 0.4s ease-out;
                }

                @keyframes slideUp {
                    from { transform: translateY(100%); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }

                .cookie-content {
                    max-width: 1200px;
                    margin: 0 auto;
                    display: flex;
                    flex-wrap: wrap;
                    align-items: center;
                    justify-content: space-between;
                    gap: 1rem;
                }

                .cookie-text {
                    flex: 1;
                    min-width: 280px;
                }

                .cookie-text h3 {
                    color: #fff;
                    font-size: 1.1rem;
                    font-weight: 700;
                    margin-bottom: 0.5rem;
                }

                .cookie-text p {
                    color: #9ca3af;
                    font-size: 0.9rem;
                    line-height: 1.5;
                    margin: 0;
                }

                .cookie-link {
                    color: #06b6d4;
                    text-decoration: underline;
                    transition: color 0.2s;
                }

                .cookie-link:hover {
                    color: #22d3ee;
                }

                .cookie-buttons {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.75rem;
                }

                .cookie-btn {
                    padding: 0.7rem 1.25rem;
                    border-radius: 0.75rem;
                    font-weight: 600;
                    font-size: 0.9rem;
                    cursor: pointer;
                    transition: all 0.2s;
                    border: none;
                    white-space: nowrap;
                }

                .cookie-btn-primary {
                    background: linear-gradient(135deg, #c026d3 0%, #a21caf 100%);
                    color: white;
                    box-shadow: 0 4px 15px rgba(192, 38, 211, 0.4);
                }

                .cookie-btn-primary:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(192, 38, 211, 0.5);
                }

                .cookie-btn-secondary {
                    background: rgba(255, 255, 255, 0.1);
                    color: #e5e7eb;
                    border: 1px solid rgba(255, 255, 255, 0.2);
                }

                .cookie-btn-secondary:hover {
                    background: rgba(255, 255, 255, 0.15);
                }

                .cookie-btn-tertiary {
                    background: transparent;
                    color: #06b6d4;
                    text-decoration: underline;
                    padding: 0.7rem 0.5rem;
                }

                .cookie-btn-tertiary:hover {
                    color: #22d3ee;
                }

                /* Modal */
                .cookie-modal {
                    display: none;
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.8);
                    z-index: 10000;
                    align-items: center;
                    justify-content: center;
                    padding: 1rem;
                }

                .cookie-modal.active {
                    display: flex;
                    animation: fadeIn 0.3s ease;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .cookie-modal-content {
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border-radius: 1.5rem;
                    max-width: 500px;
                    width: 100%;
                    max-height: 90vh;
                    overflow-y: auto;
                    border: 1px solid rgba(6, 182, 212, 0.2);
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                }

                .cookie-modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1.5rem;
                    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
                }

                .cookie-modal-header h3 {
                    color: #fff;
                    font-size: 1.25rem;
                    font-weight: 700;
                    margin: 0;
                }

                .cookie-modal-close {
                    background: none;
                    border: none;
                    color: #9ca3af;
                    font-size: 1.75rem;
                    cursor: pointer;
                    padding: 0;
                    line-height: 1;
                    transition: color 0.2s;
                }

                .cookie-modal-close:hover {
                    color: #fff;
                }

                .cookie-modal-body {
                    padding: 1.5rem;
                }

                .cookie-category {
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 1rem;
                    padding: 1rem;
                    margin-bottom: 1rem;
                }

                .cookie-category:last-child {
                    margin-bottom: 0;
                }

                .cookie-category-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    gap: 1rem;
                }

                .cookie-category-info h4 {
                    color: #fff;
                    font-size: 1rem;
                    font-weight: 600;
                    margin: 0 0 0.25rem 0;
                }

                .cookie-category-info p {
                    color: #9ca3af;
                    font-size: 0.85rem;
                    line-height: 1.4;
                    margin: 0;
                }

                /* Switch toggle */
                .cookie-switch {
                    position: relative;
                    display: inline-block;
                    width: 50px;
                    height: 28px;
                    flex-shrink: 0;
                }

                .cookie-switch input {
                    opacity: 0;
                    width: 0;
                    height: 0;
                }

                .cookie-slider {
                    position: absolute;
                    cursor: pointer;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: #4b5563;
                    transition: 0.3s;
                    border-radius: 28px;
                }

                .cookie-slider:before {
                    position: absolute;
                    content: "";
                    height: 20px;
                    width: 20px;
                    left: 4px;
                    bottom: 4px;
                    background-color: white;
                    transition: 0.3s;
                    border-radius: 50%;
                }

                .cookie-switch input:checked + .cookie-slider {
                    background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
                }

                .cookie-switch input:checked + .cookie-slider:before {
                    transform: translateX(22px);
                }

                .cookie-switch.disabled .cookie-slider {
                    background: linear-gradient(135deg, #06b6d4 0%, #0891b2 100%);
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .cookie-switch.disabled input:checked + .cookie-slider:before {
                    transform: translateX(22px);
                }

                .cookie-modal-footer {
                    padding: 1.5rem;
                    border-top: 1px solid rgba(255, 255, 255, 0.1);
                    text-align: center;
                }

                .cookie-modal-footer .cookie-btn {
                    width: 100%;
                }

                /* Botón flotante para cambiar preferencias */
                .cookie-settings-btn {
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    width: 50px;
                    height: 50px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                    border: 1px solid rgba(6, 182, 212, 0.3);
                    color: #06b6d4;
                    font-size: 1.5rem;
                    cursor: pointer;
                    z-index: 9998;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
                    transition: all 0.2s;
                }

                .cookie-settings-btn:hover {
                    transform: scale(1.1);
                    border-color: #06b6d4;
                }

                /* Ocultar banner */
                .cookie-banner.hidden {
                    display: none;
                }

                /* Responsive */
                @media (max-width: 640px) {
                    .cookie-content {
                        flex-direction: column;
                        text-align: center;
                    }

                    .cookie-buttons {
                        width: 100%;
                        justify-content: center;
                    }

                    .cookie-btn {
                        flex: 1;
                        min-width: 100px;
                    }

                    .cookie-btn-tertiary {
                        flex-basis: 100%;
                    }
                }
            </style>
        `;

        // Insertar en el DOM
        document.head.insertAdjacentHTML('beforeend', styles);
        document.body.insertAdjacentHTML('beforeend', bannerHTML);

        // Añadir botón de configuración (se muestra después de elegir)
        const settingsBtn = document.createElement('button');
        settingsBtn.id = 'cookie-settings-btn';
        settingsBtn.className = 'cookie-settings-btn hidden';
        settingsBtn.innerHTML = '🍪';
        settingsBtn.title = 'Configurar cookies';
        settingsBtn.setAttribute('aria-label', 'Abrir configuración de cookies');
        document.body.appendChild(settingsBtn);

        // Event listeners
        setupEventListeners();
    }

    function setupEventListeners() {
        // Aceptar todas
        document.getElementById('cookie-accept-all').addEventListener('click', function() {
            saveConsent({
                necessary: true,
                analytics: true,
                marketing: true
            });
        });

        // Rechazar (solo esenciales)
        document.getElementById('cookie-reject').addEventListener('click', function() {
            saveConsent({
                necessary: true,
                analytics: false,
                marketing: false
            });
        });

        // Abrir modal de configuración
        document.getElementById('cookie-configure').addEventListener('click', function() {
            openModal();
        });

        // Cerrar modal
        document.getElementById('cookie-modal-close').addEventListener('click', function() {
            closeModal();
        });

        // Cerrar modal al hacer clic fuera
        document.getElementById('cookie-modal').addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });

        // Guardar preferencias
        document.getElementById('cookie-save-preferences').addEventListener('click', function() {
            const analytics = document.getElementById('cookie-analytics').checked;
            const marketing = document.getElementById('cookie-marketing').checked;
            
            saveConsent({
                necessary: true,
                analytics: analytics,
                marketing: marketing
            });
            closeModal();
        });

        // Botón flotante de configuración
        document.getElementById('cookie-settings-btn').addEventListener('click', function() {
            // Actualizar checkboxes con estado actual
            document.getElementById('cookie-analytics').checked = consentState.analytics;
            document.getElementById('cookie-marketing').checked = consentState.marketing;
            openModal();
        });

        // Cerrar modal con Escape
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeModal();
            }
        });
    }

    function openModal() {
        const modal = document.getElementById('cookie-modal');
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        const modal = document.getElementById('cookie-modal');
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    function showBanner() {
        const banner = document.getElementById('cookie-banner');
        if (banner) {
            banner.classList.remove('hidden');
        }
    }

    function hideBanner() {
        const banner = document.getElementById('cookie-banner');
        const settingsBtn = document.getElementById('cookie-settings-btn');
        
        if (banner) {
            banner.classList.add('hidden');
        }
        if (settingsBtn) {
            settingsBtn.classList.remove('hidden');
        }
    }

    // ========== INICIALIZACIÓN ==========

    function init() {
        // Crear el banner
        createBanner();

        // Comprobar si ya hay consentimiento guardado
        if (loadConsent()) {
            // Ya hay preferencias guardadas
            hideBanner();
            applyConsent();
        } else {
            // Primera visita, mostrar banner
            showBanner();
            // Deshabilitar analytics por defecto hasta consentimiento
            disableAnalytics();
        }
    }

    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Exponer funciones para uso externo
    window.ReelioConsent = {
        getConsent: () => consentState,
        openSettings: openModal,
        hasConsent: (type) => consentState[type] || false
    };

})();
