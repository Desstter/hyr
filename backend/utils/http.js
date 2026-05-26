// =====================================================
// HELPERS HTTP - respuestas y errores consistentes
// HYR CONSTRUCTORA & SOLDADURA
// =====================================================
// Mapea errores de PostgreSQL a códigos HTTP correctos y evita filtrar
// detalles internos (stack, esquema) en producción.
// =====================================================

const isDev = process.env.NODE_ENV !== 'production';

// Mensajes legibles para violaciones de constraint conocidas.
const CONSTRAINT_MESSAGES = {
    chk_expenses_amount_calc: 'El monto no coincide con cantidad × precio unitario.',
    chk_personnel_salary_type: 'Debe definir exactamente uno: tarifa por hora (hourly) o salario mensual (monthly).',
    chk_time_entries_total_hours: 'La suma de horas (regulares + extra) no puede superar 24.',
    chk_personnel_hire_date: 'La fecha de contratación no puede ser futura.',
    chk_expenses_date: 'La fecha del gasto no puede ser futura.',
    chk_time_entries_work_date: 'La fecha de trabajo no puede ser futura.'
};

/**
 * Traduce un error (de pg u otro) a { status, message, code }.
 */
function mapDbError(err) {
    const code = err && err.code;
    switch (code) {
        case '23505': // unique_violation
            return { status: 409, message: 'Ya existe un registro con esos datos únicos.', code };
        case '23503': // foreign_key_violation
            return { status: 400, message: 'Referencia inválida: el registro relacionado no existe.', code };
        case '23502': // not_null_violation
            return { status: 400, message: `Falta un campo obligatorio: ${err.column || 'desconocido'}.`, code };
        case '23514': // check_violation
            return { status: 400, message: CONSTRAINT_MESSAGES[err.constraint] || 'Un valor no cumple las reglas de validación.', code };
        case '22P02': // invalid_text_representation (ej: UUID malformado)
            return { status: 400, message: 'Formato de dato inválido en la solicitud.', code };
        case '22003': // numeric_value_out_of_range
            return { status: 400, message: 'Un valor numérico está fuera de rango.', code };
        default:
            return { status: err && err.status ? err.status : 500, message: null, code };
    }
}

/**
 * Envía una respuesta de error consistente.
 * Úsese en catch: catch (err) { return sendError(res, err); }
 */
function sendError(res, err) {
    const mapped = mapDbError(err);
    const status = mapped.status || 500;
    let message = mapped.message;
    if (!message) {
        message = status === 500
            ? (isDev ? (err && err.message) || 'Error interno' : 'Error interno del servidor')
            : ((err && err.message) || 'Solicitud inválida');
    }
    if (status >= 500) {
        console.error('[error]', err && err.stack ? err.stack : err);
    }
    const body = { error: message };
    if (isDev && status >= 500 && err && err.message) body.details = err.message;
    return res.status(status).json(body);
}

/**
 * Middleware global de errores (red de seguridad para throws no capturados).
 */
function errorMiddleware(err, req, res, _next) {
    return sendError(res, err);
}

/**
 * Middleware 404 para rutas no encontradas.
 */
function notFoundMiddleware(req, res) {
    return res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

module.exports = { mapDbError, sendError, errorMiddleware, notFoundMiddleware };
