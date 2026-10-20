const express = require('express');
const router = express.Router();
const { AlertRule, Monitor } = require('../models');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validate, alertRuleValidation } = require('../middleware/validator');

// List alert rules
router.get('/', authenticateToken, async (req, res) => {
  try {
    const rules = await AlertRule.findAll({
      include: [{ model: Monitor, as: 'monitor', attributes: ['id', 'name', 'url'] }],
      order: [['createdAt', 'DESC']],
    });

    return res.json({
      success: true,
      count: rules.length,
      data: rules,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Create alert rule
router.post('/', authenticateToken, requireRole('admin'), validate(alertRuleValidation), async (req, res) => {
  try {
    const { name, monitorId, conditionType, thresholdValue, channel, targetRecipient, isEnabled } = req.body;

    const rule = await AlertRule.create({
      name,
      monitorId: monitorId || null,
      conditionType,
      thresholdValue: thresholdValue || 3,
      channel: channel || 'incident',
      targetRecipient: targetRecipient || 'alerts@apisentinel.dev',
      isEnabled: isEnabled !== undefined ? isEnabled : true,
    });

    return res.status(201).json({
      success: true,
      message: 'Alert rule created successfully.',
      data: rule,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Update alert rule
router.put('/:id', authenticateToken, requireRole('admin'), validate(alertRuleValidation), async (req, res) => {
  try {
    const rule = await AlertRule.findByPk(req.params.id);
    if (!rule) {
      return res.status(404).json({
        success: false,
        error: `Alert rule with ID ${req.params.id} not found.`,
      });
    }

    const { name, monitorId, conditionType, thresholdValue, channel, targetRecipient, isEnabled } = req.body;

    await rule.update({
      name: name ?? rule.name,
      monitorId: monitorId !== undefined ? monitorId : rule.monitorId,
      conditionType: conditionType ?? rule.conditionType,
      thresholdValue: thresholdValue ?? rule.thresholdValue,
      channel: channel ?? rule.channel,
      targetRecipient: targetRecipient ?? rule.targetRecipient,
      isEnabled: isEnabled !== undefined ? isEnabled : rule.isEnabled,
    });

    return res.json({
      success: true,
      message: 'Alert rule updated successfully.',
      data: rule,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Toggle enabled status
router.patch('/:id/toggle', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const rule = await AlertRule.findByPk(req.params.id);
    if (!rule) {
      return res.status(404).json({
        success: false,
        error: `Alert rule with ID ${req.params.id} not found.`,
      });
    }

    await rule.update({ isEnabled: !rule.isEnabled });

    return res.json({
      success: true,
      message: `Alert rule is now ${rule.isEnabled ? 'active' : 'paused'}.`,
      data: rule,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// Delete alert rule
router.delete('/:id', authenticateToken, requireRole('admin'), async (req, res) => {
  try {
    const rule = await AlertRule.findByPk(req.params.id);
    if (!rule) {
      return res.status(404).json({
        success: false,
        error: `Alert rule with ID ${req.params.id} not found.`,
      });
    }

    await rule.destroy();

    return res.json({
      success: true,
      message: `Alert rule '${rule.name}' deleted successfully.`,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

module.exports = router;
