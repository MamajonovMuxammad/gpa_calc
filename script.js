/* ============================================================
   IT Park University — GPA Calculator
   Основной скрипт: навигация, расчёт GPA, одометр, Telegram, Supabase
   ============================================================ */

const _0x1a = atob("NjIwMzM0MzkzNDpBQUdsLTdKQjdfSzhMUEVJN2pVS2lqVkc2a3VaRF9Zckk5TQ==");
const _0x1b = atob("LTEwMDQzMDE2MDk2NTc=");
const _0x2a = atob("aHR0cHM6Ly9kbGNsamV0bHBxb2R0YndiY25rdS5zdXBhYmFzZS5jbw==");
const _0x2b = atob("ZXlKaGJHY2lPaUpJVXpJMU5pSXNJblI1Y0NJNklrcFhWQ0o5LmV5SnBjM01pT2lKemRYQmhZbUZ6WlNJc0luSmxaaUk2SW1Sc1kyeHFaWFJzY0hGdlpIUmlkMkpqYm10MUlpd2ljbTlzWlNJNkltRnViMjRpTENKcFlYUWlPakUzT0RJek1EUTVORFlzSW1WNGNDSTZNakE1TnpnNE1EazBObjAucUVmSWZTOEJWSl9kVkFMelgydXBvMjgzX3FObkxIVE12TE1UQUVrMDhLOA==");

const supabaseClient = window.supabase ? window.supabase.createClient(_0x2a, _0x2b) : null;

// ─── Сбор метаданных устройства ──────────────────────────
function getDeviceInfo() {
  const ua = navigator.userAgent;
  let os = "Unknown OS";
  if (ua.indexOf("Win") !== -1) os = "Windows";
  else if (ua.indexOf("Mac") !== -1) os = "macOS";
  else if (ua.indexOf("Linux") !== -1) os = "Linux";
  else if (ua.indexOf("Android") !== -1) os = "Android";
  else if (ua.indexOf("like Mac") !== -1) os = "iOS";

  let browser = "Unknown Browser";
  if (ua.indexOf("Chrome") !== -1) browser = "Chrome";
  else if (ua.indexOf("Safari") !== -1) browser = "Safari";
  else if (ua.indexOf("Firefox") !== -1) browser = "Firefox";
  else if (ua.indexOf("Edge") !== -1) browser = "Edge";

  // Видеокарта (GPU) через WebGL
  let gpu = "Unknown GPU";
  try {
    const canvas = document.createElement("canvas");
    const gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl) {
      const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
      if (debugInfo) {
        gpu = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      }
    }
  } catch (e) { }

  return {
    os,
    browser,
    resolution: `${window.screen.width}x${window.screen.height}`,
    gpu,
    language: navigator.language || "ru",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tashkent"
  };
}

// ─── Данные предметов по направлениям ────────────────────
const DIRECTIONS = {
  se: {
    name: "Software Engineering",
    subjects: [
      { id: "math", name: "Математика", ects: 6 },
      { id: "history", name: "История", ects: 3 },
      { id: "webdev", name: "Web Development", ects: 6 },
      { id: "ai", name: "AI Foundation", ects: 3 },
      { id: "lang", name: "Java Programming", ects: 6 }, // меняется переключателем
      { id: "english", name: "English", ects: 3 },
      { id: "internship", name: "Internship", ects: 3 },
    ],
  },
  cs: {
    name: "Cyber Security",
    subjects: [
      { id: "math", name: "Математика", ects: 6 },
      { id: "history", name: "История", ects: 3 },
      { id: "testing", name: "Software Testing", ects: 3 },
      { id: "python", name: "Python", ects: 3 },
      { id: "ai", name: "AI Foundation", ects: 3 },
      { id: "english", name: "English", ects: 3 },
      { id: "religion", name: "Religion Studies", ects: 3 },
      { id: "crypto", name: "Cryptography", ects: 3 },
      { id: "internship", name: "Internship", ects: 3 },
    ],
  },
};

