const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const DetteClient = require('./DetteClient');

const Remboursement = sequelize.define('Remboursement', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  detteId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'DetteClients',
      key: 'id'
    }
  },
  montant: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  dateRemboursement: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  enregistrePar: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'Users',
      key: 'id'
    }
  }
}, {
  hooks: {
    afterCreate: async (remboursement, options) => {
      const dette = await DetteClient.findByPk(remboursement.detteId, { transaction: options.transaction });
      if (dette) {
        dette.montantRestant -= remboursement.montant;
        if (dette.montantRestant <= 0) {
          dette.statut = 'SOLDEE';
          dette.montantRestant = 0;
        }
        await dette.save({ transaction: options.transaction });
      }
    }
  }
});

module.exports = Remboursement;
