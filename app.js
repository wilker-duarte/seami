// Listagem Inicial de Alunos e Salas predefinidas
const INITIAL_STUDENTS = [
    { name: "Gabriel Nogueira", classroom: "Alegria" },
    { name: "Noah", classroom: "Carinho" },
    { name: "Teresa O.", classroom: "União" },
    { name: "Caetano", classroom: "Carinho" },
    { name: "Eleah Queiroz Vidal", classroom: "Carinho" },
    { name: "Jorge", classroom: "Carinho" },
    { name: "Karina Moreira", classroom: "Felicidade" },
    { name: "Clara Santos", classroom: "Alegria" },
    { name: "Bento Ribeiro", classroom: "União" },
    { name: "Samuel Lins", classroom: "Alegria" },
    { name: "Arthur Costa", classroom: "Alegria" },
    { name: "Caetano", classroom: "Amizade" },
    { name: "Rafael Emanuel", classroom: "Alegria" },
    { name: "Antônio", classroom: "Felicidade" },
    { name: "Tereza", classroom: "União" },
    { name: "Elias Neto", classroom: "Alegria" },
    { name: "Maria Freja", classroom: "Amizade" },
    { name: "Natália Pasini", classroom: "Carinho" },
    { name: "Bernardo Teodoro", classroom: "Carinho" },
    { name: "Rafael Santana", classroom: "Alegria" },
    { name: "Levi Wagner", classroom: "Felicidade" },
    { name: "Gabriel Barcelos", classroom: "Alegria" },
    { name: "João Gomes", classroom: "Amizade" },
    { name: "Davi Novais Sifuentes", classroom: "Carinho" },
    { name: "Cícero Camargo", classroom: "Alegria" },
    { name: "Athena Paiva", classroom: "Felicidade" },
    { name: "Nanna Milanez", classroom: "Felicidade" },
    { name: "Marcos Alexandre", classroom: "Felicidade" },
    { name: "Noah Santos", classroom: "Carinho" },
    { name: "Isabel Fox", classroom: "Carinho" },
    { name: "Theo Sokolov", classroom: "Carinho" },
    { name: "Lucas Ribeiro", classroom: "Felicidade" },
    { name: "Nerina Nunes", classroom: "Felicidade" },
    { name: "Clarice Nogueira", classroom: "Alegria" },
    { name: "Gabriel Raul", classroom: "Alegria" },
    { name: "Tarsila Vasconcelos", classroom: "Amizade" },
    { name: "Ethan", classroom: "União" },
    { name: "Eloah Queiroz Vidal", classroom: "Carinho" },
    { name: "Teresa Odila", classroom: "União" },
    { name: "Mateus", classroom: "Felicidade" },
    { name: "Gabriel Monteiro", classroom: "Carinho" },
    { name: "Laura Nobre", classroom: "Alegria" },
    { name: "Caetano Barbosa", classroom: "Amizade" },
    { name: "Manuel R. Barcelos", classroom: "Alegria" },
    { name: "Eliza Buslik", classroom: "Carinho" },
    { name: "Ana João Maria", classroom: "Alegria" },
    { name: "Rafael Fontes", classroom: "Alegria" },
    { name: "Arthur Salamone", classroom: "Felicidade" },
    { name: "Ulisses Salamone", classroom: "Alegria" },
    { name: "Lucas Mendonça", classroom: "Carinho" },
    { name: "Ulisses Sabarense", classroom: "Alegria" },
    { name: "Athena Sabarense", classroom: "Felicidade" },
    { name: "Gabriel Pucel", classroom: "Alegria" },
    { name: "Clarice Santos Trigueiro", classroom: "Alegria" },
    { name: "Marina Milanesi Moreira", classroom: "Carinho" },
    { name: "Inae Pamplona", classroom: "Alegria" },
    { name: "Matheus Faccin", classroom: "Alegria" },
    { name: "Beatriz Boldo", classroom: "Amizade" },
    { name: "Luiz Ricardo", classroom: "União" },
    { name: "Jorge Issamu", classroom: "Carinho" },
    { name: "Beatriz Cavalcanti de Oliveira", classroom: "Amizade" },
    { name: "Samuel Guedes Lins", classroom: "Alegria" },
    { name: "Arthur Costa Viana", classroom: "Alegria" },
    { name: "Antonio Guillaume", classroom: "Felicidade" },
    { name: "Laura Moreira", classroom: "Alegria" },
    { name: "Gabrielle Vieira", classroom: "Carinho" },
    { name: "Teresa Odilon Souza", classroom: "Alegria" },
    { name: "Natalia Ribeiro Pasiani", classroom: "Carinho" }
];

// Imagem de Assinatura Digital Mockada usando SVG inline em Base64
const DUMMY_SIGNATURE_SVG = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='100'><path d='M10 50 Q 50 10 100 50 T 200 50 T 290 30' stroke='%231e293b' stroke-width='2.5' fill='none'/></svg>";
const DUMMY_SIGNATURE_SVG_ALT = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='100'><path d='M15 60 C 60 20, 120 80, 200 30 C 240 10, 260 50, 285 40' stroke='%231e293b' stroke-width='2.5' fill='none'/></svg>";

// Banco de Dados da Creche no LocalStorage
let db = {
    students: [],
    occurrences: [],
    settings: {
        activeRole: "diretora",
        activeUserName: "Diretora Ana Clara",
        activeUserAvatar: "👩‍💼",
        theme: "light"
    }
};

// Gráficos Globais (instâncias de Chart.js)
let charts = {
    atrasosMes: null,
    faltasSala: null,
    motivos: null,
    criancasRecorrentes: null,
    frequenciaMensal: null
};

// Módulo de Ocorrência selecionado atualmente na listagem
let currentOccurrenceModule = "atrasos";

// Assinaturas Digitais em Canvas
let canvases = {
    atraso: null,
    saida: null
};

// ==========================================================================
// INICIALIZAÇÃO DO APLICATIVO
// ==========================================================================
document.addEventListener("DOMContentLoaded", () => {
    loadDatabase();
    initTheme();
    initRouter();
    initRoleSelector();
    initAutocomplete();
    initStudentCRUD();
    initOccurrenceForms();
    initFilters();
    initGlobalSearch();
    initReportsPage();
    initSettingsPage();
    
    // Configura canvas de assinaturas digitais
    setupCanvas("atraso-signature-canvas", "btn-clear-sig-atraso", "atraso");
    setupCanvas("saida-signature-canvas", "btn-clear-sig-saida", "saida");
    
    // Atualiza ícones do Lucide
    lucide.createIcons();
});

// Carrega dados do LocalStorage ou semeia se estiver vazio
function loadDatabase() {
    const savedDb = localStorage.getItem("educagestao_creche_db");
    if (savedDb) {
        db = JSON.parse(savedDb);
        // Garante que o status 'active' esteja em todos os alunos
        db.students.forEach(st => {
            if (st.active === undefined) st.active = true;
        });
    } else {
        resetToDefaultData();
    }
    
    // Se não houver ocorrências na base seeded, gera dados de exemplo imediatamente
    if (db.occurrences.length === 0) {
        generateDummyOccurrences();
    }
    
    updateDashboardMetrics();
    renderAllCharts();
}

function saveDatabase() {
    localStorage.setItem("educagestao_creche_db", JSON.stringify(db));
}

// Zera base de ocorrências e redefine alunos
function resetToDefaultData() {
    db.students = INITIAL_STUDENTS.map((st, index) => ({
        id: "student_" + (index + 1),
        name: st.name,
        classroom: st.classroom,
        active: true
    }));
    db.occurrences = [];
    saveDatabase();
}

// ==========================================================================
// SEEDER DE OCORRÊNCIAS DE EXEMPLO (REALISMO DE DADOS)
// ==========================================================================
function generateDummyOccurrences() {
    const today = new Date();
    const students = db.students.filter(st => st.active);
    
    const atrasosMotivos = ["Consulta médica", "Trânsito", "Chuvas / Condições Climáticas", "Dormiu pouco / Cansaço", "Não se alimentou em casa", "Informado por e-mail dos pais", "Outros"];
    const saidasMotivos = ["Consulta médica / Tratamento", "Viagem / Compromisso familiar", "Criança indisposta / Mal-estar na escola", "Recomendação psicológica/terapêutica", "Outros"];
    const atestadoMotivos = ["Gripe / Resfriado comum", "Gastroenterite / Vômito / Diarreia", "Febre em investigação", "Conjuntivite infecciosa", "Catapora / Varicela", "Bronquite / Crise Respiratória", "Otite média aguda"];
    const faltasMotivos = ["Doença / Indisposição física", "Compromisso familiar / Viagem", "Dificuldade de transporte / Logística", "Condições climáticas / Chuva forte", "Sem justificativa declarada"];
    const parentNames = ["Marcos Santos", "Cláudia Nogueira", "Roberto Silva", "Juliana Lins", "Mariana Costa", "Fernando Santana", "Paula Paiva"];
    const staffNames = ["Auxiliar Jéssica", "Tia Solange", "Coord. Ana Clara", "Auxiliar Mariana"];

    // Semeia cerca de 95 ocorrências espalhadas nos últimos 30 dias
    for (let i = 0; i < 95; i++) {
        const daysAgo = Math.floor(Math.random() * 30) + 1;
        const occDate = new Date();
        occDate.setDate(today.getDate() - daysAgo);
        
        // Evita fins de semana
        if (occDate.getDay() === 0 || occDate.getDay() === 6) {
            continue;
        }

        const dateStr = occDate.toISOString().split("T")[0];
        
        // Sorteia estudante
        const student = students[Math.floor(Math.random() * students.length)];
        
        // Sorteia tipo de ocorrência
        const randType = Math.random();
        
        if (randType < 0.40) {
            // ATRASO (40%)
            const hour = "08:" + String(Math.floor(Math.random() * 45) + 15).padStart(2, "0"); // Chegada entre 08:15 e 08:59
            const motive = atrasosMotivos[Math.floor(Math.random() * atrasosMotivos.length)];
            const guardian = parentNames[Math.floor(Math.random() * parentNames.length)];
            
            db.occurrences.push({
                id: "occ_atraso_" + Math.random().toString(36).substr(2, 9),
                type: "atraso",
                studentId: student.id,
                studentName: student.name,
                classroom: student.classroom,
                date: dateStr,
                time: hour,
                motive: motive,
                guardian: guardian,
                staff: staffNames[Math.floor(Math.random() * staffNames.length)],
                obs: Math.random() > 0.5 ? "Avisou com antecedência." : "",
                signature: Math.random() > 0.5 ? DUMMY_SIGNATURE_SVG : DUMMY_SIGNATURE_SVG_ALT
            });
            
        } else if (randType < 0.65) {
            // FALTA (25%)
            const motive = faltasMotivos[Math.floor(Math.random() * faltasMotivos.length)];
            const just = Math.random() > 0.4 ? "sim" : "nao";
            
            db.occurrences.push({
                id: "occ_falta_" + Math.random().toString(36).substr(2, 9),
                type: "falta",
                studentId: student.id,
                studentName: student.name,
                classroom: student.classroom,
                date: dateStr,
                motive: motive,
                justified: just,
                notified: Math.random() > 0.5 ? "sim" : "nao",
                obs: just === "sim" ? "Pais enviaram mensagem justificando." : ""
            });
            
        } else if (randType < 0.80) {
            // SAÍDA ANTECIPADA (15%)
            const hour = String(Math.floor(Math.random() * 4) + 13).padStart(2, "0") + ":" + String(Math.floor(Math.random() * 59)).padStart(2, "0"); // Saída entre 13h e 16h
            const motive = saidasMotivos[Math.floor(Math.random() * saidasMotivos.length)];
            const hasReturn = Math.random() > 0.8 ? "sim" : "nao";
            
            db.occurrences.push({
                id: "occ_saida_" + Math.random().toString(36).substr(2, 9),
                type: "saida",
                studentId: student.id,
                studentName: student.name,
                classroom: student.classroom,
                date: dateStr,
                time: hour,
                motive: motive,
                guardian: parentNames[Math.floor(Math.random() * parentNames.length)],
                hasReturn: hasReturn,
                returnTime: hasReturn === "sim" ? "16:30" : "",
                signature: Math.random() > 0.5 ? DUMMY_SIGNATURE_SVG : DUMMY_SIGNATURE_SVG_ALT,
                obs: ""
            });
            
        } else if (randType < 0.92) {
            // AMAMENTAÇÃO (12%)
            const enterH = String(Math.floor(Math.random() * 3) + 14).padStart(2, "0");
            const enterM = Math.floor(Math.random() * 40);
            const timeIn = `${enterH}:${String(enterM).padStart(2, "0")}`;
            const timeOut = `${enterH}:${String(enterM + Math.floor(Math.random() * 20) + 15).padStart(2, "0")}`;
            
            db.occurrences.push({
                id: "occ_amam_" + Math.random().toString(36).substr(2, 9),
                type: "amamentacao",
                studentId: student.id,
                studentName: student.name,
                classroom: student.classroom,
                date: dateStr,
                timeIn: timeIn,
                timeOut: timeOut,
                guardian: parentNames[Math.floor(Math.random() * parentNames.length)],
                obs: "Mamou super bem. Ficou dormindo após."
            });
            
        } else {
            // ATESTADO (8%)
            const days = Math.floor(Math.random() * 6) + 2; // de 2 a 7 dias
            const motive = atestadoMotivos[Math.floor(Math.random() * atestadoMotivos.length)];
            
            // Calcula data final
            const endDate = new Date(occDate);
            endDate.setDate(endDate.getDate() + days - 1);
            
            db.occurrences.push({
                id: "occ_atestado_" + Math.random().toString(36).substr(2, 9),
                type: "atestado",
                studentId: student.id,
                studentName: student.name,
                classroom: student.classroom,
                date: dateStr,
                startDate: dateStr,
                days: days,
                endDate: endDate.toISOString().split("T")[0],
                cid: "CID " + ["J11", "A09", "H10", "B01", "J20"][Math.floor(Math.random() * 5)],
                motive: motive,
                obs: "Apresentou documento médico assinado.",
                // Simulação de atestado carregado em base64 (um retângulo de preview mockado)
                filePreview: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200'><rect width='300' height='200' fill='%23f8fafc' stroke='%23cbd5e1' stroke-width='2'/><text x='150' y='60' font-family='sans-serif' font-size='14' font-weight='bold' text-anchor='middle' fill='%23475569'>ATESTADO MÉDICO</text><text x='150' y='100' font-family='sans-serif' font-size='11' text-anchor='middle' fill='%2364748b'>Declaro para devidos fins de afastamento escolar.</text><line x1='50' y1='150' x2='250' y2='150' stroke='%2394a3b8' stroke-width='1'/><text x='150' y='165' font-family='sans-serif' font-size='9' text-anchor='middle' fill='%2394a3b8'>Assinatura do Profissional CRM 9988</text></svg>"
            });
        }
    }
    
    // Força alguns atestados e faltas específicas para garantir alertas na inteligência
    const activeAtestadoDate = new Date();
    activeAtestadoDate.setDate(today.getDate() - 1);
    const activeEndDate = new Date(activeAtestadoDate);
    activeEndDate.setDate(activeEndDate.getDate() + 5);
    
    // Atestado ativo para Karina Moreira
    const studentKarina = students.find(s => s.name === "Karina Moreira");
    if (studentKarina) {
        db.occurrences.push({
            id: "occ_active_atestado_karina",
            type: "atestado",
            studentId: studentKarina.id,
            studentName: studentKarina.name,
            classroom: studentKarina.classroom,
            date: activeAtestadoDate.toISOString().split("T")[0],
            startDate: activeAtestadoDate.toISOString().split("T")[0],
            days: 5,
            endDate: activeEndDate.toISOString().split("T")[0],
            cid: "J11",
            motive: "Conjuntivite infecciosa",
            obs: "Atenção ao reintroduzir a criança na sala de aula pós conjuntivite.",
            filePreview: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='300' height='200'><rect width='300' height='200' fill='%23fef2f2' stroke='%23f87171' stroke-width='2'/><text x='150' y='60' font-family='sans-serif' font-size='14' font-weight='bold' text-anchor='middle' fill='%23991b1b'>ATESTADO DE INFECÇÃO</text><text x='150' y='100' font-family='sans-serif' font-size='11' text-anchor='middle' fill='%23b91c1c'>Afastamento por Conjuntivite</text><line x1='50' y1='150' x2='250' y2='150' stroke='%23f87171' stroke-width='1'/><text x='150' y='165' font-family='sans-serif' font-size='9' text-anchor='middle' fill='%23ef4444'>Pediatra Dr. Carlos CRM 5543</text></svg>"
        });
    }

    // Faltas recorrentes nas segundas para Gabriel Nogueira (para gerar padrões pedagógicos)
    const studentGabriel = students.find(s => s.name === "Gabriel Nogueira");
    if (studentGabriel) {
        // Encontra as últimas 3 segundas-feiras
        let count = 0;
        let d = new Date(today);
        while (count < 3) {
            d.setDate(d.getDate() - 1);
            if (d.getDay() === 1) { // 1 = Segunda
                db.occurrences.push({
                    id: "occ_recurrent_falta_gabriel_" + count,
                    type: "falta",
                    studentId: studentGabriel.id,
                    studentName: studentGabriel.name,
                    classroom: studentGabriel.classroom,
                    date: d.toISOString().split("T")[0],
                    motive: "Compromisso familiar / Viagem",
                    justified: "sim",
                    notified: "sim",
                    obs: "Pais viajam frequentemente no final de semana prolongado."
                });
                count++;
            }
        }
    }

    saveDatabase();
}

