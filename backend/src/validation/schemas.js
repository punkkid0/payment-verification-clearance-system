const Joi = require('joi');
const { FEE_AMOUNTS } = require('../config/fees');

const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).pattern(/[A-Za-z]/).pattern(/[0-9]/).required()
    .messages({ 'string.pattern.base': 'Password must contain at least one letter and one number' }),
  full_name: Joi.string().min(2).max(100).required(),
  username: Joi.string().alphanum().min(3).max(50).optional(),
});

const loginSchema = Joi.object({
  username: Joi.string().optional(),
  email: Joi.string().email().optional(),
  password: Joi.string().required(),
}).or('username', 'email');

const updateProfileSchema = Joi.object({
  full_name: Joi.string().min(2).max(100).optional(),
  email: Joi.string().email().optional(),
  current_password: Joi.string().optional(),
  new_password: Joi.string().min(8).pattern(/[A-Za-z]/).pattern(/[0-9]/).optional(),
}).min(1).with('new_password', 'current_password');

const rejectClearanceSchema = Joi.object({
  reason: Joi.string().min(5).max(500).required(),
});

const recordLedgerPaymentSchema = Joi.object({
  rrr: Joi.string().trim().min(5).max(50).required(),
  student_id: Joi.number().integer().positive().required(),
  amount: Joi.number().valid(FEE_AMOUNTS.indigene, FEE_AMOUNTS.nonIndigene).required(),
  payment_method: Joi.string().valid('remita', 'paystack', 'bank_transfer', 'cash', 'other').default('remita'),
  notes: Joi.string().max(500).allow('', null).optional(),
});

const updateIndigeneSchema = Joi.object({
  is_indigene: Joi.boolean().required(),
});

const recordPaymentSchema = Joi.object({
  student_id: Joi.number().integer().positive().required(),
  amount: Joi.number().positive().required(),
  payment_method: Joi.string().min(2).max(50).required(),
  payment_reference: Joi.string().max(100).allow('', null).optional(),
  notes: Joi.string().max(500).allow('', null).optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  updateProfileSchema,
  rejectClearanceSchema,
  recordLedgerPaymentSchema,
  updateIndigeneSchema,
  recordPaymentSchema,
};