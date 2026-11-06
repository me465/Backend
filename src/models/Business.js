const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Business = sequelize.define('Business', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  nom: {
    type: DataTypes.STRING,
    allowNull: false
  },
  proprietaireId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  plan: {
    type: DataTypes.ENUM('foyer', 'business'),
    defaultValue: 'foyer'
  },
  subscriptionStatus: {
    type: DataTypes.ENUM('trial', 'active', 'expired', 'none'),
    defaultValue: 'none'
  },
  trialEndsAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  subscriptionEndsAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  timestamps: true,
  createdAt: 'createdAt',
  updatedAt: false
});

module.exports = Business;
