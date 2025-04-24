const form = document.getElementById("uploadForm");
const resultBox = document.getElementById("result");
const validateBtn = document.getElementById("validateBtn");
const urlInputField = document.getElementById("urlInput");
const fileInputField = document.querySelector('input[type="file"]');
const submitButton = form.querySelector('button[type="submit"]');

form.onsubmit = async (e) => {
  e.preventDefault();
  resultBox.innerHTML = "<em class='text-indigo-200'>Analisi in corso... ⏳</em>";

  const formData = new FormData(form);
  const urlInput = urlInputField.value.trim();
  if (urlInput) formData.append("url", urlInput);

  const res = await fetch("/process", {
    method: "POST",
    body: formData
  });

  if (!res.ok) {
    resultBox.innerHTML = "";
    const banner = document.createElement("div");
    banner.className = "mt-8 p-5 rounded-2xl text-center max-w-xl mx-auto font-medium";

    if (res.status === 403) {
      banner.classList.add("bg-yellow-600/20", "text-yellow-300", "border", "border-yellow-500");
      banner.innerHTML = `⚠️ <strong>Limite giornaliero raggiunto.</strong><br>Riprova domani!`;
    } else if (res.status === 413) {
      banner.classList.add("bg-orange-600/20", "text-orange-300", "border", "border-orange-500");
      banner.innerHTML = `⚠️ <strong>File troppo grande.</strong><br>Carica file sotto i 5MB.`;
    } else {
      banner.classList.add("bg-red-600/20", "text-red-300", "border", "border-red-500");
      banner.innerHTML = `❌ Errore durante l'elaborazione.`;
    }
    resultBox.appendChild(banner);
    return;
  }

  const quizData = await res.json();
  renderQuiz(quizData);
};

function renderQuiz(data) {
  resultBox.innerHTML = "";
  data.forEach((item, index) => {
    const container = document.createElement("div");
    container.className = "quiz-question mb-6 p-4 border border-indigo-600 rounded-2xl bg-indigo-800/30";
    if (item.type === "multiple" && item.answer) container.dataset.answer = item.answer;

    const title = document.createElement("h3");
    title.textContent = `${index + 1}. ${item.question}`;
    title.className = "mb-2 font-semibold text-indigo-100";
    container.appendChild(title);

    if (item.type === "multiple") {
      item.options.forEach(opt => {
        const label = document.createElement("label");
        label.className = "block mb-1 text-indigo-200";

        const input = document.createElement("input");
        input.type = "radio";
        input.name = `question-${index}`;
        input.value = opt;
        input.className = "mr-2 accent-cyan-500";

        label.appendChild(input);
        label.append(` ${opt}`);
        container.appendChild(label);
      });
    } else if (item.type === "text") {
      const input = document.createElement("textarea");
      input.name = `question-${index}`;
      input.rows = 3;
      input.className = "w-full bg-indigo-700/50 border border-indigo-600 rounded-md p-3 text-white";
      container.appendChild(input);
    }

    resultBox.appendChild(container);
  });
  validateBtn.classList.remove("hidden");
}

