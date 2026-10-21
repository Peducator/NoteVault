const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const config = require('./env');

const s3ClientConfig = {
  region: config.aws.region,
};

// Nếu có cấu hình rõ trong env thì ưu tiên dùng, nếu không có thì SDK sẽ TỰ ĐỘNG
// tìm theo thứ tự: ~/.aws/credentials -> biến môi trường hệ thống -> IAM Role trên AWS
if (config.aws.accessKeyId && config.aws.secretAccessKey) {
  s3ClientConfig.credentials = {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  };
}

const s3Client = new S3Client(s3ClientConfig);

/**
 * Tạo Presigned URL cho Client (Frontend) upload trực tiếp file ảnh lên S3 (PUT)
 * @param {string} key - Tên file hoặc đường dẫn lưu trữ trên S3 (vd: receipts/user_1/abc.jpg)
 * @param {string} contentType - Kiểu file (vd: image/jpeg, image/png)
 * @param {number} expiresIn - Thời gian hết hạn của URL tính theo giây (mặc định 300s = 5 phút)
 * @returns {Promise<string>} presigned URL để upload
 */
const getUploadPresignedUrl = async (key, contentType = 'image/jpeg', expiresIn = 300) => {
  const command = new PutObjectCommand({
    Bucket: config.aws.s3BucketName,
    Key: key,
    ContentType: contentType,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
};

/**
 * Tạo Presigned URL để tải hoặc xem file ảnh từ S3 (GET)
 * @param {string} key - Đường dẫn file trên S3
 * @param {number} expiresIn - Thời gian hết hạn URL tính theo giây (mặc định 300s = 5 phút)
 * @returns {Promise<string>} presigned URL để đọc file
 */
const getDownloadPresignedUrl = async (key, expiresIn = 300) => {
  const command = new GetObjectCommand({
    Bucket: config.aws.s3BucketName,
    Key: key,
  });

  return await getSignedUrl(s3Client, command, { expiresIn });
};

module.exports = {
  s3Client,
  getUploadPresignedUrl,
  getDownloadPresignedUrl,
};
