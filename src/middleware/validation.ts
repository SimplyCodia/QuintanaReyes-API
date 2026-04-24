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
