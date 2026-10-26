const { check, validationResult } = require('express-validator');

/**
 * Intercept and return structured validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((e) => ({
        field: e.path,
        message: e.msg,
      })),
    });
  }
  next();
};

const registerValidation = [
  check('name', 'Name is required').trim().notEmpty(),
  check('email', 'Please include a valid email').isEmail().normalizeEmail(),
  check('password', 'Password must be at least 6 characters long').isLength({ min: 6 }),
  check('role')
    .optional()
    .isIn(['admin', 'analyst', 'viewer'])
    .withMessage('Role must be admin, analyst, or viewer'),
  handleValidationErrors,
];

const loginValidation = [
  check('email', 'Please include a valid email').isEmail().normalizeEmail(),
  check('password', 'Password is required').notEmpty(),
  handleValidationErrors,
];

const apiValidation = [
  check('name', 'API Name is required').trim().notEmpty(),
  check('url', 'A valid HTTP/HTTPS endpoint URL is required')
    .trim()
    .isURL({ protocols: ['http', 'https'], require_protocol: true }),
  check('method')
    .optional()
    .isIn(['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD'])
    .withMessage('Method must be GET, POST, PUT, DELETE, PATCH, or HEAD'),
  check('expectedStatusCode')
    .optional()
    .isInt({ min: 100, max: 599 })
    .withMessage('Expected status code must be between 100 and 599'),
  check('interval')
    .optional()
    .isInt({ min: 5, max: 86400 })
    .withMessage('Monitoring interval must be between 5 seconds and 86400 seconds'),
  check('timeout')
    .optional()
    .isInt({ min: 500, max: 60000 })
    .withMessage('Timeout must be between 500ms and 60000ms'),
  handleValidationErrors,
];

const incidentUpdateValidation = [
  check('status')
    .optional()
    .isIn(['open', 'investigating', 'identified', 'monitoring', 'resolved'])
    .withMessage('Status must be open, investigating, identified, monitoring, or resolved'),
  check('severity')
    .optional()
    .isIn(['critical', 'major', 'minor'])
    .withMessage('Severity must be critical, major, or minor'),
  handleValidationErrors,
];

module.exports = {
  registerValidation,
  loginValidation,
  apiValidation,
  incidentUpdateValidation,
  handleValidationErrors,
};
