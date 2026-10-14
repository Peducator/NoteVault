const express = require('express');
const router = express.Router();
const categoryController = require('./categoryController');
const { authenticateToken } = require('../middleware/authMiddleware');

// Tất cả các routes của category đều bắt buộc có Token chính chủ
router.use(authenticateToken);

router.get('/', categoryController.getCategories);
router.post('/', categoryController.createCategory);
router.delete('/:id', categoryController.deleteCategory);

module.exports = router;
