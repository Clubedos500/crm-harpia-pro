/**
 * storage.js - Gerenciamento de armazenamento de dados do usuário
 * 
 * Este módulo é responsável por:
 * - Salvar e carregar dados do usuário usando localStorage
 * - Sincronizar dados com o backend quando disponível
 * - Gerenciar o estado offline/online da aplicação
 */

const Storage = (function() {
    // Chaves para armazenamento local
    const KEYS = {
        USER_DATA: 'negotiation_training_user_data',
        SYNC_QUEUE: 'negotiation_training_sync_queue',
        USER_ID: 'negotiation_training_user_id',
        AUTH_TOKEN: 'negotiation_training_auth_token'
    };

    // Configuração da API
    const API_CONFIG = {
        BASE_URL: '/api',
        ENDPOINTS: {
            USER: '/user',
            EXERCISE: '/exercise',
            TRAINING_DAY: '/training-day',
            REPORT: '/report',
            LOGIN: '/login',
            LOGOUT: '/logout',
            CHECK_AUTH: '/check-auth'
        }
    };

    // Estado da conexão
    let isOnline = navigator.onLine;

    // Ouvintes de eventos para mudanças de estado
    window.addEventListener('online', () => {
        isOnline = true;
        syncWithBackend();
    });

    window.addEventListener('offline', () => {
        isOnline = false;
        showOfflineNotification();
    });

    /**
     * Registra um novo usuário
     */
    async function registerUser(name, email, password) {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USER}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password }),
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Erro ao registrar usuário');
            }
            
            // Salvar ID do usuário
            localStorage.setItem(KEYS.USER_ID, data.id);
            
            return data;
        } catch (error) {
            console.error('Erro ao registrar usuário:', error);
            throw error;
        }
    }
    
    /**
     * Realiza login do usuário
     */
    async function loginUser(email, password) {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGIN}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password }),
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Erro ao fazer login');
            }
            
            // Salvar ID do usuário
            localStorage.setItem(KEYS.USER_ID, data.id);
            
            return data;
        } catch (error) {
            console.error('Erro ao fazer login:', error);
            throw error;
        }
    }
    
    /**
     * Verifica se o usuário está autenticado
     */
    async function isAuthenticated() {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHECK_AUTH}`, {
                method: 'GET',
                credentials: 'include'
            });
            
            const data = await response.json();
            
            if (data.authenticated) {
                localStorage.setItem(KEYS.USER_ID, data.user_id);
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error('Erro ao verificar autenticação:', error);
            return false;
        }
    }
    
    /**
     * Realiza logout do usuário
     */
    async function logoutUser() {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.LOGOUT}`, {
                method: 'POST',
                credentials: 'include'
            });
            
            localStorage.removeItem(KEYS.USER_ID);
            localStorage.removeItem(KEYS.USER_DATA);
            
            return await response.json();
        } catch (error) {
            console.error('Erro ao fazer logout:', error);
            throw error;
        }
    }
    
    /**
     * Inicializa o armazenamento e verifica se há dados para sincronizar
     */
    async function init() {
        // Verificar se o usuário está autenticado
        const authenticated = await isAuthenticated();
        
        if (!authenticated) {
            return {
                isInitialized: true,
                isOnline: isOnline,
                userId: null,
                authenticated: false
            };
        }
        
        // Verificar se há dados para sincronizar
        if (isOnline) {
            syncWithBackend();
        }

        // Verificar se o usuário já existe
        const userId = getUserId();
        if (!userId) {
            // Criar dados iniciais do usuário
            const initialData = createInitialUserData();
            saveUserData(initialData);
        }

        return {
            isInitialized: true,
            isOnline: isOnline,
            userId: getUserId(),
            authenticated: true
        };
    }

    /**
     * Cria a estrutura inicial de dados do usuário
     */
    function createInitialUserData() {
        const exerciseTypes = ['batna', 'meso', 'concessoes', 'spin', 'ancora', 'email', 'gravacao', 'taticas', 'framing', 'pos'];
        
        const exercises = {};
        exerciseTypes.forEach(type => {
            exercises[type] = {
                status: 'not-started',
                timeSpent: 0,
                lastActivity: null,
                data: {}
            };
        });

        const trainingDays = {};
        for (let i = 1; i <= 14; i++) {
            trainingDays[i] = {
                status: 'not-started',
                timeSpent: 0,
                lastActivity: null
            };
        }

        return {
            name: '',
            email: '',
            exercises: exercises,
            trainingDays: trainingDays,
            activityHistory: [],
            totalTimeSpent: 0,
            lastSync: null
        };
    }

    /**
     * Obtém o ID do usuário do armazenamento local
     */
    function getUserId() {
        return localStorage.getItem(KEYS.USER_ID);
    }

    /**
     * Define o ID do usuário no armazenamento local
     */
    function setUserId(userId) {
        localStorage.setItem(KEYS.USER_ID, userId);
    }

    /**
     * Carrega os dados do usuário do armazenamento local
     */
    function loadUserData() {
        const data = localStorage.getItem(KEYS.USER_DATA);
        return data ? JSON.parse(data) : null;
    }

    /**
     * Salva os dados do usuário no armazenamento local
     */
    function saveUserData(data) {
        localStorage.setItem(KEYS.USER_DATA, JSON.stringify(data));
    }

    /**
     * Adiciona uma operação à fila de sincronização
     */
    function addToSyncQueue(operation) {
        const queue = getSyncQueue();
        queue.push({
            ...operation,
            timestamp: Date.now()
        });
        localStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify(queue));
    }

    /**
     * Obtém a fila de sincronização
     */
    function getSyncQueue() {
        const queue = localStorage.getItem(KEYS.SYNC_QUEUE);
        return queue ? JSON.parse(queue) : [];
    }

    /**
     * Limpa a fila de sincronização
     */
    function clearSyncQueue() {
        localStorage.setItem(KEYS.SYNC_QUEUE, JSON.stringify([]));
    }

    /**
     * Sincroniza dados com o backend
     */
    async function syncWithBackend() {
        if (!isOnline) return;

        const userId = getUserId();
        const queue = getSyncQueue();

        // Se não há usuário ou fila vazia, não há nada para sincronizar
        if (!userId && queue.length === 0) return;

        try {
            // Se não há usuário mas há operações na fila, criar usuário primeiro
            if (!userId) {
                const userData = loadUserData();
                if (userData && userData.name && userData.email) {
                    const newUser = await createUserOnBackend(userData.name, userData.email);
                    if (newUser && newUser.id) {
                        setUserId(newUser.id);
                    }
                }
            }

            // Processar fila de sincronização
            if (queue.length > 0) {
                for (const operation of queue) {
                    await processOperation(operation);
                }
                clearSyncQueue();
            }

            // Atualizar dados do usuário do backend
            if (userId) {
                const backendData = await fetchUserDataFromBackend(userId);
                if (backendData) {
                    const localData = loadUserData();
                    // Mesclar dados locais com dados do backend
                    const mergedData = mergeUserData(localData, backendData);
                    saveUserData(mergedData);
                }
            }

            // Atualizar timestamp de sincronização
            const userData = loadUserData();
            userData.lastSync = Date.now();
            saveUserData(userData);

            return true;
        } catch (error) {
            console.error('Erro na sincronização:', error);
            return false;
        }
    }

    /**
     * Processa uma operação da fila de sincronização
     */
    async function processOperation(operation) {
        const userId = getUserId();
        if (!userId) return;

        const { type, data } = operation;

        switch (type) {
            case 'update_exercise':
                await updateExerciseOnBackend(userId, data.exerciseType, data);
                break;
            case 'update_training_day':
                await updateTrainingDayOnBackend(userId, data.dayNumber, data);
                break;
            default:
                console.warn('Tipo de operação desconhecido:', type);
        }
    }

    /**
     * Mescla dados do usuário local com dados do backend
     */
    function mergeUserData(localData, backendData) {
        if (!localData) return backendData;
        if (!backendData) return localData;

        // Mesclar exercícios (priorizar dados mais recentes)
        const exercises = {};
        const exerciseTypes = Object.keys({ ...localData.exercises, ...backendData.exercises });
        
        exerciseTypes.forEach(type => {
            const localExercise = localData.exercises[type];
            const backendExercise = backendData.exercises[type];
            
            if (!localExercise) {
                exercises[type] = backendExercise;
            } else if (!backendExercise) {
                exercises[type] = localExercise;
            } else {
                // Comparar timestamps e usar o mais recente
                const localTimestamp = new Date(localExercise.lastActivity || 0).getTime();
                const backendTimestamp = new Date(backendExercise.lastActivity || 0).getTime();
                
                exercises[type] = localTimestamp > backendTimestamp ? localExercise : backendExercise;
            }
        });

        // Mesclar dias de treinamento (priorizar dados mais recentes)
        const trainingDays = {};
        const dayNumbers = Object.keys({ ...localData.trainingDays, ...backendData.trainingDays });
        
        dayNumbers.forEach(day => {
            const localDay = localData.trainingDays[day];
            const backendDay = backendData.trainingDays[day];
            
            if (!localDay) {
                trainingDays[day] = backendDay;
            } else if (!backendDay) {
                trainingDays[day] = localDay;
            } else {
                // Comparar timestamps e usar o mais recente
                const localTimestamp = new Date(localDay.lastActivity || 0).getTime();
                const backendTimestamp = new Date(backendDay.lastActivity || 0).getTime();
                
                trainingDays[day] = localTimestamp > backendTimestamp ? localDay : backendDay;
            }
        });

        // Mesclar histórico de atividades (combinar e ordenar por data)
        const activityHistory = [...(localData.activityHistory || []), ...(backendData.activityHistory || [])];
        activityHistory.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        // Remover duplicatas
        const uniqueActivities = [];
        const activityIds = new Set();
        
        activityHistory.forEach(activity => {
            const activityId = `${activity.title}-${activity.date}`;
            if (!activityIds.has(activityId)) {
                activityIds.add(activityId);
                uniqueActivities.push(activity);
            }
        });

        return {
            id: backendData.id || localData.id,
            name: backendData.name || localData.name,
            email: backendData.email || localData.email,
            exercises,
            trainingDays,
            activityHistory: uniqueActivities.slice(0, 50), // Limitar a 50 atividades
            totalTimeSpent: Math.max(localData.totalTimeSpent || 0, backendData.totalTimeSpent || 0),
            lastSync: Date.now()
        };
    }

    /**
     * Cria um usuário no backend
     */
    async function createUserOnBackend(name, email) {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USER}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email })
            });

            if (!response.ok) {
                throw new Error(`Erro ao criar usuário: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Erro ao criar usuário:', error);
            return null;
        }
    }

    /**
     * Busca dados do usuário do backend
     */
    async function fetchUserDataFromBackend(userId) {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.USER}/${userId}`);

            if (!response.ok) {
                throw new Error(`Erro ao buscar dados do usuário: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Erro ao buscar dados do usuário:', error);
            return null;
        }
    }

    /**
     * Atualiza um exercício no backend
     */
    async function updateExerciseOnBackend(userId, exerciseType, data) {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.EXERCISE}/${userId}/${exerciseType}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`Erro ao atualizar exercício: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Erro ao atualizar exercício:', error);
            return null;
        }
    }

    /**
     * Atualiza um dia de treinamento no backend
     */
    async function updateTrainingDayOnBackend(userId, dayNumber, data) {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.TRAINING_DAY}/${userId}/${dayNumber}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            if (!response.ok) {
                throw new Error(`Erro ao atualizar dia de treinamento: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('Erro ao atualizar dia de treinamento:', error);
            return null;
        }
    }

    /**
     * Gera um relatório PDF do backend
     */
    async function generateReport(userId) {
        if (!isOnline) {
            showOfflineNotification('Não é possível gerar relatórios no modo offline');
            return null;
        }

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.REPORT}/${userId}`);

            if (!response.ok) {
                throw new Error(`Erro ao gerar relatório: ${response.status}`);
            }

            return response.blob();
        } catch (error) {
            console.error('Erro ao gerar relatório:', error);
            return null;
        }
    }

    /**
     * Atualiza um exercício localmente e adiciona à fila de sincronização
     */
    function updateExercise(exerciseType, data) {
        const userData = loadUserData();
        if (!userData || !userData.exercises || !userData.exercises[exerciseType]) {
            console.error('Dados do usuário inválidos ou exercício não encontrado');
            return false;
        }

        // Atualizar dados locais
        const exercise = userData.exercises[exerciseType];
        const updatedExercise = {
            ...exercise,
            ...data,
            lastActivity: new Date().toISOString()
        };

        // Atualizar tempo total gasto
        if (data.timeSpent) {
            userData.totalTimeSpent = (userData.totalTimeSpent || 0) + data.timeSpent;
        }

        // Adicionar ao histórico se concluído
        if (data.status === 'completed' && exercise.status !== 'completed') {
            userData.activityHistory.unshift({
                title: `Concluiu: ${getExerciseName(exerciseType)}`,
                type: 'exercise',
                duration: updatedExercise.timeSpent,
                date: new Date().toISOString()
            });
        }

        userData.exercises[exerciseType] = updatedExercise;
        saveUserData(userData);

        // Adicionar à fila de sincronização
        addToSyncQueue({
            type: 'update_exercise',
            data: {
                exerciseType,
                status: updatedExercise.status,
                timeSpent: data.timeSpent || 0,
                data: updatedExercise.data
            }
        });

        // Tentar sincronizar imediatamente se online
        if (isOnline) {
            syncWithBackend();
        }

        return true;
    }

    /**
     * Atualiza um dia de treinamento localmente e adiciona à fila de sincronização
     */
    function updateTrainingDay(dayNumber, data) {
        const userData = loadUserData();
        if (!userData || !userData.trainingDays || !userData.trainingDays[dayNumber]) {
            console.error('Dados do usuário inválidos ou dia de treinamento não encontrado');
            return false;
        }

        // Atualizar dados locais
        const day = userData.trainingDays[dayNumber];
        const updatedDay = {
            ...day,
            ...data,
            lastActivity: new Date().toISOString()
        };

        // Atualizar tempo total gasto
        if (data.timeSpent) {
            userData.totalTimeSpent = (userData.totalTimeSpent || 0) + data.timeSpent;
        }

        // Adicionar ao histórico se concluído
        if (data.status === 'completed' && day.status !== 'completed') {
            userData.activityHistory.unshift({
                title: `Concluiu: Dia ${dayNumber} do Plano de Treino`,
                type: 'training',
                duration: updatedDay.timeSpent,
                date: new Date().toISOString()
            });
        }

        userData.trainingDays[dayNumber] = updatedDay;
        saveUserData(userData);

        // Adicionar à fila de sincronização
        addToSyncQueue({
            type: 'update_training_day',
            data: {
                dayNumber,
                status: updatedDay.status,
                timeSpent: data.timeSpent || 0
            }
        });

        // Tentar sincronizar imediatamente se online
        if (isOnline) {
            syncWithBackend();
        }

        return true;
    }

    /**
     * Atualiza o perfil do usuário
     */
    function updateUserProfile(name, email) {
        const userData = loadUserData();
        if (!userData) {
            console.error('Dados do usuário inválidos');
            return false;
        }

        userData.name = name;
        userData.email = email;
        saveUserData(userData);

        // Se não há ID de usuário, tentar criar no backend
        if (!getUserId() && isOnline) {
            createUserOnBackend(name, email).then(user => {
                if (user && user.id) {
                    setUserId(user.id);
                    syncWithBackend();
                }
            });
        }

        return true;
    }

    /**
     * Exibe uma notificação de modo offline
     */
    function showOfflineNotification(message = 'Você está no modo offline. Suas alterações serão sincronizadas quando a conexão for restaurada.') {
        // Implementação depende da UI da aplicação
        console.log('Notificação offline:', message);
        
        // Exemplo de notificação simples
        const notification = document.createElement('div');
        notification.className = 'offline-notification';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
            
            setTimeout(() => {
                notification.classList.remove('show');
                setTimeout(() => {
                    document.body.removeChild(notification);
                }, 300);
            }, 3000);
        }, 100);
    }

    /**
     * Obtém o nome de um exercício pelo ID
     */
    function getExerciseName(exerciseId) {
        const exerciseNames = {
            'batna': 'Mapa BATNA',
            'meso': 'MESO - Pacotes Equivalentes',
            'concessoes': 'Concessões Estratégicas',
            'spin': 'Role-play SPIN',
            'ancora': 'Defesa de Âncora Extrema',
            'email': 'E-mail de Síntese',
            'gravacao': 'Gravação de Aberturas',
            'taticas': 'Log de Táticas',
            'framing': 'Framing',
            'pos': 'Pós-Negociação'
        };
        
        return exerciseNames[exerciseId] || 'Exercício Desconhecido';
    }

    // API pública
    return {
        init,
        loadUserData,
        updateExercise,
        updateTrainingDay,
        updateUserProfile,
        syncWithBackend,
        generateReport,
        isOnline: () => isOnline,
        registerUser,
        loginUser,
        logoutUser,
        isAuthenticated
    };
})();

// Exportar para uso em outros módulos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Storage;
}
