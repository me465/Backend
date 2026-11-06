const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';
const sslEnabled = process.env.DB_SSL === 'true' || process.env.DATABASE_SSL === 'true';
const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true';

const dialectOptions = {};
if (sslEnabled) {
  dialectOptions.ssl = {
    require: true,
    rejectUnauthorized: rejectUnauthorized
  };
}

let sequelize;

if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: process.env.DB_LOGGING === 'true' ? console.log : false,
    dialectOptions,
    pool: {
      max: parseInt(process.env.DB_POOL_MAX || '10', 10),
      min: parseInt(process.env.DB_POOL_MIN || '0', 10),
      acquire: 30000,
      idle: 10000
    }
  });
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'yomankash',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      dialect: 'postgres',
      logging: process.env.DB_LOGGING === 'true' ? console.log : false,
      dialectOptions,
      pool: {
        max: parseInt(process.env.DB_POOL_MAX || '10', 10),
        min: parseInt(process.env.DB_POOL_MIN || '0', 10),
        acquire: 30000,
        idle: 10000
      }
    }
  );
}

module.exports = sequelize;
