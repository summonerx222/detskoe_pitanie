const config = window.APP_CONFIG || {};

const state = {
  user: null,
  sessionId: null,
  lastQuestion: null,
  lastAnswer: null,
  lastSources: [],
  messages: []
};

const els = {
  loginView: document.getElementById('loginView'),
  appView: document.getElementById('appView'),
  loginForm: document.getElementById('loginForm'),
  loginInput: document.getElementById('loginInput'),
  passwordInput: document.getElementById('passwordInput'),
  togglePasswordBtn: document.getElementById('togglePasswordBtn'),
  loginSubmitBtn: document.getElementById('loginSubmitBtn'),
  loginStatus: document.getElementById('loginStatus'),
  roleBadge: document.getElementById('roleBadge'),
  userInfo: document.getElementById('userInfo'),
  adminPanel: document.getElementById('adminPanel'),
  rootPathInput: document.getElementById('rootPathInput'),
  updateBaseBtn: document.getElementById('updateBaseBtn'),
  updateBaseStatus: document.getElementById('updateBaseStatus'),
  logoutBtn: document.getElementById('logoutBtn'),
  newChatBtn: document.getElementById('newChatBtn'),
  chatMessages: document.getElementById('chatMessages'),
  askForm: document.getElementById('askForm'),
  questionInput: document.getElementById('questionInput'),
  askSubmitBtn: document.getElementById('askSubmitBtn'),
  askStatus: document.getElementById('askStatus'),
  feedbackForm: document.getElementById('feedbackForm'),
  feedbackComment: document.getElementById('feedbackComment'),
  feedbackStatus: document.getElementById('feedbackStatus'),
  feedbackSubmitBtn: document.getElementById('feedbackSubmitBtn')
};

els.rootPathInput.value = config.DEFAULT_ROOT_PATH || 'app:/Детское питание';

function generateSessionId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `sess_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function setStatus(element, message = '', type = '') {
  element.textContent = message;
  element.classList.remove('is-error', 'is-success');
  if (type === 'error') element.classList.add('is-error');
  if (type === 'success') element.classList.add('is-success');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatDate(date = new Date()) {
  return new Intl.DateTimeFormat('ru-RU', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

function resetFeedbackForm() {
  els.feedbackForm.reset();
  setStatus(els.feedbackStatus, '');
}

function renderUser() {
  if (!state.user) return;

  els.roleBadge.textContent = state.user.role || 'user';
  els.userInfo.innerHTML = `
    <div><strong>Логин:</strong> ${escapeHtml(state.user.login || '—')}</div>
    <div><strong>Роль:</strong> ${escapeHtml(state.user.role || 'user')}</div>
    <div><strong>Session ID:</strong> ${escapeHtml(state.sessionId)}</div>
  `;

  const isAdmin = state.user.role === 'admin';
  els.adminPanel.classList.toggle('hidden', !isAdmin);
}

function renderMessages() {
  if (!state.messages.length) {
    els.chatMessages.innerHTML = `
      <div class="empty-state">
        <div>
          <strong>Диалог пока пуст.</strong><br />
          Задайте вопрос по документам о детском питании, и система подберёт релевантные фрагменты и источники.
        </div>
      </div>
    `;
    return;
  }

  els.chatMessages.innerHTML = state.messages
    .map((message) => {
      const sourcesHtml = Array.isArray(message.sources) && message.sources.length
        ? `
          <div class="sources-list">
            ${message.sources
              .map((source, index) => `
                <div class="source-card">
                  <div><strong>[${index + 1}] ${escapeHtml(source.name || 'Документ')}</strong></div>
                  <div>Тип: ${escapeHtml(source.type || '—')}</div>
                  <div>Фрагмент: ${escapeHtml(source.chunk_index ?? '—')}</div>
                  ${source.url ? `<div><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">Открыть источник</a></div>` : ''}
                </div>
              `)
              .join('')}
          </div>
        `
        : '';

      return `
        <article class="message message--${message.role}">
          <div class="message__meta">
            <span>${message.role === 'user' ? 'Вы' : 'Ассистент'}</span>
            <span>${escapeHtml(message.time)}</span>
          </div>
          <div>${escapeHtml(message.text).replace(/\n/g, '<br />')}</div>
          ${message.role === 'assistant' ? sourcesHtml : ''}
        </article>
      `;
    })
    .join('');

  els.chatMessages.scrollTop = els.chatMessages.scrollHeight;
}

