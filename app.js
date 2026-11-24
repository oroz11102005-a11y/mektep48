import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc, query, orderBy } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// ==========================================
// 1. FIREBASE ОНЛАЙН БАЗАНЫН ЖӨНДӨӨЛӨРҮ
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyC7OUycEerDSAuVNd6lIml_OO4F5NqzXNE",
  authDomain: "mektep-b05c1.firebaseapp.com",
  projectId: "mektep-b05c1",
  storageBucket: "mektep-b05c1.firebasestorage.app",
  messagingSenderId: "667867016234",
  appId: "1:667867016234:web:7172f471f375af2fa6a753",
  measurementId: "G-2PGTH0MN8R"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ==========================================
// 2. МУГАЛИМДЕРДИН ЛОГИН ЖАНА ПАРОЛДОРУ
// Ар бир мугалимге өзүнчө логин/пароль бериңиз
// subject: "ALL" болсо бардык предметти көрөт (Директор/Завуч үчүн)
// ==========================================
const TEACHERS = [
  { login: "admin", pass: "admin48", name: "Администратор (Завуч)", subject: "ALL" },
  { login: "informatika", pass: "info2026", name: "Информатика мугалими", subject: "Информатика" },
  { login: "matematika", pass: "math2026", name: "Математика мугалими", subject: "Математика" },
  { login: "kyrgyz_tili", pass: "kyrgyz2026", name: "Кыргыз тили мугалими", subject: "Кыргыз тили" },
  { login: "taryh", pass: "taryh2026", name: "Тарых мугалими", subject: "Кыргызстан тарыхы" }
];

// Баштапкы үлгү суроолор (база бош болсо иштейт)
const DEFAULT_QUESTIONS = [
  {
    id: "def1",
    subject: "Информатика",
    question: "Алгоритмдин кандай негизги түрлөрү бар?",
    options: ["Сызыктуу, тармактуу, циклдик", "Түз, кыйшык, тегерек", "Тексттик, сандык", "Киргизүү жана чыгаруу"],
    correct: 0
  },
  {
    id: "def2",
    subject: "Информатика",
    question: "Python тилинде кайталануучу цикл кандай кызматчы сөздөр менен жазылат?",
    options: ["if / else", "for / while", "print / input", "def / return"],
    correct: 1
  },
  {
    id: "def3",
    subject: "Математика",
    question: "2x + 6 = 14 теңдемесинин тамырын табыңыз:",
    options: ["x = 3", "x = 4", "x = 5", "x = 10"],
    correct: 1
  }
];

let allQuestions = [];
let allResults = [];
let currentQuiz = { studentName: "", studentClass: "", subject: "", questions: [] };
let currentTeacher = null;

// ==========================================
// БАЗАДАН МААЛЫМАТТАРДЫ ЖҮКТӨӨ
// ==========================================
async function loadData() {
  try {
    const qSnap = await getDocs(collection(db, "questions"));
    allQuestions = qSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const rSnap = await getDocs(query(collection(db, "results"), orderBy("timestamp", "desc")));
    allResults = rSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("Firebase катасы:", e);
  }

  if (allQuestions.length === 0) {
    allQuestions = [...DEFAULT_QUESTIONS];
  }
  updateSubjectDropdowns();
}

function updateSubjectDropdowns() {
  const subjects = [...new Set(allQuestions.map(q => q.subject))];

  const studentSelect = document.getElementById("student-subject");
  studentSelect.innerHTML = '<option value="">Предметти тандаңыз...</option>';
  subjects.forEach(sub => {
    studentSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
  });

  const filterSelect = document.getElementById("filter-subject");
  filterSelect.innerHTML = '<option value="all">Бардык предметтер</option>';
  subjects.forEach(sub => {
    filterSelect.innerHTML += `<option value="${sub}">${sub}</option>`;
  });
}

// ==========================================
// БЕТТЕРДИ АЛМАШТЫРУУ
// ==========================================
window.showView = function(viewId) {
  document.querySelectorAll("main > section").forEach(sec => sec.classList.add("hidden"));
  document.getElementById(`view-${viewId}`).classList.remove("hidden");
};

window.openTeacherArea = function() {
  if (currentTeacher) {
    showView("teacher-dashboard");
    renderTeacherDashboard();
  } else {
    showView("teacher-login");
  }
};

