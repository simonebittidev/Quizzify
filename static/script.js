// Inizializzazione Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBlZldD9uynhcoRxoYiLDzb9Ee4wCgREIU",
  authDomain: "quizzify-f9c84.firebaseapp.com",
  projectId: "quizzify-f9c84",
  storageBucket: "quizzify-f9c84.appspot.com",
  messagingSenderId: "259501653186",
  appId: "1:259501653186:web:d015a02bde160751588f5b"
};
firebase.initializeApp(firebaseConfig);

// Riferimenti agli elementi
const form = document.getElementById("uploadForm");
const resultBox = document.getElementById("result");
const validateBtn = document.getElementById("validateBtn");
const spinner = document.getElementById("spinner");

const loginButton = document.getElementById('loginToggle');
const userProfile = document.getElementById('userProfile');
const userMenuButton = document.getElementById('userMenuButton');
const userDropdown = document.getElementById('userDropdown');
const userAvatar = document.getElementById('userAvatar');
const userName = document.getElementById('userName');
const logoutButton = document.getElementById('logoutBtn');
const changePasswordButton = document.getElementById('changePasswordBtn');
const deleteAccountButton = document.getElementById('deleteAccountBtn');

const loginModal = document.getElementById('loginModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const loginForm = document.getElementById('loginForm');
const resetPasswordBtn = document.getElementById('resetPasswordBtn');
const googleLoginBtn = document.getElementById('googleLoginBtn');

// Gestione visibilità modale login
loginButton.addEventListener('click', () => {
  loginModal.classList.remove('hidden');
});

closeModalBtn.addEventListener('click', () => {
  loginModal.classList.add('hidden');
});

userMenuButton.addEventListener('click', () => {
  userDropdown.classList.toggle('hidden');
});

// Login Email/Password con registrazione automatica
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  try {
    await firebase.auth().signInWithEmailAndPassword(email, password);
    loginModal.classList.add('hidden');
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      if (confirm('Nessun account trovato. Vuoi registrarti?')) {
        try {
          await firebase.auth().createUserWithEmailAndPassword(email, password);
          alert('Registrazione completata! Ora sei loggato.');
          loginModal.classList.add('hidden');
        } catch (signupError) {
          alert('Errore durante la registrazione: ' + signupError.message);
        }
      }
    } else {
      alert('Errore di login: ' + error.message);
    }
  }
});

// Login con Google
googleLoginBtn.addEventListener('click', async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await firebase.auth().signInWithPopup(provider);
    loginModal.classList.add('hidden');
  } catch (error) {
    alert('Errore con Google Login: ' + error.message);
  }
});

// Reset password
resetPasswordBtn.addEventListener('click', () => {
  const email = prompt('Inserisci la tua email per ricevere il reset password:');
  if (email) {
    firebase.auth().sendPasswordResetEmail(email)
      .then(() => {
        alert('Ti abbiamo inviato un\'email per resettare la password.');
      })
      .catch((error) => {
        alert('Errore: ' + error.message);
      });
  }
});

// Logout
logoutButton.addEventListener('click', () => {
  firebase.auth().signOut()
    .then(() => {
      console.log('Utente disconnesso');
      userDropdown.classList.add('hidden');
    })
    .catch((error) => {
      alert('Errore nel logout: ' + error.message);
    });
});

// Cambia password
changePasswordButton.addEventListener('click', () => {
  const newPassword = prompt('Inserisci la nuova password:');
  if (newPassword) {
    firebase.auth().currentUser.updatePassword(newPassword)
      .then(() => {
        alert('Password aggiornata!');
      })
      .catch((error) => {
        alert('Errore nel cambio password: ' + error.message);
      });
  }
});

// Cancellazione account
deleteAccountButton.addEventListener('click', () => {
  if (confirm('Sei sicuro di voler cancellare il tuo account?')) {
    firebase.auth().currentUser.delete()
      .then(() => {
        alert('Account cancellato.');
      })
      .catch((error) => {
        alert('Errore nella cancellazione: ' + error.message);
      });
  }
});

// Monitoraggio stato autenticazione
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
    loginButton.classList.add('hidden');
    userProfile.classList.remove('hidden');

    userAvatar.src = user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || user.email[0])}`;
    userName.textContent = user.displayName || user.email;
  } else {
    loginButton.classList.remove('hidden');
    userProfile.classList.add('hidden');
    userDropdown.classList.add('hidden');
  }
});

// Submit upload solo se loggato
form.onsubmit = async (e) => {
  e.preventDefault();

  if (!firebase.auth().currentUser) {
    loginModal.classList.remove('hidden');
    return;
  }

  resultBox.innerHTML = "";
  spinner.classList.remove('hidden');

  const formData = new FormData(form);
  const urlInput = document.getElementById('urlInput').value.trim();
  if (urlInput) formData.append("url", urlInput);
  formData.append("user", firebase.auth().currentUser.uid);

  try {
    const res = await fetch("/process", {
      method: "POST",
      body: formData
    });

    spinner.classList.add('hidden');

    if (res.status === 429) {
      resultBox.innerHTML = "⚠️ Daily quiz limit reached. Come back in 24 hours to generate new quizzes!";
      return;
    }
    else if (!res.ok) {
      resultBox.innerHTML = "❌ Error during processing.";
      return;
    }

    const quizData = await res.json();
    renderQuiz(quizData);
  } catch (error) {
    spinner.classList.add('hidden');
    resultBox.innerHTML = "❌ Error during processing.";
  }
};

// Rendering Quiz
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
        input.className = "mr-2 accent-yellow-400";

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
  validateBtn.classList.remove('hidden');
}

// Validazione Risposte
validateBtn.onclick = async () => {
  validateBtn.disabled = true;
  validateBtn.textContent = "Validating...";

  const questions = [], answers = [];

  document.querySelectorAll(".quiz-question").forEach((questionEl, index) => {
    const qText = questionEl.querySelector("h3").textContent.replace(/^\d+\.\s*/, "");
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
  banner.className = `${percent >= 50 ? "bg-green-800 text-green-300 border border-green-600" : "bg-red-800 text-red-300 border border-red-600"} mt-4 py-4 px-8 rounded-2xl font-bold text-center max-w-xl mx-auto`;
  banner.textContent = `✅ You answered correctly ${correctCount} out of ${total} questions (${percent}%).`;
  banner.classList.remove("hidden");

  validateBtn.disabled = false;
  validateBtn.textContent = "Validate Answers";
};
