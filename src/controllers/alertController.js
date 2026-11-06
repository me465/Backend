const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const User = require('../models/User');
const { Op, Sequelize } = require('sequelize');

exports.getAlerts = async (req, res) => {
  try {
    const alerts = [];

    // 1. Alerte Stock Bas
    const lowStockProducts = await Product.findAll({
      where: {
        userId: req.user.id,
        quantity: {
          [Op.lte]: Sequelize.col('stockThreshold')
        }
      }
    });

    lowStockProducts.forEach(product => {
      alerts.push({
        type: 'low_stock',
        message: `Stock bas pour le produit: ${product.name} (Reste: ${product.quantity})`,
        productId: product.id,
        date: new Date()
      });
    });

    // 2. Alerte Nouveaux Achats Vendeurs (pour Managers)
    const userRole = (req.user.role || '').toUpperCase();
    if (userRole === 'MANAGER' || userRole === 'OWNER') {
      const sellers = await User.findAll({ where: { managerId: req.user.id } });
      const sellerIds = sellers.map(s => s.id);

      // Achats effectués par les vendeurs dans les dernières 24h
      const recentPurchases = await Transaction.findAll({
        where: {
          userId: { [Op.in]: sellerIds },
          type: 'purchase',
          date: { [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) }
        }
      });

      // Fetch names manually to be safe without full association setup
      const purchasesWithUserNames = await Promise.all(recentPurchases.map(async (purchase) => {
        const user = await User.findByPk(purchase.userId);
        return { ...purchase.toJSON(), userName: user ? user.name : 'Unknown' };
      }));

      purchasesWithUserNames.forEach(purchase => {
        alerts.push({
          type: 'new_seller_purchase',
          message: `Nouvel achat de ${purchase.userName}: ${purchase.description} (${purchase.amount})`,
          transactionId: purchase.id,
          date: purchase.date
        });
      });
    }

    res.json(alerts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
