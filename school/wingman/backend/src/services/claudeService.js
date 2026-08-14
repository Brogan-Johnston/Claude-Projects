import Anthropic from "@anthropic-ai/sdk";
import db from "../db/index.js";

function getApiKey() {
  const stored = db.prepare("SELECT value FROM settings WHERE key = 'anthropic_api_key'").get();
  return stored?.value || process.env.ANTHROPIC_API_KEY || null;
}

const extractionTool = {
  name: "record_syllabus_items",
  description:
    "Record the graded items (exams, quizzes, projects, homework, readings) found in a course syllabus.",
  input_schema: {
    type: "object",
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Short name, e.g. 'Midterm 2' or 'HW 4: Beam Bending'" },
            type: {
              type: "string",
              enum: ["exam", "quiz", "project", "homework", "reading", "assignment"],
            },
            due_date: {
              type: "string",
              description: "ISO date YYYY-MM-DD. Best guess if only a week or 'week 8' is given, based on the term dates in the text.",
            },
            due_time: {
              type: "string",
              description: "24hr HH:MM if a specific time is stated, otherwise omit.",
            },
            weight_pct: {
              type: "number",
              description: "Percent of final grade this item is worth, if stated. Omit if unknown.",
            },
            confidence: {
              type: "string",
              enum: ["high", "medium", "low"],
              description: "How confident the date/weight extraction is, so the student knows what to double check.",
            },
          },
          required: ["title", "type", "due_date", "confidence"],
        },
      },
    },
    required: ["items"],
  },
};

// Sends raw syllabus text to Claude and gets back a structured list of graded items.
// Throws if no API key has been configured yet (caller should surface a friendly message).
export async function extractSyllabusItems(rawText) {
  const apiKey = getApiKey();
  if (!apiKey) {
    const err = new Error(
      "No Anthropic API key configured. Add one in Settings to enable syllabus import."
    );
    err.status = 400;
    throw err;
  }

  const client = new Anthropic({ apiKey });
  const today = new Date().toISOString().slice(0, 10);

  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system:
      `You are helping an aerospace engineering student at the University of Tennessee Knoxville import their ` +
      `course syllabus into a planner. Today's date is ${today}. Read the syllabus text and extract every graded ` +
      `item: exams, quizzes, projects, homework sets, and major readings with firm due dates. Infer real calendar ` +
      `dates from context (e.g. a stated first day of class + "Week 6" or a weekday + date range). If a date truly ` +
      `cannot be determined, make your best estimate and mark confidence "low" rather than skipping the item.`,
    tools: [extractionTool],
    tool_choice: { type: "tool", name: "record_syllabus_items" },
    messages: [
      {
        role: "user",
        content: `Here is the syllabus text:\n\n${rawText.slice(0, 100000)}`,
      },
    ],
  });

  const toolUse = message.content.find((block) => block.type === "tool_use");
  if (!toolUse) return [];
  return toolUse.input.items || [];
}