validateBtn.onclick = async () => {
  validateBtn.disabled = true;
  validateBtn.textContent = "Validazione in corso...";

  const questions = [], answers = [];

  document.querySelectorAll(".quiz-question").forEach((questionEl, index) => {
    const oldFeedback = questionEl.querySelector(".quiz-feedback");
    if (oldFeedback) oldFeedback.remove();

    const qText = questionEl.querySelector("h3").textContent.replace(/^\\d+\\.\\s*/, "");
    const type = questionEl.querySelector("textarea") ? "text" : "multiple";

    let userAnswer = "";
    if (type === "multiple") {
      const checked = questionEl.querySelector("input[type=radio]:checked");
      if (checked) userAnswer = checked.value;
    } else {
      const input = questionEl.querySelector("textarea");
      if (input) userAnswer = input.value.trim();
    }

    const qData = { question: qText, type };
    if (type === "multiple") {
      qData.options = Array.from(questionEl.querySelectorAll("input[type=radio]"), r => r.value);
      qData.answer = questionEl.dataset.answer;
    }

    questions.push(qData);
    answers.push(userAnswer);
  });

  const res = await fetch("/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ questions, answers })
  });

  const data = await res.json();
  const feedbackList = Array.isArray(data.feedback) ? data.feedback : JSON.parse(data.feedback);

  document.querySelectorAll(".quiz-question").forEach((questionEl, i) => {
    const fb = feedbackList[i];
    if (!fb) return;

    const isCorrect = fb.correct;
    questionEl.classList.add(isCorrect ? "bg-green-700/20" : "bg-red-700/20");

    const fbElem = document.createElement("div");
    fbElem.className = `quiz-feedback mt-3 p-3 rounded-lg text-sm italic ${isCorrect ? "bg-green-800 text-green-100" : "bg-red-800 text-red-100"}`;
    fbElem.textContent = `💬 ${fb.feedback}`;
    questionEl.appendChild(fbElem);
  });

  const correctCount = feedbackList.filter(f => f.correct).length;
  const total = feedbackList.length;
  const percent = Math.round((correctCount / total) * 100);

  const banner = document.getElementById("scoreBanner");
  banner.className = `${percent >= 50 ? "bg-green-800 text-green-300 border border-green-600" : "bg-red-800 text-red-300 border border-red-600"} mt-4 py-4 rounded-2xl font-bold text-center max-w-xl mx-auto`;
  banner.textContent = `✅ Hai risposto correttamente a ${correctCount} su ${total} domande (${percent}%).`;
  banner.classList.remove("hidden");

  validateBtn.disabled = false;
  validateBtn.textContent = "Valida risposte";
};

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBlZldD9uynhcoRxoYiLDzb9Ee4wCgREIU",
  authDomain: "quizzify-f9c84.firebaseapp.com",
  projectId: "quizzify-f9c84",
  storageBucket: "quizzify-f9c84.firebasestorage.app",
  messagingSenderId: "259501653186",
  appId: "1:259501653186:web:d015a02bde160751588f5b",
  measurementId: "G-W41MXWVFM7"
};

firebase.initializeApp(firebaseConfig);
const ui = new firebaseui.auth.AuthUI(firebase.auth());
ui.start('#firebaseui-auth-container', {
  signInOptions: [
    firebase.auth.EmailAuthProvider.PROVIDER_ID,
    firebase.auth.GoogleAuthProvider.PROVIDER_ID
  ],
});

let currentUser = null;

const userInfoBox = document.getElementById("userInfoBox");

const loginModal = document.getElementById("loginModal");
const closeModalBtn = document.getElementById("closeModalBtn");

// Chiude la modale
closeModalBtn.addEventListener("click", () => {
  loginModal.classList.add("hidden");
});

// Blocco submit se non loggato
form.onsubmit = async (e) => {
  if (!firebase.auth().currentUser) {
    e.preventDefault();
    loginModal.classList.remove("hidden");
    return;
  }

  e.preventDefault();
  resultBox.innerHTML = "<em class='text-indigo-200'>Analisi in corso... ⏳</em>";

  const formData = new FormData(form);
  const urlInput = urlInputField.value.trim();
  if (urlInput) formData.append("url", urlInput);

  const res = await fetch("/process", {
    method: "POST",
    body: formData
  });

  if (!res.ok) {
    resultBox.innerHTML = "";
    const banner = document.createElement("div");
    banner.className = "mt-8 p-5 rounded-2xl text-center max-w-xl mx-auto font-medium";
    banner.classList.add("bg-red-600/20", "text-red-300", "border", "border-red-500");
    banner.innerHTML = "❌ Errore durante l'elaborazione.";
    resultBox.appendChild(banner);
    return;
  }

  const quizData = await res.json();
  renderQuiz(quizData);
};