// ==========================================================================
// TEMA CLARO / ESCURO (MODERN DESIGN SYSTEM)
// ==========================================================================
function initTheme() {
    const btn = document.getElementById("theme-toggle-btn");
    if (!btn) return;
    
    btn.addEventListener("click", () => {
        const body = document.body;
        if (body.classList.contains("light-mode")) {
            body.classList.remove("light-mode");
            body.classList.add("dark-mode");
            db.settings.theme = "dark";
        } else {
            body.classList.remove("dark-mode");
            body.classList.add("light-mode");
            db.settings.theme = "light";
        }
        saveDatabase();
        renderAllCharts(); // Recria os gráficos com as novas cores do tema!
    });
    
    // Carrega tema salvo
    if (db.settings.theme === "dark") {
        document.body.classList.remove("light-mode");
        document.body.classList.add("dark-mode");
    } else {
        document.body.classList.remove("dark-mode");
        document.body.classList.add("light-mode");
    }
}

// ==========================================================================
// ROTEADOR INTERNO SIMULADO (SPA EXPERIENCE)
// ==========================================================================
function initRouter() {
    const menuItems = document.querySelectorAll(".menu-item");
    const sections = document.querySelectorAll(".panel-section");
    const pageTitle = document.getElementById("page-title");
    const pageSubtitle = document.getElementById("page-subtitle");
    
    menuItems.forEach(item => {
        item.addEventListener("click", (e) => {
            e.preventDefault();
            
            const target = item.getAttribute("data-target");
            const module = item.getAttribute("data-module");
            
            // Remove active de todos os links e adiciona no selecionado
            menuItems.forEach(m => m.classList.remove("active"));
            item.classList.add("active");
            
            // Mostra apenas a seção correspondente
            sections.forEach(sec => sec.classList.remove("active"));
            
            // Tratamento especial para OCORRÊNCIAS
            if (target === "occurrences" && module) {
                const occSec = document.getElementById("occurrences-panel");
                occSec.classList.add("active");
                loadOccurrenceModule(module);
            } else {
                const targetSec = document.getElementById(target + "-panel");
                if (targetSec) {
                    targetSec.classList.add("active");
                }
            }
            
            // Atualiza cabeçalho com base na tela
            updatePageHeader(target, module);
            
            // Fecha sidebar no celular ao clicar em um item
            document.getElementById("sidebar").classList.remove("active");
            
            // Executa inicializadores de telas se necessário
            if (target === "students") {
                renderStudentsTable();
            } else if (target === "dashboard") {
                updateDashboardMetrics();
                renderAllCharts();
            } else if (target === "reports") {
                renderReportsTable();
            } else if (target === "insights") {
                renderInsightsPage();
            }
        });
    });
    
    // Toggles do Menu Mobile
    const toggleBtn = document.getElementById("menu-toggle-btn");
    const closeBtn = document.getElementById("close-sidebar-btn");
    const sidebar = document.getElementById("sidebar");
    
    if (toggleBtn) {
        toggleBtn.addEventListener("click", () => {
            sidebar.classList.add("active");
        });
    }
    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            sidebar.classList.remove("active");
        });
    }
}

function updatePageHeader(target, module) {
    const pageTitle = document.getElementById("page-title");
    const pageSubtitle = document.getElementById("page-subtitle");
    
    const headers = {
        dashboard: { title: "Dashboard Geral", sub: "Visão geral e inteligência de frequência hoje." },
        students: { title: "Cadastro de Alunos", sub: "Adicione, edite e acompanhe os alunos matriculados." },
        reports: { title: "Relatórios de Gestão", sub: "Gere pesquisas complexas e exporte em Excel ou PDF." },
        insights: { title: "Análise Inteligente & Insights", sub: "estudos de padrões de faltas, atrasos e saúde médica." },
        settings: { title: "Configurações", sub: "Ajuste as opções do portal escolar e simule bases." }
    };
    
    if (target === "occurrences" && module) {
        const modNames = {
            atrasos: { title: "Módulo de Atrasos", sub: "Controle diário de chegada de crianças atrasadas e justificativas." },
            saidas: { title: "Saídas Antecipadas", sub: "Registros de retiradas de crianças antes do horário e assinaturas." },
            atestados: { title: "Atestados Médicos", sub: "Controle de afastamentos preventivos e acompanhamento clínico." },
            faltas: { title: "Registro de Faltas", sub: "Frequência mensal, justificação e alertas de evasão escolar." },
            amamentacao: { title: "Sala de Amamentação", sub: "Uso do espaço para lactantes e controle de permanência." }
        };
        pageTitle.innerText = modNames[module].title;
        pageSubtitle.innerText = modNames[module].sub;
    } else if (headers[target]) {
        pageTitle.innerText = headers[target].title;
        pageSubtitle.innerText = headers[target].sub;
    }
}

// Carrega dados do módulo de ocorrência selecionado
function loadOccurrenceModule(module) {
    currentOccurrenceModule = module;
    
    const badge = document.getElementById("occurrence-module-badge");
    const desc = document.getElementById("occurrence-module-description");
    const btnText = document.getElementById("btn-add-occurrence-text");
    
    const meta = {
        atrasos: { label: "Atrasos", desc: "Registro e ranking de chegadas tardias das crianças na creche.", btn: "Registrar Atraso" },
        saidas: { label: "Saídas Antecipadas", desc: "Controle de saídas precoces autorizadas por assinatura digital.", btn: "Registrar Saída" },
        atestados: { label: "Atestados Médicos", desc: "Controle automático de afastamentos, atestados e retornos escolares.", btn: "Lançar Atestado" },
        faltas: { label: "Faltas", desc: "Gestão de faltas escolares, avisos prévios e frequência mensal.", btn: "Lançar Falta" },
        amamentacao: { label: "Sala de Amamentação", desc: "Controle da utilização do espaço especial pelas mães e lactentes.", btn: "Lançar Amamentação" }
    };
    
    badge.innerText = meta[module].label;
    badge.className = "module-badge occ-type-pill " + module;
    desc.innerText = meta[module].desc;
    btnText.innerText = meta[module].btn;
    
    renderOccurrencesTable();
}

// ==========================================================================
// SIMULADOR DE PERFIS E LOGIN (CONTROLE DE ACESSO)
// ==========================================================================
function initRoleSelector() {
    const trigger = document.getElementById("role-dropdown-trigger");
    const menu = document.getElementById("role-dropdown-menu");
    const options = document.querySelectorAll(".role-option");
    
    if (!trigger || !menu) return;
    
    trigger.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.classList.toggle("active");
    });
    
    document.addEventListener("click", () => {
        menu.classList.remove("active");
    });
    
    options.forEach(opt => {
        opt.addEventListener("click", (e) => {
            e.preventDefault();
            const role = opt.getAttribute("data-role");
            const name = opt.getAttribute("data-name");
            const avatar = opt.getAttribute("data-avatar");
            
            // Muda ativo
            options.forEach(o => o.classList.remove("active"));
            opt.classList.add("active");
            
            // Atualiza db e UI
            db.settings.activeRole = role;
            db.settings.activeUserName = name;
            db.settings.activeUserAvatar = avatar;
            saveDatabase();
            
            updateRoleUI();
        });
    });
    
    updateRoleUI();
}

function updateRoleUI() {
    const badge = document.getElementById("trigger-role-badge");
    const nameEl = document.getElementById("current-user-name");
    const avatarEl = document.getElementById("current-user-avatar");
    
    const roleClasses = {
        diretora: "badge-diretora",
        pedagoga: "badge-pedagoga",
        auxiliar: "badge-auxiliar"
    };
    
    const roleLabels = {
        diretora: "Diretoria",
        pedagoga: "Pedagogia",
        auxiliar: "Auxiliar"
    };
    
    badge.className = "role-badge " + roleClasses[db.settings.activeRole];
    badge.innerText = roleLabels[db.settings.activeRole];
    nameEl.innerText = db.settings.activeUserName;
    avatarEl.innerText = db.settings.activeUserAvatar;
    
    // Controle de Elementos com base no acesso
    const role = db.settings.activeRole;
    
    // Botões ou seções que exigem Diretoria
    document.querySelectorAll("[data-access]").forEach(el => {
        const required = el.getAttribute("data-access");
        if (required === "diretora" && role !== "diretora") {
            el.style.display = "none";
        } else {
            el.style.display = "inline-flex";
        }
    });

    // Se estiver em telas administrativas restritas, move para a inicial se o perfil atual for 'auxiliar'
    const activeSection = document.querySelector(".panel-section.active");
    if (activeSection && (activeSection.id === "settings-panel") && role === "auxiliar") {
        document.querySelector("[data-target='dashboard']").click();
    }
}

// ==========================================================================
// GERENCIAMENTO DE ALUNOS (CRUD COMPLETO)
// ==========================================================================
function initStudentCRUD() {
    const btnAdd = document.getElementById("btn-add-student");
    const modal = document.getElementById("student-modal");
    const form = document.getElementById("student-form");
    
    if (!btnAdd) return;
    
    btnAdd.addEventListener("click", () => {
        document.getElementById("student-modal-title").innerText = "Cadastrar Novo Aluno";
        form.reset();
        document.getElementById("student-form-id").value = "";
        document.getElementById("student-form-status-container").style.display = "none";
        modal.classList.add("active");
    });
    
    // Fechamento de modal
    document.querySelectorAll("[data-close]").forEach(btn => {
        btn.addEventListener("click", () => {
            const modalId = btn.getAttribute("data-close");
            document.getElementById(modalId).classList.remove("active");
        });
    });
    
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const id = document.getElementById("student-form-id").value;
        const name = document.getElementById("student-form-name").value.trim();
        const classroom = document.getElementById("student-form-classroom").value;
        
        if (id) {
            // Edição
            const student = db.students.find(s => s.id === id);
            if (student) {
                const status = document.getElementById("student-form-status").value;
                student.name = name;
                student.classroom = classroom;
                student.active = (status === "active");
            }
        } else {
            // Criação
            const newId = "student_" + Date.now();
            db.students.push({
                id: newId,
                name: name,
                classroom: classroom,
                active: true
            });
        }
        
        saveDatabase();
        modal.classList.remove("active");
        renderStudentsTable();
        updateDashboardMetrics();
    });
}

