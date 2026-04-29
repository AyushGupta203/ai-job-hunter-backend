import Application from "../models/Application.js";
import User from "../models/User.js";
import Job from "../models/job.js";
import { Mistral } from "@mistralai/mistralai";



// Mistral client
const client = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

//resume match

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

    const response = await client.chat.complete({
      model: "mistral-small-latest",
      messages: [
        {
          role: "user",
          content: `<s>[INST] You are a senior technical recruiter with 10+ years of experience evaluating software engineering candidates. You assess real work evidence, not keyword matching.

<resume>
${user.resumeText.slice(0, 1200)}
</resume>

<job_description>
${app.jobId.description}
</job_description>

# Task
Evaluate this candidate's fit for this role using the framework below.

# Step 1: Analyze Match Quality
Consider:
- Does the resume show EVIDENCE of using required skills (e.g., "built React app with 10k users" vs "knows React")?
- Are there measurable outcomes or specific projects?
- Does their career progression make sense for this role?

Use this scoring scale:
- Excellent Match (85-100): Meets all core requirements with clear evidence. Ready to interview immediately.
- Strong Match (70-84): Meets most requirements. Minor gaps closable in 30-60 days with training.
- Moderate Match (50-69): Has foundational skills but missing 1-2 critical requirements. Would need significant ramp-up.
- Weak Match (0-49): Lacks multiple core requirements. Not viable without major skill development.

# Step 2: Identify Gaps
List ONLY skills that are:
1. Explicitly required in the job description
2. Have ZERO evidence in the resume (not mentioned at all, not in projects, not in experience)

Do NOT list nice-to-haves or skills that are mentioned but not heavily demonstrated.

# Step 3: Identify Strengths
List strengths WITH EVIDENCE. Examples:
✅ "Has 3 years of React experience with 2 production deployments mentioned"
❌ "Good at React"

# Step 4: Identify the Single Biggest Weakness
What is the ONE thing that would make a hiring manager hesitate most? Be direct and specific.

# Step 5: Write Summary
Write exactly 3 sentences:
- Sentence 1: Overall verdict (e.g., "Strong fit" or "Not a good match right now")
- Sentence 2: The single strongest reason to interview this candidate
- Sentence 3: The one specific action they should take to strengthen their application

# Output Format
Return ONLY this JSON structure, no markdown fences, no extra text:

{
  "matchScore": <number 0-100>,
  "missingSkills": ["skill1", "skill2"],
  "strengths": ["evidence-based strength 1", "evidence-based strength 2"],
  "weaknesses": ["one specific gap"],
  "summary": "3 sentence evaluation"
}

# Example (for reference only, do not copy this data):

Resume: "Software Engineer with 2 years Python experience. Built REST APIs using Flask. Deployed on AWS EC2."
Job: "Looking for Python developer with Flask, AWS, and Docker experience."

Correct output:
{
  "matchScore": 72,
  "missingSkills": ["Docker"],
  "strengths": ["2 years hands-on Python/Flask with production REST API experience", "Has AWS deployment experience with EC2"],
  "weaknesses": ["No container orchestration experience - would need Docker training before shipping production containers"],
  "summary": "Strong match for core Python/Flask requirements. Their AWS experience and production API work shows they can handle backend systems. Should complete a Docker fundamentals course and add one containerized project to their portfolio."
}

Now evaluate the actual resume and job description provided above. [/INST]`,
        },
      ],
    });

    const text = response.choices[0].message.content;
    const clean = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      parsed = { 
        matchScore: 50, 
        missingSkills: [],
        strengths: [],
        weaknesses: ["JSON parsing failed - resume format may be incompatible"],
        summary: "Unable to process this resume format. Please upload a clearer text-based resume."
      };
    }

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
}


//  JOB RECOMMENDATION

