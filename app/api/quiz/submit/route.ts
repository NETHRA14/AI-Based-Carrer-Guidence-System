import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { z } from 'zod'
import { logDatabasePermissionOnce, getDemoUserId } from '@/lib/database/demo-mode'
import { getValidatedConfig } from '@/lib/env-validation'
import { FreeAIService } from '@/lib/free-ai-services'

const quizSubmissionSchema = z.object({
  quizType: z.string().optional().default('career_assessment'),
  stream: z.string().optional().default(''),   // e.g. 'Law', 'Engineering', 'Medical'
  responses: z.array(z.object({
    questionId: z.string(),
    answer: z.union([z.string(), z.array(z.string()), z.number()]),
    question: z.string().optional(),
    type: z.string().optional()
  })).optional().default([]),
  personalInfo: z.object({
    interests: z.array(z.string()).optional().default([]),
    skills: z.array(z.string()).optional().default([]),
    goals: z.array(z.string()).optional().default([]),
    experience: z.string().optional().default('beginner'),
    education: z.string().optional().default(''),
    preferredWorkStyle: z.string().optional().default(''),
    industryPreferences: z.array(z.string()).optional().default([])
  }).optional()
})

// POST - Submit quiz responses and generate career recommendations
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    let body = {}
    let validatedData: z.infer<typeof quizSubmissionSchema>
    
    try {
      body = await request.json()
      validatedData = quizSubmissionSchema.parse(body)
    } catch (parseError) {
      console.log('Using default quiz data due to parse error:', parseError)
      validatedData = quizSubmissionSchema.parse({})
    }

    // Generate AI-powered career recommendations based on responses
    const careerRecommendations = await generateAICareerRecommendations(validatedData)
    
    try {
      // Allow demo mode in development 
      const userId = session?.user?.id || getDemoUserId()
      
      if (userId) {
        console.log('Saving quiz results for user:', userId)
        
        try {
          // First ensure user exists in our database
          await supabase.from('users').upsert({
            id: userId,
            email: session?.user?.email || 'demo@example.com',
            first_name: session?.user?.user_metadata?.first_name || null,
            last_name: session?.user?.user_metadata?.last_name || null,
            updated_at: new Date().toISOString()
          })

          // Save quiz result (ai_analysis column removed — not in DB schema)
          const { data: quizResult, error: quizError } = await supabase
            .from('quiz_results')
            .insert({
              user_id: userId,
              career_path: careerRecommendations.primaryCareer.title,
              score: careerRecommendations.primaryCareer.match,
              interests: (validatedData as any).personalInfo?.interests || [],
              skills: (validatedData as any).personalInfo?.skills || [],
              answers: validatedData.responses
            })
            .select()

          if (quizError) {
            console.error('Error saving quiz result:', quizError)
          } else {
            console.log('Quiz result saved:', quizResult)
          }

          // Create skill assessments from quiz results
          if (validatedData.personalInfo?.skills) {
            for (const skillName of validatedData.personalInfo.skills) {
              const skillLevel = careerRecommendations.primaryCareer.match > 75 ? 'advanced' : 
                               careerRecommendations.primaryCareer.match > 50 ? 'intermediate' : 'beginner'
              const skillScore = Math.min(100, Math.max(0, careerRecommendations.primaryCareer.match + Math.floor(Math.random() * 20 - 10)))
              
              await supabase.from('user_skills').upsert({
                user_id: userId,
                skill_name: skillName,
                current_level: skillScore,
                target_level: Math.min(100, skillScore + 20),
                category: 'Quiz Assessment',
                last_updated: new Date().toISOString()
              })
            }
          }

          // Create achievement for completing quiz
          await supabase.from('user_achievements').upsert({
            user_id: userId,
            achievement_id: 'quiz_master_' + Date.now(),
            title: 'Quiz Master',
            description: `Completed career assessment quiz with ${careerRecommendations.primaryCareer.match}% match`,
            type: 'quiz',
            rarity: careerRecommendations.primaryCareer.match > 80 ? 'epic' : 'rare',
            icon: '🧠',
            category: 'Assessment',
            progress: 100,
            max_progress: 100
          })

          // Log the quiz completion activity
          await supabase.from('user_activities').insert({
            user_id: userId,
            type: 'quiz',
            title: 'Career Assessment Completed',
            description: `Discovered primary career path: ${careerRecommendations.primaryCareer.title} (${careerRecommendations.primaryCareer.match}% match)`,
            metadata: {
              quizType: validatedData.quizType,
              primaryCareer: careerRecommendations.primaryCareer.title,
              matchScore: careerRecommendations.primaryCareer.match,
              alternativeCareers: careerRecommendations.alternativeCareers.map((c: any) => c.title)
            }
          })

          // Also log to the new activities table for dashboard tracking
          await supabase.from('activities').insert({
            user_id: userId,
            type: 'quiz_completed',
            details: {
              quiz_id: quizResult?.[0]?.id,
              career_path: careerRecommendations.primaryCareer.title,
              match_score: careerRecommendations.primaryCareer.match,
              quiz_type: validatedData.quizType
            }
          })

          console.log('Quiz results saved successfully for user:', userId)
        } catch (supabaseError) {
          console.error('Supabase error saving quiz results:', supabaseError)
          logDatabasePermissionOnce('Quiz Submit API')
          // Continue with success response even if database save fails
        }
      }

      return NextResponse.json({ 
        success: true,
        recommendations: careerRecommendations,
        message: 'Quiz submitted successfully'
      })
    } catch (dbError) {
      console.error('Database error saving quiz:', dbError)
      // Return recommendations even if database save fails
      return NextResponse.json({ 
        success: true,
        recommendations: careerRecommendations,
        message: 'Quiz completed (recommendations generated)'
      })
    }
  } catch (error) {
    console.error('Error in POST /api/quiz/submit:', error)
    
    // Return default recommendations on any error
    const fallbackRecommendations = {
      primaryCareer: {
        title: 'Software Developer',
        match: 85,
        description: 'Build applications and websites using various programming languages',
        skills: ['Programming', 'Problem Solving', 'Logic'],
        industries: ['Technology', 'Finance', 'Healthcare'],
        salaryRange: '$60,000 - $120,000',
        outlook: 'Excellent (22% growth)'
      },
      alternativeCareers: [
        {
          title: 'Data Analyst',
          match: 78,
          description: 'Analyze data to help businesses make informed decisions',
          skills: ['Data Analysis', 'Statistics', 'Critical Thinking']
        },
        {
          title: 'UX Designer',
          match: 72,
          description: 'Design user experiences for digital products',
          skills: ['Design', 'User Research', 'Creativity']
        }
      ],
      skillGaps: [
        { skill: 'Advanced Programming', priority: 'high', description: 'Learn frameworks like React or Python' },
        { skill: 'Database Management', priority: 'medium', description: 'Understanding of SQL and database design' }
      ],
      nextSteps: [
        'Complete online programming courses',
        'Build personal projects for portfolio',
        'Consider internship or entry-level position',
        'Network with professionals in the field'
      ]
    }
    
    return NextResponse.json({ 
      success: true,
      recommendations: fallbackRecommendations,
      message: 'Quiz completed with default recommendations'
    })
  }
}

