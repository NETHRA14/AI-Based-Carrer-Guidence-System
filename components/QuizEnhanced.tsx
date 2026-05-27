'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Brain,
  Target,
  Star,
  BarChart3,
  History,
  Play,
  Sparkles,
  Clock,
  Award,
  Calendar,
  ChevronRight,
  BookOpen,
  Stethoscope,
  Scale,
  TrendingUp,
  Palette,
  Cpu,
  Leaf,
  ExternalLink
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useRouter } from 'next/navigation'
import { toast } from 'react-hot-toast'
import Link from 'next/link'

// ─── Stream Definitions ──────────────────────────────────────────────────────

type Stream = 'Engineering' | 'Arts' | 'Commerce' | 'Medical' | 'Law' | 'Agri'

const STREAMS: { id: Stream; label: string; icon: any; color: string; bg: string; description: string }[] = [
  {
    id: 'Engineering',
    label: 'Engineering & Technology',
    icon: Cpu,
    color: 'text-neon-cyan',
    bg: 'border-neon-cyan bg-neon-cyan/10',
    description: 'Computer Science, Electronics, Mechanical, Civil & more'
  },
  {
    id: 'Arts',
    label: 'Arts & Humanities',
    icon: Palette,
    color: 'text-neon-purple',
    bg: 'border-neon-purple bg-neon-purple/10',
    description: 'Literature, History, Design, Psychology, Fine Arts & more'
  },
  {
    id: 'Commerce',
    label: 'Commerce & Business',
    icon: TrendingUp,
    color: 'text-yellow-400',
    bg: 'border-yellow-400 bg-yellow-400/10',
    description: 'Accounting, Finance, MBA, Marketing, Economics & more'
  },
  {
    id: 'Medical',
    label: 'Medical & Health Sciences',
    icon: Stethoscope,
    color: 'text-green-400',
    bg: 'border-green-400 bg-green-400/10',
    description: 'MBBS, Nursing, Pharmacy, Dentistry, Biotechnology & more'
  },
  {
    id: 'Law',
    label: 'Law & Legal Studies',
    icon: Scale,
    color: 'text-neon-pink',
    bg: 'border-neon-pink bg-neon-pink/10',
    description: 'LLB, Corporate Law, Criminal Law, Civil Law & more'
  },
  {
    id: 'Agri',
    label: 'Agriculture & Allied Sciences',
    icon: Leaf,
    color: 'text-lime-400',
    bg: 'border-lime-400 bg-lime-400/10',
    description: 'Agronomy, Horticulture, Forestry, Food Tech, Dairy Science & more'
  }
]

// ─── Stream-specific Questions ────────────────────────────────────────────────

