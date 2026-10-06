import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";


/* ==========================================================
   FIREBASE

   IMPORTANTE:
   Reemplazá este bloque por el firebaseConfig REAL de tu
   proyecto, es decir, el mismo que ya usás en tu versión
   que guarda jugadores correctamente en Firestore.
   ========================================================== */

const firebaseConfig = {
    apiKey: "AIzaSyCoXIeIDGWlZmIkPaUjc3PkdsJNaB4VMxE",
    authDomain: "juego-cartas-8ec9c.firebaseapp.com",
    projectId: "juego-cartas-8ec9c",
    storageBucket: "juego-cartas-8ec9c.firebasestorage.app",
    messagingSenderId: "717563860845",
    appId: "1:717563860845:web:7272248bafa9562a586c64",
    measurementId: "G-ZTF7VEQNGQ"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


/* ==========================================================
   CARTAS
   ========================================================== */

const CARD_NUMBERS = [
  1, 2, 3, 4, 5, 6, 7, 10, 11, 12
];

const POINT_VALUE = {
  1: 1,
  2: 2,
  3: 3,
  4: 4,
  5: 5,
  6: 6,
  7: 7,
  10: 8,
  11: 9,
  12: 10
};

const SUITS = {
  oro: {
    fileName: "coins",
    offset: 4,
    ending: 9,
    label: "oro"
  },

  espada: {
    fileName: "swords",
    offset: 3,
    ending: 8,
    label: "espada"
  },

  basto: {
    fileName: "clubs",
    offset: 2,
    ending: 7,
    label: "basto"
  },

  copa: {
    fileName: "cups",
    offset: 1,
    ending: 6,
    label: "copa"
  }
};


/* ==========================================================
   ELEMENTOS DEL DOM
   ========================================================== */

const cardImage =
  document.getElementById("cardImage");

const resultValue =
  document.getElementById("resultValue");

const answersContainer =
  document.getElementById("answers");

const feedback =
  document.getElementById("feedback");

const nextButton =
  document.getElementById("nextButton");

const progress =
  document.getElementById("progress");

const scoreElement =
  document.getElementById("score");

const endScreen =
  document.getElementById("endScreen");

const finalScore =
  document.getElementById("finalScore");

const restartButton =
  document.getElementById("restartButton");

const timerElement =
  document.getElementById("timer");

const playerNameInput =
  document.getElementById("playerName");

const startButton =
  document.getElementById("startButton");

const startScreen =
  document.getElementById("startScreen");

const nameError =
  document.getElementById("nameError");

const gameStats =
  document.getElementById("gameStats");

const rankingList =
  document.getElementById("rankingList");

const rankingStatus =
  document.getElementById("rankingStatus");


/* ==========================================================
   SONIDOS
   ========================================================== */

const correctSound =
  new Audio("assets/sounds/correct.mp3");

const incorrectSound =
  new Audio("assets/sounds/incorrect.mp3");

const successSound =
  new Audio("assets/sounds/success.mp3");

const failureSound =
  new Audio("assets/sounds/failure.mp3");


/* ==========================================================
   ESTADO DEL JUEGO
   ========================================================== */

let deck = [];
let currentIndex = 0;
let score = 0;
let currentCard = null;
let answered = false;

let playerName = "";

let seconds = 0;
let timerInterval = null;


/* ==========================================================
   FIRESTORE: GUARDAR PUNTAJE
   ========================================================== */

async function saveScore() {

  const percentage =
    Math.round((score / deck.length) * 100);

  try {

    await addDoc(
      collection(db, "ranking"),
      {
        name: playerName,
        score: score,
        percentage: percentage,
        time: seconds
      }
    );

    console.log(
      "Puntaje guardado correctamente"
    );

    return true;

  } catch (error) {

    console.error(
      "Error al guardar el puntaje:",
      error
    );

    return false;
  }
}


/* ==========================================================
   FIRESTORE: CARGAR RANKING

   Se conserva visualmente el mejor resultado de cada alias.
   Criterio:
   1) mayor puntaje
   2) menor tiempo
   ========================================================== */

async function loadRanking() {

  rankingList.innerHTML = "";

  rankingStatus.textContent =
    "Cargando ranking...";

  rankingStatus.classList.remove("hidden");

  try {

    const snapshot =
      await getDocs(
        collection(db, "ranking")
      );

    const results = [];

    snapshot.forEach(documentSnapshot => {

      const data =
        documentSnapshot.data();

      if (
        typeof data.name === "string" &&
        typeof data.score === "number" &&
        typeof data.time === "number"
      ) {

        results.push(data);

      }

    });


    // Un solo mejor resultado por alias.

    const bestByPlayer =
      new Map();

    for (const result of results) {

      const key =
        result.name
          .trim()
          .toLowerCase();

      if (!key) {
        continue;
      }

      const previous =
        bestByPlayer.get(key);

      if (!previous) {

        bestByPlayer.set(
          key,
          result
        );

        continue;
      }

      const betterScore =
        result.score > previous.score;

      const sameScoreFaster =
        result.score === previous.score &&
        result.time < previous.time;

      if (
        betterScore ||
        sameScoreFaster
      ) {

        bestByPlayer.set(
          key,
          result
        );

      }
    }


    const ranking = [
      ...bestByPlayer.values()
    ]
      .sort((a, b) => {

        if (b.score !== a.score) {

          return b.score - a.score;

        }

        return a.time - b.time;

      })
      .slice(0, 10);


    rankingList.innerHTML = "";

    if (ranking.length === 0) {

      rankingStatus.textContent =
        "Todavía no hay jugadores.";

      return;
    }

    rankingStatus.classList.add("hidden");


    ranking.forEach(
      (player, index) => {

        const item =
          document.createElement("li");

        item.className =
          "ranking-item";


        const playerKey =
          player.name
            .trim()
            .toLowerCase();

        const currentPlayerKey =
          playerName
            .trim()
            .toLowerCase();

        if (
          playerKey === currentPlayerKey
        ) {

          item.classList.add(
            "current-player"
          );
        }


        const position =
          document.createElement("span");

        position.className =
          "ranking-position";

        position.textContent =
          `#${index + 1}`;


        const name =
          document.createElement("span");

        name.className =
          "ranking-name";

        name.textContent =
          player.name;


        const scoreText =
          document.createElement("span");

        scoreText.className =
          "ranking-score";

        scoreText.textContent =
          `${player.score}/40`;


        const timeText =
          document.createElement("span");

        timeText.className =
          "ranking-time";

        timeText.textContent =
          formatTime(player.time);


        item.append(
          position,
          name,
          scoreText,
          timeText
        );


        rankingList.appendChild(item);
      }
    );

  } catch (error) {

    console.error(
      "Error al cargar ranking:",
      error
    );

    rankingStatus.textContent =
      "No se pudo cargar el ranking.";
  }
}


/* ==========================================================
   CÁLCULO DEL RESULTADO R
   ========================================================== */

function calculateResult(
  number,
  suit
) {

  const x =
    POINT_VALUE[number];

  return (
    (2 * x + 1) * 5 +
    SUITS[suit].offset
  );
}


/* ==========================================================
   CREACIÓN DEL MAZO
   ========================================================== */

function createDeck() {

  const newDeck = [];

  for (const number of CARD_NUMBERS) {

    for (
      const suit of Object.keys(SUITS)
    ) {

      newDeck.push({
        number: number,
        suit: suit,
        value: POINT_VALUE[number],
        result: calculateResult(
          number,
          suit
        )
      });

    }
  }

  return newDeck;
}


/* ==========================================================
   MEZCLAR ARREGLO
   ========================================================== */

function shuffle(array) {

  const copy =
    [...array];

  for (
    let i = copy.length - 1;
    i > 0;
    i--
  ) {

    const j =
      Math.floor(
        Math.random() * (i + 1)
      );

    [copy[i], copy[j]] =
      [copy[j], copy[i]];
  }

  return copy;
}


/* ==========================================================
   RUTA DE LA IMAGEN DE UNA CARTA
   ========================================================== */

function getCardImagePath(card) {

  const number =
    String(card.number)
      .padStart(2, "0");

  const suitFile =
    SUITS[card.suit].fileName;

  return (
    `assets/cards/` +
    `card_${suitFile}_${number}.svg`
  );
}


/* ==========================================================
   NOMBRE DE LA CARTA
   ========================================================== */

function formatCardName(card) {

  return (
    `${card.number} de ` +
    `${SUITS[card.suit].label}`
  );
}


/* ==========================================================
   UTILIDADES PARA DISTRACTORES
   ========================================================== */

function getRandomItem(array) {

  return array[
    Math.floor(
      Math.random() * array.length
    )
  ];
}


function getNearbyNumber(number) {

  const index =
    CARD_NUMBERS.indexOf(number);

  const candidates = [];

  if (index > 0) {

    candidates.push(
      CARD_NUMBERS[index - 1]
    );
  }

  if (
    index <
    CARD_NUMBERS.length - 1
  ) {

    candidates.push(
      CARD_NUMBERS[index + 1]
    );
  }

  return getRandomItem(candidates);
}


function sameOption(
  cardA,
  cardB
) {

  return (
    cardA.number === cardB.number &&
    cardA.suit === cardB.suit
  );
}


/* ==========================================================
   GENERACIÓN DE LAS 4 OPCIONES

   Para 10, 11 y 12 hay una opción capciosa:
   10 -> vale 8
   11 -> vale 9
   12 -> vale 10
   ========================================================== */

function buildOptions(correctCard) {

  const options =
    [correctCard];

  const isFigureCard =
    [10, 11, 12]
      .includes(
        correctCard.number
      );

  const useTrickOption =
    isFigureCard &&
    Math.random() < 0.70;


  if (useTrickOption) {

    const literalValue =
      POINT_VALUE[
        correctCard.number
      ];

    options.push({
      number: literalValue,
      suit: correctCard.suit,
      value: literalValue,
      result: null,
      isTrick: true
    });
  }


  // Mismo número, otro palo.

  const otherSuits =
    Object.keys(SUITS)
      .filter(
        suit =>
          suit !== correctCard.suit
      );

  const sameNumberWrongSuit = {
    number: correctCard.number,
    suit: getRandomItem(
      otherSuits
    ),
    value: correctCard.value,
    result: null
  };

  if (
    !options.some(
      option =>
        sameOption(
          option,
          sameNumberWrongSuit
        )
    )
  ) {

    options.push(
      sameNumberWrongSuit
    );
  }


  // Mismo palo, número vecino.

  const nearbyNumber =
    getNearbyNumber(
      correctCard.number
    );

  const nearbyCard = {
    number: nearbyNumber,
    suit: correctCard.suit,
    value:
      POINT_VALUE[nearbyNumber],
    result:
      calculateResult(
        nearbyNumber,
        correctCard.suit
      )
  };

  if (
    !options.some(
      option =>
        sameOption(
          option,
          nearbyCard
        )
    )
  ) {

    options.push(
      nearbyCard
    );
  }


  // Completar hasta llegar a 4.

  const availableCards =
    createDeck().filter(
      card =>
        !options.some(
          option =>
            sameOption(
              option,
              card
            )
        )
    );

  while (
    options.length < 4
  ) {

    const candidate =
      getRandomItem(
        availableCards
      );

    if (
      !options.some(
        option =>
          sameOption(
            option,
            candidate
          )
      )
    ) {

      options.push(
        candidate
      );
    }
  }

  return shuffle(
    options.slice(0, 4)
  );
}


/* ==========================================================
   MOSTRAR UNA RONDA
   ========================================================== */

function renderRound() {

  answered = false;

  currentCard =
    deck[currentIndex];

  progress.textContent =
    `${currentIndex + 1} / ${deck.length}`;

  scoreElement.textContent =
    score;

  resultValue.textContent =
    `R = ${currentCard.result}`;

  cardImage.src =
    "assets/cards/card_back.svg";

  cardImage.alt =
    "Carta tapada";

  cardImage.classList.remove(
    "revealed"
  );

  feedback.className =
    "feedback hidden";

  feedback.innerHTML = "";

  nextButton.classList.add(
    "hidden"
  );

  answersContainer.innerHTML = "";


  const options =
    buildOptions(
      currentCard
    );

  const letters =
    ["A", "B", "C", "D"];


  options.forEach(
    (option, index) => {

      const button =
        document.createElement(
          "button"
        );

      button.type =
        "button";

      button.className =
        "answer-button";

      button.dataset.number =
        option.number;

      button.dataset.suit =
        option.suit;

      if (option.isTrick) {

        button.dataset.trick =
          "true";
      }

      button.innerHTML = `
        <span class="option-letter">
          ${letters[index]}
        </span>
        ${formatCardName(option)}
      `;

      button.addEventListener(
        "click",
        () =>
          handleAnswer(
            button,
            option
          )
      );

      answersContainer.appendChild(
        button
      );
    }
  );
}


/* ==========================================================
   PROCESAR RESPUESTA
   ========================================================== */

function handleAnswer(
  selectedButton,
  selectedCard
) {

  if (answered) {
    return;
  }

  answered = true;

  const isCorrect =
    selectedCard.number ===
      currentCard.number &&
    selectedCard.suit ===
      currentCard.suit;


  if (isCorrect) {

    correctSound.currentTime = 0;

    correctSound
      .play()
      .catch(() => {});

    score += 1;

    scoreElement.textContent =
      score;

  } else {

    incorrectSound.currentTime = 0;

    incorrectSound
      .play()
      .catch(() => {});
  }


  const buttons = [
    ...document.querySelectorAll(
      ".answer-button"
    )
  ];


  buttons.forEach(button => {

    button.disabled = true;

    const buttonNumber =
      Number(
        button.dataset.number
      );

    const buttonSuit =
      button.dataset.suit;

    const buttonIsCorrect =
      buttonNumber ===
        currentCard.number &&
      buttonSuit ===
        currentCard.suit;

    if (buttonIsCorrect) {

      button.classList.add(
        "correct"
      );
    }
  });


  if (!isCorrect) {

    selectedButton.classList.add(
      "incorrect"
    );
  }


  revealCard(
    isCorrect,
    selectedCard
  );
}


/* ==========================================================
   REVELAR CARTA
   ========================================================== */

function revealCard(
  isCorrect,
  selectedCard
) {

  cardImage.src =
    getCardImagePath(
      currentCard
    );

  cardImage.alt =
    formatCardName(
      currentCard
    );

  cardImage.classList.add(
    "revealed"
  );

  feedback.className =
    `feedback ${
      isCorrect
        ? "success"
        : "error"
    }`;


  let extraExplanation = "";


  if (
    [10, 11, 12]
      .includes(
        currentCard.number
      )
  ) {

    extraExplanation = `
      <br>
      Recordá que la carta
      <strong>${currentCard.number}</strong>
      tiene valor
      <strong>${currentCard.value}</strong>
      en este problema.
    `;
  }


  if (
    !isCorrect &&
    selectedCard.isTrick
  ) {

    extraExplanation += `
      <br>
      La opción
      <strong>
        ${selectedCard.number}
        de
        ${SUITS[selectedCard.suit].label}
      </strong>
      usa directamente el valor
      <strong>${currentCard.value}</strong>,
      pero ese valor no es necesariamente
      el número escrito en la carta.
    `;
  }


  feedback.innerHTML = `
    <strong>
      ${
        isCorrect
          ? "¡Correcto!"
          : "Respuesta incorrecta."
      }
    </strong>

    <br>

    La carta es
    <strong>
      ${formatCardName(currentCard)}
    </strong>.

    <br>

    R termina en
    <strong>
      ${SUITS[currentCard.suit].ending}
    </strong>,
    por lo que el palo es
    <strong>
      ${SUITS[currentCard.suit].label}
    </strong>.

    <br>

    El valor asociado es
    <strong>
      ${currentCard.value}
    </strong>.

    ${extraExplanation}
  `;


  nextButton.classList.remove(
    "hidden"
  );
}


/* ==========================================================
   SIGUIENTE CARTA
   ========================================================== */

function nextRound() {

  currentIndex += 1;

  if (
    currentIndex >=
    deck.length
  ) {

    showEndScreen();

    return;
  }

  renderRound();
}


/* ==========================================================
   TEMPORIZADOR
   ========================================================== */

function startTimer() {

  stopTimer();

  timerInterval =
    setInterval(() => {

      seconds++;

      updateTimerDisplay();

    }, 1000);
}


function stopTimer() {

  if (timerInterval) {

    clearInterval(
      timerInterval
    );

    timerInterval = null;
  }
}


function updateTimerDisplay() {

  timerElement.textContent =
    formatTime(seconds);
}


function formatTime(totalSeconds) {

  const minutes =
    Math.floor(
      totalSeconds / 60
    );

  const remainingSeconds =
    totalSeconds % 60;

  return (
    `${String(minutes)
      .padStart(2, "0")}:` +
    `${String(remainingSeconds)
      .padStart(2, "0")}`
  );
}


/* ==========================================================
   PANTALLA FINAL
   ========================================================== */

async function showEndScreen() {

  stopTimer();

  document
    .querySelector(".game-card")
    .classList.add("hidden");

  document
    .querySelector(".instructions")
    .classList.add("hidden");

  gameStats.classList.add(
    "hidden"
  );


  const percentage =
    Math.round(
      (score / deck.length) *
      100
    );


  finalScore.innerHTML = `
    <strong>${playerName}</strong>
    <br><br>

    <strong>
      ${score} / ${deck.length}
    </strong>

    <br>

    ${percentage}% de respuestas correctas

    <br>

    Tiempo:
    <strong>
      ${formatTime(seconds)}
    </strong>
  `;


  endScreen.classList.remove(
    "hidden"
  );


  // Sonido inmediatamente:
  // no hace falta esperar a Firebase.

  if (score >= 28) {

    successSound.currentTime = 0;

    successSound
      .play()
      .catch(error => {

        console.error(
          "No se pudo reproducir success.mp3:",
          error
        );
      });

  } else {

    failureSound.currentTime = 0;

    failureSound
      .play()
      .catch(error => {

        console.error(
          "No se pudo reproducir failure.mp3:",
          error
        );
      });
  }


  // Guardar y luego mostrar ranking.

  await saveScore();

  await loadRanking();
}


/* ==========================================================
   INICIAR / REINICIAR PARTIDA
   ========================================================== */

function restartGame() {

  deck =
    shuffle(
      createDeck()
    );

  currentIndex = 0;

  score = 0;

  answered = false;

  seconds = 0;

  updateTimerDisplay();

  startTimer();


  startScreen.classList.add(
    "hidden"
  );

  gameStats.classList.remove(
    "hidden"
  );

  document
    .querySelector(".game-card")
    .classList.remove("hidden");

  document
    .querySelector(".instructions")
    .classList.remove("hidden");

  endScreen.classList.add(
    "hidden"
  );

  feedback.classList.add(
    "hidden"
  );

  renderRound();
}


/* ==========================================================
   EVENTOS
   ========================================================== */

nextButton.addEventListener(
  "click",
  nextRound
);


restartButton.addEventListener(
  "click",
  restartGame
);


startButton.addEventListener(
  "click",
  () => {

    const name =
      playerNameInput
        .value
        .trim();

    if (name === "") {

      nameError.classList.remove(
        "hidden"
      );

      playerNameInput.focus();

      return;
    }

    nameError.classList.add(
      "hidden"
    );

    playerName = name;

    restartGame();
  }
);


playerNameInput.addEventListener(
  "keydown",
  event => {

    if (
      event.key === "Enter"
    ) {

      startButton.click();
    }
  }
);


/* ==========================================================
   ESTADO INICIAL
   ========================================================== */

updateTimerDisplay();

playerNameInput.focus();
