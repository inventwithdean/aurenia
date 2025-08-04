import {
  shouldUseRAG,
  getChatCompletion,
  isQuestionFromVisibleText,
} from "./llm";
import { marked } from "marked";
import { language } from "./study";
import { showCompanionTab } from "./companion_panel";
import { invoke } from "@tauri-apps/api/core";
import { bookName, getPageText, getVisiblePages } from "./pdf_handler";

let chat_messages_div = null;
let chat_send_button = null;
let chat_input = null;
let messages = [];
let conversation_string = "";
let pages_already_in_chat = [];
import { pdf_context } from "./study";
let pulsing_dots_div = null;

window.addEventListener("DOMContentLoaded", () => {
  chat_messages_div = document.getElementById("chat-messages");
  chat_input = document.getElementById("chat-input-text");
  chat_send_button = document.getElementById("chat-send-btn");
  chat_send_button.addEventListener("click", () => {
    const prompt = chat_input.textContent;
    if (prompt) {
      addUserMessageToChat(prompt);
    }
  });
  pulsing_dots_div = document.createElement("div");
  pulsing_dots_div.className = "flex items-center space-x-1.5 p-3";
  const first_dot = document.createElement("div");
  first_dot.className =
    "w-2 h-2 bg-red-400 dark:bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]";
  const second_dot = document.createElement("div");
  second_dot.className =
    "w-2 h-2 bg-red-400 dark:bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]";
  const third_dot = document.createElement("div");
  third_dot.className =
    "w-2 h-2 bg-red-400 dark:bg-gray-400 rounded-full animate-bounce";
  pulsing_dots_div.appendChild(first_dot);
  pulsing_dots_div.appendChild(second_dot);
  pulsing_dots_div.appendChild(third_dot);
});

// New chat routed via Summary or What's this windows.
export function newChat(new_messages) {
  const sysPrompt = `You are Aurenia, a study assistant integrated in a windows app.
The user is currently reading ${bookName}
The user will have conversation with you, and when it seems like the user is asking for some particular part of the PDF, then RAG will be performed and Context will be attached with it.
Only talk in ${language}.
`;
  messages = [{ role: "system", content: sysPrompt }];
  conversation_string = "";
  pages_already_in_chat = [];
  chat_messages_div.innerHTML = "";
  new_messages.forEach((message) => {
    messages.push(message);
    if (message.role == "assistant") {
      const assistant_msg_div = document.createElement("div");
      assistant_msg_div.className =
        "bg-gray-200 dark:bg-gray-700 w-fit max-w-4/5 p-2 rounded-xl self-start shadow-md";
      assistant_msg_div.innerHTML = marked(message.content);
      chat_messages_div.appendChild(assistant_msg_div);
    }
  });
  showCompanionTab("companion-chat-container");
}

async function addUserMessageToChat(msg) {
  const sysPrompt = `You are Aurenia, a study assistant integrated in a windows app.
The user is currently reading ${bookName}
The user will have conversation with you, and when it seems like the user is asking for some particular part of the PDF, then RAG will be performed and Context will be attached with it.
Only talk in ${language}.`;

  // Append system prompt if new chat
  if (messages.length == 0) {
    messages.push({
      role: "system",
      content: sysPrompt,
    });
    conversation_string += `[PDF: ${bookName}]\n`;
  }
  const user_msg_div = document.createElement("div");
  user_msg_div.className =
    "bg-gray-200 dark:bg-gray-700 w-fit max-w-4/5 p-2 rounded-xl self-end shadow-md";
  user_msg_div.innerHTML = marked(msg);
  chat_messages_div.appendChild(user_msg_div);
  // Append loading div

  chat_messages_div.appendChild(pulsing_dots_div);

  chat_messages_div.scrollTop = chat_messages_div.scrollHeight;
  chat_input.textContent = "";
  let user_msg = msg;
  if (pdf_context) {
    let visiblePages = getVisiblePages();
    // console.log("Visible Pages");
    // console.log(visiblePages);
    let visiblePageContext = "";
    let newContextPagesWithText = [];
    for (const page of visiblePages) {
      const pageText = await getPageText(Number(page));
      visiblePageContext += `Page Number: ${page}\n${pageText}\n\n`;
      if (!pages_already_in_chat.includes(page)) {
        // console.log(`Adding ${page} to context!`);
        // Add this page to already in chat.
        newContextPagesWithText.push({ pageNum: page, pageText: pageText });
      }
    }
    // console.log(newContextPagesWithText);

    const question_from_visible_text_choice = await isQuestionFromVisibleText(
      visiblePageContext,
      msg
    );
    // console.log(question_from_visible_text_choice);
    const question_from_visible_text =
      question_from_visible_text_choice["question_from_visible_text"];
    // console.log(question_from_visible_text);
    if (question_from_visible_text == "true") {
      let addedVisibleContext = "";
      newContextPagesWithText.forEach((page) => {
        pages_already_in_chat.push(page.pageNum);
        addedVisibleContext += `Page Number: ${page.pageNum}\n${page.pageText}\n\n`;
      });
      if (addedVisibleContext != "") {
        user_msg = `Context: \n${addedVisibleContext}\n\n${msg}`;
      }
    } else {
      const rag_choice = await shouldUseRAG(
        `${conversation_string}User: ${msg}`
      );
      // console.log(rag_choice);
      const rag = rag_choice["rag"];
      if (rag == "true") {
        const top_choice_result = await invoke("get_top_match", {
          documentName: bookName,
          query: msg,
        });
        // console.log(top_choice_result);
        const page_number = top_choice_result["page_number"];
        const page_text = await getPageText(page_number);
        user_msg = `Context:\n[Text from Page Number: ${page_number}]\n${page_text}\n[Context End]\n${msg}`;
        // Implement full back and forth for DeepStudy
        // TODO: To build full context, pass the conversation history with returned RAG text with page number to a new chat completion to decide which pages to add.
        // TODO: Let a new chat completion give different queries and add in full context.
      }
    }
  }
  // console.log(user_msg);
  messages.push({
    role: "user",
    content: user_msg,
  });
  conversation_string += `User: ${user_msg}`;
  await addAssistantReplyToChat();
}

async function addAssistantReplyToChat() {
  const assistant_msg_div = document.createElement("div");
  assistant_msg_div.className =
    "assistant-chat-bubble bg-gray-200 dark:bg-gray-700 w-fit max-w-4/5 p-2 rounded-xl self-start shadow-md";
  const stream = await getChatCompletion(messages);
  let answer = "";
  let first = true;
  for await (const event of stream) {
    const token = event.choices?.[0]?.delta.content;
    if (token) {
      if (first) {
        pulsing_dots_div.remove();
        chat_messages_div.appendChild(assistant_msg_div);
        first = false;
      }
      answer += token;
      assistant_msg_div.innerHTML = marked(answer);
      chat_messages_div.scrollTop = chat_messages_div.scrollHeight;
    }
  }
  conversation_string += `Assistant: ${answer}\n`;
  messages.push({ role: "assistant", content: answer });
}
