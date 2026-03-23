const express = require("express");
const multer = require("multer");
const mammoth = require("mammoth");
const axios = require("axios");
const pdf = require("pdf-parse-fork");

const app = express();
const upload = multer();

app.use(express.json());
app.use(express.static("public"));

// ------------------------------
// Local LLM (Ollama) function
// ------------------------------
async function analyzeWithLocalModel(prompt) {
  const response = await axios.post(
    "http://localhost:11434/api/generate",
    {
      model: "llama3",
      prompt: prompt,
      stream: false
    }
  );

  return response.data.response;
}

// ------------------------------
// Analyze Route
// ------------------------------
app.post("/analyze", upload.single("resume"), async (req, res) => {
  try {
    const file = req.file;
    const jobDescription = req.body.jobDescription;

    if (!file) {
      return res.status(400).json({ error: "No resume uploaded" });
    }

    const mime = file.mimetype;
    const fileBuffer = file.buffer;

    let resumeText = "";

    // ------------------------------
    // PDF Parsing
    // ------------------------------
    if (mime === "application/pdf") {
      const pdfData = await pdf(fileBuffer);
      resumeText = pdfData.text;
    }

    // ------------------------------
    // DOCX Parsing
    // ------------------------------
    else if (
      mime ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ buffer: fileBuffer });
      resumeText = result.value;
    }

    // Unsupported file
    else {
      return res.status(400).json({ error: "Unsupported file type" });
    }

    // ------------------------------
    // Build Prompt for Local LLM
    // ------------------------------
    const prompt = `
You are a resume analysis assistant.

Your job is to evaluate how well a resume matches a job description.

Respond ONLY with valid JSON.
Do NOT include explanations, introductions, or extra text.
Do NOT include markdown, bolding, or formatting of any kind.

Your analysis must consider the following factors:

1. **Skill Matching**
   - Extract all technical and soft skills from the resume.
   - Extract all required skills from the job description.
   - Compare them and determine which skills match and which are missing.

2. **Experience Timeline**
   - Identify each job in the resume and extract:
     - job title
     - start date
     - end date
     - total years in each role
   - Sum relevant years of experience.
   - Compare this to the job description’s required years.
   - If the candidate has LESS experience than required, reduce the match score significantly.
   - If the candidate has MORE experience than required, increase the match score.

3. **Relevance of Experience**
   - Determine whether past roles match the job’s responsibilities.
   - Prioritize recent experience more heavily than older experience.

4. **Education Fit**
   - Compare degrees, certifications, and training to job requirements.
   - Penalize missing required degrees or certifications.

5. **Overall Match Score**
   - Score from 0 to 100.
   - Base the score on:
     - skill match
     - experience match
     - relevance of past roles
     - education alignment
   - The score must be realistic and not overly generous.

   Rules:
- "summary" must be a meaningful paragraph (at least 2 full sentences).
- "match_score" must be an integer from 0 to 100.
- "strengths", "weaknesses", and "recommendations" must each contain at least 2 items when possible.

Return ONLY valid JSON with this exact structure:

{
  "summary": "",
  "match_score": 0,
  "strengths": [],
  "weaknesses": [],
  "recommendations": []
}

Resume:
${resumeText}

Job Description:
${jobDescription}
`;


    // ------------------------------
    // Call Local Llama 3
    // ------------------------------
    const aiText = await analyzeWithLocalModel(prompt);

    let analysis;

    try {
      const parsed = JSON.parse(aiText);
      analysis = normalizeAnalysis(parsed);
    } catch (err) {
      analysis = normalizeAnalysis({
        summary: "",
        match_score: 0,
        strengths: [],
        weaknesses: [],
        recommendations: [`Unable to parse model output. Raw: ${aiText.slice(0, 500)}`]
      });
    }

    res.json(analysis);
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Server error", details: err.message });
  }
});

// ------------------------------
// Start Server
// ------------------------------
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});

function normalizeAnalysis(raw) {
  const analysis = raw || {};

  // Ensure types and defaults
  const summary = typeof analysis.summary === "string" && analysis.summary.trim()
    ? analysis.summary.trim()
    : "No clear summary could be generated from the provided resume and job description.";

  let match_score = parseInt(analysis.match_score, 10);
  if (Number.isNaN(match_score)) match_score = 0;
  match_score = Math.min(100, Math.max(0, match_score));

  const strengths = Array.isArray(analysis.strengths) ? analysis.strengths : [];
  const weaknesses = Array.isArray(analysis.weaknesses) ? analysis.weaknesses : [];
  const recommendations = Array.isArray(analysis.recommendations) ? analysis.recommendations : [];

  return {
    summary,
    match_score,
    strengths: strengths.map(String),
    weaknesses: weaknesses.map(String),
    recommendations: recommendations.map(String)
  };
}

