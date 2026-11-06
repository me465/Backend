const { Produit, Business, User, sequelize } = require('../models');
const { Op } = require('sequelize');

/**
 * Résolution sécurisée du businessId associé à l'utilisateur authentifié
 */
const resolveBusinessId = async (user) => {
  if (user.businessId) return user.businessId;
  if (user.Business?.id) return user.Business.id;

  // Recherche d'un business existant dont l'utilisateur est propriétaire
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

  // Mettre à jour user.businessId pour les requêtes futures
  user.businessId = business.id;
  await User.update({ businessId: business.id }, { where: { id: user.id } });
  return business.id;
};

exports.createProduit = async (req, res) => {
  try {
    const role = (req.user?.role || '').toUpperCase();
    if (role === 'VENDEUR') {
      return res.status(403).json({ message: 'Accès interdit : seuls le manager et l\'administrateur peuvent ajouter des articles au stock' });
    }

    const body = req.body || {};

    // Support des alias en français et anglais
    const nom = body.nom || body.name || body.designation || body.title || body.label || body.produitNom;
    if (!nom || !nom.toString().trim()) {
      return res.status(400).json({ message: 'Le nom du produit est requis' });
    }

    const businessId = await resolveBusinessId(req.user);
    if (!businessId) {
      return res.status(400).json({ message: 'Aucun espace business associé à ce compte' });
    }

    const categorie = body.categorie || body.category || body.type || 'Général';
    const prixAchat = body.prixAchat !== undefined ? parseFloat(body.prixAchat) : (body.buyingPrice !== undefined ? parseFloat(body.buyingPrice) : (body.purchasePrice !== undefined ? parseFloat(body.purchasePrice) : (body.costPrice !== undefined ? parseFloat(body.costPrice) : 0)));
    const prixVente = body.prixVente !== undefined ? parseFloat(body.prixVente) : (body.sellingPrice !== undefined ? parseFloat(body.sellingPrice) : (body.price !== undefined ? parseFloat(body.price) : (body.prix !== undefined ? parseFloat(body.prix) : 0)));
    const quantiteStock = body.quantiteStock !== undefined ? parseInt(body.quantiteStock, 10) : (body.stock !== undefined ? parseInt(body.stock, 10) : (body.quantity !== undefined ? parseInt(body.quantity, 10) : (body.quantite !== undefined ? parseInt(body.quantite, 10) : 0)));
    const seuilAlerte = body.seuilAlerte !== undefined ? parseInt(body.seuilAlerte, 10) : (body.alertThreshold !== undefined ? parseInt(body.alertThreshold, 10) : (body.minStock !== undefined ? parseInt(body.minStock, 10) : 5));
    const unite = body.unite || body.unit || 'pièce';
    const codeBarre = body.codeBarre || body.barcode || body.code_barre || null;

    const data = {
      nom: nom.toString().trim(),
      categorie,
      prixAchat: isNaN(prixAchat) ? 0 : prixAchat,
      prixVente: isNaN(prixVente) ? 0 : prixVente,
      quantiteStock: isNaN(quantiteStock) ? 0 : quantiteStock,
      seuilAlerte: isNaN(seuilAlerte) ? 5 : seuilAlerte,
      unite,
      codeBarre,
      businessId
    };

    const produit = await Produit.create(data);
    res.status(201).json(produit);
  } catch (error) {
    console.error('[createProduit] Erreur:', error);
    res.status(500).json({ message: 'Erreur lors de la création du produit', error: error.message });
  }
};

exports.getProduits = async (req, res) => {
  try {
    const businessId = await resolveBusinessId(req.user);
    const { search, categorie, stockBas, statut, filter, disponible, rupture } = req.query;
    let where = { businessId };

    if (search) {
      where.nom = { [Op.iLike]: `%${search}%` };
    }
    if (categorie && categorie !== 'Toutes' && categorie !== 'toutes') {
      where.categorie = categorie;
    }

    // Filtres d'état du stock (disponible, rupture, alerte/stockBas)
    const isDisponible = statut === 'disponible' || filter === 'disponible' || disponible === 'true';
    const isRupture = statut === 'rupture' || filter === 'rupture' || rupture === 'true';
    const isAlerte = statut === 'alerte' || filter === 'alerte' || stockBas === 'true';

    if (isDisponible) {
      where.quantiteStock = { [Op.gt]: 0 };
    } else if (isRupture) {
      where.quantiteStock = { [Op.lte]: 0 };
    } else if (isAlerte) {
      where.quantiteStock = { [Op.lte]: sequelize.col('seuilAlerte') };
    }

    const produits = await Produit.findAll({
      where,
      order: [['nom', 'ASC']]
    });
    
    // Si vendeur, masquer le prix d'achat pour respecter la confidentialité financière
    const role = (req.user?.role || '').toUpperCase();
    if (role === 'VENDEUR') {
      const sanitized = produits.map(p => {
        const item = p.toJSON ? p.toJSON() : { ...p };
        delete item.prixAchat;
        return item;
      });
      return res.json(sanitized);
    }

    res.json(produits);
  } catch (error) {
    console.error('[getProduits] Erreur:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des produits', error: error.message });
  }
};

