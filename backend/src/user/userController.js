const userService = require('./userService');

/**
 * GET /api/users/profile
 * Xem hồ sơ cá nhân
 */
const getProfile = async (req, res) => {
  try {
    const profile = await userService.getProfile(req.user.id);
    return res.status(200).json({
      success: true,
      message: 'Lấy thông tin cá nhân thành công',
      data: profile,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * PUT /api/users/profile
 * Chỉnh sửa hồ sơ cá nhân (name, password)
 */
const updateProfile = async (req, res) => {
  try {
    const { name, password } = req.body;
    const updated = await userService.updateProfile(req.user.id, { name, password });
    return res.status(200).json({
      success: true,
      message: 'Cập nhật thông tin cá nhân thành công',
      data: updated,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * POST /api/users
 * Thêm nhân viên mới trong công ty (Admin only)
 */
const createEmployee = async (req, res) => {
  try {
    const { email, password, name, role, department, employeeCode } = req.body;
    const employee = await userService.createEmployee({
      adminTenantId: req.user.tenantId,
      email,
      password,
      name,
      role,
      department,
      employeeCode,
    });

    return res.status(201).json({
      success: true,
      message: 'Thêm nhân viên mới thành công',
      data: employee,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/users
 * Lấy danh sách nhân viên trong công ty (Admin only)
 */
const getEmployees = async (req, res) => {
  try {
    const { search } = req.query;
    const employees = await userService.getEmployees({
      adminTenantId: req.user.tenantId,
      search,
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách nhân viên thành công',
      data: employees,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * DELETE /api/users/:id
 * Xóa mềm nhân viên trong công ty (Admin only)
 */
const deleteEmployee = async (req, res) => {
  try {
    const result = await userService.softDeleteEmployee({
      adminUserId: req.user.id,
      adminTenantId: req.user.tenantId,
      targetUserId: req.params.id,
    });

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/users/join-requests
 * Lấy danh sách yêu cầu gia nhập đang chờ duyệt từ Redis (Admin only)
 */
const getJoinRequests = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const requests = await userService.getJoinRequests(tenantId);

    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách yêu cầu gia nhập thành công',
      data: requests,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * POST /api/users/join-requests/:id/approve
 * Phê duyệt đơn gia nhập, tạo user trong DB và cấp Role (Admin only)
 */
const approveJoinRequest = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const { role, department } = req.body;
    const newUser = await userService.approveJoinRequest(tenantId, req.params.id, {
      role,
      department,
    });

    return res.status(200).json({
      success: true,
      message: 'Phê duyệt thành viên thành công',
      data: newUser,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * DELETE /api/users/join-requests/:id
 * Từ chối đơn gia nhập và xóa sạch khỏi Redis (Admin only)
 */
const rejectJoinRequest = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const result = await userService.rejectJoinRequest(tenantId, req.params.id);

    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/users/departments-overview
 * Xem danh sách nhân viên theo từng phòng ban kèm ngân sách phân bổ (Admin only)
 */
const getDepartmentsOverview = async (req, res) => {
  try {
    const tenantId = req.user.tenantId;
    const overview = await userService.getDepartmentsOverview(tenantId);

    return res.status(200).json({
      success: true,
      message: 'Lấy tổng quan phòng ban và nhân sự thành công',
      data: overview,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/users/admin-context/:companyUuid/:userUuid
 * Lấy toàn bộ thông tin công ty, admin, danh sách nhân viên theo cặp UUID
 */
const getAdminContext = async (req, res) => {
  try {
    const { companyUuid, userUuid } = req.params;
    const context = await userService.getAdminContext({
      companyUuid,
      userUuid,
      requesterUserUuid: req.user.uuid,
      requesterUserId: req.user.id,
      requesterTenantId: req.user.tenantId,
    });

    return res.status(200).json({
      success: true,
      message: 'Lấy dữ liệu quản trị doanh nghiệp thành công',
      data: context,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

/**
 * GET /api/users/me/units
 * GET /api/users/me/groups
 * Lấy danh sách các nhóm/đơn vị mà user hiện tại tham gia
 */
const getMyUnits = async (req, res) => {
  try {
    const units = await userService.getUserUnits(req.user.id, req.user.tenantId);
    return res.status(200).json({
      success: true,
      message: 'Lấy danh sách nhóm tham gia thành công',
      data: units,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getMyUnits,
  createEmployee,
  getEmployees,
  deleteEmployee,
  getJoinRequests,
  approveJoinRequest,
  rejectJoinRequest,
  getDepartmentsOverview,
  getAdminContext,
};

