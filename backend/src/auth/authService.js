const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { users } = require('./userModel');

const JWT_SECRET = process.env.JWT_SECRET || 'default_secret_key_change_in_production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

// Signup service
const signup = async ({ email, password }) => {
  if (!email || !password) {
    throw new Error('Email and password are required');
  }

  const existingUser = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (existingUser) {
    const error = new Error('User already exists');
    error.statusCode = 409;
    throw error;
  }

  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds);

  const newUser = {
    id: users.length + 1,
    email: email.toLowerCase(),
    password: hashedPassword,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);

  // Exclude password from return payload
  const { password: _, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
};

// Login service
const login = async ({ email, password }) => {
  if (!email || !password) {
    const error = new Error('Email and password are required');
    error.statusCode = 400;
    throw error;
  }

  const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password');
    error.statusCode = 401;
    throw error;
  }

  const token = jwt.sign(
    { userId: user.id, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );

  const { password: _, ...userWithoutPassword } = user;
  return { user: userWithoutPassword, token };
};

// Logout service
const logout = async () => {
  // In stateless JWT auth, client discards token.
  // Can be extended with token blocklist/Redis if needed.
  return { message: 'Logged out successfully' };
};

module.exports = {
  signup,
  login,
  logout,
};
