const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Models routes
router.get('/models', aiController.getModels);

// Chat routes
router.post('/chats', aiController.createChat);
router.get('/chats', aiController.getChats);
router.get('/chats/:chatId', aiController.getChatById);
router.post('/chats/:chatId/messages', aiController.sendMessage);
router.delete('/chats/:chatId', aiController.deleteChat);

module.exports = router; 