import Application from "../models/Application.js";
import User from "../models/User.js";
import Job from "../models/job.js";
import { Mistral } from "@mistralai/mistralai";

// Mistral client
const client = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

// ─── SINGLE SCORING PROMPT (used by EVERY scoring function) ───
// This is the ONLY place scores come from. Every function calls
// buildScoringPrompt() so they all produce identical scores.

const buildScoringPrompt = (resumeText, jobDescription) => `
Evaluate this resume against the job description.

RESUME:
${resumeText.slice(0, 1500)}

JOB DESCRIPTION:
${jobDescription}

  STEP 1 — Extract required skills and top 5 keywords from JOB DESCRIPTION:
  - List every skill, technology, or qualification explicitly mentioned as required.
  - Identify the top 5 keywords that best summarize the role (e.g., “React”, “AWS”, “CI/CD”, “Leadership”, “Agile”).
  - Label each skill as CRITICAL (must‑have) or PREFERRED (nice‑to‑have).

STEP 2 — Check resume evidence for EACH skill:
- For each required skill, answer: does the resume mention it? (YES with evidence / NO)
- Evidence = specific project, work experience, certification, or measurable outcome
- Do NOT assume skills. Only count what is explicitly written

STEP 3 — Calculate score using this formula:
- Count total CRITICAL skills from job description = T
- Count CRITICAL skills with YES evidence in resume = M
- Base score = (M / T) * 80
- Add up to +10 if PREFERRED skills also match
- Add up to +10 if resume shows measurable impact (numbers, metrics, scale)
- Final score = Base + Preferred bonus + Impact bonus (cap at 100)

HARD RULES:
- Score CANNOT exceed 85 unless EVERY critical skill has evidence
- Score CANNOT exceed 70 if ANY critical skill has ZERO evidence
- Score MUST be below 50 if more than half of critical skills are missing
- Score MUST be below 30 if resume has almost no overlap with job requirements
- Same resume + same job = same score. No randomness

STEP 4 — Generate output:

Return ONLY this JSON. No markdown fences. No explanation outside JSON:
{
  "matchScore": <integer 0-100>,
  "missingSkills": ["only skills with ZERO evidence in resume"],
  "strengths": ["skill WITH evidence summary, max 8 words each"],
  "weaknesses": ["single biggest gap that matters most"],
  "reason": "2-3 sentences explaining why the score was given, referencing key keywords, strongest matches, gaps, and a brief recommendation to apply now if the score is high.",
  "summary": "3 sentences: verdict, strongest qualification, one action to improve"
}
`;

// Helper: call Mistral with temperature=0 and top_p=1 for deterministic output
const callMistral = async (prompt) => {
  const response = await client.chat.complete({
    model: "mistral-small-latest",
    temperature: 0,
    topP: 1,
    messages: [{ role: "user", content: prompt }],
  });
  return response.choices[0].message.content;
};

// Helper: parse JSON from Mistral response (robust)
const parseJSON = (text, fallback) => {
  const clean = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    const match = clean.match(/[\[{][\s\S]*[\]}]/);
    if (match) {
      try { return JSON.parse(match[0]); } catch { /* fall through */ }
    }
    return fallback;
  }
};

// Helper: clamp and validate score
const clampScore = (score) => {
  let s = Number(score);
  if (s <= 1 && s > 0) s = Math.round(s * 100);
  if (isNaN(s)) s = 50;
  return Math.max(0, Math.min(100, Math.round(s)));
};

// Shared fallback for scoring results
const SCORE_FALLBACK = {
  matchScore: 50,
  missingSkills: [],
  strengths: [],
  weaknesses: ["Could not parse AI response"],
  reason: "Analysis could not be completed",
  summary: "Analysis could not be completed. Please try again.",
};

// ─── 1. MATCH RESUME (Recruiter: match applicant to job) ──────

