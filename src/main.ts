import './style.css'
// --- CONFIG ---
// O serviço de IA agora é processado no servidor local via nanobanana.

// --- TYPES & QUESTIONS ---
interface Question {
  id: number;
  text: string;
  options: { text: string; points: number }[];
}

const questions: Question[] = [
  {
    id: 1,
    text: "A tecnologia é vista como custo ou motor estratégico?",
    options: [
      { text: "Custo operacional (necessário, mas evitamos gastar)", points: 1 },
      { text: "Suporte ao negócio (ajuda, mas não é o foco)", points: 3 },
      { text: "Motor estratégico (essencial para nossa competitividade)", points: 5 }
    ]
  },
  {
    id: 2,
    text: "Decisões são baseadas em dados ou intuição?",
    options: [
      { text: "Intuição/Feeling (dados são raros ou não confiáveis)", points: 1 },
      { text: "Híbrido (temos relatórios, mas o feeling ainda manda)", points: 3 },
      { text: "Data-Driven (dados orientam todas as grandes decisões)", points: 5 }
    ]
  },
  {
    id: 3,
    text: "Existe orçamento/processo claro para Novas Tecnologias (IA)?",
    options: [
      { text: "Não (investimos apenas quando algo quebra)", points: 1 },
      { text: "Reativo (investimos se a concorrência fizer)", points: 3 },
      { text: "Proativo (temos budget e P&D para inovação constante)", points: 5 }
    ]
  },
  {
    id: 4,
    text: "Cibersegurança é prioridade board-level ou tarefa de IT?",
    options: [
      { text: "Tarefa de IT (não discutimos isso no board)", points: 1 },
      { text: "Preocupação ocasional (falamos após incidentes)", points: 3 },
      { text: "Prioridade Estratégica (riscos são monitorados pelo C-level)", points: 5 }
    ]
  },
  {
    id: 5,
    text: "A cultura da empresa é adaptável a mudanças tech?",
    options: [
      { text: "Resistente (processos antigos são sagrados)", points: 1 },
      { text: "Em transição (alguns times aceitam, outros lutam contra)", points: 3 },
      { text: "Agile/Digital (mudança faz parte do nosso DNA)", points: 5 }
    ]
  },
  {
    id: 6,
    text: "Utilizamos Cloud/Modern stack ou legados locais?",
    options: [
      { text: "Legados locais (servidões físicos e sistemas fechados)", points: 1 },
      { text: "Híbrido (algumas coisas em cloud, muita dívida técnica)", points: 3 },
      { text: "Cloud Native (infra escalável e ferramentas modernas)", points: 5 }
    ]
  },
  {
    id: 7,
    text: "Atraímos talentos de ponta ou temos dificuldade?",
    options: [
      { text: "Dificuldade alta (bons talentos não veem valor aqui)", points: 1 },
      { text: "Razoável (conseguimos contratar, mas perdemos rápido)", points: 3 },
      { text: "Ímã de Talentos (profissionais buscam trabalhar conosco)", points: 5 }
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
  welcomeSection.classList.add('hidden');
  quizSection.classList.remove('hidden');
  showQuestion();
}

function showQuestion() {
  const q = questions[currentQuestionIndex];
  questionTitle.innerText = q.text;
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

  scoreDisplay.innerText = `${totalScore}/35`;

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

  if (totalScore <= 14) {
    resultLevel.innerText = "Nível: Inércia Digital";
    resultDesc.innerText = "Você está preso na Matrix. Sua empresa opera em modelos legados e vê a tecnologia apenas como custo. O risco de obsolescência é crítico.";
  } else if (totalScore <= 28) {
    resultLevel.innerText = "Nível: Transição Digital";
    resultDesc.innerText = "Você está começando a despertar. Existem iniciativas isoladas, mas falta uma visão estratégica unificada. A pílula vermelha foi tomada, mas o caminho é longo.";
  } else {
    resultLevel.innerText = "Nível: Vanguarda Digital (O Escolhido)";
    resultDesc.innerText = "Você domina a Matrix. A tecnologia é o núcleo do seu negócio, decisões são baseadas em dados e a inovação é constante. Você dita as regras do mercado.";
  }
}

// --- INITIALIZATION ---
startBtn.onclick = startQuiz;
captureBtn.onclick = takePhoto;
retryBtn.onclick = resetPhoto;
submitLeadBtn.onclick = showResult;