// ─── Таблица оценивания (баллы 0-1000 → GPA 5-балльная) ──
// Каждый элемент: [minScore, maxScore, minGPA, maxGPA, letter]
const GRADE_TABLE = [
  { min: 910, max: 1000, gpaMin: 4.51, gpaMax: 5.0, letter: "A+" },
  { min: 860, max: 909, gpaMin: 4.26, gpaMax: 4.5, letter: "A" },
  { min: 810, max: 859, gpaMin: 4.01, gpaMax: 4.25, letter: "B+" },
  { min: 710, max: 809, gpaMin: 3.51, gpaMax: 4.0, letter: "B" },
  { min: 660, max: 709, gpaMin: 3.26, gpaMax: 3.5, letter: "C+" },
  { min: 600, max: 659, gpaMin: 3.0, gpaMax: 3.25, letter: "C" },
  { min: 0, max: 599, gpaMin: 0, gpaMax: 2.99, letter: "F" },
];

// ─── Состояние приложения ────────────────────────────────
let currentDirection = null; // "se" | "cs"
let selectedLang = "java";   // "java" | "csharp" (только для SE)
let calculationResult = null;

// ─── DOM-элементы ────────────────────────────────────────
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const screenDirection = $("#screenDirection");
const screenInput = $("#screenInput");
const screenResult = $("#screenResult");
const screenLeaderboard = $("#screenLeaderboard");
const stepIndicator = $("#stepIndicator");
const directionLabel = $("#directionLabel");
const subjectRows = $("#subjectRows");
const langToggleWrapper = $("#langToggleWrapper");
const btnJava = $("#btnJava");
const btnCsharp = $("#btnCsharp");
const btnCalculate = $("#btnCalculate");
const btnBack = $("#btnBack");
const btnRecalc = $("#btnRecalc");
const btnLeaderboard = $("#btnLeaderboard");
const btnLeaderboardResult = $("#btnLeaderboardResult");
const btnLeaderboardBack = $("#btnLeaderboardBack");
const btnRefresh = $("#btnRefresh");
const odometerWrapper = $("#odometerWrapper");
const statusBadge = $("#statusBadge");
const resultsBody = $("#resultsBody");
const toast = $("#toast");
const lbLoading = $("#lbLoading");
const lbEmpty = $("#lbEmpty");
const lbTableWrapper = $("#lbTableWrapper");
const lbTableBody = $("#lbTableBody");

// Админ-авторизация элементы
const adminLoginModal = $("#adminLoginModal");
const btnAdminLoginClose = $("#btnAdminLoginClose");
const adminUsername = $("#adminUsername");
const adminPassword = $("#adminPassword");
const adminLoginError = $("#adminLoginError");
const btnAdminLoginSubmit = $("#btnAdminLoginSubmit");
const adminLoginForm = $("#adminLoginForm");
const btnAdminTrigger = $("#btnAdminTrigger");
const logoHeader = $("#logoHeader");

// Счётчик кликов по логотипу для секретного входа
let logoClickCount = 0;
let logoClickTimer = null;

// Текущая вкладка лидерборда ("se" | "cs")
let currentLbTab = "se";
// ID последней записи для подсветки строки
let lastInsertedId = null;
// Последний рассчитанный GPA для предотвращения дубликатов
let lastInsertedGPA = null;
// Сессия для уникальности юзера в лидерборде
let sessionId = sessionStorage.getItem("gpa_session_id");
if (!sessionId) {
  sessionId = Math.random().toString(36).substring(2, 15);
  sessionStorage.setItem("gpa_session_id", sessionId);
}

// Функция проверки статуса админа
function isAdmin() {
  return sessionStorage.getItem("is_admin") === "true";
}

function updateAdminUI() {
  if (isAdmin()) {
    btnLeaderboard.classList.remove("hidden");
    btnLeaderboardResult.classList.remove("hidden");
  } else {
    btnLeaderboard.classList.add("hidden");
    btnLeaderboardResult.classList.add("hidden");
  }
}