function showApp() {
  els.loginView.classList.add('hidden');
  els.appView.classList.remove('hidden');
  renderUser();
  renderMessages();
}

function showLogin() {
  els.appView.classList.add('hidden');
  els.loginView.classList.remove('hidden');
}

function logout() {
  state.user = null;
  state.sessionId = null;
  state.lastQuestion = null;
  state.lastAnswer = null;
  state.lastSources = [];
  state.messages = [];
  showLogin();
  renderMessages();
  resetFeedbackForm();
  setStatus(els.loginStatus, '');
  setStatus(els.askStatus, '');
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(data.message || data.error || `HTTP ${response.status}`);
  }

  return data;
}

els.togglePasswordBtn.addEventListener('click', () => {
  const isPassword = els.passwordInput.type === 'password';
  els.passwordInput.type = isPassword ? 'text' : 'password';
  els.togglePasswordBtn.textContent = isPassword ? 'Скрыть' : 'Показать';
});

els.loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const login = els.loginInput.value.trim();
  const password = els.passwordInput.value.trim();

  if (!login || !password) {
    setStatus(els.loginStatus, 'Введите логин и пароль.', 'error');
    return;
  }

  if (!config.LOGIN_WEBHOOK || config.LOGIN_WEBHOOK.includes('example.com')) {
    setStatus(els.loginStatus, 'Сначала укажите реальный URL webhook det/login в APP_CONFIG.', 'error');
    return;
  }

  els.loginSubmitBtn.disabled = true;
  setStatus(els.loginStatus, 'Выполняется вход...');

  try {
    const data = await postJson(config.LOGIN_WEBHOOK, { login, password });

    if (!data.success || !data.user) {
      throw new Error(data.message || 'Не удалось авторизоваться.');
    }

    state.user = data.user;
    state.sessionId = generateSessionId();
    state.messages = [
      {
        role: 'assistant',
        text: 'Здравствуйте. Я готов помочь с поиском по базе знаний о детском питании. Задайте вопрос в основной области справа.',
        time: formatDate(),
        sources: []
      }
    ];

    resetFeedbackForm();
    setStatus(els.loginStatus, 'Авторизация успешна.', 'success');
    showApp();
  } catch (error) {
    setStatus(els.loginStatus, error.message || 'Ошибка авторизации.', 'error');
  } finally {
    els.loginSubmitBtn.disabled = false;
  }
});

