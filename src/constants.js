export const questions_schema = {
  title: "Questions",
  type: "object",
  properties: {
    questions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          question: { type: "string" },
          A: { type: "string" },
          B: { type: "string" },
          C: { type: "string" },
          D: { type: "string" },
          correct_option: { type: "string", enum: ["A", "B", "C", "D"] },
        },
        required: ["question", "A", "B", "C", "D", "correct_option"],
      },
      minItems: 5,
      maxItems: 5,
    },
  },
  required: ["questions"],
};

export const decide_rag_schema = {
  title: "Choice",
  type: "object",
  properties: {
    rag: {
      type: "string",
      enum: ["true", "false"],
    },
    query: {
      type: "string",
    }
  },
  required: ["rag", "query"],
};

export const question_from_visible_text_schema = {
  title: "Choice",
  type: "object",
  properties: {
    question_from_visible_text: {
      type: "string",
      enum: ["true", "false"],
    },
  },
  required: ["question_from_visible_text"],
};
