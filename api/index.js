// Entrada serverless explícita: a Vercel só transforma arquivos dentro de /api
// em Functions de forma previsível para projetos sem framework.
module.exports = require('../server');
