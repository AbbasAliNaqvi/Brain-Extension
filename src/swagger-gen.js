const path = require('path');
const swaggerAutogen = require('swagger-autogen')();

const doc = {
  info: {
    title: 'Brain-Extension API',
    description: 'Auto-generated documentation for the Second Brain',
  },
  schemes: ['http', 'https'],
  securityDefinitions: {
    bearerAuth: {
      type: 'apiKey',
      in: 'header',
      name: 'Authorization',
      description: 'Enter your bearer token in the format **Bearer &lt;token&gt;**',
    },
  },
};

const outputFile = path.join(__dirname, 'swagger-output.json');
const routes = [path.join(__dirname, 'app.js')];

swaggerAutogen(outputFile, routes, doc);