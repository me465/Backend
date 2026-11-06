const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Produit = require('./Produit');

const LigneVente = sequelize.define('LigneVente', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  venteId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Ventes',
      key: 'id'
    }
  },
  produitId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Produits',
      key: 'id'
    }
  },
  quantite: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  prixUnitaire: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  sousTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
}, {
  hooks: {
    afterCreate: async (ligneVente, options) => {
      const produit = await Produit.findByPk(ligneVente.produitId, { transaction: options.transaction });
      if (produit) {
        produit.quantiteStock -= ligneVente.quantite;
        await produit.save({ transaction: options.transaction });
      }
    }
  }
});

module.exports = LigneVente;
