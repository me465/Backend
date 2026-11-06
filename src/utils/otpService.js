const crypto = require('crypto');
const axios = require('axios');
const qs = require('qs');
const bcrypt = require('bcryptjs');

/**
 * Génère un code OTP numérique à 6 chiffres
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Hash un code OTP
 */
const hashOTP = async (otp) => {
  return await bcrypt.hash(otp, 10);
};

/**
 * Vérifie un code OTP par rapport à son hash
 */
const verifyOTP = async (otp, hashedOtp) => {
  return await bcrypt.compare(otp, hashedOtp);
};

/**
 * Obtient un token d'accès Orange SMS
 */
const getOrangeToken = async () => {
  const clientId = process.env.ORANGE_CLIENT_ID;
  const clientSecret = process.env.ORANGE_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('ORANGE_CLIENT_ID ou ORANGE_CLIENT_SECRET manquant');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  
  try {
    const response = await axios({
      method: 'post',
      url: 'https://api.orange.com/oauth/v3/token',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      data: qs.stringify({
        grant_type: 'client_credentials'
      })
    });
    
    return response.data.access_token;
  } catch (error) {
    console.error('Erreur lors de l\'obtention du token Orange:', error.response?.data || error.message);
    throw new Error('Impossible d\'obtenir le token Orange');
  }
};


/**
 * Envoie un SMS via Orange SMS CI ou simule l'envoi
 */
const sendSMS = async (phone, otp) => {
  const provider = process.env.SMS_SERVICE_PROVIDER || 'orange';

  const senderAddress = process.env.ORANGE_SENDER_PHONE || 'tel:+22500000000'; // À configurer

  // Nettoyage du numéro : on ne garde que les chiffres
  let cleanPhone = phone.replace(/\D/g, '');
  
  // Si le numéro commence par 00, on remplace par +
  if (phone.startsWith('00')) {
    cleanPhone = cleanPhone.substring(2);
  }

  // Gestion du préfixe international
  let finalPhone = cleanPhone;
  if (cleanPhone.length === 10 && (cleanPhone.startsWith('01') || cleanPhone.startsWith('05') || cleanPhone.startsWith('07'))) {
    // Numéro local CI (10 chiffres) -> on ajoute le +225
    finalPhone = '225' + cleanPhone;
  }
  
  // Format pour Orange (doit commencer par tel:+)
  let orangePhone = finalPhone.startsWith('+') ? `tel:${finalPhone}` : `tel:+${finalPhone}`;
  
  // Format pour Twilio (doit commencer par +)
  let twilioPhone = finalPhone.startsWith('+') ? finalPhone : `+${finalPhone}`;

  if (provider === 'orange') {
    try {
      console.log(`[Orange SMS] Tentative d'envoi vers ${orangePhone}...`);
      const token = await getOrangeToken();
      
      const payload = {
        outboundSMSMessageRequest: {
          address: orangePhone,
          senderAddress: senderAddress,
          outboundSMSTextMessage: {
            message: `Votre code OTP Yomankash est: ${otp}`
          }
        }
      };

      const response = await axios({
        method: 'post',
        url: `https://api.orange.com/smsmessaging/v1/outbound/${encodeURIComponent(senderAddress)}/requests`,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        data: payload
      });

      console.log(`[Orange SMS] Succès: OTP envoyé à ${orangePhone}`);
      return true;
    } catch (error) {
      console.error(`[Orange SMS] Erreur d'envoi à ${orangePhone}:`, error.response?.data || error.message);
      return false;
    }
  } else if (provider === 'twilio') {
    try {
      console.log(`[Twilio SMS] Tentative d'envoi vers ${twilioPhone}...`);
      const client = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);
      await client.messages.create({
        body: `Votre code OTP Yomankash est: ${otp}`,
        from: process.env.TWILIO_PHONE,
        to: twilioPhone
      });
      console.log(`[Twilio SMS] Succès: OTP envoyé à ${twilioPhone}`);
      return true;
    } catch (error) {
      console.error(`[Twilio SMS] Erreur d'envoi à ${twilioPhone}:`, error.message);
      return false;
    }
  } else {
    console.log(`[SIMULATION SMS] Mode "${provider || 'développement'}" actif. Code ${otp} pour ${twilioPhone}`);
    return true;
  }
};

module.exports = {
  generateOTP,
  hashOTP,
  verifyOTP,
  sendSMS
};
