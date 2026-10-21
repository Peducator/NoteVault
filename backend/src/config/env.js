const dotenv = require('dotenv');

// Nạp file .env nếu có (dành cho local development / test), không ràng buộc bắt buộc phải có file .env
dotenv.config();

/**
 * Khai báo danh sách các biến môi trường bắt buộc (required) cho từng môi trường cụ thể
 * Tránh ràng buộc cứng của file .env vật lý, cho phép nhận biến từ Docker / Cloud / ECS Task / K8s
 */
const REQUIRED_ENV_VARS_BY_ENV = {
  development: [
    // Ở dev cho phép dùng fallback mặc định để dev chạy nhanh không bị chặn
  ],
  staging: [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'BUCKET_NAME',
  ],
  production: [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'BUCKET_NAME',
    'AWS_REGION',
    'REDIS_HOST',
  ],
};

/**
 * Phân loại và xử lý rõ ràng 3 môi trường chính
 */
const rawNodeEnv = (process.env.NODE_ENV || 'development').toLowerCase().trim();

let currentEnv = 'development';

if (rawNodeEnv === 'production' || rawNodeEnv === 'prod') {
  currentEnv = 'production';
} else if (rawNodeEnv === 'staging' || rawNodeEnv === 'stage') {
  currentEnv = 'staging';
} else {
  // Mặc định hoặc development / test
  currentEnv = 'development';
}

/**
 * Kiểm tra các biến môi trường bắt buộc theo từng môi trường tương ứng
 */
const validateEnv = () => {
  const requiredVars = REQUIRED_ENV_VARS_BY_ENV[currentEnv] || [];
  const missingVars = requiredVars.filter((key) => !process.env[key] && !process.env[key.toUpperCase()]);

  if (missingVars.length > 0) {
    throw new Error(
      `[Config Error - Môi trường: ${currentEnv.toUpperCase()}] Thiếu các biến môi trường bắt buộc: ${missingVars.join(', ')}`
    );
  }

  // Cảnh báo ở môi trường dev nếu chưa đặt JWT_SECRET
  if (currentEnv === 'development' && !process.env.JWT_SECRET && process.env.NODE_ENV !== 'test') {
    console.warn(
      '[Config Warning] Đang chạy ở DEVELOPMENT: JWT_SECRET chưa được cấu hình, dùng fallback key mặc định.'
    );
  }
};

// Chạy kiểm tra validate biến môi trường ngay khi nạp module
validateEnv();

/**
 * Cấu hình tập trung theo từng môi trường
 */
const config = {
  nodeEnv: currentEnv,
  isProduction: currentEnv === 'production',
  isStaging: currentEnv === 'staging',
  isDevelopment: currentEnv === 'development',
  port: parseInt(process.env.PORT, 10) || 3000,

  jwt: {
    secret: process.env.JWT_SECRET || (currentEnv === 'production' ? null : 'default_secret_key_change_in_production'),
    refreshSecret: process.env.JWT_REFRESH_SECRET || (currentEnv === 'production' ? null : 'default_refresh_secret_key_change_in_production'),
    accessTokenExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '20m',
    refreshTokenExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  aws: {
    region: process.env.AWS_REGION || 'ap-southeast-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    s3BucketName: process.env.BUCKET_NAME || process.env.AWS_S3_BUCKET_NAME || (currentEnv === 'production' ? 'notevault-bucket-prod' : 'notevault-bucket-file-dev'),
  },

  db: {
    url: process.env.DATABASE_URL || 'postgresql://frobez_user:frobez_password@localhost:5432/notevault',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
  },

  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },

  REQUIRED_ENV_VARS_BY_ENV,
  validateEnv,
};

module.exports = config;
