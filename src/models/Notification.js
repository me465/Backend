const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Notification = sequelize.define('Notification', {
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
  destinataireId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  type: {
    type: DataTypes.ENUM('STOCK_BAS', 'NOUVEL_ACHAT', 'DETTE_RETARD', 'NOUVELLE_VENTE'),
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  lu: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  indexes: [
    {
      fields: ['businessId']
    },
    {
      fields: ['destinataireId']
    }
  ]
});

module.exports = Notification;
