const express = require('express');
const router = express.Router();
const unitController = require('./unitController');
const {
  authenticateToken,
  requireRoot,
  requireAdmin,
  requireUnitAdminOrRoot,
  unitCreateRateLimiter,
} = require('../middleware/authMiddleware');

/**
 * =========================================================================
 * BẢO VỆ CHUNG: TẤT CẢ ENDPOINTS ĐỀU YÊU CẦU ĐĂNG NHẬP
 * =========================================================================
 * - Xác thực Access Token hợp lệ (Bearer JWT)
 * - Kiểm tra thu hồi token trong Redis Blacklist
 * - Định danh req.user = { id, email, tenantId, role }
 */
router.use(authenticateToken);

/**
 * -------------------------------------------------------------------------
 * 1. POST /api/units - Tạo đơn vị mới (Unit / Phòng ban / Nhóm)
 * -------------------------------------------------------------------------
 * - Chức năng: Tạo mới 1 nút trong cây cơ cấu tổ chức của công ty.
 * - Phân quyền: Cấp Cha ở trên hoặc Anh Cả được cấp phép tạo Nest (allowCreateSubUnit).
 * - Quy tắc & Bảo mật đã kích hoạt:
 *   + 1 người dùng ĐƯỢC PHÉP làm Quản lý/Admin của nhiều nhóm khác nhau.
 *   + Hỗ trợ cấu hình allowMemberViewBalance và allowCreateSubUnit.
 *   + Rate Limiting: Giới hạn tối đa 1 lần tạo / 2 phút cho mỗi tài khoản để chống spam DoS.
 *   + Validate dữ liệu đầu vào: tên không rỗng, kiểm tra parentId và ownerId cùng tenant.
 */
router.post('/', requireAdmin, unitCreateRateLimiter, unitController.createUnit);

/**
 * -------------------------------------------------------------------------
 * 2. GET /api/units - Lấy danh sách cây phân cấp tổ chức của tenant
 * -------------------------------------------------------------------------
 * - Chức năng: Trả về danh sách phẳng (flat) và cấu trúc cây (tree) của các phòng ban.
 * - Phân quyền: Tất cả tài khoản trong công ty (kết quả hiển thị theo vai trò).
 * - Quy tắc & Bảo mật đã kích hoạt:
 *   + ROOT: Xem được toàn bộ cây từ gốc đến lá kèm số dư an toàn (safeBalance).
 *   + Admin nhóm (Unit Owner): Thấy các nhóm và thành viên mình đang quản lý; xem được số dư các nhóm mình phụ trách.
 *   + Member thường: Mặc định safeBalance = null (bị ẩn số dư); chỉ xem được số dư nếu Admin nhóm đó bật allowMemberViewBalance = true.
 *   + Tự động lọc bỏ các đơn vị đã bị xóa mềm (deletedAt !== null).
 */
router.get('/', unitController.getUnitTree);

/**
 * -------------------------------------------------------------------------
 * 3. GET /api/units/:id - Xem thông tin chi tiết một đơn vị
 * -------------------------------------------------------------------------
 * - Chức năng: Trả về thông tin đơn vị, danh sách thành viên, đơn vị con và số dư.
 * - Phân quyền: ROOT, Admin của unit đó, Quản lý cấp trên, hoặc Thành viên thuộc unit.
 * - Quy tắc & Bảo mật đã kích hoạt:
 *   + Validate :id phải là số nguyên dương hợp lệ.
 *   + Người ngoài phòng ban không có thẩm quyền sẽ bị từ chối (403 Forbidden).
 *   + Thành viên bên trong chỉ thấy số dư nếu allowMemberViewBalance = true.
 */
router.get('/:id', unitController.getUnitById);

/**
 * -------------------------------------------------------------------------
 * 4. GET /api/units/:id/balance - Xem số dư tức thời của đơn vị
 * -------------------------------------------------------------------------
 * - Chức năng: Tính toán động số dư tức thời = Tổng Tiền Vào - Tổng Tiền Cấp Ra - Tổng Chi Đã Duyệt.
 * - Phân quyền:
 *   + ROOT: Được xem số dư của mọi đơn vị.
 *   + Admin của đơn vị (Unit Owner): Được xem số dư đơn vị mình quản lý.
 *   + Member trong đơn vị: CHỈ xem được nếu Admin nhóm đã cấp quyền (allowMemberViewBalance = true).
 *   + Đối tượng khác: Bị từ chối truy cập (403 Forbidden).
 * - Quy tắc & Bảo mật đã kích hoạt:
 *   + Chống IDOR triệt để: Bắt buộc đơn vị phải thuộc tenantId của người gọi.
 */
router.get('/:id/balance', unitController.getUnitBalance);

/**
 * -------------------------------------------------------------------------
 * 5. PUT /api/units/:id - Cập nhật thông tin đơn vị
 * -------------------------------------------------------------------------
 * - Chức năng: Đổi tên đơn vị (name), cấu hình xem số dư (allowMemberViewBalance), hoặc đổi Quản lý (ownerId).
 * - Phân quyền: ROOT hoặc Quản lý (Admin) của chính đơn vị đó (requireUnitAdminOrRoot).
 * - Quy tắc & Bảo mật đã kích hoạt:
 *   + Admin của nhóm: CHỈ được phép đổi tên nhóm (name) và bật/tắt allowMemberViewBalance.
 *   + Cấm Admin nhóm tự ý đổi ownerId (nếu cố tình gửi ownerId sẽ bị từ chối 403: "Chỉ ROOT mới có quyền bổ nhiệm hoặc thay đổi người quản lý").
 *   + ROOT: Có toàn quyền đổi tên, cấu hình xem số dư và chuyển giao ownerId.
 *   + Tự động ghi nhận Audit Log chi tiết ai đã cập nhật những trường gì.
 */
