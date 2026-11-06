const { Vente, Produit, LigneVente, sequelize, Client } = require('../models');
const { Op } = require('sequelize');

exports.getVentesRapport = async (req, res) => {
  try {
    const { periode } = req.query;
    let startDate = new Date();
    
    if (periode === 'jour') startDate.setHours(0, 0, 0, 0);
    else if (periode === 'semaine') startDate.setDate(startDate.getDate() - 7);
    else if (periode === 'mois') startDate.setMonth(startDate.getMonth() - 1);
    else if (periode === 'annee') startDate.setFullYear(startDate.getFullYear() - 1);

    const ventes = await Vente.findAll({
      where: {
        businessId: req.user.businessId,
        dateVente: { [Op.gte]: startDate }
      }
    });

    const totalVentes = ventes.reduce((sum, v) => sum + parseFloat(v.montantTotal), 0);
    
    // Pour le pack business, on ajoute des stats de profit
    let statsAvancees = {};
    if (req.user.Business && req.user.Business.plan === 'business') {
      const totalAchatVendus = await LigneVente.findAll({
        attributes: [
          [sequelize.fn('SUM', sequelize.literal('LigneVente.quantite * Produit.prixAchat')), 'coutTotal']
        ],
        include: [{ 
          model: Produit, 
          attributes: [],
          where: { businessId: req.user.businessId }
        }],
        where: {
          venteId: { [Op.in]: ventes.map(v => v.id) }
        },
        raw: true
      });
      
      const coutTotal = parseFloat(totalAchatVendus[0].coutTotal) || 0;
      statsAvancees = {
        margeBrute: totalVentes - coutTotal,
        tauxMarge: totalVentes > 0 ? ((totalVentes - coutTotal) / totalVentes * 100).toFixed(2) + '%' : '0%'
      };
    }

    res.json({ 
      periode, 
      totalVentes, 
      nombreVentes: ventes.length, 
      ...statsAvancees,
      detail: ventes 
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur rapport ventes', error: error.message });
  }
};

exports.getStockRapport = async (req, res) => {
  try {
    const produits = await Produit.findAll({
      where: { businessId: req.user.businessId }
    });

    const valeurTotaleStock = produits.reduce((sum, p) => sum + (p.quantiteStock * parseFloat(p.prixAchat)), 0);
    const valeurVentePotentielle = produits.reduce((sum, p) => sum + (p.quantiteStock * parseFloat(p.prixVente)), 0);
    
    let statsAvancees = {};
    if (req.user.Business && req.user.Business.plan === 'business') {
      statsAvancees = {
        profitPotentiel: valeurVentePotentielle - valeurTotaleStock,
        produitsRupture: produits.filter(p => p.quantiteStock <= (p.seuilAlerte || 5)).length
      };
    }

    res.json({ 
      valeurTotaleStock, 
      valeurVentePotentielle,
      ...statsAvancees,
      detail: produits 
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur rapport stock', error: error.message });
  }
};

exports.getProduitsPerformance = async (req, res) => {
  try {
    const topProduits = await LigneVente.findAll({
      attributes: [
        'produitId',
        [sequelize.fn('SUM', sequelize.col('quantite')), 'totalVendu'],
        [sequelize.fn('SUM', sequelize.col('sousTotal')), 'CA']
      ],
      include: [{ model: Produit, attributes: ['nom', 'prixAchat'] }],
      group: ['produitId', 'Produit.id'],
      order: [[sequelize.literal('totalVendu'), 'DESC']],
      limit: 10
    });

    if (req.user.Business && req.user.Business.plan === 'business') {
      // Calcul du profit par produit pour le pack business
      topProduits.forEach(p => {
        const item = p.get({ plain: true });
        const profit = item.CA - (item.totalVendu * item.Produit.prixAchat);
        p.setDataValue('profit', profit);
      });
    }
    
    res.json(topProduits);
  } catch (error) {
    res.status(500).json({ message: 'Erreur performance produits', error: error.message });
  }
};

exports.getBusinessInsights = async (req, res) => {
  try {
    if (!req.user.Business || req.user.Business.plan !== 'business') {
      return res.status(403).json({ message: "Les Business Insights sont réservés au pack Business" });
    }

    // Statistiques clients (fidélité)
    const topClients = await Vente.findAll({
      attributes: [
        'clientId',
        [sequelize.fn('COUNT', sequelize.col('Vente.id')), 'nombreAchats'],
        [sequelize.fn('SUM', sequelize.col('montantTotal')), 'totalDepense']
      ],
      include: [{ model: Client, as: 'client', attributes: ['nom', 'telephone'] }],
      where: { businessId: req.user.businessId, clientId: { [Op.ne]: null } },
      group: ['clientId', 'client.id'],
      order: [[sequelize.literal('totalDepense'), 'DESC']],
      limit: 5
    });

    // Évolution mensuelle du CA
    const evolutionCA = await Vente.findAll({
      attributes: [
        [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('dateVente')), 'mois'],
        [sequelize.fn('SUM', sequelize.col('montantTotal')), 'CA']
      ],
      where: { businessId: req.user.businessId },
      group: [sequelize.fn('DATE_TRUNC', 'month', sequelize.col('dateVente'))],
      order: [[sequelize.literal('mois'), 'ASC']]
    });

    res.json({
      topClients,
      evolutionCA,
      message: "Rapport haute gamme généré avec succès"
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur insights business', error: error.message });
  }
};
