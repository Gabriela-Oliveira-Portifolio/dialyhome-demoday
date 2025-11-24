require("dotenv").config();

const port = process.env.PORT;

const express = require("express");

const app = express();

app.listen(port);

console.log("Backend Rodando");

app.get('/health', (req, res) => {
    res.json({ message: 'DialyHome API está funcionando!' });
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});