router.put('/:id', requireUnitAdminOrRoot, unitController.updateUnit);

/**
 * -------------------------------------------------------------------------
 * 6. DELETE /api/units/:id - Xóa đơn vị (Soft Delete)
 * -------------------------------------------------------------------------
 * - Chức năng: Xóa đơn vị cấp phòng ban / nhóm.
 * - Phân quyền: CHỈ ROOT cấp công ty (requireRoot).
 * - Quy tắc & Bảo mật đã kích hoạt:
 *   + Điều kiện an toàn: Chỉ được xóa nút lá (không có đơn vị con) và chưa từng phát sinh giao dịch chi tiêu hoặc nhận/cấp tiền.
 *   + Enterprise Soft Delete: Đánh dấu deletedAt = now(), không xóa vĩnh viễn khỏi DB để giữ vẹn toàn Audit Trail.
 *   + Tự động gỡ liên kết unitId của toàn bộ nhân viên trong đơn vị về null (trở thành nhân viên tự do).
 *   + Ghi nhận Audit Log sự kiện xóa đơn vị.
 */
router.delete('/:id', requireRoot, unitController.deleteUnit);

/**
 * -------------------------------------------------------------------------
 * 7. GET /api/units/:id/members - Lấy danh sách thành viên trong đơn vị
 * -------------------------------------------------------------------------
 * - Chức năng: Trả về danh sách thành viên (kèm vai trò isOwner, ngày gia nhập).
 * - Phân quyền: ROOT, Quản lý đơn vị (Anh Cả hoặc Cha ở trên), hoặc Member của đơn vị.
 */
router.get('/:id/members', unitController.getUnitMembers);

/**
 * -------------------------------------------------------------------------
 * 8. POST /api/units/:id/members - Thêm / Kết nạp nhân viên vào đơn vị
 * -------------------------------------------------------------------------
 * - Chức năng: Gán nhân viên vào làm việc tại đơn vị.
 * - Phân quyền: ROOT hoặc Quản lý (Admin) của chính đơn vị đó (requireUnitAdminOrRoot).
 * - Quy tắc & Bảo mật đã kích hoạt:
 *   + Hỗ trợ nhân viên tham gia nhiều nhóm đồng thời qua bảng unit_members.
 *   + Validate :id và body.userId hợp lệ; kiểm tra nhân viên còn Active (deletedAt = null) và cùng công ty.
 *   + Bắt buộc ghi nhận Audit Log: Lưu vết lịch sử ai đã thêm ai hoặc điều chuyển ai từ nhóm cũ sang nhóm mới.
 */
router.post('/:id/members', requireUnitAdminOrRoot, unitController.addMember);

/**
 * -------------------------------------------------------------------------
 * 8. DELETE /api/units/:id/members/:userId - Gỡ nhân viên ra khỏi đơn vị
 * -------------------------------------------------------------------------
 * - Chức năng: Đưa nhân viên ra khỏi đơn vị (trở thành nhân viên tự do, unitId = null).
 * - Phân quyền: ROOT hoặc Quản lý (Admin) của chính đơn vị đó (requireUnitAdminOrRoot).
 * - Quy tắc & Bảo mật đã kích hoạt:
 *   + Chặn tuyệt đối gỡ Quản lý của nhóm (Owner) ra khỏi đơn vị của họ.
 *   + Bảo toàn dữ liệu tài chính: Giữ nguyên vẹn tài khoản nhân viên và tất cả các hóa đơn/chi tiêu cũ họ từng tạo để phục vụ đối soát kiểm toán.
 *   + Ghi nhận Audit Log sự kiện gỡ thành viên.
 */
router.delete('/:id/members/:userId', requireUnitAdminOrRoot, unitController.removeMember);

/**
 * -------------------------------------------------------------------------
 * 9. POST /api/units/:id/reorganize/preview - Xem trước phân tích tái cấu trúc đơn vị
 * -------------------------------------------------------------------------
 * - Chức năng: Tìm chuỗi sếp cũ trung gian (con B, cha D) và các con cháu của D
 * - Phân quyền: ROOT cấp công ty (requireRoot)
 */
router.post('/:id/reorganize/preview', requireRoot, unitController.previewReorganize);

/**
 * -------------------------------------------------------------------------
 * 10. POST /api/units/:id/reorganize/confirm - Xác nhận thực thi tái cấu trúc đơn vị
 * -------------------------------------------------------------------------
 * - Chức năng: Chuyển D sang cha mới và áp dụng chiến lược 'SHARED_CHILDREN' hoặc 'FULL_ISOLATION'
 * - Phân quyền: ROOT cấp công ty (requireRoot)
 */
router.post('/:id/reorganize/confirm', requireRoot, unitController.confirmReorganize);

module.exports = router;
