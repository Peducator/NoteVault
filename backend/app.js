const express = require('express');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const authRoutes = require('./src/auth/authRoutes');

app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

// Chỉ listen port khi chạy trực tiếp qua `node app.js`, không listen khi chạy qua Jest
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;