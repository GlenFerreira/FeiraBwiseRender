import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);
const MODEL_NAME = "gemini-2.5-flash-image";

const v = document.getElementById('v') as HTMLVideoElement;
const c = document.getElementById('c') as HTMLCanvasElement;
const cap = document.getElementById('cap') as HTMLButtonElement;
const log = document.getElementById('log')!;
const resContainer = document.getElementById('result-container')!;

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%\"'#&_(),.;:?!\\|{}<>[]";

function print(msg: string) {
    console.log(msg);
    log.innerText += `\n[${new Date().toLocaleTimeString()}] ${msg}`;
    log.scrollTop = log.scrollHeight;
}

async function init() {
    try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        v.srcObject = s;
        print("Câmera iniciada.");
    } catch (e) {
        print("Erro Câmera: " + e);
    }
}

cap.onclick = async () => {
    print("Capturando...");
    const ctx = c.getContext('2d')!;
    c.width = v.videoWidth;
    c.height = v.videoHeight;
    ctx.drawImage(v, 0, 0);
    
    const base64 = c.toDataURL('image/png');
    print("Imagem capturada. Chamando Servidor Matrix...");

    try {
        const response = await fetch('/api/matrixify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64: base64 })
        });
        
        const data = await response.json();
        
        if (data.imageUrl) {
            print("Sucesso! Imagem gerada: " + data.imageUrl);
            resContainer.innerHTML = `<img src="${data.imageUrl}" style="max-width: 100%; border: 2px solid #00ff41;" />`;
        } else {
            print("Erro no Servidor: " + (data.error || 'Resposta desconhecida'));
            if (data.details) console.error('Detalhes do Erro:', data.details);
        }
    } catch (e) {
        print("Erro de Conexão: " + e);
        print("Certifique-se de que o servidor (node server.js) esteja rodando na porta 3000.");
    }
};

async function matrixfy(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;

    const tmp = document.createElement('canvas');
    tmp.width = w;
    tmp.height = h;
    tmp.getContext('2d')!.drawImage(canvas, 0, 0);

    ctx.clearRect(0, 0, w, h);
    
    // Filtro Matrix Hardcore
    ctx.save();
    ctx.filter = 'grayscale(1) brightness(0.7) contrast(2.5) sepia(1) hue-rotate(85deg) saturate(8)';
    ctx.drawImage(tmp, 0, 0);
    ctx.restore();

    // Codigo Matrix Caindo
    ctx.fillStyle = "#00ff41";
    ctx.font = "bold 15px monospace";
    for(let i=0; i<300; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.globalAlpha = Math.random() * 0.5;
        ctx.fillText(char, Math.random() * w, Math.random() * h);
    }
    
    // Scanlines
    ctx.globalAlpha = 1;
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    for(let i=0; i<h; i+=4) ctx.fillRect(0, i, w, 2);
}

init();
