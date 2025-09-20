// require("dotenv").config();

require("dotenv").config({ path: __dirname + "/../.env" });

const db = require("./src/config/db");


const port = process.env.PORT;

const express = require("express");

const app = express();


console.log("Backend Rodando");

app.get('/health', (req, res) => {
    res.json({ message: 'DialyHome API está funcionando!' });
});

app.listen(port, () => {
    console.log(`Servidor rodando na porta ${port}`);
});

app.get('/Sintomas', async (req, res) => {

        const sintomas = await db.SelectSintomas();
        res.json(sintomas);
})

app.get('/Usuarios', async (req, res) => {

    const email = await db.SelectUserByEmail("ana.souza@example.com");
    res.json(email);
})