// ==========================================
// ОКУУЧУ: ТЕСТТИ БАШТОО ЖАНА ТАПШЫРУУ
// ==========================================
document.getElementById("start-test-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const name = document.getElementById("student-name").value.trim();
  const sClass = document.getElementById("student-class").value;
  const subject = document.getElementById("student-subject").value;

  const subjectQuestions = allQuestions.filter(q => q.subject === subject);
  if (subjectQuestions.length === 0) {
    alert("Бул предмет боюнча азырынча суроолор жок!");
    return;
  }

  currentQuiz = {
    studentName: name,
    studentClass: sClass,
    subject: subject,
    questions: subjectQuestions
  };

  renderQuiz();
  showView("quiz");
});

function renderQuiz() {
  document.getElementById("quiz-subject-badge").textContent = currentQuiz.subject;
  document.getElementById("quiz-student-info").textContent = `${currentQuiz.studentName} | ${currentQuiz.studentClass}`;
  document.getElementById("quiz-progress").textContent = `Жалпы суроо: ${currentQuiz.questions.length}`;

  const container = document.getElementById("quiz-questions-container");
  container.innerHTML = "";

  currentQuiz.questions.forEach((q, idx) => {
    const letters = ["А", "Б", "В", "Г"];
    let optionsHtml = q.options.map((opt, oIdx) => `
      <label class="option-label">
        <input type="radio" name="q_${idx}" value="${oIdx}" required>
        <span><strong>${letters[oIdx]})</strong> ${opt}</span>
      </label>
    `).join("");

    container.innerHTML += `
      <div class="question-block">
        <div class="question-title">${idx + 1}. ${q.question}</div>
        ${optionsHtml}
      </div>
    `;
  });
}

window.submitQuiz = async function() {
  const total = currentQuiz.questions.length;
  let score = 0;
  let reviewHtml = "";

  for (let i = 0; i < total; i++) {
    const selected = document.querySelector(`input[name="q_${i}"]:checked`);
    if (!selected) {
      alert(`${i + 1}-суроого жооп белгилеңиз!`);
      return;
    }
    const ansIdx = parseInt(selected.value);
    const q = currentQuiz.questions[i];
    const isCorrect = ansIdx === q.correct;
    if (isCorrect) score++;

    reviewHtml += `
      <div class="review-item ${isCorrect ? 'review-correct' : 'review-wrong'}">
        <strong>${i + 1}. ${q.question}</strong><br>
        Сиздин жооп: ${q.options[ansIdx]} ${isCorrect ? '✅' : `❌ (Туурасы: ${q.options[q.correct]})`}
      </div>
    `;
  }

  const percent = Math.round((score / total) * 100);
  const now = new Date();
  const dateStr = now.toLocaleDateString("ky-KG") + " " + now.toLocaleTimeString("ky-KG", { hour: '2-digit', minute: '2-digit' });

  const resultRecord = {
    name: currentQuiz.studentName,
    class: currentQuiz.studentClass,
    subject: currentQuiz.subject,
    score: `${score}/${total}`,
    percent: percent,
    date: dateStr,
    timestamp: Date.now()
  };

  await addDoc(collection(db, "results"), resultRecord);
  await loadData();

  document.getElementById("result-percent").textContent = `${percent}%`;
  document.getElementById("result-details").textContent = `${currentQuiz.studentName} (${currentQuiz.studentClass}) — ${total} суроодон ${score} туура жооп.`;
  document.getElementById("result-review").innerHTML = reviewHtml;
  showView("result");
};

// ==========================================
// МУГАЛИМ: КИРҮҮ ЖАНА БАШКАРУУ
// ==========================================
document.getElementById("teacher-login-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const login = document.getElementById("teacher-login").value.trim();
  const pass = document.getElementById("teacher-password").value.trim();

  const found = TEACHERS.find(t => t.login === login && t.pass === pass);
  if (found) {
    currentTeacher = found;
    document.getElementById("login-error").classList.add("hidden");
    document.getElementById("teacher-login-form").reset();
    showView("teacher-dashboard");
    renderTeacherDashboard();
  } else {
    document.getElementById("login-error").classList.remove("hidden");
  }
});

window.logoutTeacher = function() {
  currentTeacher = null;
  showView("student-home");
};

