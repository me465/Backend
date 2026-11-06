const { Client, Business, User } = require('../models');

const resolveBusinessId = async (user) => {
  if (user.businessId) return user.businessId;
  if (user.Business?.id) return user.Business.id;

  let business = await Business.findOne({ where: { proprietaireId: user.id } });
  if (!business) {
    business = await Business.create({
      nom: user.companyName || `${user.name}'s Business`,
      plan: user.plan === 'business' ? 'business' : 'foyer',
      subscriptionStatus: user.subscriptionStatus || 'trial',
      trialEndsAt: user.trialEndsAt || new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      proprietaireId: user.id
    });
  }

  user.businessId = business.id;
  await User.update({ businessId: business.id }, { where: { id: user.id } });
  return business.id;
};

exports.createClient = async (req, res) => {
  try {
    const businessId = await resolveBusinessId(req.user);
    const { nom, name, telephone, phone, adresse, address } = req.body;
    
    const clientNom = nom || name;
    if (!clientNom) {
      return res.status(400).json({ message: 'Le nom du client est requis' });
    }

    const client = await Client.create({
      businessId,
      nom: clientNom,
      telephone: telephone || phone || null,
      adresse: adresse || address || null,
      statut: 'ACTIF'
    });
    res.status(201).json(client);
  } catch (error) {
    res.status(500).json({ message: 'Erreur création client', error: error.message });
  }
};

exports.getClients = async (req, res) => {
  try {
    const businessId = await resolveBusinessId(req.user);
    const clients = await Client.findAll({
      where: { businessId },
      order: [['nom', 'ASC']]
    });
    res.json(clients);
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération clients', error: error.message });
  }
};
