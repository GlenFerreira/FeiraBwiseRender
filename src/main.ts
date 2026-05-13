import './style.css'
// --- CONFIG ---
// O serviço de IA agora é processado no servidor local via nanobanana.

// --- TYPES & QUESTIONS ---
interface Question {
  id: number;
  text: string;
  image?: string;
  options: { text: string; points: number }[];
}

const questions: Question[] = [
  {
    id: 1,
    text: "Se hoje seu melhor vendedor saísse da empresa, quanto sua operação comercial sofreria?",
    image: "/pills.png",
    options: [
      { text: "Quase nada (Operação estruturada e independente)", points: 5 },
      { text: "Sofreria moderadamente (Há alguma dependência)", points: 3 },
      { text: "Grande impacto (Sente muito a ausência)", points: 2 },
      { text: "Seria um caos (Totalmente dependente)", points: 1 }
    ]
  },
  {
    id: 2,
    text: "Sua empresa sabe exatamente em qual etapa perde mais oportunidades comerciais?",
    options: [
      { text: "Sim, com clareza (Dados precisos sobre o funil)", points: 5 },
      { text: "Parcialmente (Algumas métricas incompletas)", points: 3 },
      { text: "Temos percepção (Intuição sem dados concretos)", points: 2 },
      { text: "Não sabemos (Operação no escuro)", points: 1 }
    ]
  },
  {
    id: 3,
    text: "Seu WhatsApp comercial funciona como ferramenta estratégica ou apenas canal de conversa?",
    options: [
      { text: "Estratégico e organizado", points: 5 },
      { text: "Parcialmente estruturado", points: 3 },
      { text: "Majoritariamente operacional", points: 2 },
      { text: "Totalmente desorganizado", points: 1 }
    ]
  },
  {
    id: 4,
    text: "Quantos leads ou clientes deixam de ser acompanhados por falta de processo?",
    options: [
      { text: "Quase nenhum", points: 5 },
      { text: "Alguns", points: 3 },
      { text: "Muitos", points: 2 },
      { text: "Não conseguimos medir", points: 1 }
    ]
  },
  {
    id: 5,
    text: "Sua empresa cresce por inteligência comercial previsível ou por esforço constante da equipe?",
    options: [
      { text: "Crescimento previsível", points: 5 },
      { text: "Misto", points: 3 },
      { text: "Muito dependente de esforço humano", points: 2 },
      { text: "Totalmente dependente de esforço", points: 1 }
    ]
  }
];

// --- STATE ---
let currentQuestionIndex = 0;
let totalScore = 0;
let stream: MediaStream | null = null;
let capturedImageData: string | null = null;
let transformedImageData: string | null = null;
let isProcessing = false;

// --- DOM ELEMENTS ---
const welcomeSection = document.getElementById('welcome')!;
const quizSection = document.getElementById('quiz')!;
const cameraSection = document.getElementById('camera-section')!;
const leadSection = document.getElementById('lead-capture')!;
const resultSection = document.getElementById('result')!;
const startBtn = document.getElementById('start-btn')!;
const submitLeadBtn = document.getElementById('submit-lead-btn')!;
const questionTitle = document.getElementById('question-title')!;
const optionsContainer = document.getElementById('options')!;
const progressFill = document.getElementById('progress-fill') as HTMLElement;
const resultLevel = document.getElementById('result-level')!;
const resultDesc = document.getElementById('result-desc')!;
const scoreDisplay = document.getElementById('score-display')!;

// --- CAMERA ELEMENTS ---
const webcamElement = document.getElementById('webcam') as HTMLVideoElement;
const photoCanvas = document.getElementById('photo-canvas') as HTMLCanvasElement;
const captureBtn = document.getElementById('capture-btn') as HTMLButtonElement;
const retryBtn = document.getElementById('retry-btn') as HTMLButtonElement;
const resultPhotoContainer = document.getElementById('result-photo-container')!;
// avatar-codename removed as it was part of the old AI analysis

// --- LEAD INPUTS ---
const leadName = document.getElementById('lead-name') as HTMLInputElement;
const leadCompany = document.getElementById('lead-company') as HTMLInputElement;
const leadPhone = document.getElementById('lead-phone') as HTMLInputElement;
const leadEmail = document.getElementById('lead-email') as HTMLInputElement;

// --- MATRIX RAIN EFFECT ---
const canvas = document.getElementById('canvas-matrix') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789$+-*/=%\"'#&_(),.;:?!\\|{}<>[]";
const fontSize = 16;
const columns = canvas.width / fontSize;
const drops: number[] = [];

for (let i = 0; i < columns; i++) {
  drops[i] = 1;
}

function drawMatrix() {
  ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#00ff41";
  ctx.font = fontSize + "px monospace";

  for (let i = 0; i < drops.length; i++) {
    const text = chars[Math.floor(Math.random() * chars.length)];
    ctx.fillText(text, i * fontSize, drops[i] * fontSize);

    if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
      drops[i] = 0;
    }
    drops[i]++;
  }
}

setInterval(drawMatrix, 33);

window.addEventListener('resize', () => {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
});

// --- CAMERA LOGIC ---
async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    webcamElement.srcObject = stream;
    cameraSection.classList.remove('hidden');
    quizSection.classList.add('hidden');
  } catch (err) {
    console.error("Erro ao acessar webcam:", err);
    alert("Não foi possível acessar a câmera. Pularemos para a próxima etapa.");
    showLeadCapture();
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(track => track.stop());
  }
}

