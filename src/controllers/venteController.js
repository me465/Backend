const { Vente, LigneVente, Produit, DetteClient, Client, Business, User, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Résolution sécurisée du businessId associé à l'utilisateur authentifié
 */
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

exports.createVente = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { 
      clientId: bodyClientId, 
      client: clientName, 
      statutPaiement: rawStatutPaiement, 
      modePaiement, 
      montantPaye: rawMontantPaye, 
      lignes: rawLignes, 
      cart, 
      items, 
      dateVente,
      reference 
    } = req.body;

    const businessId = await resolveBusinessId(req.user);

    // Normaliser les lignes / panier
    const inputLignes = rawLignes || cart || items || [];
    const normalizedLignes = [];

    for (const item of inputLignes) {
      const prodId = item.produitId || item.productId || item.id || (item.product && item.product.id);
      const qty = parseInt(item.quantite || item.quantity || 1, 10);
      let unitPrice = item.prixUnitaire || item.price || item.prixVente || (item.product && item.product.prixVente);
      
      if (unitPrice === undefined && prodId) {
        const prodDb = await Produit.findOne({ where: { id: prodId, businessId } });
        if (prodDb) unitPrice = parseFloat(prodDb.prixVente);
      }

      if (prodId && qty > 0) {
        normalizedLignes.push({
          produitId: prodId,
          quantite: qty,
          prixUnitaire: parseFloat(unitPrice || 0)
        });
      }
    }

    // Calcul du montant total
    let montantTotal = 0;
    for (const ligne of normalizedLignes) {
      montantTotal += ligne.quantite * ligne.prixUnitaire;
    }
    if (montantTotal === 0 && req.body.montantTotal) {
      montantTotal = parseFloat(req.body.montantTotal);
    }

    // Déterminer le statut de paiement
    let statutPaiement = 'PAYE';
    if (rawStatutPaiement) {
      statutPaiement = rawStatutPaiement.toUpperCase();
    } else if (modePaiement === 'credit') {
      statutPaiement = 'CREDIT';
    }

    let montantPaye = rawMontantPaye !== undefined ? parseFloat(rawMontantPaye) : (statutPaiement === 'CREDIT' ? 0 : montantTotal);

    // Résolution du client si un nom est fourni sous forme de chaîne
    let clientId = bodyClientId || null;
    if (!clientId && clientName && typeof clientName === 'string' && clientName.trim() !== '') {
      let foundClient = await Client.findOne({
        where: { businessId, nom: clientName.trim() }
      });
      if (!foundClient) {
        foundClient = await Client.create({
          businessId,
          nom: clientName.trim(),
          statut: 'ACTIF'
        }, { transaction: t });
      }
      clientId = foundClient.id;
    }

    // Création de la vente
    const vente = await Vente.create({
      businessId,
      vendeurId: req.user.id,
      clientId,
      statutPaiement,
      montantTotal,
      montantPaye,
      dateVente: dateVente || new Date()
    }, { transaction: t });

    // Création des lignes de vente et décrémentation du stock
    for (const ligne of normalizedLignes) {
      const sousTotal = ligne.quantite * ligne.prixUnitaire;
      await LigneVente.create({
        venteId: vente.id,
        produitId: ligne.produitId,
        quantite: ligne.quantite,
        prixUnitaire: ligne.prixUnitaire,
        sousTotal
      }, { transaction: t });

      // Décrémenter le stock
      const prod = await Produit.findOne({
        where: { id: ligne.produitId, businessId },
        transaction: t
      });
      if (prod) {
        const newStock = Math.max(0, prod.quantiteStock - ligne.quantite);
        await prod.update({ quantiteStock: newStock }, { transaction: t });
      }
    }

    // Création de dette si paiement à crédit ou partiel
    if (statutPaiement === 'CREDIT' || (montantTotal > montantPaye && montantPaye >= 0)) {
      const montantInitial = montantTotal - montantPaye;
      if (montantInitial > 0) {
        if (!clientId) {
          // Créer un client comptoir par défaut pour la dette si non fourni
          const defaultClient = await Client.create({
            businessId,
            nom: clientName || 'Client Comptoir Dette',
            statut: 'ACTIF'
          }, { transaction: t });
          clientId = defaultClient.id;
          await vente.update({ clientId }, { transaction: t });
        }
        await DetteClient.create({
          businessId,
          clientId,
          venteId: vente.id,
          montantInitial,
          montantRestant: montantInitial,
          statut: 'EN_COURS'
        }, { transaction: t });
      }
    }

    await t.commit();
    
    const venteComplete = await Vente.findByPk(vente.id, {
      include: [
        { model: LigneVente, as: 'lignes' },
        { model: Client, as: 'client' }
      ]
    });

    const plain = venteComplete.get({ plain: true });
    // Ajouter alias compatibles avec le frontend
    plain.modePaiement = modePaiement || (statutPaiement === 'CREDIT' ? 'credit' : 'especes');
    plain.reference = reference || `Ticket #${vente.id.toString().slice(-4)}`;
    plain.client = plain.client ? plain.client.nom : (clientName || 'Client comptoir');

    res.status(201).json(plain);
  } catch (error) {
    await t.rollback();
    console.error('[createVente] Erreur:', error);
    res.status(500).json({ message: 'Erreur lors de la création de la vente', error: error.message });
  }
};