window.switchTab = function(tabName, btn) {
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  document.querySelectorAll(".tab-content").forEach(c => c.classList.add("hidden"));
  document.getElementById(`tab-${tabName}`).classList.remove("hidden");
};

function renderTeacherDashboard() {
  document.getElementById("teacher-welcome").textContent = `Саламатсызбы, ${currentTeacher.name}!`;
  document.getElementById("teacher-subject-label").textContent =
    currentTeacher.subject === "ALL" ? "Укугу: Бардык предметтер" : `Предметиңиз: ${currentTeacher.subject}`;

  const subInput = document.getElementById("q-subject");
  const filterSub = document.getElementById("filter-subject");
  if (currentTeacher.subject !== "ALL") {
    subInput.value = currentTeacher.subject;
    subInput.readOnly = true;
    filterSub.value = currentTeacher.subject;
    filterSub.disabled = true;
  } else {
    subInput.value = "";
    subInput.readOnly = false;
    filterSub.disabled = false;
  }

  renderResultsTable();
  renderAdminQuestions();
}

window.renderResultsTable = function() {
  const fClass = document.getElementById("filter-class").value;
  const fSub = document.getElementById("filter-subject").value;

  const filtered = allResults.filter(r => {
    const matchClass = fClass === "all" || r.class === fClass;
    const matchSub = fSub === "all" || r.subject === fSub;
    return matchClass && matchSub;
  });

  const tbody = document.getElementById("results-table-body");
  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7">Жыйынтыктар табылган жок.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((r, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${r.name}</strong></td>
      <td>${r.class}</td>
      <td>${r.subject}</td>
      <td>${r.score}</td>
      <td><strong>${r.percent}%</strong></td>
      <td>${r.date}</td>
    </tr>
  `).join("");
};

// Жаңы суроо кошуу
document.getElementById("add-question-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const newQ = {
    subject: document.getElementById("q-subject").value.trim(),
    question: document.getElementById("q-text").value.trim(),
    options: [
      document.getElementById("q-opt0").value.trim(),
      document.getElementById("q-opt1").value.trim(),
      document.getElementById("q-opt2").value.trim(),
      document.getElementById("q-opt3").value.trim()
    ],
    correct: parseInt(document.getElementById("q-correct").value)
  };

  await addDoc(collection(db, "questions"), newQ);

  document.getElementById("q-text").value = "";
  document.getElementById("q-opt0").value = "";
  document.getElementById("q-opt1").value = "";
  document.getElementById("q-opt2").value = "";
  document.getElementById("q-opt3").value = "";

  await loadData();
  renderAdminQuestions();
  alert("Суроо онлайн базага ийгиликтүү кошулду!");
});

function renderAdminQuestions() {
  const list = document.getElementById("admin-questions-list");
  const visibleQuestions = currentTeacher.subject === "ALL"
    ? allQuestions
    : allQuestions.filter(q => q.subject === currentTeacher.subject);

  document.getElementById("total-q-count").textContent = visibleQuestions.length;

  list.innerHTML = visibleQuestions.map(q => `
    <div class="q-admin-item">
      <div>
        <span class="badge">${q.subject}</span>
        <p style="margin-top:6px;"><strong>${q.question}</strong></p>
        <small style="color:green;">Туура жооп: ${q.options[q.correct]}</small>
      </div>
      <button class="btn btn-danger" onclick="deleteQuestion('${q.id}')">Өчүрүү</button>
    </div>
  `).join("");
}

window.deleteQuestion = async function(id) {
  if (!confirm("Бул суроону өчүрөсүзбү?")) return;
  if (!id.startsWith("def")) {
    await deleteDoc(doc(db, "questions", id));
  }
  await loadData();
  renderAdminQuestions();
};

// Excel (CSV) жүктөө
window.exportToCSV = function() {
  let csv = "\uFEFF№,Аты-жөнү,Классы,Предмет,Упай,Пайыз,Убактысы\n";
  allResults.forEach((r, i) => {
    csv += `${i + 1},"${r.name}","${r.class}","${r.subject}","${r.score}",${r.percent}%,"${r.date}"\n`;
  });
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "N48_Nurbayev_Test_Jiyintyk.csv";
  link.click();
};

// Старт
loadData();