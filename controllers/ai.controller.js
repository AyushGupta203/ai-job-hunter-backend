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

    const app = await Application.findOne({
      _id: applicationId,
      userId: req.user.id,
    }).populate("jobId");

    if (!app) {
      return res.status(404).json({ msg: "Application not found" });
    }

    const user = await User.findById(req.user.id);

    if (!user?.resumeText) {
      return res.status(400).json({ msg: "Upload resume first" });
    }

    const response = await client.chat.complete({
  model: "mistral-small-latest",
  messages: [
    {
      role: "user",
      content: `
You are a senior technical recruiter with 10+ years of experience 
hiring software engineers. You evaluate candidates the way a real 
hiring manager does — not just keyword matching, but looking for 
evidence of real work, context, and growth potential.

RESUME:
${user.resumeText.slice(0, 1200)}

JOB DESCRIPTION:
${app.jobId.description}

EVALUATION FRAMEWORK:

matchScore — Score 0 to 100 based on:
- Does the candidate show evidence of USING required skills, 
  not just listing them?
- Are there measurable outcomes in their experience?
- Does their career trajectory make sense for this role?

Scoring guide:
85-100 → Strong fit. Meets core requirements with evidence.
70-84  → Good fit. Minor gaps, coachable in 30-60 days.
50-69  → Partial fit. Key skills missing but potential exists.
Below 50 → Weak fit. Core requirements not demonstrated.

missingSkills — Only list skills explicitly required in the JD 
that have ZERO mention in the resume. Do not list nice-to-haves.

strengths — List what the candidate demonstrates WITH EVIDENCE. 
Example: not "knows React" but "has built and deployed React 
projects". Be specific, not generic.

weaknesses — Be direct and honest. Mention the single most 
important gap that would cause a hiring manager to hesitate. 
Do not list 5 weaknesses — one clear, specific one is more 
useful than five vague ones.

summary — Write exactly 3 sentences:
Sentence 1: Overall fit in plain language. Start with the 
            verdict, not fluff.
Sentence 2: The strongest reason to consider this candidate.
Sentence 3: The one specific thing they should fix or add to 
            become a stronger applicant for this role.

IMPORTANT: 
- Do not inflate scores to be encouraging.
- Do not use corporate buzzwords like "dynamic", "passionate", 
  "team player".
- Write like you are giving honest feedback to a friend, 
  not writing a performance review.

Return ONLY valid JSON, no markdown, no text outside JSON:
{
  "matchScore": number,
  "missingSkills": ["only required skills that are absent"],
  "strengths": ["specific evidence-based strengths"],
  "weaknesses": ["one clear, honest gap"],
  "summary": "3 sentence honest evaluation"
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