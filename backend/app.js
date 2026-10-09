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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});