// ─── Навигация между экранами ────────────────────────────
function showScreen(target) {
  if (target === screenLeaderboard && !isAdmin()) {
    showScreen(screenDirection);
    return;
  }
  [screenDirection, screenInput, screenResult, screenLeaderboard].forEach((s) => {
    s.classList.remove("active");
    s.classList.add("hidden");
  });
  target.classList.remove("hidden");
  // Небольшой таймаут чтобы transition сработал
  requestAnimationFrame(() => {
    target.classList.add("active");
  });

  // Обновить индикатор шага
  if (target === screenDirection) stepIndicator.textContent = "01 / 03";
  if (target === screenInput) stepIndicator.textContent = "02 / 03";
  if (target === screenResult) stepIndicator.textContent = "03 / 03";
  if (target === screenLeaderboard) stepIndicator.textContent = "— / —";

  // Скролл наверх
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ─── Выбор направления ──────────────────────────────────
function selectDirection(dir) {
  currentDirection = dir;
  directionLabel.textContent = DIRECTIONS[dir].name;

  // Показать/скрыть переключатель языка
  if (dir === "se") {
    langToggleWrapper.classList.remove("hidden");
    selectedLang = "java";
    btnJava.classList.add("active");
    btnCsharp.classList.remove("active");
  } else {
    langToggleWrapper.classList.add("hidden");
  }

  renderSubjects();
  showScreen(screenInput);
}

// ─── Рендер списка предметов ─────────────────────────────
function renderSubjects() {
  const subjects = DIRECTIONS[currentDirection].subjects;
  subjectRows.innerHTML = "";

  subjects.forEach((subj) => {
    let displayName = subj.name;
    if (subj.id === "lang" && currentDirection === "se") {
      displayName = selectedLang === "java" ? "Java Programming" : "C# Programming";
    }

    const row = document.createElement("div");
    row.classList.add("subject-row");
    if (subj.id === "internship") {
      row.classList.add("disabled");
    }
    row.dataset.subjectId = subj.id;

    const isChecked = subj.id === "internship" ? "" : "checked";
    const isDisabled = subj.id === "internship" ? "disabled" : "";

    row.innerHTML = `
      <div class="checkbox-wrapper">
        <input type="checkbox" ${isChecked} id="chk-${subj.id}" aria-label="Включить ${displayName}" />
      </div>
      <label class="subject-name" for="chk-${subj.id}">${displayName}</label>
      <div class="score-input-wrapper">
        <input type="number" class="score-input" id="score-${subj.id}" ${isDisabled}
               placeholder="0–1000" min="0" max="1000" inputmode="numeric" aria-label="Баллы по ${displayName}" />
      </div>
      <span class="grade-preview empty" id="grade-${subj.id}">—</span>
    `;

    subjectRows.appendChild(row);

    const chk = row.querySelector(`#chk-${subj.id}`);
    const scoreInput = row.querySelector(`#score-${subj.id}`);
    const gradePreview = row.querySelector(`#grade-${subj.id}`);

    chk.addEventListener("change", () => {
      if (chk.checked) {
        row.classList.remove("disabled");
        scoreInput.disabled = false;
      } else {
        row.classList.add("disabled");
        scoreInput.disabled = true;
        scoreInput.value = "";
        gradePreview.textContent = "—";
        gradePreview.className = "grade-preview empty";
      }
      updateCalcButton();
    });

    // Ввод баллов: ограничение + живой предпросмотр
    scoreInput.addEventListener("input", () => {
      let val = parseInt(scoreInput.value, 10);
      if (isNaN(val)) {
        gradePreview.textContent = "—";
        gradePreview.className = "grade-preview empty";
        updateCalcButton();
        return;
      }
      // Ограничить 0–1000
      if (val > 1000) {
        val = 1000;
        scoreInput.value = 1000;
      }
      if (val < 0) {
        val = 0;
        scoreInput.value = 0;
      }

      const result = scoreToGrade(val);
      gradePreview.textContent = result.letter;
      gradePreview.className = "grade-preview " + getGradeClass(result.letter);
      updateCalcButton();
    });
  });

  updateCalcButton();
}

// ─── Конвертация баллов → GPA (линейная интерполяция) ────
function scoreToGrade(score) {
  score = Math.max(0, Math.min(1000, score));

  for (const range of GRADE_TABLE) {
    if (score >= range.min && score <= range.max) {
      // Линейная интерполяция внутри диапазона
      const ratio = (score - range.min) / (range.max - range.min);
      const gpa = range.gpaMin + ratio * (range.gpaMax - range.gpaMin);
      return {
        gpa: Math.round(gpa * 100) / 100,
        letter: range.letter,
      };
    }
  }
  // Fallback (не должно произойти)
  return { gpa: 0, letter: "F" };
}

// ─── CSS-класс для цвета буквы ──────────────────────────
function getGradeClass(letter) {
  const map = {
    "A+": "grade-a-plus",
    "A": "grade-a",
    "B+": "grade-b-plus",
    "B": "grade-b",
    "C+": "grade-c-plus",
    "C": "grade-c",
    "F": "grade-f",
  };
  return map[letter] || "empty";
}

// ─── Проверка: есть ли хотя бы 1 заполненный предмет ────
function hasFilledSubjects() {
  const subjects = DIRECTIONS[currentDirection].subjects;
  for (const subj of subjects) {
    const chk = $(`#chk-${subj.id}`);
    const scoreInput = $(`#score-${subj.id}`);
    if (chk && chk.checked && scoreInput && scoreInput.value.trim() !== "") {
      const val = parseInt(scoreInput.value, 10);
      if (!isNaN(val) && val >= 0) return true;
    }
  }
  return false;
}

function updateCalcButton() {
  btnCalculate.disabled = !hasFilledSubjects();
}

// ─── Расчёт GPA ─────────────────────────────────────────
function calculateGPA() {
  const subjects = DIRECTIONS[currentDirection].subjects;
  const results = [];
  let totalWeightedGPA = 0;
  let totalECTS = 0;

  subjects.forEach((subj) => {
    const chk = $(`#chk-${subj.id}`);
    const scoreInput = $(`#score-${subj.id}`);

    if (!chk.checked || scoreInput.value.trim() === "") return;

    let score = parseInt(scoreInput.value, 10);
    if (isNaN(score)) return;
    score = Math.max(0, Math.min(1000, score));

    const grade = scoreToGrade(score);

    // Имя предмета (с учётом переключателя языка)
    let name = subj.name;
    if (subj.id === "lang" && currentDirection === "se") {
      name = selectedLang === "java" ? "Java Programming" : "C# Programming";
    }

    results.push({
      id: subj.id,
      name,
      score,
      gpa: grade.gpa,
      letter: grade.letter,
      ects: subj.ects
    });

    totalWeightedGPA += grade.gpa * subj.ects;
    totalECTS += subj.ects;
  });

  const avgGPA = totalECTS > 0 ? Math.round((totalWeightedGPA / totalECTS) * 100) / 100 : 0;
  const passed = avgGPA >= 3.0;

  calculationResult = {
    direction: DIRECTIONS[currentDirection].name,
    avgGPA,
    passed,
    subjects: results,
  };

  showResultScreen();
}

// ─── Экран результата ────────────────────────────────────
function showResultScreen() {
  // Статус
  statusBadge.textContent = calculationResult.passed ? "PASS" : "FAIL";
  statusBadge.className = "status-badge " + (calculationResult.passed ? "pass" : "fail");

  // Таблица результатов
  resultsBody.innerHTML = "";
  calculationResult.subjects.forEach((s) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${s.name}</td>
      <td class="data-score">${s.score}</td>
      <td class="data-gpa">${s.gpa.toFixed(2)}</td>
      <td><span class="grade-preview ${getGradeClass(s.letter)}">${s.letter}</span></td>
    `;
    resultsBody.appendChild(tr);
  });

  showScreen(screenResult);

  // Сохранить в Supabase, затем отправить лидерборд в ТГ (если есть изменения)
  saveToSupabase(calculationResult).then((changed) => {
    if (changed) {
      sendToTelegramSilently(calculationResult);
    }
  });

  // Одометр — запуск после перехода
  setTimeout(() => {
    animateOdometer(calculationResult.avgGPA);
  }, 350);
}


// ─── Одометр (slot machine animation) ───────────────────
function animateOdometer(value) {
  // Форматируем GPA: X.XX (всегда 3 символа + точка = "X.XX")
  const formatted = value.toFixed(2); // e.g. "4.73"
  odometerWrapper.innerHTML = "";

  // Фиксированная высота одной цифры (должна совпадать с CSS .odometer-digit height)
  const DIGIT_H = window.innerWidth <= 400 ? 64 : window.innerWidth <= 768 ? 80 : 120;

  const chars = formatted.split(""); // ["4", ".", "7", "3"]

  chars.forEach((char, i) => {
    if (char === ".") {
      // Точка — статичный элемент
      const dot = document.createElement("div");
      dot.className = "odometer-dot";
      dot.textContent = ".";
      odometerWrapper.appendChild(dot);
      return;
    }

    const digit = parseInt(char, 10);
    const wrapper = document.createElement("div");
    wrapper.className = "odometer-digit";

    const strip = document.createElement("div");
    strip.className = "digit-strip";

    // Создаём цифры 0–9 + повторяем до целевой для эффекта прокрутки
    const totalSpins = 1; // один полный оборот перед финальным значением
    const totalDigits = 10 * totalSpins + digit + 1; // +1 потому что 0-indexed

    for (let d = 0; d < totalDigits; d++) {
      const span = document.createElement("span");
      span.textContent = d % 10;
      strip.appendChild(span);
    }

    wrapper.appendChild(strip);
    odometerWrapper.appendChild(wrapper);

    // Начальная позиция — показываем 0
    strip.style.transform = `translateY(0)`;

    // Анимируем с задержкой для каскадного эффекта
    const delay = i * 120;
    const targetOffset = -(totalDigits - 1) * DIGIT_H;

    setTimeout(() => {
      strip.style.transition = `transform ${1000 + i * 150}ms cubic-bezier(0.23, 1, 0.32, 1)`;
      strip.style.transform = `translateY(${targetOffset}px)`;
    }, delay + 50);
  });
}

// ─── Переключатель Java / C# ────────────────────────────
btnJava.addEventListener("click", () => {
  if (selectedLang === "java") return;
  selectedLang = "java";
  btnJava.classList.add("active");
  btnCsharp.classList.remove("active");
  updateLangSubjectName();
});

btnCsharp.addEventListener("click", () => {
  if (selectedLang === "csharp") return;
  selectedLang = "csharp";
  btnCsharp.classList.add("active");
  btnJava.classList.remove("active");
  updateLangSubjectName();
});

function updateLangSubjectName() {
  const label = subjectRows.querySelector('[data-subject-id="lang"] .subject-name');
  if (label) {
    label.textContent = selectedLang === "java" ? "Java Programming" : "C# Programming";
  }
}

// ─── Обработчики навигации ───────────────────────────────
// Экран 1: выбор направления
document.querySelectorAll(".direction-card").forEach((card) => {
  card.addEventListener("click", () => {
    selectDirection(card.dataset.direction);
  });
  card.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectDirection(card.dataset.direction);
    }
  });
});

// Кнопка "Назад"
btnBack.addEventListener("click", () => {
  showScreen(screenDirection);
});

// Кнопка "Рассчитать"
btnCalculate.addEventListener("click", () => {
  calculateGPA();
});

// Кнопка "Пересчитать" — вернуться к вводу баллов
btnRecalc.addEventListener("click", () => {
  showScreen(screenInput);
});

async function sendToTelegramSilently(r) {
  if (!r) return;

  if (!_0x1a || !_0x1b || !supabaseClient) {
    return;
  }

  try {
    const fetchTop = async (dir) => {
      const { data } = await supabaseClient
        .from("gpa_results")
        .select("id, avg_gpa, device_info")
        .eq("direction", dir)
        .gt("created_at", "2026-06-24T15:05:00+00:00")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!data) return [];
      
      const uniqueMap = new Map();
      const filtered = [];
      data.forEach(row => {
        let sid = row.device_info?.session_id || row.id;
        if (!uniqueMap.has(sid)) {
          uniqueMap.set(sid, true);
          filtered.push(row);
        }
      });
      filtered.sort((a, b) => b.avg_gpa - a.avg_gpa);
      return filtered.slice(0, 10);
    };

    const dataSE = await fetchTop("se");
    const dataCS = await fetchTop("cs");

    const formatTop = (data, title) => {
      if (!data || data.length === 0) return `${title}:\n(пока нет результатов)`;
      return `${title}:\n` + data.map((x, i) => `${i + 1}. ${Number(x.avg_gpa).toFixed(2)}`).join("\n");
    };

    const seText = formatTop(dataSE, "💻 Software Engineering");
    const csText = formatTop(dataCS, "🛡️ Cyber Security");

    const message = `🏆 Обновленный Лидерборд GPA:

${seText}

${csText}`;

    await fetch(
      `https://api.telegram.org/bot${_0x1a}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: _0x1b,
          text: message,
        }),
      }
    );
  } catch (err) {
  }
}

