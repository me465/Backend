const { Achat, Produit, Notification, User, sequelize } = require('../models');

exports.createAchat = async (req, res) => {
  const role = (req.user.role || '').toUpperCase();
  if (role === 'VENDEUR') {
    return res.status(403).json({ message: 'Accès interdit : seuls le manager et l\'administrateur peuvent enregistrer des achats de réapprovisionnement' });
  }

  const t = await sequelize.transaction();
  try {
    const { fournisseur, produitId, quantite, prixAchatUnitaire, dateAchat } = req.body;
    
    const montantTotal = quantite * prixAchatUnitaire;

    const achat = await Achat.create({
      businessId: req.user.businessId,
      fournisseur,
      vendeurId: req.user.id,
      produitId,
      quantite,
      prixAchatUnitaire,
      montantTotal,
      dateAchat: dateAchat || new Date()
    }, { transaction: t });

    // Le hook afterCreate dans Achat.js s'occupe d'incrémenter le stock.

    // Déclencher une notification au Manager/Owner
    const managers = await User.findAll({
        where: {
            businessId: req.user.businessId,
            role: ['OWNER', 'MANAGER']
        }
    });

    const produit = await Produit.findByPk(produitId, { transaction: t });

    for (const manager of managers) {
        await Notification.create({
            businessId: req.user.businessId,
            destinataireId: manager.id,
            type: 'NOUVEL_ACHAT',
            message: `Nouvel achat enregistré pour ${produit.nom} : ${quantite} ${produit.unite} par ${req.user.name}.`,
            lu: false
        }, { transaction: t });
    }

    await t.commit();
    res.status(201).json(achat);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: 'Erreur lors de la création de l\'achat', error: error.message });
  }
};

exports.getAchats = async (req, res) => {
  try {
    const role = (req.user.role || '').toUpperCase();
    if (role === 'VENDEUR') {
      return res.status(403).json({ message: 'Accès interdit : seuls le manager et l\'administrateur peuvent consulter les achats fournisseurs' });
    }

    const achats = await Achat.findAll({
      where: { businessId: req.user.businessId },
      include: [{ model: Produit }]
    });
    res.json(achats);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des achats', error: error.message });
  }
};