export const recommendJobs = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user?.resumeText) {
      return res.status(400).json({ msg: "Upload resume first" });
    }

    // caching
    if (user.recommendations?.length) {
      return res.json(user.recommendations);
    }

    const jobs = await Job.find();

    // 🔹 Step 1: Pre-filter
    const roughScore = (resume, jd) => {
      const r = resume.toLowerCase();
      const j = jd.toLowerCase();
      const keywords = ["react", "node", "javascript", "mongodb", "express"];
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

 
    const jobList = topJobs
      .map(
        (j, i) => `
INDEX: ${i}
TITLE: ${j.title}
DESCRIPTION: ${j.description.slice(0, 300)}
`
      )
      .join("\n---\n");

    const response = await client.chat.complete({
      model: "mistral-small-latest",
      messages: [
        {
          role: "user",
          content: `
You are an ATS scoring system. Score each job based on how well the resume matches.

RULES:
- Each job MUST get a DIFFERENT score
- Use full range (40–95)
- Penalize missing skills, reward exact matches
- Return ONLY a raw JSON array, no markdown, no explanation

RESUME:
${user.resumeText.slice(0, 1200)}

JOBS:
${jobList}

Return this EXACT format (use the INDEX values from above):
[
  { "index": 0, "matchScore": 85 },
  { "index": 1, "matchScore": 72 }
]
`,
        },
      ],
    });

    const text = response.choices[0].message.content;
  
    const clean = text.replace(/```json|```/g, "").trim();

    let parsed = [];
    try {
      const jsonMatch = clean.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
    
    }

    if (!parsed.length) {
      
      return res.json(
        topJobs.map(j => ({
          jobId: j._id,
          title: j.title,
          location: j.location,
          matchScore: 50,
        }))
      );
    }

  
    const results = parsed
      .map(p => {
        const job = topJobs[p.index];
        if (!job) return null;

        let score = Number(p.matchScore);
        if (score <= 1) score = Math.round(score * 100);
        if (isNaN(score)) score = 50;
        score = Math.max(0, Math.min(100, Math.round(score)));

        return {
          jobId: job._id,
          title: job.title,
          location: job.location,
          matchScore: score,
        };
      })
      .filter(Boolean);

    //  sort by score descending
    results.sort((a, b) => b.matchScore - a.matchScore);

    //  cache results
    await User.findByIdAndUpdate(req.user.id, {
      recommendations: results,
    });

    res.json(results);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

export const reviewResume = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user?.resumeText) {
      return res.status(400).json({ msg: "Upload resume first" });
    }

    const response = await client.chat.complete({
      model: "mistral-small-latest",
      messages: [
        {
          role: "user",
          content: `<s>[INST] You are a senior technical recruiter who reviews 50+ resumes daily. Analyze this resume and provide honest, actionable feedback.

<resume>
${user.resumeText.slice(0, 1500)}
</resume>

# Analysis Framework

## Step 1: Extract Current Bullet Points
Find 2-3 weak bullet points from the resume that lack quantification or impact.

## Step 2: Calculate Overall Score
Scale:
- 85-100: Immediately stands out (quantified results, clear impact, good formatting)
- 70-84: Strong foundation, needs minor polish
- 50-69: Acceptable but significant improvements needed
- 0-49: Requires major overhaul

## Step 3: Identify Specific Improvements
For each weak bullet point found, provide:
- Original text (what they wrote)
- Improved version (with quantification)
- Why the change matters

## Step 4: Technical Keyword Gap Analysis
List 5-10 high-impact keywords missing from resume (Git, CI/CD, Docker, REST API, Agile, etc.)

# Output Format
{
  "overallScore": <number 0-100>,
  "summary": "2-3 sentence honest assessment",
  "strengths": ["specific strength 1", "specific strength 2"],
  "weakBullets": [
    {
      "original": "Worked on React projects",
      "improved": "Built 3 production React applications deployed on AWS serving 200+ daily users",
      "why": "Original lacks quantification - improved version shows scope (3 apps), technology (AWS), and impact (200+ users)"
    }
  ],
  "improvements": [
    {
      "issue": "what's missing",
      "fix": "exactly what to add"
    }
  ],
  "missingKeywords": ["keyword1", "keyword2"]
}

Return ONLY JSON, no markdown. [/INST]`,
        },
      ],
    });

    const text = response.choices[0].message.content;
    const clean = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      parsed = {
        overallScore: 50,
        summary: "Could not parse resume - please ensure it's in plain text format",
        strengths: [],
        weakBullets: [],
        improvements: [],
        missingKeywords: []
      };
    }

    res.json(parsed);
  } catch (err) {
    console.error("Review error:", err);
    res.status(500).json({ msg: err.message });
  }
};

