const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transaction = sequelize.define('Transaction', {
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
  type: {
    type: DataTypes.ENUM('income', 'expense', 'sale', 'purchase'),
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: false
  },
  date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  paymentType: {
    type: DataTypes.ENUM('comptant', 'credit', 'acompte')
  },
  productId: {
    type: DataTypes.UUID,
    references: {
      model: 'Products',
      key: 'id'
    }
  },
  productName: {
    type: DataTypes.STRING
  },
  productQuantity: {
    type: DataTypes.INTEGER
  }
});

module.exports = Transaction;
