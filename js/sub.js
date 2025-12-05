// Auto-login como professor para demonstração
let userEmail = localStorage.getItem("user_email") || "";
if (!userEmail || (!userEmail.endsWith("@professor.com") && !userEmail.endsWith("@aluno.com"))) {
  // Define automaticamente como professor de Matemática para demonstração
  userEmail = "proffmatematica@professor.com";
  localStorage.setItem("user_email", userEmail);
  localStorage.setItem("sub_authed", "true");
}

let userRole = "student";
let userSubject = null;

const professorSubjectMap = {
  proffmatematica: "Matemática",
  proffportugues: "Português",
  proffhistoria: "História",
  proffgeografia: "Geografia",
  proffciencias: "Ciências",
  proffartes: "Artes",
  proffedfisica: "Educação Física",
  proffingles: "Inglês",
};

if (userEmail.endsWith("@professor.com")) {
  userRole = "professor";
  const emailPrefix = userEmail.split("@")[0];
  userSubject = professorSubjectMap[emailPrefix] || "Matemática";
} else if (userEmail.endsWith("@aluno.com")) {
  userRole = "student";
}
window.userRole = userRole;
window.userSubject = userSubject;

let clockIntervalId = null;
const STORAGE_KEY_PLANOS = "sub_plano_aulas";
const STORAGE_KEY_ATTENDANCE = "sub_attendance_records";
const STORAGE_KEY_PROVAS = "sub_provas_publicadas";
const STORAGE_KEY_NOTAS = "sub_notas_provas";
const STORAGE_KEY_CLASS_LIST = "sub_class_list";
const STORAGE_KEY_NOTIFICATIONS = "sub_notifications";
const STORAGE_KEY_EVENTOS = "sub_eventos_agenda";

// Variáveis para controle do calendário
let calendarMonth = new Date().getMonth();
let calendarYear = new Date().getFullYear();
const DEFAULT_CLASS_LIST = [
  "Rafael", "Lucas", "Rayssa", "Yasmin"
];
const EVENT_PROVAS_UPDATED = "sub-provas-updated";
const EVENT_NOTAS_UPDATED = "sub-notas-updated";
const EVENT_PLANOS_UPDATED = "sub-planos-updated";

function normalizeIdentifier(value) {
  if (!value) return "";
  return value
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function dispatchAppEvent(eventName) {
  try {
    window.dispatchEvent(new CustomEvent(eventName));
  } catch (e) {}
}

function notifyProvasChanged() {
  dispatchAppEvent(EVENT_PROVAS_UPDATED);
}

function notifyNotasChanged() {
  dispatchAppEvent(EVENT_NOTAS_UPDATED);
}

function escapeHtml(text) {
  if (!text) return "";
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (char) => map[char] || char);
}

function getClassListFromStorage() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_CLASS_LIST);
    if (!stored) {
      localStorage.setItem(
        STORAGE_KEY_CLASS_LIST,
        JSON.stringify(DEFAULT_CLASS_LIST)
      );
      return [...DEFAULT_CLASS_LIST];
    }
    const parsed = JSON.parse(stored);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    console.warn("Erro ao ler a lista da turma", e);
  }
  return [...DEFAULT_CLASS_LIST];
}

function saveClassList(list) {
  localStorage.setItem(STORAGE_KEY_CLASS_LIST, JSON.stringify(list));
}

