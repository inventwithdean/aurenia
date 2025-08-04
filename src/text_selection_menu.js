import { getPageText } from "./pdf_handler.js";
import { askLLM } from "./llm.js";
let selectedText = "";
let pageNumber = null;
let ai_menu = null;
let selection_rect = null;
let ai_results_container = null;
import { marked } from "marked";
import { showCompanionTab } from "./companion_panel.js";
import { language } from "./study.js";
import { newChat } from "./chat.js";

// This array keeps track of conversation history to pass to forward this chat to full fledged back and forth interaction via newChat
let ai_results_chat_continuation_messages = [];

// Called when some text is selected in pdf container
export function handleTextSelection() {
  if (!ai_results_container) {
    ai_results_container = document.getElementById("ai-results-container");
  }
  if (!ai_menu) {
    ai_menu = document.getElementById("ai-menu");
  }
  // Setting timeout so that when user clicks somewhere in the selected text, it actually hides the menu
  setTimeout(() => {
    // Get selected text
    const selection = window.getSelection();
    selectedText = selection.toString().trim();
    // Is selected text is not empty
    if (selectedText.length > 0) {
      // Get the selection rect to position the selection menu
      const range = selection.getRangeAt(0);
      selection_rect = range.getBoundingClientRect();
      ai_menu.style.top = `${selection_rect.top + window.scrollY - 110}px`;
      const selection_x_rect_avg =
        (selection_rect.left + selection_rect.right) / 2;
      ai_menu.style.left = `${selection_x_rect_avg + window.scrollX + 20}px`;
      ai_menu.style.visibility = "visible";

      // Handle finding the page number
      const anchorNode = selection.anchorNode;
      if (anchorNode) {
        const selectedElement =
          anchorNode.nodeType === 3 ? anchorNode.parentElement : anchorNode;
        const pageElement = selectedElement.closest("[data-page-number]");
        if (pageElement) {
          pageNumber = Number(pageElement.getAttribute("data-page-number"));
        } else {
          console.warn("Could not find page element for selection!");
        }
      }
    } else {
      // Nothing is selected, hide the menu
      ai_menu.style.visibility = "hidden";
    }
  }, 0);
}

async function handlePrompt(prompt, systemPrompt) {
  // Hide the selection menu
  ai_menu.style.visibility = "hidden";
  // Get the completion stream from LLM
  const stream = await askLLM(prompt, systemPrompt);
  // Empty up the previous text from AI results container.
  ai_results_container.innerHTML = "";

  // Create markdown div that will contain the result text.
  const ai_results_markdown = document.createElement("div");
  ai_results_markdown.className =
    "flex-1 overflow-auto pr-5 scrollbar-thin scrollbar-thumb-gray-400 dark:scrollbar-thumb-gray-600 scrollbar-track-white dark:scrollbar-track-gray-700/20";
  ai_results_container.appendChild(ai_results_markdown);
  // Create continue in chat div which will be used to forward this prompt to Chat Mode via continuation history.
  const continue_in_chat_div = document.createElement("div");
  continue_in_chat_div.className =
    "bg-gray-200 dark:bg-gray-700 mt-4 p-4 mx-auto rounded-xl flex justify-center items-center hover:scale-105 hover:cursor-pointer transition-transform duration-75";
  continue_in_chat_div.textContent = "Continue in Chat!";
  // Hide the continue button until whole output has been written
  continue_in_chat_div.style.visibility = "hidden";
  ai_results_container.appendChild(continue_in_chat_div);
  // Get the output
  let first = true;
  // Holds full response text
  let answer = "";
  for await (const event of stream) {
    const token = event.choices?.[0]?.delta.content;
    if (token) {
      if (first) {
        // Shows ai-results-container if it isn't already visible
        showCompanionTab("ai-results-container");
        first = false;
      }
      answer += token;
      ai_results_markdown.innerHTML = marked(answer);
    }
  }
  // Update the continuation history.
  ai_results_chat_continuation_messages.push({
    role: "assistant",
    content: answer,
  });
  // Show the continue in chat button
  continue_in_chat_div.style.visibility = "visible";
  // Add the event listener to let users continue their prompt in chat mode.
  continue_in_chat_div.addEventListener("click", () => {
    newChat(ai_results_chat_continuation_messages);
  });
}

// Called when what's this button is pressed on the selection menu
export async function handleWhatsThis() {
  const pageText = await getPageText(pageNumber);
  const prompt = `Here is a page from a PDF file: ${pageText}\nWhat does ${selectedText} means here? Reply in ${language} only.`;
  const sysPrompt = `You are a study assistant. Provide explanation only in ${language}`;
  // Set the continuation chat history
  ai_results_chat_continuation_messages = [
    {
      role: "user",
      content: prompt,
    },
  ];
  handlePrompt(prompt, sysPrompt);
}

// Called when define button is pressed on the selection menu
export async function handleDefine() {
  const prompt = `Define "${selectedText}"`;
  const sysPrompt = `You are a dictionary which defines things from any language into ${language} language. Output the definition in ${language} only.`;
  // Set the continuation chat history
  ai_results_chat_continuation_messages = [
    {
      role: "user",
      content: prompt,
    },
  ];
  handlePrompt(prompt, sysPrompt);
}

// Called when translate button is pressed on the selection menu
export async function handleTranslate() {
  const prompt = `Translate into ${language}: ${selectedText}`;
  const sysPrompt = `You are a translator that converts any language to ${language}. Output the translation only.`;
  // Set the continuation chat history
  ai_results_chat_continuation_messages = [
    {
      role: "user",
      content: prompt,
    },
  ];
  handlePrompt(prompt, sysPrompt);
}
