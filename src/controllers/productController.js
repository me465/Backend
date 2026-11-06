const Product = require('../models/Product');

exports.getProducts = async (req, res) => {
  try {
    const products = await Product.findAll({ where: { userId: req.user.id } });
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.addProduct = async (req, res) => {
  try {
    const product = await Product.create({
      ...req.body,
      userId: req.user.id
    });
    res.status(201).json(product);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (product.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    Object.assign(product, req.body);
    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (product.userId !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await product.destroy();
    res.json({ message: 'Product removed' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
