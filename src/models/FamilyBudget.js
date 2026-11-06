const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FamilyBudget = sequelize.define('FamilyBudget', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING, // e.g., 'Alimentation', 'Loyer', 'Santé', 'Transport'
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  period: {
    type: DataTypes.ENUM('DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'),
    defaultValue: 'MONTHLY'
  },
  startDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  endDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  }
});

module.exports = FamilyBudget;
