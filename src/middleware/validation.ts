import { body } from 'express-validator';

// ── Login ─────────────────────────────────────────────────────────
export const loginValidation = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Debe proporcionar un email valido.')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('La contrasena es requerida.')
    .isLength({ min: 6 })
    .withMessage('La contrasena debe tener al menos 6 caracteres.'),
];

// ── Create Solicitud (public contact form) ────────────────────────
export const createSolicitudValidation = [
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido.')
    .isLength({ max: 200 })
    .withMessage('El nombre no puede exceder 200 caracteres.')
    .escape(),
  body('telefono')
    .trim()
    .notEmpty()
    .withMessage('El telefono es requerido.')
    .isLength({ max: 30 })
    .withMessage('El telefono no puede exceder 30 caracteres.')
    .matches(/^[0-9+\-() ]+$/)
    .withMessage('Formato de telefono invalido.'),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Debe proporcionar un email valido.')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('El email no puede exceder 255 caracteres.'),
  body('tipoCaso')
    .isIn([
      'FAMILIA',
      'ADMINISTRATIVO',
      'CORPORATIVO',
      'CIVIL',
      'PENAL',
      'LABORAL',
      'MIGRATORIO',
    ])
    .withMessage('Tipo de caso invalido.'),
  body('mensaje')
    .trim()
    .notEmpty()
    .withMessage('El mensaje es requerido.')
    .isLength({ max: 5000 })
    .withMessage('El mensaje no puede exceder 5000 caracteres.'),
  body('origen')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('El origen no puede exceder 100 caracteres.')
    .escape(),
];

// ── Update Solicitud (admin panel) ────────────────────────────────
export const updateSolicitudValidation = [
  body('estado')
    .optional()
    .isIn(['PENDIENTE', 'EN_PROCESO', 'ATENDIDA', 'ARCHIVADA'])
    .withMessage('Estado invalido.'),
  body('notasInternas')
    .optional()
    .trim()
    .isLength({ max: 5000 })
    .withMessage('Las notas internas no pueden exceder 5000 caracteres.'),
  body('asignadoAId')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('El ID del usuario asignado debe ser un entero positivo.')
    .toInt(),
  body('comentario')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('El comentario no puede exceder 2000 caracteres.'),
];

// ── Create User (admin panel) ─────────────────────────────────────
export const createUserValidation = [
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido.')
    .isLength({ max: 150 })
    .withMessage('El nombre no puede exceder 150 caracteres.')
    .escape(),
  body('email')
    .trim()
    .isEmail()
    .withMessage('Debe proporcionar un email valido.')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('El email no puede exceder 255 caracteres.'),
  body('password')
    .notEmpty()
    .withMessage('La contrasena es requerida.')
    .isLength({ min: 6 })
    .withMessage('La contrasena debe tener al menos 6 caracteres.')
    .isLength({ max: 128 })
    .withMessage('La contrasena no puede exceder 128 caracteres.'),
  body('rol')
    .isIn(['ADMIN', 'ABOGADO'])
    .withMessage('Rol invalido. Debe ser ADMIN o ABOGADO.'),
];

