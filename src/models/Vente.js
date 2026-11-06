const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Vente = sequelize.define('Vente', {
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
  vendeurId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  clientId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Clients',
      key: 'id'
    }
  },
  statutPaiement: {
    type: DataTypes.ENUM('PAYE', 'CREDIT', 'PARTIEL'),
    allowNull: false
  },
  montantTotal: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  montantPaye: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0
  },
  dateVente: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  indexes: [
    {
      fields: ['businessId']
    }
  ]
});

module.exports = Vente;