exports.getVentes = async (req, res) => {
  try {
    const businessId = await resolveBusinessId(req.user);
    const { date, vendeurId, statutPaiement } = req.query;
    let where = { businessId };

    if (date) {
      where.dateVente = { [Op.gte]: new Date(date) };
    }
    if (vendeurId) where.vendeurId = vendeurId;
    if (statutPaiement) where.statutPaiement = statutPaiement;

    const ventes = await Vente.findAll({ 
      where,
      include: [
        { model: LigneVente, as: 'lignes' }, 
        { model: Client, as: 'client' },
        { model: User, as: 'vendeur', attributes: ['id', 'name', 'email'] }
      ],
      order: [['dateVente', 'DESC'], ['createdAt', 'DESC']]
    });

    // Formater pour garantir la compatibilité avec l'interface frontend SaleRecord
    const formatted = ventes.map(v => {
      const item = v.get({ plain: true });
      return {
        ...item,
        id: item.id,
        dateVente: item.dateVente,
        reference: `Ticket #${item.id.toString().slice(-4)}`,
        montantTotal: parseFloat(item.montantTotal),
        modePaiement: item.statutPaiement === 'CREDIT' ? 'credit' : 'especes',
        client: item.client?.nom || 'Client comptoir',
        vendeur: item.vendeur?.name || 'Gérant'
      };
    });

    res.json(formatted);
  } catch (error) {
    console.error('[getVentes] Erreur:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des ventes', error: error.message });
  }
};

exports.getVenteById = async (req, res) => {
  try {
    const businessId = await resolveBusinessId(req.user);
    const { id } = req.params;
    const vente = await Vente.findOne({
      where: { id, businessId },
      include: [
        { model: LigneVente, as: 'lignes' }, 
        { model: Client, as: 'client' },
        { model: User, as: 'vendeur', attributes: ['id', 'name', 'email'] }
      ]
    });
    if (!vente) return res.status(404).json({ message: 'Vente non trouvée' });
    
    const item = vente.get({ plain: true });
    const formatted = {
      ...item,
      id: item.id,
      dateVente: item.dateVente,
      reference: `Ticket #${item.id.toString().slice(-4)}`,
      montantTotal: parseFloat(item.montantTotal),
      modePaiement: item.statutPaiement === 'CREDIT' ? 'credit' : 'especes',
      client: item.client?.nom || 'Client comptoir',
      vendeur: item.vendeur?.name || 'Gérant'
    };

    res.json(formatted);
  } catch (error) {
    console.error('[getVenteById] Erreur:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération de la vente', error: error.message });
  }
};
