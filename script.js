/* ============================================================
   IT Park University — GPA Calculator
   Основной скрипт: навигация, расчёт GPA, одометр, Telegram, Supabase
   ============================================================ */

// ─── Конфигурация Telegram ───────────────────────────────
const BOT_TOKEN = "6203343934:AAGl-7JB7_K8LPEI7jUKijVG6kuZD_YrI9M";
const CHAT_ID = "-1004301609657";

// ─── Конфигурация Supabase ────────────────────────────────
const SUPABASE_URL = "https://dlcljetlpqodtbwbcnku.supabase.co";        // https://xxxx.supabase.co
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsY2xqZXRscHFvZHRid2Jjbmt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzMDQ5NDYsImV4cCI6MjA5Nzg4MDk0Nn0.qEfIfS8BVJ_dVALzX2upo283_qNnLHTMvLMTAEk08K8"; // eyJh...

// Инициализируем клиент Supabase (через CDN)
const supabaseClient = (SUPABASE_URL && SUPABASE_URL !== "https://xxxx.supabase.co")
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// ─── Данные предметов по направлениям ────────────────────
const DIRECTIONS = {
  se: {
    name: "Software Engineering",
    subjects: [
      { id: "math", name: "Математика" },
      { id: "history", name: "История" },
      { id: "webdev", name: "Web Development" },
      { id: "ai", name: "AI Foundation" },
      { id: "lang", name: "Java Programming" }, // меняется переключателем
      { id: "internship", name: "Internship" },
    ],
  },
  cs: {
    name: "Cyber Security",
    subjects: [
      { id: "math", name: "Математика" },
      { id: "history", name: "История" },
      { id: "testing", name: "Software Testing" },
      { id: "python", name: "Python" },
      { id: "ai", name: "AI Foundation" },
      { id: "religion", name: "Religion Studies" },
      { id: "crypto", name: "Cryptography" },
      { id: "internship", name: "Internship" },
    ],
  },
};

// ─── Таблица оценивания (баллы 0-1000 → GPA 5-балльная) ──
// Каждый элемент: [minScore, maxScore, minGPA, maxGPA, letter]
const GRADE_TABLE = [
  { min: 910, max: 1000, gpaMin: 4.51, gpaMax: 5.0,  letter: "A+" },
  { min: 860, max: 909,  gpaMin: 4.26, gpaMax: 4.5,  letter: "A"  },
  { min: 810, max: 859,  gpaMin: 4.01, gpaMax: 4.25, letter: "B+" },
  { min: 710, max: 809,  gpaMin: 3.51, gpaMax: 4.0,  letter: "B"  },
  { min: 660, max: 709,  gpaMin: 3.26, gpaMax: 3.5,  letter: "C+" },
  { min: 600, max: 659,  gpaMin: 3.0,  gpaMax: 3.25, letter: "C"  },
  { min: 0,   max: 599,  gpaMin: 0,    gpaMax: 2.99, letter: "F"  },
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

// Текущая вкладка лидерборда ("se" | "cs")
let currentLbTab = "se";
// ID последней записи для подсветки строки

let lastInsertedId = null;

// ─── Навигация между экранами ────────────────────────────
function showScreen(target) {
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
  if (target === screenInput)     stepIndicator.textContent = "02 / 03";
  if (target === screenResult)    stepIndicator.textContent = "03 / 03";
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
    // Для SE: показать правильное имя предмета-языка
    let displayName = subj.name;
    if (subj.id === "lang" && currentDirection === "se") {
      displayName = selectedLang === "java" ? "Java Programming" : "C# Programming";
    }

    const row = document.createElement("div");
    row.classList.add("subject-row");
    row.dataset.subjectId = subj.id;

    row.innerHTML = `
      <div class="checkbox-wrapper">
        <input type="checkbox" checked id="chk-${subj.id}" aria-label="Включить ${displayName}" />
      </div>
      <label class="subject-name" for="chk-${subj.id}">${displayName}</label>
      <div class="score-input-wrapper">
        <input type="number" class="score-input" id="score-${subj.id}"
               placeholder="0–1000" min="0" max="1000" inputmode="numeric" aria-label="Баллы по ${displayName}" />
      </div>
      <span class="grade-preview empty" id="grade-${subj.id}">—</span>
    `;

    subjectRows.appendChild(row);

    // Обработчики
    const chk = row.querySelector(`#chk-${subj.id}`);
    const scoreInput = row.querySelector(`#score-${subj.id}`);
    const gradePreview = row.querySelector(`#grade-${subj.id}`);

    // Чекбокс: включить/выключить строку
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
  let totalGPA = 0;
  let count = 0;

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
      name,
      score,
      gpa: grade.gpa,
      letter: grade.letter,
    });

    totalGPA += grade.gpa;
    count++;
  });

  const avgGPA = count > 0 ? Math.round((totalGPA / count) * 100) / 100 : 0;
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

  // Автоматическая тихая отправка в Telegram
  sendToTelegramSilently(calculationResult);

  // Сохранить в Supabase
  saveToSupabase(calculationResult);

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

