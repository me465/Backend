const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

const User = sequelize.define('User', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  role: {
    type: DataTypes.ENUM('OWNER', 'MANAGER', 'VENDEUR', 'FOYER'),
    allowNull: false,
    defaultValue: 'FOYER'
  },
  plan: {
    type: DataTypes.ENUM('foyer', 'business'),
    allowNull: false,
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
  },
  businessId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Businesses',
      key: 'id'
    }
  },
  managerId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    }
  },
  actif: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  otp: {
    type: DataTypes.STRING,
    allowNull: true
  },
  otpExpires: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  hooks: {
    beforeSave: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

User.prototype.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Ne jamais renvoyer le hash du mot de passe ni les OTPs dans les réponses JSON
User.prototype.toJSON = function() {
  const values = { ...this.get() };
  delete values.password;
  delete values.otp;
  delete values.otpExpires;
  return values;
};

module.exports = User;
