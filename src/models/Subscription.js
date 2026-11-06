const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Subscription = sequelize.define('Subscription', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  businessId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Businesses',
      key: 'id'
    }
  },
  plan: {
    type: DataTypes.ENUM('foyer', 'business'),
    defaultValue: 'business'
  },
  type: {
    type: DataTypes.ENUM('trial', 'payment'),
    defaultValue: 'trial'
  },
  paymentMethod: {
    type: DataTypes.ENUM('mobile_money', 'airtel_money', 'free_trial', 'other'),
    defaultValue: 'free_trial'
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true
  },
  montant: {
    type: DataTypes.FLOAT,
    defaultValue: 0
  },
  devise: {
    type: DataTypes.STRING,
    defaultValue: 'FCFA'
  },
  durationMonths: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  status: {
    type: DataTypes.ENUM('active', 'expired', 'completed', 'failed', 'canceled'),
    defaultValue: 'active'
  },
  startDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  endDate: {
    type: DataTypes.DATE,
    allowNull: false
  },
  transactionReference: {
    type: DataTypes.STRING,
    allowNull: true
  }
}, {
  timestamps: true
});

module.exports = Subscription;
