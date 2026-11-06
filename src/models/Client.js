const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Client = sequelize.define('Client', {
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
  telephone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  adresse: {
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

module.exports = Client;
