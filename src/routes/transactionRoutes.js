const express = require('express');
const router = express.Router();
const { getTransactions, addTransaction, updateTransaction, deleteTransaction } = require('../controllers/transactionController');
const { authMiddleware } = require('../middleware/auth');

router.get('/', authMiddleware, getTransactions);
router.post('/', authMiddleware, addTransaction);
router.put('/:id', authMiddleware, updateTransaction);
router.delete('/:id', authMiddleware, deleteTransaction);

module.exports = router;
