import { summarize, generateQuiz } from "./llm.js";
import { initializeMCQ } from "./mcq_panel.js";
import { getPageText } from "./pdf_handler.js";
import { marked } from "marked";
import { showCompanionTab } from "./companion_panel.js";
import { language } from "./study.js";
import { newChat } from "./chat.js";

let page_context_menu = null;
let currentPageNum = null;
let summary_chat_continuation_messages = [];

export function setPageNumber(pageNum) {
  currentPageNum = pageNum;
}

export async function handleGenerateQuiz(ocr_mode) {
  if (!page_context_menu)
    page_context_menu = document.getElementById("page-context-menu");
  page_context_menu.style.visibility = "hidden";
  const pageText = await getPageText(currentPageNum);
  const rawQuiz = await generateQuiz(pageText);
  const quiz = JSON.parse(rawQuiz);

  const questions = quiz["questions"];
  initializeMCQ(questions);
}

export async function handleSummarize(ocr_mode) {
  if (!page_context_menu)
    page_context_menu = document.getElementById("page-context-menu");

  const summaryContainerWrapper = document.getElementById("summary-container");
  summaryContainerWrapper.innerHTML = "";

  const summaryContainer = document.createElement("div");
  summaryContainer.id = "summary-container-markup";
  summaryContainer.className =
    "flex-1 overflow-auto pr-5 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-white dark:scrollbar-track-gray-700/20";
  summaryContainerWrapper.appendChild(summaryContainer);

  const continue_in_chat_div = document.createElement("div");
  continue_in_chat_div.className =
    "bg-gray-200 dark:bg-gray-700 mt-4 p-4 mx-auto rounded-xl flex justify-center items-center hover:scale-105 hover:cursor-pointer transition-transform duration-75";
  continue_in_chat_div.textContent = "Continue in Chat!";
  continue_in_chat_div.style.visibility = "hidden";
  summaryContainerWrapper.appendChild(continue_in_chat_div);

  page_context_menu.style.visibility = "hidden";
  const pageText = await getPageText(currentPageNum);

  const stream = await summarize(pageText);
  let answer = "";
  let first = true;
  for await (const event of stream) {
    const token = event.choices?.[0]?.delta.content;
    if (token) {
      if (first) {
        showCompanionTab("summary-container");
        summaryContainer.innerHTML = "";
        first = false;
      }
      answer += token;
      summaryContainer.innerHTML = marked(answer);
    }
  }
  summary_chat_continuation_messages = [
    {
      role: "system",
      content: `You are a study assistant! Talk only in ${language} language`,
    },
    {
      role: "user",
      content: `Summarize this extracted page from a PDF in beautiful markdown: ${pageText}`,
    },
    {
      role: "assistant",
      content: answer,
    },
  ];
  continue_in_chat_div.style.visibility = "visible";
  continue_in_chat_div.addEventListener("click", () => {
    newChat(summary_chat_continuation_messages);
  });
}
