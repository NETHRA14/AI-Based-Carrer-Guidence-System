/**
 * Free AI Services - Replaces OpenAI/Gemini with free alternatives
 * Supports: Hugging Face, Cohere (free tier), Ollama (local)
 */

import { getValidatedConfig } from './env-validation'
import { CohereClient } from 'cohere-ai'
import { HfInference } from '@huggingface/inference'

function extractJSON(text: string): any {
  try {
    return JSON.parse(text);
  } catch (e) {
    const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (innerError) {
        console.error('❌ Failed to parse matched JSON substring. Raw text was:', text);
        console.error('❌ Matched substring was:', match[0]);
        throw new Error('Failed to parse extracted JSON');
      }
    }
    console.error('❌ No valid JSON pattern matched. Raw text was:', text);
    throw new Error('No valid JSON found in response');
  }
}

export type AIProvider = 'groq' | 'huggingface' | 'cohere' | 'ollama'

export interface AIResponse {
  content: string
  provider: string
  usage?: {
    input_tokens?: number
    output_tokens?: number
    total_tokens?: number
  }
  confidence?: number
  error?: string
}

export interface AIOptions {
  provider?: AIProvider
  maxTokens?: number
  temperature?: number
  model?: string
}

export interface JobMatchResult {
  matchScore: number
  matchingSkills: string[]
  missingSkills: string[]
  recommendations: string[]
  improvementAreas: string[]
  coverLetterSuggestions: string[]
}

/**
 * Free AI Service using Hugging Face, Cohere, and Ollama
 */
export class FreeAIService {
  private static instance: FreeAIService
  private config = getValidatedConfig()
  private cohereClient?: CohereClient
  private hfClient?: HfInference

  static getInstance(): FreeAIService {
    if (!FreeAIService.instance) {
      FreeAIService.instance = new FreeAIService()
    }
    return FreeAIService.instance
  }

  constructor() {
    // Initialize Hugging Face client if API key is available
    if (this.config.ai.huggingfaceKey) {
      this.hfClient = new HfInference(this.config.ai.huggingfaceKey)
    }
    
    // Initialize Cohere client if API key is available
    if (this.config.ai.cohereKey) {
      this.cohereClient = new CohereClient({
        token: this.config.ai.cohereKey,
      })
    }
  }

  /**
   * Generate AI response using the Groq API with retry on rate limit
   */
  async generateResponse(
    prompt: string,
    options: AIOptions = {}
  ): Promise<AIResponse> {
    const {
      maxTokens = 2000,
      temperature = 0.7,
      // Always use a valid Groq model — never pass HuggingFace model names here
      model = 'llama-3.1-8b-instant'
    } = options

    // Force a valid Groq model regardless of what was passed in
    const groqModel = [
      'llama-3.1-8b-instant',
      'llama3-8b-8192',
      'mixtral-8x7b-32768',
      'gemma2-9b-it'
    ].includes(model) ? model : 'llama-3.1-8b-instant'

    const groqApiKey = this.config.ai.groqKey

    if (!groqApiKey) {
      throw new Error('GROQ_API_KEY is not configured in the environment variables')
    }

    const maxRetries = 3
    let lastError: any = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🤖 Sending request to Groq API using model: ${groqModel}${attempt > 1 ? ` (attempt ${attempt})` : ''}`)
        
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${groqApiKey}`
          },
          body: JSON.stringify({
            messages: [
              {
                role: 'system',
                content: prompt.includes('Return ONLY valid JSON') || prompt.includes('valid JSON')
                  ? 'You are an expert career counselor. Return ONLY valid JSON — no markdown, no extra text.'
                  : 'You are a friendly expert career advisor. Respond in clear, natural, conversational language.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            model: groqModel,
            temperature: temperature,
            max_tokens: maxTokens,
            stream: false,
            ...(prompt.includes('Return ONLY valid JSON') || prompt.includes('valid JSON')
              ? { response_format: { type: 'json_object' } }
              : {})
          })
        });