export const evaluate = async (req, res) => {
  try {
    const { jobId } = req.body;
    const user = await User.findById(req.user.id);
    const jobDetails = await Job.findById(jobId);

    if (!user?.resumeText) {
      return res.status(400).json({ msg: "Upload resume first" });
    }

    const response = await client.chat.complete({
      model: "mistral-small-latest",
      messages: [
        {
          role: "user",
          content: `
You are a senior technical recruiter. Evaluate the following resume against the job description.

RESUME:
${user.resumeText.slice(0, 1200)}

JOB DESCRIPTION:
${jobDetails.description}

EVALUATION FRAMEWORK:
matchScore — Score 0 to 100 based on fit.
missingSkills — Skills explicitly required in JD that have ZERO mention in resume.
strengths — Specific evidence-based strengths.
weaknesses — One clear, honest gap.
summary — 3 sentence honest evaluation.

Return ONLY valid JSON:
{
  "matchScore": number,
  "missingSkills": ["skill"],
  "strengths": ["strength"],
  "weaknesses": ["gap"],
  "summary": "3 sentences"
}
`,
        },
      ],
    });

    const text = response.choices[0].message.content;
    const clean = text.replace(/```json|```/g, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      parsed = { matchScore: 50, summary: "Parsing failed" };
    }

    res.json(parsed);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

export const improveBulletPoint = async (req, res) => {
  try {
    const { bullet } = req.body;
    if (!bullet) {
      return res.status(400).json({ msg: "Please provide a bullet point to improve." });
    }

    const response = await client.chat.complete({
      model: "mistral-small-latest",
      messages: [
        {
          role: "user",
          content: `You are an expert technical resume writer. Improve the following resume bullet point to make it more impactful, quantified, and action-oriented.
          
Original Bullet: "${bullet}"

Return ONLY valid JSON in the following format, with no markdown:
{
  "improved": "The newly improved bullet point",
  "explanation": "A short sentence explaining why this is better"
}`
        }
      ]
    });

    const text = response.choices[0].message.content;
    const clean = text.replace(/```json|```/g, "").trim();
    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch {
      parsed = { improved: bullet, explanation: "Failed to parse." };
    }
    
    res.json(parsed);
  } catch (err) {
    res.status(500).json({ msg: err.message });
  }
};

export const analyzeApplicant = async (req , res)=>{
  try{
    const{applicationId} = req.body;
    if(!applicationId)
    {
      return res.status(404).json({msg:"Applicant not found"});
    }
    const app = await Application.findById(applicationId)
    .populate("jobId")
    .populate("userId");

    if(!app) return res.status(404).json({msg: "No applicant found"});

    if(!app.userId?.resumeText){
      return res.status(400).json({msg: "Applicant has no Resume"});
    }
    const response = await client.chat.complete({
      model:"mistral-small-latest",
      messages:[{
        role:"user",
        content:`
        You are a senior technical recruiter.

RESUME: ${app.userId.resumeText.slice(0, 1200)}
JOB DESCRIPTION: ${app.jobId.description}

Return ONLY valid JSON:
{
  "matchScore": number,
  "missingSkills": [],
  "strengths": [],
  "summary": "2-3 sentence evaluation"
}
        `
        
      }]
    });

    const text = response.choices[0].message.content;
    const clean = text.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);

    app.aiAnalysis={
      matchScore:parsed.matchScore,
      missingSkills:parsed.missingSkills,
      strengths:parsed.strengths,
      summary:parsed.summary,
      analyzedAt: new Date(),
    }
    await app.save();
    res.json(app.aiAnalysis);
  
  }
   catch (err) {
    res.status(500).json({ msg: err.message });
  }
};