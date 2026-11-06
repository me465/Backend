const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Produit = sequelize.define('Produit', {
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
  nom: {
    type: DataTypes.STRING,
    allowNull: false
  },
  categorie: {
    type: DataTypes.STRING,
    allowNull: true
  },
  prixAchat: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  prixVente: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  quantiteStock: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  seuilAlerte: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5
  },
  unite: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'pièce'
  },
  codeBarre: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  indexes: [
    {
      fields: ['businessId']
    }
  ]
});

module.exports = Produit;
