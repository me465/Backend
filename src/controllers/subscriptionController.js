const { User, Business, Subscription } = require('../models');

/**
 * Calcul de l'état d'abonnement unifié (FOYER, BUSINESS, FOYER_BUSINESS)
 */
const getSubscriptionState = (user, business) => {
  const plan = user?.plan || business?.plan || 'foyer';
  const role = user?.role || 'FOYER';

  const now = new Date();
  const trialEndsAt = business?.trialEndsAt || user?.trialEndsAt;
  const subscriptionEndsAt = business?.subscriptionEndsAt || user?.subscriptionEndsAt;

  const isTrialActive = trialEndsAt ? new Date(trialEndsAt) > now : false;
  const isPaidActive = subscriptionEndsAt ? new Date(subscriptionEndsAt) > now : false;
  const hasBusinessAccess = (plan === 'business' || !!business) && (isTrialActive || isPaidActive);

  // Définition de l'état d'abonnement selon le cahier des charges
  // FOYER : uniquement accès foyer (gratuit)
  // BUSINESS : accès business actif
  // FOYER_BUSINESS : bénéficiaire des deux packs (Foyer + Business)
  let membershipState = 'FOYER';
  if (hasBusinessAccess) {
    membershipState = 'FOYER_BUSINESS'; // Tout abonné Business bénéficie automatiquement des deux packs
  }

  let subscriptionStatus = 'none';
  let activeEndDate = null;

  if (isPaidActive) {
    subscriptionStatus = 'active';
    activeEndDate = new Date(subscriptionEndsAt);
  } else if (isTrialActive) {
    subscriptionStatus = 'trial';
    activeEndDate = new Date(trialEndsAt);
  } else if (plan === 'business' || business) {
    subscriptionStatus = 'expired';
  }

  let daysRemaining = 0;
  if (activeEndDate) {
    const diffTime = activeEndDate.getTime() - now.getTime();
    daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
  }

  return {
    membershipState, // 'FOYER' | 'BUSINESS' | 'FOYER_BUSINESS'
    hasFoyerAccess: true, // Toujours vrai pour tous
    hasBusinessAccess,
    isBusinessMember: hasBusinessAccess,
    plan: membershipState === 'FOYER_BUSINESS' ? 'business' : plan,
    role,
    subscriptionStatus,
    isTrialActive,
    isPaidActive,
    hasAccess: true, // Accès global à l'appli garanti
    daysRemaining,
    trialEndsAt,
    subscriptionEndsAt,
    targetRedirect: hasBusinessAccess ? '/business' : '/budget',
    pricing: {
      businessMonthlyPrice: 5000,
      monthlyPrice: 5000,
      currency: 'FCFA',
      trialDays: 45,
      acceptedPaymentMethods: ['mobile_money', 'airtel_money']
    }
  };
};

/**
 * Récupérer le statut de l'abonnement
 */
