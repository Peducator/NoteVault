const express = require('express');
const router = express.Router();
const categoryController = require('./categoryController');
const { authenticateToken } = require('../middleware/authMiddleware');

router.use(authenticateToken);

// Riêng categories là cá nhân hóa theo tenant nên kiểm tra kỹ để chống tuyệt đối cross-tenant access
router.get('/', categoryController.getCategories);
router.post('/', categoryController.createCategory);
router.put('/:id', categoryController.updateCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
