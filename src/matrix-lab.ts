import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const genAI = new GoogleGenerativeAI(API_KEY);
const MODEL_NAME = "gemini-2.5-flash-image";

const v = document.getElementById('v') as HTMLVideoElement;
const cap = document.getElementById('cap') as HTMLButtonElement;
const log = document.getElementById('log')!;
const aiStatus = document.getElementById('ai-status')!;
const aiResponse = document.getElementById('ai-response')!;
const resContainer = document.getElementById('res')!;
const resName = document.getElementById('res-name')!;

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%\"'#&_(),.;:?!\\|{}<>[]";

function print(msg: string) {
    console.log(msg);
    log.innerHTML += `<div>[${new Date().toLocaleTimeString()}] ${msg}</div>`;
    log.scrollTop = log.scrollHeight;
}

async function init() {
    try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        v.srcObject = s;
        print("Câmera acessada com sucesso.");
    } catch (e) {
        print("ERRO Câmera: " + e);
        aiStatus.innerText = "Falha no hardware de vídeo.";
    }
}

cap.onclick = async () => {
    cap.disabled = true;
    aiStatus.innerText = "Transformando...";
    print("Iniciando captura...");

    const canvas = document.createElement('canvas');
    canvas.width = v.videoWidth;
    canvas.height = v.videoHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(v, 0, 0);
    
    const base64 = canvas.toDataURL('image/png');
    print("Imagem capturada (Base64 gerado).");

    try {
        print("Solicitando transformação ao servidor local...");
        const response = await fetch('/api/matrixify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64: base64 })
        });
        
        const data = await response.json();
        
        if (data.imageUrl) {
            print("Sucesso! Imagem Matrix gerada.");
            resContainer.innerHTML = `<img src="${data.imageUrl}" alt="Avatar Matrix" />`;
            aiStatus.innerText = "Sincronização Completa!";
        } else {
            print("ERRO no servidor: " + (data.error || 'Sem dados'));
            aiStatus.innerText = "Falha no Protocolo.";
        }
    } catch (e) {
        print("ERRO de Conexão: " + e);
        aiStatus.innerText = "Servidor Offline.";
    } finally {
        cap.disabled = false;
    }
};

async function applyMatrixEffects(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width;
    const h = canvas.height;

    // Criar cópia para filtros
    const copy = document.createElement('canvas');
    copy.width = w;
    copy.height = h;
    copy.getContext('2d')!.drawImage(canvas, 0, 0);

    ctx.clearRect(0, 0, w, h);
    
    // 1. Efeito Verde Matrix Monocromático Drástico
    ctx.save();
    // Filtro de alto contraste + verde
    ctx.filter = 'grayscale(1) brightness(0.9) contrast(3) sepia(1) hue-rotate(90deg) saturate(10)';
    ctx.drawImage(copy, 0, 0);
    ctx.restore();

    // 2. Chuva de caracteres Matrix sobre o rosto
    ctx.fillStyle = "#00ff41";
    ctx.font = "bold 14px monospace";
    for(let i=0; i<400; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.globalAlpha = Math.random() * 0.4;
        ctx.fillText(char, Math.random() * w, Math.random() * h);
    }
    
    // 3. Scanlines de vídeo antigo
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = "#000";
    for(let i=0; i<h; i+=3) {
        ctx.fillRect(0, i, w, 1);
    }
    
    // 4. Vinheta escura
    const grad = ctx.createRadialGradient(w/2, h/2, 0, w/2, h/2, w/1.2);
    grad.addColorStop(0, "transparent");
    grad.addColorStop(1, "rgba(0,0,0,0.8)");
    ctx.fillStyle = grad;
    ctx.globalAlpha = 1;
    ctx.fillRect(0,0,w,h);
}

init();