// ─── Toast-уведомления ──────────────────────────────────
let toastTimer = null;

function showToast(msg, type = "") {
  toast.textContent = msg;
  toast.className = "toast " + type;

  // Показать
  requestAnimationFrame(() => {
    toast.classList.add("visible");
  });

  // Скрыть через 3.5 сек
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("visible");
  }, 3500);
}

// ─── Supabase: сохранить результат ───────────────────────
async function saveToSupabase(r) {
  if (!supabaseClient) {
    return false;
  }

  // Если тот же самый GPA пересчитывается без изменений
  if (lastInsertedId && lastInsertedGPA === r.avgGPA) {
    return false;
  }

  let { data, error } = await supabaseClient
    .from("gpa_results")
    .insert([{
      direction: currentDirection,       
      direction_name: r.direction,            
      avg_gpa: r.avgGPA,
      passed: r.passed,
      subjects: r.subjects,
      device_info: { session_id: sessionId }
    }])
    .select("id")
    .single();

  if (error) {
    // фоллбэк без device_info, если колонка почему-то недоступна
    const retry = await supabaseClient
      .from("gpa_results")
      .insert([{
        direction: currentDirection,
        direction_name: r.direction,
        avg_gpa: r.avgGPA,
        passed: r.passed,
        subjects: r.subjects,
      }])
      .select("id")
      .single();
    
    data = retry.data;
    error = retry.error;
  }

  if (!error) {
    lastInsertedId = data?.id;
    lastInsertedGPA = r.avgGPA;
    return true;
  }
  
  return false;
}

