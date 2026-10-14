/**
 * Model lưu trữ lịch sử hóa đơn / upload (tương đương bảng `receipts` / `uploads` trong Database)
 * Sẵn sàng kết nối PostgreSQL / Prisma / ORM trong các bước tiếp theo
 */
const uploads = [];

/**
 * Tìm lần upload mới nhất của một user trong Database
 * @param {number|string} userId
 * @returns {Promise<Object|null>} bản ghi upload gần nhất (hoặc null nếu chưa từng upload)
 */
const getLatestUploadByUserId = async (userId) => {
  const userUploads = uploads.filter((item) => String(item.userId) === String(userId));
  if (userUploads.length === 0) {
    return null;
  }
  // Lấy bản ghi có uploadId lớn nhất (mới nhất)
  return userUploads.reduce((latest, current) => 
    current.uploadId > latest.uploadId ? current : latest
  , userUploads[0]);
};

/**
 * Lưu thông tin lần upload mới vào Database
 * @param {Object} uploadData
 */
const createUploadRecord = async (uploadData) => {
  const record = {
    ...uploadData,
    createdAt: new Date().toISOString(),
  };
  uploads.push(record);
  return record;
};

module.exports = {
  uploads,
  getLatestUploadByUserId,
  createUploadRecord,
};
