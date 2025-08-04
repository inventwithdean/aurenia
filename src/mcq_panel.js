let questions = null;
let currentQuestionNum = null; // 0 indexed
let currentChoice = null; // 0 indexed
let questionEl;
let option_aEl;
let option_bEl;
let option_cEl;
let option_dEl;
let next_btn;
let mcqContainerDiv;
let mcqResultsContainerDiv;
let userChoices = {};
import { showCompanionTab } from "./companion_panel";

// Initializes Questions, Elements and adds Event Listeners
export function initializeMCQ(questionsObj) {
  currentChoice = null;
  userChoices = {};
  questionEl = document.getElementById("mcq-question");
  option_aEl = document.getElementById("mcq-option-a");
  option_bEl = document.getElementById("mcq-option-b");
  option_cEl = document.getElementById("mcq-option-c");
  option_dEl = document.getElementById("mcq-option-d");
  next_btn = document.getElementById("mcq-next-btn");
  mcqContainerDiv = document.getElementById("mcq-container");
  mcqResultsContainerDiv = document.getElementById("mcq-results-container");
  showCompanionTab("mcq-container");
  questions = questionsObj;
  currentQuestionNum = 0;
  option_aEl.addEventListener("click", () => {
    currentChoice = "A";
  });
  option_bEl.addEventListener("click", () => {
    currentChoice = "B";
  });
  option_cEl.addEventListener("click", () => {
    currentChoice = "C";
  });
  option_dEl.addEventListener("click", () => {
    currentChoice = "D";
  });
  next_btn.addEventListener("click", () => {
    if (!currentChoice) return;
    userChoices[currentQuestionNum] = currentChoice;
    if (currentQuestionNum < 4) {
      // Calculate Score
      // Show next Question
      currentQuestionNum++;
      currentChoice = null;
      renderMCQQuestion(questions[currentQuestionNum]);
    } else {
      // Show Results
      showResults();
    }
  });
  renderMCQQuestion(questions[0]);
}

export async function renderMCQQuestion(question) {
  questionEl.textContent = question["question"];
  option_aEl.textContent = question["A"];
  option_bEl.textContent = question["B"];
  option_cEl.textContent = question["C"];
  option_dEl.textContent = question["D"];
}

function showResults() {
  mcqResultsContainerDiv.innerHTML = "";

  // Show MCQ Results and hide Quiz
  showCompanionTab("mcq-results-container");
  let currentQuestionNum = 0;
  questions.forEach((question) => {
    const correct_option = question["correct_option"];
    const questionSpan = document.createElement("span");
    questionSpan.className = "text-2xl mb-6 text-center font-semibold";
    questionSpan.textContent = question["question"];
    mcqResultsContainerDiv.appendChild(questionSpan);
    const optionsDiv = document.createElement("div");
    optionsDiv.className = "grid gap-4 w-full max-w-md mb-6";
    let options = {
      A: question["A"],
      B: question["B"],
      C: question["C"],
      D: question["D"],
    };
    Object.entries(options).forEach(([key, value]) => {
      const optionElem = document.createElement("span");
      optionElem.className =
        "px-6 py-4 rounded-2xl transition-all shadow text-left";
      optionElem.textContent = value;
      if (key == correct_option) {
        optionElem.classList.add("bg-green-500");
      } else {
        if (userChoices[currentQuestionNum] == key) {
          optionElem.classList.add("bg-red-500");
        } else {
          optionElem.classList.add("dark:bg-gray-700", "bg-gray-200");
        }
      }
      optionsDiv.appendChild(optionElem);
    });
    mcqResultsContainerDiv.appendChild(optionsDiv);
    currentQuestionNum++;
  });
}