async function generateAICareerRecommendations(data: any) {
  try {
    const aiService = FreeAIService.getInstance()

    const { responses = [], personalInfo = {} } = data
    const { interests = [], skills = [], goals = [], experience = 'beginner' } = personalInfo

    const stream = data.stream || ''

    // Create comprehensive prompt — include the stream so AI knows exactly which field this is
    const prompt = `You are a career counselor expert. Analyze this career assessment quiz data and provide STREAM-SPECIFIC career recommendations.

STREAM SELECTED: "${stream}" — This is CRITICAL. All recommendations MUST be relevant to the ${stream} stream/field.

Quiz Responses: ${JSON.stringify(responses)}
Personal Info: ${JSON.stringify(personalInfo)}

IMPORTANT RULES:
- If stream is "Law", recommend careers like Advocate, Corporate Lawyer, Judge, Legal Consultant, Public Prosecutor, Human Rights Lawyer — NOT software or tech careers.
- If stream is "Medical", recommend careers like Doctor, Surgeon, Dentist, Pharmacist, Nurse, Biomedical Scientist.
- If stream is "Engineering", recommend tech/engineering careers.
- If stream is "Arts", recommend journalism, design, psychology, teaching, film, social work careers.
- If stream is "Commerce", recommend CA, Investment Banker, Marketing Manager, MBA, Entrepreneur careers.

Provide a comprehensive analysis in this JSON format:
{
  "primaryCareer": {
    "title": "Most suitable career title (MUST match the ${stream} stream)",
    "match": 85,
    "description": "Detailed description of why this career fits the person's quiz answers",
    "skills": ["required skills for this career"],
    "industries": ["relevant industries in the ${stream} field"],
    "salaryRange": "Realistic salary range",
    "outlook": "Growth prospects and demand",
    "educationPath": "Recommended education/training path for ${stream}"
  },
  "alternativeCareers": [
    {
      "title": "Alternative career 1 (also in ${stream} field)",
      "match": 78,
      "description": "Why this is a good alternative",
      "skills": ["required skills"]
    },
    {
      "title": "Alternative career 2 (also in ${stream} field)",
      "match": 72,
      "description": "Why this is a good alternative",
      "skills": ["required skills"]
    }
  ],
  "aiAnalysis": {
    "personalityProfile": "Detailed personality analysis based on responses",
    "strengths": ["key strengths identified"],
    "developmentAreas": ["areas to focus on"],
    "workStyle": "Preferred work environment and style",
    "motivators": ["what drives this person"],
    "summary": "Comprehensive career guidance summary relevant to ${stream}"
  },
  "skillGaps": [
    {
      "skill": "Skill name relevant to ${stream}",
      "priority": "high|medium|low",
      "description": "Why important and how to develop in the ${stream} field"
    }
  ],
  "nextSteps": [
    "Specific actionable step 1 for ${stream} career",
    "Educational recommendation for ${stream}",
    "Certification or exam suggestion for ${stream}",
    "Networking advice for ${stream} professionals"
  ]
}

Return ONLY valid JSON, no extra text.`

    // Use Groq (llama-3.1-8b-instant) for career analysis
    const response = await aiService.generateResponse(prompt, {
      model: 'llama-3.1-8b-instant',
      maxTokens: 2000,
      temperature: 0.3
    })
    
    try {
      const cleanedText = response.content
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim()
      
      const aiRecommendations = JSON.parse(cleanedText)
      return aiRecommendations
    } catch (parseError) {
      console.error('❌ Failed to parse AI recommendations:', parseError)
      console.error('Raw response:', response.content)
      
      // Fall back to rule-based recommendations
      return generateCareerRecommendations(data)
    }
  } catch (error) {
    console.error('❌ AI recommendation error:', error)
    // Fall back to rule-based recommendations
    return generateCareerRecommendations(data)
  }
}

