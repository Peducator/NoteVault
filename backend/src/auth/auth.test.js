const request = require('supertest');
const app = require('../../app');
const { users } = require('./userModel');

describe('Auth Service & API Tests', () => {
  beforeEach(() => {
    // Reset danh sách user trước mỗi test case
    users.length = 0;
  });

  describe('POST /api/auth/signup', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'lan@notevault.com',
          password: 'Password@123',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.email).toBe('lan@notevault.com');
      expect(res.body.data.password).toBeUndefined(); // không được lộ hash password
    });

    it('should fail if email or password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'lan@notevault.com',
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should fail if user already exists', async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'lan@notevault.com',
          password: 'Password@123',
        });

      const duplicateRes = await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'lan@notevault.com',
          password: 'DifferentPassword456',
        });

      expect(duplicateRes.statusCode).toBe(409);
      expect(duplicateRes.body.success).toBe(false);
      expect(duplicateRes.body.message).toMatch(/already exists/i);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({
          email: 'lan@notevault.com',
          password: 'Password@123',
        });
    });

    it('should login successfully with valid credentials and return JWT token', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'lan@notevault.com',
          password: 'Password@123',
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.user.email).toBe('lan@notevault.com');
      expect(typeof res.body.data.token).toBe('string');
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'lan@notevault.com',
          password: 'WrongPassword',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/invalid email or password/i);
    });

    it('should reject login with non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'notfound@notevault.com',
          password: 'Password@123',
        });

      expect(res.statusCode).toBe(401);
      expect(res.body.success).toBe(false);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const res = await request(app)
        .post('/api/auth/logout');

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toMatch(/logged out successfully/i);
    });
  });
});
