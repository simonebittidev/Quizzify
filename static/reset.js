const firebaseConfig = {
  apiKey: "AIzaSyBlZldD9uynhcoRxoYiLDzb9Ee4wCgREIU",
  authDomain: "quizzify-f9c84.firebaseapp.com",
  projectId: "quizzify-f9c84",
  storageBucket: "quizzify-f9c84.appspot.com",
  messagingSenderId: "259501653186",
  appId: "1:259501653186:web:d015a02bde160751588f5b"
};
firebase.initializeApp(firebaseConfig);

const loginForm = document.getElementById('resetForm');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('resetEmail').value.trim();

  if (email) {
    firebase.auth().sendPasswordResetEmail(email)
      .then(() => {
        alert('Ti abbiamo inviato un\'email per resettare la password.');

        window.location.href = 'play';
      })
      .catch((error) => {
        alert('Errore: ' + error.message);
      });
  }
});