// ── Stream-aware career database ──────────────────────────────────────────────
const STREAM_CAREERS: Record<string, any[]> = {
  Law: [
    {
      id: 'advocate', title: 'Advocate / Barrister',
      keywords: ['criminal', 'litigation', 'courtroom', 'justice', 'law', 'legal'],
      skills: ['Legal Reasoning', 'Oral Advocacy', 'Case Research', 'Negotiation'],
      industries: ['Legal Services', 'Judiciary', 'Government'],
      salaryRange: '₹3L – ₹30L / year (varies by experience)',
      outlook: 'Strong demand, especially in litigation',
      description: 'Represent clients in courts, prepare legal documents and argue cases before judges.'
    },
    {
      id: 'corporate_lawyer', title: 'Corporate Lawyer',
      keywords: ['corporate', 'business', 'mergers', 'contracts', 'commercial'],
      skills: ['Contract Drafting', 'Corporate Governance', 'Due Diligence', 'Negotiation'],
      industries: ['Corporate', 'Investment Banking', 'Consulting'],
      salaryRange: '₹8L – ₹50L / year',
      outlook: 'High growth in corporate India and MNCs',
      description: 'Advise companies on legal matters, mergers, acquisitions, and regulatory compliance.'
    },
    {
      id: 'judge', title: 'Judge / Judicial Officer',
      keywords: ['judiciary', 'judge', 'civil services', 'court', 'constitutional'],
      skills: ['Legal Interpretation', 'Impartiality', 'Written Reasoning', 'Research'],
      industries: ['Judiciary', 'Government'],
      salaryRange: '₹6L – ₹20L / year (government scale)',
      outlook: 'Prestigious and stable career path',
      description: 'Preside over court cases, interpret laws, and deliver judgments with impartiality.'
    },
    {
      id: 'legal_consultant', title: 'Legal Consultant / In-House Counsel',
      keywords: ['consultant', 'in-house', 'advisory', 'policy', 'compliance'],
      skills: ['Legal Advisory', 'Risk Assessment', 'Compliance', 'Communication'],
      industries: ['Corporates', 'NGOs', 'Government', 'Startups'],
      salaryRange: '₹6L – ₹40L / year',
      outlook: 'High demand across sectors',
      description: 'Provide legal advice to organizations on compliance, contracts, and risk management.'
    },
    {
      id: 'human_rights_lawyer', title: 'Human Rights Lawyer',
      keywords: ['human rights', 'ngos', 'civil rights', 'international', 'activism'],
      skills: ['Human Rights Law', 'Advocacy', 'Report Writing', 'Public Interest Litigation'],
      industries: ['NGOs', 'International Organizations', 'Government', 'Media'],
      salaryRange: '₹3L – ₹15L / year',
      outlook: 'Growing awareness and need globally',
      description: 'Fight for civil liberties, advocate for marginalized communities, and work on policy reform.'
    },
    {
      id: 'public_prosecutor', title: 'Public Prosecutor',
      keywords: ['criminal', 'prosecution', 'government', 'public', 'state'],
      skills: ['Criminal Law', 'Evidence Handling', 'Court Advocacy', 'Investigation'],
      industries: ['Government', 'Judiciary'],
      salaryRange: '₹5L – ₹18L / year',
      outlook: 'Stable government career',
      description: 'Represent the state in criminal proceedings and ensure justice is served.'
    }
  ],
  Medical: [
    {
      id: 'doctor', title: 'Medical Doctor (General Physician)',
      keywords: ['patient', 'clinical', 'medicine', 'hospital', 'mbbs', 'doctor'],
      skills: ['Diagnosis', 'Patient Care', 'Clinical Knowledge', 'Empathy'],
      industries: ['Healthcare', 'Hospitals', 'Clinics'],
      salaryRange: '₹8L – ₹30L / year',
      outlook: 'Excellent — lifelong demand',
      description: 'Diagnose and treat illnesses, provide preventive care and health education to patients.'
    },
    {
      id: 'surgeon', title: 'Surgeon / Specialist',
      keywords: ['surgery', 'specialist', 'cardiology', 'ortho', 'neuro'],
      skills: ['Surgical Techniques', 'Anatomy', 'Precision', 'Critical Thinking'],
      industries: ['Hospitals', 'Specialty Clinics'],
      salaryRange: '₹15L – ₹80L / year',
      outlook: 'Very high demand and income',
      description: 'Perform surgical procedures to treat diseases, injuries, and deformities.'
    },
    {
      id: 'pharmacist', title: 'Pharmacist / Drug Researcher',
      keywords: ['pharmacy', 'drug', 'pharmaceutical', 'research', 'medicine'],
      skills: ['Pharmacology', 'Drug Interaction', 'Research', 'Quality Control'],
      industries: ['Pharmaceutical', 'Hospitals', 'Research Labs'],
      salaryRange: '₹4L – ₹20L / year',
      outlook: 'Growing with pharma sector in India',
      description: 'Dispense medications, counsel patients on drug use, and conduct drug research.'
    },
    {
      id: 'nurse', title: 'Nurse / Healthcare Professional',
      keywords: ['nursing', 'nurse', 'care', 'allied health'],
      skills: ['Patient Care', 'Medical Procedures', 'Compassion', 'Teamwork'],
      industries: ['Hospitals', 'Community Health', 'Clinics'],
      salaryRange: '₹3L – ₹12L / year',
      outlook: 'Always in demand globally',
      description: 'Provide and coordinate patient care, educate patients and support doctors.'
    },
    {
      id: 'dentist', title: 'Dentist (BDS)',
      keywords: ['dental', 'dentist', 'oral', 'teeth'],
      skills: ['Oral Diagnosis', 'Dental Procedures', 'Patient Communication'],
      industries: ['Dental Clinics', 'Hospitals'],
      salaryRange: '₹5L – ₹25L / year',
      outlook: 'Steady demand across urban and rural India',
      description: 'Diagnose and treat dental conditions, perform procedures like fillings, extractions, and braces.'
    }
  ],
  Engineering: [
    {
      id: 'software_dev', title: 'Software Developer',
      keywords: ['coding', 'programming', 'web', 'mobile', 'software', 'apps'],
      skills: ['Programming', 'Problem Solving', 'System Design', 'Debugging'],
      industries: ['Technology', 'Finance', 'Healthcare', 'E-commerce'],
      salaryRange: '₹5L – ₹40L / year',
      outlook: 'Excellent (22% global growth)',
      description: 'Design, develop, and maintain software applications and systems.'
    },
    {
      id: 'data_scientist', title: 'Data Scientist / AI Engineer',
      keywords: ['ai', 'ml', 'machine learning', 'data', 'analytics'],
      skills: ['Python', 'Machine Learning', 'Statistics', 'Data Visualization'],
      industries: ['Technology', 'Finance', 'Research'],
      salaryRange: '₹8L – ₹50L / year',
      outlook: 'Exceptional demand in AI era',
      description: 'Analyze complex datasets and build AI/ML models to solve business problems.'
    },
    {
      id: 'civil_engineer', title: 'Civil / Structural Engineer',
      keywords: ['civil', 'construction', 'infrastructure', 'buildings', 'structural'],
      skills: ['Structural Analysis', 'AutoCAD', 'Project Management', 'Mathematics'],
      industries: ['Construction', 'Government', 'Real Estate'],
      salaryRange: '₹4L – ₹20L / year',
      outlook: 'Growing with infrastructure development',
      description: 'Design and oversee construction of buildings, bridges, roads, and other infrastructure.'
    },
    {
      id: 'cybersecurity', title: 'Cybersecurity Analyst',
      keywords: ['cybersecurity', 'security', 'hacking', 'network', 'cyber'],
      skills: ['Network Security', 'Ethical Hacking', 'Risk Assessment', 'Cryptography'],
      industries: ['Technology', 'Banking', 'Government', 'Defense'],
      salaryRange: '₹6L – ₹35L / year',
      outlook: 'Critical field with massive growth',
      description: 'Protect organizations from cyber threats, vulnerabilities, and data breaches.'
    }
  ],
  Arts: [
    {
      id: 'journalist', title: 'Journalist / Media Professional',
      keywords: ['journalism', 'media', 'writing', 'news', 'communication'],
      skills: ['Writing', 'Research', 'Interviewing', 'Storytelling'],
      industries: ['Media', 'Broadcasting', 'Digital Media', 'Newspapers'],
      salaryRange: '₹3L – ₹15L / year',
      outlook: 'Evolving with digital media growth',
      description: 'Report, investigate, and communicate news and stories to the public across various media.'
    },
    {
      id: 'graphic_designer', title: 'Graphic Designer / UX Designer',
      keywords: ['design', 'creative', 'visual', 'ux', 'ui', 'graphics'],
      skills: ['Adobe Suite', 'Figma', 'Typography', 'Color Theory', 'User Research'],
      industries: ['Design Agencies', 'Advertising', 'Tech Companies'],
      salaryRange: '₹3L – ₹20L / year',
      outlook: 'High demand in digital-first world',
      description: 'Create visual concepts and user interfaces for digital and print media.'
    },
    {
      id: 'psychologist', title: 'Psychologist / Counsellor',
      keywords: ['psychology', 'counselling', 'mental health', 'therapy', 'behaviour'],
      skills: ['Empathy', 'Active Listening', 'Behavioral Analysis', 'Counselling Techniques'],
      industries: ['Healthcare', 'Education', 'NGOs', 'Corporate HR'],
      salaryRange: '₹4L – ₹18L / year',
      outlook: 'Growing demand with mental health awareness',
      description: 'Help individuals understand behavior, manage mental health, and improve well-being.'
    },
    {
      id: 'teacher', title: 'Teacher / Educator / Professor',
      keywords: ['teaching', 'education', 'academic', 'school', 'college'],
      skills: ['Communication', 'Subject Expertise', 'Patience', 'Curriculum Design'],
      industries: ['Education', 'Government', 'Private Institutions'],
      salaryRange: '₹3L – ₹15L / year',
      outlook: 'Stable with growing ed-tech sector',
      description: 'Educate and inspire students, develop curricula, and foster intellectual growth.'
    }
  ],
  Commerce: [
    {
      id: 'ca', title: 'Chartered Accountant (CA)',
      keywords: ['accounting', 'taxation', 'audit', 'finance', 'ca'],
      skills: ['Accounting', 'Taxation', 'Auditing', 'Financial Reporting', 'GST'],
      industries: ['Finance', 'Consulting', 'Corporates', 'Government'],
      salaryRange: '₹7L – ₹40L / year',
      outlook: 'Evergreen demand across all sectors',
      description: 'Manage financial accounts, audits, taxation, and compliance for individuals and organizations.'
    },
    {
      id: 'investment_banker', title: 'Investment Banker / Financial Analyst',
      keywords: ['investment', 'stock market', 'finance', 'banking', 'wealth'],
      skills: ['Financial Modeling', 'Valuation', 'Excel', 'Risk Analysis'],
      industries: ['Banking', 'Finance', 'Stock Market'],
      salaryRange: '₹8L – ₹60L / year',
      outlook: 'High growth with booming Indian markets',
      description: 'Advise companies on investments, mergers, IPOs, and raise capital from markets.'
    },
    {
      id: 'marketing_manager', title: 'Marketing Manager',
      keywords: ['marketing', 'sales', 'advertising', 'brand', 'digital marketing'],
      skills: ['Marketing Strategy', 'Digital Marketing', 'Communication', 'Analytics'],
      industries: ['FMCG', 'E-commerce', 'Advertising', 'Startups'],
      salaryRange: '₹5L – ₹25L / year',
      outlook: 'Strong demand in consumer-driven economy',
      description: 'Plan and execute marketing campaigns to drive brand awareness and business growth.'
    },
    {
      id: 'entrepreneur', title: 'Entrepreneur / Business Owner',
      keywords: ['entrepreneur', 'startup', 'business', 'innovation', 'company'],
      skills: ['Leadership', 'Strategic Thinking', 'Financial Planning', 'Risk Management'],
      industries: ['Any / Self-employed'],
      salaryRange: 'Unlimited potential',
      outlook: 'India\'s startup ecosystem is booming',
      description: 'Build and scale your own business, identify market opportunities and create value.'
    }
  ]
}

