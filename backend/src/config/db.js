require("dotenv").config();


async function connect() {
    
    if(global.connection)
        return global.connection.connect();


    const { Pool } = require("pg");
    const pool = new Pool({
        connectionString: process.env.CONNECTION_STRING

    });

    const client = await pool.connect(); 
    console.log("Criou o pool de conexão");

    const res = await client.query("Select now()");
    console.log(res.rows[0]);

    client.release();
    global.connection = pool;
    return pool.connect();
}

connect();

async function SelectSintomas() {
    const client = await connect();
    const res = await client.query("SELECT * FROM sintomas_predefinidos");
    return res.rows;

}


async function SelectUserByEmail(email) {
    const client = await connect();
    try {
        const res = await client.query("SELECT * FROM usuarios WHERE email = $1",[email]);
        return res.rows[0];
    } finally   {
        client.release();
    }
}

async function InsertUser(nome,email,senha,tipo) {

        const client = await connect();
        try {
            const res = await client.query(
                "INSERT INTO usuarios (nome, email, senha, tipo) VALUES ($1, $2, $3, $4)", [nome], [email], [senha], [tipo]
            );

            return res.rows[0].id;

        } finally {
            client.release();
        }
    
}


async function InsertPaciente(usuarioId, telefone, dataNascimento) {

    const client = await connect();
    try{

        await client.query(
            "INSERT INTO pacientes (usuario_id, telefone, data_nascimento) VALUES ($1, $2, $3)",
            [usuarioId],[telefone], [dataNascimento]
        );
    }finally{
        client.release();
    }
}


async function InsertMedico(usuario_id, crm, especialidade, telefone) {
    const client = await connect();
    try{

        await client.query(
            "INSERT INTO medicos (usuario_id, crm, especialidade, telefone) VALUES ($1, $2, $3, $4)",
            [usuario_id], [crm], [especialidade], [telefone]
        );

    } finally{
        client.release();
    }
    
}


module.exports = {
    SelectSintomas, 
    SelectUserByEmail, 
    InsertUser,
    InsertPaciente, 
    InsertMedico
}