function renderStudentsTable() {
    const tbody = document.getElementById("students-table-body");
    const searchVal = document.getElementById("student-search-input").value.toLowerCase();
    const classFilter = document.getElementById("student-filter-classroom").value;
    const statusFilter = document.getElementById("student-filter-status").value;
    
    tbody.innerHTML = "";
    
    // Filtra alunos
    let filtered = db.students;
    
    if (searchVal) {
        filtered = filtered.filter(st => st.name.toLowerCase().includes(searchVal));
    }
    
    if (classFilter) {
        filtered = filtered.filter(st => st.classroom === classFilter);
    }
    
    if (statusFilter !== "all") {
        const targetActive = (statusFilter === "active");
        filtered = filtered.filter(st => st.active === targetActive);
    }
    
    // Ordena por nome
    filtered.sort((a, b) => a.name.localeCompare(b.name));
    
    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 40px;"><i data-lucide="info" style="margin: 0 auto 8px; width: 32px; height: 32px;"></i> Nenhum aluno encontrado.</td></tr>`;
        lucide.createIcons();
        return;
    }
    
    filtered.forEach(st => {
        // Estatísticas do aluno
        const delaysCount = db.occurrences.filter(o => o.studentId === st.id && o.type === "atraso").length;
        const faltasCount = db.occurrences.filter(o => o.studentId === st.id && o.type === "falta").length;
        const activeAtestados = db.occurrences.filter(o => {
            if (o.studentId !== st.id || o.type !== "atestado") return false;
            const today = new Date().toISOString().split("T")[0];
            return o.startDate <= today && o.endDate >= today;
        }).length;
        
        const tr = document.createElement("tr");
        
        // Coluna Status Pill
        const statusHtml = st.active 
            ? `<span class="status-pill active">Ativo</span>`
            : `<span class="status-pill inactive">Inativo</span>`;
            
        // Coluna Atestados
        const atestadosHtml = activeAtestados > 0
            ? `<span class="occ-type-pill atestado">Sim (${activeAtestados} ativo)</span>`
            : `<span class="text-light">-</span>`;
            
        // Ações autorizadas por Perfil
        const isDiretora = db.settings.activeRole === "diretora";
        const editBtnHtml = `<button class="row-action-btn" onclick="editStudent('${st.id}')" title="Editar"><i data-lucide="edit-2"></i></button>`;
        const toggleActiveBtnHtml = isDiretora
            ? `<button class="row-action-btn delete" onclick="toggleStudentActive('${st.id}')" title="${st.active ? 'Inativar' : 'Ativar'}"><i data-lucide="${st.active ? 'user-minus' : 'user-check'}"></i></button>`
            : "";

        tr.innerHTML = `
            <td>
                <div class="student-row-name-wrapper">
                    <span class="student-row-avatar">👦</span>
                    <span style="font-weight: 600;">${st.name}</span>
                </div>
            </td>
            <td><span class="occ-type-pill amamentacao" style="background-color: var(--color-primary-light); color: var(--color-primary);">${st.classroom}</span></td>
            <td>${statusHtml}</td>
            <td style="font-weight: 600; color: ${delaysCount > 3 ? 'var(--color-atrasos)' : 'inherit'}">${delaysCount}</td>
            <td style="font-weight: 600; color: ${faltasCount > 3 ? 'var(--color-faltas)' : 'inherit'}">${faltasCount}</td>
            <td>${atestadosHtml}</td>
            <td class="actions-column">
                <div class="action-row-buttons">
                    ${editBtnHtml}
                    ${toggleActiveBtnHtml}
                </div>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    lucide.createIcons();
}

// Funções chamadas por botões em linha na tabela de Alunos
window.editStudent = function(id) {
    const student = db.students.find(s => s.id === id);
    if (!student) return;
    
    document.getElementById("student-modal-title").innerText = "Editar Aluno";
    document.getElementById("student-form-id").value = student.id;
    document.getElementById("student-form-name").value = student.name;
    document.getElementById("student-form-classroom").value = student.classroom;
    document.getElementById("student-form-status").value = student.active ? "active" : "inactive";
    document.getElementById("student-form-status-container").style.display = "block";
    
    document.getElementById("student-modal").classList.add("active");
};

window.toggleStudentActive = function(id) {
    const student = db.students.find(s => s.id === id);
    if (!student) return;
    
    student.active = !student.active;
    saveDatabase();
    renderStudentsTable();
    updateDashboardMetrics();
};

// Vincula filtros e busca de Alunos
function initStudentCRUD() {
    // Re-vincula os submits
    const modal = document.getElementById("student-modal");
    const form = document.getElementById("student-form");
    
    if (form) {
        form.addEventListener("submit", (e) => {
            e.preventDefault();
            const id = document.getElementById("student-form-id").value;
            const name = document.getElementById("student-form-name").value.trim();
            const classroom = document.getElementById("student-form-classroom").value;
            
            if (id) {
                const student = db.students.find(s => s.id === id);
                if (student) {
                    const status = document.getElementById("student-form-status").value;
                    student.name = name;
                    student.classroom = classroom;
                    student.active = (status === "active");
                }
            } else {
                const newId = "student_" + Date.now();
                db.students.push({
                    id: newId,
                    name: name,
                    classroom: classroom,
                    active: true
                });
            }
            
            saveDatabase();
            modal.classList.remove("active");
            renderStudentsTable();
            updateDashboardMetrics();
        });
    }

    const searchInput = document.getElementById("student-search-input");
    const classFilter = document.getElementById("student-filter-classroom");
    const statusFilter = document.getElementById("student-filter-status");
    
    if (searchInput) searchInput.addEventListener("input", renderStudentsTable);
    if (classFilter) classFilter.addEventListener("change", renderStudentsTable);
    if (statusFilter) statusFilter.addEventListener("change", renderStudentsTable);
    
    const btnAdd = document.getElementById("btn-add-student");
    if (btnAdd) {
        btnAdd.addEventListener("click", () => {
            document.getElementById("student-modal-title").innerText = "Cadastrar Novo Aluno";
            form.reset();
            document.getElementById("student-form-id").value = "";
            document.getElementById("student-form-status-container").style.display = "none";
            modal.classList.add("active");
        });
    }
}

// ==========================================================================
// GERENCIADOR DE OCORRÊNCIAS - RENDER E TABELAS
// ==========================================================================
function renderOccurrencesTable() {
    const header = document.getElementById("occurrences-table-header");
    const tbody = document.getElementById("occurrences-table-body");
    const alertNoData = document.getElementById("no-occurrences-alert");
    
    tbody.innerHTML = "";
    
    // Obtém filtros
    const classFilter = document.getElementById("occ-filter-classroom").value;
    const searchVal = document.getElementById("occ-filter-search").value.toLowerCase();
    const dateFilter = document.getElementById("occ-filter-date").value;
    
    // Filtra dados do módulo específico
    let filtered = db.occurrences.filter(o => o.type === currentOccurrenceModule);
    
    if (classFilter) {
        filtered = filtered.filter(o => o.classroom === classFilter);
    }
    
    if (searchVal) {
        filtered = filtered.filter(o => o.studentName.toLowerCase().includes(searchVal));
    }
    
    if (dateFilter) {
        filtered = filtered.filter(o => o.date === dateFilter);
    }
    
    // Ordena por data decrescente (mais recentes primeiro)
    filtered.sort((a, b) => b.date.localeCompare(a.date));
    
    if (filtered.length === 0) {
        alertNoData.style.display = "flex";
        header.innerHTML = "";
        return;
    }
    
    alertNoData.style.display = "none";
    
    // Monta cabeçalho dinâmico com base no módulo
    const headers = {
        atrasos: `
            <tr>
                <th>Data</th>
                <th>Criança</th>
                <th>Sala</th>
                <th>Hora</th>
                <th>Motivo do Atraso</th>
                <th>Responsável</th>
                <th>Assinatura</th>
                <th class="actions-column">Ações</th>
            </tr>
        `,
        saidas: `
            <tr>
                <th>Data</th>
                <th>Criança</th>
                <th>Sala</th>
                <th>Hora Saída</th>
                <th>Motivo</th>
                <th>Retirado por</th>
                <th>Retorno?</th>
                <th class="actions-column">Ações</th>
            </tr>
        `,
        atestados: `
            <tr>
                <th>Reg.</th>
                <th>Criança</th>
                <th>Sala</th>
                <th>Afastamento</th>
                <th>Dias</th>
                <th>Retorno Previsto</th>
                <th>Motivo / Diagnóstico</th>
                <th class="actions-column">Ações</th>
            </tr>
        `,
        faltas: `
            <tr>
                <th>Data</th>
                <th>Criança</th>
                <th>Sala</th>
                <th>Motivo da Falta</th>
                <th>Justificada?</th>
                <th>Aviso Prévio?</th>
                <th class="actions-column">Ações</th>
            </tr>
        `,
        amamentacao: `
            <tr>
                <th>Data</th>
                <th>Criança</th>
                <th>Sala</th>
                <th>Mãe Presente</th>
                <th>Entrada</th>
                <th>Saída</th>
                <th>Permanência</th>
                <th class="actions-column">Ações</th>
            </tr>
        `
    };
    
    header.innerHTML = headers[currentOccurrenceModule];
    
    filtered.forEach(occ => {
        const tr = document.createElement("tr");
        
        // Conversão de Data para padrão BR
        const dParts = occ.date.split("-");
        const dateBR = `${dParts[2]}/${dParts[1]}/${dParts[0]}`;
        
        // Ações base
        const isDiretora = db.settings.activeRole === "diretora";
        const viewBtn = `<button class="row-action-btn" onclick="viewOccurrenceReceipt('${occ.id}')" title="Ver Recibo"><i data-lucide="eye"></i></button>`;
        const delBtn = isDiretora 
            ? `<button class="row-action-btn delete" onclick="deleteOccurrence('${occ.id}')" title="Excluir"><i data-lucide="trash-2"></i></button>`
            : "";
            
        const actionsHtml = `<td class="actions-column"><div class="action-row-buttons">${viewBtn}${delBtn}</div></td>`;
        
        if (currentOccurrenceModule === "atrasos") {
            const sigHtml = occ.signature 
                ? `<span class="occ-type-pill atestados" style="background-color: #d1fae5; color: #065f46; font-size: 9px;">Assinado Digital</span>` 
                : `<span class="text-light">Nenhuma</span>`;
                
            tr.innerHTML = `
                <td><strong>${dateBR}</strong></td>
                <td><span style="font-weight:600;">${occ.studentName}</span></td>
                <td><span class="occ-type-pill saida" style="background-color: var(--color-saidas-bg); color: var(--color-saidas);">${occ.classroom}</span></td>
                <td><strong>${occ.time}</strong></td>
                <td>${occ.motive}</td>
                <td>${occ.guardian}</td>
                <td>${sigHtml}</td>
                ${actionsHtml}
            `;
        } else if (currentOccurrenceModule === "saidas") {
            const returnText = occ.hasReturn === "sim" 
                ? `<span class="status-pill active" style="font-size: 10px;">Sim (${occ.returnTime})</span>` 
                : `<span class="status-pill inactive" style="font-size: 10px;">Não</span>`;
                
            tr.innerHTML = `
                <td><strong>${dateBR}</strong></td>
                <td><span style="font-weight:600;">${occ.studentName}</span></td>
                <td><span class="occ-type-pill saida" style="background-color: var(--color-saidas-bg); color: var(--color-saidas);">${occ.classroom}</span></td>
                <td><strong>${occ.time}</strong></td>
                <td>${occ.motive}</td>
                <td>${occ.guardian}</td>
                <td>${returnText}</td>
                ${actionsHtml}
            `;
        } else if (currentOccurrenceModule === "atestados") {
            const startParts = occ.startDate.split("-");
            const startBR = `${startParts[2]}/${startParts[1]}`;
            const endParts = occ.endDate.split("-");
            const endBR = `${endParts[2]}/${endParts[1]}/${endParts[0]}`;
            
            // Verifica se está afastado atualmente
            const today = new Date().toISOString().split("T")[0];
            const activeBadge = (occ.startDate <= today && occ.endDate >= today)
                ? `<span class="status-pill active" style="font-size:9.5px; padding: 2px 6px;">Afastado</span>`
                : `<span class="status-pill inactive" style="background-color: var(--bg-input); color: var(--text-secondary); font-size:9.5px; padding: 2px 6px;">Finalizado</span>`;

            tr.innerHTML = `
                <td>${dateBR}</td>
                <td><span style="font-weight:600;">${occ.studentName}</span></td>
                <td><span class="occ-type-pill saida" style="background-color: var(--color-saidas-bg); color: var(--color-saidas);">${occ.classroom}</span></td>
                <td>de <strong>${startBR}</strong> a <strong>${endBR.substr(0,5)}</strong></td>
                <td><strong>${occ.days} dias</strong></td>
                <td>${endBR} ${activeBadge}</td>
                <td><span class="occ-type-pill atestado">${occ.motive}</span></td>
                ${actionsHtml}
            `;
        } else if (currentOccurrenceModule === "faltas") {
            const justBadge = occ.justified === "sim"
                ? `<span class="status-pill active" style="font-size:10px;">Justificada</span>`
                : `<span class="status-pill inactive" style="font-size:10px;">Não Just.</span>`;
            const notifiedBadge = occ.notified === "sim"
                ? `<span class="status-pill active" style="font-size:10px;">Avisou</span>`
                : `<span class="text-light">-</span>`;
                
            tr.innerHTML = `
                <td><strong>${dateBR}</strong></td>
                <td><span style="font-weight:600;">${occ.studentName}</span></td>
                <td><span class="occ-type-pill saida" style="background-color: var(--color-saidas-bg); color: var(--color-saidas);">${occ.classroom}</span></td>
                <td>${occ.motive}</td>
                <td>${justBadge}</td>
                <td>${notifiedBadge}</td>
                ${actionsHtml}
            `;
        } else if (currentOccurrenceModule === "amamentacao") {
            // Calcula tempo de permanência
            let diffStr = "N/A";
            if (occ.timeIn && occ.timeOut) {
                const [hIn, mIn] = occ.timeIn.split(":").map(Number);
                const [hOut, mOut] = occ.timeOut.split(":").map(Number);
                const minDiff = (hOut * 60 + mOut) - (hIn * 60 + mIn);
                diffStr = minDiff > 0 ? `${minDiff} min` : "0 min";
            }
            
            tr.innerHTML = `
                <td><strong>${dateBR}</strong></td>
                <td><span style="font-weight:600;">${occ.studentName}</span></td>
                <td><span class="occ-type-pill saida" style="background-color: var(--color-saidas-bg); color: var(--color-saidas);">${occ.classroom}</span></td>
                <td>${occ.guardian}</td>
                <td><strong>${occ.timeIn}</strong></td>
                <td><strong>${occ.timeOut}</strong></td>
                <td style="font-weight:700; color: var(--color-amamentacao);">${diffStr}</td>
                ${actionsHtml}
            `;
        }
        
        tbody.appendChild(tr);
    });
    
    lucide.createIcons();
}

window.deleteOccurrence = function(id) {
    if (confirm("Tem certeza que deseja excluir permanentemente esta ocorrência?")) {
        db.occurrences = db.occurrences.filter(o => o.id !== id);
        saveDatabase();
        renderOccurrencesTable();
        updateDashboardMetrics();
    }
};

// ==========================================================================
// FILTROS DO COMPONENTE DE OCORRÊNCIAS
// ==========================================================================
function initFilters() {
    const classF = document.getElementById("occ-filter-classroom");
    const searchF = document.getElementById("occ-filter-search");
    const dateF = document.getElementById("occ-filter-date");
    
    if (classF) classF.addEventListener("change", renderOccurrencesTable);
    if (searchF) searchF.addEventListener("input", renderOccurrencesTable);
    if (dateF) dateF.addEventListener("change", renderOccurrencesTable);
}

// ==========================================================================
// AUTOCOMPLETE E BUSCA INTELIGENTE DE ALUNOS NOS REGISTROS
// ==========================================================================
function initAutocomplete() {
    const input = document.getElementById("occ-student-search");
    const dropdown = document.getElementById("occ-student-autocomplete-dropdown");
    const hiddenId = document.getElementById("occ-student-id");
    const classInput = document.getElementById("occ-student-classroom");
    
    if (!input || !dropdown) return;
    
    input.addEventListener("input", () => {
        const val = input.value.toLowerCase().trim();
        dropdown.innerHTML = "";
        
        if (!val) {
            dropdown.classList.remove("active");
            return;
        }
        
        // Filtra alunos ativos
        const matches = db.students.filter(s => s.active && s.name.toLowerCase().includes(val));
        
        if (matches.length === 0) {
            dropdown.classList.remove("active");
            return;
        }
        
        matches.slice(0, 5).forEach(st => {
            const div = document.createElement("div");
            div.className = "autocomplete-item";
            div.innerHTML = `
                <span class="autocomplete-item-name">${st.name}</span>
                <span class="autocomplete-item-class">${st.classroom}</span>
            `;
            
            div.addEventListener("click", () => {
                input.value = st.name;
                hiddenId.value = st.id;
                classInput.value = st.classroom;
                dropdown.classList.remove("active");
            });
            
            dropdown.appendChild(div);
        });
        
        dropdown.classList.add("active");
    });
    
    // Fecha autocomplete ao clicar fora
    document.addEventListener("click", (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove("active");
        }
    });
}

// ==========================================================================
// FORMULÁRIOS DE OCORRÊNCIAS & CANVAS DE ASSINATURA DIGITAL
// ==========================================================================
function initOccurrenceForms() {
    const modal = document.getElementById("occurrence-modal");
    const form = document.getElementById("occurrence-form");
    const btnOpen = document.getElementById("btn-add-occurrence");
    const headerQuickBtn = document.getElementById("header-quick-action-btn");
    const typeSelectorContainer = document.getElementById("occ-modal-type-selector-container");
    
    if (!form || !modal) return;
    
    // Evento de abertura pela tela de Módulos (Pré-selecionado e trava tipo)
    if (btnOpen) {
        btnOpen.addEventListener("click", () => {
            openOccurrenceModal(currentOccurrenceModule, true);
        });
    }
    
    // Evento de abertura pelo botão rápido no Header (Escolha livre)
    if (headerQuickBtn) {
        headerQuickBtn.addEventListener("click", () => {
            openOccurrenceModal("atraso", false);
        });
    }
    
    // Gerenciador de cliques nos botões de rádio do tipo de ocorrência
    const radioLabels = document.querySelectorAll(".module-radio-buttons .radio-btn");
    radioLabels.forEach(label => {
        label.addEventListener("click", () => {
            radioLabels.forEach(l => l.classList.remove("active"));
            label.classList.add("active");
            
            const selectedType = label.getAttribute("data-type");
            switchOccurrenceFormFields(selectedType);
        });
    });
    
    // Toggle de Retorno de Saída
    const btnRetSim = document.getElementById("btn-saida-retorno-sim");
    const btnRetNao = document.getElementById("btn-saida-retorno-nao");
    const returnTimeGroup = document.getElementById("saida-return-time-group");
    
    if (btnRetSim && btnRetNao) {
        btnRetSim.addEventListener("click", () => {
            btnRetSim.classList.add("active");
            btnRetNao.classList.remove("active");
            returnTimeGroup.style.display = "block";
            document.getElementById("saida-return-time").required = true;
        });
        btnRetNao.addEventListener("click", () => {
            btnRetNao.classList.add("active");
            btnRetSim.classList.remove("active");
            returnTimeGroup.style.display = "none";
            document.getElementById("saida-return-time").required = false;
        });
    }

    // Toggle de Justificativa Falta
    const btnFaltaJustSim = document.getElementById("btn-falta-just-sim");
    const btnFaltaJustNao = document.getElementById("btn-falta-just-nao");
    if (btnFaltaJustSim && btnFaltaJustNao) {
        btnFaltaJustSim.addEventListener("click", () => {
            btnFaltaJustSim.classList.add("active");
            btnFaltaJustNao.classList.remove("active");
        });
        btnFaltaJustNao.addEventListener("click", () => {
            btnFaltaJustNao.classList.add("active");
            btnFaltaJustSim.classList.remove("active");
        });
    }

    // Toggle de Aviso Falta
    const btnFaltaAvisoSim = document.getElementById("btn-falta-aviso-sim");
    const btnFaltaAvisoNao = document.getElementById("btn-falta-aviso-nao");
    if (btnFaltaAvisoSim && btnFaltaAvisoNao) {
        btnFaltaAvisoSim.addEventListener("click", () => {
            btnFaltaAvisoSim.classList.add("active");
            btnFaltaAvisoNao.classList.remove("active");
        });
        btnFaltaAvisoNao.addEventListener("click", () => {
            btnFaltaAvisoNao.classList.add("active");
            btnFaltaAvisoSim.classList.remove("active");
        });
    }
    
    // Atestado: Cálculo automático da data de retorno
    const atDays = document.getElementById("atestado-days");
    const atStart = document.getElementById("atestado-start-date");
    const atEnd = document.getElementById("atestado-end-date");
    
    function calcAtestadoEndDate() {
        if (!atStart.value || !atDays.value) return;
        const start = new Date(atStart.value + "T00:00:00");
        const days = parseInt(atDays.value);
        if (isNaN(days) || days < 1) return;
        
        const end = new Date(start);
        end.setDate(start.getDate() + days - 1);
        atEnd.value = end.toISOString().split("T")[0];
    }
    
    if (atDays) atDays.addEventListener("input", calcAtestadoEndDate);
    if (atStart) atStart.addEventListener("change", calcAtestadoEndDate);
    
    // Atestado: Simulação de Foto de Comprovante (File input preview)
    const uploadBox = document.getElementById("atestado-upload-box");
    const fileInput = document.getElementById("atestado-file-input");
    const previewContainer = document.getElementById("atestado-preview-container");
    const previewImg = document.getElementById("atestado-preview-img");
    const btnRemovePreview = document.getElementById("btn-remove-atestado-preview");
    
    if (uploadBox && fileInput) {
        uploadBox.addEventListener("click", () => fileInput.click());
        fileInput.addEventListener("change", (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    previewImg.src = event.target.result;
                    previewContainer.style.display = "block";
                    uploadBox.style.display = "none";
                };
                reader.readAsDataURL(file);
            }
        });
        
        btnRemovePreview.addEventListener("click", () => {
            fileInput.value = "";
            previewImg.src = "";
            previewContainer.style.display = "none";
            uploadBox.style.display = "flex";
        });
    }
    
    // atrasos: mudança do motivo "Outro"
    const atrReason = document.getElementById("atraso-reason");
    const atrCustom = document.getElementById("atraso-reason-custom-group");
    if (atrReason) {
        atrReason.addEventListener("change", () => {
            if (atrReason.value === "Outros") {
                atrCustom.style.display = "block";
                document.getElementById("atraso-reason-custom").required = true;
            } else {
                atrCustom.style.display = "none";
                document.getElementById("atraso-reason-custom").required = false;
            }
        });
    }

    // Submit de Ocorrência
    form.addEventListener("submit", (e) => {
        e.preventDefault();
        
        const type = document.getElementById("occ-form-type-hidden").value;
        const studentId = document.getElementById("occ-student-id").value;
        const studentName = document.getElementById("occ-student-search").value;
        const classroom = document.getElementById("occ-student-classroom").value;
        
        if (!studentId || !studentName) {
            alert("Por favor, selecione um aluno válido da lista.");
            return;
        }
        
        // Objeto genérico
        let occData = {
            id: "occ_" + Date.now(),
            type: type,
            studentId: studentId,
            studentName: studentName,
            classroom: classroom
        };
        
        // Coleta específica baseada no tipo
        if (type === "atraso") {
            const signatureCanvas = document.getElementById("atraso-signature-canvas");
            // Verifica se o canvas está vazio (se o usuário não assinou nada e não temos assinatura antiga)
            if (isCanvasEmpty(signatureCanvas)) {
                alert("Por favor, a assinatura do responsável é obrigatória.");
                return;
            }
            
            const reason = document.getElementById("atraso-reason").value;
            const customMotive = document.getElementById("atraso-reason-custom").value;
            
            occData.date = document.getElementById("atraso-date").value;
            occData.time = document.getElementById("atraso-time").value;
            occData.motive = reason === "Outros" ? customMotive : reason;
            occData.guardian = document.getElementById("atraso-guardian").value.trim();
            occData.staff = document.getElementById("atraso-staff").value;
            occData.obs = document.getElementById("atraso-obs").value.trim();
            occData.signature = signatureCanvas.toDataURL("image/png");
            
        } else if (type === "saida") {
            const signatureCanvas = document.getElementById("saida-signature-canvas");
            if (isCanvasEmpty(signatureCanvas)) {
                alert("A assinatura do responsável de retirada é obrigatória.");
                return;
            }
            
            const hasReturn = document.querySelector('input[name="saida-retorno"]:checked').value;
            
            occData.date = document.getElementById("saida-date").value;
            occData.time = document.getElementById("saida-time").value;
            occData.motive = document.getElementById("saida-reason").value;
            occData.guardian = document.getElementById("saida-guardian").value.trim();
            occData.hasReturn = hasReturn;
            occData.returnTime = hasReturn === "sim" ? document.getElementById("saida-return-time").value : "";
            occData.obs = document.getElementById("saida-obs").value.trim();
            occData.signature = signatureCanvas.toDataURL("image/png");
            
        } else if (type === "atestado") {
            const fileContainer = document.getElementById("atestado-preview-container");
            const previewImgSrc = document.getElementById("atestado-preview-img").src;
            
            if (fileContainer.style.display === "none" || !previewImgSrc) {
                alert("O upload do atestado digitalizado é obrigatório.");
                return;
            }
            
            occData.date = document.getElementById("atestado-reg-date").value;
            occData.startDate = document.getElementById("atestado-start-date").value;
            occData.days = parseInt(document.getElementById("atestado-days").value);
            occData.endDate = document.getElementById("atestado-end-date").value;
            occData.cid = document.getElementById("atestado-cid").value.trim();
            occData.motive = document.getElementById("atestado-reason").value;
            occData.filePreview = previewImgSrc;
            occData.obs = document.getElementById("atestado-obs").value.trim();
            
        } else if (type === "falta") {
            const just = document.querySelector('input[name="falta-justificada"]:checked').value;
            const notification = document.querySelector('input[name="falta-aviso"]:checked').value;
            
            occData.date = document.getElementById("falta-date").value;
            occData.motive = document.getElementById("falta-reason").value;
            occData.justified = just;
            occData.notified = notification;
            occData.obs = document.getElementById("falta-obs").value.trim();
            
        } else if (type === "amamentacao") {
            occData.date = document.getElementById("amam-date").value;
            occData.timeIn = document.getElementById("amam-time-in").value;
            occData.timeOut = document.getElementById("amam-time-out").value;
            occData.guardian = document.getElementById("amam-guardian").value.trim();
            occData.obs = document.getElementById("amam-obs").value.trim();
        }
        
        // Adiciona e salva
        db.occurrences.push(occData);
        saveDatabase();
        
        // Fecha modal e atualiza listagem e dashboard
        modal.classList.remove("active");
        
        // Se estiver no painel de ocorrências correspondente, atualiza a tabela
        if (document.getElementById("occurrences-panel").classList.contains("active") && type === currentOccurrenceModule) {
            renderOccurrencesTable();
        }
        
        updateDashboardMetrics();
        alert("Ocorrência registrada com sucesso!");
    });
}

// Abre o modal de ocorrências configurando campos iniciais rápidos
function openOccurrenceModal(type, forceType = false) {
    const modal = document.getElementById("occurrence-modal");
    const typeSelectorContainer = document.getElementById("occ-modal-type-selector-container");
    const form = document.getElementById("occurrence-form");
    
    // Reseta form e previews
    form.reset();
    document.getElementById("occ-student-id").value = "";
    document.getElementById("occ-student-classroom").value = "";
    document.getElementById("btn-remove-atestado-preview").click(); // Reseta atestado
    
    // Reseta assinaturas canvas
    clearSignatureCanvas("atraso-signature-canvas");
    clearSignatureCanvas("saida-signature-canvas");
    
    // Autopreenchimento de Datas Atuais
    const todayStr = new Date().toISOString().split("T")[0];
    const nowTimeStr = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    
    // Datas
    const idsDate = ["atraso-date", "saida-date", "atestado-reg-date", "atestado-start-date", "falta-date", "amam-date"];
    idsDate.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = todayStr;
    });
    
    // Horas
    if (document.getElementById("atraso-time")) document.getElementById("atraso-time").value = nowTimeStr;
    if (document.getElementById("saida-time")) document.getElementById("saida-time").value = nowTimeStr;
    if (document.getElementById("amam-time-in")) document.getElementById("amam-time-in").value = nowTimeStr;
    
    // Autopreenchimento do funcionário
    if (document.getElementById("atraso-staff")) {
        document.getElementById("atraso-staff").value = db.settings.activeUserName;
    }
    
    // Força tipo selecionado (Esconde rádio) ou permite escolha
    if (forceType) {
        typeSelectorContainer.style.display = "none";
        switchOccurrenceFormFields(type);
    } else {
        typeSelectorContainer.style.display = "block";
        // Marca rádio correto
        const radioLabels = document.querySelectorAll(".module-radio-buttons .radio-btn");
        radioLabels.forEach(label => {
            const radType = label.getAttribute("data-type");
            if (radType === type) {
                label.classList.add("active");
            } else {
                label.classList.remove("active");
            }
        });
        switchOccurrenceFormFields(type);
    }
    
    modal.classList.add("active");
    
    // Redesenha os canvas de assinatura para estarem no tamanho correto pós layout do modal
    setTimeout(() => {
        resizeCanvas("atraso-signature-canvas");
        resizeCanvas("saida-signature-canvas");
    }, 100);
}

// Controla a visibilidade dos blocos do formulário
function switchOccurrenceFormFields(type) {
    document.getElementById("occ-form-type-hidden").value = type;
    
    const emojiMap = { atraso: "⏰", saida: "🚪", atestado: "🏥", falta: "❌", amamentacao: "🍼" };
    const titleMap = { atraso: "Registrar Atraso", saida: "Registrar Saída Antecipada", atestado: "Registrar Atestado Médico", falta: "Lançar Falta Escolar", amamentacao: "Uso da Sala de Amamentação" };
    
    document.getElementById("occ-modal-emoji").innerText = emojiMap[type];
    document.getElementById("occ-modal-title").innerText = titleMap[type];
    
    // Esconde todos os containers dinâmicos
    const sections = ["atraso", "saida", "atestado", "falta", "amamentacao"];
    sections.forEach(s => {
        const el = document.getElementById("fields-" + s);
        if (el) {
            el.style.display = "none";
            // Desativa requireds internos de campos escondidos para não travar submit
            el.querySelectorAll("[required]").forEach(req => req.required = false);
        }
    });
    
    // Mostra container do tipo correto e ativa requireds
    const targetSection = document.getElementById("fields-" + type);
    if (targetSection) {
        targetSection.style.display = "block";
        // Reativa rules nos campos visíveis
        if (type === "atraso") {
            document.getElementById("atraso-date").required = true;
            document.getElementById("atraso-time").required = true;
            document.getElementById("atraso-reason").required = true;
            document.getElementById("atraso-guardian").required = true;
        } else if (type === "saida") {
            document.getElementById("saida-date").required = true;
            document.getElementById("saida-time").required = true;
            document.getElementById("saida-reason").required = true;
            document.getElementById("saida-guardian").required = true;
        } else if (type === "atestado") {
            document.getElementById("atestado-start-date").required = true;
            document.getElementById("atestado-days").required = true;
            document.getElementById("atestado-reason").required = true;
        } else if (type === "falta") {
            document.getElementById("falta-date").required = true;
            document.getElementById("falta-reason").required = true;
        } else if (type === "amamentacao") {
            document.getElementById("amam-date").required = true;
            document.getElementById("amam-time-in").required = true;
            document.getElementById("amam-time-out").required = true;
            document.getElementById("amam-guardian").required = true;
        }
    }
}

// Configura o Canvas de Desenho da Assinatura
function setupCanvas(canvasId, clearBtnId, type) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let drawing = false;
    
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    
    canvases[type] = canvas;
    
    function getPos(e) {
        const r = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - r.left) * (canvas.width / r.width),
            y: (clientY - r.top) * (canvas.height / r.height)
        };
    }
    
    function startDraw(e) {
        drawing = true;
        const pos = getPos(e);
        ctx.beginPath();
        ctx.moveTo(pos.x, pos.y);
        e.preventDefault();
    }
    
    function draw(e) {
        if (!drawing) return;
        const pos = getPos(e);
        ctx.lineTo(pos.x, pos.y);
        ctx.stroke();
        e.preventDefault();
    }
    
    function stopDraw() {
        drawing = false;
    }
    
    canvas.addEventListener("mousedown", startDraw);
    canvas.addEventListener("mousemove", draw);
    window.addEventListener("mouseup", stopDraw);
    
    canvas.addEventListener("touchstart", startDraw);
    canvas.addEventListener("touchmove", draw);
    canvas.addEventListener("touchend", stopDraw);
    
    const clearBtn = document.getElementById(clearBtnId);
    if (clearBtn) {
        clearBtn.addEventListener("click", () => {
            clearSignatureCanvas(canvasId);
        });
    }
}

function resizeCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = 150;
    
    // Redefine propriedades do pincel pois o resize apaga o contexto
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
}

function clearSignatureCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Verifica se o canvas possui algum pixel desenhado (não está em branco)
function isCanvasEmpty(canvas) {
    if (!canvas) return true;
    const ctx = canvas.getContext("2d");
    const buffer = new Uint32Array(ctx.getImageData(0, 0, canvas.width, canvas.height).data.buffer);
    return !buffer.some(color => color !== 0);
}

// ==========================================================================
// VISUALIZADOR DE RECIBOS E COMPROVANTES (MODAL DE COMPROVANTE)
// ==========================================================================
window.viewOccurrenceReceipt = function(id) {
    const occ = db.occurrences.find(o => o.id === id);
    if (!occ) return;
    
    const modal = document.getElementById("view-record-modal");
    const body = document.getElementById("view-record-modal-body");
    
    const dParts = occ.date.split("-");
    const dateBR = `${dParts[2]}/${dParts[1]}/${dParts[0]}`;
    
    const labels = {
        atraso: "Atraso na Entrada",
        saida: "Saída Antecipada",
        atestado: "Afastamento Médico",
        falta: "Falta Escolar",
        amamentacao: "Sala de Amamentação"
    };
    
    let specificBodyHtml = "";
    
    if (occ.type === "atraso") {
        specificBodyHtml = `
            <div class="receipt-row"><span class="receipt-label">Hora da Chegada:</span><span class="receipt-value">${occ.time}</span></div>
            <div class="receipt-row"><span class="receipt-label">Responsável que Trouxe:</span><span class="receipt-value">${occ.guardian}</span></div>
            <div class="receipt-row"><span class="receipt-label">Funcionário Recebedor:</span><span class="receipt-value">${occ.staff || 'Ana Clara'}</span></div>
            <div class="receipt-row"><span class="receipt-label">Motivo Declarado:</span><span class="receipt-value">${occ.motive}</span></div>
            <div class="receipt-row"><span class="receipt-label">Observações:</span><span class="receipt-value">${occ.obs || 'Nenhuma'}</span></div>
            ${occ.signature ? `
                <div class="receipt-signature-box">
                    <img src="${occ.signature}" class="receipt-signature-image" alt="Assinatura Digital">
                    <span class="receipt-signature-label">Assinatura Digital do Responsável</span>
                </div>
            ` : ""}
        `;
    } else if (occ.type === "saida") {
        specificBodyHtml = `
            <div class="receipt-row"><span class="receipt-label">Hora da Retirada:</span><span class="receipt-value">${occ.time}</span></div>
            <div class="receipt-row"><span class="receipt-label">Retirado por (Responsável):</span><span class="receipt-value">${occ.guardian}</span></div>
            <div class="receipt-row"><span class="receipt-label">Motivo da Saída:</span><span class="receipt-value">${occ.motive}</span></div>
            <div class="receipt-row"><span class="receipt-label">Retorna Hoje?</span><span class="receipt-value">${occ.hasReturn === 'sim' ? `Sim (${occ.returnTime})` : 'Não'}</span></div>
            <div class="receipt-row"><span class="receipt-label">Observações:</span><span class="receipt-value">${occ.obs || 'Nenhuma'}</span></div>
            ${occ.signature ? `
                <div class="receipt-signature-box">
                    <img src="${occ.signature}" class="receipt-signature-image" alt="Assinatura Autorizada">
                    <span class="receipt-signature-label">Assinatura de Retirada</span>
                </div>
            ` : ""}
        `;
    } else if (occ.type === "atestado") {
        const startBR = occ.startDate.split("-").reverse().join("/");
        const endBR = occ.endDate.split("-").reverse().join("/");
        specificBodyHtml = `
            <div class="receipt-row"><span class="receipt-label">Período de Afastamento:</span><span class="receipt-value">de ${startBR} a ${endBR}</span></div>
            <div class="receipt-row"><span class="receipt-label">Total de Dias Úteis/Corridos:</span><span class="receipt-value">${occ.days} dias</span></div>
            <div class="receipt-row"><span class="receipt-label">Diagnóstico / CID:</span><span class="receipt-value">${occ.motive} (${occ.cid || 'Não especificado'})</span></div>
            <div class="receipt-row"><span class="receipt-label">Observações Médicas:</span><span class="receipt-value">${occ.obs || 'Nenhuma'}</span></div>
            ${occ.filePreview ? `
                <div class="receipt-signature-box" style="background-color: var(--bg-input);">
                    <img src="${occ.filePreview}" style="max-height: 120px; border-radius: var(--radius-sm);" alt="Preview Atestado">
                    <span class="receipt-signature-label" style="border:none;">Documento Médico Digitalizado</span>
                </div>
            ` : ""}
        `;
    } else if (occ.type === "falta") {
        specificBodyHtml = `
            <div class="receipt-row"><span class="receipt-label">Motivo Declarado:</span><span class="receipt-value">${occ.motive}</span></div>
            <div class="receipt-row"><span class="receipt-label">Justificada pelos Pais?</span><span class="receipt-value">${occ.justified === 'sim' ? 'Sim' : 'Não'}</span></div>
            <div class="receipt-row"><span class="receipt-label">Houve aviso prévio?</span><span class="receipt-value">${occ.notified === 'sim' ? 'Sim' : 'Não'}</span></div>
            <div class="receipt-row"><span class="receipt-label">Observações:</span><span class="receipt-value">${occ.obs || 'Nenhuma'}</span></div>
        `;
    } else if (occ.type === "amamentacao") {
        specificBodyHtml = `
            <div class="receipt-row"><span class="receipt-label">Mãe / Responsável Presente:</span><span class="receipt-value">${occ.guardian}</span></div>
            <div class="receipt-row"><span class="receipt-label">Hora da Entrada:</span><span class="receipt-value">${occ.timeIn}</span></div>
            <div class="receipt-row"><span class="receipt-label">Hora da Saída:</span><span class="receipt-value">${occ.timeOut}</span></div>
            <div class="receipt-row"><span class="receipt-label">Observações:</span><span class="receipt-value">${occ.obs || 'Nenhuma'}</span></div>
        `;
    }
    
    body.innerHTML = `
        <div class="receipt-header">
            <span class="receipt-logo">🧸</span>
            <h3 class="receipt-title">EducaGestão Creche</h3>
            <span class="receipt-subtitle">${labels[occ.type]}</span>
        </div>
        <div class="receipt-body">
            <div class="receipt-row"><span class="receipt-label">Nome do Aluno:</span><span class="receipt-value" style="font-size: 15px; color: var(--color-primary);">${occ.studentName}</span></div>
            <div class="receipt-row"><span class="receipt-label">Sala / Turma:</span><span class="receipt-value">${occ.classroom}</span></div>
            <div class="receipt-row"><span class="receipt-label">Data do Registro:</span><span class="receipt-value">${dateBR}</span></div>
            <div style="border-top: 1px dashed var(--border-color); margin: 8px 0;"></div>
            ${specificBodyHtml}
        </div>
    `;
    
    // Configura Botão de Impressão Rápida para o VOUCHER específico
    const btnPrint = document.getElementById("btn-print-single-record");
    if (btnPrint) {
        btnPrint.onclick = () => {
            window.print();
        };
    }

    modal.classList.add("active");
};

// ==========================================================================
// INDICADORES DO PAINEL GERAL (DASHBOARD)
// ==========================================================================
function updateDashboardMetrics() {
    const today = new Date().toISOString().split("T")[0];
    const occurrences = db.occurrences;
    
    // Filtros Atuais do Dashboard
    const fStart = document.getElementById("dash-filter-date-start").value;
    const fEnd = document.getElementById("dash-filter-date-end").value;
    const fClass = document.getElementById("dash-filter-classroom").value;
    const fStudent = document.getElementById("dash-filter-student").value;
    
    let filtered = occurrences;
    
    if (fStart) filtered = filtered.filter(o => o.date >= fStart);
    if (fEnd) filtered = filtered.filter(o => o.date <= fEnd);
    if (fClass) filtered = filtered.filter(o => o.classroom === fClass);
    if (fStudent) filtered = filtered.filter(o => o.studentId === fStudent);
    
    // 1. Contador Atrasos
    const delayList = filtered.filter(o => o.type === "atraso");
    document.getElementById("card-metric-atrasos").innerText = delayList.length;
    // Calcula minutos fictícios acumulados
    let totalMinutes = 0;
    delayList.forEach(occ => {
        if (occ.time) {
            const [h, m] = occ.time.split(":").map(Number);
            const lateMin = (h * 60 + m) - (8 * 60); // Atraso em relação às 08:00
            if (lateMin > 0) totalMinutes += lateMin;
        }
    });
    document.getElementById("card-metric-atrasos-sub").innerText = `${totalMinutes} min de atraso no período`;
    
    // 2. Contador Faltas
    const lackList = filtered.filter(o => o.type === "falta");
    document.getElementById("card-metric-faltas").innerText = lackList.length;
    const lackJust = lackList.filter(o => o.justified === "sim").length;
    document.getElementById("card-metric-faltas-sub").innerText = `${lackJust} faltas justificadas pelos pais`;
    
    // 3. Contador Atestados
    const atestList = filtered.filter(o => o.type === "atestado");
    document.getElementById("card-metric-atestados").innerText = atestList.length;
    // Contagem de atestados ativos HOJE
    const activeAtestToday = occurrences.filter(o => {
        if (o.type !== "atestado") return false;
        if (fClass && o.classroom !== fClass) return false;
        if (fStudent && o.studentId !== fStudent) return false;
        return o.startDate <= today && o.endDate >= today;
    }).length;
    document.getElementById("card-metric-atestados-sub").innerText = `${activeAtestToday} crianças afastadas hoje`;
    
    // 4. Contador Saídas Antecipadas
    const outList = filtered.filter(o => o.type === "saida");
    document.getElementById("card-metric-saidas").innerText = outList.length;
    const retsToday = outList.filter(o => o.hasReturn === "sim").length;
    document.getElementById("card-metric-saidas-sub").innerText = `${retsToday} com horários de retorno programados`;
    
    // 5. Contador Sala de Amamentação
    const amamList = filtered.filter(o => o.type === "amamentacao");
    document.getElementById("card-metric-amamentacao").innerText = amamList.length;
    // Calcula tempo médio
    let totalAmamMins = 0;
    amamList.forEach(o => {
        if (o.timeIn && o.timeOut) {
            const [hIn, mIn] = o.timeIn.split(":").map(Number);
            const [hOut, mOut] = o.timeOut.split(":").map(Number);
            const diff = (hOut * 60 + mOut) - (hIn * 60 + mIn);
            if (diff > 0) totalAmamMins += diff;
        }
    });
    const avgAmam = amamList.length > 0 ? Math.round(totalAmamMins / amamList.length) : 0;
    document.getElementById("card-metric-amamentacao-sub").innerText = `Permanência média de ${avgAmam} minutos`;
}

// Vincula filtros e botões do Dashboard
function initFilters() {
    const start = document.getElementById("dash-filter-date-start");
    const end = document.getElementById("dash-filter-date-end");
    const cl = document.getElementById("dash-filter-classroom");
    const st = document.getElementById("dash-filter-student");
    const btnClear = document.getElementById("btn-clear-dash-filters");
    
    // Preenche select de crianças dinamicamente
    function populateStudentSelect() {
        st.innerHTML = '<option value="">Todas as crianças</option>';
        // Ordena por nome
        const sorted = [...db.students].sort((a,b) => a.name.localeCompare(b.name));
        sorted.forEach(s => {
            const opt = document.createElement("option");
            opt.value = s.id;
            opt.innerText = `${s.name} (${s.classroom})`;
            st.appendChild(opt);
        });
    }
    
    populateStudentSelect();
    
    const triggerUpdate = () => {
        updateDashboardMetrics();
        renderAllCharts();
    };
    
    if (start) start.addEventListener("change", triggerUpdate);
    if (end) end.addEventListener("change", triggerUpdate);
    if (cl) cl.addEventListener("change", triggerUpdate);
    if (st) st.addEventListener("change", triggerUpdate);
    
    if (btnClear) {
        btnClear.addEventListener("click", () => {
            if (start) start.value = "";
            if (end) end.value = "";
            if (cl) cl.value = "";
            if (st) st.value = "";
            triggerUpdate();
        });
    }
}

// ==========================================================================
// RENDERIZAÇÃO DE GRÁFICOS DINÂMICOS (CHART.JS INTEGRADO)
// ==========================================================================
function renderAllCharts() {
    // Se o Chart.js não estiver carregado ou a tela de Dashboard não estiver ativa
    if (typeof Chart === "undefined" || !document.getElementById("dashboard-panel").classList.contains("active")) {
        return;
    }
    
    const isDark = document.body.classList.contains("dark-mode");
    const fontColor = isDark ? "#94a3b8" : "#64748b";
    const gridColor = isDark ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.05)";
    
    // Filtros Atuais
    const fStart = document.getElementById("dash-filter-date-start").value;
    const fEnd = document.getElementById("dash-filter-date-end").value;
    const fClass = document.getElementById("dash-filter-classroom").value;
    const fStudent = document.getElementById("dash-filter-student").value;
    
    let filtered = db.occurrences;
    if (fStart) filtered = filtered.filter(o => o.date >= fStart);
    if (fEnd) filtered = filtered.filter(o => o.date <= fEnd);
    if (fClass) filtered = filtered.filter(o => o.classroom === fClass);
    if (fStudent) filtered = filtered.filter(o => o.studentId === fStudent);
    
    // -------------------------------------------------------------
    // GRÁFICO 1: ATRASOS POR MÊS (LINE CHART)
    // -------------------------------------------------------------
    if (charts.atrasosMes) charts.atrasosMes.destroy();
    
    const monthlyDelays = {};
    const monthsName = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    // Cria 6 meses anteriores para garantir dados estruturados
    const today = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        monthlyDelays[monthsName[d.getMonth()]] = 0;
    }
    
    filtered.filter(o => o.type === "atraso").forEach(o => {
        const parts = o.date.split("-");
        const mIndex = parseInt(parts[1]) - 1;
        const name = monthsName[mIndex];
        if (monthlyDelays[name] !== undefined) {
            monthlyDelays[name]++;
        }
    });
    
    const ctx1 = document.getElementById("chart-atrasos-mes").getContext("2d");
    charts.atrasosMes = new Chart(ctx1, {
        type: "line",
        data: {
            labels: Object.keys(monthlyDelays),
            datasets: [{
                label: "Atrasos Registrados",
                data: Object.values(monthlyDelays),
                borderColor: "#d97706",
                backgroundColor: "rgba(217, 119, 6, 0.1)",
                tension: 0.4,
                fill: true,
                borderWidth: 3,
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: gridColor }, ticks: { color: fontColor } },
                x: { grid: { display: false }, ticks: { color: fontColor } }
            }
        }
    });
    
    // -------------------------------------------------------------
    // GRÁFICO 2: FALTAS POR SALA/TURMA (BAR CHART)
    // -------------------------------------------------------------
    if (charts.faltasSala) charts.faltasSala.destroy();
    
    const classroomAbsences = { "Alegria": 0, "Carinho": 0, "União": 0, "Amizade": 0, "Felicidade": 0 };
    filtered.filter(o => o.type === "falta").forEach(o => {
        if (classroomAbsences[o.classroom] !== undefined) {
            classroomAbsences[o.classroom]++;
        }
    });
    
    const ctx2 = document.getElementById("chart-faltas-sala").getContext("2d");
    charts.faltasSala = new Chart(ctx2, {
        type: "bar",
        data: {
            labels: Object.keys(classroomAbsences),
            datasets: [{
                label: "Faltas",
                data: Object.values(classroomAbsences),
                backgroundColor: ["rgba(99, 102, 241, 0.8)", "rgba(2, 132, 199, 0.8)", "rgba(16, 185, 129, 0.8)", "rgba(217, 119, 6, 0.8)", "rgba(219, 39, 119, 0.8)"],
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: gridColor }, ticks: { color: fontColor } },
                x: { grid: { display: false }, ticks: { color: fontColor } }
            }
        }
    });
    
    // -------------------------------------------------------------
    // GRÁFICO 3: MOTIVOS MAIS FREQUENTES (DOUGHNUT CHART)
    // -------------------------------------------------------------
    if (charts.motivos) charts.motivos.destroy();
    
    const motiveCounts = {};
    filtered.filter(o => o.type === "atraso" || o.type === "saida").forEach(o => {
        motiveCounts[o.motive] = (motiveCounts[o.motive] || 0) + 1;
    });
    
    // Pega os top 4 e agrupa o resto em "Outros"
    const sortedMotives = Object.entries(motiveCounts).sort((a,b) => b[1] - a[1]);
    const topLabels = [];
    const topData = [];
    let othersSum = 0;
    
    sortedMotives.forEach((item, idx) => {
        if (idx < 4) {
            topLabels.push(item[0].length > 20 ? item[0].substring(0, 17) + "..." : item[0]);
            topData.push(item[1]);
        } else {
            othersSum += item[1];
        }
    });
    
    if (othersSum > 0) {
        topLabels.push("Outros");
        topData.push(othersSum);
    }
    
    const ctx3 = document.getElementById("chart-motivos-frequentes").getContext("2d");
    charts.motivos = new Chart(ctx3, {
        type: "doughnut",
        data: {
            labels: topLabels.length > 0 ? topLabels : ["Sem Ocorrências"],
            datasets: [{
                data: topData.length > 0 ? topData : [1],
                backgroundColor: ["#6366f1", "#0284c7", "#10b981", "#d97706", "#db2777", "#94a3b8"],
                borderWidth: isDark ? 2 : 0,
                borderColor: isDark ? "#181524" : "white"
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "right",
                    labels: { color: fontColor, font: { family: "Inter", size: 11 } }
                }
            },
            cutout: "60%"
        }
    });
    
    // -------------------------------------------------------------
    // GRÁFICO 4: CRIANÇAS COM MAIS OCORRÊNCIAS (HORIZONTAL BAR)
    // -------------------------------------------------------------
    if (charts.criancasRecorrentes) charts.criancasRecorrentes.destroy();
    
    const kidOccs = {};
    filtered.forEach(o => {
        kidOccs[o.studentName] = (kidOccs[o.studentName] || 0) + 1;
    });
    
    const sortedKids = Object.entries(kidOccs).sort((a,b) => b[1] - a[1]).slice(0, 5);
    const kidLabels = sortedKids.map(item => item[0]);
    const kidData = sortedKids.map(item => item[1]);
    
    const ctx4 = document.getElementById("chart-criancas-recorrentes").getContext("2d");
    charts.criancasRecorrentes = new Chart(ctx4, {
        type: "bar",
        data: {
            labels: kidLabels.length > 0 ? kidLabels : ["Sem dados"],
            datasets: [{
                data: kidData.length > 0 ? kidData : [0],
                backgroundColor: "rgba(219, 39, 119, 0.8)",
                borderRadius: 6
            }]
        },
        options: {
            indexAxis: "y",
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { grid: { color: gridColor }, ticks: { color: fontColor, stepSize: 1 } },
                y: { grid: { display: false }, ticks: { color: fontColor } }
            }
        }
    });
    
    // -------------------------------------------------------------
    // GRÁFICO 5: EVOLUÇÃO DIÁRIA E PRESENÇA (LINE CHART)
    // -------------------------------------------------------------
    if (charts.frequenciaMensal) charts.frequenciaMensal.destroy();
    
    const datesMap = {};
    // Cria os últimos 15 dias de aula
    const dateList = [];
    const dateLabels = [];
    for (let i = 14; i >= 0; i--) {
        const d = new Date();
        d.setDate(today.getDate() - i);
        // Só dias de semana
        if (d.getDay() !== 0 && d.getDay() !== 6) {
            const iso = d.toISOString().split("T")[0];
            dateList.push(iso);
            dateLabels.push(d.toLocaleDateString("pt-BR", { day: "numeric", month: "short" }));
            datesMap[iso] = { atrasos: 0, faltas: 0 };
        }
    }
    
    filtered.forEach(o => {
        if (datesMap[o.date]) {
            if (o.type === "atraso") datesMap[o.date].atrasos++;
            else if (o.type === "falta") datesMap[o.date].faltas++;
        }
    });
    
    const atrasoTimeline = dateList.map(d => datesMap[d].atrasos);
    const faltaTimeline = dateList.map(d => datesMap[d].faltas);
    
    const ctx5 = document.getElementById("chart-frequencia-mensal").getContext("2d");
    charts.frequenciaMensal = new Chart(ctx5, {
        type: "line",
        data: {
            labels: dateLabels,
            datasets: [
                {
                    label: "Chegadas com Atraso",
                    data: atrasoTimeline,
                    borderColor: "#d97706",
                    backgroundColor: "transparent",
                    tension: 0.3,
                    borderWidth: 3
                },
                {
                    label: "Faltas no Dia",
                    data: faltaTimeline,
                    borderColor: "#ef4444",
                    backgroundColor: "transparent",
                    tension: 0.3,
                    borderWidth: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: "top",
                    labels: { color: fontColor }
                }
            },
            scales: {
                y: { grid: { color: gridColor }, ticks: { color: fontColor, stepSize: 1 } },
                x: { grid: { display: false }, ticks: { color: fontColor } }
            }
        }
    });
}

// ==========================================================================
// BUSCA GLOBAL INTELIGENTE NO HEADER
// ==========================================================================
function initGlobalSearch() {
    const input = document.getElementById("global-student-search");
    const dropdown = document.getElementById("search-results-dropdown");
    
    if (!input || !dropdown) return;
    
    input.addEventListener("input", () => {
        const val = input.value.toLowerCase().trim();
        dropdown.innerHTML = "";
        
        if (!val) {
            dropdown.classList.remove("active");
            return;
        }
        
        const matches = db.students.filter(s => s.name.toLowerCase().includes(val));
        
        if (matches.length === 0) {
            dropdown.innerHTML = `<div style="padding: 16px; font-size:12px; color: var(--text-secondary); text-align:center;">Nenhuma criança encontrada.</div>`;
            dropdown.classList.add("active");
            return;
        }
        
        matches.slice(0, 5).forEach(st => {
            const item = document.createElement("div");
            item.className = "search-result-item";
            item.innerHTML = `
                <div class="search-result-info">
                    <span class="search-result-name">${st.name}</span>
                    <span class="search-result-class">Sala ${st.classroom} ${st.active ? '' : '(Inativo)'}</span>
                </div>
                <span class="search-result-action">Lançar</span>
            `;
            
            item.addEventListener("click", () => {
                // Abre o modal rápido de ocorrência apontando para esta criança diretamente!
                openOccurrenceModal("atraso", false);
                
                // Preenche dados da criança no formulário
                setTimeout(() => {
                    document.getElementById("occ-student-search").value = st.name;
                    document.getElementById("occ-student-id").value = st.id;
                    document.getElementById("occ-student-classroom").value = st.classroom;
                }, 100);
                
                input.value = "";
                dropdown.classList.remove("active");
            });
            
            dropdown.appendChild(item);
        });
        
        dropdown.classList.add("active");
    });
    
    document.addEventListener("click", (e) => {
        if (!input.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.remove("active");
        }
    });
}

// ==========================================================================
// MÓDULO DE RELATÓRIOS & EXPORTAÇÕES (EXCEL E PDF REAIS)
// ==========================================================================
function initReportsPage() {
    const tStart = document.getElementById("report-filter-date-start");
    const tEnd = document.getElementById("report-filter-date-end");
    const tClass = document.getElementById("report-filter-classroom");
    const tType = document.getElementById("report-filter-type");
    
    const triggerRender = () => {
        renderReportsTable();
    };
    
    if (tStart) tStart.addEventListener("change", triggerRender);
    if (tEnd) tEnd.addEventListener("change", triggerRender);
    if (tClass) tClass.addEventListener("change", triggerRender);
    if (tType) tType.addEventListener("change", triggerRender);
    
    // Vincula Botões de Períodos Rápidos
    const presetBtns = document.querySelectorAll(".report-quick-presets .preset-btn");
    presetBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const days = parseInt(btn.getAttribute("data-days"));
            const today = new Date();
            const start = new Date();
            start.setDate(today.getDate() - days);
            
            tStart.value = start.toISOString().split("T")[0];
            tEnd.value = today.toISOString().split("T")[0];
            
            triggerRender();
        });
    });
    
    // Vincula exportações
    const btnExcel = document.getElementById("btn-export-excel");
    if (btnExcel) {
        btnExcel.addEventListener("click", () => {
            exportReportsToExcel();
        });
    }
    
    const btnPdf = document.getElementById("btn-export-pdf");
    if (btnPdf) {
        btnPdf.addEventListener("click", () => {
            exportReportsToPDF();
        });
    }
}

// Filtra ocorrências para gerar o relatório atual
function getFilteredReports() {
    const tStart = document.getElementById("report-filter-date-start").value;
    const tEnd = document.getElementById("report-filter-date-end").value;
    const tClass = document.getElementById("report-filter-classroom").value;
    const tType = document.getElementById("report-filter-type").value;
    
    let filtered = db.occurrences;
    
    if (tStart) filtered = filtered.filter(o => o.date >= tStart);
    if (tEnd) filtered = filtered.filter(o => o.date <= tEnd);
    if (tClass) filtered = filtered.filter(o => o.classroom === tClass);
    if (tType !== "all") filtered = filtered.filter(o => o.type === tType);
    
    // Mais recentes primeiro
    filtered.sort((a, b) => b.date.localeCompare(a.date));
    return filtered;
}

function renderReportsTable() {
    const tbody = document.getElementById("reports-table-body");
    if (!tbody) return;
    
    tbody.innerHTML = "";
    
    const list = getFilteredReports();
    
    // Atualiza estatísticas do topo do relatório
    document.getElementById("report-total-records").innerText = list.length;
    
    const uniqueKids = new Set(list.map(o => o.studentId)).size;
    document.getElementById("report-impacted-kids").innerText = uniqueKids;
    
    // Calcula média diária
    let daysDiff = 30;
    const startVal = document.getElementById("report-filter-date-start").value;
    const endVal = document.getElementById("report-filter-date-end").value;
    if (startVal && endVal) {
        const d1 = new Date(startVal);
        const d2 = new Date(endVal);
        daysDiff = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)) + 1);
    }
    document.getElementById("report-daily-avg").innerText = (list.length / daysDiff).toFixed(1);
    
    if (list.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-secondary); padding: 40px;"><i data-lucide="info" style="margin: 0 auto 8px; width: 32px; height: 32px;"></i> Nenhuma ocorrência correspondente aos filtros.</td></tr>`;
        lucide.createIcons();
        return;
    }
    
    const typeNames = {
        atraso: "Atraso",
        saida: "Saída Ant.",
        atestado: "Atestado",
        falta: "Falta",
        amamentacao: "Amamentação"
    };
    
    list.forEach(occ => {
        const tr = document.createElement("tr");
        
        const dateBR = occ.date.split("-").reverse().join("/");
        
        let details = "";
        let staffHtml = "";
        let proofHtml = "";
        
        if (occ.type === "atraso") {
            details = `Chegou às <strong>${occ.time}</strong> - Motivo: ${occ.motive}`;
            staffHtml = `Resp: ${occ.guardian}<br><span style="font-size:11px; color:var(--text-light)">Func: ${occ.staff || 'Ana'}</span>`;
            proofHtml = occ.signature ? `<button class="status-pill active" style="font-size:10px; border:none;" onclick="viewOccurrenceReceipt('${occ.id}')">Assinatura</button>` : "-";
        } else if (occ.type === "saida") {
            details = `Saída às <strong>${occ.time}</strong> - Motivo: ${occ.motive} ${occ.hasReturn === 'sim' ? '(Retorna)' : ''}`;
            staffHtml = `Retirado por: ${occ.guardian}`;
            proofHtml = occ.signature ? `<button class="status-pill active" style="font-size:10px; border:none;" onclick="viewOccurrenceReceipt('${occ.id}')">Assinatura</button>` : "-";
        } else if (occ.type === "atestado") {
            details = `Afastado de ${occ.startDate.split("-").reverse().join("/")} a ${occ.endDate.split("-").reverse().join("/")} (${occ.days}d)`;
            staffHtml = `Motivo: ${occ.motive} - CID: ${occ.cid || 'N/A'}`;
            proofHtml = occ.filePreview ? `<button class="status-pill active" style="background-color: var(--color-primary-light); color: var(--color-primary); font-size:10px; border:none;" onclick="viewOccurrenceReceipt('${occ.id}')">Atestado</button>` : "-";
        } else if (occ.type === "falta") {
            details = `Motivo: ${occ.motive} - ${occ.justified === 'sim' ? 'Justificada' : 'Não justific.'}`;
            staffHtml = occ.notified === 'sim' ? "Houve aviso prévio" : "Sem aviso prévio";
            proofHtml = "-";
        } else if (occ.type === "amamentacao") {
            details = `Permanência: <strong>${occ.timeIn} - ${occ.timeOut}</strong>`;
            staffHtml = `Mãe Presente: ${occ.guardian}`;
            proofHtml = `<button class="status-pill active" style="font-size:10px; border:none;" onclick="viewOccurrenceReceipt('${occ.id}')">Ver Detalhe</button>`;
        }
        
        tr.innerHTML = `
            <td><strong>${dateBR}</strong></td>
            <td><span style="font-weight:600;">${occ.studentName}</span></td>
            <td><span class="occ-type-pill saida" style="background-color: var(--color-saidas-bg); color: var(--color-saidas);">${occ.classroom}</span></td>
            <td><span class="occ-type-pill ${occ.type}">${typeNames[occ.type]}</span></td>
            <td>${details}</td>
            <td>${staffHtml}</td>
            <td>${proofHtml}</td>
        `;
        
        tbody.appendChild(tr);
    });
    
    lucide.createIcons();
}

