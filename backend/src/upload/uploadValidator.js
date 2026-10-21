/**
 * Danh sách định dạng ảnh hợp lệ và dung lượng tối đa (theo yêu cầu đề bài: tối đa 5MB)
 */
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Kiểm tra tên file và contentType trước khi tạo Presigned URL
 * @param {Object} params
 * @param {string} params.fileName - Tên file ảnh (vd: "bill.jpg")
 * @param {string} params.contentType - MIME type (vd: "image/jpeg")
 * @param {number} [params.fileSize] - Dung lượng file tính bằng bytes (nếu có)
 */
const validateUploadMetadata = ({ fileName, contentType, fileSize }) => {
  if (!fileName || typeof fileName !== 'string' || fileName.trim() === '') {
    const error = new Error('Tên file không được để trống');
    error.statusCode = 400;
    throw error;
  }

  // Kiểm tra đuôi file
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    const error = new Error(
      `Định dạng file không hợp lệ (${ext}). Chỉ chấp nhận: ${ALLOWED_EXTENSIONS.join(', ')}`
    );
    error.statusCode = 400;
    throw error;
  }

  // Kiểm tra MIME Type
  if (contentType && !ALLOWED_MIME_TYPES.includes(contentType.toLowerCase())) {
    const error = new Error(
      `Content-Type (${contentType}) không được hỗ trợ. Chỉ chấp nhận: ${ALLOWED_MIME_TYPES.join(', ')}`
    );
    error.statusCode = 400;
    throw error;
  }

  // Kiểm tra dung lượng nếu client có gửi fileSize
  if (fileSize !== undefined) {
    if (typeof fileSize !== 'number' || fileSize <= 0) {
      const error = new Error('Dung lượng file không hợp lệ');
      error.statusCode = 400;
      throw error;
    }
    if (fileSize > MAX_FILE_SIZE_BYTES) {
      const error = new Error('Dung lượng file vượt quá giới hạn cho phép (tối đa 5MB)');
      error.statusCode = 400;
      throw error;
    }
  }

  return true;
};

/**
 * Kiểm tra dữ liệu buffer ảnh thật trước khi thực hiện PUT lên S3
 * @param {Buffer} buffer - Dữ liệu nhị phân của ảnh
 * @param {string} contentType - MIME type mong đợi
 */
const validateImageBuffer = (buffer, contentType) => {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    const error = new Error('Dữ liệu ảnh không hợp lệ hoặc rỗng');
    error.statusCode = 400;
    throw error;
  }

  if (buffer.length === 0) {
    const error = new Error('File ảnh không được rỗng (0 bytes)');
    error.statusCode = 400;
    throw error;
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    const error = new Error(
      `Dung lượng ảnh (${(buffer.length / (1024 * 1024)).toFixed(2)}MB) vượt quá giới hạn 5MB`
    );
    error.statusCode = 400;
    throw error;
  }

  // Kiểm tra Magic Bytes (chữ ký nhị phân ở đầu file) để chống giả mạo đuôi file
  const isJpeg = buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isPng = buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47;
  const isWebp = buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP';

  if (!isJpeg && !isPng && !isWebp) {
    const error = new Error('File không phải là định dạng ảnh thực sự (Magic Bytes check failed)');
    error.statusCode = 400;
    throw error;
  }

  return true;
};

module.exports = {
  validateUploadMetadata,
  validateImageBuffer,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE_BYTES,
};