// ── Create Blog Post (admin) ──────────────────────────────────────
export const createBlogPostValidation = [
  body('titulo_es')
    .trim()
    .notEmpty()
    .withMessage('El titulo en espanol es requerido.')
    .isLength({ max: 300 })
    .withMessage('El titulo en espanol no puede exceder 300 caracteres.'),
  body('titulo_en')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 300 })
    .withMessage('El titulo en ingles no puede exceder 300 caracteres.'),
  body('extracto_es')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('El extracto en espanol no puede exceder 500 caracteres.'),
  body('extracto_en')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('El extracto en ingles no puede exceder 500 caracteres.'),
  body('contenido_es')
    .trim()
    .notEmpty()
    .withMessage('El contenido en espanol es requerido.'),
  body('contenido_en')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('El contenido en ingles debe ser texto.'),
  body('categoria_es')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('La categoria en espanol no puede exceder 100 caracteres.'),
  body('categoria_en')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('La categoria en ingles no puede exceder 100 caracteres.'),
  body('tags_es')
    .optional({ values: 'falsy' })
    .isArray({ max: 20 })
    .withMessage('Los tags en espanol deben ser un arreglo (max 20).'),
  body('tags_en')
    .optional({ values: 'falsy' })
    .isArray({ max: 20 })
    .withMessage('Los tags en ingles deben ser un arreglo (max 20).'),
  body('imagenDestacada')
    .optional({ values: 'falsy' })
    .isString()
    .withMessage('La imagen destacada debe ser un string base64.'),
  body('imagenDestacadaMime')
    .optional({ values: 'falsy' })
    .isIn(['image/jpeg', 'image/png', 'image/webp'])
    .withMessage('Tipo MIME de imagen invalido.'),
  body('autor')
    .trim()
    .notEmpty()
    .withMessage('El autor es requerido.')
    .isLength({ max: 200 })
    .withMessage('El autor no puede exceder 200 caracteres.'),
  body('estado')
    .optional()
    .isIn(['BORRADOR', 'PROGRAMADO', 'PUBLICADO', 'ARCHIVADO'])
    .withMessage('Estado de blog invalido.'),
  body('fechaPublicacion')
    .optional({ values: 'falsy' })
    .isISO8601()
    .withMessage('Fecha de publicacion invalida (ISO 8601).'),
];

// ── Update Blog Post (admin) ──────────────────────────────────────
export const updateBlogPostValidation = [
  body('titulo_es')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El titulo en espanol no puede estar vacio.')
    .isLength({ max: 300 })
    .withMessage('El titulo en espanol no puede exceder 300 caracteres.'),
  body('titulo_en')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 300 })
    .withMessage('El titulo en ingles no puede exceder 300 caracteres.'),
  body('extracto_es')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('El extracto en espanol no puede exceder 500 caracteres.'),
  body('extracto_en')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 500 })
    .withMessage('El extracto en ingles no puede exceder 500 caracteres.'),
  body('contenido_es')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El contenido en espanol no puede estar vacio.'),
  body('contenido_en')
    .optional({ values: 'null' })
    .isString()
    .withMessage('El contenido en ingles debe ser texto.'),
  body('categoria_es')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('La categoria en espanol no puede exceder 100 caracteres.'),
  body('categoria_en')
    .optional({ values: 'null' })
    .trim()
    .isLength({ max: 100 })
    .withMessage('La categoria en ingles no puede exceder 100 caracteres.'),
  body('tags_es')
    .optional({ values: 'null' })
    .isArray({ max: 20 })
    .withMessage('Los tags en espanol deben ser un arreglo (max 20).'),
  body('tags_en')
    .optional({ values: 'null' })
    .isArray({ max: 20 })
    .withMessage('Los tags en ingles deben ser un arreglo (max 20).'),
  body('imagenDestacada')
    .optional({ values: 'null' })
    .isString()
    .withMessage('La imagen destacada debe ser un string base64.'),
  body('imagenDestacadaMime')
    .optional({ values: 'null' })
    .isIn(['image/jpeg', 'image/png', 'image/webp'])
    .withMessage('Tipo MIME de imagen invalido.'),
  body('autor')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El autor no puede estar vacio.')
    .isLength({ max: 200 })
    .withMessage('El autor no puede exceder 200 caracteres.'),
  body('estado')
    .optional()
    .isIn(['BORRADOR', 'PROGRAMADO', 'PUBLICADO', 'ARCHIVADO'])
    .withMessage('Estado de blog invalido.'),
  body('fechaPublicacion')
    .optional({ values: 'null' })
    .isISO8601()
    .withMessage('Fecha de publicacion invalida (ISO 8601).'),
];

