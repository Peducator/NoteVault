const express = require('express');
const cors = require('cors');
const config = require('./src/config/env');
const app = express();
const authRoutes = require('./src/auth/authRoutes');
const uploadRoutes = require('./src/upload/uploadRoutes');
const categoryRoutes = require('./src/category/categoryRoutes');
const transactionRoutes = require('./src/transaction/transactionRoutes');
const userRoutes = require('./src/user/userRoutes');
const ocrRoutes = require('./src/ocr/ocrRoutes');
const bankingRoutes = require('./src/banking/bankingRoutes');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/ocr', ocrRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/users', userRoutes);
app.use('/api/banking', bankingRoutes);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Chỉ listen port khi chạy trực tiếp qua `node app.js`, không listen khi chạy qua Jest
if (require.main === module) {
  const PORT = config.port;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT} (0.0.0.0)`);
  });
}

module.exports = app;