const express = require('express');
const axios = require('axios');
const dotenv = require('dotenv');
const cors = require('cors');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const nodemailer = require('nodemailer');
const { createClient } = require('@supabase/supabase-js');

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

// Initialize Nodemailer Transporter (Gmail)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL,
        pass: process.env.APP_PASSWORD
    }
});

// Initialize Supabase (Admin mode using SERVICE_ROLE)
const supabaseUrl = process.env.DATABASE_URL ? process.env.DATABASE_URL.replace('/rest/v1/', '') : '';
const supabase = createClient(supabaseUrl, process.env.SERVICE_ROLE);

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

app.post('/api/send-email', async (req, res) => {
    const { nome, email, empresa, telefone, score, level, desc, image } = req.body;
    
    if (!email) {
        return res.status(400).json({ error: 'E-mail é obrigatório.' });
    }

    try {
        console.log(`Registrando lead no Supabase: ${email}...`);
        
        // 1. Criar usuário no Auth (Admin para evitar verificação forçada)
        const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: email,
            email_confirm: true,
            user_metadata: { nome, empresa, telefone }
        });

        if (authError && authError.status !== 422) { // 422 significa que o usuário já existe
            console.error('Erro ao criar Auth User:', authError);
        }

        // Recuperar o ID do usuário (seja do novo ou do existente)
        let userId = authUser?.user?.id;
        if (!userId) {
            const { data: existingUser } = await supabase.auth.admin.listUsers();
            userId = existingUser?.users?.find(u => u.email === email)?.id;
        }

        // 2. Upload da imagem para o Supabase Storage (Bucket)
        let finalImageUrl = image; // fallback para base64 se falhar
        if (image && image.startsWith('data:image') && userId) {
            try {
                console.log(`Fazendo upload da imagem para o Storage: ${userId}/avatar.png...`);
                
                // Converter Base64 para Buffer
                const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
                const buffer = Buffer.from(base64Data, 'base64');
                const contentType = image.match(/data:([^;]+);/)[1];

                const filePath = `${userId}/avatar.png`;
                const { error: uploadError } = await supabase.storage
                    .from('BWIDE_BUCKET')
                    .upload(filePath, buffer, {
                        contentType: contentType,
                        upsert: true
                    });

                if (uploadError) throw uploadError;

                // Obter a URL Pública
                const { data: publicUrlData } = supabase.storage
                    .from('BWIDE_BUCKET')
                    .getPublicUrl(filePath);
                
                finalImageUrl = publicUrlData.publicUrl;
                console.log('Upload concluído. URL Pública:', finalImageUrl);
            } catch (storageError) {
                console.error('Erro no Storage do Supabase:', storageError);
            }
        }

        // 3. Inserir na tabela contatos
        const { error: dbError } = await supabase
            .from('contatos')
            .upsert({ 
                nome, 
                email, 
                telefone, 
                empresa,
                score,
                user_id: userId
            }, { onConflict: 'email' });

        if (dbError) {
            console.error('Erro ao salvar na tabela contatos:', dbError);
        }

        console.log(`Enviando relatório Matrix premium para: ${email}...`);

        // Cores e estilos para máxima compatibilidade
        const bg = '#000000';
        const green = '#00ff41';
        const darkGreen = '#003300';
        const white = '#ffffff';

        const htmlContent = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Fira+Code:wght@300;400;500&family=Inter:wght@300;400;600&display=swap');
            </style>
        </head>
        <body style="background-color: ${bg}; color: ${green}; font-family: 'Inter', sans-serif; margin: 0; padding: 40px 20px;">
            <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; border: 2px solid ${green}; background-color: ${bg};">
                <tr>
                    <td style="padding: 30px; text-align: center; border-bottom: 1px solid ${green};">
                        <h1 style="color: ${green}; font-family: 'Fira Code', monospace; font-size: 28px; font-weight: bold; text-transform: uppercase; letter-spacing: 5px; margin: 0;">
                            RELATÓRIO DE SINCRONIZAÇÃO
                        </h1>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 30px;">
                        <p style="font-size: 16px; margin-bottom: 20px;">Saudações, <strong style="color: ${white};">${nome || 'Neo'}</strong>.</p>
                        
                        <p style="font-size: 14px; line-height: 1.5; margin-bottom: 25px;">
                            A Matrix revelou a verdade sobre a <strong style="color: ${white};">${empresa || 'sua organização'}</strong>. 
                            Seus sistemas comerciais foram analisados e sua frequência neural foi mapeada com sucesso.
                        </p>

                        <table width="100%" style="margin: 30px 0; border: 1px dashed ${green}; background-color: ${darkGreen};">
                            <tr>
                                <td style="padding: 20px; text-align: center;">
                                    <div style="font-size: 12px; font-family: 'Fira Code', monospace; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 10px;">Score de Maturidade</div>
                                    <div style="font-size: 56px; font-family: 'Fira Code', monospace; font-weight: bold; color: ${green};">${score || '0'}/25</div>
                                </td>
                            </tr>
                        </table>

                        <div style="text-align: center; margin-bottom: 20px;">
                            <h2 style="color: ${white}; font-family: 'Fira Code', monospace; font-size: 20px; text-transform: uppercase; margin-bottom: 10px;">${level || 'Nível não identificado'}</h2>
                            <p style="font-size: 14px; line-height: 1.6; color: ${green}; text-align: justify; border-left: 3px solid ${green}; padding-left: 15px;">
                                ${desc || 'Não foi possível recuperar os dados da simulação.'}
                            </p>
                        </div>

                ${finalImageUrl ? `
                <div style="text-align: center; margin-top: 40px; margin-bottom: 20px;">
                    <p style="font-size: 12px; margin-bottom: 15px; color: ${white};">Sua Projeção Digital:</p>
                    <img src="${finalImageUrl}" alt="Matrix Avatar" width="300" style="border: 2px solid ${green}; display: block; margin: 0 auto; max-width: 100%; aspect-ratio: 9/16; object-fit: cover; border-radius: 4px;" />
                </div>` : ''}
                    </td>
                </tr>
                <tr>
                    <td style="padding: 20px; text-align: center; border-top: 1px solid ${green}; background-color: ${darkGreen};">
                        <p style="font-size: 10px; font-family: 'Fira Code', monospace; color: ${green}; margin: 0; line-height: 1.4;">
                            ESTE É UM DOCUMENTO ENCRIPTADO DA BWISE MATRIX.<br>
                            DESPERTE. O MUNDO É UMA SIMULAÇÃO.
                        </p>
                    </td>
                </tr>
            </table>
        </body>
        </html>
        `;
        
        const mailOptions = {
            from: `"Matrix Bwise" <${process.env.EMAIL}>`,
            to: email,
            subject: `[MATRIX] Relatório de Maturidade - ${nome}`,
            html: htmlContent,
        };

        const info = await transporter.sendMail(mailOptions);

        console.log('E-mail estético enviado com sucesso via Gmail:', info.messageId);
        res.json({ success: true, messageId: info.messageId });
    } catch (err) {
        console.error('Erro interno no envio de e-mail (Nodemailer):', err);
        res.status(500).json({ error: 'Erro interno no servidor', details: err.message });
    }
});

const path = require('path');
app.use(express.static(path.join(__dirname, 'dist')));

app.use((req, res, next) => {
    if (req.method === 'GET') {
        res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    } else {
        next();
    }
});

const PORT = process.env.PORT || 3333;
const server = app.listen(PORT, () => {
    console.log(`Servidor Matrix Rodando na porta ${PORT}`);
});

// Em caso de erro na porta
server.on('error', (e) => {
    console.error('Erro no servidor:', e);
});
