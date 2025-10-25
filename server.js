// Servidor HTTP simples para manter o bot ativo no Glitch
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.send('KWMC Bot está online!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor HTTP rodando na porta ${PORT}`);
});

// Iniciar o bot Discord
require('./src/index.js');