exports.getStatus = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Business }]
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const state = getSubscriptionState(user, user.Business);
    res.json(state);
  } catch (error) {
    console.error('[getStatus] Erreur:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Passer du Pack Foyer au Pack Business avec 45 jours d'essai gratuit
 */
exports.upgradeToBusiness = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      include: [{ model: Business }]
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const { companyName } = req.body;
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000);

    let business = user.Business;
    if (!business) {
      business = await Business.create({
        nom: companyName || user.companyName || `${user.name}'s Business`,
        plan: 'business',
        subscriptionStatus: 'trial',
        trialEndsAt,
        proprietaireId: user.id
      });
      user.businessId = business.id;
    } else {
      business.plan = 'business';
      business.subscriptionStatus = 'trial';
      business.trialEndsAt = trialEndsAt;
      if (companyName) business.nom = companyName;
      await business.save();
    }

    user.plan = 'business';
    user.role = user.role === 'FOYER' ? 'OWNER' : user.role;
    user.subscriptionStatus = 'trial';
    user.trialEndsAt = trialEndsAt;
    if (companyName) user.companyName = companyName;
    await user.save();

    // Enregistrer l'historique d'abonnement pour l'essai gratuit
    await Subscription.create({
      userId: user.id,
      businessId: business.id,
      plan: 'business',
      type: 'trial',
      paymentMethod: 'free_trial',
      montant: 0,
      devise: 'FCFA',
      durationMonths: 1,
      status: 'active',
      startDate: now,
      endDate: trialEndsAt,
      transactionReference: `TRIAL-${Date.now()}`
    });

    const state = getSubscriptionState(user, business);

    res.json({
      message: 'Félicitations ! Vous êtes passé au pack Business. Vous bénéficiez désormais des deux packs : Espace Foyer et Espace Business avec 45 jours d\'essai gratuit.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        plan: user.plan,
        membershipState: state.membershipState,
        hasFoyerAccess: true,
        hasBusinessAccess: true,
        companyName: user.companyName,
        businessId: user.businessId,
        subscriptionStatus: user.subscriptionStatus,
        trialEndsAt: user.trialEndsAt,
        targetRedirect: '/business'
      },
      business,
      subscription: state
    });
  } catch (error) {
    console.error('[upgradeToBusiness] Erreur:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Payer l'abonnement mensuel (5 000 FCFA / mois) via Mobile Money ou Airtel Money
 */
exports.paySubscription = async (req, res) => {
  try {
    const { paymentMethod, phoneNumber, months = 1 } = req.body;

    if (!paymentMethod) {
      return res.status(400).json({
        message: 'Moyen de paiement requis. Méthodes acceptées : Mobile Money ou Airtel Money.'
      });
    }

    const normalizedMethod = paymentMethod.toLowerCase().trim();
    const validMethods = ['mobile_money', 'airtel_money', 'mtn_money', 'moov_money', 'orange_money', 'airtel', 'momo'];
    
    if (!validMethods.includes(normalizedMethod)) {
      return res.status(400).json({
        message: 'Méthode de paiement invalide. Veuillez choisir entre Mobile Money et Airtel Money.'
      });
    }

    const methodCategory = (normalizedMethod.includes('airtel')) ? 'airtel_money' : 'mobile_money';

    const durationMonths = parseInt(months, 10) || 1;
    if (durationMonths < 1) {
      return res.status(400).json({ message: 'La durée minimale d\'abonnement est de 1 mois.' });
    }

    const pricePerMonth = 5000;
    const totalAmount = durationMonths * pricePerMonth;

    const user = await User.findByPk(req.user.id, {
      include: [{ model: Business }]
    });

    if (!user) {
      return res.status(404).json({ message: 'Utilisateur non trouvé' });
    }

    const now = new Date();
    let baseDate = now;
    if (user.subscriptionEndsAt && new Date(user.subscriptionEndsAt) > now) {
      baseDate = new Date(user.subscriptionEndsAt);
    }

    const newEndDate = new Date(baseDate.getTime() + durationMonths * 30 * 24 * 60 * 60 * 1000);

    let business = user.Business;
    if (!business) {
      business = await Business.create({
        nom: user.companyName || `${user.name}'s Business`,
        plan: 'business',
        subscriptionStatus: 'active',
        subscriptionEndsAt: newEndDate,
        proprietaireId: user.id
      });
      user.businessId = business.id;
    } else {
      business.plan = 'business';
      business.subscriptionStatus = 'active';
      business.subscriptionEndsAt = newEndDate;
      await business.save();
    }

    user.plan = 'business';
    user.role = user.role === 'FOYER' ? 'OWNER' : user.role;
    user.subscriptionStatus = 'active';
    user.subscriptionEndsAt = newEndDate;
    await user.save();

    const transactionReference = `YMK-${methodCategory === 'airtel_money' ? 'AIRTEL' : 'MOM'}-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    const subscription = await Subscription.create({
      userId: user.id,
      businessId: business.id,
      plan: 'business',
      type: 'payment',
      paymentMethod: methodCategory,
      phoneNumber: phoneNumber || user.phone,
      montant: totalAmount,
      devise: 'FCFA',
      durationMonths,
      status: 'completed',
      startDate: baseDate,
      endDate: newEndDate,
      transactionReference
    });

    const state = getSubscriptionState(user, business);

    res.json({
      message: `Paiement de ${totalAmount} FCFA effectué avec succès via ${methodCategory === 'airtel_money' ? 'Airtel Money' : 'Mobile Money'}. Votre abonnement Pack Business est activé pour ${durationMonths} mois.`,
      transactionReference,
      amount: totalAmount,
      currency: 'FCFA',
      paymentMethod: methodCategory,
      subscription: state,
      receipt: {
        id: subscription.id,
        plan: 'business',
        months: durationMonths,
        amount: totalAmount,
        currency: 'FCFA',
        paymentMethod: methodCategory,
        phoneNumber: subscription.phoneNumber,
        startDate: baseDate,
        endDate: newEndDate,
        reference: transactionReference
      }
    });
  } catch (error) {
    console.error('[paySubscription] Erreur:', error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Récupérer l'historique des abonnements
 */
exports.getHistory = async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'DESC']]
    });
    res.json(subscriptions);
  } catch (error) {
    console.error('[getHistory] Erreur:', error);
    res.status(500).json({ message: error.message });
  }
};
