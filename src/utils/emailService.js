const transporter = require('../config/mail');

const sendOtpEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'Yomankash <noreply@yomankash.com>',
    to: email,
    subject: 'Votre code de vérification Yomankash',
    text: `Votre code OTP est : ${otp}. Il est valable pendant 10 minutes.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
        <h2 style="color: #4CAF50; text-align: center;">Vérification Yomankash</h2>
        <p>Bonjour,</p>
        <p>Vous avez demandé un code de vérification pour votre compte Yomankash.</p>
        <div style="background-color: #f9f9f9; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; letter-spacing: 5px; color: #333; border-radius: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>Ce code est valable pendant <strong>10 minutes</strong> et ne peut être utilisé qu'une seule fois.</p>
        <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #888; text-align: center;">
          Ceci est un message automatique, merci de ne pas y répondre.
        </p>
      </div>
    `,
  };

  try {
    console.log(`[Email] Tentative d'envoi d'un OTP à ${email}...`);
    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email] OTP envoyé avec succès à ${email}. MessageId: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[Email] ERREUR lors de l'envoi de l'e-mail à ${email}:`);
    console.error(`- Code: ${error.code}`);
    console.error(`- Command: ${error.command}`);
    console.error(`- Message: ${error.message}`);
    if (error.response) console.error(`- Response: ${error.response}`);
    
    throw new Error('Erreur lors de l\'envoi de l\'e-mail d\'authentification.');
  }
};

module.exports = { sendOtpEmail };
