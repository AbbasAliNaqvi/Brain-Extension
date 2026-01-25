const Joi = require('joi');

const passwordRule = Joi.string().min(8).required().messages({
    'string.min': 'Password must be at least 8 characters long',
    'any.required': 'Password is required'
});

const signup = Joi.object({
  name: Joi.string().min(2).max(30).required(),
  email: Joi.string().email().required(),
  password: passwordRule,
  avatarUrl: Joi.string().uri().optional()
});

const login = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

const refresh = Joi.object({
  refreshToken: Joi.string().required()
});

module.exports = {
  signup,
  login,
  refresh
};