const STREAM_QUESTIONS: Record<Stream, QuizQuestion[]> = {
  Engineering: [
    { id: 'e1', question: 'How much do you enjoy solving mathematical or logical problems?', type: 'scale', category: 'interests' },
    { id: 'e2', question: 'Which area excites you the most?', type: 'multiple_choice', category: 'interests', options: ['Building software & apps', 'Designing circuits & systems', 'Constructing buildings & infrastructure', 'Working with machines & manufacturing'] },
    { id: 'e3', question: 'What kind of projects do you prefer?', type: 'multiple_choice', category: 'preferences', options: ['Coding and developing applications', 'Hardware and embedded systems', 'Research and innovation', 'Managing and planning projects'] },
    { id: 'e4', question: 'Rate your interest in programming and coding', type: 'scale', category: 'skills' },
    { id: 'e5', question: 'Which technologies interest you? (Select all that apply)', type: 'multi_select', category: 'interests', options: ['Artificial Intelligence / ML', 'Web & Mobile Development', 'Robotics & Automation', 'Data Science & Analytics', 'Cybersecurity', 'IoT & Embedded Systems'] },
    { id: 'e6', question: 'What work environment suits you best?', type: 'multiple_choice', category: 'preferences', options: ['Tech startup', 'Large IT company', 'Research lab', 'Government / PSU'] },
    { id: 'e7', question: 'How important is research and innovation to you?', type: 'scale', category: 'values' },
    { id: 'e8', question: 'What is your long-term career goal?', type: 'multi_select', category: 'goals', options: ['Software Engineer / Developer', 'Data Scientist', 'Hardware / Embedded Engineer', 'Civil / Structural Engineer', 'Product Manager', 'Entrepreneur'] }
  ],
  Arts: [
    { id: 'a1', question: 'How strongly do you enjoy reading, writing, and expressing ideas?', type: 'scale', category: 'interests' },
    { id: 'a2', question: 'Which subject fascinates you the most?', type: 'multiple_choice', category: 'interests', options: ['Literature & Languages', 'History & Culture', 'Psychology & Human Behaviour', 'Visual Arts & Design'] },
    { id: 'a3', question: 'What type of work do you see yourself doing?', type: 'multiple_choice', category: 'preferences', options: ['Creative writing or journalism', 'Teaching and academic research', 'Designing visuals and media', 'Counselling and social work'] },
    { id: 'a4', question: 'Rate your creative and artistic abilities', type: 'scale', category: 'skills' },
    { id: 'a5', question: 'Which career areas interest you? (Select all that apply)', type: 'multi_select', category: 'interests', options: ['Journalism & Media', 'Graphic Design & Animation', 'Psychology & Counselling', 'Teaching & Education', 'Film & Photography', 'Social Work & NGOs'] },
    { id: 'a6', question: 'What motivates you at work?', type: 'multiple_choice', category: 'values', options: ['Creative freedom', 'Social impact', 'Academic recognition', 'Financial growth'] },
    { id: 'a7', question: 'How important is cultural and societal impact in your career?', type: 'scale', category: 'values' },
    { id: 'a8', question: 'What is your dream career? (Select all that apply)', type: 'multi_select', category: 'goals', options: ['Author / Journalist', 'Graphic Designer / UX Designer', 'Psychologist / Counsellor', 'Teacher / Professor', 'Filmmaker / Photographer', 'Social Activist / NGO worker'] }
  ],
  Commerce: [
    { id: 'c1', question: 'How much do you enjoy working with numbers, finance, and business?', type: 'scale', category: 'interests' },
    { id: 'c2', question: 'Which business domain excites you the most?', type: 'multiple_choice', category: 'interests', options: ['Accounting & Taxation', 'Marketing & Sales', 'Finance & Investment', 'Entrepreneurship & Startups'] },
    { id: 'c3', question: 'What role do you see yourself in?', type: 'multiple_choice', category: 'preferences', options: ['Financial Analyst / CA', 'Marketing Manager', 'Business Consultant', 'Entrepreneur / Business Owner'] },
    { id: 'c4', question: 'Rate your analytical and business decision-making skills', type: 'scale', category: 'skills' },
    { id: 'c5', question: 'Which areas interest you? (Select all that apply)', type: 'multi_select', category: 'interests', options: ['Chartered Accountancy (CA)', 'Stock Market & Investment Banking', 'Digital Marketing', 'Human Resources', 'International Business', 'E-Commerce & Retail'] },
    { id: 'c6', question: 'What is most important to you in a career?', type: 'multiple_choice', category: 'values', options: ['High salary & financial growth', 'Leadership & power', 'Innovation & creativity', 'Stability & security'] },
    { id: 'c7', question: 'How entrepreneurial are you — do you want to run your own business?', type: 'scale', category: 'values' },
    { id: 'c8', question: 'Which career path suits you? (Select all that apply)', type: 'multi_select', category: 'goals', options: ['Chartered Accountant', 'Investment Banker', 'Marketing Manager', 'MBA Graduate', 'Company Secretary', 'Entrepreneur'] }
  ],
  Medical: [
    { id: 'm1', question: 'How passionate are you about healthcare and helping patients?', type: 'scale', category: 'interests' },
    { id: 'm2', question: 'Which medical field interests you most?', type: 'multiple_choice', category: 'interests', options: ['Clinical medicine & patient care', 'Pharmaceutical & drug research', 'Nursing & allied health', 'Biomedical research & genetics'] },
    { id: 'm3', question: 'What setting do you prefer to work in?', type: 'multiple_choice', category: 'preferences', options: ['Hospital (clinical setting)', 'Research laboratory', 'Community / rural healthcare', 'Pharmaceutical company'] },
    { id: 'm4', question: 'Rate your dedication to long study hours and rigorous training', type: 'scale', category: 'skills' },
    { id: 'm5', question: 'Which specializations interest you? (Select all that apply)', type: 'multi_select', category: 'interests', options: ['Surgery', 'Dentistry', 'Pharmacology', 'Nursing', 'Radiology / Imaging', 'Psychiatry & Mental Health'] },
    { id: 'm6', question: 'What drives you toward a medical career?', type: 'multiple_choice', category: 'values', options: ['Saving lives and patient care', 'Scientific discovery', 'Community service', 'Prestige and recognition'] },
    { id: 'm7', question: 'How willing are you to specialize further (MD / MS) after MBBS?', type: 'scale', category: 'values' },
    { id: 'm8', question: 'Your preferred career path: (Select all that apply)', type: 'multi_select', category: 'goals', options: ['MBBS Doctor (General Physician)', 'Specialist (Surgeon / Cardiologist etc.)', 'Dentist (BDS)', 'Pharmacist / Pharmacy Researcher', 'Nurse / Midwife', 'Biomedical Scientist'] }
  ],
  Law: [
    { id: 'l1', question: 'How much do you enjoy reading, debating, and critical analysis?', type: 'scale', category: 'interests' },
    { id: 'l2', question: 'Which area of law interests you most?', type: 'multiple_choice', category: 'interests', options: ['Criminal Law', 'Corporate & Business Law', 'Constitutional & Civil Rights Law', 'International Law & Human Rights'] },
    { id: 'l3', question: 'What law career role suits you best?', type: 'multiple_choice', category: 'preferences', options: ['Courtroom Advocate / Litigator', 'Corporate Lawyer / Legal Advisor', 'Judge / Judicial Officer', 'Legal Researcher / Academic'] },
    { id: 'l4', question: 'Rate your written and verbal communication skills', type: 'scale', category: 'skills' },
    { id: 'l5', question: 'Which legal fields interest you? (Select all that apply)', type: 'multi_select', category: 'interests', options: ['Criminal Litigation', 'Corporate & Mergers Law', 'Intellectual Property (IP)', 'Human Rights & NGO work', 'Family & Civil Law', 'Judiciary / Civil Services'] },
    { id: 'l6', question: 'What inspires you to pursue law?', type: 'multiple_choice', category: 'values', options: ['Sense of justice & fairness', 'Prestige & public impact', 'Business & corporate opportunities', 'Academic and intellectual challenge'] },
    { id: 'l7', question: 'How interested are you in judiciary exams or civil services?', type: 'scale', category: 'values' },
    { id: 'l8', question: 'What is your target law career? (Select all that apply)', type: 'multi_select', category: 'goals', options: ['Advocate / Barrister', 'Corporate Lawyer', 'Judge', 'Legal Consultant / In-House Counsel', 'Public Prosecutor', 'Human Rights Lawyer'] }
  ],
  Agri: [
    { id: 'ag1', question: 'How passionate are you about farming, nature, and food systems?', type: 'scale', category: 'interests' },
    { id: 'ag2', question: 'Which agricultural field interests you the most?', type: 'multiple_choice', category: 'interests', options: ['Crop Science & Agronomy', 'Horticulture & Floriculture', 'Animal Husbandry & Dairy', 'Food Technology & Processing'] },
    { id: 'ag3', question: 'What kind of work environment suits you?', type: 'multiple_choice', category: 'preferences', options: ['Field / Farm work', 'Laboratory & Research', 'Government / Policy', 'Agri-tech startup'] },
    { id: 'ag4', question: 'Rate your interest in biology, ecology, and environmental science', type: 'scale', category: 'skills' },
    { id: 'ag5', question: 'Which specializations interest you? (Select all that apply)', type: 'multi_select', category: 'interests', options: ['Agronomy & Soil Science', 'Horticulture', 'Forestry & Wildlife', 'Fisheries & Aquaculture', 'Food Science & Technology', 'Agricultural Engineering'] },
    { id: 'ag6', question: 'What motivates your interest in agriculture?', type: 'multiple_choice', category: 'values', options: ['Food security & rural development', 'Environmental sustainability', 'Scientific research & innovation', 'Business & agri-entrepreneurship'] },
    { id: 'ag7', question: 'How interested are you in agri-tech, drones, and precision farming?', type: 'scale', category: 'values' },
    { id: 'ag8', question: 'What is your target career? (Select all that apply)', type: 'multi_select', category: 'goals', options: ['Agricultural Scientist / Researcher', 'Horticulturist', 'Agri-Entrepreneur / Farmer', 'Food Technologist', 'Forestry Officer', 'Veterinary Doctor'] }
  ]
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface QuizQuestion {
  id: string
  question: string
  type: 'multiple_choice' | 'scale' | 'multi_select'
  options?: string[]
  category: 'interests' | 'skills' | 'preferences' | 'values' | 'goals'
}

interface QuizResult {
  careerPath: string
  score: number
  recommendedCourse: string
  recommendedDomain: string
  interests: string[]
  skills: string[]
  description: string
  relatedCareers: string[]
  averageSalary: string
  growthProspect: string
  exploreStream: string
}

interface PastQuizResult {
  id: string
  career_path: string
  score: number
  interests: string[]
  skills: string[]
  created_at: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function QuizEnhanced() {
  const router = useRouter()
  const { user } = useAuth()

  // view: landing → stream-select → quiz → results
  const [view, setView] = useState<'landing' | 'stream-select' | 'quiz' | 'results'>('landing')
  const [selectedStream, setSelectedStream] = useState<Stream | null>(null)
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, any>>({})
  const [result, setResult] = useState<QuizResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [pastQuizzes, setPastQuizzes] = useState<PastQuizResult[]>([])
  const [loadingPast, setLoadingPast] = useState(true)

  useEffect(() => {
    if (user) loadPastQuizzes()
    else setLoadingPast(false)
  }, [user])

  const questions = selectedStream ? STREAM_QUESTIONS[selectedStream] : []

  const loadPastQuizzes = async () => {
    try {
      const response = await fetch('/api/quiz/past-results')
      if (response.ok) {
        const data = await response.json()
        setPastQuizzes(data.results || [])
      }
    } catch { /* ignore */ } finally {
      setLoadingPast(false)
    }
  }

  const handleAnswer = (questionId: string, answer: any) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const nextQuestion = () => {
    if (currentQuestion < questions.length - 1) setCurrentQuestion(currentQuestion + 1)
    else submitQuiz()
  }

  const prevQuestion = () => {
    if (currentQuestion > 0) setCurrentQuestion(currentQuestion - 1)
  }

  const startQuiz = (stream: Stream) => {
    setSelectedStream(stream)
    setCurrentQuestion(0)
    setAnswers({})
    setResult(null)
    setView('quiz')
  }

  const submitQuiz = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/quiz/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stream: selectedStream,
          responses: Object.entries(answers).map(([questionId, answer]) => ({
            questionId,
            answer,
            question: questions.find(q => q.id === questionId)?.question || '',
            type: questions.find(q => q.id === questionId)?.type || 'unknown'
          })),
          personalInfo: {
            interests: extractFromAnswers('interests'),
            skills: extractFromAnswers('skills'),
            experience: 'student'
          }
        })
      })

      if (!response.ok) throw new Error('Failed to submit')
      const data = await response.json()

      const aiResult: QuizResult = {
        careerPath: data.recommendations?.primaryCareer?.title || 'Career Path',
        score: data.recommendations?.primaryCareer?.match || 85,
        recommendedCourse: data.recommendations?.primaryCareer?.course || inferCourse(),
        recommendedDomain: data.recommendations?.primaryCareer?.domain || inferDomain(),
        interests: data.recommendations?.primaryCareer?.skills || [],
        skills: data.recommendations?.primaryCareer?.skills || [],
        description: data.recommendations?.primaryCareer?.description || '',
        relatedCareers: data.recommendations?.alternativeCareers?.map((c: any) => c.title) || [],
        averageSalary: data.recommendations?.primaryCareer?.salaryRange || 'Competitive',
        growthProspect: data.recommendations?.primaryCareer?.outlook || 'Positive outlook',
        exploreStream: selectedStream || ''
      }

      setResult(aiResult)
      setView('results')
      toast.success('Quiz completed! Here are your results 🎉')
      if (user) await loadPastQuizzes()
    } catch {
      // Fallback result based on answers
      setResult(buildFallbackResult())
      setView('results')
      toast.success('Analysis complete!')
    } finally {
      setLoading(false)
    }
  }

  const extractFromAnswers = (category: string) => {
    const items: string[] = []
    Object.entries(answers).forEach(([qId, answer]) => {
      const q = questions.find(q => q.id === qId)
      if (q?.category === category && Array.isArray(answer)) items.push(...answer)
    })
    return items
  }

  const inferCourse = (): string => {
    const goalAnswers = extractFromAnswers('goals')
    const interestAnswers = extractFromAnswers('interests')
    const allAnswers = [...goalAnswers, ...interestAnswers]

    const courseMap: Record<Stream, Record<string, string>> = {
      Engineering: {
        'Artificial Intelligence': 'B.Tech in AI & ML',
        'Web & Mobile': 'B.Tech in Computer Science',
        'Data Science': 'B.Tech in Data Science',
        'Cybersecurity': 'B.Tech in Cybersecurity',
        'Robotics': 'B.Tech in Robotics & Automation',
        default: 'B.Tech / BE'
      },
      Arts: {
        'Journalism': 'BA Mass Communication / Journalism',
        'Design': 'B.Des in Graphic Design',
        'Psychology': 'BA / BSc Psychology',
        'Teacher': 'BA + B.Ed',
        'Film': 'BA Film Studies / Mass Communication',
        default: 'BA (Hons) in your area of interest'
      },
      Commerce: {
        'Chartered': 'CA (Chartered Accountancy)',
        'Investment Banking': 'BBA + MBA Finance',
        'Marketing': 'BBA in Marketing / MBA Marketing',
        'Entrepreneur': 'BBA / MBA Entrepreneurship',
        default: 'B.Com / BBA + MBA'
      },
      Medical: {
        'Doctor': 'MBBS',
        'Dentist': 'BDS',
        'Pharmacist': 'B.Pharm / M.Pharm',
        'Nurse': 'BSc Nursing',
        'Biomedical': 'BSc Biomedical Science',
        default: 'MBBS / BAMS / BHMS'
      },
      Law: {
        'Corporate': 'BA LLB / BBA LLB (Corporate Law)',
        'Criminal': 'BA LLB (Criminal Law)',
        'Judge': 'LLB + Judiciary Exam Prep',
        'Human Rights': 'BA LLB + LLM in Human Rights',
        default: 'BA LLB / BBA LLB (5-year Integrated)'
      },
      Agri: {
        'Horticulture': 'B.Sc Horticulture',
        'Food': 'B.Tech Food Technology',
        'Forestry': 'B.Sc Forestry',
        'Fisheries': 'B.F.Sc Fisheries Science',
        'Engineering': 'B.Tech Agricultural Engineering',
        'Veterinary': 'B.V.Sc & AH (Veterinary)',
        default: 'B.Sc Agriculture (4-year)'
      }
    }

    if (!selectedStream) return 'Suitable undergraduate course'
    const streamCourses = courseMap[selectedStream]
    for (const keyword of Object.keys(streamCourses)) {
      if (keyword !== 'default' && allAnswers.some(a => a.includes(keyword))) return streamCourses[keyword]
    }
    return streamCourses.default
  }

  const inferDomain = (): string => {
    const interestAnswers = extractFromAnswers('interests')
    const goalAnswers = extractFromAnswers('goals')
    const combined = [...interestAnswers, ...goalAnswers].join(' ')

    if (combined.includes('AI') || combined.includes('Machine Learning')) return 'Artificial Intelligence & Machine Learning'
    if (combined.includes('Web') || combined.includes('Mobile') || combined.includes('Software')) return 'Software Development'
    if (combined.includes('Data')) return 'Data Science & Analytics'
    if (combined.includes('Marketing')) return 'Digital Marketing'
    if (combined.includes('Finance') || combined.includes('Investment')) return 'Finance & Investment Banking'
    if (combined.includes('Design')) return 'Design & Creative Arts'
    if (combined.includes('Medicine') || combined.includes('Doctor') || combined.includes('MBBS')) return 'Clinical Medicine'
    if (combined.includes('Law') || combined.includes('Legal')) return 'Legal Practice'
    if (combined.includes('Research')) return 'Academic Research'
    if (combined.includes('Entrepreneur')) return 'Entrepreneurship & Startups'
    if (combined.includes('Agronomy') || combined.includes('Soil') || combined.includes('Crop')) return 'Agronomy & Crop Sciences'
    if (combined.includes('Horticulture') || combined.includes('Floriculture')) return 'Horticulture & Floriculture'
    if (combined.includes('Food') || combined.includes('Food Tech')) return 'Food Science & Technology'
    if (combined.includes('Forestry') || combined.includes('Wildlife')) return 'Forestry & Environmental Sciences'
    if (combined.includes('Fisheries') || combined.includes('Aquaculture')) return 'Fisheries & Aquaculture'
    if (combined.includes('Veterinary')) return 'Veterinary Sciences'
    return `${selectedStream} — explore specializations based on your interests`
  }

  const buildFallbackResult = (): QuizResult => ({
    careerPath: `${selectedStream} Professional`,
    score: 82,
    recommendedCourse: inferCourse(),
    recommendedDomain: inferDomain(),
    interests: extractFromAnswers('interests').slice(0, 4),
    skills: extractFromAnswers('skills').slice(0, 4),
    description: `Based on your ${selectedStream} stream selections, we've identified a personalized career path that aligns with your interests and strengths.`,
    relatedCareers: [],
    averageSalary: '₹4L – ₹15L / year',
    growthProspect: 'High growth potential',
    exploreStream: selectedStream || ''
  })

  const restartQuiz = () => {
    setView('stream-select')
    setSelectedStream(null)
    setCurrentQuestion(0)
    setAnswers({})
    setResult(null)
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
  const getScoreColor = (s: number) => s >= 80 ? 'text-green-400' : s >= 60 ? 'text-yellow-400' : 'text-orange-400'
  const getScoreBg = (s: number) => s >= 80 ? 'from-green-500/20 to-emerald-500/20' : s >= 60 ? 'from-yellow-500/20 to-amber-500/20' : 'from-orange-500/20 to-red-500/20'
  const streamInfo = STREAMS.find(s => s.id === selectedStream)

  // ── Loading State ──
  if (loading) {
    return (
      <div className="min-h-screen bg-space-dark flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 border-4 border-neon-cyan border-t-transparent rounded-full mx-auto mb-4"
          />
          <h2 className="text-2xl font-bold text-white mb-2">Analyzing Your Responses...</h2>
          <p className="text-gray-400">Our AI is finding your best course and career match</p>
        </div>
      </div>
    )
  }

  // ── Results View ──
  if (view === 'results' && result) {
    const streamObj = STREAMS.find(s => s.id === result.exploreStream as Stream)
    return (
      <div className="min-h-screen bg-space-dark relative overflow-hidden py-20">
        <div className="absolute inset-0 opacity-10"><div className="grid-bg" /></div>
        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 bg-gradient-to-r from-neon-cyan to-neon-pink rounded-full flex items-center justify-center">
                <Target className="w-10 h-10 text-space-dark" />
              </div>
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">Your Career Match Results!</h1>
            <p className="text-gray-400 mb-4">Based on your <span className={`font-semibold ${streamObj?.color}`}>{result.exploreStream}</span> stream assessment</p>
            <div className="flex items-center justify-center space-x-2 text-neon-cyan">
              <Star className="w-6 h-6 fill-current" />
              <span className="text-2xl font-bold">{result.score}% Match</span>
              <Star className="w-6 h-6 fill-current" />
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* ── Left: Career + Course Details ── */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="glass-card p-8 rounded-2xl">
              <h2 className="text-3xl font-bold text-white mb-2">{result.careerPath}</h2>
              <p className="text-gray-300 mb-6 leading-relaxed">{result.description}</p>

              {/* Recommended Course + Domain */}
              <div className="space-y-4 mb-6">
                <div className="bg-gradient-to-r from-neon-cyan/10 to-neon-purple/10 border border-neon-cyan/30 rounded-xl p-4">
                  <div className="flex items-center space-x-2 mb-1">
                    <BookOpen className="w-5 h-5 text-neon-cyan" />
                    <span className="text-sm font-semibold text-neon-cyan uppercase tracking-wide">Recommended Course</span>
                  </div>
                  <p className="text-white font-bold text-lg">{result.recommendedCourse}</p>
                </div>
                <div className="bg-gradient-to-r from-neon-purple/10 to-neon-pink/10 border border-neon-purple/30 rounded-xl p-4">
                  <div className="flex items-center space-x-2 mb-1">
                    <Target className="w-5 h-5 text-neon-purple" />
                    <span className="text-sm font-semibold text-neon-purple uppercase tracking-wide">Best-fit Domain</span>
                  </div>
                  <p className="text-white font-bold text-lg">{result.recommendedDomain}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-black/20 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <BarChart3 className="w-5 h-5 text-neon-cyan" />
                    <span className="text-sm font-medium text-gray-300">Salary Range</span>
                  </div>
                  <p className="text-neon-cyan font-bold text-sm">{result.averageSalary}</p>
                </div>
                <div className="bg-black/20 p-4 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-neon-pink" />
                    <span className="text-sm font-medium text-gray-300">Growth</span>
                  </div>
                  <p className="text-neon-pink font-bold text-sm">{result.growthProspect}</p>
                </div>
              </div>

              {result.interests.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white mb-3">Key Skills to Build</h3>
                  <div className="flex flex-wrap gap-2">
                    {result.interests.slice(0, 6).map((item, i) => (
                      <span key={i} className="px-3 py-1 bg-neon-cyan/20 text-neon-cyan text-sm rounded-full border border-neon-cyan/30">{item}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button onClick={restartQuiz} className="flex-1 py-3 px-4 border border-gray-600 text-gray-300 rounded-lg hover:border-neon-cyan hover:text-neon-cyan transition-all">
                  Retake Quiz
                </button>
                <button onClick={() => router.push('/dashboard')} className="flex-1 py-3 px-4 bg-gradient-to-r from-neon-cyan to-neon-pink text-space-dark font-semibold rounded-lg hover:opacity-90 transition-all">
                  Go to Dashboard
                </button>
              </div>
            </motion.div>

            {/* ── Right: Explore Colleges ── */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }} className="flex flex-col gap-6">
              {/* Explore colleges CTA */}
              <div className="glass-card p-6 rounded-2xl border border-neon-cyan/20">
                <h3 className="text-xl font-bold text-white mb-3 flex items-center">
                  <Sparkles className="w-6 h-6 mr-2 text-neon-cyan" />
                  Explore {result.exploreStream} Colleges
                </h3>
                <p className="text-gray-300 text-sm mb-4 leading-relaxed">
                  Find the best colleges in India offering <strong className="text-white">{result.recommendedCourse}</strong> and similar programs in the {result.exploreStream} stream.
                </p>
                <Link href={`/colleges?stream=${encodeURIComponent(result.exploreStream)}`}>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-3 px-4 bg-gradient-to-r from-neon-cyan to-neon-purple text-space-dark font-bold rounded-xl flex items-center justify-center space-x-2 hover:opacity-90 transition-all"
                  >
                    <ExternalLink className="w-5 h-5" />
                    <span>Explore {result.exploreStream} Colleges</span>
                  </motion.button>
                </Link>
              </div>

              {/* Related Careers */}
              {result.relatedCareers.length > 0 && (
                <div className="glass-card p-6 rounded-2xl">
                  <h3 className="text-xl font-bold text-white mb-4">Alternative Career Paths</h3>
                  <p className="text-gray-400 text-xs mb-3">Click "Get Roadmap" to generate an AI career roadmap for any path below.</p>
                  <div className="space-y-2">
                    {result.relatedCareers.slice(0, 5).map((career, i) => (
                      <div key={i} className="flex items-center justify-between py-2 px-3 bg-black/20 rounded-lg">
                        <span className="text-gray-300 text-sm">{career}</span>
                        <Link href={`/ai-roadmap?career=${encodeURIComponent(career)}`}>
                          <span className="text-neon-pink hover:text-neon-cyan transition-colors text-xs cursor-pointer font-semibold">Get Roadmap →</span>
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Stream badges */}
              <div className="glass-card p-6 rounded-2xl">
                <h3 className="text-lg font-bold text-white mb-3">Your Strengths</h3>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Stream', value: result.exploreStream },
                    { label: 'Match Score', value: `${result.score}%` },
                    { label: 'Course', value: result.recommendedCourse.split('(')[0].trim() },
                    { label: 'Domain', value: result.recommendedDomain.split('&')[0].trim() }
                  ].map((item, i) => (
                    <div key={i} className="bg-black/20 rounded-lg p-3 text-center">
                      <div className="text-gray-400 text-xs mb-1">{item.label}</div>
                      <div className="text-white text-sm font-semibold truncate">{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>

          <div className="text-center">
            <button onClick={() => setView('landing')} className="text-gray-400 hover:text-white transition-colors">← Back to Quiz Hub</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Stream Selection View ──
  if (view === 'stream-select') {
    return (
      <div className="min-h-screen bg-space-dark relative overflow-hidden py-20">
        <div className="absolute inset-0 opacity-10"><div className="grid-bg" /></div>
        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
            <h1 className="text-4xl font-bold text-white mb-3">Choose Your Stream</h1>
            <p className="text-gray-400 text-lg">Select the academic stream you're interested in — we'll ask relevant questions to find your best career match.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {STREAMS.map((stream, i) => {
              const Icon = stream.icon
              return (
                <motion.div
                  key={stream.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ scale: 1.03, y: -4 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => startQuiz(stream.id)}
                  className={`glass-card p-6 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-xl ${stream.bg}`}
                >
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-4 ${stream.bg} border ${stream.bg.split(' ')[0]}`}>
                    <Icon className={`w-8 h-8 ${stream.color}`} />
                  </div>
                  <h3 className={`text-xl font-bold mb-2 ${stream.color}`}>{stream.label}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{stream.description}</p>
                  <div className={`mt-4 flex items-center text-sm font-semibold ${stream.color}`}>
                    <span>Start Quiz</span>
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </div>
                </motion.div>
              )
            })}
          </div>

          <div className="text-center mt-8">
            <button onClick={() => setView('landing')} className="text-gray-400 hover:text-white transition-colors">← Back to Quiz Hub</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Quiz View ──
  if (view === 'quiz' && selectedStream) {
    const currentQ = questions[currentQuestion]
    const progress = ((currentQuestion + 1) / questions.length) * 100

    return (
      <div className="min-h-screen bg-space-dark relative overflow-hidden py-20">
        <div className="absolute inset-0 opacity-10"><div className="grid-bg" /></div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
            <div className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full border mb-4 ${streamInfo?.bg}`}>
              {streamInfo && <streamInfo.icon className={`w-4 h-4 ${streamInfo.color}`} />}
              <span className={`text-sm font-semibold ${streamInfo?.color}`}>{selectedStream} Stream</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Career Discovery Quiz</h1>
            <div className="flex items-center justify-center space-x-4 text-gray-400">
              <span>Question {currentQuestion + 1} of {questions.length}</span>
              <div className="w-2 h-2 bg-neon-cyan rounded-full" />
              <span>{Math.round(progress)}% Complete</span>
            </div>
          </motion.div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-800 rounded-full h-2 mb-8">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-r from-neon-cyan to-neon-pink h-2 rounded-full"
            />
          </div>

          {/* Question Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentQuestion}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="glass-card p-8 rounded-2xl mb-8"
            >
              <h2 className="text-2xl font-bold text-white mb-8 text-center">{currentQ.question}</h2>
              {currentQ.type === 'scale' && <ScaleQuestion question={currentQ} questionId={currentQ.id} answers={answers} onAnswer={handleAnswer} />}
              {currentQ.type === 'multiple_choice' && <MultipleChoiceQuestion question={currentQ} questionId={currentQ.id} answers={answers} onAnswer={handleAnswer} />}
              {currentQ.type === 'multi_select' && <MultiSelectQuestion question={currentQ} questionId={currentQ.id} answers={answers} onAnswer={handleAnswer} />}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex justify-between items-center">
            <button onClick={prevQuestion} disabled={currentQuestion === 0} className="flex items-center space-x-2 px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:border-neon-cyan hover:text-neon-cyan transition-all disabled:opacity-50 disabled:cursor-not-allowed">
              <ArrowLeft className="w-5 h-5" />
              <span>Previous</span>
            </button>
            <button onClick={nextQuestion} disabled={!answers[currentQ.id]} className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-neon-cyan to-neon-pink text-space-dark font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed">
              <span>{currentQuestion === questions.length - 1 ? 'Get My Results' : 'Next'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <div className="mt-8 text-center">
            <button onClick={() => setView('stream-select')} className="text-gray-400 hover:text-white transition-colors">← Change Stream</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Landing View ──
  return (
    <div className="min-h-screen bg-space-dark text-white relative overflow-hidden pt-16">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-transparent to-cyan-900/10" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-neon-cyan/5 to-neon-purple/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gradient-to-r from-neon-purple/5 to-neon-pink/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <motion.div
            animate={{ rotate: [0, 360], scale: [1, 1.1, 1] }}
            transition={{ rotate: { duration: 20, repeat: Infinity, ease: 'linear' }, scale: { duration: 2, repeat: Infinity } }}
            className="w-24 h-24 bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink rounded-full mx-auto flex items-center justify-center mb-6 relative overflow-hidden"
          >
            <Brain className="w-12 h-12 text-space-dark relative z-10" />
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse" />
          </motion.div>
          <h1 className="text-5xl md:text-6xl font-bold mb-4">
            <span className="bg-gradient-to-r from-neon-cyan via-neon-purple to-neon-pink bg-clip-text text-transparent">Career Quiz Hub</span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed">
            Discover your perfect course & career path with our stream-based AI assessment
          </p>
        </motion.div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
          <motion.div
            initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(0,255,255,0.2)' }}
            className="bg-gradient-to-br from-black/40 to-purple-900/20 backdrop-blur-sm rounded-2xl border border-neon-cyan/30 p-8 cursor-pointer group"
            onClick={() => setView('stream-select')}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="w-16 h-16 bg-gradient-to-r from-neon-cyan to-neon-purple rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Play className="w-8 h-8 text-space-dark" />
              </div>
              <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-neon-cyan transition-colors" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-neon-cyan transition-colors">Start New Assessment</h3>
            <p className="text-gray-300 mb-4 leading-relaxed">Choose your stream and get personalized course & domain recommendations powered by AI.</p>
            <div className="flex items-center text-neon-cyan">
              <Sparkles className="w-5 h-5 mr-2" />
              <span className="font-semibold">Stream-based AI Analysis</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}
            whileHover={{ scale: 1.02, boxShadow: '0 20px 40px rgba(147,51,234,0.2)' }}
            className="bg-gradient-to-br from-black/40 to-purple-900/20 backdrop-blur-sm rounded-2xl border border-neon-purple/30 p-8 cursor-pointer group"
          >
            <Link href="/quiz/past-results" className="block">
              <div className="flex items-center justify-between mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-neon-purple to-neon-pink rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <History className="w-8 h-8 text-space-dark" />
                </div>
                <ArrowRight className="w-6 h-6 text-gray-400 group-hover:text-neon-purple transition-colors" />
              </div>
              <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-neon-purple transition-colors">View Quiz History</h3>
              <p className="text-gray-300 mb-4 leading-relaxed">Track your assessment history and see how your career matches have evolved over time.</p>
              <div className="flex items-center text-neon-purple">
                <Award className="w-5 h-5 mr-2" />
                <span className="font-semibold">{pastQuizzes.length} Quiz{pastQuizzes.length !== 1 ? 'es' : ''} Completed</span>
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Stream Preview */}
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Available Streams</h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {STREAMS.map((stream, i) => {
              const Icon = stream.icon
              return (
                <motion.div
                  key={stream.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + i * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                  onClick={() => { setView('stream-select') }}
                  className={`bg-black/20 border rounded-xl p-4 text-center cursor-pointer transition-all hover:shadow-lg ${stream.bg}`}
                >
                  <Icon className={`w-8 h-8 mx-auto mb-2 ${stream.color}`} />
                  <p className={`text-xs font-semibold ${stream.color}`}>{stream.label.split('&')[0].trim()}</p>
                </motion.div>
              )
            })}
          </div>
        </motion.div>

        {/* Recent Results */}
        {!loadingPast && pastQuizzes.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 50 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Clock className="w-6 h-6 mr-3 text-neon-cyan" />
              Recent Results
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              {pastQuizzes.slice(0, 3).map((quiz, i) => (
                <motion.div key={quiz.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9 + i * 0.1 }} className="bg-black/20 backdrop-blur-sm rounded-xl border border-white/10 p-4 hover:border-neon-cyan/50 transition-colors">
                  <Link href="/quiz/past-results" className="block">
                    <div className="flex justify-between items-start mb-3">
                      <div className={`bg-gradient-to-r ${getScoreBg(quiz.score)} px-2 py-1 rounded-lg`}>
                        <span className={`text-xs font-bold ${getScoreColor(quiz.score)}`}>{quiz.score}%</span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                    <h4 className="font-semibold text-white mb-2">{quiz.career_path}</h4>
                    <div className="flex items-center text-gray-400 text-sm">
                      <Calendar className="w-3 h-3 mr-1" />
                      {formatDate(quiz.created_at)}
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const ScaleQuestion = ({ question, questionId, answers, onAnswer }: any) => {
  const value = answers[questionId] ?? 5
  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <input
          type="range" min="1" max="10" value={value}
          onChange={e => onAnswer(questionId, parseInt(e.target.value))}
          className="w-full max-w-md h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
          style={{ background: `linear-gradient(to right, #00FFFF 0%, #00FFFF ${value * 10}%, #374151 ${value * 10}%, #374151 100%)` }}
        />
      </div>
      <div className="flex justify-between text-sm text-gray-400 max-w-md mx-auto">
        <span>1 (Low)</span>
        <span className="text-neon-cyan font-bold text-lg">{value}</span>
        <span>10 (High)</span>
      </div>
    </div>
  )
}

const MultipleChoiceQuestion = ({ question, questionId, answers, onAnswer }: any) => {
  const selected = answers[questionId] || ''
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {question.options?.map((option: string, i: number) => (
        <motion.button
          key={i} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={() => onAnswer(questionId, option)}
          className={`p-4 rounded-lg border text-left transition-all ${selected === option ? 'border-neon-cyan bg-neon-cyan/10 text-white' : 'border-gray-600 bg-black/20 text-gray-300 hover:border-gray-500'}`}
        >
          <div className="flex items-center space-x-3">
            <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${selected === option ? 'border-neon-cyan bg-neon-cyan' : 'border-gray-500'}`}>
              {selected === option && <CheckCircle className="w-4 h-4 text-space-dark" />}
            </div>
            <span>{option}</span>
          </div>
        </motion.button>
      ))}
    </div>
  )
}

const MultiSelectQuestion = ({ question, questionId, answers, onAnswer }: any) => {
  const selected: string[] = answers[questionId] || []
  const toggle = (option: string) => {
    const next = selected.includes(option) ? selected.filter(i => i !== option) : [...selected, option]
    onAnswer(questionId, next)
  }
  return (
    <div>
      <p className="text-gray-400 text-sm mb-4">Select all that apply:</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {question.options?.map((option: string, i: number) => (
          <motion.button
            key={i} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => toggle(option)}
            className={`p-3 rounded-lg border text-left transition-all ${selected.includes(option) ? 'border-neon-cyan bg-neon-cyan/10 text-white' : 'border-gray-600 bg-black/20 text-gray-300 hover:border-gray-500'}`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-4 h-4 rounded border-2 flex-shrink-0 ${selected.includes(option) ? 'border-neon-cyan bg-neon-cyan' : 'border-gray-500'}`}>
                {selected.includes(option) && <CheckCircle className="w-4 h-4 text-space-dark" />}
              </div>
              <span className="text-sm">{option}</span>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  )
}