els.askForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const question = els.questionInput.value.trim();
  if (!question) {
    setStatus(els.askStatus, 'Введите вопрос.', 'error');
    return;
  }

  if (!config.ASK_WEBHOOK || config.ASK_WEBHOOK.includes('example.com')) {
    setStatus(els.askStatus, 'Сначала укажите реальный URL webhook det/ask в APP_CONFIG.', 'error');
    return;
  }

  const payload = {
    question,
    session_id: state.sessionId,
    user_id: state.user?.id || null
  };

  state.messages.push({
    role: 'user',
    text: question,
    time: formatDate(),
    sources: []
  });
  renderMessages();

  els.askSubmitBtn.disabled = true;
  setStatus(els.askStatus, 'Идёт поиск по базе знаний...');

  const loaderMessage = {
    role: 'assistant',
    text: 'Идёт обработка запроса…',
    time: formatDate(),
    sources: [],
    isLoader: true
  };
  state.messages.push(loaderMessage);
  renderMessages();

  try {
    const data = await postJson(config.ASK_WEBHOOK, payload);
    state.messages = state.messages.filter((item) => !item.isLoader);

    const answerText = data.answer || data.message || 'Ответ не получен.';
    const sources = Array.isArray(data.sources) ? data.sources : [];

    state.messages.push({
      role: 'assistant',
      text: answerText,
      time: formatDate(),
      sources
    });

    state.lastQuestion = question;
    state.lastAnswer = answerText;
    state.lastSources = sources;

    els.questionInput.value = '';
    setStatus(els.askStatus, 'Ответ получен.', 'success');
    resetFeedbackForm();
    renderMessages();
  } catch (error) {
    state.messages = state.messages.filter((item) => !item.isLoader);
    state.messages.push({
      role: 'assistant',
      text: 'Не удалось получить ответ. Попробуйте позже.',
      time: formatDate(),
      sources: []
    });
    renderMessages();
    setStatus(els.askStatus, error.message || 'Ошибка при обращении к det/ask.', 'error');
  } finally {
    els.askSubmitBtn.disabled = false;
  }
});

els.feedbackForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!state.lastQuestion || !state.lastAnswer) {
    setStatus(els.feedbackStatus, 'Сначала получите ответ, а затем отправляйте отзыв.', 'error');
    return;
  }

  if (!config.FEEDBACK_WEBHOOK || config.FEEDBACK_WEBHOOK.includes('example.com')) {
    setStatus(els.feedbackStatus, 'Сначала укажите реальный URL webhook det/feedback в APP_CONFIG.', 'error');
    return;
  }

  const vote = document.querySelector('input[name="vote"]:checked')?.value || null;
  const comment = els.feedbackComment.value.trim();

  els.feedbackSubmitBtn.disabled = true;
  setStatus(els.feedbackStatus, 'Отправляем отзыв...');

  try {
    const data = await postJson(config.FEEDBACK_WEBHOOK, {
      user_id: state.user?.id || null,
      session_id: state.sessionId,
      question: state.lastQuestion,
      answer_text: state.lastAnswer,
      vote: vote ? Number(vote) : null,
      comment,
      sources: state.lastSources,
      page_url: window.location.href,
      user_agent: navigator.userAgent
    });

    setStatus(els.feedbackStatus, data.message || 'Спасибо, отзыв сохранён.', 'success');
    els.feedbackForm.reset();
  } catch (error) {
    setStatus(els.feedbackStatus, error.message || 'Не удалось отправить отзыв.', 'error');
  } finally {
    els.feedbackSubmitBtn.disabled = false;
  }
});

els.updateBaseBtn.addEventListener('click', async () => {
  setStatus(els.updateBaseStatus, 'Функция в разработке. Кнопка уже зарезервирована под webhook.', 'success');

  if (!config.UPDATE_BASE_WEBHOOK || config.UPDATE_BASE_WEBHOOK.includes('example.com')) {
    return;
  }

  try {
    await postJson(config.UPDATE_BASE_WEBHOOK, {
      login: state.user?.login || null,
      password: null,
      root_path: els.rootPathInput.value.trim() || config.DEFAULT_ROOT_PATH || 'app:/Детское питание',
      stub_mode: true
    });
  } catch {
    // Специально игнорируем ответ, пока функция в разработке.
  }
});

els.newChatBtn.addEventListener('click', () => {
  state.sessionId = generateSessionId();
  state.lastQuestion = null;
  state.lastAnswer = null;
  state.lastSources = [];
  state.messages = [
    {
      role: 'assistant',
      text: 'Новый диалог начат. Можете задать следующий вопрос.',
      time: formatDate(),
      sources: []
    }
  ];
  resetFeedbackForm();
  renderUser();
  renderMessages();
  setStatus(els.askStatus, '');
});

els.logoutBtn.addEventListener('click', logout);

renderMessages();
showLogin();
