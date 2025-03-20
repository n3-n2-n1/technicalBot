const axios = require('axios');
const Redis = require('redis');
const { promisify } = require('util');

// Configuración global para el uso de Redis
const USE_REDIS = false; // Cambia a true si quieres usar Redis

// Initialize Redis client
let redisClient = null;
let getAsync = null;
let setAsync = null;

// Función optimizada para inicializar Redis o fallar rápidamente
const initRedis = async () => {
  // Si explícitamente se ha desactivado Redis, no intentamos conectar
  if (!USE_REDIS) {
    return false;
  }

  try {
    // Si ya tenemos un cliente inicializado y conectado, lo usamos
    if (redisClient && redisClient.connected) {
      return true;
    }
    
    // Si tenemos un cliente pero no está conectado, lo limpiamos
    if (redisClient) {
      try {
        redisClient.quit();
      } catch (e) {
        // Ignoramos errores al cerrar
      }
      redisClient = null;
    }

    // Creamos un nuevo cliente con timeout reducido
    redisClient = Redis.createClient({
      url: process.env.REDIS_URL,
      connect_timeout: 1000, // 1 segundo máximo para conectar
      retry_strategy: () => null // No reintentar
    });
    
    // Configuramos handlers una sola vez
    redisClient.on('error', (err) => {
      console.error('Redis error:', err);
      redisClient = null;
    });

    // Esperamos la conexión con un timeout corto
    const connected = await Promise.race([
      new Promise(resolve => {
        redisClient.once('connect', () => {
          console.log('Redis connected successfully');
          getAsync = promisify(redisClient.get).bind(redisClient);
          setAsync = promisify(redisClient.set).bind(redisClient);
          resolve(true);
        });
      }),
      new Promise(resolve => {
        redisClient.once('error', () => {
          console.log('Redis connection failed');
          redisClient = null;
          resolve(false);
        });
      }),
      // Timeout de sólo 1 segundo
      new Promise(resolve => {
        setTimeout(() => {
          if (!redisClient?.connected) {
            console.log('Redis connection timeout');
            if (redisClient) {
              try {
                redisClient.quit();
              } catch (e) {
                // Ignoramos errores al cerrar
              }
              redisClient = null;
            }
            resolve(false);
          }
        }, 1000);
      })
    ]);

    return connected;
  } catch (error) {
    console.error('Redis initialization error:', error);
    if (redisClient) {
      try {
        redisClient.quit();
      } catch (e) {
        // Ignoramos errores al cerrar
      }
    }
    redisClient = null;
    return false;
  }
};

// List available models from Ollama
exports.listModels = async () => {
  try {
    const response = await axios.get(`${process.env.OLLAMA_API_URL}/api/tags`);
    
    // Handle the Ollama API response format
    if (response.data && response.data.models) {
      return response.data.models;
    } else if (Array.isArray(response.data)) {
      // Handle case where response is an array directly
      return response.data;
    } else {
      // If the structure is different, transform it to expected format
      const modelData = response.data;
      const formattedModels = Object.keys(modelData || {}).map(name => ({
        name,
        ...modelData[name]
      }));
      return formattedModels;
    }
  } catch (error) {
    console.error('Error getting models from Ollama:', error);
    // Return empty array instead of throwing to avoid breaking the UI
    return [];
  }
};

// Generate response from Ollama
exports.generateResponse = async (model, messages, userId) => {
  try {
    // Intentamos usar Redis solo si está configurado para ello
    const redisAvailable = USE_REDIS ? await initRedis() : false;
    let cachedResponse = null;
    
    // Solo intentamos obtener del caché si Redis está disponible
    if (redisAvailable && redisClient && getAsync) {
      try {
        const cacheKey = `response:${userId}:${model}:${JSON.stringify(messages)}`;
        const cachedData = await getAsync(cacheKey);
        
        if (cachedData) {
          try {
            cachedResponse = JSON.parse(cachedData);
            console.log('Using cached response');
            return cachedResponse;
          } catch (e) {
            console.error('Error parsing cached data:', e);
            // Continuamos si hay error al parsear
          }
        }
      } catch (cacheError) {
        console.error('Cache retrieval error:', cacheError);
        // Continuamos sin caché si hay un error
      }
    }
    
    // Obtenemos la respuesta de Ollama directamente
    console.log(`Requesting response from Ollama model: ${model}`);
    const response = await axios.post(`${process.env.OLLAMA_API_URL}/api/chat`, {
      model,
      messages,
      stream: false
    });
    
    // Solo intentamos cachear si Redis está disponible
    if (redisAvailable && redisClient && setAsync) {
      try {
        const cacheKey = `response:${userId}:${model}:${JSON.stringify(messages)}`;
        await setAsync(cacheKey, JSON.stringify(response.data), 'EX', 3600); // Cache for 1 hour
        console.log('Response cached successfully');
      } catch (cacheError) {
        console.error('Cache storage error:', cacheError);
        // Continuamos sin caché si hay un error
      }
    }
    
    return response.data;
  } catch (error) {
    console.error('Error generating response from Ollama:', error);
    // Return a default response instead of failing
    return {
      message: {
        role: 'assistant',
        content: 'Lo siento, no pude generar una respuesta en este momento. Por favor, intenta nuevamente más tarde.'
      }
    };
  }
};

// Stream response from Ollama (for real-time responses)
exports.streamResponse = async (model, messages, onData, onComplete) => {
  try {
    // Format messages for Ollama
    const promptMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    const response = await axios.post(`${process.env.OLLAMA_API_URL}/api/chat`, {
      model,
      messages: promptMessages,
      stream: true
    }, {
      responseType: 'stream'
    });
    
    let fullResponse = '';
    
    response.data.on('data', (chunk) => {
      const chunkData = chunk.toString();
      fullResponse += chunkData;
      
      try {
        const jsonData = JSON.parse(chunkData);
        onData(jsonData);
      } catch (err) {
        // Ignore parsing errors for incomplete chunks
      }
    });
    
    response.data.on('end', () => {
      onComplete(fullResponse);
    });
  } catch (error) {
    console.error('Error streaming response from Ollama:', error);
    onComplete({
      message: {
        role: 'assistant',
        content: 'Lo siento, no pude generar una respuesta en este momento. Por favor, intenta nuevamente más tarde.'
      }
    });
  }
}; 