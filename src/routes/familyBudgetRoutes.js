const express = require('express');
const router = express.Router();
const familyBudgetController = require('../controllers/familyBudgetController');
const { authMiddleware } = require('../middleware/auth');

router.use(authMiddleware);

// Budget routes
router.post('/budgets', familyBudgetController.createBudget);
router.get('/budgets', familyBudgetController.getBudgets);
router.put('/budgets/:id', familyBudgetController.updateBudget);
router.delete('/budgets/:id', familyBudgetController.deleteBudget);

// Expense routes
router.post('/expenses', familyBudgetController.createExpense);
router.get('/expenses', familyBudgetController.getExpenses);
router.delete('/expenses/:id', familyBudgetController.deleteExpense);

// Summary
router.get('/summary', familyBudgetController.getSummary);

module.exports = router;
