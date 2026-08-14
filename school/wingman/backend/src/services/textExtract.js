import pdfParse from "pdf-parse/lib/pdf-parse.js";
import mammoth from "mammoth";

// Pulls plain text out of an uploaded syllabus file, regardless of format.
export async function extractText(buffer, mimetype, originalname) {
  const lower = (originalname || "").toLowerCase();

  if (mimetype === "application/pdf" || lower.endsWith(".pdf")) {
    const parsed = await pdfParse(buffer);
    return parsed.text;
  }

  if (
    mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lower.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  // Fall back to treating it as plain text (.txt, pasted text, etc).
  return buffer.toString("utf-8");
}