// ── Create Cliente (admin panel) ──────────────────────────────────
export const createClienteValidation = [
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre es obligatorio.')
    .isLength({ max: 200 })
    .withMessage('El nombre no puede exceder 200 caracteres.')
    .escape(),
  body('telefono')
    .trim()
    .notEmpty()
    .withMessage('El teléfono es obligatorio.')
    .isLength({ max: 30 })
    .withMessage('El teléfono no puede exceder 30 caracteres.')
    .matches(/^[0-9+\-() ]+$/)
    .withMessage('Formato de teléfono inválido.'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('El correo es obligatorio.')
    .isEmail()
    .withMessage('Debe proporcionar un email válido.')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('El email no puede exceder 255 caracteres.'),
  body('notas')
    .optional({ values: 'falsy' })
    .isLength({ max: 5000 })
    .withMessage('Las notas no pueden exceder 5000 caracteres.')
    .trim(),
];

// ── Update Cliente (admin panel) ──────────────────────────────────
export const updateClienteValidation = [
  body('nombre')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('El nombre no puede exceder 200 caracteres.')
    .escape(),
  body('telefono')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('El teléfono no puede exceder 30 caracteres.')
    .matches(/^[0-9+\-() ]+$/)
    .withMessage('Formato de teléfono inválido.'),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Debe proporcionar un email válido.')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('El email no puede exceder 255 caracteres.'),
  body('notas')
    .optional({ values: 'null' })
    .isLength({ max: 5000 })
    .withMessage('Las notas no pueden exceder 5000 caracteres.')
    .trim(),
];

// ── Create Solicitud Admin (admin panel) ──────────────────────────
export const createSolicitudAdminValidation = [
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre es obligatorio.')
    .isLength({ max: 200 })
    .withMessage('El nombre no puede exceder 200 caracteres.')
    .escape(),
  body('telefono')
    .trim()
    .notEmpty()
    .withMessage('El teléfono es obligatorio.')
    .isLength({ max: 30 })
    .withMessage('El teléfono no puede exceder 30 caracteres.')
    .matches(/^[0-9+\-() ]+$/)
    .withMessage('Formato de teléfono inválido.'),
  body('email')
    .trim()
    .notEmpty()
    .withMessage('El correo es obligatorio.')
    .isEmail()
    .withMessage('Debe proporcionar un email válido.')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('El email no puede exceder 255 caracteres.'),
  body('tipoCaso')
    .trim()
    .notEmpty()
    .withMessage('El tipo de caso es requerido.')
    .isIn([
      'FAMILIA',
      'ADMINISTRATIVO',
      'CORPORATIVO',
      'CIVIL',
      'PENAL',
      'LABORAL',
      'MIGRATORIO',
    ])
    .withMessage('Tipo de caso inválido.'),
  body('mensaje')
    .optional({ values: 'falsy' })
    .isLength({ max: 5000 })
    .withMessage('El mensaje no puede exceder 5000 caracteres.')
    .trim(),
  body('origen')
    .trim()
    .notEmpty()
    .withMessage('El origen es requerido.')
    .isIn(['web', 'whatsapp', 'tiktok', 'instagram', 'referido'])
    .withMessage('Origen inválido.'),
  body('clienteId')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('El ID del cliente debe ser un entero positivo.')
    .toInt(),
];

// ── Create Comentario (solicitud comment) ────────────────────────
export const createComentarioValidation = [
  body('contenido')
    .trim()
    .notEmpty()
    .withMessage('El comentario es obligatorio.')
    .isLength({ max: 5000 })
    .withMessage('El comentario no puede exceder 5000 caracteres.'),
  body('parentId')
    .optional({ values: 'null' })
    .isInt({ min: 1 })
    .withMessage('El ID del comentario padre debe ser un entero positivo.')
    .toInt(),
];

// ── Update User (admin panel) ─────────────────────────────────────
export const updateUserValidation = [
  body('nombre')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('El nombre no puede estar vacio.')
    .isLength({ max: 150 })
    .withMessage('El nombre no puede exceder 150 caracteres.')
    .escape(),
  body('email')
    .optional()
    .trim()
    .isEmail()
    .withMessage('Debe proporcionar un email valido.')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('El email no puede exceder 255 caracteres.'),
  body('password')
    .optional()
    .isLength({ min: 6 })
    .withMessage('La contrasena debe tener al menos 6 caracteres.')
    .isLength({ max: 128 })
    .withMessage('La contrasena no puede exceder 128 caracteres.'),
  body('rol')
    .optional()
    .isIn(['ADMIN', 'ABOGADO'])
    .withMessage('Rol invalido. Debe ser ADMIN o ABOGADO.'),
  body('activo')
    .optional()
    .isBoolean()
    .withMessage('El campo activo debe ser booleano.'),
];
