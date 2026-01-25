const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const object = Object.keys(req.body).length ? req.body : req.query;
  
  const { value, error } = schema.validate(object, { 
    abortEarly: false, 
    stripUnknown: true 
  });

  if (error) {
    const errorMessage = error.details.map((details) => details.message).join(', ');
    return res.status(400).json({
      status: "BAD_REQUEST",
      message: errorMessage
    });
  }
  
  Object.assign(req, value);
  return next();
};

module.exports = validate;