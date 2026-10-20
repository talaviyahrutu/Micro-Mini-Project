const { validationResult, body, param, query } = require('express-validator');

const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map((err) => ({
        field: err.path || err.param,
        message: err.msg,
        value: err.value,
      })),
    });
  };
};

const registerValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email address is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
  body('role').optional().isIn(['admin', 'analyst', 'viewer']).withMessage('Role must be admin, analyst, or viewer'),
];

const loginValidation = [
  body('email').trim().isEmail().normalizeEmail().withMessage('Valid email address is required'),
  body('password').notEmpty().withMessage('Password is required'),
];

const monitorValidation = [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Monitor name must be between 2 and 120 characters'),
  body('url').trim().isURL({ require_tld: false, protocols: ['http', 'https'] }).withMessage('Valid HTTP/HTTPS URL is required'),
  body('method').optional().isIn(['GET', 'POST', 'PUT', 'DELETE', 'HEAD', 'PATCH']).withMessage('Invalid HTTP method'),
  body('expectedStatusCode').optional().isInt({ min: 100, max: 599 }).withMessage('Expected status code must be between 100 and 599'),
  body('intervalSeconds').optional().isInt({ min: 5, max: 3600 }).withMessage('Interval must be between 5 and 3600 seconds'),
  body('timeoutMs').optional().isInt({ min: 500, max: 30000 }).withMessage('Timeout must be between 500 and 30000 ms'),
  body('environment').optional().isIn(['production', 'staging', 'development', 'internal']).withMessage('Invalid environment'),
];

const incidentValidation = [
  body('title').trim().isLength({ min: 3, max: 200 }).withMessage('Incident title must be between 3 and 200 characters'),
  body('severity').optional().isIn(['critical', 'high', 'medium', 'low']).withMessage('Severity must be critical, high, medium, or low'),
  body('status').optional().isIn(['investigating', 'identified', 'monitoring', 'resolved']).withMessage('Status must be investigating, identified, monitoring, or resolved'),
  body('monitorId').optional({ nullable: true }).isInt().withMessage('monitorId must be a valid integer ID'),
];

const alertRuleValidation = [
  body('name').trim().isLength({ min: 2, max: 120 }).withMessage('Alert rule name must be between 2 and 120 characters'),
  body('conditionType').isIn(['consecutive_failures', 'latency_threshold', 'status_code_mismatch']).withMessage('Invalid condition type'),
  body('thresholdValue').isInt({ min: 1 }).withMessage('Threshold value must be an integer >= 1'),
  body('channel').optional().isIn(['email', 'slack', 'webhook', 'incident']).withMessage('Invalid alert channel'),
];

module.exports = {
  validate,
  registerValidation,
  loginValidation,
  monitorValidation,
  incidentValidation,
  alertRuleValidation,
};
