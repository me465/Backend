const { FamilyBudget, FamilyExpense } = require('../models');

// === Budget Controller ===
exports.createBudget = async (req, res) => {
  try {
    const { category, amount, limit, period, startDate, endDate } = req.body;
    const finalAmount = amount !== undefined ? parseFloat(amount) : (limit !== undefined ? parseFloat(limit) : 0);
    
    if (!category || isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({ message: 'La catégorie et un montant valide sont requis' });
    }

    const budget = await FamilyBudget.create({
      userId: req.user.id,
      category,
      amount: finalAmount,
      period: period || 'month',
      startDate,
      endDate
    });
    res.status(201).json(budget);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la création du budget', error: err.message });
  }
};

exports.getBudgets = async (req, res) => {
  try {
    const budgets = await FamilyBudget.findAll({
      where: { userId: req.user.id },
      order: [['createdAt', 'ASC']]
    });
    res.json(budgets);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération des budgets', error: err.message });
  }
};

exports.updateBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const { category, amount, limit, period, startDate, endDate } = req.body;
    const budget = await FamilyBudget.findOne({ where: { id, userId: req.user.id } });
    
    if (!budget) return res.status(404).json({ message: 'Budget non trouvé' });

    const finalAmount = amount !== undefined ? parseFloat(amount) : (limit !== undefined ? parseFloat(limit) : budget.amount);

    await budget.update({ 
      category: category || budget.category, 
      amount: finalAmount, 
      period: period || budget.period, 
      startDate: startDate || budget.startDate, 
      endDate: endDate || budget.endDate 
    });
    res.json(budget);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la mise à jour du budget', error: err.message });
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    const { id } = req.params;
    const budget = await FamilyBudget.findOne({ where: { id, userId: req.user.id } });
    
    if (!budget) return res.status(404).json({ message: 'Budget non trouvé' });

    await budget.destroy();
    res.json({ message: 'Budget supprimé avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la suppression du budget', error: err.message });
  }
};

// === Expense Controller ===
exports.createExpense = async (req, res) => {
  try {
    const { category, amount, description, date, budgetId: bodyBudgetId } = req.body;
    const finalAmount = parseFloat(amount);

    if (isNaN(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({ message: 'Un montant valide est requis' });
    }

    let budgetId = bodyBudgetId || null;
    if (!budgetId && category) {
      const matchingBudget = await FamilyBudget.findOne({
        where: { userId: req.user.id, category }
      });
      if (matchingBudget) {
        budgetId = matchingBudget.id;
      }
    }

    const expense = await FamilyExpense.create({
      userId: req.user.id,
      budgetId,
      category: category || 'Alimentation & Courses',
      amount: finalAmount,
      description: description || 'Dépense courante',
      date: date || new Date()
    });
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la création de la dépense', error: err.message });
  }
};

exports.getExpenses = async (req, res) => {
  try {
    const expenses = await FamilyExpense.findAll({
      where: { userId: req.user.id },
      include: [{ model: FamilyBudget, attributes: ['category'] }],
      order: [['date', 'DESC'], ['createdAt', 'DESC']]
    });
    res.json(expenses);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la récupération des dépenses', error: err.message });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const { id } = req.params;
    const expense = await FamilyExpense.findOne({ where: { id, userId: req.user.id } });
    if (!expense) return res.status(404).json({ message: 'Dépense non trouvée' });

    await expense.destroy();
    res.json({ message: 'Dépense supprimée avec succès' });
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors de la suppression de la dépense', error: err.message });
  }
};

exports.getSummary = async (req, res) => {
  try {
    const budgets = await FamilyBudget.findAll({ where: { userId: req.user.id } });
    const expenses = await FamilyExpense.findAll({ where: { userId: req.user.id } });

    const summary = budgets.map(b => {
      const budgetAmount = parseFloat(b.amount) || 0;
      const spent = expenses
        .filter(e => e.budgetId === b.id || (e.category === b.category && !e.budgetId))
        .reduce((sum, e) => sum + parseFloat(e.amount), 0);
      
      const remaining = Math.max(0, budgetAmount - spent);
      const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;

      return {
        id: b.id,
        category: b.category,
        limit: budgetAmount,
        spent,
        remaining,
        percentage
      };
    });

    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: 'Erreur lors du calcul du résumé', error: err.message });
  }
};
