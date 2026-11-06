const { Notification, Produit, DetteClient, User } = require('../models');
const { Op } = require('sequelize');

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.findAll({
      where: { 
          businessId: req.user.businessId,
          destinataireId: req.user.id
      },
      order: [['createdAt', 'DESC']]
    });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Erreur récupération notifications', error: error.message });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOne({
      where: { id, destinataireId: req.user.id }
    });
    if (!notification) return res.status(404).json({ message: 'Notification non trouvée' });
    
    await notification.update({ lu: true });
    res.json({ message: 'Notification marquée comme lue' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur notification', error: error.message });
  }
};

exports.checkStockAndDettes = async (req, res) => {
    // Cette fonction peut être appelée par un cron job ou manuellement
    try {
        const { sequelize } = require('../models');
        
        // 1. Vérifier les stocks bas
        const produitsBas = await Produit.findAll({
            where: {
                quantiteStock: { [Op.lte]: sequelize.col('seuilAlerte') }
            }
        });

        for (const p of produitsBas) {
            // Notifier le manager/owner du business
            const managers = await User.findAll({ where: { businessId: p.businessId, role: ['OWNER', 'MANAGER'] } });
            for (const m of managers) {
                // Vérifier si une notification non lue existe déjà pour éviter le spam
                const exist = await Notification.findOne({ 
                    where: { destinataireId: m.id, type: 'STOCK_BAS', message: { [Op.like]: `%${p.nom}%` }, lu: false } 
                });
                if (!exist) {
                    await Notification.create({
                        businessId: p.businessId,
                        destinataireId: m.id,
                        type: 'STOCK_BAS',
                        message: `Alerte stock bas : ${p.nom} (${p.quantiteStock} ${p.unite} restants).`,
                        lu: false
                    });
                }
            }
        }

        // 2. Vérifier les dettes en retard (simplifié)
        const dettesRetard = await DetteClient.findAll({
            where: {
                statut: 'EN_COURS',
                dateEcheance: { [Op.lt]: new Date() }
            }
        });

        for (const d of dettesRetard) {
            await d.update({ statut: 'EN_RETARD' });
            const managers = await User.findAll({ where: { businessId: d.businessId, role: ['OWNER', 'MANAGER'] } });
            for (const m of managers) {
                await Notification.create({
                    businessId: d.businessId,
                    destinataireId: m.id,
                    type: 'DETTE_RETARD',
                    message: `La dette de la vente #${d.venteId} est en retard.`,
                    lu: false
                });
            }
        }

        if (res) res.json({ message: 'Job de vérification terminé' });
    } catch (error) {
        console.error('Erreur Job:', error);
        if (res) res.status(500).json({ error: error.message });
    }
};
