const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DetteClient = sequelize.define('DetteClient', {
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
  clientId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Clients',
      key: 'id'
    }
  },
  venteId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Ventes',
      key: 'id'
    }
  },
  montantInitial: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  montantRestant: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  statut: {
    type: DataTypes.ENUM('EN_COURS', 'SOLDEE', 'EN_RETARD'),
    defaultValue: 'EN_COURS'
  },
  dateEcheance: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  indexes: [
    {
      fields: ['businessId']
    }
  ]
});

module.exports = DetteClient;
