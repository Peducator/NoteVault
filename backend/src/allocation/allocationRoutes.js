const express = require('express');
const router = express.Router();
const allocationController = require('./allocationController');
const allocationRequestController = require('./allocationRequestController');
const { authenticateToken, requireAdmin } = require('../middleware/authMiddleware');

router.use(authenticateToken);
// Chỉ có ROOT có liên quan và ADMIN/EDIT có liên quan với tenantId mới có quyền
router.use(requireAdmin);

// ==================== CẤP PHÁT NGÂN SÁCH TRỰC TIẾP (TOP-DOWN) ====================
// Cấp tiền (Nạp vốn hoặc Cấp từ cha xuống con)
router.post('/', allocationController.createAllocation);

// Thu hồi ngân sách (Từ con về lại cha cấp trên)
router.post('/recall', allocationController.recallAllocation);

// Lịch sử cấp tiền của tenant
router.get('/', allocationController.getAllocations);

// ==================== QUY TRÌNH XIN CẤP NGÂN SÁCH (BOTTOM-UP / ESCALATION) ====================
// 1. Tạo yêu cầu xin cấp thêm ngân sách lên cha trực tiếp
router.post('/requests', allocationRequestController.createRequest);

// 2. Lấy danh sách yêu cầu xin cấp ngân sách (có phân trang & lọc theo status/unitId)
router.get('/requests', allocationRequestController.getRequests);

// 3. Lấy chi tiết 1 yêu cầu kèm toàn bộ Audit Trail & trạng thái khóa
router.get('/requests/:id', allocationRequestController.getRequestById);

// 4. Khóa tiến trình thanh toán (Atomic CAS Lock - TTL 5 phút)
router.post('/requests/:id/lock', allocationRequestController.lockRequest);

// 5. Hủy khóa (Release Lock trở về PENDING)
router.post('/requests/:id/unlock', allocationRequestController.unlockRequest);

// 6. Duyệt & Chuyển tiếp (Endorse & Forward) lên cấp trên
router.post('/requests/:id/forward', allocationRequestController.forwardRequest);

// 7. Xác nhận CONFIRM & Giải ngân trực tiếp từ cấp có tiền (Approve & Direct Fund)
router.post('/requests/:id/approve', allocationRequestController.approveAndFundRequest);

// 8. Từ chối yêu cầu (Reject kèm lý do bắt buộc và ghi nhận minh bạch)
router.post('/requests/:id/reject', allocationRequestController.rejectRequest);

// 9. Hủy yêu cầu bởi chính người tạo
router.post('/requests/:id/cancel', allocationRequestController.cancelRequest);

module.exports = router;
