const firebaseConfig = {
  apiKey: "AIzaSyBlZldD9uynhcoRxoYiLDzb9Ee4wCgREIU",
  authDomain: "quizzify-f9c84.firebaseapp.com",
  projectId: "quizzify-f9c84",
  storageBucket: "quizzify-f9c84.appspot.com",
  messagingSenderId: "259501653186",
  appId: "1:259501653186:web:d015a02bde160751588f5b"
};
firebase.initializeApp(firebaseConfig);

const loginButton = document.getElementById('loginToggle');
const loginForm = document.getElementById('loginForm');
const googleLoginBtn = document.getElementById('googleLoginBtn');
const alertError = document.getElementById('alertError');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;

  try {
    await firebase.auth().createUserWithEmailAndPassword(email, password);
    window.location.href = 'play';
  } catch (signupError) {
    alertError.classList.toggle('hidden');
  }
});

googleLoginBtn.addEventListener('click', async () => {
  const provider = new firebase.auth.GoogleAuthProvider();
  try {
    await firebase.auth().signInWithPopup(provider);
    window.location.href = 'play';
  } catch (error) {
    alertError.classList.toggle('hidden');
  }
});
