const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');

dotenv.config();
const app = express();

// Enable CORS with explicit configuration
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Manually handle preflight for the specific route (avoids Express 5 wildcard issues)
app.options('/api/matrixify', cors());
// Aumenta o limite para aceitar strings Base64 pesadas
app.use(express.json({ limit: '50mb' }));

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_API_KEY);

// Configure multer for handling file uploads (matching Matrix/server.js)
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.post('/api/matrixify', upload.single('image'), async (req, res) => {
    console.log('Recebi pedido de Matrixficação (Gemini Nano Banana)...');
    try {
        const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GOOGLE_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'GEMINI_API_KEY não configurada no .env' });
        }

        let base64Image, mimeType;

        if (req.file) {
            // Caso venha via multipart/form-data (multer)
            base64Image = req.file.buffer.toString('base64');
            mimeType = req.file.mimetype;
        } else if (req.body.image_base64) {
            // Caso venha via JSON (compatibilidade com frontend atual)
            const match = req.body.image_base64.match(/^data:(image\/\w+);base64,(.+)$/);
            if (match) {
                mimeType = match[1];
                base64Image = match[2];
            } else {
                base64Image = req.body.image_base64;
                mimeType = 'image/png'; // fallback
            }
        } else {
            return res.status(400).json({ error: 'Nenhuma imagem fornecida.' });
        }

        const prompt = "Transforme essa pessoa em um personagem da matrix, estilo Matrix (1999), casaco de couro preto, óculos de sol Neo, chuva de código verde ao fundo. Hiper-realista. Preserve os traços faciais da pessoa na foto original.";

        // Modelos da Nano Banana API
        const modelIds = [
            'nano-banana-pro-preview', 
            'gemini-3.1-flash-image-preview', 
            'imagen-3.0-generate-001',
            'gemini-2.5-flash-image'
        ];
        
        let lastError = null;

        for (const modelId of modelIds) {
            try {
                console.log(`Tentando modelo: ${modelId}...`);
                const model = genAI.getGenerativeModel({ model: modelId });

                const result = await model.generateContent([
                    {
                        inlineData: {
                            data: base64Image,
                            mimeType: mimeType
                        }
                    },
                    prompt
                ]);

                const response = await result.response;
                const candidate = response.candidates?.[0];
                
                if (candidate && candidate.content && candidate.content.parts) {
                    const imagePart = candidate.content.parts.find(p => p.inlineData);
                    if (imagePart) {
                        console.log(`SUCESSO com o modelo ${modelId}!`);
                        const finalBase64 = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
                        return res.json({ 
                            success: true, 
                            imageUrl: finalBase64,
                            imageBytes: imagePart.inlineData.data, 
                            mimeType: imagePart.inlineData.mimeType 
                        });
                    }
                }
                
                console.log(`Modelo ${modelId} respondeu, mas não retornou uma imagem.`);
                
            } catch (error) {
                console.log(`Falha no modelo ${modelId}: ${error.message}`);
                lastError = error;
            }
        }

        res.status(500).json({ 
            error: 'Nenhum dos modelos de imagem conseguiu processar a transformação.', 
            details: lastError ? lastError.message : 'Unknown error'
        });

    } catch (error) {
        console.error('Erro Catastrófico no Servidor:', error);
        res.status(500).json({ 
            error: 'Falha grave no processamento da imagem.', 
            details: error.message || String(error) 
        });
    }
});

const path = require('path');
app.use(express.static(path.join(__dirname, 'dist')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3333;
const server = app.listen(PORT, () => {
    console.log(`Servidor Matrix Rodando na porta ${PORT}`);
});

// Em caso de erro na porta
server.on('error', (e) => {
    console.error('Erro no servidor:', e);
});
