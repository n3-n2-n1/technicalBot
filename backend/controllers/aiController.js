const aiService = require('../services/aiService');
const Chat = require('../models/chat');

// Get available models
exports.getModels = async (req, res) => {
  try {
    const models = await aiService.listModels();
    
    // If no models found, we'll provide a default model
    if (!models || models.length === 0) {
      return res.status(200).json({ 
        models: [{ name: 'llama2', modified_at: new Date().toISOString() }]
      });
    }
    
    res.status(200).json({ models });
  } catch (error) {
    console.error('Get models error:', error);
    // Return a default model instead of an error
    res.status(200).json({ 
      models: [{ name: 'llama2', modified_at: new Date().toISOString() }]
    });
  }
};

// Create a new chat
exports.createChat = async (req, res) => {
  try {
    const { title, model } = req.body;
    
    const chat = new Chat({
      title,
      user: req.user._id,
      model: model || 'llama2',
      messages: []
    });
    
    await chat.save();
    
    res.status(201).json({
      message: 'Chat created successfully',
      chat
    });
  } catch (error) {
    console.error('Create chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get user's chats
exports.getChats = async (req, res) => {
  try {
    const chats = await Chat.find({ user: req.user._id })
      .sort({ updatedAt: -1 })
      .select('title model createdAt updatedAt');
    
    res.status(200).json({ chats });
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Get chat by id
exports.getChatById = async (req, res) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      user: req.user._id
    });
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    res.status(200).json({ chat });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Send message to chat
exports.sendMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const chatId = req.params.chatId;
    
    console.log(`Processing message for chat ${chatId}`);
    
    // Find the chat
    const chat = await Chat.findOne({
      _id: chatId,
      user: req.user._id
    });
    
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    // Add user message to chat
    const userMessage = {
      sender: req.user._id,
      content,
      role: 'user'
    };
    
    chat.messages.push(userMessage);
    
    // Format messages for AI service
    const messages = chat.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    console.log(`Requesting AI response for model: ${chat.model}`);
    
    try {
      // Get AI response
      const aiResponse = await aiService.generateResponse(chat.model, messages, req.user._id);
      
      if (!aiResponse || !aiResponse.message) {
        throw new Error('Invalid response from AI service');
      }
      
      // Add AI response to chat
      const assistantMessage = {
        sender: req.user._id, // Using user ID as the sender even for assistant messages
        content: aiResponse.message.content,
        role: 'assistant'
      };
      
      chat.messages.push(assistantMessage);
      await chat.save();
      
      // Try to emit event via Socket.io if available
      try {
        if (req.app.get('io')) {
          req.app.get('io').to(chatId).emit('message', assistantMessage);
        }
      } catch (socketError) {
        console.error('Socket.io error:', socketError);
        // Continue even if socket emission fails
      }
      
      return res.status(200).json({
        userMessage,
        assistantMessage
      });
    } catch (aiError) {
      console.error('AI service error:', aiError);
      
      // Add fallback message
      const fallbackMessage = {
        sender: req.user._id,
        content: "Lo siento, hubo un problema al procesar tu mensaje. Por favor, intenta nuevamente.",
        role: 'assistant'
      };
      
      chat.messages.push(fallbackMessage);
      await chat.save();
      
      return res.status(200).json({
        userMessage,
        assistantMessage: fallbackMessage
      });
    }
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Failed to send message' });
  }
};

// Delete chat
exports.deleteChat = async (req, res) => {
  try {
    const chatId = req.params.chatId;
    
    const result = await Chat.deleteOne({
      _id: chatId,
      user: req.user._id
    });
    
    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    
    res.status(200).json({ message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
}; 