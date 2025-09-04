// Cargar datos rápidamente
const { loadSeeds } = require('./load-seeds.js');

loadSeeds().then(() => {
    console.log('\n✅ Datos cargados. Ahora ejecuta: node server.js');
    process.exit(0);
}).catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});