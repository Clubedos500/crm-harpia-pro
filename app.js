// Variáveis globais para armazenar dados do usuário
let userData = {
    exercises: {
        batna: { status: 'not-started', timeSpent: 0, lastActivity: null },
        meso: { status: 'not-started', timeSpent: 0, lastActivity: null },
        concessoes: { status: 'not-started', timeSpent: 0, lastActivity: null },
        spin: { status: 'not-started', timeSpent: 0, lastActivity: null },
        ancora: { status: 'not-started', timeSpent: 0, lastActivity: null },
        email: { status: 'not-started', timeSpent: 0, lastActivity: null },
        gravacao: { status: 'not-started', timeSpent: 0, lastActivity: null },
        taticas: { status: 'not-started', timeSpent: 0, lastActivity: null },
        framing: { status: 'not-started', timeSpent: 0, lastActivity: null },
        pos: { status: 'not-started', timeSpent: 0, lastActivity: null }
    },
    trainingDays: {
        1: { status: 'not-started', timeSpent: 0, lastActivity: null },
        2: { status: 'not-started', timeSpent: 0, lastActivity: null },
        3: { status: 'not-started', timeSpent: 0, lastActivity: null },
        4: { status: 'not-started', timeSpent: 0, lastActivity: null },
        5: { status: 'not-started', timeSpent: 0, lastActivity: null },
        6: { status: 'not-started', timeSpent: 0, lastActivity: null },
        7: { status: 'not-started', timeSpent: 0, lastActivity: null },
        8: { status: 'not-started', timeSpent: 0, lastActivity: null },
        9: { status: 'not-started', timeSpent: 0, lastActivity: null },
        10: { status: 'not-started', timeSpent: 0, lastActivity: null },
        11: { status: 'not-started', timeSpent: 0, lastActivity: null },
        12: { status: 'not-started', timeSpent: 0, lastActivity: null },
        13: { status: 'not-started', timeSpent: 0, lastActivity: null },
        14: { status: 'not-started', timeSpent: 0, lastActivity: null }
    },
    activityHistory: [],
    totalTimeSpent: 0
};

// Temporizadores e variáveis de controle
let exerciseTimer;
let timerInterval;
let currentExercise = null;
let currentDay = null;
let timerRunning = false;

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', async () => {
    // Verificar se o usuário está autenticado
    const storageInit = await Storage.init();
    
    if (!storageInit.authenticated) {
        // Mostrar seção de autenticação
        document.getElementById('auth-section').classList.remove('hidden');
        document.querySelector('header').classList.add('hidden');
        document.querySelector('nav').classList.add('hidden');
        document.querySelector('main').classList.add('hidden');
        
        // Configurar manipuladores de eventos para autenticação
        setupAuthEventListeners();
    } else {
        // Esconder seção de autenticação
        document.getElementById('auth-section').classList.add('hidden');
        document.querySelector('header').classList.remove('hidden');
        document.querySelector('nav').classList.remove('hidden');
        document.querySelector('main').classList.remove('hidden');
        
        // Carregar dados do usuário do armazenamento local, se disponível
        loadUserData();
        
        // Atualizar a interface com os dados do usuário
        updateUI();
        
        // Configurar os manipuladores de eventos
        setupEventListeners();
        
        // Mostrar a seção inicial (dashboard)
        showSection('dashboard');
    }
});

// Função para carregar dados do usuário do armazenamento local
function loadUserData() {
    const savedData = localStorage.getItem('negotiationTrainingData');
    if (savedData) {
        try {
            userData = JSON.parse(savedData);
        } catch (error) {
            console.error('Erro ao carregar dados do usuário:', error);
        }
    }
}

// Função para salvar dados do usuário no armazenamento local
function saveUserData() {
    try {
        localStorage.setItem('negotiationTrainingData', JSON.stringify(userData));
    } catch (error) {
        console.error('Erro ao salvar dados do usuário:', error);
    }
}

// Função para atualizar a interface do usuário com os dados atuais
function updateUI() {
    updateDashboard();
    updateExercisesSection();
    updateTrainingSection();
    updateProgressSection();
}

// Função para atualizar o dashboard
function updateDashboard() {
    // Contar exercícios concluídos
    const completedExercises = Object.values(userData.exercises).filter(ex => ex.status === 'completed').length;
    document.getElementById('completedExercises').textContent = `${completedExercises}/10`;
    
    // Contar dias de treino concluídos
    const completedDays = Object.values(userData.trainingDays).filter(day => day.status === 'completed').length;
    document.getElementById('completedDays').textContent = `${completedDays}/14`;
    
    // Calcular tempo total
    const hours = Math.floor(userData.totalTimeSpent / 60);
    const minutes = userData.totalTimeSpent % 60;
    document.getElementById('totalTime').textContent = `${hours}h ${minutes}m`;
    
    // Atualizar barra de progresso geral
    const totalProgress = ((completedExercises + completedDays) / 24) * 100;
    document.getElementById('progressBar').style.width = `${totalProgress}%`;
    document.getElementById('userProgress').textContent = `Progresso: ${Math.round(totalProgress)}%`;
}

// Função para atualizar a seção de exercícios
function updateExercisesSection() {
    // Atualizar o status de cada exercício na interface
    Object.entries(userData.exercises).forEach(([exerciseId, exerciseData]) => {
        const exerciseCard = document.querySelector(`[onclick="openExercise('${exerciseId}')"]`).closest('.card-hover');
        const statusElement = exerciseCard.querySelector('.bg-gray-50 .text-sm.font-medium');
        
        if (statusElement) {
            if (exerciseData.status === 'completed') {
                statusElement.textContent = 'Concluído';
                statusElement.className = 'ml-2 text-sm font-medium text-green-500';
            } else if (exerciseData.status === 'in-progress') {
                statusElement.textContent = 'Em andamento';
                statusElement.className = 'ml-2 text-sm font-medium text-yellow-500';
            } else {
                statusElement.textContent = 'Não iniciado';
                statusElement.className = 'ml-2 text-sm font-medium text-red-500';
            }
        }
    });
}