        if (response.status === 429) {
          // Rate limited — parse retry-after if available
          const errorData = await response.text()
          let retryAfterMs = attempt * 15000 // default backoff: 15s, 30s, 45s
          try {
            const errJson = JSON.parse(errorData)
            const msg: string = errJson?.error?.message || ''
            const match = msg.match(/Please try again in ([\d.]+)s/)
            if (match) retryAfterMs = Math.ceil(parseFloat(match[1]) * 1000) + 1000
          } catch {}
          console.warn(`⚠️ Groq rate limit hit. Retrying in ${Math.round(retryAfterMs / 1000)}s... (attempt ${attempt}/${maxRetries})`)
          lastError = new Error(`Groq API Error (429): ${errorData}`)
          if (attempt < maxRetries) {
            await new Promise(r => setTimeout(r, retryAfterMs))
            continue
          }
          break
        }

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(`Groq API Error (${response.status}): ${errorData}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        return {
          content,
          provider: 'groq',
          usage: data.usage || {
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0
          }
        };

      } catch (error: any) {
        lastError = error
        if (error.message?.includes('429') && attempt < maxRetries) {
          const delay = attempt * 15000
          console.warn(`⚠️ Rate limit error. Retrying in ${delay / 1000}s...`)
          await new Promise(r => setTimeout(r, delay))
          continue
        }
        console.error('❌ Groq API generation error:', error)
        break
      }
    }

    console.error('❌ All Groq retry attempts failed, using fallback')
    return this.generateFallbackResponse(prompt)
  }

  /**
   * Generate response using Hugging Face Inference API with specific models
   */
  private async generateWithHuggingFace(
    prompt: string,
    options: { maxTokens?: number; temperature?: number; model?: string }
  ): Promise<AIResponse> {
    if (!this.hfClient) {
      throw new Error('Hugging Face client not initialized')
    }

    // Use specific models based on the task
    let model = options.model || 'facebook/bart-large-cnn' // Default to text generation
    
    try {
      let result: any
      
      // Use different models for different tasks
      if (model.includes('bart') || model.includes('t5')) {
        // Text generation for roadmaps
        result = await this.hfClient.textGeneration({
          model: model,
          inputs: prompt,
          parameters: {
            max_new_tokens: options.maxTokens || 1000,
            temperature: options.temperature || 0.7,
            do_sample: true,
            return_full_text: false,
          }
        })
      } else if (model.includes('bert') || model.includes('deberta')) {
        // Classification/analysis for quizzes - use text generation instead
        result = await this.hfClient.textGeneration({
          model: 'facebook/bart-large-cnn', // Fallback to text generation
          inputs: prompt,
          parameters: {
            max_new_tokens: options.maxTokens || 1000,
            temperature: options.temperature || 0.7,
            do_sample: true,
            return_full_text: false,
          }
        })
      } else if (model.includes('roberta')) {
        // Q&A for resume parsing
        result = await this.hfClient.questionAnswering({
          model: 'deepset/roberta-base-squad2',
          inputs: {
            question: 'What are the key skills and experience mentioned in this resume?',
            context: prompt
          }
        })
        
        // Convert Q&A result to text format
        result = { generated_text: `Answer: ${result.answer}` }
      } else {
        // Default text generation
        result = await this.hfClient.textGeneration({
          model: 'facebook/bart-large-cnn',
          inputs: prompt,
          parameters: {
            max_new_tokens: options.maxTokens || 1000,
            temperature: options.temperature || 0.7,
            do_sample: true,
            return_full_text: false,
          }
        })
      }

      let content: string
      if (result.generated_text) {
        content = result.generated_text.trim()
      } else if (typeof result === 'string') {
        content = result.trim()
      } else {
        throw new Error('Invalid response format from Hugging Face')
      }

      return {
        content,
        provider: 'huggingface',
        confidence: 0.85,
        usage: {
          input_tokens: Math.ceil(prompt.length / 4),
          output_tokens: Math.ceil(content.length / 4),
          total_tokens: Math.ceil((prompt.length + content.length) / 4)
        }
      }
    } catch (error: any) {
      if (error.message?.includes('rate limit') || error.message?.includes('429')) {
        throw new Error('Hugging Face API rate limit exceeded. Please try again later.')
      }
      throw new Error(`Hugging Face API error: ${error.message}`)
    }
  }

  /**
   * Generate response using Cohere (free tier)
   */
  private async generateWithCohere(
    prompt: string,
    options: { maxTokens?: number; temperature?: number; model?: string }
  ): Promise<AIResponse> {
    if (!this.cohereClient) {
      throw new Error('Cohere client not initialized')
    }

    const model = options.model || 'command-light' // Free model from Cohere

    const response = await this.cohereClient.generate({
      model,
      prompt,
      maxTokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      k: 0,
      stopSequences: [],
      returnLikelihoods: 'NONE'
    })

    if (!response.generations || response.generations.length === 0) {
      throw new Error('No response from Cohere')
    }

    const content = response.generations[0].text.trim()

    return {
      content,
      provider: 'cohere',
      confidence: 0.9,
      usage: {
        input_tokens: Math.ceil(prompt.length / 4),
        output_tokens: Math.ceil(content.length / 4),
        total_tokens: Math.ceil((prompt.length + content.length) / 4)
      }
    }
  }

  /**
   * Generate response using Ollama (local models)
   */
  private async generateWithOllama(
    prompt: string,
    options: { maxTokens?: number; temperature?: number; model?: string }
  ): Promise<AIResponse> {
    if (!this.config.ai.ollamaBaseUrl) {
      throw new Error('Ollama base URL not configured')
    }

    const model = options.model || 'llama3.2:1b' // Lightweight Llama model
    const url = `${this.config.ai.ollamaBaseUrl}/api/generate`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          num_predict: options.maxTokens || 1000,
          temperature: options.temperature || 0.7,
        }
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      if (response.status === 404) {
        throw new Error(`Ollama model '${model}' not found. Please pull the model first: ollama pull ${model}`)
      }
      throw new Error(`Ollama API error: ${response.status} - ${errorText}`)
    }

    const result = await response.json()
    
    if (!result.response) {
      throw new Error('Invalid response format from Ollama')
    }

    const content = result.response.trim()

    return {
      content,
      provider: 'ollama',
      confidence: 0.95, // Local models have high confidence
      usage: {
        input_tokens: Math.ceil(prompt.length / 4),
        output_tokens: Math.ceil(content.length / 4),
        total_tokens: Math.ceil((prompt.length + content.length) / 4)
      }
    }
  }

  /**
   * Parse resume using free AI models
   */
  async parseResume(resumeText: string, options: AIOptions = {}): Promise<{
    personalInfo: any
    experience: any[]
    education: any[]
    skills: any
    projects: any[]
    summary: any
    recommendations: any
  }> {
    const prompt = `Analyze this resume and extract structured information. Return a comprehensive analysis in JSON format:

Resume Text:
${resumeText}

Please provide analysis in this exact JSON structure:
{
  "personalInfo": {
    "name": "Full name",
    "email": "Email address", 
    "phone": "Phone number",
    "linkedin": "LinkedIn profile",
    "location": "Location if mentioned"
  },
  "experience": [
    {
      "title": "Job title",
      "company": "Company name",
      "duration": "Duration (e.g., 2020-2023)",
      "description": "Job description",
      "achievements": ["Key achievements"],
      "technologies": ["Technologies used"]
    }
  ],
  "education": [
    {
      "degree": "Degree name",
      "institution": "School/University", 
      "year": "Graduation year",
      "gpa": "GPA if mentioned",
      "details": "Additional details"
    }
  ],
  "skills": {
    "technical": ["List of technical skills"],
    "soft": ["List of soft skills inferred from experience"],
    "tools": ["Tools and technologies"],
    "languages": ["Programming languages"]
  },
  "projects": [
    {
      "name": "Project name",
      "description": "Project description",
      "technologies": ["Technologies used"],
      "year": "Year if mentioned"
    }
  ],
  "summary": {
    "totalExperience": "X years",
    "seniorityLevel": "junior/mid/senior",
    "primaryRole": "Main role/specialization",
    "keyStrengths": ["Top 5 strengths"],
    "careerFocus": "Career focus area",
    "salaryRange": "Estimated salary range based on experience"
  },
  "recommendations": {
    "improvementAreas": ["Areas to improve"],
    "missingSkills": ["Skills that would enhance profile"],
    "careerAdvice": ["Career advancement suggestions"],
    "jobSearchTips": ["Specific job search recommendations"]
  }
}

Provide detailed, accurate analysis. Return ONLY valid JSON, no additional text.`

    // Use Grok for resume parsing (highly capable of structuring JSON)
    const response = await this.generateResponse(prompt, {
      ...options,
      maxTokens: 3000
    })

    const analysisData = extractJSON(response.content)
    return analysisData
  }

  /**
   * Analyze quiz answers using free AI
   */
  async analyzeQuiz(questions: any[], answers: any[], options: AIOptions = {}): Promise<{
    careerPath: string
    score: number
    interests: string[]
    skills: string[]
    description: string
    relatedCareers: string[]
    averageSalary: string
    growthProspect: string
    personalityMatch: string
    recommendedSkills: string[]
    industryInsights: string
    nextSteps: string[]
    analyzed_at: string
    ai_generated: boolean
  }> {
    const prompt = `Analyze these career quiz answers and provide detailed career recommendations.

Questions and Answers:
${JSON.stringify({ questions, answers }, null, 2)}

Provide a comprehensive analysis in the following JSON format:
{
  "careerPath": "Primary career recommendation",
  "score": number (0-100 confidence score),
  "interests": ["interest1", "interest2", "interest3"],
  "skills": ["skill1", "skill2", "skill3"],
  "description": "2-3 sentence description of the recommended career path",
  "relatedCareers": ["career1", "career2", "career3"],
  "averageSalary": "Salary range in appropriate currency",
  "growthProspect": "High/Medium/Low with brief explanation",
  "personalityMatch": "Brief personality assessment",
  "recommendedSkills": ["skill1", "skill2", "skill3"],
  "industryInsights": "Brief industry overview and trends",
  "nextSteps": ["step1", "step2", "step3"]
}

Base recommendations on actual market trends, salary data, and career prospects.
Be specific and actionable. Return ONLY valid JSON, no additional text or markdown.`

    // Use Grok for detailed career path analysis
    const response = await this.generateResponse(prompt, {
      ...options,
      maxTokens: 2500
    })

    const analysis = extractJSON(response.content)

    return {
      careerPath: analysis.careerPath || 'General Career Path',
      score: Math.min(100, Math.max(0, analysis.score || 75)),
      interests: Array.isArray(analysis.interests) ? analysis.interests : [],
      skills: Array.isArray(analysis.skills) ? analysis.skills : [],
      description: analysis.description || 'Career path analysis completed.',
      relatedCareers: Array.isArray(analysis.relatedCareers) ? analysis.relatedCareers : [],
      averageSalary: analysis.averageSalary || 'Varies by location and experience',
      growthProspect: analysis.growthProspect || 'Medium growth potential',
      personalityMatch: analysis.personalityMatch || 'Good personality match',
      recommendedSkills: Array.isArray(analysis.recommendedSkills) ? analysis.recommendedSkills : [],
      industryInsights: analysis.industryInsights || 'Growing industry with opportunities',
      nextSteps: Array.isArray(analysis.nextSteps) ? analysis.nextSteps : [],
      analyzed_at: new Date().toISOString(),
      ai_generated: true
    }
  }

  /**
   * Generate career roadmap using free AI
   */
  async generateRoadmap(
    careerGoal: string,
    userProfile: {
      currentLevel: string
      timeframe: number
      interests?: string[]
      skills?: string[]
      learningStyle?: string
      budget?: string
    },
    options: AIOptions = {}
  ): Promise<any> {
    const prompt = `Create a detailed career roadmap for someone wanting to achieve this goal: "${careerGoal}"

Profile:
- Current Level: ${userProfile.currentLevel}
- Timeframe: ${userProfile.timeframe} months
- Interests: ${userProfile.interests?.join(', ') || 'Not specified'}
- Current Skills: ${userProfile.skills?.join(', ') || 'Not specified'}
- Learning Style: ${userProfile.learningStyle}
- Budget: ${userProfile.budget}

Generate a comprehensive roadmap with the following JSON structure. Each milestone should have meaningful progress tracking and rich resource information:
{
  "title": "Catchy roadmap title",
  "description": "Brief description of the career path",
  "phases": [
    {
      "id": "phase-1",
      "title": "Phase name",
      "duration": "months for this phase",
      "description": "What will be accomplished",
      "completed": false,
      "progress": 0,
      "milestones": [
        {
          "id": "milestone-1",
          "title": "Milestone name",
          "description": "Specific goal with details",
          "completed": false,
          "progress": 0,
          "skills": ["skill1", "skill2", "skill3"],
          "resources": [
            {
              "type": "course/book/project/certification/tutorial/workshop",
              "name": "Specific resource name", 
              "url": "https://example.com or 'Self-study'",
              "cost": "Free/Paid/$XX",
              "duration": "X weeks/hours"
            }
          ],
          "deliverables": ["specific deliverable 1", "specific deliverable 2", "portfolio project"]
        }
      ]
    }
  ],
  "recommendations": {
    "colleges": [
      {
        "name": "Specific College/University name",
        "location": "City, State/Country",
        "program": "Exact program name",
        "why": "Detailed explanation why this is recommended",
        "type": "Public/Private/Community"
      }
    ],
    "certifications": ["cert1", "cert2", "cert3"],
    "networking": ["specific networking opportunity 1", "linkedin groups", "professional associations"],
    "portfolio": ["portfolio project 1", "portfolio project 2", "capstone project"]
  },
  "timeline": {
    "short_term": "Specific 1-3 month goals",
    "medium_term": "Specific 6-12 month goals", 
    "long_term": "Specific 12+ month goals"
  }
}

IMPORTANT: Make it specific, actionable, and realistic for ${userProfile.timeframe} months.
Include 4-6 phases with 3-5 milestones each for a rich roadmap.
Each milestone should have 4-8 skills, 3-6 resources, and 2-4 deliverables.
Recommend 4-6 relevant colleges/universities with real names.
Use realistic resource names, URLs, and costs.
Return ONLY valid JSON, no additional text or markdown.`

    try {
      // Use facebook/bart-large-cnn for text generation (roadmaps)
      const response = await this.generateResponse(prompt, {
        ...options,
        maxTokens: 3000
      })

      const roadmapData = extractJSON(response.content)
      return roadmapData
    } catch (error) {
      console.error('❌ Roadmap generation error:', error)
      throw error;
    }
  }

  /**
   * Get available AI providers based on configuration
   */
  private getAvailableProviders(): AIProvider[] {
    const providers: AIProvider[] = []
    
    if (this.config.ai.groqKey) {
      providers.push('groq')
    }
    if (this.config.ai.huggingfaceKey) {
      providers.push('huggingface')
    }
    if (this.config.ai.cohereKey) {
      providers.push('cohere')  
    }
    if (this.config.ai.ollamaBaseUrl) {
      providers.push('ollama')
    }

    return providers
  }

  /**
   * Generate intelligent fallback response when all AI providers fail.
   * IMPORTANT: Always returns valid JSON so callers can safely JSON.parse() it.
   */
  private generateFallbackResponse(prompt: string): AIResponse {
    const lowerPrompt = prompt.toLowerCase()

    let content: string

    if (lowerPrompt.includes('primarycareer') || lowerPrompt.includes('career assessment') || lowerPrompt.includes('quiz') || lowerPrompt.includes('stream selected')) {
      // Detect stream from prompt (e.g. STREAM SELECTED: "Law")
      const streamMatch = prompt.match(/STREAM SELECTED:\s*["']?(\w+)["']?/i)
      const detectedStream = (streamMatch?.[1] || '').toLowerCase()

      const STREAM_FALLBACKS: Record<string, any> = {
        law: {
          primaryCareer: { title: 'Advocate / Barrister', match: 82, description: 'Represent clients in courts, prepare legal arguments, draft legal documents, and advocate for justice.', skills: ['Legal Reasoning', 'Oral Advocacy', 'Case Research', 'Negotiation', 'Legal Drafting'], industries: ['Legal Services', 'Judiciary', 'Government', 'NGOs'], salaryRange: '₹3L – ₹30L / year', outlook: 'Strong demand in litigation and corporate law', educationPath: 'BA LLB / BBA LLB (5-year) → Bar Council Enrollment → Practice' },
          alternativeCareers: [
            { title: 'Corporate Lawyer', match: 78, description: 'Advise companies on legal compliance, contracts, mergers, and acquisitions.', skills: ['Contract Drafting', 'Corporate Governance', 'Due Diligence'] },
            { title: 'Judge / Judicial Officer', match: 72, description: 'Preside over court cases and deliver impartial judgments.', skills: ['Legal Interpretation', 'Impartiality', 'Research'] },
            { title: 'Legal Consultant / In-House Counsel', match: 68, description: 'Provide legal advice to organizations on compliance and risk.', skills: ['Legal Advisory', 'Risk Assessment', 'Compliance'] }
          ],
          aiAnalysis: { personalityProfile: 'Analytical, argumentative, and justice-driven', strengths: ['Critical thinking', 'Oral communication', 'Research skills'], developmentAreas: ['Courtroom confidence', 'Legal drafting', 'Networking'], workStyle: 'Detail-oriented, research-heavy, and client-facing', motivators: ['Justice', 'Intellectual challenge', 'Prestige'], summary: 'Your responses indicate strong suitability for a legal career. Focus on advocacy and legal knowledge.' },
          skillGaps: [{ skill: 'Legal Research & Drafting', priority: 'high', description: 'Master SCC Online, Manupatra and practice drafting pleadings' }, { skill: 'Courtroom Advocacy', priority: 'high', description: 'Join moot court competitions and intern at courts or law firms' }],
          nextSteps: ['Complete BA LLB / BBA LLB from a reputed NLU or law college', 'Enroll with your State Bar Council after graduation', 'Intern at law firms, courts, or with senior advocates', 'Participate in moot courts and legal aid clinics', 'Consider Judiciary exams (PCS-J) if interested in judgeship']
        },
        medical: {
          primaryCareer: { title: 'Medical Doctor (General Physician)', match: 84, description: 'Diagnose and treat patients, provide preventive care, and guide patients toward better health.', skills: ['Clinical Diagnosis', 'Patient Care', 'Medical Knowledge', 'Empathy', 'Communication'], industries: ['Hospitals', 'Clinics', 'Government Health Services', 'Research'], salaryRange: '₹8L – ₹30L / year', outlook: 'Excellent — lifelong demand across India and globally', educationPath: 'MBBS (5.5 years) → Internship → MD/MS Specialization' },
          alternativeCareers: [
            { title: 'Surgeon / Specialist', match: 80, description: 'Perform surgical procedures in specialized fields.', skills: ['Surgical Skills', 'Precision', 'Anatomy'] },
            { title: 'Dentist (BDS)', match: 74, description: 'Diagnose and treat dental conditions and perform oral surgeries.', skills: ['Oral Diagnosis', 'Dental Procedures', 'Patient Care'] },
            { title: 'Pharmacist / Drug Researcher', match: 68, description: 'Dispense medications, counsel patients, and conduct drug research.', skills: ['Pharmacology', 'Drug Interaction', 'Research'] }
          ],
          aiAnalysis: { personalityProfile: 'Compassionate, detail-oriented, and scientifically curious', strengths: ['Empathy', 'Dedication', 'Scientific aptitude'], developmentAreas: ['Clinical decision-making', 'Patient communication'], workStyle: 'Patient-facing, team-based in hospital settings', motivators: ['Helping people', 'Scientific discovery', 'Prestige'], summary: 'Your profile shows strong alignment with medical careers. MBBS is the foundation — specialization will maximize impact.' },
          skillGaps: [{ skill: 'Clinical Skills', priority: 'high', description: 'Practice through hospital rotations and internships' }, { skill: 'NEET Preparation', priority: 'high', description: 'Prepare rigorously for NEET-UG to secure MBBS admission' }],
          nextSteps: ['Prepare and qualify for NEET-UG examination', 'Complete MBBS from a recognized medical college', 'Complete 1-year mandatory internship', 'Decide on specialization and prepare for NEET-PG', 'Join medical associations and attend clinical workshops']
        },
        arts: {
          primaryCareer: { title: 'Journalist / Media Professional', match: 80, description: 'Research, investigate, and communicate stories across print, digital, and broadcast media.', skills: ['Writing', 'Research', 'Storytelling', 'Interviewing', 'Media Literacy'], industries: ['Media', 'Broadcasting', 'Digital Media', 'Publishing', 'Public Relations'], salaryRange: '₹3L – ₹15L / year', outlook: 'Evolving with digital and social media growth', educationPath: 'BA Journalism / Mass Communication → Internships → Media House' },
          alternativeCareers: [
            { title: 'Psychologist / Counsellor', match: 76, description: 'Help individuals manage mental health issues and improve well-being.', skills: ['Empathy', 'Active Listening', 'Counselling Techniques'] },
            { title: 'Graphic Designer / UX Designer', match: 72, description: 'Create visual concepts and digital interfaces for brands and products.', skills: ['Adobe Suite', 'Figma', 'Typography'] },
            { title: 'Teacher / Educator', match: 69, description: 'Educate and inspire students at school or college level.', skills: ['Communication', 'Curriculum Design', 'Patience'] }
          ],
          aiAnalysis: { personalityProfile: 'Creative, expressive, and socially aware', strengths: ['Communication', 'Creativity', 'Empathy'], developmentAreas: ['Digital skills', 'Networking', 'Portfolio building'], workStyle: 'Creative and collaborative, often deadline-driven', motivators: ['Creative expression', 'Social impact', 'Recognition'], summary: 'Your artistic and communicative strengths make you ideal for media, design, or social impact careers.' },
          skillGaps: [{ skill: 'Digital Content Creation', priority: 'high', description: 'Learn video editing, SEO, and social media content strategy' }, { skill: 'Portfolio Development', priority: 'high', description: 'Build a portfolio of published articles, designs, or artwork' }],
          nextSteps: ['Complete BA in Journalism / Psychology / Fine Arts / Design', 'Start a blog, YouTube channel, or portfolio website', 'Intern at media houses, NGOs, design studios, or schools', 'Build a strong LinkedIn and creative portfolio', 'Pursue PG Diploma or Masters to specialize']
        },
        commerce: {
          primaryCareer: { title: 'Chartered Accountant (CA)', match: 84, description: 'Manage financial accounts, taxation, audits, and compliance for individuals, businesses, and governments.', skills: ['Accounting', 'Taxation', 'Auditing', 'Financial Reporting', 'GST & Compliance'], industries: ['Finance', 'Consulting', 'Corporates', 'Government', 'Banking'], salaryRange: '₹7L – ₹40L / year', outlook: 'Evergreen demand — every business needs a CA', educationPath: 'B.Com → CA Foundation → CA Intermediate → CA Final → Articleship' },
          alternativeCareers: [
            { title: 'Investment Banker / Financial Analyst', match: 78, description: 'Advise companies on investments, IPOs, mergers, and capital markets.', skills: ['Financial Modeling', 'Valuation', 'Excel', 'Risk Analysis'] },
            { title: 'Marketing Manager', match: 72, description: 'Plan and execute campaigns to drive brand awareness and business growth.', skills: ['Marketing Strategy', 'Digital Marketing', 'Analytics'] },
            { title: 'Entrepreneur / Business Owner', match: 70, description: 'Build and scale your own business by identifying market opportunities.', skills: ['Leadership', 'Strategic Thinking', 'Financial Planning'] }
          ],
          aiAnalysis: { personalityProfile: 'Analytical, business-minded, and goal-oriented', strengths: ['Numerical aptitude', 'Strategic thinking', 'Business acumen'], developmentAreas: ['Presentation skills', 'Networking', 'Digital finance tools'], workStyle: 'Structured, client-facing, often deadline-driven', motivators: ['Financial success', 'Business growth', 'Leadership'], summary: 'Your commerce aptitude is strong — CA or MBA Finance are excellent paths with high ROI.' },
          skillGaps: [{ skill: 'Financial Accounting & Tally', priority: 'high', description: 'Master accounting software and financial statement preparation' }, { skill: 'Stock Market & Investment Basics', priority: 'medium', description: 'Learn equity research and portfolio management for finance careers' }],
          nextSteps: ['Complete B.Com from a reputed college', 'Register for CA Foundation with ICAI', 'Complete CA Intermediate and start Articleship training', 'Consider CFA or MBA Finance for investment banking', 'Build Excel and financial modeling skills alongside studies']
        },
        engineering: {
          primaryCareer: { title: 'Software Developer / Engineer', match: 83, description: 'Design, build, and maintain software applications that solve real-world problems across industries.', skills: ['Programming', 'System Design', 'Problem Solving', 'Debugging', 'Version Control'], industries: ['Technology', 'Finance', 'E-commerce', 'Healthcare', 'Startups'], salaryRange: '₹5L – ₹40L / year', outlook: 'Excellent (22% global growth)', educationPath: 'B.Tech / BE in CSE → Internships → Full-time Role' },
          alternativeCareers: [
            { title: 'Data Scientist / AI Engineer', match: 79, description: 'Build ML models and analyze large datasets to derive insights.', skills: ['Python', 'Machine Learning', 'Statistics'] },
            { title: 'Cybersecurity Analyst', match: 73, description: 'Protect systems and networks from cyber threats.', skills: ['Network Security', 'Ethical Hacking', 'Cryptography'] },
            { title: 'Civil / Structural Engineer', match: 67, description: 'Design and oversee construction of infrastructure.', skills: ['AutoCAD', 'Structural Analysis', 'Project Management'] }
          ],
          aiAnalysis: { personalityProfile: 'Logical, innovative, and solution-oriented', strengths: ['Technical aptitude', 'Problem solving', 'Continuous learning'], developmentAreas: ['Communication', 'Leadership', 'Domain expertise'], workStyle: 'Collaborative, project-based, often hybrid/remote', motivators: ['Building things', 'Innovation', 'Career growth'], summary: 'Strong engineering potential — focus on coding fundamentals and build projects to stand out.' },
          skillGaps: [{ skill: 'Core Programming (Python/Java/C++)', priority: 'high', description: 'Master at least one language deeply with DSA practice' }, { skill: 'System Design & Architecture', priority: 'medium', description: 'Learn how large-scale systems are built for senior roles' }],
          nextSteps: ['Complete B.Tech from a reputed college (NITs/IIITs/top private)', 'Practice Data Structures & Algorithms on LeetCode / GeeksforGeeks', 'Build 3-5 projects and host on GitHub', 'Apply for internships from 2nd year onwards', 'Prepare for campus placements or GATE for higher studies']
        }
      }

      const fallback = STREAM_FALLBACKS[detectedStream] || STREAM_FALLBACKS['engineering']
      content = JSON.stringify(fallback)
    } else if (lowerPrompt.includes('jobs') || lowerPrompt.includes('job match') || lowerPrompt.includes('resume')) {
      // Job search fallback
      content = JSON.stringify({
        jobs: [
          {
            title: 'Software Engineer', company: 'TechFlow Solutions', location: 'Remote',
            type: 'Full-time', salary: '$80,000 - $120,000', experience: '2-4 years',
            description: 'Build scalable web applications using modern technologies.',
            requirements: ['JavaScript', 'React', 'Node.js'],
            responsibilities: ['Develop features', 'Code reviews', 'Collaborate with design'],
            skills: ['JavaScript', 'React', 'Node.js'],
            benefits: ['Health insurance', 'Remote work', '401k'],
            matchScore: 80,
            matchReasons: ['Strong JS skills', 'React experience', 'Backend exposure'],
            companyInfo: { size: 'Mid-size', industry: 'Technology', description: 'Innovative software company.' },
            posted: new Date().toISOString().split('T')[0],
            applicationUrl: 'https://example.com/careers'
          }
        ],
        summary: {
          totalMatches: 1, averageMatchScore: 80,
          topSkillsInDemand: ['JavaScript', 'React', 'Python'],
          salaryInsights: { averageRange: '$70,000 - $110,000', potentialEarnings: '$80,000 - $130,000', factorsInfluencing: ['Skills', 'Experience', 'Location'] },
          marketTrends: ['High demand for full-stack developers', 'Remote work widely available']
        }
      })
    } else if (lowerPrompt.includes('email') || lowerPrompt.includes('cover-letter') || lowerPrompt.includes('linkedin')) {
      // Outreach fallback
      content = JSON.stringify({
        subject: 'Application for the Open Position',
        content: 'Dear Hiring Manager,\n\nI am writing to express my strong interest in joining your team. My background and skills align well with your requirements, and I am excited about the opportunity to contribute.\n\nI look forward to discussing this further.\n\nBest regards,\n[Your Name]',
        tone: 'professional',
        keyHighlights: ['Relevant experience', 'Strong technical skills'],
        callToAction: 'Schedule an interview',
        personalization: ['Role-specific language', 'Company values alignment']
      })
    } else if (lowerPrompt.includes('roadmap') || lowerPrompt.includes('phases')) {
      // Roadmap fallback
      content = JSON.stringify({
        title: 'Your Career Roadmap',
        description: 'A structured path to achieve your career goals.',
        phases: [
          {
            id: 'phase-1', title: 'Foundation', duration: '3 months',
            description: 'Build core skills and knowledge.',
            completed: false, progress: 0,
            milestones: [
              { id: 'ms-1', title: 'Learn the Basics', description: 'Complete introductory courses in your field.', completed: false, progress: 0, skills: ['Core fundamentals'], resources: [{ type: 'course', name: 'Introductory Course', url: 'https://coursera.org', cost: 'Free', duration: '4 weeks' }], deliverables: ['Certificate of completion'] }
            ]
          }
        ],
        recommendations: { colleges: [], certifications: ['Entry-level certification in your field'], networking: ['LinkedIn', 'Meetup groups'], portfolio: ['Personal project showcasing skills'] },
        timeline: { short_term: 'Complete foundation courses', medium_term: 'Build portfolio projects', long_term: 'Land first role in target field' }
      })
    } else {
      // Generic fallback
      content = JSON.stringify({
        message: 'AI service temporarily unavailable. Please try again in a moment.',
        suggestions: ['Software Development', 'Data Science', 'UX/UI Design', 'Digital Marketing', 'Cybersecurity']
      })
    }

    return {
      content,
      provider: 'fallback',
      confidence: 0.6,
      error: 'AI services temporarily unavailable'
    }
  }

  /**
   * Match resume against job description using semantic similarity
   */
  async matchResumeToJob(resumeText: string, jobDescription: string, options: AIOptions = {}): Promise<JobMatchResult> {
    const prompt = `Compare this resume against the job description and provide a detailed match analysis:

RESUME:
${resumeText}

JOB DESCRIPTION:
${jobDescription}

Analyze the match and return JSON in this format:
{
  "matchScore": number (0-100),
  "matchingSkills": ["skills from resume that match job"],
  "missingSkills": ["required skills not found in resume"],
  "recommendations": ["specific recommendations to improve match"],
  "improvementAreas": ["areas to focus development on"],
  "coverLetterSuggestions": ["suggestions for cover letter content"]
}

Return ONLY valid JSON, no additional text.`

    try {
      const response = await this.generateResponse(prompt, options)
      return extractJSON(response.content)
    } catch (error) {
      console.error('❌ Resume matching error:', error)
      throw error;
    }
  }
}


export default FreeAIService