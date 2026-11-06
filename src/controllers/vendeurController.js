const { User } = require('../models');
const bcrypt = require('bcryptjs');

exports.createVendeur = async (req, res) => {
  try {
    const role = (req.user.role || '').toUpperCase();
    if (role === 'VENDEUR') {
      return res.status(403).json({ message: 'Accès interdit : seuls le manager et l\'administrateur peuvent créer des comptes vendeurs' });
    }

    const { name, phone, email, password } = req.body;
    
    // Vérifier les limites du pack Foyer
    if (req.user.Business && req.user.Business.plan === 'foyer') {
      const count = await User.count({ 
        where: { businessId: req.user.businessId, role: 'VENDEUR', actif: true } 
      });
      if (count >= 1) {
        return res.status(403).json({ 
          message: 'Le pack Foyer est limité à 1 vendeur. Veuillez passer au pack Business pour plus de vendeurs.' 
        });
      }
    }

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: 'Cet email est déjà utilisé' });
    }

    const vendeur = await User.create({
      name,
      phone,
      email,
      password, // Le hook beforeSave dans User.js s'occupera du hashage
      role: 'VENDEUR',
      businessId: req.user.businessId,
      managerId: req.user.id,
      actif: true
    });

    res.status(201).json({
      message: 'Compte vendeur créé avec succès',
      vendeur: {
        id: vendeur.id,
        name: vendeur.name,
        email: vendeur.email,
        role: vendeur.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la création du vendeur', error: error.message });
  }
};

exports.getVendeurs = async (req, res) => {
  try {
    const role = (req.user.role || '').toUpperCase();
    if (role === 'VENDEUR') {
      return res.status(403).json({ message: 'Accès interdit : seuls le manager et l\'administrateur peuvent consulter la liste des vendeurs' });
    }

    const vendeurs = await User.findAll({
      where: {
        businessId: req.user.businessId,
        role: 'VENDEUR'
      },
      attributes: { exclude: ['password', 'otp', 'otpExpires'] }
    });
    res.json(vendeurs);
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la récupération des vendeurs', error: error.message });
  }
};

exports.updateVendeur = async (req, res) => {
  try {
    const role = (req.user.role || '').toUpperCase();
    if (role === 'VENDEUR') {
      return res.status(403).json({ message: 'Accès interdit : seuls le manager et l\'administrateur peuvent modifier des vendeurs' });
    }

    const { id } = req.params;
    const { name, phone, email, actif } = req.body;

    const vendeur = await User.findOne({
      where: { id, businessId: req.user.businessId, role: 'VENDEUR' }
    });

    if (!vendeur) {
      return res.status(404).json({ message: 'Vendeur non trouvé' });
    }

    await vendeur.update({ name, phone, email, actif });
    res.json({ message: 'Vendeur mis à jour', vendeur });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du vendeur', error: error.message });
  }
};

exports.deleteVendeur = async (req, res) => {
  try {
    const role = (req.user.role || '').toUpperCase();
    if (role === 'VENDEUR') {
      return res.status(403).json({ message: 'Accès interdit : seuls le manager et l\'administrateur peuvent désactiver des vendeurs' });
    }

    const { id } = req.params;
    const vendeur = await User.findOne({
      where: { id, businessId: req.user.businessId, role: 'VENDEUR' }
    });

    if (!vendeur) {
      return res.status(404).json({ message: 'Vendeur non trouvé' });
    }

    // Soft delete
    await vendeur.update({ actif: false });
    res.json({ message: 'Vendeur désactivé (soft delete)' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de la suppression du vendeur', error: error.message });
  }
};
