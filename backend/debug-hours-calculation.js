// =====================================================
// DEBUG: INVESTIGAR CÁLCULO DE HORAS PARA TURNOS NOCTURNOS
// =====================================================

// Simular el cálculo exacto que está haciendo el backend
function debugTimeCalculation(arrivalTime, departureTime, lunchDeducted = true) {
    console.log('🔍 DEBUG: Calculando horas para turno nocturno');
    console.log(`   Llegada: ${arrivalTime}`);
    console.log(`   Salida: ${departureTime}`);
    console.log(`   Almuerzo descontado: ${lunchDeducted}`);

    // Replicar la lógica exacta del backend
    const arrival = new Date(`2000-01-01 ${arrivalTime}`);
    let departure = new Date(`2000-01-01 ${departureTime}`);
    let crossesMidnight = false;

    console.log(`   Arrival Date: ${arrival}`);
    console.log(`   Departure Date inicial: ${departure}`);

    // Detectar si el turno cruza medianoche
    if (departure <= arrival) {
        departure = new Date(`2000-01-02 ${departureTime}`);
        crossesMidnight = true;
        console.log(`   ✅ Detectado cruce de medianoche`);
        console.log(`   Departure Date corregido: ${departure}`);
    }

    const diffMs = departure.getTime() - arrival.getTime();
    console.log(`   Diferencia en MS: ${diffMs}`);

    let calculatedHours = Math.max(0, diffMs / (1000 * 60 * 60));
    console.log(`   Horas calculadas (antes almuerzo): ${calculatedHours}`);

    // Aplicar deducción de almuerzo
    if (lunchDeducted !== false) {
        calculatedHours = Math.max(0, calculatedHours - 1);
        console.log(`   Horas después de almuerzo: ${calculatedHours}`);
    }

    const legalDailyHours = 7.3;
    const regularHours = Math.min(calculatedHours, legalDailyHours);
    const overtimeHours = Math.max(0, calculatedHours - legalDailyHours);

    console.log(`   📊 RESULTADOS:`);
    console.log(`      Total horas: ${calculatedHours}`);
    console.log(`      Horas regulares: ${regularHours}`);
    console.log(`      Horas extra: ${overtimeHours}`);
    console.log(`      Cruza medianoche: ${crossesMidnight}`);

    return {
        calculatedHours,
        regularHours,
        overtimeHours,
        crossesMidnight
    };
}

// Probar el caso problemático
console.log('='.repeat(60));
debugTimeCalculation('20:00', '05:00', true);
console.log('='.repeat(60));

// Probar otros casos
debugTimeCalculation('07:00', '15:30', true);
console.log('='.repeat(60));
debugTimeCalculation('22:00', '06:00', true);