// Função para atualizar a seção de plano de treino
function updateTrainingSection() {
    // Atualizar a barra de progresso do plano de treino
    const completedDays = Object.values(userData.trainingDays).filter(day => day.status === 'completed').length;
    const trainingProgress = (completedDays / 14) * 100;
    document.getElementById('trainingProgressBar').style.width = `${trainingProgress}%`;
    
    // Atualizar o status de cada dia na tabela
    const tableRows = document.querySelectorAll('#training table tbody tr');
    tableRows.forEach((row, index) => {
        const day = index + 1;
        const dayData = userData.trainingDays[day];
        const statusCell = row.querySelector('td:nth-child(4)');
        
        if (statusCell && dayData) {
            if (dayData.status === 'completed') {
                statusCell.textContent = 'Concluído';
                statusCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-green-500';
            } else if (dayData.status === 'in-progress') {
                statusCell.textContent = 'Em andamento';
                statusCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-yellow-500';
            } else {
                statusCell.textContent = 'Não iniciado';
                statusCell.className = 'px-6 py-4 whitespace-nowrap text-sm text-red-500';
            }
        }
    });
}

// Função para atualizar a seção de progresso
function updateProgressSection() {
    // Atualizar barras de progresso
    const completedExercises = Object.values(userData.exercises).filter(ex => ex.status === 'completed').length;
    const exercisesProgress = (completedExercises / 10) * 100;
    document.getElementById('exercisesProgressBar').style.width = `${exercisesProgress}%`;
    document.getElementById('exercisesProgressText').textContent = `${completedExercises}/10`;
    
    const completedDays = Object.values(userData.trainingDays).filter(day => day.status === 'completed').length;
    const daysProgress = (completedDays / 14) * 100;
    document.getElementById('daysProgressBar').style.width = `${daysProgress}%`;
    document.getElementById('daysProgressText').textContent = `${completedDays}/14`;
    
    // Calcular tempo total
    const hours = Math.floor(userData.totalTimeSpent / 60);
    const minutes = userData.totalTimeSpent % 60;
    document.getElementById('totalPracticeTime').textContent = `${hours}h ${minutes}m`;
    
    // Atualizar histórico de atividades
    const historyContainer = document.getElementById('activityHistory');
    historyContainer.innerHTML = '';
    
    if (userData.activityHistory.length === 0) {
        historyContainer.innerHTML = `
            <li class="py-3 flex justify-between">
                <div>
                    <p class="text-sm font-medium text-gray-800">Nenhuma atividade registrada</p>
                    <p class="text-xs text-gray-500">Comece seus exercícios para registrar atividades</p>
                </div>
            </li>
        `;
    } else {
        userData.activityHistory.slice(0, 10).forEach(activity => {
            const li = document.createElement('li');
            li.className = 'py-3 flex justify-between';
            li.innerHTML = `
                <div>
                    <p class="text-sm font-medium text-gray-800">${activity.title}</p>
                    <p class="text-xs text-gray-500">${activity.date}</p>
                </div>
                <span class="text-sm text-gray-500">${activity.duration} min</span>
            `;
            historyContainer.appendChild(li);
        });
    }
    
    // Atualizar tabela de desempenho por exercício
    const tableBody = document.querySelector('#progress table tbody');
    tableBody.innerHTML = '';
    
    Object.entries(userData.exercises).forEach(([exerciseId, exerciseData]) => {
        const exerciseName = getExerciseName(exerciseId);
        const row = document.createElement('tr');
        
        let statusText = 'Não iniciado';
        let statusClass = 'text-red-500';
        
        if (exerciseData.status === 'completed') {
            statusText = 'Concluído';
            statusClass = 'text-green-500';
        } else if (exerciseData.status === 'in-progress') {
            statusText = 'Em andamento';
            statusClass = 'text-yellow-500';
        }
        
        const timeSpent = exerciseData.timeSpent > 0 ? `${exerciseData.timeSpent} min` : '-';
        const lastActivity = exerciseData.lastActivity ? formatDate(new Date(exerciseData.lastActivity)) : '-';
        
        row.innerHTML = `
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${exerciseName}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm ${statusClass}">${statusText}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${timeSpent}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${lastActivity}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Verificar se o certificado deve ser exibido
    const allExercisesCompleted = Object.values(userData.exercises).every(ex => ex.status === 'completed');
    const allDaysCompleted = Object.values(userData.trainingDays).every(day => day.status === 'completed');
    
    if (allExercisesCompleted && allDaysCompleted) {
        document.getElementById('certificatePreview').classList.remove('hidden');
        document.getElementById('certificatePlaceholder').classList.add('hidden');
        document.getElementById('certificateDate').textContent = `Data de Conclusão: ${formatDate(new Date())}`;
    }
}

// Função para configurar os manipuladores de eventos de autenticação
function setupAuthEventListeners() {
    // Alternar entre formulários de login e registro
    document.getElementById('show-login-btn').addEventListener('click', () => {
        document.getElementById('auth-title').textContent = 'Entrar';
        document.getElementById('login-form').classList.remove('hidden');
        document.getElementById('register-form').classList.add('hidden');
        document.getElementById('show-login-btn').classList.add('bg-purple-600', 'text-white');
        document.getElementById('show-login-btn').classList.remove('bg-gray-200', 'text-gray-700');
        document.getElementById('show-register-btn').classList.add('bg-gray-200', 'text-gray-700');
        document.getElementById('show-register-btn').classList.remove('bg-purple-600', 'text-white');
    });
    
    document.getElementById('show-register-btn').addEventListener('click', () => {
        document.getElementById('auth-title').textContent = 'Cadastrar';
        document.getElementById('login-form').classList.add('hidden');
        document.getElementById('register-form').classList.remove('hidden');
        document.getElementById('show-login-btn').classList.add('bg-gray-200', 'text-gray-700');
        document.getElementById('show-login-btn').classList.remove('bg-purple-600', 'text-white');
        document.getElementById('show-register-btn').classList.add('bg-purple-600', 'text-white');
        document.getElementById('show-register-btn').classList.remove('bg-gray-200', 'text-gray-700');
    });
    
    // Manipular envio do formulário de login
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorElement = document.getElementById('login-error');
        
        try {
            errorElement.classList.add('hidden');
            const userData = await Storage.loginUser(email, password);
            
            // Recarregar a página após login bem-sucedido
            window.location.reload();
        } catch (error) {
            errorElement.textContent = error.message;
            errorElement.classList.remove('hidden');
        }
    });
    
    // Manipular envio do formulário de registro
    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('register-name').value;
        const email = document.getElementById('register-email').value;
        const password = document.getElementById('register-password').value;
        const confirmPassword = document.getElementById('register-confirm-password').value;
        const errorElement = document.getElementById('register-error');
        
        // Validar senha
        if (password.length < 6) {
            errorElement.textContent = 'A senha deve ter pelo menos 6 caracteres';
            errorElement.classList.remove('hidden');
            return;
        }
        
        // Verificar se as senhas coincidem
        if (password !== confirmPassword) {
            errorElement.textContent = 'As senhas não coincidem';
            errorElement.classList.remove('hidden');
            return;
        }
        
        try {
            errorElement.classList.add('hidden');
            const userData = await Storage.registerUser(name, email, password);
            
            // Recarregar a página após registro bem-sucedido
            window.location.reload();
        } catch (error) {
            errorElement.textContent = error.message;
            errorElement.classList.remove('hidden');
        }
    });
}

// Função para configurar os manipuladores de eventos
function setupEventListeners() {
    // Adicionar botão de logout no header
    const headerDiv = document.querySelector('header .flex.items-center.justify-between');
    const logoutButton = document.createElement('button');
    logoutButton.textContent = '🚪 Sair';
    logoutButton.className = 'bg-white text-purple-600 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors ml-4';
    logoutButton.addEventListener('click', async () => {
        try {
            await Storage.logoutUser();
            window.location.reload();
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
        }
    });
    headerDiv.appendChild(logoutButton);
    // Botões de navegação
    document.querySelectorAll('.nav-btn').forEach(button => {
        button.addEventListener('click', function() {
            const section = this.getAttribute('onclick').match(/showSection\('(.*?)'\)/)[1];
            showSection(section);
        });
    });
    
    // Botões do temporizador no dashboard
    document.getElementById('startTimer').addEventListener('click', toggleDashboardTimer);
    document.getElementById('resetTimer').addEventListener('click', resetDashboardTimer);
    
    // Botão de exportar relatório
    document.getElementById('exportReport').addEventListener('click', exportReport);
}

// Função para mostrar uma seção específica
function showSection(sectionId) {
    // Ocultar todas as seções
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
        section.classList.remove('active');
    });
    
    // Mostrar a seção selecionada
    const selectedSection = document.getElementById(sectionId);
    if (selectedSection) {
        selectedSection.classList.remove('hidden');
        selectedSection.classList.add('active');
    }
    
    // Atualizar botões de navegação
    document.querySelectorAll('.nav-btn').forEach(button => {
        button.classList.remove('active');
        const buttonSection = button.getAttribute('onclick').match(/showSection\('(.*?)'\)/)[1];
        if (buttonSection === sectionId) {
            button.classList.add('active');
        }
    });
}

// Função para abrir um exercício específico
function openExercise(exerciseId) {
    currentExercise = exerciseId;
    const exerciseName = getExerciseName(exerciseId);
    
    // Atualizar o título do modal
    document.getElementById('modalTitle').textContent = exerciseName;
    
    // Carregar o conteúdo do exercício
    const modalContent = document.getElementById('modalContent');
    modalContent.innerHTML = getExerciseContent(exerciseId);
    
    // Configurar o temporizador
    const exerciseDuration = getExerciseDuration(exerciseId);
    resetExerciseTimer(exerciseDuration);
    
    // Atualizar o status do exercício
    if (userData.exercises[exerciseId].status === 'not-started') {
        userData.exercises[exerciseId].status = 'in-progress';
        userData.exercises[exerciseId].lastActivity = new Date().toISOString();
        saveUserData();
        updateUI();
    }
    
    // Mostrar o modal
    document.getElementById('exerciseModal').classList.remove('hidden');
    document.getElementById('exerciseModal').classList.add('modal-enter');
}

// Função para fechar o modal de exercício
function closeExerciseModal() {
    // Parar o temporizador
    clearInterval(timerInterval);
    timerRunning = false;
    
    // Animar a saída do modal
    document.getElementById('exerciseModal').classList.add('modal-leave');
    
    // Ocultar o modal após a animação
    setTimeout(() => {
        document.getElementById('exerciseModal').classList.remove('modal-enter', 'modal-leave');
        document.getElementById('exerciseModal').classList.add('hidden');
        currentExercise = null;
    }, 300);
}

// Função para concluir um exercício
function completeExercise() {
    if (currentExercise) {
        // Parar o temporizador
        clearInterval(timerInterval);
        timerRunning = false;
        
        // Calcular o tempo gasto
        const exerciseDuration = getExerciseDuration(currentExercise);
        const timeSpent = Math.round((exerciseDuration - exerciseTimer) / 60);
        
        // Atualizar os dados do usuário
        userData.exercises[currentExercise].status = 'completed';
        userData.exercises[currentExercise].timeSpent += timeSpent;
        userData.exercises[currentExercise].lastActivity = new Date().toISOString();
        userData.totalTimeSpent += timeSpent;
        
        // Adicionar ao histórico de atividades
        userData.activityHistory.unshift({
            title: `Concluiu: ${getExerciseName(currentExercise)}`,
            date: formatDate(new Date()),
            duration: timeSpent
        });
        
        // Salvar os dados e atualizar a interface
        saveUserData();
        updateUI();
        
        // Fechar o modal
        closeExerciseModal();
        
        // Mostrar mensagem de sucesso
        alert('Exercício concluído com sucesso!');
    }
}

// Função para iniciar um dia de treinamento
function startDayTraining(day) {
    currentDay = day;
    const exerciseId = getDayExercise(day);
    
    if (exerciseId) {
        // Atualizar o status do dia
        userData.trainingDays[day].status = 'in-progress';
        userData.trainingDays[day].lastActivity = new Date().toISOString();
        saveUserData();
        updateUI();
        
        // Abrir o exercício correspondente
        openExercise(exerciseId);
    }
}

// Função para obter o exercício correspondente a um dia de treinamento
function getDayExercise(day) {
    const exerciseMap = {
        1: 'batna',
        2: 'meso',
        3: 'concessoes',
        4: 'spin',
        5: 'spin',
        6: 'spin',
        7: 'spin',
        8: 'ancora',
        9: 'email',
        10: 'gravacao',
        11: 'gravacao',
        12: 'taticas',
        13: 'framing',
        14: 'pos'
    };
    
    return exerciseMap[day] || null;
}

// Função para alternar o temporizador no dashboard
function toggleDashboardTimer() {
    const startButton = document.getElementById('startTimer');
    const timerCircle = document.getElementById('timerCircle');
    
    if (timerRunning) {
        // Parar o temporizador
        clearInterval(timerInterval);
        timerRunning = false;
        startButton.textContent = 'Iniciar';
    } else {
        // Iniciar o temporizador
        timerRunning = true;
        startButton.textContent = 'Pausar';
        
        // Configurar o temporizador para 30 minutos
        let timeLeft = 30 * 60; // 30 minutos em segundos
        updateTimerDisplay(timeLeft);
        
        // Atualizar o círculo do temporizador
        timerCircle.style.strokeDashoffset = '0';
        
        timerInterval = setInterval(() => {
            timeLeft--;
            updateTimerDisplay(timeLeft);
            
            // Atualizar o círculo do temporizador
            const progress = 1 - (timeLeft / (30 * 60));
            timerCircle.style.strokeDashoffset = 283 * progress;
            
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerRunning = false;
                startButton.textContent = 'Iniciar';
                alert('Tempo esgotado!');
            }
        }, 1000);
    }
}

// Função para reiniciar o temporizador no dashboard
function resetDashboardTimer() {
    // Parar o temporizador atual
    clearInterval(timerInterval);
    timerRunning = false;
    document.getElementById('startTimer').textContent = 'Iniciar';
    
    // Reiniciar o display do temporizador
    updateTimerDisplay(30 * 60); // 30 minutos em segundos
    
    // Reiniciar o círculo do temporizador
    document.getElementById('timerCircle').style.strokeDashoffset = '283';
}

// Função para atualizar o display do temporizador
function updateTimerDisplay(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    document.getElementById('timerDisplay').textContent = `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Função para reiniciar o temporizador de exercício
function resetExerciseTimer(duration) {
    // Parar o temporizador atual
    clearInterval(timerInterval);
    timerRunning = false;
    
    // Configurar o novo temporizador
    exerciseTimer = duration;
    updateExerciseTimerDisplay();
    
    // Iniciar o temporizador automaticamente
    timerRunning = true;
    timerInterval = setInterval(() => {
        exerciseTimer--;
        updateExerciseTimerDisplay();
        
        if (exerciseTimer <= 0) {
            clearInterval(timerInterval);
            timerRunning = false;
            alert('Tempo esgotado! Você pode concluir o exercício agora.');
        }
    }, 1000);
}

// Função para atualizar o display do temporizador de exercício
function updateExerciseTimerDisplay() {
    const minutes = Math.floor(exerciseTimer / 60);
    const seconds = exerciseTimer % 60;
    document.getElementById('exerciseTimer').textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Função para exportar o relatório de progresso
function exportReport() {
    // Verificar se a biblioteca jsPDF está disponível
    if (typeof window.jspdf === 'undefined') {
        alert('A biblioteca jsPDF não está disponível. Não é possível gerar o relatório.');
        return;
    }
    
    // Criar um novo documento PDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Adicionar título
    doc.setFontSize(20);
    doc.text('Relatório de Progresso - Treinamento em Negociação', 20, 20);
    
    // Adicionar data
    doc.setFontSize(12);
    doc.text(`Data: ${formatDate(new Date())}`, 20, 30);
    
    // Adicionar resumo
    doc.setFontSize(16);
    doc.text('Resumo de Progresso', 20, 45);
    
    doc.setFontSize(12);
    const completedExercises = Object.values(userData.exercises).filter(ex => ex.status === 'completed').length;
    const completedDays = Object.values(userData.trainingDays).filter(day => day.status === 'completed').length;
    const hours = Math.floor(userData.totalTimeSpent / 60);
    const minutes = userData.totalTimeSpent % 60;
    
    doc.text(`Exercícios Concluídos: ${completedExercises}/10`, 20, 55);
    doc.text(`Dias de Treino Concluídos: ${completedDays}/14`, 20, 65);
    doc.text(`Tempo Total de Prática: ${hours}h ${minutes}m`, 20, 75);
    
    // Adicionar detalhes dos exercícios
    doc.setFontSize(16);
    doc.text('Detalhes dos Exercícios', 20, 90);
    
    doc.setFontSize(12);
    let yPos = 100;
    
    Object.entries(userData.exercises).forEach(([exerciseId, exerciseData]) => {
        const exerciseName = getExerciseName(exerciseId);
        let statusText = 'Não iniciado';
        
        if (exerciseData.status === 'completed') {
            statusText = 'Concluído';
        } else if (exerciseData.status === 'in-progress') {
            statusText = 'Em andamento';
        }
        
        const timeSpent = exerciseData.timeSpent > 0 ? `${exerciseData.timeSpent} min` : '-';
        
        doc.text(`${exerciseName}: ${statusText} (${timeSpent})`, 20, yPos);
        yPos += 10;
        
        // Verificar se é necessário adicionar uma nova página
        if (yPos > 270) {
            doc.addPage();
            yPos = 20;
        }
    });
    
    // Salvar o PDF
    doc.save('relatorio-treinamento-negociacao.pdf');
}

// Função para obter o nome de um exercício pelo ID
function getExerciseName(exerciseId) {
    const exerciseNames = {
        batna: 'Mapa BATNA',
        meso: 'MESO - Pacotes Equivalentes',
        concessoes: 'Concessões Estratégicas',
        spin: 'Role-play SPIN',
        ancora: 'Defesa de Âncora Extrema',
        email: 'E-mail de Síntese',
        gravacao: 'Gravação de Aberturas',
        taticas: 'Log de Táticas',
        framing: 'Framing',
        pos: 'Pós-Negociação'
    };
    
    return exerciseNames[exerciseId] || 'Exercício Desconhecido';
}

// Função para obter a duração de um exercício em segundos
function getExerciseDuration(exerciseId) {
    const exerciseDurations = {
        batna: 30 * 60, // 30 minutos
        meso: 45 * 60, // 45 minutos
        concessoes: 30 * 60, // 30 minutos
        spin: 45 * 60, // 45 minutos
        ancora: 30 * 60, // 30 minutos
        email: 30 * 60, // 30 minutos
        gravacao: 45 * 60, // 45 minutos
        taticas: 30 * 60, // 30 minutos
        framing: 30 * 60, // 30 minutos
        pos: 30 * 60 // 30 minutos
    };
    
    return exerciseDurations[exerciseId] || 30 * 60; // Padrão: 30 minutos
}

// Função para formatar uma data
function formatDate(date) {
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

// Função para obter o conteúdo HTML de um exercício específico
function getExerciseContent(exerciseId) {
    switch (exerciseId) {
        case 'batna':
            return `
                <div class="mb-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">Mapa BATNA</h3>
                    <p class="text-gray-600 mb-4">Registre sua BATNA (Melhor Alternativa à Negociação de um Acordo), a da contraparte e estratégias para fortalecer sua posição.</p>
                </div>
                
                <div class="batna-map">
                    <div class="form-group">
                        <label class="form-label">Minha BATNA</label>
                        <textarea class="form-input form-textarea" placeholder="Descreva sua melhor alternativa caso a negociação falhe..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">BATNA da Contraparte</label>
                        <textarea class="form-input form-textarea" placeholder="Qual você acredita ser a melhor alternativa da contraparte..."></textarea>
                    </div>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Estratégias para Fortalecer Minha Posição</label>
                    <div class="space-y-3">
                        <div>
                            <label class="text-sm text-gray-600">Estratégia 1</label>
                            <input type="text" class="form-input" placeholder="Descreva uma estratégia...">
                        </div>
                        <div>
                            <label class="text-sm text-gray-600">Estratégia 2</label>
                            <input type="text" class="form-input" placeholder="Descreva uma estratégia...">
                        </div>
                        <div>
                            <label class="text-sm text-gray-600">Estratégia 3</label>
                            <input type="text" class="form-input" placeholder="Descreva uma estratégia...">
                        </div>
                    </div>
                </div>
            `;
            
        case 'meso':
            return `
                <div class="mb-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">MESO - Pacotes Equivalentes</h3>
                    <p class="text-gray-600 mb-4">Crie 3 pacotes de proposta equivalentes para apresentar à contraparte. Cada pacote deve ter o mesmo valor para você, mas diferentes combinações de elementos.</p>
                </div>
                
                <div class="meso-packages">
                    <div class="bg-white rounded-lg border border-gray-200 p-4">
                        <h4 class="font-semibold text-purple-600 mb-2">Pacote A</h4>
                        <div class="space-y-3">
                            <div class="form-group">
                                <label class="text-sm text-gray-600">Elemento 1</label>
                                <input type="text" class="form-input" placeholder="Descreva...">
                            </div>
                            <div class="form-group">
                                <label class="text-sm text-gray-600">Elemento 2</label>
                                <input type="text" class="form-input" placeholder="Descreva...">
                            </div>
                            <div class="form-group">
                                <label class="text-sm text-gray-600">Elemento 3</label>
                                <input type="text" class="form-input" placeholder="Descreva...">
                            </div>
                            <div class="form-group">
                                <label class="text-sm text-gray-600">Valor para mim</label>
                                <select class="form-input">
                                    <option>Alto</option>
                                    <option>Médio</option>
                                    <option>Baixo</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-lg border border-gray-200 p-4">
                        <h4 class="font-semibold text-purple-600 mb-2">Pacote B</h4>
                        <div class="space-y-3">
                            <div class="form-group">
                                <label class="text-sm text-gray-600">Elemento 1</label>
                                <input type="text" class="form-input" placeholder="Descreva...">
                            </div>
                            <div class="form-group">
                                <label class="text-sm text-gray-600">Elemento 2</label>
                                <input type="text" class="form-input" placeholder="Descreva...">
                            </div>
                            <div class="form-group">
                                <label class="text-sm text-gray-600">Elemento 3</label>
                                <input type="text" class="form-input" placeholder="Descreva...">
                            </div>
                            <div class="form-group">
                                <label class="text-sm text-gray-600">Valor para mim</label>
                                <select class="form-input">
                                    <option>Alto</option>
                                    <option>Médio</option>
                                    <option>Baixo</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-lg border border-gray-200 p-4">
                        <h4 class="font-semibold text-purple-600 mb-2">Pacote C</h4>
                        <div class="space-y-3">
                            <div class="form-group">
                                <label class="text-sm text-gray-600">Elemento 1</label>
                                <input type="text" class="form-input" placeholder="Descreva...">
                            </div>
                            <div class="form-group">
                                <label class="text-sm text-gray-600">Elemento 2</label>
                                <input type="text" class="form-input" placeholder="Descreva...">
                            </div>
                            <div class="form-group">
                                <label class="text-sm text-gray-600">Elemento 3</label>
                                <input type="text" class="form-input" placeholder="Descreva...">
                            </div>
                            <div class="form-group">
                                <label class="text-sm text-gray-600">Valor para mim</label>
                                <select class="form-input">
                                    <option>Alto</option>
                                    <option>Médio</option>
                                    <option>Baixo</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
        case 'concessoes':
            return `
                <div class="mb-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">Concessões Estratégicas</h3>
                    <p class="text-gray-600 mb-4">Identifique concessões estratégicas baseadas em custo-benefício para ambas as partes.</p>
                </div>
                
                <div class="concession-matrix">
                    <div class="bg-white rounded-lg border border-gray-200 p-4">
                        <h4 class="font-semibold text-purple-600 mb-2">Baixo Custo para Mim / Alto Valor para Eles</h4>
                        <p class="text-sm text-gray-600 mb-3">Estas são as concessões ideais para oferecer primeiro.</p>
                        <div class="space-y-3">
                            <div class="form-group">
                                <label class="text-sm text-gray-600">Concessão 1</label>
                                <input type="text" class="form-input" placeholder="Descreva...">
                            </div>
                            <div class="form-group">
                                <label class="text-sm text-gray-600">Concessão 2</label>
                                <input type="text" class="form-input" placeholder="Descreva...">
                            </div>
                            <div class="form-group">
                                <label class="text-sm text-gray-600">Concessão 3</label>
                                <input type="text" class="form-input" placeholder="Descreva...">
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-lg border border-gray-200 p-4">
                        <h4 class="font-semibold text-purple-600 mb-2">Alto Custo para Mim / Baixo Valor para Eles</h4>
                        <p class="text-sm text-gray-600 mb-3">Estas são as concessões que você deve evitar.</p>
                        <div class="space-y-3">
                            <div class="form-group">
                                <label class="text-sm text-gray-600">Concessão 1</label>
                                <input type="text" class="form-input" placeholder="Descreva...">
                            </div>
                            <div class="form-group">
                                <label class="text-sm text-gray-600">Concessão 2</label>
                                <input type="text" class="form-input" placeholder="Descreva...">
                            </div>
                            <div class="form-group">
                                <label class="text-sm text-gray-600">Concessão 3</label>
                                <input type="text" class="form-input" placeholder="Descreva...">
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
        case 'spin':
            return `
                <div class="mb-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">Role-play SPIN</h3>
                    <p class="text-gray-600 mb-4">Gere e pratique perguntas para cada fase do método SPIN: Situação, Problema, Implicação e Necessidade.</p>
                </div>
                
                <div class="mb-6">
                    <h4 class="font-semibold text-purple-600 mb-2">Perguntas de Situação</h4>
                    <p class="text-sm text-gray-600 mb-3">Perguntas factuais para entender o contexto atual do cliente.</p>
                    <div class="spin-questions">
                        <input type="text" class="form-input" placeholder="Pergunta 1...">
                        <input type="text" class="form-input" placeholder="Pergunta 2...">
                        <input type="text" class="form-input" placeholder="Pergunta 3...">
                        <input type="text" class="form-input" placeholder="Pergunta 4...">
                        <input type="text" class="form-input" placeholder="Pergunta 5...">
                    </div>
                </div>
                
                <div class="mb-6">
                    <h4 class="font-semibold text-purple-600 mb-2">Perguntas de Problema</h4>
                    <p class="text-sm text-gray-600 mb-3">Perguntas que identificam dificuldades, insatisfações ou problemas.</p>
                    <div class="spin-questions">
                        <input type="text" class="form-input" placeholder="Pergunta 1...">
                        <input type="text" class="form-input" placeholder="Pergunta 2...">
                        <input type="text" class="form-input" placeholder="Pergunta 3...">
                        <input type="text" class="form-input" placeholder="Pergunta 4...">
                        <input type="text" class="form-input" placeholder="Pergunta 5...">
                    </div>
                </div>
                
                <div class="mb-6">
                    <h4 class="font-semibold text-purple-600 mb-2">Perguntas de Implicação</h4>
                    <p class="text-sm text-gray-600 mb-3">Perguntas que exploram as consequências dos problemas identificados.</p>
                    <div class="spin-questions">
                        <input type="text" class="form-input" placeholder="Pergunta 1...">
                        <input type="text" class="form-input" placeholder="Pergunta 2...">
                        <input type="text" class="form-input" placeholder="Pergunta 3...">
                        <input type="text" class="form-input" placeholder="Pergunta 4...">
                        <input type="text" class="form-input" placeholder="Pergunta 5...">
                    </div>
                </div>
                
                <div class="mb-6">
                    <h4 class="font-semibold text-purple-600 mb-2">Perguntas de Necessidade</h4>
                    <p class="text-sm text-gray-600 mb-3">Perguntas que levam o cliente a expressar o valor ou utilidade de resolver o problema.</p>
                    <div class="spin-questions">
                        <input type="text" class="form-input" placeholder="Pergunta 1...">
                        <input type="text" class="form-input" placeholder="Pergunta 2...">
                        <input type="text" class="form-input" placeholder="Pergunta 3...">
                        <input type="text" class="form-input" placeholder="Pergunta 4...">
                        <input type="text" class="form-input" placeholder="Pergunta 5...">
                    </div>
                </div>
            `;
            
        case 'ancora':
            return `
                <div class="mb-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">Defesa de Âncora Extrema</h3>
                    <p class="text-gray-600 mb-4">Elabore respostas objetivas para defender-se de âncoras extremas em uma negociação.</p>
                </div>
                
                <div class="mb-6">
                    <h4 class="font-semibold text-purple-600 mb-2">Cenário</h4>
                    <p class="text-gray-600">Você está negociando a venda de um produto/serviço e a contraparte faz uma oferta inicial extremamente baixa, muito abaixo do valor de mercado.</p>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Resposta 1: Questionar com dados</label>
                    <textarea class="form-input form-textarea" placeholder="Elabore uma resposta que questione a âncora com dados e fatos..."></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Resposta 2: Reancoragem</label>
                    <textarea class="form-input form-textarea" placeholder="Elabore uma resposta que estabeleça uma nova âncora mais favorável..."></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Resposta 3: Foco em valor</label>
                    <textarea class="form-input form-textarea" placeholder="Elabore uma resposta que redirecione a conversa para o valor entregue..."></textarea>
                </div>
            `;
            
        case 'email':
            return `
                <div class="mb-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">E-mail de Síntese</h3>
                    <p class="text-gray-600 mb-4">Redija um e-mail resumindo os pontos acordados após uma reunião de negociação.</p>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Assunto</label>
                    <input type="text" class="form-input" placeholder="Resumo da reunião de negociação - [Data]">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Saudação</label>
                    <input type="text" class="form-input" placeholder="Prezado(a) [Nome],">
                </div>
                
                <div class="form-group">
                    <label class="form-label">Introdução</label>
                    <textarea class="form-input form-textarea" placeholder="Agradeça pela reunião e contextualize brevemente..."></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Pontos Acordados</label>
                    <textarea class="form-input form-textarea" placeholder="Liste os principais pontos acordados na reunião..."></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Próximos Passos</label>
                    <textarea class="form-input form-textarea" placeholder="Detalhe os próximos passos, responsáveis e prazos..."></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Encerramento</label>
                    <textarea class="form-input form-textarea" placeholder="Encerre o e-mail de forma cordial e profissional..."></textarea>
                </div>
                
                <div class="form-group">
                    <label class="form-label">Assinatura</label>
                    <input type="text" class="form-input" placeholder="Atenciosamente,\n[Seu Nome]\n[Sua Posição]\n[Seus Contatos]">
                </div>
            `;
            
        case 'gravacao':
            return `
                <div class="mb-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">Gravação de Aberturas</h3>
                    <p class="text-gray-600 mb-4">Simule e revise aberturas de negociação analisando ritmo e clareza.</p>
                </div>
                
                <div class="mb-6">
                    <h4 class="font-semibold text-purple-600 mb-2">Instruções</h4>
                    <ol class="list-decimal pl-5 space-y-2 text-gray-600">
                        <li>Prepare 3 diferentes aberturas para uma negociação importante.</li>
                        <li>Grave-se praticando cada abertura (use o gravador do seu celular).</li>
                        <li>Ouça as gravações e avalie seu desempenho.</li>
                        <li>Registre suas observações e pontos de melhoria abaixo.</li>
                    </ol>
                </div>
                
                <div class="mb-6">
                    <h4 class="font-semibold text-purple-600 mb-2">Abertura 1</h4>
                    <div class="form-group">
                        <label class="form-label">Script da Abertura</label>
                        <textarea class="form-input form-textarea" placeholder="Escreva o script da sua primeira abertura..."></textarea>
                    </div>
                    <div class="grid grid-cols-2 gap-4 mt-3">
                        <div class="form-group">
                            <label class="form-label">Avaliação de Ritmo (1-10)</label>
                            <input type="number" min="1" max="10" class="form-input" placeholder="7">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Avaliação de Clareza (1-10)</label>
                            <input type="number" min="1" max="10" class="form-input" placeholder="8">
                        </div>
                    </div>
                    <div class="form-group mt-3">
                        <label class="form-label">Observações e Pontos de Melhoria</label>
                        <textarea class="form-input form-textarea" placeholder="Anote suas observações e pontos a melhorar..."></textarea>
                    </div>
                </div>
                
                <div class="mb-6">
                    <h4 class="font-semibold text-purple-600 mb-2">Abertura 2</h4>
                    <div class="form-group">
                        <label class="form-label">Script da Abertura</label>
                        <textarea class="form-input form-textarea" placeholder="Escreva o script da sua segunda abertura..."></textarea>
                    </div>
                    <div class="grid grid-cols-2 gap-4 mt-3">
                        <div class="form-group">
                            <label class="form-label">Avaliação de Ritmo (1-10)</label>
                            <input type="number" min="1" max="10" class="form-input" placeholder="7">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Avaliação de Clareza (1-10)</label>
                            <input type="number" min="1" max="10" class="form-input" placeholder="8">
                        </div>
                    </div>
                    <div class="form-group mt-3">
                        <label class="form-label">Observações e Pontos de Melhoria</label>
                        <textarea class="form-input form-textarea" placeholder="Anote suas observações e pontos a melhorar..."></textarea>
                    </div>
                </div>
                
                <div class="mb-6">
                    <h4 class="font-semibold text-purple-600 mb-2">Abertura 3</h4>
                    <div class="form-group">
                        <label class="form-label">Script da Abertura</label>
                        <textarea class="form-input form-textarea" placeholder="Escreva o script da sua terceira abertura..."></textarea>
                    </div>
                    <div class="grid grid-cols-2 gap-4 mt-3">
                        <div class="form-group">
                            <label class="form-label">Avaliação de Ritmo (1-10)</label>
                            <input type="number" min="1" max="10" class="form-input" placeholder="7">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Avaliação de Clareza (1-10)</label>
                            <input type="number" min="1" max="10" class="form-input" placeholder="8">
                        </div>
                    </div>
                    <div class="form-group mt-3">
                        <label class="form-label">Observações e Pontos de Melhoria</label>
                        <textarea class="form-input form-textarea" placeholder="Anote suas observações e pontos a melhorar..."></textarea>
                    </div>
                </div>
            `;
            
        case 'taticas':
            return `
                <div class="mb-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">Log de Táticas</h3>
                    <p class="text-gray-600 mb-4">Registre táticas observadas e desenvolva respostas estratégicas ideais.</p>
                </div>
                
                <div class="mb-6">
                    <h4 class="font-semibold text-purple-600 mb-2">Tática 1</h4>
                    <div class="form-group">
                        <label class="form-label">Nome da Tática</label>
                        <input type="text" class="form-input" placeholder="Ex: Âncora extrema, Bom policial/mau policial, etc.">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Descrição da Tática Observada</label>
                        <textarea class="form-input form-textarea" placeholder="Descreva como a tática foi utilizada..."></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Resposta Estratégica Ideal</label>
                        <textarea class="form-input form-textarea" placeholder="Descreva como você deveria responder idealmente..."></textarea>
                    </div>
                </div>
                
                <div class="mb-6">
                    <h4 class="font-semibold text-purple-600 mb-2">Tática 2</h4>
                    <div class="form-group">
                        <label class="form-label">Nome da Tática</label>
                        <input type="text" class="form-input" placeholder="Ex: Âncora extrema, Bom policial/mau policial, etc.">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Descrição da Tática Observada</label>
                        <textarea class="form-input form-textarea" placeholder="Descreva como a tática foi utilizada..."></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Resposta Estratégica Ideal</label>
                        <textarea class="form-input form-textarea" placeholder="Descreva como você deveria responder idealmente..."></textarea>
                    </div>
                </div>
                
                <div class="mb-6">
                    <h4 class="font-semibold text-purple-600 mb-2">Tática 3</h4>
                    <div class="form-group">
                        <label class="form-label">Nome da Tática</label>
                        <input type="text" class="form-input" placeholder="Ex: Âncora extrema, Bom policial/mau policial, etc.">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Descrição da Tática Observada</label>
                        <textarea class="form-input form-textarea" placeholder="Descreva como a tática foi utilizada..."></textarea>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Resposta Estratégica Ideal</label>
                        <textarea class="form-input form-textarea" placeholder="Descreva como você deveria responder idealmente..."></textarea>
                    </div>
                </div>
            `;
            
        case 'framing':
            return `
                <div class="mb-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">Framing</h3>
                    <p class="text-gray-600 mb-4">Reformule argumentos em molduras de ganho e perda para maior impacto.</p>
                </div>
                
                <div class="framing-container">
                    <div>
                        <h4 class="font-semibold text-purple-600 mb-2">Moldura de Ganho</h4>
                        <p class="text-sm text-gray-600 mb-3">Reformule os argumentos destacando os benefícios e ganhos.</p>
                        
                        <div class="space-y-4">
                            <div class="form-group">
                                <label class="form-label">Argumento 1</label>
                                <textarea class="form-input form-textarea" placeholder="Reformule o argumento em moldura de ganho..."></textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Argumento 2</label>
                                <textarea class="form-input form-textarea" placeholder="Reformule o argumento em moldura de ganho..."></textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Argumento 3</label>
                                <textarea class="form-input form-textarea" placeholder="Reformule o argumento em moldura de ganho..."></textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Argumento 4</label>
                                <textarea class="form-input form-textarea" placeholder="Reformule o argumento em moldura de ganho..."></textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Argumento 5</label>
                                <textarea class="form-input form-textarea" placeholder="Reformule o argumento em moldura de ganho..."></textarea>
                            </div>
                        </div>
                    </div>
                    
                    <div>
                        <h4 class="font-semibold text-purple-600 mb-2">Moldura de Perda</h4>
                        <p class="text-sm text-gray-600 mb-3">Reformule os argumentos destacando as perdas e riscos.</p>
                        
                        <div class="space-y-4">
                            <div class="form-group">
                                <label class="form-label">Argumento 1</label>
                                <textarea class="form-input form-textarea" placeholder="Reformule o argumento em moldura de perda..."></textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Argumento 2</label>
                                <textarea class="form-input form-textarea" placeholder="Reformule o argumento em moldura de perda..."></textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Argumento 3</label>
                                <textarea class="form-input form-textarea" placeholder="Reformule o argumento em moldura de perda..."></textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Argumento 4</label>
                                <textarea class="form-input form-textarea" placeholder="Reformule o argumento em moldura de perda..."></textarea>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Argumento 5</label>
                                <textarea class="form-input form-textarea" placeholder="Reformule o argumento em moldura de perda..."></textarea>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
        case 'pos':
            return `
                <div class="mb-6">
                    <h3 class="text-lg font-semibold text-gray-800 mb-2">Pós-Negociação</h3>
                    <p class="text-gray-600 mb-4">Crie um checklist de implementação e defina métricas de sucesso para acompanhar os resultados da negociação.</p>
                </div>
                
                <div class="mb-6">
                    <h4 class="font-semibold text-purple-600 mb-2">Checklist de Implementação</h4>
                    <p class="text-sm text-gray-600 mb-3">Liste os itens que precisam ser implementados após a negociação.</p>
                    
                    <div class="space-y-2">
                        <div class="flex items-center">
                            <input type="checkbox" class="form-checkbox h-5 w-5 text-purple-600">
                            <input type="text" class="form-input ml-2" placeholder="Item de implementação 1...">
                        </div>
                        <div class="flex items-center">
                            <input type="checkbox" class="form-checkbox h-5 w-5 text-purple-600">
                            <input type="text" class="form-input ml-2" placeholder="Item de implementação 2...">
                        </div>
                        <div class="flex items-center">
                            <input type="checkbox" class="form-checkbox h-5 w-5 text-purple-600">
                            <input type="text" class="form-input ml-2" placeholder="Item de implementação 3...">
                        </div>
                        <div class="flex items-center">
                            <input type="checkbox" class="form-checkbox h-5 w-5 text-purple-600">
                            <input type="text" class="form-input ml-2" placeholder="Item de implementação 4...">
                        </div>
                        <div class="flex items-center">
                            <input type="checkbox" class="form-checkbox h-5 w-5 text-purple-600">
                            <input type="text" class="form-input ml-2" placeholder="Item de implementação 5...">
                        </div>
                    </div>
                </div>
                
                <div class="mb-6">
                    <h4 class="font-semibold text-purple-600 mb-2">Métricas de Sucesso</h4>
                    <p class="text-sm text-gray-600 mb-3">Defina métricas para avaliar o sucesso da negociação.</p>
                    
                    <div class="space-y-4">
                        <div class="form-group">
                            <label class="form-label">Tempo de Ativação</label>
                            <div class="flex items-center">
                                <input type="text" class="form-input" placeholder="Meta (ex: 30 dias)">
                                <span class="mx-2">vs</span>
                                <input type="text" class="form-input" placeholder="Real (preencher após)">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">NPS (Net Promoter Score)</label>
                            <div class="flex items-center">
                                <input type="text" class="form-input" placeholder="Meta (ex: 8+)">
                                <span class="mx-2">vs</span>
                                <input type="text" class="form-input" placeholder="Real (preencher após)">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">ROI</label>
                            <div class="flex items-center">
                                <input type="text" class="form-input" placeholder="Meta (ex: 3x)">
                                <span class="mx-2">vs</span>
                                <input type="text" class="form-input" placeholder="Real (preencher após)">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Métrica Personalizada 1</label>
                            <input type="text" class="form-input mb-2" placeholder="Nome da métrica...">
                            <div class="flex items-center">
                                <input type="text" class="form-input" placeholder="Meta">
                                <span class="mx-2">vs</span>
                                <input type="text" class="form-input" placeholder="Real (preencher após)">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label class="form-label">Métrica Personalizada 2</label>
                            <input type="text" class="form-input mb-2" placeholder="Nome da métrica...">
                            <div class="flex items-center">
                                <input type="text" class="form-input" placeholder="Meta">
                                <span class="mx-2">vs</span>
                                <input type="text" class="form-input" placeholder="Real (preencher após)">
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
        default:
            return `
                <div class="flex items-center justify-center h-64">
                    <p class="text-gray-500 text-lg">Exercício não encontrado.</p>
                </div>
            `;
    }
}