export const matchResume = async (req, res) => {
  try {
    const { applicationId } = req.body;

    if (!applicationId) {
      return res.status(400).json({ msg: "Missing applicationId" });
    }

    const app = await Application.findById(applicationId).populate("jobId");

    if (!app) {
      return res.status(404).json({ msg: "Application not found" });
    }

    const user = await User.findById(app.userId);

    if (!user?.resumeText) {
      return res.status(400).json({ msg: "Upload resume first" });
    }

    const prompt = buildScoringPrompt(user.resumeText, app.jobId.description);
    const text = await callMistral(prompt);
    const parsed = parseJSON(text, SCORE_FALLBACK);

    parsed.matchScore = clampScore(parsed.matchScore);

    app.aiAnalysis = {
      matchScore: parsed.matchScore,
      missingSkills: parsed.missingSkills || [],
      summary: parsed.summary || "",
      strengths: parsed.strengths || [],
      weaknesses: parsed.weaknesses || [],
      analyzedAt: new Date(),
    };

    await app.save();
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};


// ─── 2. RECOMMEND JOBS (Seeker: AI Hunter suggestions) ────────
// Scores each job INDIVIDUALLY using the SAME prompt as evaluate/match.
// This guarantees: Hunter score === Analyze score for the same job.

export const recommendJobs = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user?.resumeText) {
      return res.status(400).json({ msg: "Upload resume first" });
    }

    // Return cached results if available
    if (user.recommendations?.length) {
      return res.json(user.recommendations);
    }

    const jobs = await Job.find();

    // Pre-filter: rough keyword overlap to pick top 5 candidates
    const roughScore = (resume, jd) => {
      const r = resume.toLowerCase();
      const j = jd.toLowerCase();
      const keywords = [
        "react", "node", "javascript", "mongodb", "express",
        "python", "java", "typescript", "aws", "docker",
        "sql", "css", "html", "api", "git", "angular",
        "vue", "spring", "django", "flask", "kubernetes",
        "c++", "c#", "php", "ruby", "golang", "rust",
      ];
      return keywords.reduce(
        (score, k) => score + (r.includes(k) && j.includes(k) ? 1 : 0),
        0
      );
    };

    const topJobs = jobs
      .map(j => ({ job: j, score: roughScore(user.resumeText, j.description) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(x => x.job);

    // Score EACH job individually using the EXACT same prompt
    const results = [];

    for (const job of topJobs) {
      try {
        const prompt = buildScoringPrompt(user.resumeText, job.description);
        const text = await callMistral(prompt);
        const parsed = parseJSON(text, SCORE_FALLBACK);

        results.push({
          jobId: job._id,
          title: job.title,
          location: job.location,
          matchScore: clampScore(parsed.matchScore),
          reason: parsed.reason || parsed.summary?.split(".")[0] || "AI-analyzed match",
        });
      } catch {
        // If one job fails, still continue with others
        results.push({
          jobId: job._id,
          title: job.title,
          location: job.location,
          matchScore: 50,
          reason: "Could not analyze this job",
        });
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.matchScore - a.matchScore);

    // Cache results
    await User.findByIdAndUpdate(req.user.id, {
      recommendations: results,
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// ─── 3. RESUME REVIEW (Seeker: get resume feedback) ───────────

export const reviewResume = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user?.resumeText) {
      return res.status(400).json({ msg: "Upload resume first" });
    }

    const prompt = `Analyze this resume and provide actionable feedback.

RESUME:
${user.resumeText.slice(0, 1500)}

TASKS:
1. Score overall quality (0-100):
   - 85-100: Quantified results, clear impact, strong action verbs
   - 70-84: Good foundation, needs minor polish
   - 50-69: Acceptable but needs significant improvement
   - 0-49: Major overhaul required

2. List 2-3 specific strengths (with evidence from resume)

3. Find 2-3 weak bullet points. For each provide:
   - original: exact text copied from resume
   - improved: rewritten with quantification and action verbs
   - why: one sentence explaining the improvement

4. List 3-5 improvement suggestions as issue/fix pairs

5. List 5-10 high-impact missing keywords (Git, CI/CD, Docker, REST API, Agile, etc.)

OUTPUT FORMAT (return ONLY this JSON, no markdown fences):
{
  "overallScore": <integer 0-100>,
  "summary": "2-3 sentence assessment",
  "strengths": ["specific strength 1", "specific strength 2"],
  "weakBullets": [
    {
      "original": "exact text from resume",
      "improved": "quantified improved version",
      "why": "one sentence explanation"
    }
  ],
  "improvements": [
    {
      "issue": "what is missing",
      "fix": "exactly what to add"
    }
  ],
  "missingKeywords": ["keyword1", "keyword2"]
}`;

    const text = await callMistral(prompt);
    const parsed = parseJSON(text, {
      overallScore: 50,
      summary: "Could not parse resume. Please ensure it is in plain text format.",
      strengths: [],
      weakBullets: [],
      improvements: [],
      missingKeywords: [],
    });

    res.json(parsed);
  } catch (err) {
    console.error("Review error:", err);
    res.status(500).json({ msg: err.message });
  }
};

// ─── 4. EVALUATE (Seeker: evaluate self against specific job) ─
// Uses the EXACT same buildScoringPrompt as matchResume and recommendJobs

export const evaluate = async (req, res) => {
  try {
    const { jobId } = req.body;
    const user = await User.findById(req.user.id);
    const jobDetails = await Job.findById(jobId);

    if (!user?.resumeText) {
      return res.status(400).json({ msg: "Upload resume first" });
    }

    const prompt = buildScoringPrompt(user.resumeText, jobDetails.description);
    const text = await callMistral(prompt);
    const parsed = parseJSON(text, SCORE_FALLBACK);

    parsed.matchScore = clampScore(parsed.matchScore);

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// ─── 5. IMPROVE BULLET POINT ─────────────────────────────────

export const improveBulletPoint = async (req, res) => {
  try {
    const { bullet } = req.body;
    if (!bullet) {
      return res.status(400).json({ msg: "Please provide a bullet point to improve." });
    }

    const prompt = `Improve this resume bullet point.

ORIGINAL: "${bullet}"

RULES:
- Start with strong action verb (Built, Developed, Optimized, Implemented)
- Add quantification (numbers, metrics, percentages)
- Mention specific technologies used
- Show measurable impact or outcome
- Keep under 25 words

OUTPUT FORMAT (return ONLY this JSON, no markdown fences):
{
  "improved": "the improved bullet point",
  "explanation": "one sentence explaining why this is better"
}`;

    const text = await callMistral(prompt);
    const parsed = parseJSON(text, {
      improved: bullet,
      explanation: "Could not process. Please try again.",
    });

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

// ─── 6. ANALYZE APPLICANT (Recruiter: analyze specific applicant) ─
// Uses the EXACT same buildScoringPrompt as matchResume and evaluate

export const analyzeApplicant = async (req, res) => {
  try {
    const { applicationId } = req.body;
    if (!applicationId) {
      return res.status(404).json({ msg: "Applicant not found" });
    }

    const app = await Application.findById(applicationId)
      .populate("jobId")
      .populate("userId");

    if (!app) return res.status(404).json({ msg: "No applicant found" });

    if (!app.userId?.resumeText) {
      return res.status(400).json({ msg: "Applicant has no Resume" });
    }

    const prompt = buildScoringPrompt(app.userId.resumeText, app.jobId.description);
    const text = await callMistral(prompt);
    const parsed = parseJSON(text, SCORE_FALLBACK);

    parsed.matchScore = clampScore(parsed.matchScore);

    app.aiAnalysis = {
      matchScore: parsed.matchScore,
      missingSkills: parsed.missingSkills || [],
      strengths: parsed.strengths || [],
      summary: parsed.summary || "",
      weaknesses: parsed.weaknesses || [],
      analyzedAt: new Date(),
    };
    await app.save();
    res.json(app.aiAnalysis);

  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

const getTag = (score) => {
  if (score >= 80) return "Strong Fit";
  if (score >= 60) return "Moderate Fit";
  return "Low Fit";
};
export const getTopCandidates = async(req , res)=>{
  try{
    const {jobId} = req.params;

    const applications = await Application.find({jobId})
    .populate("jobId")
    .populate("userId");

    if(!applications.length){
      return res.json([]);
    }
    const results = [];
    for(const app of applications){
      try{if(app.aiAnalysis?.matchScore){
        results.push({
          applicationId: app._id,
          name: app.userId.name,
          matchScore: app.aiAnalysis.matchScore,
          summary: app.aiAnalysis.summary,
          strengths: app.aiAnalysis.strengths,
          missingSkills: app.aiAnalysis.missingSkills,
          weaknesses: app.aiAnalysis.weaknesses,
          tag : getTag(app.aiAnalysis.matchScore)
        });
        continue;
      }
      const prompt = buildScoringPrompt(app.userId.resumeText , app.jobId.description);
      const text = await callMistral(prompt);
      
      const parsed = parseJSON(text , SCORE_FALLBACK);
      const score = clampScore(parsed.matchScore);
      app.aiAnalysis ={
        matchScore: score,
        missingSkills: parsed.missingSkills,
        strengths : parsed.strengths,
        weaknesses : parsed.weaknesses,
        analyzedAt : new Date(),
      };

      await app.save();
      results.push({
        applicationId : app._id,
        name: app.userId.name,
        matchScore:  score,
        summary : parsed.summary,
        strengths : parsed.strengths,
        missingSkills: parsed.missingSkills,
        weaknesses: parsed.weaknesses,
        tag : getTag(score),
      });

      } catch{
        results.push({
          applicationId: app._id,
          name: app.userId?.name || "Candidate",
          matchScore: 50,
          tag : "Moderate fit"});
      }
    }
    results.sort((a,b) => b.matchScore-a.matchScore);
    res.json(results);


  }catch(err){
    console.log(err);
    res.status(500).json({msg : err.message});
  }
}


export const extractJobInfo = async (req , res) =>{
 
  try{
     const {rawText} = req.body;
     if(!rawText){
      return res.status(400).json({msg: "please provide job description text"});
     }

     const response = await client.chat.complete
  ({
      model: "mistral-small-latest",
      messages: [
        {
      role: "user",
      content: `<s>[INST] You are a job posting data extractor. Parse the raw job description and return structured JSON.

<raw_job_posting>
${rawText}
</raw_job_posting>

# Extraction Rules

1. **Title**: Extract exact job title. If not found: ""
2. **Company**: Extract company name. If not found: ""
3. **Location**: Extract location or set to "Remote" if mentioned. If not found: ""
4. **Salary**: Extract salary range. If not found: "Not Disclosed"
5. **Description**: 
   - Clean and reformat the job description professionally
   - Remove: recruiter contact info, email addresses, phone numbers, application links
   - Remove: HTML tags, excessive line breaks, special characters
   - Keep: job responsibilities, requirements, benefits
   - Max length: 500 characters (not words)
   - If original is longer, summarize key points

# Output Format

Return ONLY the JSON object below. No markdown, no explanation, no preamble:

{
  "title": "",
  "company": "",
  "location": "",
  "salary": "",
  "description": ""
}

# Example

Input:
"Senior React Developer - TechCorp Inc.
Location: San Francisco, CA (Remote OK)
Salary: $120k-$160k
We're looking for... [rest of description]
Contact: recruiter@techcorp.com"

Output:
{
  "title": "Senior React Developer",
  "company": "TechCorp Inc.",
  "location": "San Francisco, CA (Remote OK)",
  "salary": "$120k-$160k",
  "description": "TechCorp is seeking a Senior React Developer to build scalable web applications. Requirements: 5+ years React experience, strong TypeScript skills, experience with Redux. Benefits: Health insurance, 401k matching, flexible work schedule."
}

Now extract from the raw job posting above. [/INST]`
    }]})

    const text = response.choices[0].message.content;
    const clean =text.replace(/```json|```/g, "").trim();

    let parsed;
    try{
      parsed = JSON.parse(clean);
    }catch{
      parsed ={
        title: "", company:"", location:"", salary:"Not Disclosed", description: rawText
      };
    }
    res.json(parsed);
    }
    catch(err){
      console.log(err);
      res.status(500).json({msg : err.message});
    }
  
}