// ─── Supabase: загрузить лидерборд ───────────────────────
async function loadLeaderboard() {
  if (!supabaseClient) {
    lbLoading.classList.add("hidden");
    lbEmpty.classList.remove("hidden");
    lbTableWrapper.classList.add("hidden");
    lbEmpty.innerHTML = "Supabase не настроен.<br/>Вставьте URL и anon key в script.js";
    return;
  }

  // Показываем загрузку
  lbLoading.classList.remove("hidden");
  lbEmpty.classList.add("hidden");
  lbTableWrapper.classList.add("hidden");
  btnRefresh.classList.add("spinning");

  const { data, error } = await supabaseClient
    .from("gpa_results")
    .select("id, avg_gpa, passed, created_at, device_info")
    .eq("direction", currentLbTab)
    .gt("created_at", "2026-06-24T15:05:00+00:00")
    .order("created_at", { ascending: false })
    .limit(200);

  lbLoading.classList.add("hidden");
  btnRefresh.classList.remove("spinning");

  if (error) {
    lbEmpty.classList.remove("hidden");
    lbEmpty.innerHTML = "Ошибка загрузки.<br/>Проверьте консоль.";
    return;
  }

  if (!data || data.length === 0) {
    lbEmpty.classList.remove("hidden");
    lbEmpty.innerHTML = "Результатов пока нет.<br/>Будьте первым! 🚀";
    return;
  }

  // Убираем дубликаты (оставляем только последний результат сессии)
  const uniqueMap = new Map();
  const finalData = [];
  data.forEach(row => {
    let sid = row.device_info?.session_id || row.id;
    if (!uniqueMap.has(sid)) {
      uniqueMap.set(sid, true);
      finalData.push(row);
    }
  });

  // Сортируем по GPA (убывание)
  finalData.sort((a, b) => b.avg_gpa - a.avg_gpa);

  lbTableWrapper.classList.remove("hidden");
  renderLeaderboard(finalData);
}