// Exporta dados tabulares reais para Planilha Excel (.xlsx)
function exportReportsToExcel() {
    if (typeof XLSX === "undefined") {
        alert("Erro: Biblioteca SheetJS não carregada.");
        return;
    }
    
    const rawList = getFilteredReports();
    if (rawList.length === 0) {
        alert("Não há dados para exportar com os filtros atuais.");
        return;
    }
    
    const mapped = rawList.map((occ, idx) => {
        let details = "";
        let resp = occ.guardian || "N/A";
        
        if (occ.type === "atraso") {
            details = `Chegada: ${occ.time} - Motivo: ${occ.motive}`;
        } else if (occ.type === "saida") {
            details = `Saída: ${occ.time} - Motivo: ${occ.motive} (Retorna: ${occ.hasReturn === 'sim' ? 'Sim' : 'Não'})`;
        } else if (occ.type === "atestado") {
            details = `Afastado de ${occ.startDate} a ${occ.endDate} (${occ.days} dias) - Diagnóstico: ${occ.motive} (CID: ${occ.cid || 'N/A'})`;
            resp = "Médico CRM";
        } else if (occ.type === "falta") {
            details = `Falta por: ${occ.motive} (Justificada: ${occ.justified === 'sim' ? 'Sim' : 'Não'})`;
        } else if (occ.type === "amamentacao") {
            details = `Espaço Lactante: ${occ.timeIn} às ${occ.timeOut}`;
        }
        
        return {
            'Nº': idx + 1,
            'Data Registro': occ.date.split("-").reverse().join("/"),
            'Nome Criança': occ.studentName,
            'Sala / Turma': occ.classroom,
            'Tipo Ocorrência': occ.type.toUpperCase(),
            'Detalhes e Justificativas': details,
            'Responsável Relacionado': resp
        };
    });
    
    const worksheet = XLSX.utils.json_to_sheet(mapped);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Ocorrências Creche");
    
    // Auto-ajusta largura de colunas para ficar elegante
    const maxLens = {};
    mapped.forEach(row => {
        Object.keys(row).forEach(key => {
            const valStr = String(row[key]);
            maxLens[key] = Math.max(maxLens[key] || 10, valStr.length);
        });
    });
    worksheet['!cols'] = Object.keys(maxLens).map(key => ({ wch: maxLens[key] + 3 }));
    
    // Salva arquivo
    XLSX.writeFile(workbook, `Relatorio_Ocorrencias_Creche_${new Date().toISOString().split("T")[0]}.xlsx`);
}