exports.getAlertesStock = async (req, res) => {
  try {
    const businessId = await resolveBusinessId(req.user);
    const produits = await Produit.findAll({
      where: {
        businessId,
        quantiteStock: {
          [Op.lte]: sequelize.col('seuilAlerte')
        }
      },
      order: [['quantiteStock', 'ASC']]
    });

    const role = (req.user?.role || '').toUpperCase();
    if (role === 'VENDEUR') {
      const sanitized = produits.map(p => {
        const item = p.toJSON ? p.toJSON() : { ...p };
        delete item.prixAchat;
        return item;
      });
      return res.json(sanitized);
    }

    res.json(produits);
  } catch (error) {
    console.error('[getAlertesStock] Erreur:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des alertes', error: error.message });
  }
};

exports.updateProduit = async (req, res) => {
  try {
    const role = (req.user?.role || '').toUpperCase();
    if (role === 'VENDEUR') {
      return res.status(403).json({ message: 'Accès interdit : seuls le manager et l\'administrateur peuvent modifier des articles du stock' });
    }

    const { id } = req.params;
    const body = req.body || {};
    const businessId = await resolveBusinessId(req.user);

    const updateData = {};
    if (body.nom || body.name || body.designation) {
      updateData.nom = (body.nom || body.name || body.designation).toString().trim();
    }
    if (body.categorie || body.category) {
      updateData.categorie = body.categorie || body.category;
    }
    if (body.prixAchat !== undefined || body.buyingPrice !== undefined || body.purchasePrice !== undefined) {
      updateData.prixAchat = parseFloat(body.prixAchat ?? body.buyingPrice ?? body.purchasePrice);
    }
    if (body.prixVente !== undefined || body.sellingPrice !== undefined || body.price !== undefined || body.prix !== undefined) {
      updateData.prixVente = parseFloat(body.prixVente ?? body.sellingPrice ?? body.price ?? body.prix);
    }
    if (body.quantiteStock !== undefined || body.stock !== undefined || body.quantity !== undefined || body.quantite !== undefined) {
      updateData.quantiteStock = parseInt(body.quantiteStock ?? body.stock ?? body.quantity ?? body.quantite, 10);
    }
    if (body.seuilAlerte !== undefined || body.alertThreshold !== undefined || body.minStock !== undefined) {
      updateData.seuilAlerte = parseInt(body.seuilAlerte ?? body.alertThreshold ?? body.minStock, 10);
    }
    if (body.unite || body.unit) {
      updateData.unite = body.unite || body.unit;
    }
    if (body.codeBarre !== undefined || body.barcode !== undefined) {
      updateData.codeBarre = body.codeBarre ?? body.barcode;
    }

    const produit = await Produit.findOne({ where: { id, businessId } });
    if (!produit) return res.status(404).json({ message: 'Produit non trouvé' });

    await produit.update(updateData);
    res.json(produit);
  } catch (error) {
    console.error('[updateProduit] Erreur:', error);
    res.status(500).json({ message: 'Erreur lors de la mise à jour du produit', error: error.message });
  }
};

exports.ajusterStock = async (req, res) => {
  try {
    const role = (req.user?.role || '').toUpperCase();
    if (role === 'VENDEUR') {
      return res.status(403).json({ message: 'Accès interdit : seuls le manager et l\'administrateur peuvent ajuster le stock' });
    }

    const { id } = req.params;
    const { type, quantite, nouvelleQuantite, motif } = req.body || {};
    const businessId = await resolveBusinessId(req.user);

    const produit = await Produit.findOne({ where: { id, businessId } });
    if (!produit) return res.status(404).json({ message: 'Produit non trouvé' });

    let nouveauStock = produit.quantiteStock;

    if (nouvelleQuantite !== undefined) {
      nouveauStock = parseInt(nouvelleQuantite, 10);
    } else if (type === 'direct' || type === 'inventaire' || type === 'definir') {
      nouveauStock = parseInt(quantite, 10);
    } else if (type === 'entree' || type === 'ajout' || type === 'reapprovisionnement') {
      nouveauStock += parseInt(quantite, 10);
    } else if (type === 'sortie' || type === 'retrait') {
      nouveauStock = Math.max(0, nouveauStock - parseInt(quantite, 10));
    } else if (quantite !== undefined) {
      nouveauStock += parseInt(quantite, 10);
    }

    if (isNaN(nouveauStock) || nouveauStock < 0) {
      return res.status(400).json({ message: 'Quantité invalide pour l\'ajustement de stock' });
    }

    await produit.update({ quantiteStock: nouveauStock });

    res.json({
      message: 'Stock ajusté avec succès',
      produit,
      ancienStock: produit.quantiteStock,
      nouveauStock,
      motif: motif || 'Ajustement manuel'
    });
  } catch (error) {
    console.error('[ajusterStock] Erreur:', error);
    res.status(500).json({ message: 'Erreur lors de l\'ajustement du stock', error: error.message });
  }
};

exports.deleteProduit = async (req, res) => {
  try {
    const role = (req.user?.role || '').toUpperCase();
    if (role === 'VENDEUR') {
      return res.status(403).json({ message: 'Accès interdit : seuls le manager et l\'administrateur peuvent supprimer des articles du stock' });
    }

    const { id } = req.params;
    const businessId = await resolveBusinessId(req.user);

    const produit = await Produit.findOne({ where: { id, businessId } });
    if (!produit) return res.status(404).json({ message: 'Produit non trouvé' });

    await produit.destroy();
    res.json({ message: 'Produit supprimé du catalogue avec succès' });
  } catch (error) {
    console.error('[deleteProduit] Erreur:', error);
    res.status(500).json({ message: 'Erreur lors de la suppression du produit', error: error.message });
  }
};