function getNotificationsFromStorage() {
  try {
    const list =
      JSON.parse(localStorage.getItem(STORAGE_KEY_NOTIFICATIONS)) || [];
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

function saveNotifications(list) {
  localStorage.setItem(
    STORAGE_KEY_NOTIFICATIONS,
    JSON.stringify(list.slice(0, 50))
  );
}

function formatNotificationDate(value) {
  try {
    const date = new Date(value);
    return new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(date);
  } catch (e) {
    return "";
  }
}

function getCurrentRecipientKey() {
  if (!userEmail) return "";
  const prefix = userEmail.split("@")[0] || userEmail;
  return normalizeIdentifier(prefix);
}

function getCurrentDisplayName() {
  if (!userEmail) return "";
  const prefix = userEmail.split("@")[0] || "";
  if (!prefix) return "";
  return prefix
    .replace(/[\.\_\-]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .trim();
}

function updateClassSummary(list) {
  const summaryEl = document.getElementById("classSummary");
  if (!summaryEl) return;
  const total = list.length;
  if (total === 0) {
    summaryEl.textContent = "Nenhum aluno cadastrado";
  } else if (total === 1) {
    summaryEl.textContent = "1 aluno cadastrado";
  } else {
    summaryEl.textContent = `${total} alunos cadastrados`;
  }
}

function updateNotificationsSummary(total) {
  const summaryEl = document.getElementById("notificationsSummary");
  if (!summaryEl) return;
  if (!total) {
    summaryEl.textContent = "Nenhum recado enviado";
  } else if (total === 1) {
    summaryEl.textContent = "1 recado enviado";
  } else {
    summaryEl.textContent = `${total} recados enviados`;
  }
}

function updateHomeData() {
  const currentSection = document.querySelector(".section.active");
  if (currentSection && currentSection.id === "home") {
    renderHomeFrequencia();
    renderProximaAula();
    renderAgenda();
  }
}

window.abrirModalEvento = abrirModalEvento;
window.fecharModalEvento = fecharModalEvento;
window.salvarEvento = salvarEvento;
window.removerEvento = removerEvento;

function setupStorageSync() {
  const handleStorage = (event) => {
    if (!event?.key) return;
    if (event.key === STORAGE_KEY_PROVAS) {
      renderProvasAluno();
    } else if (event.key === STORAGE_KEY_NOTAS) {
      renderProvasAluno();
      renderNotasAnteriores();
    } else if (event.key === STORAGE_KEY_NOTIFICATIONS) {
      if (typeof renderNotificationsList === "function") {
        renderNotificationsList();
      }
    } else if (event.key === STORAGE_KEY_CLASS_LIST) {
      if (typeof refreshNotificationStudentOptions === "function")
        refreshNotificationStudentOptions();
      updateHomeData();
    } else if (event.key === STORAGE_KEY_PLANOS) {
      if (typeof renderPlanos === "function") {
        renderPlanos();
      }
      updateHomeData();
    } else if (event.key === STORAGE_KEY_ATTENDANCE) {
      updateHomeData();
    } else if (event.key === STORAGE_KEY_EVENTOS) {
      updateHomeData();
    }
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(EVENT_PROVAS_UPDATED, renderProvasAluno);
  window.addEventListener(EVENT_NOTAS_UPDATED, () => {
    renderNotasAnteriores();
    renderProvasAluno();
  });
  window.addEventListener(EVENT_PLANOS_UPDATED, () => {
    if (typeof renderPlanos === "function") {
      renderPlanos();
    }
    updateHomeData();
  });

  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function(key, value) {
    originalSetItem.apply(this, arguments);
    const event = new Event('storage');
    event.key = key;
    event.newValue = value;
    window.dispatchEvent(event);
    handleStorage(event);
  };

  setInterval(() => {
    updateHomeData();
  }, 5000);
}

function refreshNotificationStudentOptions() {
  const sendSelect = document.getElementById("notificationStudentSelect");
  const filterSelect = document.getElementById("notificationFilterSelect");
  const classList = getClassListFromStorage();

  if (sendSelect) {
    const previousValue = sendSelect.value;
    sendSelect.innerHTML = "";
    const broadcastOption = document.createElement("option");
    broadcastOption.value = "all";
    broadcastOption.textContent = "Toda a turma";
    broadcastOption.dataset.name = "Toda a turma";
    sendSelect.appendChild(broadcastOption);
    classList.forEach((name) => {
      const option = document.createElement("option");
      option.value = normalizeIdentifier(name);
      option.textContent = name;
      option.dataset.name = name;
      sendSelect.appendChild(option);
    });
    if (
      previousValue &&
      sendSelect.querySelector(`option[value="${previousValue}"]`)
    ) {
      sendSelect.value = previousValue;
    }
  }

  if (filterSelect) {
    const previousFilter = filterSelect.value;
    const currentKey = getCurrentRecipientKey();
    filterSelect.innerHTML = "";
    const allOption = document.createElement("option");
    allOption.value = "all";
    allOption.textContent = "Todos os recados";
    filterSelect.appendChild(allOption);
    const seenKeys = new Set();
    classList.forEach((name) => {
      const key = normalizeIdentifier(name);
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      const option = document.createElement("option");
      option.value = key;
      option.textContent = name;
      filterSelect.appendChild(option);
    });
    if (currentKey && !seenKeys.has(currentKey)) {
      const meOption = document.createElement("option");
      meOption.value = currentKey;
      meOption.textContent = getCurrentDisplayName() || "Minhas notificações";
      filterSelect.appendChild(meOption);
    }
    if (
      previousFilter &&
      filterSelect.querySelector(`option[value="${previousFilter}"]`)
    ) {
      filterSelect.value = previousFilter;
    } else if (
      currentKey &&
      filterSelect.querySelector(`option[value="${currentKey}"]`)
    ) {
      filterSelect.value = currentKey;
    } else {
      filterSelect.value = "all";
    }
  }
}

function renderNotificationsList() {
  const container = document.getElementById("notificationsList");
  if (!container) return;
  const notifications = getNotificationsFromStorage().sort(
    (a, b) => new Date(b.sentAt) - new Date(a.sentAt)
  );
  updateNotificationsSummary(notifications.length);
  const filterSelect = document.getElementById("notificationFilterSelect");
  const selectedFilter = filterSelect?.value || "all";
  const filtered = notifications.filter((notification) => {
    if (selectedFilter === "all") return true;
    return (
      notification.recipientKey === selectedFilter ||
      notification.recipientKey === "all"
    );
  });
  container.innerHTML = "";
  if (filtered.length === 0) {
    container.innerHTML =
      '<p class="empty-state">Nenhuma notificação até o momento.</p>';
    return;
  }
  filtered.forEach((notification) => {
    const item = document.createElement("div");
    item.className = "notification-item";
    const recipient = escapeHtml(notification.recipientLabel || "");
    const sentAt = escapeHtml(formatNotificationDate(notification.sentAt));
    const message = escapeHtml(notification.message || "");
    const author = escapeHtml(notification.senderLabel || "Professor");
    const actions =
      window.userRole === "professor"
        ? `<button class="btn small ghost delete-notification-btn" data-id="${notification.id}">Excluir</button>`
        : "";
    item.innerHTML = `
      <div class="notification-meta">
        <strong>${recipient}</strong>
        <span>${sentAt}</span>
      </div>
      <p>${message}</p>
      <div class="notification-footer">
        <span class="notification-author">${author}</span>
        ${actions}
      </div>
    `;
    container.appendChild(item);
  });
}

function handleSendNotification() {
  const select = document.getElementById("notificationStudentSelect");
  const messageEl = document.getElementById("notificationMessage");
  if (!select || !messageEl) return;
  const message = messageEl.value.trim();
  if (!message) {
    alert("Digite uma mensagem para enviar.");
    return;
  }
  const selectedOption = select.options[select.selectedIndex];
  const recipientKey = selectedOption?.value || "all";
  const recipientLabel =
    selectedOption?.dataset?.name || selectedOption?.textContent || "";
  const notifications = getNotificationsFromStorage();
  notifications.unshift({
    id: `notif_${Date.now()}`,
    recipientKey,
    recipientLabel: recipientLabel || "Aluno",
    message,
    sentAt: new Date().toISOString(),
    senderLabel:
      userEmail && userEmail.endsWith("@professor.com")
        ? `Prof. ${userSubject || userEmail.split("@")[0]} (${userEmail})`
        : userEmail || "Professor",
  });
  saveNotifications(notifications);
  messageEl.value = "";
  renderNotificationsList();
}

function deleteNotification(notificationId) {
  if (!notificationId || window.userRole !== "professor") return;
  const notifications = getNotificationsFromStorage();
  const filtered = notifications.filter((n) => n.id !== notificationId);
  if (filtered.length === notifications.length) return;
  saveNotifications(filtered);
  renderNotificationsList();
}

function setupNotificationsPanel() {
  refreshNotificationStudentOptions();
  renderNotificationsList();
  const sendBtn = document.getElementById("sendNotificationBtn");
  const filterSelect = document.getElementById("notificationFilterSelect");
  sendBtn?.addEventListener("click", handleSendNotification);
  filterSelect?.addEventListener("change", renderNotificationsList);
  const listContainer = document.getElementById("notificationsList");
  listContainer?.addEventListener("click", (event) => {
    const target = event.target.closest(".delete-notification-btn");
    if (!target) return;
    const notificationId = target.getAttribute("data-id");
    deleteNotification(notificationId);
  });
}

function setupNotificationsToggle() {
  const section = document.getElementById("notificationsSection");
  const details = document.getElementById("notificationsDetails");
  const toggleBtn = document.getElementById("notificationToggleBtn");
  if (!section || !details || !toggleBtn) return;

  const updateLabel = () => {
    const isCollapsed = section.classList.contains("collapsed");
    toggleBtn.textContent = isCollapsed ? "Mostrar painel" : "Ocultar painel";
  };

  toggleBtn.addEventListener("click", () => {
    section.classList.toggle("collapsed");
    updateLabel();
  });

  updateLabel();
}

function getFrequenciaResumo(alunoNome = null) {
  if (!alunoNome) {
    if (window.userRole === "student") {
      return { diasCompletos: 18, faltas: 2, atrasos: 3, saidas: 1 };
    }
    return calcularFrequenciaGeral();
  }
  return calcularFrequenciaAluno(alunoNome);
}

function calcularFrequenciaAluno(alunoNome) {
  const attendanceRecords = JSON.parse(
    localStorage.getItem(STORAGE_KEY_ATTENDANCE) || "{}"
  );
  
  let diasCompletos = 0;
  let faltas = 0;
  let atrasos = 0;
  let saidas = 0;
  
  Object.keys(attendanceRecords).forEach((data) => {
    const record = attendanceRecords[data];
    if (record.present && record.present.includes(alunoNome)) {
      diasCompletos++;
    } else if (record.absent && record.absent.includes(alunoNome)) {
      faltas++;
    }
  });
  
  return { diasCompletos, faltas, atrasos, saidas };
}

function calcularFrequenciaGeral() {
  const attendanceRecords = JSON.parse(
    localStorage.getItem(STORAGE_KEY_ATTENDANCE) || "{}"
  );
  const classList = getClassListFromStorage();
  
  let totalDiasCompletos = 0;
  let totalFaltas = 0;
  
  Object.keys(attendanceRecords).forEach((data) => {
    const record = attendanceRecords[data];
    if (record.present) totalDiasCompletos += record.present.length;
    if (record.absent) totalFaltas += record.absent.length;
  });
  
  const totalAlunos = classList.length || 1;
  const diasCompletos = Math.round(totalDiasCompletos / totalAlunos);
  const faltas = Math.round(totalFaltas / totalAlunos);
  
  return { diasCompletos, faltas, atrasos: 0, saidas: 0 };
}

function calcularMediasTurma() {
  const materias = new Map();
  const celdas = document.querySelectorAll(".boletim-table tbody td.grade");
  celdas.forEach((cel) => {
    const materia = cel.getAttribute("data-materia");
    const bim = cel.getAttribute("data-bim");
    const valor = parseFloat(cel.textContent.replace(",", "."));
    if (!materia || !bim || isNaN(valor)) return;
    if (!materias.has(materia)) {
      materias.set(materia, { 1: [], 2: [], 3: [], 4: [] });
    }
    materias.get(materia)[bim].push(valor);
  });

  const resultado = [];
  materias.forEach((bimestres, materia) => {
    const medias = [1, 2, 3, 4].map((b) => {
      const arr = bimestres[String(b)];
      if (!arr || arr.length === 0) return "";
      const soma = arr.reduce((acc, n) => acc + n, 0);
      const media = soma / arr.length;
      return media.toFixed(1).replace(".", ",");
    });
    resultado.push({ materia, medias });
  });
  return resultado.sort((a, b) => a.materia.localeCompare(b.materia));
}

function renderMediasModal() {
  const tbody = document.getElementById("mediasTbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  const linhas = calcularMediasTurma();
  if (linhas.length === 0) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 5;
    td.textContent = "Sem dados para calcular as médias.";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  linhas.forEach(({ materia, medias }) => {
    const tr = document.createElement("tr");
    const tdMateria = document.createElement("td");
    tdMateria.textContent = materia;
    tr.appendChild(tdMateria);
    medias.forEach((m, idx) => {
      const td = document.createElement("td");
      td.classList.add("grade");
      td.setAttribute("data-materia", materia);
      td.setAttribute("data-bim", String(idx + 1));
      td.textContent = m || "";
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

function renderFrequencia(alunoNome = null) {
  const data = getFrequenciaResumo(alunoNome);
  const total = data.diasCompletos + data.faltas + data.atrasos + data.saidas;
  const sections = [
    { label: "Presenças", value: data.diasCompletos, color: "#22c55e" },
    { label: "Faltas", value: data.faltas, color: "#ef4444" },
    { label: "Atrasos", value: data.atrasos, color: "#fbbf24" },
    { label: "Saídas", value: data.saidas, color: "#60a5fa" },
  ];

  const canvas = document.getElementById("frequenciaChart");
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (total === 0) {
    // Se não há dados, mostrar mensagem
    ctx.fillStyle = "#666";
    ctx.font = "14px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Sem dados de frequência", canvas.width / 2, canvas.height / 2);
    
    const legenda = document.getElementById("frequenciaLegenda");
    legenda.innerHTML = "<p>Nenhum registro de frequência encontrado.</p>";
    return;
  }
  
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = Math.min(canvas.width, canvas.height) / 2 - 10;
  let startAngle = -Math.PI / 2;
  sections.forEach((s) => {
    if (s.value > 0) {
      const slice = total ? (s.value / total) * Math.PI * 2 : 0;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, startAngle, startAngle + slice);
      ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.fill();
      startAngle += slice;
    }
  });

  const legenda = document.getElementById("frequenciaLegenda");
  legenda.innerHTML = "";
  if (alunoNome) {
    const titulo = document.createElement("p");
    titulo.style.fontWeight = "bold";
    titulo.style.marginBottom = "10px";
    titulo.textContent = `Frequência de: ${alunoNome}`;
    legenda.appendChild(titulo);
  }
  sections.forEach((s) => {
    if (s.value > 0 || total === 0) {
      const percent = total ? Math.round((s.value / total) * 100) : 0;
      const item = document.createElement("p");
      item.style.display = "flex";
      item.style.alignItems = "center";
      item.style.gap = "8px";
      item.style.marginBottom = "6px";
      const swatch = document.createElement("span");
      swatch.style.display = "inline-block";
      swatch.style.width = "12px";
      swatch.style.height = "12px";
      swatch.style.borderRadius = "3px";
      swatch.style.background = s.color;
      const label = document.createElement("span");
      label.textContent = `${s.label}: ${s.value} (${percent}%)`;
      item.appendChild(swatch);
      item.appendChild(label);
      legenda.appendChild(item);
    }
  });
}

function iniciarRelogioBrasilia() {
  const clockEl = document.getElementById("brasiliaClock");
  const boletimClockTime = document.getElementById("boletimClockTime");
  const boletimClockDate = document.getElementById("boletimClockDate");
  
  if (!clockEl && !boletimClockTime) return;
  
  const update = () => {
    const agora = new Date();
    const formatter = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const dataFmt = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const dataFmtLong = new Intl.DateTimeFormat("pt-BR", {
      timeZone: "America/Sao_Paulo",
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    
    if (clockEl) {
      clockEl.innerHTML =
        "<strong>Horário de Brasília</strong><br>" +
        dataFmt.format(agora) +
        " · " +
        formatter.format(agora);
    }
    
    if (boletimClockTime) {
      boletimClockTime.textContent = formatter.format(agora);
    }
    if (boletimClockDate) {
      boletimClockDate.textContent = dataFmtLong.format(agora);
    }
  };
  
  update();
  if (clockIntervalId) clearInterval(clockIntervalId);
  clockIntervalId = setInterval(update, 1000);
}

function renderHomeFrequencia() {
  const content = document.getElementById("frequencia-resumo-content");
  if (!content) return;
  const data = getFrequenciaResumo();
  const totalDias =
    data.diasCompletos + data.faltas + data.atrasos + data.saidas;
  const presencaPercent =
    totalDias > 0 ? ((data.diasCompletos / totalDias) * 100).toFixed(1) : 0;
  content.innerHTML = `<div class="frequencia-percent"><span>${presencaPercent}%</span><p>de presença</p></div><div class="frequencia-detalhes"><p><strong>Faltas:</strong> ${data.faltas}</p><p><strong>Atrasos:</strong> ${data.atrasos}</p></div>`;
}

function lerPlanos() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_PLANOS) || "[]");
  } catch (e) {
    return [];
  }
}

function renderProximaAula() {
  const content = document.getElementById("proxima-aula-content");
  if (!content) return;
  const planos = lerPlanos().sort(
    (a, b) => new Date(a.dataAula) - new Date(b.dataAula)
  );
  const hoje = new Date().toISOString().split("T")[0];
  const proximaAula = planos.find((p) => p.dataAula >= hoje);
  if (proximaAula) {
    content.innerHTML = `<p><strong>Data:</strong> ${proximaAula.dataAula}</p><p><strong>Componente:</strong> ${proximaAula.componente}</p><p><strong>Conteúdo:</strong> ${proximaAula.conteudos}</p>`;
  } else {
    content.innerHTML = `<p>Nenhuma aula futura planejada.</p>`;
  }
}

function getEventosAgenda() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY_EVENTOS) || "[]");
  } catch (e) {
    return [];
  }
}

function salvarEventosAgenda(eventos) {
  localStorage.setItem(STORAGE_KEY_EVENTOS, JSON.stringify(eventos));
  updateHomeData();
}

function renderCalendario() {
  const container = document.getElementById("calendar-container");
  if (!container) return;

  const hoje = new Date();
  const hojeStr = hoje.toISOString().split("T")[0];
  const primeiroDia = new Date(calendarYear, calendarMonth, 1);
  const ultimoDia = new Date(calendarYear, calendarMonth + 1, 0);
  const diasNoMes = ultimoDia.getDate();
  const primeiroDiaSemana = primeiroDia.getDay();

  const eventos = getEventosAgenda();
  const planos = lerPlanos();

  const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  let html = `<div class="calendar-header">
    <button class="btn-calendar-nav" onclick="navegarCalendario(-1)" title="Mês anterior">‹</button>
    <h3>${meses[calendarMonth]} ${calendarYear}</h3>
    <div class="calendar-header-actions">
      <button class="btn-calendar-nav" onclick="navegarCalendario(1)" title="Próximo mês">›</button>
      ${window.userRole === "professor" ? '<button class="btn-calendar-add" onclick="abrirModalEvento()" title="Adicionar Evento">+</button>' : ''}
    </div>
  </div>`;
  html += '<div class="calendar-grid">';
  html += diasSemana.map(dia => `<div class="calendar-day-header">${dia}</div>`).join('');

  for (let i = 0; i < primeiroDiaSemana; i++) {
    html += '<div class="calendar-day empty"></div>';
  }

  for (let dia = 1; dia <= diasNoMes; dia++) {
    const dataStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    const dataObj = new Date(dataStr);
    const isHoje = dataStr === hojeStr;
    const isPassado = dataObj < hoje && !isHoje;
    
    const eventosDia = eventos.filter(e => e.data === dataStr);
    const planosDia = planos.filter(p => p.dataAula === dataStr);
    const temEventos = eventosDia.length > 0 || planosDia.length > 0;

    let classes = "calendar-day";
    if (isHoje) classes += " today";
    if (isPassado) classes += " past";
    if (temEventos) classes += " has-events";
    if (window.userRole === "professor" && !isPassado) classes += " clickable";

    let eventosHtml = '';
    if (eventosDia.length > 0) {
      eventosHtml += eventosDia.map(e => `<span class="event-dot" title="${escapeHtml(e.titulo)}"></span>`).join('');
    }
    if (planosDia.length > 0) {
      eventosHtml += `<span class="event-dot plano" title="Aula: ${planosDia[0].componente}"></span>`;
    }

    const clickHandler = window.userRole === "professor" && !isPassado 
      ? `onclick="abrirModalEvento('${dataStr}')"` 
      : '';

    html += `<div class="${classes}" ${clickHandler}>
      <span class="day-number">${dia}</span>
      <div class="day-events">${eventosHtml}</div>
    </div>`;
  }

  html += '</div>';
  container.innerHTML = html;
}

function navegarCalendario(direcao) {
  calendarMonth += direcao;
  if (calendarMonth < 0) {
    calendarMonth = 11;
    calendarYear--;
  } else if (calendarMonth > 11) {
    calendarMonth = 0;
    calendarYear++;
  }
  renderCalendario();
}

function renderAgenda() {
  const content = document.getElementById("agenda-content");
  if (!content) return;

  renderCalendario();

  const eventosList = document.getElementById("agenda-events-list");
  if (!eventosList) return;

  const hoje = new Date();
  const umaSemanaDepois = new Date(hoje);
  umaSemanaDepois.setDate(hoje.getDate() + 7);

  const eventos = getEventosAgenda().filter(e => {
    const dataEvento = new Date(e.data + "T00:00:00");
    return dataEvento >= hoje && dataEvento <= umaSemanaDepois;
  });

  const planos = lerPlanos().sort(
    (a, b) => new Date(a.dataAula) - new Date(b.dataAula)
  );
  const aulasDaSemana = planos.filter((p) => {
    const dataAula = new Date(p.dataAula + "T00:00:00");
    return dataAula >= hoje && dataAula <= umaSemanaDepois;
  });

  const todosEventos = [
    ...eventos.map(e => ({ tipo: 'evento', ...e })),
    ...aulasDaSemana.map(p => ({ tipo: 'aula', data: p.dataAula, titulo: p.componente, descricao: p.conteudos }))
  ].sort((a, b) => new Date(a.data) - new Date(b.data));

  if (todosEventos.length > 0) {
    eventosList.innerHTML = '<h4 style="margin-top: 20px; margin-bottom: 10px; color: #1a4db7;">Próximos Eventos</h4><ul class="agenda-list">' +
      todosEventos.map((item) => {
        const dataFormatada = item.data.split("-").reverse().join("/");
        const tipoClass = item.tipo === 'evento' ? 'evento-item' : 'aula-item';
        return `<li class="${tipoClass}">
          <strong>${dataFormatada}:</strong> ${escapeHtml(item.titulo)}
          ${item.descricao ? `<br><span class="event-desc">${escapeHtml(item.descricao)}</span>` : ''}
          ${window.userRole === "professor" && item.tipo === 'evento' ? `<button class="btn-remove-event" onclick="removerEvento('${item.id}')" title="Remover">×</button>` : ''}
        </li>`;
      }).join("") +
      "</ul>";
  } else {
    eventosList.innerHTML = '<p style="margin-top: 20px; color: #666;">Nenhum evento para os próximos 7 dias.</p>';
  }
}

function abrirModalEvento(dataPredefinida = null) {
  let modal = document.getElementById("eventoModal");
  if (!modal) {
    modal = document.createElement("div");
    modal.id = "eventoModal";
    modal.className = "modal";
    modal.style.display = "none";
    modal.innerHTML = `
      <div class="modal-content card" style="max-width: 500px;">
        <h3>Adicionar Evento</h3>
        <div style="margin-top: 12px;">
          <label>Data</label>
          <input type="date" id="eventoData" class="input" required />
        </div>
        <div style="margin-top: 12px;">
          <label>Título do Evento</label>
          <input type="text" id="eventoTitulo" class="input" placeholder="Ex: Reunião de Pais" required />
        </div>
        <div style="margin-top: 12px;">
          <label>Descrição (opcional)</label>
          <textarea id="eventoDescricao" class="input" rows="3" placeholder="Detalhes do evento..."></textarea>
        </div>
        <div style="margin-top: 16px; display: flex; gap: 8px; justify-content: flex-end;">
          <button class="btn small" onclick="fecharModalEvento()">Cancelar</button>
          <button class="btn" onclick="salvarEvento()">Salvar</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    modal.addEventListener("click", (e) => {
      if (e.target === modal) fecharModalEvento();
    });
    
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.style.display === "flex") {
        fecharModalEvento();
      }
    });
  }

  const dataInput = document.getElementById("eventoData");
  const tituloInput = document.getElementById("eventoTitulo");
  const descInput = document.getElementById("eventoDescricao");

  if (dataPredefinida) {
    dataInput.value = dataPredefinida;
  } else {
    const hoje = new Date();
    dataInput.value = hoje.toISOString().split("T")[0];
  }
  tituloInput.value = "";
  descInput.value = "";

  modal.style.display = "flex";
  setTimeout(() => tituloInput.focus(), 100);
}

function fecharModalEvento() {
  const modal = document.getElementById("eventoModal");
  if (modal) modal.style.display = "none";
}

function salvarEvento() {
  const dataInput = document.getElementById("eventoData");
  const tituloInput = document.getElementById("eventoTitulo");
  const descInput = document.getElementById("eventoDescricao");

  if (!dataInput.value || !tituloInput.value.trim()) {
    alert("Por favor, preencha a data e o título do evento.");
    return;
  }

  const eventos = getEventosAgenda();
  const novoEvento = {
    id: "evento_" + Date.now(),
    data: dataInput.value,
    titulo: tituloInput.value.trim(),
    descricao: descInput.value.trim() || ""
  };

  eventos.push(novoEvento);
  salvarEventosAgenda(eventos);
  fecharModalEvento();
}

function removerEvento(eventoId) {
  if (!confirm("Deseja remover este evento?")) return;
  const eventos = getEventosAgenda();
  const eventosFiltrados = eventos.filter(e => e.id !== eventoId);
  salvarEventosAgenda(eventosFiltrados);
}

function initHomeView() {
  renderHomeFrequencia();
  renderProximaAula();
  renderAgenda();
}

function aplicarCoresNotas() {
  const notas = document.querySelectorAll(".grade");
  notas.forEach((cel) => {
    cel.classList.remove("grade-high", "grade-mid", "grade-low");
    let valor = parseFloat(cel.textContent.replace(",", ".").replace(/[^\d.]/g, ""));
    if (isNaN(valor)) return;
    valor = Math.round(valor);
    cel.innerHTML = '<span class="grade-box">' + String(valor) + "</span>";
    const box = cel.querySelector(".grade-box");
    if (valor > 7) box.classList.add("grade-high");
    else if (valor >= 5) box.classList.add("grade-mid");
    else if (valor >= 1) box.classList.add("grade-low");
    if (window.userRole === "professor") {
      cel.style.cursor = "pointer";
      cel.onclick = () => editarNota(cel);
    } else {
      cel.onclick = null;
    }
  });
}


function showCustomToast(message, duration = 5000) {
  const container = document.getElementById('custom-toast-container');
  if (!container) return;

  // Verificar se já existe um toast com a mesma mensagem
  const existingToasts = container.querySelectorAll('.custom-toast');
  for (let existingToast of existingToasts) {
    const toastText = existingToast.textContent.trim().replace(/×/g, '').trim();
    const messageText = message.trim();
    if (toastText === messageText) {
      return;
    }
  }

  const toast = document.createElement('div');
  toast.className = 'custom-toast';
  const toastId = 'toast-' + Date.now();
  toast.id = toastId;
  
  const closeBtn = document.createElement('span');
  closeBtn.className = 'custom-toast-close';
  closeBtn.textContent = '×';
  closeBtn.style.cursor = 'pointer';
  closeBtn.addEventListener('click', function() {
    toast.remove();
  });
  
  const messageSpan = document.createElement('span');
  messageSpan.textContent = message;
  
  toast.appendChild(messageSpan);
  toast.appendChild(closeBtn);

  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  if (duration > 0) {
    setTimeout(() => {
      const toastElement = document.getElementById(toastId);
      if (toastElement) {
        toastElement.remove();
      }
    }, duration);
  }
}

function editarNota(cell) {
  if (cell.closest("#mediasModal")) {
    return;
  }

  const materiaDoProfessor = window.userSubject;
  const materiaDaCelula = cell.getAttribute("data-materia");

  if (
    window.userRole === "professor" &&
    materiaDaCelula !== materiaDoProfessor
  ) {
    const msg = materiaDoProfessor
      ? `Você só tem permissão para editar notas de ${materiaDoProfessor}.`
      : "Você não tem permissão para editar notas de nenhuma matéria.";
    showCustomToast(msg);
    return;
  }

  const originalValue = cell.querySelector(".grade-box").textContent;
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.max = "10";
  input.step = "0.5";
  input.value = originalValue.replace(",", ".");
  input.className = "grade-input";

  cell.innerHTML = "";
  cell.appendChild(input);
  input.focus();

  const saveChanges = () => {
    const newValue = parseFloat(input.value);
    if (!isNaN(newValue)) {
      const num = Math.max(0, Math.min(10, newValue));
      cell.textContent = num;
      aplicarCoresNotas();
    } else {
      cell.textContent = originalValue;
      aplicarCoresNotas();
    }
  };

  input.addEventListener("blur", saveChanges);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") input.blur();
    if (e.key === "Escape") {
      cell.textContent = originalValue;
      aplicarCoresNotas();
    }
  });
}

function normalizeBoletim() {
  const rows = document.querySelectorAll(".boletim-table tbody tr");
  rows.forEach((tr) => {
    const tds = Array.from(tr.querySelectorAll("td"));
    if (tds.length === 0) return;
    const materiaCell = tds[0];
    const materiaNome = (materiaCell.textContent || "").trim();
    for (let i = tds.length - 1; i >= 5; i--) tr.removeChild(tds[i]);
    const existing = tr.querySelectorAll("td.grade").length;
    for (let b = existing + 1; b <= 4; b++) {
      const td = document.createElement("td");
      td.className = "grade";
      td.setAttribute("data-materia", materiaNome);
      td.setAttribute("data-bim", String(b));
      td.textContent = "7";
      tr.appendChild(td);
    }
    tr.querySelectorAll("td.grade").forEach((cell, idx) => {
      cell.setAttribute("data-materia", materiaNome);
      cell.setAttribute("data-bim", String(idx + 1));
    });
  });
}

function salvarPlanos(planos) {
  localStorage.setItem(STORAGE_KEY_PLANOS, JSON.stringify(planos));
  dispatchAppEvent(EVENT_PLANOS_UPDATED);
}

function limparFormulario() {
  document.getElementById("planoForm").reset();
  document.getElementById("editingIndex").value = "";
  document.getElementById("salvarPlanoBtn").textContent = "Salvar";
  document.getElementById("cancelarEdicaoBtn").style.display = "none";
  const tipoManualRadio = document.getElementById("tipo-plano-manual");
  if (tipoManualRadio) {
    tipoManualRadio.checked = true;
    tipoManualRadio.dispatchEvent(new Event("change"));
  }
}

function preencherFormulario(plano) {
  document.getElementById("dataAula").value = plano.dataAula || "";
  document.getElementById("turma").value = plano.turma || "";
  document.getElementById("componente").value = plano.componente || "";
  document.getElementById("objetivos").value = plano.objetivos || "";
  document.getElementById("habilidades").value = plano.habilidades || "";
  document.getElementById("metodologia").value = plano.metodologia || "";
  document.getElementById("conteudos").value = plano.conteudos || "";
  document.getElementById("atividades").value = plano.atividades || "";
  document.getElementById("recursos").value = plano.recursos || "";
  document.getElementById("avaliacao").value = plano.avaliacao || "";
  document.getElementById("observacoes").value = plano.observacoes || "";
  
  // Definir tipo de plano
  const tipoPlano = plano.tipoPlano || "manual";
  const tipoManualRadio = document.getElementById("tipo-plano-manual");
  const tipoPdfRadio = document.getElementById("tipo-plano-pdf");
  
  if (tipoPlano === "pdf" && tipoPdfRadio) {
    tipoPdfRadio.checked = true;
    tipoManualRadio.checked = false;
  } else if (tipoManualRadio) {
    tipoManualRadio.checked = true;
    if (tipoPdfRadio) tipoPdfRadio.checked = false;
  }
  
  // Disparar evento para atualizar opções
  if (tipoManualRadio) {
    tipoManualRadio.dispatchEvent(new Event("change"));
  }
}

function renderPlanos() {
  // Renderizar para professores
  const tbody = document.getElementById("planosTbody");
  if (tbody) {
    const filtroTexto = (
      document.getElementById("filtroTexto")?.value || ""
    ).toLowerCase();
    const filtroMes = document.getElementById("filtroMes")?.value || "";
    const planos = lerPlanos();
    const planosFiltrados = planos.filter((p) => {
      const textoOk =
        !filtroTexto ||
        (p.turma || "").toLowerCase().includes(filtroTexto) ||
        (p.componente || "").toLowerCase().includes(filtroTexto) ||
        (p.conteudos || "").toLowerCase().includes(filtroTexto) ||
        (p.habilidades || "").toLowerCase().includes(filtroTexto) ||
        (p.objetivos || "").toLowerCase().includes(filtroTexto);
      const mesOk = !filtroMes || (p.dataAula || "").startsWith(filtroMes + "-");
      return textoOk && mesOk;
    });
    tbody.innerHTML = "";
    if (planosFiltrados.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7">Nenhum plano encontrado.</td></tr>';
    } else {
      planosFiltrados.forEach((plano) => {
        const indexOriginal = planos.indexOf(plano);
        const tr = document.createElement("tr");
        
        // Verificar se tem PDF anexado
        const temPdf = plano.pdfData && plano.pdfName;
        const anexoTexto = temPdf ? `📄 ${plano.pdfName}` : (plano.tipoPlano === "pdf" ? "PDF (sem arquivo)" : "-");
        
        tr.innerHTML = `<td>${plano.dataAula || ""}</td><td>${
          plano.turma || ""
        }</td><td>${plano.componente || ""}</td><td>${
          plano.objetivos || ""
        }</td><td>${plano.conteudos || ""}</td><td>${anexoTexto}</td>`;
        
        const tdAcoes = document.createElement("td");
        if (window.userRole === "professor") {
          const btnEditar = document.createElement("button");
          btnEditar.textContent = "Editar";
          btnEditar.onclick = () => editarPlano(indexOriginal);
          const btnExcluir = document.createElement("button");
          btnExcluir.textContent = "Excluir";
          btnExcluir.onclick = () => excluirPlano(indexOriginal);
          tdAcoes.appendChild(btnEditar);
          tdAcoes.appendChild(btnExcluir);
        } else {
          tdAcoes.textContent = "-";
        }
        tr.appendChild(tdAcoes);
        tbody.appendChild(tr);
      });
    }
  }
  
  // Renderizar para alunos
  renderPlanosAluno();
}

function renderPlanosAluno() {
  const tbody = document.getElementById("planosTbodyAluno");
  if (!tbody) return;
  
  const filtroTexto = (
    document.getElementById("filtroTextoAluno")?.value || ""
  ).toLowerCase();
  const filtroMes = document.getElementById("filtroMesAluno")?.value || "";
  const planos = lerPlanos();
  const planosFiltrados = planos.filter((p) => {
    const textoOk =
      !filtroTexto ||
      (p.turma || "").toLowerCase().includes(filtroTexto) ||
      (p.componente || "").toLowerCase().includes(filtroTexto) ||
      (p.conteudos || "").toLowerCase().includes(filtroTexto) ||
      (p.habilidades || "").toLowerCase().includes(filtroTexto) ||
      (p.objetivos || "").toLowerCase().includes(filtroTexto);
    const mesOk = !filtroMes || (p.dataAula || "").startsWith(filtroMes + "-");
    return textoOk && mesOk;
  });
  
  tbody.innerHTML = "";
  if (planosFiltrados.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6">Nenhum plano encontrado.</td></tr>';
    return;
  }
  
  planosFiltrados.forEach((plano) => {
    const tr = document.createElement("tr");
    
    // Verificar se tem PDF anexado
    const temPdf = plano.pdfData && plano.pdfName;
    const anexoTexto = temPdf ? "" : (plano.tipoPlano === "pdf" ? "PDF (sem arquivo)" : "-");
    
    // Criar células básicas
    tr.innerHTML = `<td>${plano.dataAula || ""}</td><td>${
      plano.turma || ""
    }</td><td>${plano.componente || ""}</td><td>${
      plano.objetivos || ""
    }</td><td>${plano.conteudos || ""}</td>`;
    
    // Adicionar célula de anexo
    const tdAnexo = document.createElement("td");
    if (temPdf) {
      const linkPdf = document.createElement("a");
      linkPdf.href = plano.pdfData;
      linkPdf.download = plano.pdfName;
      linkPdf.textContent = `📄 ${plano.pdfName}`;
      linkPdf.style.color = "#1a4db7";
      linkPdf.style.textDecoration = "none";
      linkPdf.target = "_blank";
      tdAnexo.appendChild(linkPdf);
    } else {
      tdAnexo.textContent = anexoTexto;
    }
    tr.appendChild(tdAnexo);
    
    tbody.appendChild(tr);
  });
}

function editarPlano(index) {
  const planos = lerPlanos();
  const plano = planos[index];
  if (!plano) return;
  preencherFormulario(plano);
  document.getElementById("editingIndex").value = String(index);
  document.getElementById("salvarPlanoBtn").textContent = "Atualizar";
  document.getElementById("cancelarEdicaoBtn").style.display = "inline-block";
  document.getElementById("dataAula").focus();
}

function excluirPlano(index) {
  if (!confirm("Deseja realmente excluir este plano?")) return;
  const planos = lerPlanos();
  planos.splice(index, 1);
  salvarPlanos(planos);
  renderPlanos();
  limparFormulario();
}

function showSection(sectionId) {
  document
    .querySelectorAll(".section")
    .forEach((s) => s.classList.remove("active"));
  document.getElementById(sectionId)?.classList.add("active");

  document
    .querySelectorAll(".nav-links a")
    .forEach((l) => l.classList.remove("active"));
  document.getElementById(sectionId + "-link")?.classList.add("active");
  const clock = document.getElementById("brasiliaClock");
  if (clock) clock.style.display = "none";
  if (sectionId === "plano") {
    renderPlanos();
    if (clock) clock.style.display = "block";
    const form = document.getElementById("planoForm");
    if (form)
      form.style.display = window.userRole === "student" ? "none" : "block";
  } else if (sectionId === "boletim") {
    normalizeBoletim();
    aplicarCoresNotas();
  } else if (sectionId === "provas") {
    if (clock) clock.style.display = "block";
    initProvasView();
    renderProvasAluno();
    renderNotasAnteriores();
  } else {
    if (clock) clock.style.display = "block";
  }
  initHomeView();
}

function initProvasView() {
  const professorView = document.getElementById("professor-view");
  const alunoView = document.getElementById("aluno-view");
  function switchRoleView(role) {
    if (role === "professor") {
      professorView.style.display = "block";
      alunoView.style.display = "none";
    } else {
      alunoView.style.display = "block";
      professorView.style.display = "none";
    }
  }
  switchRoleView(window.userRole);
}
function abrirModalMedias() {
  const modal = document.getElementById("mediasModal");
  if (!modal) return;
  renderMediasModal();
  modal.style.display = "flex";
  aplicarCoresNotas();
}

function fecharModalMedias() {
  const modal = document.getElementById("mediasModal");
  if (modal) modal.style.display = "none";
}

function abrirModalFrequencia() {
  const modal = document.getElementById("frequenciaModal");
  if (!modal) return;
  
  const selectorContainer = document.getElementById("frequenciaAlunoSelector");
  const alunoSelect = document.getElementById("frequenciaAlunoSelect");
  
  // Configurar seletor de alunos para professores
  if (window.userRole === "professor" && selectorContainer && alunoSelect) {
    // Popular o seletor com a lista de alunos
    alunoSelect.innerHTML = '<option value="">Todos os alunos</option>';
    const classList = getClassListFromStorage();
    classList.forEach((aluno) => {
      const option = document.createElement("option");
      option.value = aluno;
      option.textContent = aluno;
      alunoSelect.appendChild(option);
    });
    
    // Adicionar evento de mudança
    alunoSelect.onchange = () => {
      const alunoSelecionado = alunoSelect.value || null;
      renderFrequencia(alunoSelecionado);
    };
    
    // Renderizar frequência inicial (todos os alunos)
    renderFrequencia(null);
  } else {
    // Para alunos, garantir que o seletor esteja oculto
    if (selectorContainer) selectorContainer.style.display = "none";
    renderFrequencia(null);
  }
  
  modal.style.display = "flex";
}

function fecharModalFrequencia() {
  const modal = document.getElementById("frequenciaModal");
  if (modal) modal.style.display = "none";
}

function abrirModalChamada() {
  const modal = document.getElementById("chamadaModal");
  if (!modal) return;

  const chamadaList = document.getElementById("chamadaList");
  const studentList = JSON.parse(
    localStorage.getItem(STORAGE_KEY_CLASS_LIST) || "[]"
  );

  chamadaList.innerHTML = "";

  if (studentList.length === 0) {
    chamadaList.innerHTML =
      "<li>Nenhum aluno na turma. Adicione alunos na página Home.</li>";
  } else {
    // Verificar se já existe chamada do dia atual
    const today = new Date().toISOString().split("T")[0];
    const attendanceRecords = JSON.parse(
      localStorage.getItem(STORAGE_KEY_ATTENDANCE) || "{}"
    );
    const todayRecord = attendanceRecords[today];

    studentList.forEach((student, index) => {
      const li = document.createElement("li");
      li.style.padding = "10px 8px";
      
      // Determinar status inicial: se existe chamada do dia, usar ela, senão padrão é presente
      let initialStatus = "presente";
      let initialActive = "active";
      
      if (todayRecord) {
        if (todayRecord.present && todayRecord.present.includes(student)) {
          initialStatus = "presente";
          initialActive = "active";
        } else if (todayRecord.absent && todayRecord.absent.includes(student)) {
          initialStatus = "falta";
          initialActive = "";
        }
      }
      
      li.innerHTML = `
              <span>${student}</span>
              <div class="chamada-actions" data-student-index="${index}">
                  <button class="chamada-btn presente ${initialStatus === "presente" ? "active" : ""}" data-status="presente">R</button>
                  <button class="chamada-btn falta ${initialStatus === "falta" ? "active" : ""}" data-status="falta">F</button>
              </div>
          `;
      chamadaList.appendChild(li);
    });
  }

  chamadaList.querySelectorAll(".chamada-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const currentBtn = e.currentTarget;
      const actionGroup = currentBtn.parentElement;
      actionGroup
        .querySelectorAll(".chamada-btn")
        .forEach((b) => b.classList.remove("active"));
      currentBtn.classList.add("active");
    });
  });

  modal.style.display = "flex";
}

function fecharModalChamada() {
  const modal = document.getElementById("chamadaModal");
  if (modal) modal.style.display = "none";
}

function salvarChamada() {
  const presentStudents = [];
  const absentStudents = [];
  const studentList = JSON.parse(
    localStorage.getItem(STORAGE_KEY_CLASS_LIST) || "[]"
  );

  studentList.forEach((student, index) => {
    const activeBtn = document.querySelector(
      `.chamada-actions[data-student-index="${index}"] .chamada-btn.active`
    );
    if (activeBtn && activeBtn.dataset.status === "presente") {
      presentStudents.push(student);
    } else {
      absentStudents.push(student);
    }
  });

  const today = new Date().toISOString().split("T")[0];
  const attendanceRecords = JSON.parse(
    localStorage.getItem(STORAGE_KEY_ATTENDANCE) || "{}"
  );

  attendanceRecords[today] = {
    present: presentStudents,
    absent: absentStudents,
  };

  localStorage.setItem(
    STORAGE_KEY_ATTENDANCE,
    JSON.stringify(attendanceRecords)
  );

  alert(
    `Chamada para o dia ${today
      .split("-")
      .reverse()
      .join("/")} salva com sucesso!`
  );
  fecharModalChamada();
}

function marcarTodosPresente() {
  const chamadaList = document.getElementById("chamadaList");
  if (!chamadaList) return;

  chamadaList.querySelectorAll(".chamada-actions").forEach((actionGroup) => {
    const presenteBtn = actionGroup.querySelector('.chamada-btn[data-status="presente"]');
    const faltaBtn = actionGroup.querySelector('.chamada-btn[data-status="falta"]');
    
    if (presenteBtn && faltaBtn) {
      presenteBtn.classList.add("active");
      faltaBtn.classList.remove("active");
    }
  });
}

function marcarTodosFalta() {
  const chamadaList = document.getElementById("chamadaList");
  if (!chamadaList) return;

  chamadaList.querySelectorAll(".chamada-actions").forEach((actionGroup) => {
    const presenteBtn = actionGroup.querySelector('.chamada-btn[data-status="presente"]');
    const faltaBtn = actionGroup.querySelector('.chamada-btn[data-status="falta"]');
    
    if (presenteBtn && faltaBtn) {
      presenteBtn.classList.remove("active");
      faltaBtn.classList.add("active");
    }
  });
}

function carregarChamadaAnterior() {
  const today = new Date().toISOString().split("T")[0];
  const attendanceRecords = JSON.parse(
    localStorage.getItem(STORAGE_KEY_ATTENDANCE) || "{}"
  );
  
  const todayRecord = attendanceRecords[today];
  
  if (!todayRecord) {
    alert("Não há chamada anterior salva para hoje.");
    return;
  }

  const chamadaList = document.getElementById("chamadaList");
  if (!chamadaList) return;

  const studentList = JSON.parse(
    localStorage.getItem(STORAGE_KEY_CLASS_LIST) || "[]"
  );

  studentList.forEach((student, index) => {
    const actionGroup = chamadaList.querySelector(
      `.chamada-actions[data-student-index="${index}"]`
    );
    
    if (actionGroup) {
      const presenteBtn = actionGroup.querySelector('.chamada-btn[data-status="presente"]');
      const faltaBtn = actionGroup.querySelector('.chamada-btn[data-status="falta"]');
      
      if (todayRecord.present && todayRecord.present.includes(student)) {
        if (presenteBtn && faltaBtn) {
          presenteBtn.classList.add("active");
          faltaBtn.classList.remove("active");
        }
      } else if (todayRecord.absent && todayRecord.absent.includes(student)) {
        if (presenteBtn && faltaBtn) {
          presenteBtn.classList.remove("active");
          faltaBtn.classList.add("active");
        }
      }
    }
  });

  alert("Chamada anterior do dia carregada com sucesso!");
}

function setupChamadaModal() {
  document
    .getElementById("realizarChamadaBtn")
    ?.addEventListener("click", abrirModalChamada);
  document
    .getElementById("fecharChamadaBtn")
    ?.addEventListener("click", fecharModalChamada);
  document
    .getElementById("salvarChamadaBtn")
    ?.addEventListener("click", salvarChamada);
  document
    .getElementById("marcarTodosPresenteBtn")
    ?.addEventListener("click", marcarTodosPresente);
  document
    .getElementById("marcarTodosFaltaBtn")
    ?.addEventListener("click", marcarTodosFalta);
  document
    .getElementById("carregarChamadaAnteriorBtn")
    ?.addEventListener("click", carregarChamadaAnterior);
  document.getElementById("chamadaModal")?.addEventListener("click", (e) => {
    if (e.target.id === "chamadaModal") fecharModalChamada();
  });

  if (window.userRole === "professor") {
    const btn = document.getElementById("realizarChamadaBtn");
    if (btn) btn.style.display = "inline-block";
  }
}

function fecharTakeProvaModal() {
  const modal = document.getElementById("takeProvaModal");
  if (modal) modal.style.display = "none";
  const resultEl = document.getElementById("takeProvaResult");
  if (resultEl) {
    resultEl.innerHTML = "";
    resultEl.style.display = "none";
  }
}

function renderNotasAnteriores() {
  const container = document.getElementById("notasAnterioresContent");
  if (!container) return;

  const notasSalvas = JSON.parse(
    localStorage.getItem(STORAGE_KEY_NOTAS) || "[]"
  );
  const provasPublicadas = JSON.parse(
    localStorage.getItem(STORAGE_KEY_PROVAS) || "[]"
  );

  if (notasSalvas.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #666;">Nenhuma nota registrada ainda.</p>';
    return;
  }

  // Filtrar apenas notas de provas (não PDFs visualizados)
  const notasProvas = notasSalvas.filter(n => n.nota !== null && n.nota !== undefined);

  if (notasProvas.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #666;">Nenhuma prova finalizada ainda.</p>';
    return;
  }

  // Criar tabela de notas
  let html = '<table class="boletim-table" style="width: 100%; margin-top: 20px;">';
  html += '<thead><tr><th>Prova</th><th>Componente</th><th>Acertos</th><th>Nota</th><th>Data</th></tr></thead>';
  html += '<tbody>';

  notasProvas.forEach((nota) => {
    const prova = provasPublicadas.find(p => p.id === nota.provaId);
    if (!prova) return;

    const dataFormatada = nota.data 
      ? new Date(nota.data).toLocaleDateString('pt-BR', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      : '-';

    html += `<tr>
      <td>${escapeHtml(prova.titulo || 'Sem título')}</td>
      <td>${escapeHtml(prova.componente || '-')}</td>
      <td>${nota.acertos || 0}/${nota.totalQuestoes || 0}</td>
      <td class="grade" style="font-weight: bold;">${nota.nota}</td>
      <td>${dataFormatada}</td>
    </tr>`;
  });

  html += '</tbody></table>';
  container.innerHTML = html;

  // Aplicar cores nas notas
  aplicarCoresNotas();
}

document.addEventListener("DOMContentLoaded", function () {
  document
    .getElementById("abrirMediasBtn")
    ?.addEventListener("click", abrirModalMedias);
  document
    .getElementById("fecharMediasBtn")
    ?.addEventListener("click", fecharModalMedias);
  document.getElementById("mediasModal")?.addEventListener("click", (e) => {
    if (e.target.id === "mediasModal") fecharModalMedias();
  });

  document
    .getElementById("abrirFrequenciaBtn")
    ?.addEventListener("click", abrirModalFrequencia);
  document
    .getElementById("fecharFrequenciaBtn")
    ?.addEventListener("click", fecharModalFrequencia);
  document.getElementById("frequenciaModal")?.addEventListener("click", (e) => {
    if (e.target.id === "frequenciaModal") fecharModalFrequencia();
  });
  document.getElementById("takeProvaModal")?.addEventListener("click", (e) => {
    if (e.target.id === "takeProvaModal") fecharTakeProvaModal();
  });
  
  // Configurar modal de notas anteriores
  function abrirModalNotas() {
    const modal = document.getElementById("notas-modal");
    if (!modal) return;
    renderNotasAnteriores();
    modal.style.display = "flex";
  }
  
  function fecharModalNotas() {
    const modal = document.getElementById("notas-modal");
    if (modal) modal.style.display = "none";
  }
  
  document.getElementById("open-grades-modal")?.addEventListener("click", abrirModalNotas);
  document.querySelector(".close-btn-provas")?.addEventListener("click", fecharModalNotas);
  document.getElementById("notas-modal")?.addEventListener("click", (e) => {
    if (e.target.id === "notas-modal") fecharModalNotas();
  });

  // Adiciona uma prova de exemplo se não houver nenhuma
  const provasExistentes = localStorage.getItem(STORAGE_KEY_PROVAS);
  if (!provasExistentes || JSON.parse(provasExistentes).length === 0) {
    const provaExemplo = {
      id: "prova_exemplo_1",
      componente: "História",
      titulo: "Revolução Francesa - Avaliação Inicial",
      duration: 10,
      shuffle: true,
      questoes: [
        {
          id: 1,
          pergunta:
            "Qual evento é considerado o estopim da Revolução Francesa?",
          alternativas: {
            a: "A coroação de Napoleão",
            b: "A Queda da Bastilha",
            c: "A convocação dos Estados Gerais",
            d: "A morte de Luís XVI",
          },
          respostaCorreta: "b",
        },
      ],
      pdfData: null,
      pdfName: null,
    };
    localStorage.setItem(STORAGE_KEY_PROVAS, JSON.stringify([provaExemplo]));
  }

  showSection("home");
  initHomeView();
  normalizeBoletim();
  aplicarCoresNotas();
  initProvasView();
  renderProvasAluno();
  setupPlanoAulas();
  setupClassList();
  setupNotificationsPanel();
  setupProvaForm();
  setupClassToggle();
  setupChamadaModal();

  iniciarRelogioBrasilia();
  setupNotificationsToggle();
  setupAgendaToggle();
  setupStorageSync();
});

function setupPlanoAulas() {
  const planoForm = document.getElementById("planoForm");
  if (!planoForm) return;

  const tipoManualRadio = document.getElementById("tipo-plano-manual");
  const tipoPdfRadio = document.getElementById("tipo-plano-pdf");
  const opcaoManual = document.getElementById("opcao-plano-manual");
  const opcaoPdf = document.getElementById("opcao-plano-pdf");

  // Controlar a exibição das opções baseado na escolha
  function atualizarOpcoesPlano() {
    if (tipoManualRadio && tipoManualRadio.checked) {
      if (opcaoManual) opcaoManual.style.display = "block";
      if (opcaoPdf) opcaoPdf.style.display = "none";
      // Tornar campos obrigatórios quando manual
      const camposObrigatorios = ["objetivos", "conteudos", "atividades"];
      camposObrigatorios.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) campo.required = true;
      });
      const campoPdf = document.getElementById("planoPdf");
      if (campoPdf) campoPdf.required = false;
    } else if (tipoPdfRadio && tipoPdfRadio.checked) {
      if (opcaoManual) opcaoManual.style.display = "none";
      if (opcaoPdf) opcaoPdf.style.display = "block";
      // Tornar PDF obrigatório quando PDF selecionado
      const campoPdf = document.getElementById("planoPdf");
      if (campoPdf) campoPdf.required = true;
      // Remover obrigatoriedade dos campos quando PDF
      const camposObrigatorios = ["objetivos", "conteudos", "atividades"];
      camposObrigatorios.forEach(id => {
        const campo = document.getElementById(id);
        if (campo) campo.required = false;
      });
    }
  }

  tipoManualRadio?.addEventListener("change", atualizarOpcoesPlano);
  tipoPdfRadio?.addEventListener("change", atualizarOpcoesPlano);
  atualizarOpcoesPlano(); // Inicializar estado

  planoForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const tipoPlano = planoForm.querySelector("input[name='tipo-plano']:checked")?.value || "manual";
    const pdfFile = document.getElementById("planoPdf")?.files[0];

    // Validação baseada no tipo escolhido
    if (tipoPlano === "pdf" && !pdfFile) {
      alert("Por favor, anexe um arquivo PDF com o plano de aula.");
      return;
    }

    if (tipoPlano === "manual") {
      const objetivos = document.getElementById("objetivos").value.trim();
      const conteudos = document.getElementById("conteudos").value.trim();
      const atividades = document.getElementById("atividades").value.trim();
      if (!objetivos || !conteudos || !atividades) {
        alert("Preencha os campos obrigatórios: Objetivos, Conteúdos e Atividades.");
        return;
      }
    }

    const novoPlano = {
      dataAula: document.getElementById("dataAula").value,
      turma: document.getElementById("turma").value.trim(),
      componente: document.getElementById("componente").value.trim(),
      objetivos: document.getElementById("objetivos").value.trim(),
      habilidades: document.getElementById("habilidades").value.trim(),
      conteudos: document.getElementById("conteudos").value.trim(),
      metodologia: document.getElementById("metodologia").value.trim(),
      atividades: document.getElementById("atividades").value.trim(),
      recursos: document.getElementById("recursos").value.trim(),
      avaliacao: document.getElementById("avaliacao").value.trim(),
      observacoes: document.getElementById("observacoes").value.trim(),
      tipoPlano: tipoPlano,
      pdfData: null,
      pdfName: null,
      atualizadoEm: new Date().toISOString(),
    };

    // Processar PDF se anexado
    if (pdfFile) {
      const readFileAsBase64 = (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
      try {
        novoPlano.pdfData = await readFileAsBase64(pdfFile);
        novoPlano.pdfName = pdfFile.name;
      } catch (error) {
        alert("Erro ao processar o PDF.");
        return;
      }
    }

    const planos = lerPlanos();
    const editingIndex = document.getElementById("editingIndex").value;
    if (editingIndex !== "") {
      planos[Number(editingIndex)] = novoPlano;
    } else {
      planos.push(novoPlano);
    }
    salvarPlanos(planos);
    renderPlanos();
    limparFormulario();
    // Resetar para manual após salvar
    if (tipoManualRadio) tipoManualRadio.checked = true;
    atualizarOpcoesPlano();
  });

  document
    .getElementById("cancelarEdicaoBtn")
    ?.addEventListener("click", limparFormulario);
  document
    .getElementById("filtroTexto")
    ?.addEventListener("input", renderPlanos);
  document
    .getElementById("filtroMes")
    ?.addEventListener("change", renderPlanos);
  
  // Configurar filtros para alunos
  document
    .getElementById("filtroTextoAluno")
    ?.addEventListener("input", renderPlanosAluno);
  document
    .getElementById("filtroMesAluno")
    ?.addEventListener("change", renderPlanosAluno);
  
  renderPlanos();
}

function setupClassList() {
  function renderClass() {
    const ul = document.getElementById("classList");
    if (!ul) return;
    const list = getClassListFromStorage();
    ul.innerHTML = "";
    if (list.length === 0) {
      const emptyLi = document.createElement("li");
      emptyLi.innerHTML = "<span>Nenhum aluno cadastrado até o momento.</span>";
      ul.appendChild(emptyLi);
    } else {
      list.forEach((name, idx) => {
        const li = document.createElement("li");
        li.innerHTML = `<span>${name}</span>`;
        if (window.userRole === "professor") {
          const btn = document.createElement("button");
          btn.textContent = "Remover";
          btn.className = "small";
          btn.onclick = () => {
            const updatedList = getClassListFromStorage();
            const removeIndex = updatedList.findIndex(
              (student) => student === name
            );
            if (removeIndex === -1) return;
            updatedList.splice(removeIndex, 1);
            saveClassList(updatedList);
            renderClass();
          };
          li.appendChild(btn);
        }
        ul.appendChild(li);
      });
    }
    updateClassSummary(list);
    refreshNotificationStudentOptions();
    renderNotificationsList();
  }
  document.getElementById("addStudentBtn")?.addEventListener("click", () => {
    const input = document.getElementById("newStudentName");
    const val = input.value.trim();
    if (!val) {
      alert("Digite o nome do aluno.");
      return;
    }
    const list = getClassListFromStorage();
    list.push(val);
    saveClassList(list);
    input.value = "";
    renderClass();
  });
  renderClass();
}

function setupClassToggle() {
  const section = document.getElementById("classSection");
  const details = document.getElementById("classDetails");
  const toggleBtn = document.getElementById("classToggleBtn");
  if (!section || !details || !toggleBtn) return;

  section.classList.add("collapsed");
  const updateLabel = () => {
    const isCollapsed = section.classList.contains("collapsed");
    toggleBtn.textContent = isCollapsed ? "Mostrar alunos" : "Ocultar alunos";
  };

  toggleBtn.addEventListener("click", () => {
    section.classList.toggle("collapsed");
    updateLabel();
  });
  updateLabel();
}

function setupAgendaToggle() {
  const section = document.getElementById("agenda-card");
  const toggleBtn = document.getElementById("agendaToggleBtn");
  if (!section || !toggleBtn) return;

  section.classList.add("collapsed");
  const updateLabel = () => {
    const isCollapsed = section.classList.contains("collapsed");
    toggleBtn.textContent = isCollapsed ? "Mostrar calendário" : "Ocultar calendário";
  };

  toggleBtn.addEventListener("click", () => {
    section.classList.toggle("collapsed");
    updateLabel();
  });
  updateLabel();
}

function setupProvaForm() {
  const provaForm = document.querySelector("#professor-view form");
  if (!provaForm) return;

  let rascunhoQuestoes = [];

  const salvarRascunhoBtn = document.getElementById("salvarRascunhoQuestaoBtn");
  const publicarProvaBtn = document.getElementById("publicarProvaBtn");
  const tipoManualRadio = document.getElementById("tipo-manual");
  const tipoPdfRadio = document.getElementById("tipo-pdf");
  const opcaoManual = document.getElementById("opcao-manual");
  const opcaoPdf = document.getElementById("opcao-pdf");

  // Controlar a exibição das opções baseado na escolha
  function atualizarOpcoes() {
    if (tipoManualRadio.checked) {
      opcaoManual.style.display = "block";
      opcaoPdf.style.display = "none";
      // Tornar campos de questão obrigatórios
      provaForm.querySelector("#pergunta").required = true;
      provaForm.querySelectorAll(".alternative-input input[type='text']").forEach(input => {
        input.required = true;
      });
      provaForm.querySelector("#provaPdf").required = false;
    } else if (tipoPdfRadio.checked) {
      opcaoManual.style.display = "none";
      opcaoPdf.style.display = "block";
      // Tornar campo PDF obrigatório
      provaForm.querySelector("#provaPdf").required = true;
      // Remover obrigatoriedade dos campos de questão
      provaForm.querySelector("#pergunta").required = false;
      provaForm.querySelectorAll(".alternative-input input[type='text']").forEach(input => {
        input.required = false;
      });
    }
  }

  tipoManualRadio?.addEventListener("change", atualizarOpcoes);
  tipoPdfRadio?.addEventListener("change", atualizarOpcoes);
  atualizarOpcoes(); // Inicializar estado

  function limparFormularioQuestao() {
    provaForm.querySelector("#pergunta").value = "";
    const alternativasInputs = provaForm.querySelectorAll(
      ".alternative-input input[type='text']"
    );
    alternativasInputs.forEach((input) => (input.value = ""));
    const radios = provaForm.querySelectorAll(
      ".alternative-input input[type='radio']"
    );
    radios.forEach((radio) => (radio.checked = false));
    provaForm.querySelector("#pergunta").focus();
  }

  salvarRascunhoBtn?.addEventListener("click", () => {
    const pergunta = provaForm.querySelector("#pergunta").value.trim();
    const respostaCorretaEl = provaForm.querySelector(
      "input[name='resposta-correta']:checked"
    );

    if (!pergunta || !respostaCorretaEl) {
      alert("Preencha a pergunta e selecione a alternativa correta.");
      return;
    }

    const alternativas = {};
    const alternativeInputs = provaForm.querySelectorAll(".alternative-input");
    alternativeInputs.forEach((alt) => {
      const key = alt.querySelector("input[type='radio']").value;
      const text = alt.querySelector("input[type='text']").value.trim();
      if (text) alternativas[key] = text;
    });

    if (Object.keys(alternativas).length < 2) {
      alert("É necessário preencher pelo menos duas alternativas.");
      return;
    }

    rascunhoQuestoes.push({
      id: Date.now(),
      pergunta: pergunta,
      alternativas: alternativas,
      respostaCorreta: respostaCorretaEl.value,
    });
    alert(`Questão ${rascunhoQuestoes.length} adicionada ao rascunho!`);
    limparFormularioQuestao();
  });

  publicarProvaBtn?.addEventListener("click", async (e) => {
    e.preventDefault();
    const componente = provaForm
      .querySelector("#componente-prova")
      .value.trim();
    const titulo = provaForm.querySelector("#titulo-prova").value.trim();
    const duracao = provaForm.querySelector("#duracao-prova").value;
    const shuffle = provaForm.querySelector("#shuffle-prova").checked;
    const tipoProva = provaForm.querySelector("input[name='tipo-prova']:checked")?.value;
    const pdfFile = provaForm.querySelector("#provaPdf").files[0];

    if (!componente || !titulo) {
      alert("Preencha o componente e o título da prova.");
      return;
    }

    // Validação baseada no tipo escolhido
    if (tipoProva === "manual") {
      if (rascunhoQuestoes.length === 0) {
        alert("Adicione pelo menos uma questão antes de publicar a prova.");
        return;
      }
    } else if (tipoProva === "pdf") {
      if (!pdfFile) {
        alert("Por favor, anexe um arquivo PDF com as questões da prova.");
        return;
      }
    }

    const novaProva = {
      id: `prova_${Date.now()}`,
      componente,
      titulo,
      duration: duracao ? parseInt(duracao, 10) : null,
      shuffle,
      tipoProva: tipoProva || "manual",
      questoes: tipoProva === "manual" ? rascunhoQuestoes : [],
      pdfData: null,
      pdfName: null,
    };

    if (pdfFile) {
      const readFileAsBase64 = (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
      try {
        novaProva.pdfData = await readFileAsBase64(pdfFile);
        novaProva.pdfName = pdfFile.name;
      } catch (error) {
        alert("Erro ao processar o PDF.");
        return;
      }
    }

    const provasSalvas = JSON.parse(
      localStorage.getItem(STORAGE_KEY_PROVAS) || "[]"
    );
    provasSalvas.push(novaProva);
    localStorage.setItem(STORAGE_KEY_PROVAS, JSON.stringify(provasSalvas));

    alert("Prova publicada com sucesso!");
    rascunhoQuestoes = [];
    provaForm.reset();
    tipoManualRadio.checked = true;
    atualizarOpcoes();
    notifyProvasChanged();
  });
}

function renderProvasAluno() {
  const provasPublicadas = JSON.parse(
    localStorage.getItem(STORAGE_KEY_PROVAS) || "[]"
  );
  const notasSalvas = JSON.parse(
    localStorage.getItem(STORAGE_KEY_NOTAS) || "[]"
  );
  // Filtrar apenas notas de provas concluídas (com nota real, não apenas visualizadas)
  const provasConcluidasIds = notasSalvas
    .filter((n) => n.nota !== null && n.nota !== undefined)
    .map((n) => n.provaId);

  const listaUl = document.getElementById("provasPendentesLista");
  if (!listaUl) return;
  listaUl.innerHTML = "";

  const provasPendentes = provasPublicadas.filter(
    (p) => !provasConcluidasIds.includes(p.id)
  );

  if (provasPendentes.length === 0) {
    listaUl.innerHTML =
      '<li class="prova-item">Nenhuma prova pendente no momento.</li>';
    return;
  }

  provasPendentes.forEach((prova) => {
    const li = document.createElement("li");
    li.className = "prova-item";
    li.innerHTML = `<span><strong>${prova.componente}:</strong> ${prova.titulo}</span>`;

    const btn = document.createElement("button");
    btn.textContent = "Iniciar Prova";
    btn.className = "btn-aluno";
    btn.onclick = () => iniciarProva(prova);

    li.appendChild(btn);
    listaUl.appendChild(li);
  });
}

function iniciarProva(prova) {
  const modal = document.getElementById("takeProvaModal");
  const titleEl = document.getElementById("takeProvaTitle");
  const contentEl = document.getElementById("takeProvaContent");
  const resultEl = document.getElementById("takeProvaResult");
  const finalizarBtn = document.getElementById("finalizarProvaBtn");
  const pdfLinkContainer = document.getElementById("takeProvaPdfLinkContainer");

  titleEl.textContent = `${prova.componente}: ${prova.titulo}`;
  contentEl.innerHTML = "";
  resultEl.style.display = "none";
  finalizarBtn.style.display = "block";
  finalizarBtn.disabled = false;
  pdfLinkContainer.innerHTML = "";

  // Se a prova tem PDF, mostrar o PDF
  if (prova.pdfData && prova.tipoProva === "pdf") {
    const pdfIframe = document.createElement("iframe");
    pdfIframe.src = prova.pdfData;
    pdfIframe.style.width = "100%";
    pdfIframe.style.height = "600px";
    pdfIframe.style.border = "1px solid #ccc";
    pdfIframe.style.borderRadius = "8px";
    contentEl.appendChild(pdfIframe);
    
    const downloadLink = document.createElement("a");
    downloadLink.href = prova.pdfData;
    downloadLink.download = prova.pdfName || "prova.pdf";
    downloadLink.textContent = `📥 Baixar PDF: ${prova.pdfName || "prova.pdf"}`;
    downloadLink.className = "btn-professor";
    downloadLink.style.display = "inline-block";
    downloadLink.style.marginTop = "10px";
    pdfLinkContainer.appendChild(downloadLink);
    
    // Para provas com PDF, não há correção automática
    finalizarBtn.textContent = "Fechar";
    finalizarBtn.onclick = () => {
      // Marcar prova PDF como visualizada (sem nota, pois não há correção automática)
      const notasSalvas = JSON.parse(
        localStorage.getItem(STORAGE_KEY_NOTAS) || "[]"
      );
      // Verificar se já não foi marcada
      const jaMarcada = notasSalvas.some(n => n.provaId === prova.id);
      if (!jaMarcada) {
        notasSalvas.push({
          provaId: prova.id,
          nota: null,
          tipo: "pdf",
          visualizada: true,
          data: new Date().toISOString(),
        });
        localStorage.setItem(STORAGE_KEY_NOTAS, JSON.stringify(notasSalvas));
        notifyProvasChanged();
        notifyNotasChanged();
      }
      fecharTakeProvaModal();
    };
  } else {
    // Prova manual com questões digitais
    if (!prova.questoes || prova.questoes.length === 0) {
      contentEl.innerHTML = "<p>Nenhuma questão disponível para esta prova.</p>";
      finalizarBtn.textContent = "Fechar";
      finalizarBtn.onclick = fecharTakeProvaModal;
      modal.style.display = "flex";
      return;
    }

    prova.questoes.forEach((q, index) => {
      const questaoDiv = document.createElement("div");
      questaoDiv.className = "question-form";
      let alternativasHtml = "";
      for (const key in q.alternativas) {
        alternativasHtml += `
                  <div style="margin: 5px 0;">
                      <label style="cursor: pointer; display: flex; align-items: center;">
                          <input type="radio" name="q_${index}" value="${key}" style="margin-right: 10px;">
                          <strong>${key.toUpperCase()})</strong>&nbsp;${escapeHtml(
          q.alternativas[key]
        )}
                      </label>
                  </div>
              `;
      }
      questaoDiv.innerHTML = `
              <div class="form-group">
                  <label><strong>Questão ${index + 1}:</strong> ${escapeHtml(
        q.pergunta
      )}</label>
                  ${alternativasHtml}
              </div>
          `;
      contentEl.appendChild(questaoDiv);
    });

    finalizarBtn.textContent = "Finalizar e Ver Nota";
    finalizarBtn.onclick = () => finalizarProva(prova);
  }

  modal.style.display = "flex";
}

function finalizarProva(prova) {
  const finalizarBtn = document.getElementById("finalizarProvaBtn");
  finalizarBtn.disabled = true;

  let acertos = 0;
  prova.questoes.forEach((q, index) => {
    const respostaSelecionada = document.querySelector(
      `input[name="q_${index}"]:checked`
    );
    if (
      respostaSelecionada &&
      respostaSelecionada.value === q.respostaCorreta
    ) {
      acertos++;
    }
  });

  const totalQuestoes = prova.questoes.length || 1;
  const nota = (acertos / totalQuestoes) * 10;

  // Salvar a nota
  const notasSalvas = JSON.parse(
    localStorage.getItem(STORAGE_KEY_NOTAS) || "[]"
  );
  notasSalvas.push({
    provaId: prova.id,
    nota: nota.toFixed(1),
    acertos: acertos,
    totalQuestoes: totalQuestoes,
    data: new Date().toISOString(),
  });
  localStorage.setItem(STORAGE_KEY_NOTAS, JSON.stringify(notasSalvas));

  const resultEl = document.getElementById("takeProvaResult");
  resultEl.style.display = "block";
  resultEl.innerHTML = `
        <strong>Resultado da Avaliação</strong>
        <p>Você acertou <strong>${acertos}</strong> de <strong>${totalQuestoes}</strong> questões.</p>
        <p class="final-grade">Sua nota final é: ${nota.toFixed(1)}</p>
    `;

  finalizarBtn.textContent = "Fechar";
  finalizarBtn.onclick = fecharTakeProvaModal;
  
  // Atualizar a lista de provas pendentes imediatamente
  renderProvasAluno();
  
  // Atualizar notas anteriores
  renderNotasAnteriores();
  
  setTimeout(fecharTakeProvaModal, 4000);

  notifyProvasChanged();
  notifyNotasChanged();
}

// Função de logout
function logout() {
  if (confirm("Tem certeza que deseja sair da conta?")) {
    // Limpar dados de autenticação do localStorage
    localStorage.removeItem("sub_authed");
    localStorage.removeItem("user_email");
    
    // Redirecionar para a página de login
    window.location.href = "pages/Login.html";
  }
}

// Tornar a função disponível globalmente
window.logout = logout;
