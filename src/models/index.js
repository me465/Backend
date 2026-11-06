const User = require('./User');
const Business = require('./Business');
const Produit = require('./Produit');
const Vente = require('./Vente');
const LigneVente = require('./LigneVente');
const Achat = require('./Achat');
const Client = require('./Client');
const DetteClient = require('./DetteClient');
const Remboursement = require('./Remboursement');
const Notification = require('./Notification');
const Otp = require('./Otp');
const FamilyBudget = require('./FamilyBudget');
const FamilyExpense = require('./FamilyExpense');
const Subscription = require('./Subscription');
const sequelize = require('../config/database');

// Business & User
Business.belongsTo(User, { as: 'proprietaire', foreignKey: 'proprietaireId' });
User.hasOne(Business, { as: 'ownedBusiness', foreignKey: 'proprietaireId' });

User.belongsTo(Business, { foreignKey: 'businessId' });
Business.hasMany(User, { foreignKey: 'businessId' });

User.belongsTo(User, { as: 'manager', foreignKey: 'managerId' });

// Produit
Produit.belongsTo(Business, { foreignKey: 'businessId' });
Business.hasMany(Produit, { foreignKey: 'businessId' });

// Vente
Vente.belongsTo(Business, { foreignKey: 'businessId' });
Business.hasMany(Vente, { foreignKey: 'businessId' });

Vente.belongsTo(User, { as: 'vendeur', foreignKey: 'vendeurId' });
Vente.belongsTo(Client, { as: 'client', foreignKey: 'clientId' });

// LigneVente
LigneVente.belongsTo(Vente, { foreignKey: 'venteId', onDelete: 'CASCADE' });
Vente.hasMany(LigneVente, { as: 'lignes', foreignKey: 'venteId' });

LigneVente.belongsTo(Produit, { foreignKey: 'produitId' });
Produit.hasMany(LigneVente, { foreignKey: 'produitId' });

// Achat
Achat.belongsTo(Business, { foreignKey: 'businessId' });
Business.hasMany(Achat, { foreignKey: 'businessId' });

Achat.belongsTo(User, { as: 'vendeur', foreignKey: 'vendeurId' });
Achat.belongsTo(Produit, { foreignKey: 'produitId' });

// Client
Client.belongsTo(Business, { foreignKey: 'businessId' });
Business.hasMany(Client, { foreignKey: 'businessId' });

// DetteClient
DetteClient.belongsTo(Business, { foreignKey: 'businessId' });
DetteClient.belongsTo(Client, { foreignKey: 'clientId' });
DetteClient.belongsTo(Vente, { foreignKey: 'venteId' });
Vente.hasOne(DetteClient, { foreignKey: 'venteId' });

// Remboursement
Remboursement.belongsTo(DetteClient, { foreignKey: 'detteId' });
DetteClient.hasMany(Remboursement, { as: 'remboursements', foreignKey: 'detteId' });

Remboursement.belongsTo(User, { as: 'caissier', foreignKey: 'enregistrePar' });

// Notification
Notification.belongsTo(Business, { foreignKey: 'businessId' });
Notification.belongsTo(User, { as: 'destinataire', foreignKey: 'destinataireId' });

// Family Budget & Expense
FamilyBudget.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(FamilyBudget, { foreignKey: 'userId' });

FamilyExpense.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(FamilyExpense, { foreignKey: 'userId' });

FamilyExpense.belongsTo(FamilyBudget, { foreignKey: 'budgetId' });
FamilyBudget.hasMany(FamilyExpense, { foreignKey: 'budgetId' });

// Subscription
Subscription.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(Subscription, { foreignKey: 'userId' });
Subscription.belongsTo(Business, { foreignKey: 'businessId' });
Business.hasMany(Subscription, { foreignKey: 'businessId' });

module.exports = {
  User,
  Business,
  Produit,
  Vente,
  LigneVente,
  Achat,
  Client,
  DetteClient,
  Remboursement,
  Notification,
  Otp,
  FamilyBudget,
  FamilyExpense,
  Subscription,
  sequelize
};