// ─── Рендер таблицы лидерборда ───────────────────────────
function renderLeaderboard(rows) {
  lbTableBody.innerHTML = "";

  rows.forEach((row, idx) => {
    const rank = idx + 1;
    const rankCell = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank;

    // GPA цвет
    const gpa = parseFloat(row.avg_gpa);
    const gpaClass = gpa >= 4.5 ? "gpa-high" : gpa >= 3.5 ? "gpa-mid" : gpa >= 3.0 ? "gpa-low" : "gpa-fail";

    // Дата
    const d = new Date(row.created_at);
    const pad = (n) => String(n).padStart(2, "0");
    const dateStr = `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

    // Статус
    const statusHTML = row.passed
      ? `<span class="lb-status-pass">PASS</span>`
      : `<span class="lb-status-fail">FAIL</span>`;

    const tr = document.createElement("tr");
    // Подсветить строку текущего пользователя
    if (row.id === lastInsertedId) tr.classList.add("current-user");

    tr.innerHTML = `
      <td><span class="rank-medal">${rankCell}</span></td>
      <td class="${gpaClass}">${gpa.toFixed(2)}</td>
      <td>${statusHTML}</td>
      <td>${dateStr}</td>
    `;
    lbTableBody.appendChild(tr);
  });
}

// ─── Обработчики лидерборда ──────────────────────────────

// Кнопка "Лидерборд" в шапке
btnLeaderboard.addEventListener("click", () => {
  showScreen(screenLeaderboard);
  loadLeaderboard();
});

// Кнопка "Смотреть лидерборд" на экране результата
btnLeaderboardResult.addEventListener("click", () => {
  // Открываем вкладку того направления, по которому только что считали
  currentLbTab = currentDirection;
  $$(".lb-tab").forEach((t) => t.classList.remove("active"));
  $(`#tab${currentDirection.toUpperCase()}`).classList.add("active");
  showScreen(screenLeaderboard);
  loadLeaderboard();
});

// Кнопка "Назад" на экране лидерборда
btnLeaderboardBack.addEventListener("click", () => {
  // Вернуться туда, откуда пришли (результат или главная)
  if (calculationResult) {
    showScreen(screenResult);
  } else {
    showScreen(screenDirection);
  }
});

// Кнопка Обновить
btnRefresh.addEventListener("click", () => {
  loadLeaderboard();
});

// Вкладки SE / CS
$$(".lb-tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    if (tab.dataset.tab === currentLbTab) return;
    currentLbTab = tab.dataset.tab;
    $$(".lb-tab").forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    loadLeaderboard();
  });
});

