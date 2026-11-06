const { DetteClient, Remboursement, Client, Vente, sequelize } = require('../models');

exports.getDettes = async (req, res) => {
  try {
    const { statut } = req.query;
    let where = { businessId: req.user.businessId };
    if (statut) where.statut = statut;

    const dettes = await DetteClient.findAll({
      where,
      include: [{ model: Client }, { model: Vente }]
    });
    res.json(dettes);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des dettes', error: error.message });
  }
};

exports.createRemboursement = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params; // detteId
    const { montant, dateRemboursement } = req.body;

    const dette = await DetteClient.findOne({
      where: { id, businessId: req.user.businessId }
    });

    if (!dette) return res.status(404).json({ message: 'Dette non trouvée' });

    const remboursement = await Remboursement.create({
      detteId: id,
      montant,
      dateRemboursement: dateRemboursement || new Date(),
      enregistrePar: req.user.id
    }, { transaction: t });

    // Le hook afterCreate dans Remboursement.js s'occupe de mettre à jour la dette

    await t.commit();
    res.status(201).json(remboursement);
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: 'Erreur lors de l\'enregistrement du remboursement', error: error.message });
  }
};

exports.getClientDettes = async (req, res) => {
  try {
    const { id } = req.params; // clientId
    const dettes = await DetteClient.findAll({
      where: { clientId: id, businessId: req.user.businessId },
      include: [{ model: Remboursement, as: 'remboursements' }, { model: Vente }]
    });
    res.json(dettes);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération de l\'historique client', error: error.message });
  }
};
