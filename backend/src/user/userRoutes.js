const express = require('express');
const router = express.Router();
const userController = require('./userController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

// ==========================================
// 1. User thuần: Chỉ xem và sửa thông tin cá nhân
// ==========================================
router.get('/profile', authenticateToken, userController.getProfile);
router.put('/profile', authenticateToken, userController.updateProfile);

// ==========================================
// 2. Admin: Quản lý nhân viên (Thêm, Xem, Xóa mềm)
// ==========================================
router.get('/', authenticateToken, requireAdmin, userController.getEmployees);
router.post('/', authenticateToken, requireAdmin, userController.createEmployee);

// ==========================================
// 3. Admin: Quản lý duyệt đơn gia nhập (Join Requests) từ Redis
// ==========================================
router.get('/join-requests', authenticateToken, requireAdmin, userController.getJoinRequests);
router.post('/join-requests/:id/approve', authenticateToken, requireAdmin, userController.approveJoinRequest);
router.delete('/join-requests/:id', authenticateToken, requireAdmin, userController.rejectJoinRequest);

// ==========================================
// 4. Admin: Xem tổng quan nhân sự theo phòng ban & ngân sách
// ==========================================
router.get('/departments-overview', authenticateToken, requireAdmin, userController.getDepartmentsOverview);

// ==========================================
// 5. Admin: Ngữ cảnh Quản trị theo UUID (/:companyUuid/:userUuid/admin)
// ==========================================
router.get('/admin-context/:companyUuid/:userUuid', authenticateToken, requireAdmin, userController.getAdminContext);

router.delete('/:id', authenticateToken, requireAdmin, userController.deleteEmployee);

module.exports = router;