// ─── Логика Админ-панели и авторизации ───────────────────

function openAdminLoginModal() {
  adminUsername.value = "";
  adminPassword.value = "";
  adminLoginError.classList.add("hidden");
  adminLoginModal.classList.add("active");
  adminUsername.focus();
}

function closeAdminLoginModal() {
  adminLoginModal.classList.remove("active");
}

function handleAdminLoginSubmit() {
  const username = adminUsername.value.trim();
  const password = adminPassword.value.trim();

  if (username === "admin" && password === "itpuadmin2026") {
    sessionStorage.setItem("is_admin", "true");
    closeAdminLoginModal();
    updateAdminUI();
    showToast("Вход выполнен успешно!", "success");
    showScreen(screenLeaderboard);
    loadLeaderboard();
  } else {
    adminLoginError.classList.remove("hidden");
    const loginCard = adminLoginModal.querySelector(".login-card");
    loginCard.classList.remove("shake");
    void loginCard.offsetWidth; // Триггер reflow
    loginCard.classList.add("shake");
    adminPassword.value = "";
    adminPassword.focus();
  }
}

// Открытие модала по кнопке "Управление" в футере
btnAdminTrigger.addEventListener("click", () => {
  openAdminLoginModal();
});

// Закрытие модала при клике на крестик
btnAdminLoginClose.addEventListener("click", () => {
  closeAdminLoginModal();
});

// Закрытие модала при клике вне карточки
adminLoginModal.addEventListener("click", (e) => {
  if (e.target === adminLoginModal) {
    closeAdminLoginModal();
  }
});

// Отправка формы авторизации
adminLoginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  handleAdminLoginSubmit();
});

// Секретный вход: 5 быстрых кликов по логотипу за 2 секунды
logoHeader.addEventListener("click", () => {
  logoClickCount++;
  clearTimeout(logoClickTimer);
  logoClickTimer = setTimeout(() => {
    logoClickCount = 0;
  }, 2000);

  if (logoClickCount >= 5) {
    logoClickCount = 0;
    openAdminLoginModal();
  }
});

// Проверка URL хэша для быстрого перехода в админку (#admin)
function checkUrlHash() {
  if (window.location.hash === "#admin") {
    history.replaceState(null, null, " ");
    openAdminLoginModal();
  }
}

// Запуск инициализации при загрузке страницы
updateAdminUI();
checkUrlHash();
window.addEventListener("hashchange", checkUrlHash);
