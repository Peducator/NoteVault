const express = require('express');
const router = express.Router();
const authController = require('./authController');

router.post('/signup', authController.signup);
router.post('/login', authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/join-team', authController.joinTeam);
router.get('/companies', authController.getCompanies);

module.exports = router;
