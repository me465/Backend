const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Produit = require('./Produit');

const Achat = sequelize.define('Achat', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  businessId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Businesses',
      key: 'id'
    }
  },
  fournisseur: {
    type: DataTypes.STRING,
    allowNull: false
  },
  vendeurId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
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
  prixAchatUnitaire: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  montantTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  dateAchat: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  hooks: {
    afterCreate: async (achat, options) => {
      const produit = await Produit.findByPk(achat.produitId, { transaction: options.transaction });
      if (produit) {
        produit.quantiteStock += achat.quantite;
        await produit.save({ transaction: options.transaction });
      }
    }
  },
  indexes: [
    {
      fields: ['businessId']
    }
  ]
});

module.exports = Achat;
