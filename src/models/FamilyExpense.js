const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const FamilyExpense = sequelize.define('FamilyExpense', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false
  },
  budgetId: {
    type: DataTypes.UUID,
    allowNull: true // Optional, an expense might not be linked to a specific budget
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false
  },
  amount: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
});

module.exports = FamilyExpense;
