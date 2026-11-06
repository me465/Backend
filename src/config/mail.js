const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: process.env.EMAIL_PORT == 465, // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,   // 10 seconds
  socketTimeout: 10000,     // 10 seconds
});

console.log('[Mail Config] Vérification de la configuration SMTP...');
console.log(`- Host: ${process.env.EMAIL_HOST}`);
console.log(`- Port: ${process.env.EMAIL_PORT}`);
console.log(`- User: ${process.env.EMAIL_USER}`);

transporter.verify((error, success) => {
  if (error) {
    console.error('[Mail Config] Erreur de configuration SMTP:', error);
  } else {
    console.log('[Mail Config] Le serveur SMTP est prêt à envoyer des messages');
  }
});

module.exports = transporter;