// Exporta dados estruturados reais em PDF profissional formatado para impressão
function exportReportsToPDF() {
    if (typeof window.jspdf === "undefined") {
        alert("Erro: Biblioteca jsPDF não carregada.");
        return;
    }
    
    const list = getFilteredReports();
    if (list.length === 0) {
        alert("Não há dados para exportar com os filtros atuais.");
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    
    // Elementos de Cabeçalho do PDF
    doc.setFillColor(99, 102, 241); // Cor Primary
    doc.rect(0, 0, 210, 35, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(22);
    doc.text("EDUCA GESTÃO - PORTAL CRECHE", 15, 18);
    
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(10);
    doc.text("Relatório Consolidado de Frequência e Ocorrências Diárias", 15, 26);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, 130, 26);
    
    // Filtros aplicados no PDF
    doc.setFillColor(241, 245, 249);
    doc.rect(15, 42, 180, 16, "F");
    doc.setTextColor(30, 41, 59);
    doc.setFont("Helvetica", "bold");
    doc.text("Filtros Aplicados:", 20, 48);
    doc.setFont("Helvetica", "normal");
    
    const fClass = document.getElementById("report-filter-classroom").value || "Todas as salas";
    const fType = document.getElementById("report-filter-type").value.toUpperCase();
    doc.text(`Sala: ${fClass} | Tipo: ${fType} | Ocorrências Totais: ${list.length}`, 20, 53);
    
    // Desenha tabela manual simplificada de registros
    let y = 68;
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    
    // Cabeçalho da Tabela
    doc.setFillColor(226, 232, 240);
    doc.rect(15, y - 4, 180, 7, "F");
    doc.text("Data", 17, y);
    doc.text("Criança", 38, y);
    doc.text("Sala", 85, y);
    doc.text("Tipo", 108, y);
    doc.text("Descrição Ocorrência", 132, y);
    
    y += 8;
    doc.setFont("Helvetica", "normal");
    doc.setFontSize(8.5);
    
    const typeNames = { atraso: "Atraso", saida: "Saída", atestado: "Atestado", falta: "Falta", amamentacao: "Amam." };
    
    list.forEach((occ, idx) => {
        // Nova página se estourar margem
        if (y > 275) {
            doc.addPage();
            y = 25;
            // Cabeçalho repetido da tabela na nova página
            doc.setFillColor(226, 232, 240);
            doc.rect(15, y - 4, 180, 7, "F");
            doc.setFont("Helvetica", "bold");
            doc.text("Data", 17, y);
            doc.text("Criança", 38, y);
            doc.text("Sala", 85, y);
            doc.text("Tipo", 108, y);
            doc.text("Descrição Ocorrência", 132, y);
            y += 8;
            doc.setFont("Helvetica", "normal");
        }
        
        const dateBR = occ.date.split("-").reverse().join("/");
        
        let details = "";
        if (occ.type === "atraso") details = `Chegou ${occ.time} por ${occ.motive}`;
        else if (occ.type === "saida") details = `Saída ${occ.time} por ${occ.motive}`;
        else if (occ.type === "atestado") details = `Afast. ${occ.days}d até ${occ.endDate.split("-").reverse().join("/")}`;
        else if (occ.type === "falta") details = `${occ.motive} (${occ.justified === 'sim' ? 'Justif.' : 'Sem Justif.'})`;
        else if (occ.type === "amamentacao") details = `Ficou das ${occ.timeIn} às ${occ.timeOut}`;
        
        // Trunca strings longas para caber na coluna
        const kidName = occ.studentName.length > 25 ? occ.studentName.substring(0, 22) + "..." : occ.studentName;
        const detailTxt = details.length > 34 ? details.substring(0, 32) + "..." : details;
        
        // Fundo zebrado
        if (idx % 2 === 0) {
            doc.setFillColor(248, 250, 252);
            doc.rect(15, y - 4, 180, 6, "F");
        }
        
        doc.text(dateBR, 17, y);
        doc.text(kidName, 38, y);
        doc.text(occ.classroom, 85, y);
        doc.text(typeNames[occ.type], 108, y);
        doc.text(detailTxt, 132, y);
        
        y += 6;
    });
    
    // Rodapé de páginas
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Página ${i} de ${totalPages} | EducaGestão - Gestão Eficiente Escolar`, 15, 288);
        doc.text("Documento Oficial de Registro de Ocorrências Escolares.", 130, 288);
    }
    
    // Salva PDF
    doc.save(`Relatorio_Frequencia_Creche_${new Date().toISOString().split("T")[0]}.pdf`);
}

// ==========================================================================
// INTELIGÊNCIA DE DADOS E INSIGHTS PEDAGÓGICOS (ANALISADOR AUTOMÁTICO)
// ==========================================================================
function renderInsightsPage() {
    const list = db.occurrences;
    const students = db.students;
    
    const urgentBox = document.getElementById("insights-urgent-list");
    const delayBox = document.getElementById("insights-delay-patterns");
    const absenceBox = document.getElementById("insights-absence-patterns");
    const medicalBox = document.getElementById("insights-medical-list");
    const classroomBox = document.getElementById("insights-classroom-focus");
    const pedagogicBox = document.getElementById("insights-pedagogical-suggestions");
    
    // Reseta visões
    urgentBox.innerHTML = "";
    delayBox.innerHTML = "";
    absenceBox.innerHTML = "";
    medicalBox.innerHTML = "";
    classroomBox.innerHTML = "";
    pedagogicBox.innerHTML = "";
    
    // -------------------------------------------------------------
    // HEURÍSTICA 1: ATENÇÃO URGENTE (Alunos com > 4 faltas/atrasos totais)
    // -------------------------------------------------------------
    const counts = {};
    list.forEach(o => {
        counts[o.studentId] = (counts[o.studentId] || 0) + 1;
    });
    
    const criticalStudents = Object.entries(counts)
        .filter(item => item[1] >= 4)
        .sort((a,b) => b[1] - a[1]);
        
    if (criticalStudents.length === 0) {
        urgentBox.innerHTML = `<div class="insight-item"><span class="insight-item-emoji">✅</span><div class="insight-item-text"><span class="insight-item-title">Operação Estável</span><span class="insight-item-desc">Nenhum aluno apresenta contagem crítica de ocorrências esta semana.</span></div></div>`;
    } else {
        criticalStudents.forEach(([stId, count]) => {
            const student = students.find(s => s.id === stId);
            if (!student) return;
            const delays = list.filter(o => o.studentId === stId && o.type === "atraso").length;
            const faltas = list.filter(o => o.studentId === stId && o.type === "falta").length;
            
            const div = document.createElement("div");
            div.className = "insight-item";
            div.innerHTML = `
                <span class="insight-item-emoji">🚨</span>
                <div class="insight-item-text">
                    <span class="insight-item-title">${student.name} (${student.classroom})</span>
                    <span class="insight-item-desc">Alcançou <strong>${count} ocorrências</strong> nos últimos 30 dias (${delays} atrasos e ${faltas} faltas). Risco moderado de desengajamento escolar ou evasão escolar silenciosa.</span>
                    <span class="insight-item-action">Ação sugerida: Entrar em contato via WhatsApp com os responsáveis.</span>
                </div>
            `;
            urgentBox.appendChild(div);
        });
    }
    
    // -------------------------------------------------------------
    // HEURÍSTICA 2: PADRÃO DE ATRASOS MATUTINOS
    // -------------------------------------------------------------
    const delayCounts = {};
    list.filter(o => o.type === "atraso").forEach(o => {
        delayCounts[o.studentId] = (delayCounts[o.studentId] || 0) + 1;
    });
    const chronicDelays = Object.entries(delayCounts).filter(item => item[1] >= 3);
    
    if (chronicDelays.length === 0) {
        delayBox.innerHTML = `<div class="insight-item"><span class="insight-item-emoji">⏰</span><div class="insight-item-text"><span class="insight-item-title">Pontualidade em Dia</span><span class="insight-item-desc">Nenhum padrão crônico de atraso detectado na base de dados atual.</span></div></div>`;
    } else {
        chronicDelays.forEach(([stId, count]) => {
            const student = students.find(s => s.id === stId);
            if (!student) return;
            // Motivo mais frequente
            const motives = {};
            list.filter(o => o.studentId === stId && o.type === "atraso").forEach(o => {
                motives[o.motive] = (motives[o.motive] || 0) + 1;
            });
            const topMotive = Object.entries(motives).sort((a,b) => b[1] - a[1])[0][0];
            
            const div = document.createElement("div");
            div.className = "insight-item";
            div.innerHTML = `
                <span class="insight-item-emoji">⏳</span>
                <div class="insight-item-text">
                    <span class="insight-item-title">Atrasos Crônicos: ${student.name}</span>
                    <span class="insight-item-desc">Chegou atrasado(a) <strong>${count} vezes</strong> este mês. Principal justificativa apontada: <strong>"${topMotive}"</strong>.</span>
                </div>
            `;
            delayBox.appendChild(div);
        });
    }
    
    // -------------------------------------------------------------
    // HEURÍSTICA 3: PADRÕES DE FALTAS SISTEMÁTICAS (Ex: Faltar sempre na segunda-feira)
    // -------------------------------------------------------------
    const studentFaltas = {};
    list.filter(o => o.type === "falta").forEach(o => {
        if (!studentFaltas[o.studentId]) studentFaltas[o.studentId] = [];
        studentFaltas[o.studentId].push(o.date);
    });
    
    let absencePatternFound = false;
    const weekDaysName = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
    
    Object.entries(studentFaltas).forEach(([stId, dates]) => {
        if (dates.length >= 3) {
            // Analisa se há padrão de dia de semana
            const dayCounts = [0, 0, 0, 0, 0, 0, 0];
            dates.forEach(dStr => {
                const day = new Date(dStr + "T00:00:00").getDay();
                dayCounts[day]++;
            });
            
            // Encontra se algum dia da semana tem >= 2 faltas
            const peakDay = dayCounts.findIndex(c => c >= 2);
            if (peakDay === 1 || peakDay === 5) { // Segunda ou Sexta
                const student = students.find(s => s.id === stId);
                if (!student) return;
                
                absencePatternFound = true;
                const div = document.createElement("div");
                div.className = "insight-item";
                div.innerHTML = `
                    <span class="insight-item-emoji">🗓️</span>
                    <div class="insight-item-text">
                        <span class="insight-item-title">Padrão de Fim de Semana Prolongado: ${student.name}</span>
                        <span class="insight-item-desc">A criança apresenta faltas sistemáticas nas <strong>${weekDaysName[peakDay]}s</strong> (${dayCounts[peakDay]} faltas registradas nesse dia específico). Indica possível emenda familiar.</span>
                    </div>
                `;
                absenceBox.appendChild(div);
            }
        }
    });
    
    if (!absencePatternFound) {
        absenceBox.innerHTML = `<div class="insight-item"><span class="insight-item-emoji">📅</span><div class="insight-item-text"><span class="insight-item-title">Calendário Equilibrado</span><span class="insight-item-desc">Faltas distribuídas aleatoriamente. Sem indícios de evasão recorrente.</span></div></div>`;
    }
    
    // -------------------------------------------------------------
    // HEURÍSTICA 4: SAÚDE (Retorno de atestados ativas hoje)
    // -------------------------------------------------------------
    const today = new Date().toISOString().split("T")[0];
    const returningToday = list.filter(o => o.type === "atestado" && o.endDate === today);
    
    if (returningToday.length === 0) {
        medicalBox.innerHTML = `<div class="insight-item"><span class="insight-item-emoji">❤️</span><div class="insight-item-text"><span class="insight-item-title">Nenhum retorno clínico hoje</span><span class="insight-item-desc">Sem necessidade de triagem de retorno de atestado ativo nas salas.</span></div></div>`;
    } else {
        returningToday.forEach(occ => {
            const div = document.createElement("div");
            div.className = "insight-item";
            div.innerHTML = `
                <span class="insight-item-emoji">🩹</span>
                <div class="insight-item-text">
                    <span class="insight-item-title">Retorno Clínico Hoje: ${occ.studentName} (${occ.classroom})</span>
                    <span class="insight-item-desc">Afastamento finalizado hoje para o diagnóstico: <strong>"${occ.motive}"</strong>. Recomenda-se triagem rápida na entrada de fluxo.</span>
                    <span class="insight-item-action">Ação sugerida: Verificar carteira vacinal ou autorização médica e instruir professor regente.</span>
                </div>
            `;
            medicalBox.appendChild(div);
        });
    }
    
    // -------------------------------------------------------------
    // HEURÍSTICA 5: GARGALOS POR SALA DE AULA
    // -------------------------------------------------------------
    const classTotal = { "Alegria": 0, "Carinho": 0, "União": 0, "Amizade": 0, "Felicidade": 0 };
    list.forEach(o => {
        if (classTotal[o.classroom] !== undefined) classTotal[o.classroom]++;
    });
    
    const topClassroom = Object.entries(classTotal).sort((a,b) => b[1] - a[1])[0];
    
    const divClass = document.createElement("div");
    divClass.className = "insight-item";
    divClass.innerHTML = `
        <span class="insight-item-emoji">🏫</span>
        <div class="insight-item-text">
            <span class="insight-item-title">Sala Crítica com Mais Fluxo: "${topClassroom[0]}"</span>
            <span class="insight-item-desc">A turma acumula <strong>${topClassroom[1]} ocorrências totais</strong>. A equipe pedagógica deve realizar uma análise de clima escolar nesta sala.</span>
        </div>
    `;
    classroomBox.appendChild(divClass);
    
    // -------------------------------------------------------------
    // HEURÍSTICA 6: DIRETRIZES E ESTUDOS PEDAGÓGICOS SUGERIDOS
    // -------------------------------------------------------------
    const divPed = document.createElement("div");
    divPed.className = "insight-item";
    divPed.innerHTML = `
        <span class="insight-item-emoji">🎓</span>
        <div class="insight-item-text">
            <span class="insight-item-title">Apoio Familiar e Acolhimento Pedagógico</span>
            <span class="insight-item-desc">Com base nos atrasos elevados decorrentes de <strong>"Trânsito" ou "Dormiu pouco"</strong>, sugerimos a publicação de um artigo ou informativo interno no aplicativo escolar aos pais sobre a relevância da higiene do sono infantil e da rotina matinal estruturada.</span>
            <span class="insight-item-action">Diretriz da Pedagogia: Estimular o engajamento através do acolhimento amoroso de portaria, evitando repreensões na frente da criança.</span>
        </div>
    `;
    pedagogicBox.appendChild(divPed);
}

// ==========================================================================
// CONFIGURAÇÕES DO PORTAL E BOTÕES DE CONTROLE DE BASES
// ==========================================================================
function initSettingsPage() {
    const btnSeed = document.getElementById("btn-seed-dummy-data");
    const btnClearOcc = document.getElementById("btn-clear-occurrences");
    const btnResetApp = document.getElementById("btn-reset-entire-app");
    
    if (btnSeed) {
        btnSeed.addEventListener("click", () => {
            if (confirm("Deseja gerar ocorrências simuladas dos últimos 30 dias? Isso ajudará a povoar os gráficos imediatamente.")) {
                generateDummyOccurrences();
                alert("Dados de demonstração semeados com sucesso!");
                updateDashboardMetrics();
                renderAllCharts();
            }
        });
    }
    
    if (btnClearOcc) {
        btnClearOcc.addEventListener("click", () => {
            if (confirm("ATENÇÃO: Deseja apagar TODOS os registros de ocorrências (atrasos, faltas, etc.)? Isso zerará os gráficos. O cadastro de alunos continuará intacto.")) {
                db.occurrences = [];
                saveDatabase();
                alert("Todo o histórico de ocorrências foi deletado.");
                updateDashboardMetrics();
                renderAllCharts();
            }
        });
    }
    
    if (btnResetApp) {
        btnResetApp.addEventListener("click", () => {
            if (confirm("ATENÇÃO MÁXIMA: Deseja zerar completamente a base de dados do aplicativo? Novos alunos cadastrados serão apagados e as ocorrências serão removidas. O sistema voltará ao estado original de fábrica.")) {
                localStorage.removeItem("educagestao_creche_db");
                loadDatabase();
                alert("O sistema foi totalmente redefinido!");
                updateDashboardMetrics();
                renderAllCharts();
            }
        });
    }
}