// ─── Автоматическая бесшумная отправка в Telegram ────────
async function sendToTelegramSilently(r) {
  if (!r) return;

  // Проверяем заполненность токена и ID чата
  if (!BOT_TOKEN || BOT_TOKEN === "ТВОЙ_БОТ_ТОКЕН_СЮДА" || !CHAT_ID || CHAT_ID === "ТВОЙ_CHAT_ID_СЮДА") {
    console.warn("Telegram: токен или chat_id не настроены.");
    return;
  }

  // Форматируем дату (локальное время)
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const dateStr = `${pad(now.getDate())}.${pad(now.getMonth() + 1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}`;

  // Статус со значком
  const statusIcon = r.passed ? "✅" : "❌";
  const statusText = r.passed ? "PASS" : "FAIL";

  // Список предметов
  const subjectLines = r.subjects
    .map((s) => {
      const bar = s.gpa >= 4.5 ? "🟦" : s.gpa >= 3.5 ? "🟩" : s.gpa >= 3.0 ? "🟨" : "🟥";
      return `${bar} ${s.name}: ${s.score} баллов → GPA ${s.gpa.toFixed(2)} (${s.letter})`;
    })
    .join("\n");

  const message =
`🎓 Новый результат GPA — IT Park University

📚 Направление: ${r.direction}
${statusIcon} Статус: ${statusText}
⭐ Итоговый GPA: ${r.avgGPA.toFixed(2)} / 5.0

📋 По предметам:
${subjectLines}

🕐 ${dateStr}`;

  try {
    const res = await fetch(
      `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
          // Без parse_mode — чистый текст, никаких ошибок парсинга
        }),
      }
    );

    const data = await res.json();
    if (data.ok) {
      console.log("✅ Telegram: результат успешно отправлен в канал.");
    } else {
      console.error("❌ Telegram send failed:", data.description, "| Error code:", data.error_code);
    }
  } catch (err) {
    console.error("❌ Telegram fetch error:", err.message || err);
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
    console.warn("Supabase: клиент не инициализирован (нет URL/ключа).");
    return;
  }

  const { data, error } = await supabaseClient
    .from("gpa_results")
    .insert([{
      direction:      currentDirection,       // "se" | "cs"
      direction_name: r.direction,            // "Software Engineering" | "Cyber Security"
      avg_gpa:        r.avgGPA,
      passed:         r.passed,
      subjects:       r.subjects,
    }])
    .select("id")
    .single();

  if (error) {
    console.error("❌ Supabase insert error:", error.message);
  } else {
    lastInsertedId = data?.id || null;
    console.log("✅ Supabase: результат сохранён, id =", lastInsertedId);
  }
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
    .select("id, avg_gpa, passed, created_at")
    .eq("direction", currentLbTab)
    .order("avg_gpa", { ascending: false })
    .limit(100);

  lbLoading.classList.add("hidden");
  btnRefresh.classList.remove("spinning");

  if (error) {
    console.error("❌ Supabase select error:", error.message);
    lbEmpty.classList.remove("hidden");
    lbEmpty.innerHTML = "Ошибка загрузки.<br/>Проверьте консоль.";
    return;
  }

  if (!data || data.length === 0) {
    lbEmpty.classList.remove("hidden");
    lbEmpty.innerHTML = "Результатов пока нет.<br/>Будьте первым! 🚀";
    return;
  }

  lbTableWrapper.classList.remove("hidden");
  renderLeaderboard(data);
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
