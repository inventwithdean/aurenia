import { OpenAI } from "openai/client.js";
import {
  questions_schema,
  decide_rag_schema,
  question_from_visible_text_schema,
} from "./constants";
import { language } from "./study";

export const client = new OpenAI({
  baseURL: "http://localhost:8080/v1",
  apiKey: "nothing",
  dangerouslyAllowBrowser: true,
});
// const model = "gemma-3n-E2B-it-Q4_K_M.gguf";
export const model = "model.gguf";

// Normal chat completion with messages
export async function getChatCompletion(messages) {
  const stream = await client.chat.completions.create({
    model: model,
    messages: messages,
    stream: true,
  });
  return stream;
}

// Takes in text visible on the screen and current user query, to see if the question is from visible text.
// Whole conversation history isn't provided for efficiency purposes.
export async function isQuestionFromVisibleText(visibleText, userQuery) {
  const userPrompt = `The user is reading a PDF.
Based on the provided text visible on the app screen, determine if the user is asking a question related to the visible text or not.
If the user is asking related to provided visible text, then output {question_from_visible_text: "true"}
Else output {question_from_visible_text: "false"}

Here is the text visible:
-------
${visibleText}
-------
Here is user's query:
${userQuery}
`;
  // console.log("IsQuestionFromVisibleText");
  // console.log(userPrompt);
  const completion = await client.chat.completions.parse({
    model: model,
    messages: [{ role: "user", content: userPrompt }],
    response_format: {
      type: "json_object",
      schema: question_from_visible_text_schema,
    },
  });
  try {
    const jsonString = completion.choices[0].message["content"];
    return JSON.parse(jsonString);
  } catch (err) {
    console.error(err);
    return { error: err };
  }
}

// Takes in full conversation history (string) of on going chat, decides if we need to use retrieval or not.
export async function shouldUseRAG(conversation_history) {
  const userPrompt = `Based on the provided conversation history, determine if the user is asking a new question that requires retrieving content from the document related to some query or if they are asking only a general or a follow-up question.
You need to reply either {rag: "true", query: "natural language RAG query to retrieve the required information"} or {rag: "false", query: "none"}
The RAG query shouldn't mention pdf name.
Here is the conversation history:
${conversation_history}
`;
  // console.log("ShouldUseRag");
  // console.log(userPrompt);
  const completion = await client.chat.completions.parse({
    model: model,
    messages: [{ role: "user", content: userPrompt }],
    response_format: {
      type: "json_object",
      schema: decide_rag_schema,
    },
  });
  try {
    const jsonString = completion.choices[0].message["content"];
    return JSON.parse(jsonString);
  } catch (err) {
    console.error(err);
    return { error: err };
  }
}

// Takes in a prompt and system prompt and returns the completion stream (Used in Text Selection menu)
export async function askLLM(prompt, systemPrompt) {
  const stream = await client.chat.completions.create({
    model: model,
    stream: true,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: prompt,
      },
    ],
  });
  return stream;
}

// Returns the stream of chat completion to summarize the given text.
export async function summarize(text) {
  const stream = await askLLM(
    text,
    `You are a ${language} summarizer. Only output in ${language} the summary of the given content in markdown.`
  );
  return stream;
}

// Generates Quiz using the given text using questions_schema
export async function generateQuiz(text) {
  const userPrompt = `Content: 
  ---
  ${text}
  ---
  Reply in format 
  {
  "questions": [
    {
      "question": "First Question",
      "A": "First Option",
      "B": "Second Option",
      "C": "Third Option",
      "D": "Fourth Option",
      "correct_option": "Correct Option alphabet"
    },
    ...
  ]
}
  `;
  // We generate quiz in English (we don't specify it, but model generates in english most of the time) as its the most widely used language during LLM training, resulting in better completion.
  const completion = await client.chat.completions.parse({
    model: model,
    messages: [
      {
        role: "system",
        content:
          "You are a Quiz Generator. Generate 5 MCQs from given content with options A, B, C and D with only one correct option with no ambiguity.",
      },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_object",
      schema: questions_schema,
    },
  });
  try {
    const jsonString = completion.choices[0].message["content"];
    // Translate Quiz to user language.
    if (language != "English") {
      const translatedString = await translateQuiz(jsonString, language);
      return translatedString;
    }
    return jsonString;
  } catch (err) {
    console.error(err);
    return { error: err };
  }
}

// Translates Quiz using questions_schema to user's language
export async function translateQuiz(rawQuiz, language) {
  const systemPrompt = `You are a English to ${language} translator. Output only the translation.`;
  const completion = await client.chat.completions.parse({
    model: model,
    messages: [
      {
        role: "system",
        content: systemPrompt,
      },
      { role: "user", content: rawQuiz },
    ],
    response_format: {
      type: "json_object",
      schema: questions_schema,
    },
  });
  try {
    const jsonString = completion.choices[0].message["content"];
    return jsonString;
  } catch (err) {
    console.error(err);
    return { error: err };
  }
}
