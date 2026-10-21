const authService = require('./authService');

const signup = async (req, res, next) => {
  try {
    const { email, password, tenantId, companyName, name, role } = req.body;
    const user = await authService.signup({ email, password, tenantId, companyName, name, role });
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: user,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const data = await authService.login({
      email,
      password,
    });

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const data = await authService.refreshAccessToken({
      refreshToken,
    });

    return res.status(200).json({
      success: true,
      message: 'Access token refreshed successfully',
      data,
    });
  } catch (error) {
    return res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

const logout = async (req, res, next) => {
  try {
    const refreshToken = req.body?.refreshToken;
    const authHeader = req.headers['authorization'];
    const accessToken = (authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null) || req.body?.accessToken;

    const result = await authService.logout(refreshToken, accessToken);
    return res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message,
    });
  }
};

module.exports = {
  signup,
  login,
  refreshToken,
  logout,
};


