const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Product = require('../models/Product');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

exports.getTransactions = async (req, res) => {
  try {
    let where = { userId: req.user.id };

    // Si l'utilisateur est un manager ou owner, il voit aussi les transactions de ses vendeurs
    const userRole = (req.user.role || '').toUpperCase();
    if (userRole === 'MANAGER' || userRole === 'OWNER') {
      const sellers = await User.findAll({ where: { managerId: req.user.id } });
      const sellerIds = sellers.map(seller => seller.id);
      where = { userId: { [Op.in]: [req.user.id, ...sellerIds] } };
    }

    const transactions = await Transaction.findAll({ 
      where,
      order: [['date', 'DESC']]
    });
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addTransaction = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { type, productId, productQuantity } = req.body;

    // Si c'est une vente, on diminue le stock
    if (type === 'sale' && productId && productQuantity) {
      const product = await Product.findByPk(productId, { transaction: t });
      if (!product) {
        await t.rollback();
        return res.status(404).json({ message: 'Product not found' });
      }
      if (product.quantity < productQuantity) {
        await t.rollback();
        return res.status(400).json({ message: 'Insufficient stock' });
      }
      product.quantity -= productQuantity;
      await product.save({ transaction: t });
    }

    // Si c'est un achat, on augmente le stock
    if (type === 'purchase' && productId && productQuantity) {
      const product = await Product.findByPk(productId, { transaction: t });
      if (product) {
        product.quantity += productQuantity;
        await product.save({ transaction: t });
      }
    }

    const transaction = await Transaction.create({
      ...req.body,
      userId: req.user.id
    }, { transaction: t });

    await t.commit();
    res.status(201).json(transaction);
  } catch (error) {
    await t.rollback();
    res.status(400).json({ message: error.message });
  }
};

exports.updateTransaction = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const transaction = await Transaction.findByPk(req.params.id, { transaction: t });
    if (!transaction) {
      await t.rollback();
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Seul le propriétaire peut modifier
    if (transaction.userId !== req.user.id) {
      await t.rollback();
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Gérer l'ajustement du stock si la quantité ou le produit a changé
    const oldType = transaction.type;
    const oldProductId = transaction.productId;
    const oldQuantity = transaction.productQuantity || 0;
    const newType = req.body.type || oldType;
    const newProductId = req.body.productId || oldProductId;
    const newQuantity = req.body.productQuantity !== undefined ? req.body.productQuantity : oldQuantity;

    // Rétablir l'ancien stock
    if (oldProductId && oldQuantity) {
      const oldProduct = await Product.findByPk(oldProductId, { transaction: t });
      if (oldProduct) {
        if (oldType === 'sale') {
          oldProduct.quantity += oldQuantity;
        } else if (oldType === 'purchase') {
          oldProduct.quantity -= oldQuantity;
        }
        await oldProduct.save({ transaction: t });
      }
    }

    // Appliquer le nouveau stock
    if (newProductId && newQuantity) {
      const newProduct = await Product.findByPk(newProductId, { transaction: t });
      if (newProduct) {
        if (newType === 'sale') {
          if (newProduct.quantity < newQuantity) {
            await t.rollback();
            return res.status(400).json({ message: 'Insufficient stock' });
          }
          newProduct.quantity -= newQuantity;
        } else if (newType === 'purchase') {
          newProduct.quantity += newQuantity;
        }
        await newProduct.save({ transaction: t });
      }
    }

    Object.assign(transaction, req.body);
    const updatedTransaction = await transaction.save({ transaction: t });
    
    await t.commit();
    res.json(updatedTransaction);
  } catch (error) {
    await t.rollback();
    res.status(400).json({ message: error.message });
  }
};

exports.deleteTransaction = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const transaction = await Transaction.findByPk(req.params.id, { transaction: t });
    if (!transaction) {
      await t.rollback();
      return res.status(404).json({ message: 'Transaction not found' });
    }

    if (transaction.userId !== req.user.id) {
      await t.rollback();
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Rétablir le stock avant de supprimer
    if (transaction.productId && transaction.productQuantity) {
      const product = await Product.findByPk(transaction.productId, { transaction: t });
      if (product) {
        if (transaction.type === 'sale') {
          product.quantity += transaction.productQuantity;
        } else if (transaction.type === 'purchase') {
          product.quantity -= transaction.productQuantity;
        }
        await product.save({ transaction: t });
      }
    }

    await transaction.destroy({ transaction: t });
    await t.commit();
    res.json({ message: 'Transaction removed' });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ message: error.message });
  }
};