function takePhoto() {
  if (isProcessing) return;
  
  const context = photoCanvas.getContext('2d')!;
  photoCanvas.width = webcamElement.videoWidth;
  photoCanvas.height = webcamElement.videoHeight;
  
  // Mirror the photo
  context.translate(photoCanvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(webcamElement, 0, 0, photoCanvas.width, photoCanvas.height);
  
  capturedImageData = photoCanvas.toDataURL('image/png');
  
  // Add a flash effect
  cameraSection.style.filter = "brightness(3)";
  setTimeout(() => cameraSection.style.filter = "none", 100);

  // Iniciar processamento imediatamente
  processAndProceed();
}

async function processAndProceed() {
  isProcessing = true;
  captureBtn.innerText = "Sincronizando com a Matrix...";
  captureBtn.disabled = true;

  // Pula para o lead imediatamente, sem esperar a IA
  stopCamera();
  showLeadCapture();

  try {
    // Processamento acontece em segundo plano enquanto o usuário preenche o lead
    if (capturedImageData) {
        const response = await fetch('/api/matrixify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image_base64: capturedImageData })
        });
        
        const data = await response.json();
        
        if (data.imageUrl) {
            transformedImageData = data.imageUrl;
            console.log("Sucesso! Imagem Matrix gerada pelo servidor.");
        } else {
            console.error("Erro no servidor:", data.error);
            transformedImageData = capturedImageData;
        }
    }
  } catch (err) {
    console.error("Erro no processamento:", err);
    transformedImageData = capturedImageData;
  } finally {
    isProcessing = false;
  }
}

// processImageWithAI removed, handled in processAndProceed via backend call

// matrixfyImage removed as effects are now handled on server side

function resetPhoto() {
  capturedImageData = null;
  transformedImageData = null;
  captureBtn.innerText = "Capturar Essência";
  captureBtn.disabled = false;
  captureBtn.onclick = takePhoto;
}

// --- QUIZ LOGIC ---
function startQuiz() {
  currentQuestionIndex = 0;
  totalScore = 0;
  welcomeSection.classList.add('hidden');
  quizSection.classList.remove('hidden');
  showQuestion();
}

function showQuestion() {
  const q = questions[currentQuestionIndex];
  
  // Inject image if exists
  const imageHtml = q.image ? `<img src="${q.image}" class="question-image" alt="Question illustration" />` : '';
  
  questionTitle.innerHTML = `${q.text}${imageHtml}`;
  optionsContainer.innerHTML = '';

  progressFill.style.width = `${((currentQuestionIndex) / questions.length) * 100}%`;

  q.options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'option-btn';
    btn.innerText = opt.text;
    btn.onclick = () => selectOption(opt.points);
    optionsContainer.appendChild(btn);
  });
}

function selectOption(points: number) {
  totalScore += points;
  currentQuestionIndex++;

  if (currentQuestionIndex < questions.length) {
    showQuestion();
  } else {
    startCamera();
  }
}

function showLeadCapture() {
  cameraSection.classList.add('hidden');
  leadSection.classList.remove('hidden');
}

function showResult() {
  if (!leadName.value || !leadEmail.value || !leadCompany.value) {
    alert("Por favor, preencha os campos obrigatórios.");
    return;
  }

  const leadData = {
    nome: leadName.value,
    empresa: leadCompany.value,
    telefone: leadPhone.value,
    email: leadEmail.value,
    score: totalScore,
    image: transformedImageData || capturedImageData
  };

  console.log("Lead captured:", leadData);

  leadSection.classList.add('hidden');
  resultSection.classList.remove('hidden');

  scoreDisplay.innerText = `${totalScore}/25`;

  console.log("ShowResult: transformedImageData exists?", !!transformedImageData);
  
  const displayFinalImage = () => {
    const imgToDisplay = transformedImageData || capturedImageData;
    if (imgToDisplay) {
      console.log("Exibindo imagem final. Transformada?", !!transformedImageData);
      resultPhotoContainer.innerHTML = `<img src="${imgToDisplay}" alt="Digital Avatar" />`;
    }
  };

  if (!transformedImageData && isProcessing) {
    console.log("Imagem ainda processando, aguardando...");
    // O loader já está no HTML por padrão. Vamos esperar.
    const checkInterval = setInterval(() => {
      if (!isProcessing || transformedImageData) {
        clearInterval(checkInterval);
        displayFinalImage();
      }
    }, 500);
  } else {
    displayFinalImage();
  }

  if (totalScore <= 10) {
    resultLevel.innerText = "Nível: Inércia Comercial";
    resultDesc.innerText = "Sua operação comercial está presa na simulação. Dependência excessiva de talentos individuais e falta de processos estruturados tornam o crescimento imprevisível e arriscado.";
  } else if (totalScore <= 20) {
    resultLevel.innerText = "Nível: Transição Comercial";
    resultDesc.innerText = "Você começou a despertar. Já existem processos e alguma visibilidade, mas a operação ainda patina em tarefas manuais e falta de integração. A pílula vermelha foi tomada.";
  } else {
    resultLevel.innerText = "Nível: Vanguarda Comercial (O Escolhido)";
    resultDesc.innerText = "Você domina a Matrix das vendas. Com processos automatizados, dados precisos e independência de pessoas-chave, sua empresa tem um motor de crescimento previsível e escalável.";
  }
}

// --- INITIALIZATION ---
startBtn.onclick = startQuiz;
captureBtn.onclick = takePhoto;
retryBtn.onclick = resetPhoto;
submitLeadBtn.onclick = showResult;

