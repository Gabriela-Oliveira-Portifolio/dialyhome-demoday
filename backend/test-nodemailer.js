const nodemailer = require('nodemailer');

console.log('nodemailer:', nodemailer);
console.log('createTransport:', typeof nodemailer.createTransport);

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: {
    user: 'test@gmail.com',
    pass: 'test'
  }
});

console.log('✅ Transporter criado com sucesso!');