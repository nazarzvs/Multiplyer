// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAm_Nm2NkfYz0bMYAJQGy9o6rxez_KPJKs",
  authDomain: "multiplyer-leaderboard.firebaseapp.com",
  databaseURL: "https://multiplyer-leaderboard-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "multiplyer-leaderboard",
  storageBucket: "multiplyer-leaderboard.appspot.com",
  messagingSenderId: "1055294957322",
  appId: "1:1055294957322:web:7b5b0f9539bc57c4affcf3",
  measurementId: "G-KPVYV8Y0RG"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

/* ======= Таблица рекордов (Firebase) ======= */
function fetchAndDisplayLeaderboard(device, elementId) {
  const leaderboardList = document.getElementById(elementId);
  const scoresRef = database.ref(`scores_${device}`).orderByChild('score').limitToLast(10);

  scoresRef.on('value', (snapshot) => {
    leaderboardList.innerHTML = 'Загрузка...'; // Placeholder
    const scores = [];
    snapshot.forEach((childSnapshot) => {
      scores.push(childSnapshot.val());
    });
    // Sort descending
    scores.reverse();
    leaderboardList.innerHTML = ''; // Clear placeholder
    if (scores.length === 0) {
      leaderboardList.innerHTML = '<li>Нет данных.</li>';
    }
    scores.forEach((score) => {
      const li = document.createElement('li');
      li.textContent = `${score.name}: ${score.score} (${score.time}s)`;
      leaderboardList.appendChild(li);
    });
  });
}

// Загружаем обе таблицы рекордов
fetchAndDisplayLeaderboard('pc', 'leaderboardList_pc');
fetchAndDisplayLeaderboard('mobile', 'leaderboardList_mobile');
