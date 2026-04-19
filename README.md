# AI Job Hunter — Backend API

A role-based job platform with AI-powered resume matching 
built using Node.js, Express, MongoDB, and Mistral AI.

## Features

- JWT-based authentication with role separation (seeker/recruiter)
- Resume upload with automatic PDF text extraction
- AI-powered resume vs job description matching (Mistral AI)
- Match score, skill gap analysis, and candidate evaluation
- RESTful API with role-based access control
- Duplicate application prevention with MongoDB indexing

## Tech Stack

Node.js · Express.js · MongoDB Atlas · JWT · 
Mistral AI · Multer · pdf-parse · REST API

## API Endpoints

### Auth
POST   /api/auth/register
POST   /api/auth/login

### Jobs
GET    /api/jobs              (public)
GET    /api/jobs/:id          (public)
POST   /api/jobs              (recruiter only)
GET    /api/jobs/mine         (recruiter only)

### Applications
POST   /api/applications      (seeker only)
GET    /api/applications      (seeker only)
GET    /api/jobs/:id/applicants (recruiter only)

### Resume
POST   /api/resume/upload     (seeker only)

### AI
POST   /api/ai/match          (seeker only)

## AI Match Response

{
  "matchScore": 75,
  "missingSkills": ["React", "TypeScript"],
  "strengths": ["Node.js", "MongoDB", "REST APIs"],
  "weaknesses": ["No frontend project evidence"],
  "summary": "Strong backend profile..."
}

## Setup

1. Clone the repo
2. Run: npm install
3. Create .env file:

PORT=5000
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_secret
MISTRAL_API_KEY=your_key

4. Run: npm run dev

## Status

Backend complete. Frontend in development.