const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Função para criptografar a senha
async function hashPassword(password) {
    return await bcrypt.hash(password, 10);
   
}

async function comparePassword(password, hasedhPassword) {
    return await bcrypt.compare(password,hasedhPassword);
}

function generateTokenUser(usuario_id, tipo_usuario){
    return jwt.sign(
        {usuario_id: usuario_id, tipo_usuario:tipo_usuario},
        process.env.JTW_SECRET,
        { expiresIn: '90d' }
    );
}

function verifyToken(token){
    try{
        return jwt.verify(token, process.env.JTW_SECRET);
    } catch (error) {
        return null;
    }
}


module.exports = {
    hashPassword, comparePassword, generateTokenUser, verifyToken
}