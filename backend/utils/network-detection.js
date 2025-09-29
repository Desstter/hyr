// =====================================================
// DETECCIÓN AUTOMÁTICA DE IP DE RED - HYR CONSTRUCTORA
// Detecta automáticamente la IP de red para compartir servicios
// =====================================================

const os = require('os');

/**
 * Detecta automáticamente la IP de red local para compartir servicios
 * @returns {string} IP detectada o 'localhost' como fallback
 */
function detectNetworkIP() {
    try {
        const interfaces = os.networkInterfaces();

        // Priorizar interfaces comunes de red
        const priorityInterfaces = ['Ethernet', 'Wi-Fi', 'wlan0', 'eth0', 'en0'];

        // Buscar en interfaces prioritarias primero
        for (const interfaceName of priorityInterfaces) {
            const networkIP = checkInterface(interfaces[interfaceName]);
            if (networkIP) {
                console.log(`🌐 IP de red detectada en ${interfaceName}: ${networkIP}`);
                return networkIP;
            }
        }

        // Si no encuentra en prioritarias, buscar en todas las interfaces
        for (const [interfaceName, addresses] of Object.entries(interfaces)) {
            // Saltar interfaces ya revisadas
            if (priorityInterfaces.includes(interfaceName)) continue;

            const networkIP = checkInterface(addresses);
            if (networkIP) {
                console.log(`🌐 IP de red detectada en ${interfaceName}: ${networkIP}`);
                return networkIP;
            }
        }

        console.log('⚠️  No se detectó IP de red, usando localhost');
        return 'localhost';

    } catch (error) {
        console.error('❌ Error detectando IP de red:', error.message);
        console.log('🔄 Fallback a localhost');
        return 'localhost';
    }
}

/**
 * Verifica si una interfaz tiene una IP válida para compartir
 * @param {Array} addresses - Array de direcciones de la interfaz
 * @returns {string|null} IP válida o null
 */
function checkInterface(addresses) {
    if (!addresses) return null;

    for (const addr of addresses) {
        // Solo IPv4, no interna, no loopback
        if (addr.family === 'IPv4' && !addr.internal) {
            const ip = addr.address;

            // Verificar que sea una IP privada válida
            if (isValidPrivateIP(ip)) {
                return ip;
            }
        }
    }

    return null;
}

/**
 * Verifica si la IP es una dirección privada válida
 * @param {string} ip - Dirección IP a verificar
 * @returns {boolean} true si es IP privada válida
 */
function isValidPrivateIP(ip) {
    // Excluir localhost explícitamente
    if (ip === '127.0.0.1') return false;

    const parts = ip.split('.').map(Number);

    // Verificar que sean números válidos
    if (parts.length !== 4 || parts.some(part => isNaN(part) || part < 0 || part > 255)) {
        return false;
    }

    const [a, b] = parts;

    // Rangos de IP privadas válidas
    return (
        // 192.168.x.x
        (a === 192 && b === 168) ||
        // 10.x.x.x
        (a === 10) ||
        // 172.16.x.x - 172.31.x.x
        (a === 172 && b >= 16 && b <= 31)
    );
}

/**
 * Obtiene información detallada de la red para debugging
 * @returns {Object} Información de red
 */
function getNetworkInfo() {
    const interfaces = os.networkInterfaces();
    const info = {
        detectedIP: detectNetworkIP(),
        hostname: os.hostname(),
        platform: os.platform(),
        interfaces: {}
    };

    for (const [name, addresses] of Object.entries(interfaces)) {
        info.interfaces[name] = addresses
            .filter(addr => addr.family === 'IPv4')
            .map(addr => ({
                address: addr.address,
                internal: addr.internal,
                isValidPrivate: !addr.internal && isValidPrivateIP(addr.address)
            }));
    }

    return info;
}

module.exports = {
    detectNetworkIP,
    getNetworkInfo,
    isValidPrivateIP
};