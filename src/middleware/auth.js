const jwt = require('jsonwebtoken');
const { User, Business } = require('../models');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

    if (!token) {
      return res.status(401).json({ message: 'Accès refusé : token manquant' });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('FATAL: JWT_SECRET manquant dans les variables d\'environnement');
      return res.status(500).json({ message: 'Erreur de configuration serveur' });
    }

    const decoded = jwt.verify(token, jwtSecret);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: 'Token invalide' });
    }

    const user = await User.findByPk(decoded.id, {
      include: [{ model: Business }]
    });

    if (!user || !user.actif) {
      return res.status(401).json({ message: 'Utilisateur introuvable ou compte désactivé' });
    }

    // Déduction sécurisée du businessId et plan depuis la base de données
    if (!user.businessId && user.Business) {
      user.businessId = user.Business.id;
    }

    if (!user.businessId && (user.role === 'OWNER' || user.plan === 'business')) {
      const owned = await Business.findOne({ where: { proprietaireId: user.id } });
      if (owned) {
        user.businessId = owned.id;
        user.Business = owned;
      }
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expirée, veuillez vous reconnecter' });
    }
    return res.status(401).json({ message: 'Token invalide ou non autorisé' });
  }
};

const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Non authentifié' });
    }
    const userRole = (req.user.role || '').toUpperCase();
    const allowedRoles = roles.map(r => r.toUpperCase());
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ message: 'Accès interdit : privilèges insuffisants' });
    }
    next();
  };
};

const checkPlan = (requiredPlan) => {
  return (req, res, next) => {
    const userPlan = req.user?.plan || req.user?.Business?.plan;
    if (!userPlan || userPlan !== requiredPlan) {
      return res.status(403).json({ message: `Cette fonctionnalité nécessite le pack ${requiredPlan}` });
    }

    // Si le pack requis est business, vérifier si l'essai ou l'abonnement est toujours valide
    if (requiredPlan === 'business') {
      const now = new Date();
      const trialEndsAt = req.user?.Business?.trialEndsAt || req.user?.trialEndsAt;
      const subscriptionEndsAt = req.user?.Business?.subscriptionEndsAt || req.user?.subscriptionEndsAt;

      const isTrialValid = trialEndsAt ? new Date(trialEndsAt) > now : false;
      const isPaidValid = subscriptionEndsAt ? new Date(subscriptionEndsAt) > now : false;

      if (!isTrialValid && !isPaidValid) {
        return res.status(403).json({
          code: 'SUBSCRIPTION_EXPIRED',
          message: 'Votre période d\'essai ou votre abonnement Business a expiré. Veuillez renouveler votre abonnement.',
          price: 5000,
          currency: 'FCFA',
          acceptedPaymentMethods: ['mobile_money', 'airtel_money']
        });
      }
    }

    next();
  };
};

const checkSubscription = (req, res, next) => {
  const userPlan = req.user?.plan || req.user?.Business?.plan;
  if (userPlan === 'business') {
    const now = new Date();
    const trialEndsAt = req.user?.Business?.trialEndsAt || req.user?.trialEndsAt;
    const subscriptionEndsAt = req.user?.Business?.subscriptionEndsAt || req.user?.subscriptionEndsAt;

    const isTrialValid = trialEndsAt ? new Date(trialEndsAt) > now : false;
    const isPaidValid = subscriptionEndsAt ? new Date(subscriptionEndsAt) > now : false;

    if (!isTrialValid && !isPaidValid) {
      return res.status(403).json({
        code: 'SUBSCRIPTION_EXPIRED',
        message: 'Votre période d\'essai ou votre abonnement Business a expiré. Veuillez renouveler votre abonnement.',
        price: 5000,
        currency: 'FCFA',
        acceptedPaymentMethods: ['mobile_money', 'airtel_money']
      });
    }
  }
  next();
};

module.exports = { authMiddleware, requireRole, checkPlan, checkSubscription };