function generateCareerRecommendations(data: any) {
  const { responses = [], personalInfo = {}, stream = '' } = data
  const { interests = [], skills = [], experience = 'beginner' } = personalInfo

  // Try to use stream-specific careers; fall back to all careers if stream unknown
  const streamKey = Object.keys(STREAM_CAREERS).find(
    k => k.toLowerCase() === (stream || '').toLowerCase()
  )
  const careers = streamKey ? STREAM_CAREERS[streamKey] : Object.values(STREAM_CAREERS).flat()

  // Score each career
  const careerMatches = careers.map((career: any) => {
    let score = 55 // Base score — higher base for stream-specific matches

    const allUserTokens = [
      ...interests,
      ...skills,
      ...responses.map((r: any) =>
        Array.isArray(r.answer) ? r.answer.join(' ') : String(r.answer ?? '')
      )
    ].join(' ').toLowerCase()

    // Keyword match
    career.keywords.forEach((kw: string) => {
      if (allUserTokens.includes(kw.toLowerCase())) score += 12
    })
    // Skill match
    career.skills.forEach((sk: string) => {
      if (skills.some((s: string) => s.toLowerCase().includes(sk.toLowerCase()) || sk.toLowerCase().includes(s.toLowerCase()))) score += 8
    })
    // Boost if stream matches perfectly
    if (streamKey) score += 10

    return { ...career, match: Math.min(100, Math.round(score)) }
  })

  careerMatches.sort((a: any, b: any) => b.match - a.match)

  const primaryCareer = careerMatches[0]
  const alternativeCareers = careerMatches.slice(1, 4)

  return {
    primaryCareer,
    alternativeCareers,
    skillGaps: [
      { skill: primaryCareer.skills[0], priority: 'high', description: `Develop strong expertise in ${primaryCareer.skills[0]} to excel as a ${primaryCareer.title}` },
      { skill: primaryCareer.skills[1] || 'Communication', priority: 'medium', description: `Improve your ${(primaryCareer.skills[1] || 'communication').toLowerCase()} skills` }
    ],
    nextSteps: [
      `Research ${primaryCareer.title} roles and requirements in depth`,
      `Pursue the recommended education: ${primaryCareer.description?.split('.')[0]}`,
      'Connect with professionals in your target field on LinkedIn',
      'Look for internships, clinics, or pro bono opportunities to gain real experience',
      'Join relevant professional associations and attend networking events'
    ]
  }
}