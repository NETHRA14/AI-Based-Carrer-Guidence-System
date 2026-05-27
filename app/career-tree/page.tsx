'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, Info, ArrowLeft, Zap, Star, BookOpen, TrendingUp } from 'lucide-react'
import dynamic from 'next/dynamic'
import Link from 'next/link'

const CareerTree3D = dynamic(() => import('@/components/CareerTree3D'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-96 flex items-center justify-center bg-glass-bg rounded-2xl">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-neon-cyan border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-300">Loading 3D Career Tree...</p>
      </div>
    </div>
  )
})

interface CareerData {
  name: string
  category: string
  emoji: string
  description: string
  averageSalary: string
  growthRate: string
  education: string[]
  skills: string[]
  relatedCareers: string[]
  keyActivities: string[]
  workEnvironment: string
}

// ─── Career Database with all Streams ─────────────────────────────────────────

const careerDatabase: Record<string, CareerData> = {

  // ── MEDICAL ──
  'Doctor (MBBS)': {
    name: 'Doctor (MBBS)', category: 'Medical', emoji: '🩺',
    description: 'Diagnose and treat illnesses, injuries, and medical conditions in patients across all age groups.',
    averageSalary: '₹8L - ₹30L per year', growthRate: '15%',
    education: ['MBBS', 'MD/MS Specialisation', 'NEET PG'],
    skills: ['Clinical Diagnosis', 'Patient Care', 'Anatomy', 'Pharmacology', 'Communication', 'Decision Making'],
    relatedCareers: ['Surgeon', 'Pediatrician', 'Cardiologist', 'Psychiatrist', 'Radiologist'],
    keyActivities: ['Patient Consultation', 'Diagnosis', 'Treatment Planning', 'Prescribing', 'Follow-up Care'],
    workEnvironment: 'Hospitals, Clinics, Private Practice'
  },
  'Pharmacist': {
    name: 'Pharmacist', category: 'Medical', emoji: '💊',
    description: 'Dispense medications, counsel patients on drug usage and ensure safe medication practices.',
    averageSalary: '₹3L - ₹10L per year', growthRate: '10%',
    education: ['B.Pharm', 'M.Pharm', 'Pharm.D'],
    skills: ['Pharmacology', 'Drug Interactions', 'Patient Counselling', 'Inventory Management', 'Attention to Detail'],
    relatedCareers: ['Clinical Pharmacist', 'Drug Regulatory Affairs', 'Medical Representative', 'Hospital Pharmacist'],
    keyActivities: ['Dispensing Medicine', 'Patient Counselling', 'Drug Safety Monitoring', 'Inventory Management'],
    workEnvironment: 'Hospitals, Retail Pharmacies, Pharmaceutical Companies'
  },
  'Nurse': {
    name: 'Nurse', category: 'Medical', emoji: '🏥',
    description: 'Provide patient care, assist doctors, and coordinate healthcare services in medical settings.',
    averageSalary: '₹2.5L - ₹8L per year', growthRate: '18%',
    education: ['B.Sc Nursing', 'GNM', 'M.Sc Nursing'],
    skills: ['Patient Care', 'Clinical Skills', 'Empathy', 'Communication', 'Medical Procedures', 'Teamwork'],
    relatedCareers: ['ICU Nurse', 'Midwife', 'Nurse Practitioner', 'Surgical Nurse', 'Community Health Nurse'],
    keyActivities: ['Patient Monitoring', 'Medication Administration', 'Wound Care', 'Emergency Response'],
    workEnvironment: 'Hospitals, Clinics, Home Healthcare'
  },

  // ── ENGINEERING ──
  'Software Engineer': {
    name: 'Software Engineer', category: 'Engineering', emoji: '💻',
    description: 'Design, develop, and maintain software applications and systems using programming languages.',
    averageSalary: '₹5L - ₹40L per year', growthRate: '22%',
    education: ['B.Tech Computer Science', 'B.E IT', 'MCA'],
    skills: ['Programming', 'Algorithms', 'Data Structures', 'System Design', 'Problem Solving', 'Version Control'],
    relatedCareers: ['Full Stack Developer', 'Backend Developer', 'DevOps Engineer', 'Mobile Developer', 'AI Engineer'],
    keyActivities: ['Code Development', 'System Design', 'Bug Fixing', 'Code Review', 'Testing', 'Documentation'],
    workEnvironment: 'Office or Remote, Collaborative Team Environment'
  },
  'Mechanical Engineer': {
    name: 'Mechanical Engineer', category: 'Engineering', emoji: '⚙️',
    description: 'Design, analyze and manufacture mechanical systems, machines, and industrial equipment.',
    averageSalary: '₹4L - ₹18L per year', growthRate: '9%',
    education: ['B.Tech Mechanical', 'B.E Mechanical', 'M.Tech'],
    skills: ['CAD/CAM', 'Thermodynamics', 'Fluid Mechanics', 'Materials Science', 'Manufacturing', 'Problem Solving'],
    relatedCareers: ['Automotive Engineer', 'Aerospace Engineer', 'Manufacturing Engineer', 'Robotics Engineer'],
    keyActivities: ['Design & Drafting', 'Simulation', 'Prototyping', 'Testing', 'Quality Control'],
    workEnvironment: 'Manufacturing Plants, R&D Labs, Construction Sites'
  },
  'Civil Engineer': {
    name: 'Civil Engineer', category: 'Engineering', emoji: '🏗️',
    description: 'Plan, design and oversee construction of infrastructure like roads, bridges, dams and buildings.',
    averageSalary: '₹4L - ₹15L per year', growthRate: '12%',
    education: ['B.Tech Civil', 'B.E Civil', 'M.Tech Structural'],
    skills: ['Structural Analysis', 'AutoCAD', 'Project Management', 'Surveying', 'Soil Mechanics', 'Building Codes'],
    relatedCareers: ['Structural Engineer', 'Urban Planner', 'Environmental Engineer', 'Construction Manager'],
    keyActivities: ['Site Surveys', 'Design', 'Construction Supervision', 'Quality Inspection', 'Project Planning'],
    workEnvironment: 'Construction Sites, Government Offices, Consultancy Firms'
  },
  'Data Scientist': {
    name: 'Data Scientist', category: 'Engineering', emoji: '📊',
    description: 'Analyze large datasets to extract insights and build predictive models using machine learning.',
    averageSalary: '₹8L - ₹35L per year', growthRate: '31%',
    education: ['B.Tech CS/IT', 'M.Tech AI/ML', 'B.Sc Statistics'],
    skills: ['Python/R', 'Machine Learning', 'Statistics', 'Data Visualization', 'SQL', 'Deep Learning'],
    relatedCareers: ['ML Engineer', 'Data Analyst', 'AI Researcher', 'Business Intelligence Analyst'],
    keyActivities: ['Data Analysis', 'Model Building', 'Visualization', 'Research', 'Reporting'],
    workEnvironment: 'Tech Companies, Banks, Research Institutes, Startups'
  },

  // ── COMMERCE ──
  'Chartered Accountant': {
    name: 'Chartered Accountant', category: 'Commerce', emoji: '📋',
    description: 'Manage financial accounts, auditing, taxation and provide financial advice to businesses and individuals.',
    averageSalary: '₹7L - ₹40L per year', growthRate: '11%',
    education: ['CA Foundation', 'CA Intermediate', 'CA Final (ICAI)'],
    skills: ['Accounting', 'Auditing', 'Taxation', 'Financial Reporting', 'GST', 'Corporate Law'],
    relatedCareers: ['Tax Consultant', 'Financial Auditor', 'CFO', 'Cost Accountant', 'Internal Auditor'],
    keyActivities: ['Auditing', 'Tax Filing', 'Financial Analysis', 'Client Advisory', 'Compliance Review'],
    workEnvironment: 'CA Firms, Corporates, Banks, Private Practice'
  },
  'Investment Banker': {
    name: 'Investment Banker', category: 'Commerce', emoji: '🏦',
    description: 'Help organisations raise capital through IPOs, mergers, acquisitions, and financial advisory services.',
    averageSalary: '₹10L - ₹60L per year', growthRate: '8%',
    education: ['B.Com', 'MBA Finance', 'CFA'],
    skills: ['Financial Modeling', 'Valuation', 'Capital Markets', 'Excel', 'Negotiation', 'Research'],
    relatedCareers: ['Equity Analyst', 'Portfolio Manager', 'Credit Analyst', 'Risk Manager'],
    keyActivities: ['Deal Sourcing', 'Financial Modeling', 'Due Diligence', 'Client Pitching', 'Negotiations'],
    workEnvironment: 'Investment Banks, Financial Services Firms'
  },
  'Marketing Manager': {
    name: 'Marketing Manager', category: 'Commerce', emoji: '📣',
    description: 'Plan and execute marketing strategies to promote products, build brand awareness and drive sales.',
    averageSalary: '₹5L - ₹20L per year', growthRate: '19%',
    education: ['BBA Marketing', 'MBA Marketing', 'B.Com'],
    skills: ['Digital Marketing', 'Brand Management', 'SEO/SEM', 'Analytics', 'Content Strategy', 'Leadership'],
    relatedCareers: ['Brand Manager', 'Digital Marketing Specialist', 'Product Marketing Manager', 'PR Manager'],
    keyActivities: ['Campaign Planning', 'Content Creation', 'Market Research', 'Performance Analysis'],
    workEnvironment: 'Corporates, Advertising Agencies, FMCG Companies'
  },
  'Entrepreneur': {
    name: 'Entrepreneur', category: 'Commerce', emoji: '🚀',
    description: 'Start and grow a business from scratch, managing strategy, operations, and team leadership.',
    averageSalary: 'Variable (₹0 - Crores)', growthRate: 'Dynamic',
    education: ['BBA', 'MBA', 'Any Degree + Skill Set'],
    skills: ['Leadership', 'Business Planning', 'Finance', 'Marketing', 'Risk Taking', 'Networking'],
    relatedCareers: ['Startup Founder', 'Business Consultant', 'Venture Capitalist', 'Freelancer'],
    keyActivities: ['Business Planning', 'Fundraising', 'Team Building', 'Product Development', 'Sales'],
    workEnvironment: 'Own Office, Co-working Space, Remote'
  },

  // ── ARTS ──
  'Journalist': {
    name: 'Journalist', category: 'Arts', emoji: '🎙️',
    description: 'Research, investigate and report news stories for print, broadcast, and digital media platforms.',
    averageSalary: '₹3L - ₹15L per year', growthRate: '6%',
    education: ['BA Journalism', 'MA Mass Communication', 'BJMC'],
    skills: ['Writing', 'Interviewing', 'Research', 'Photography', 'Editing', 'Communication'],
    relatedCareers: ['News Anchor', 'Editor', 'Photojournalist', 'Content Writer', 'PR Specialist'],
    keyActivities: ['Reporting', 'Writing Articles', 'Interviewing', 'Fact Checking', 'Broadcasting'],
    workEnvironment: 'Media Houses, News Channels, Magazines, Freelance'
  },
  'Psychologist': {
    name: 'Psychologist', category: 'Arts', emoji: '🧠',
    description: 'Study human behaviour, mental health, and provide counselling or therapy to individuals and groups.',
    averageSalary: '₹4L - ₹15L per year', growthRate: '22%',
    education: ['BA/BSc Psychology', 'MA Psychology', 'RCI Certification'],
    skills: ['Counselling', 'Empathy', 'Research', 'Listening', 'Assessment', 'Communication'],
    relatedCareers: ['Clinical Psychologist', 'Counsellor', 'School Psychologist', 'HR Specialist', 'Neuropsychologist'],
    keyActivities: ['Therapy Sessions', 'Assessment', 'Research', 'Report Writing', 'Group Counselling'],
    workEnvironment: 'Hospitals, Schools, Corporates, Private Practice'
  },
  'Graphic Designer': {
    name: 'Graphic Designer', category: 'Arts', emoji: '🎨',
    description: 'Create visual content for brands, digital media, and print using design tools and creative skills.',
    averageSalary: '₹3L - ₹12L per year', growthRate: '16%',
    education: ['B.Des', 'BFA', 'Diploma in Graphic Design'],
    skills: ['Adobe Suite', 'Typography', 'Color Theory', 'Branding', 'UI Design', 'Creativity'],
    relatedCareers: ['UI/UX Designer', 'Illustrator', 'Motion Designer', 'Art Director', 'Brand Designer'],
    keyActivities: ['Visual Design', 'Branding', 'Layout Creation', 'Client Consultation', 'Revision'],
    workEnvironment: 'Design Studios, Ad Agencies, Corporates, Freelance'
  },
  'Teacher / Professor': {
    name: 'Teacher / Professor', category: 'Arts', emoji: '📚',
    description: 'Educate and mentor students at school or college level in academic subjects and life skills.',
    averageSalary: '₹3L - ₹15L per year', growthRate: '10%',
    education: ['B.Ed', 'MA in Subject', 'PhD (for Professor)', 'NET/SET'],
    skills: ['Communication', 'Subject Knowledge', 'Patience', 'Curriculum Design', 'Mentoring', 'Research'],
    relatedCareers: ['School Principal', 'Curriculum Developer', 'Academic Counsellor', 'Online Educator', 'Tutor'],
    keyActivities: ['Teaching', 'Lesson Planning', 'Assessment', 'Student Mentoring', 'Research'],
    workEnvironment: 'Schools, Colleges, Universities, Online Platforms'
  },

  // ── AGRICULTURE ──
  'Agronomist': {
    name: 'Agronomist', category: 'Agriculture', emoji: '🌾',
    description: 'Study crop science and soil management to improve agricultural productivity and sustainability.',
    averageSalary: '₹3L - ₹10L per year', growthRate: '8%',
    education: ['B.Sc Agriculture', 'M.Sc Agronomy', 'Ph.D'],
    skills: ['Crop Science', 'Soil Fertility', 'Pest Management', 'Irrigation', 'Research', 'Field Analysis'],
    relatedCareers: ['Soil Scientist', 'Crop Consultant', 'Plant Breeder', 'Agricultural Officer', 'Farm Manager'],
    keyActivities: ['Soil Testing', 'Crop Monitoring', 'Research Trials', 'Advisory Services', 'Field Surveys'],
    workEnvironment: 'Farms, Research Stations, Government Agriculture Departments'
  },
  'Agricultural Engineer': {
    name: 'Agricultural Engineer', category: 'Agriculture', emoji: '🚜',
    description: 'Design and develop machinery, irrigation systems, and technology for modern farming operations.',
    averageSalary: '₹4L - ₹12L per year', growthRate: '11%',
    education: ['B.Tech Agricultural Engineering', 'B.E Agri Engg'],
    skills: ['Machine Design', 'Irrigation Engineering', 'Precision Farming', 'CAD', 'Soil Science', 'Agri-Tech'],
    relatedCareers: ['Farm Equipment Designer', 'Irrigation Specialist', 'Precision Farming Expert', 'Agri-Tech Developer'],
    keyActivities: ['Equipment Design', 'Irrigation Planning', 'Technology Testing', 'Field Implementation'],
    workEnvironment: 'Agri-industry Firms, Government, Machinery Companies'
  },
  'Food Technologist': {
    name: 'Food Technologist', category: 'Agriculture', emoji: '🍎',
    description: 'Develop and improve food products, ensure food safety standards and manage food processing systems.',
    averageSalary: '₹3.5L - ₹12L per year', growthRate: '14%',
    education: ['B.Sc Food Technology', 'M.Sc Food Science', 'B.Tech Food Tech'],
    skills: ['Food Processing', 'Quality Control', 'Microbiology', 'Nutrition', 'R&D', 'FSSAI Regulations'],
    relatedCareers: ['Quality Assurance Manager', 'Nutritionist', 'Product Developer', 'Food Safety Officer'],
    keyActivities: ['Product Development', 'Quality Testing', 'Research', 'Process Optimization', 'Compliance'],
    workEnvironment: 'Food Processing Companies, FMCG, Research Labs, Government'
  },

  // ── LAW ──
  'Advocate / Lawyer': {
    name: 'Advocate / Lawyer', category: 'Law', emoji: '⚖️',
    description: 'Represent clients in court, provide legal advice and draft legal documents for individuals and organizations.',
    averageSalary: '₹3L - ₹50L+ per year', growthRate: '14%',
    education: ['LLB (3-year)', 'BA LLB / BBA LLB (5-year)', 'LLM'],
    skills: ['Legal Research', 'Argumentation', 'Contract Drafting', 'Critical Thinking', 'Communication', 'Ethics'],
    relatedCareers: ['Criminal Lawyer', 'Corporate Lawyer', 'Public Prosecutor', 'Legal Advisor', 'Judge'],
    keyActivities: ['Court Appearances', 'Legal Research', 'Client Counselling', 'Document Drafting', 'Case Strategy'],
    workEnvironment: 'Courts, Law Firms, Corporates, Government Legal Departments'
  },
  'Corporate Legal Counsel': {
    name: 'Corporate Legal Counsel', category: 'Law', emoji: '🏢',
    description: 'Provide in-house legal expertise to corporations on compliance, contracts, and regulatory matters.',
    averageSalary: '₹8L - ₹40L per year', growthRate: '12%',
    education: ['LLB', 'LLM Corporate Law', 'BA LLB + MBA'],
    skills: ['Corporate Law', 'Contract Negotiation', 'Compliance', 'Mergers & Acquisitions', 'IPR', 'Risk Assessment'],
    relatedCareers: ['Company Secretary', 'Compliance Officer', 'Legal Analyst', 'IP Lawyer', 'Contract Manager'],
    keyActivities: ['Contract Review', 'Compliance Audits', 'M&A Support', 'Legal Risk Assessment', 'Advisory'],
    workEnvironment: 'Corporate Headquarters, MNCs, Startups'
  },
  'Judge / Judicial Officer': {
    name: 'Judge / Judicial Officer', category: 'Law', emoji: '🔨',
    description: 'Preside over court proceedings, interpret laws, evaluate evidence and deliver judgements.',
    averageSalary: '₹6L - ₹25L per year (Government)', growthRate: 'Stable',
    education: ['LLB', 'Judicial Services Exam (State/Central)'],
    skills: ['Legal Interpretation', 'Impartiality', 'Critical Analysis', 'Judgement Writing', 'Constitutional Law'],
    relatedCareers: ['District Judge', 'High Court Judge', 'Magistrate', 'Tribunal Member', 'Arbitrator'],
    keyActivities: ['Hearing Cases', 'Evidence Evaluation', 'Judgement Writing', 'Legal Interpretation'],
    workEnvironment: 'District Courts, High Courts, Supreme Court, Tribunals'
  },
  'Legal Researcher / Academic': {
    name: 'Legal Researcher / Academic', category: 'Law', emoji: '📖',
    description: 'Conduct research on legal issues, publish papers, teach law at universities and advise policy makers.',
    averageSalary: '₹4L - ₹18L per year', growthRate: '10%',
    education: ['LLM', 'Ph.D Law', 'NET/SET'],
    skills: ['Legal Research', 'Academic Writing', 'Teaching', 'Policy Analysis', 'Critical Thinking'],
    relatedCareers: ['Law Professor', 'Policy Analyst', 'Legal Journalist', 'Think Tank Researcher', 'Moot Coach'],
    keyActivities: ['Research', 'Paper Writing', 'Teaching', 'Policy Advisory', 'Moot Court Coaching'],
    workEnvironment: 'Law Schools, Universities, Research Institutes, Think Tanks'
  },
}

// ─── Stream config for styling ─────────────────────────────────────────────────

const streamConfig: Record<string, { color: string; emoji: string }> = {
  Medical: { color: '#FF4C6E', emoji: '🩺' },
  Engineering: { color: '#00CFFF', emoji: '⚙️' },
  Commerce: { color: '#FFD700', emoji: '📊' },
  Arts: { color: '#C678FF', emoji: '🎨' },
  Agriculture: { color: '#56E39F', emoji: '🌾' },
  Law: { color: '#FF9F43', emoji: '⚖️' },
}

const categories = ['All', 'Medical', 'Engineering', 'Commerce', 'Arts', 'Agriculture', 'Law']

export default function CareerTreePage() {
  const [selectedCareer, setSelectedCareer] = useState<string>('Software Engineer')
  const [selectedCategory, setSelectedCategory] = useState<string>('All')
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [showInfo, setShowInfo] = useState<boolean>(true)

  const filteredCareers = Object.values(careerDatabase).filter(career => {
    const matchesCategory = selectedCategory === 'All' || career.category === selectedCategory
    const matchesSearch = career.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      career.skills.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesCategory && matchesSearch
  })

  const currentCareer = careerDatabase[selectedCareer] ?? careerDatabase['Software Engineer']

  return (
    <div className="min-h-screen bg-space-dark pt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Top Bar */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/" className="flex items-center space-x-2 text-gray-300 hover:text-neon-cyan transition-colors">
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Home</span>
          </Link>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="flex items-center space-x-2 px-4 py-2 bg-glass-bg border border-neon-cyan/20 rounded-lg text-neon-cyan hover:bg-neon-cyan/10 transition-all"
          >
            <Info className="w-4 h-4" />
            <span>{showInfo ? 'Hide' : 'Show'} Info</span>
          </button>
        </div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-pink">
              3D Career Tree
            </span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Explore career paths across all streams in an interactive 3D environment.
          </p>
        </motion.div>

        {/* Stream Filter Pills */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {categories.map(cat => {
            const cfg = streamConfig[cat]
            const isActive = selectedCategory === cat
            return (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat)
                  // Auto-select first career in that stream
                  if (cat !== 'All') {
                    const first = Object.values(careerDatabase).find(c => c.category === cat)
                    if (first) setSelectedCareer(first.name)
                  }
                }}
                className="px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border"
                style={{
                  backgroundColor: isActive ? (cfg?.color ?? '#ffffff') : 'transparent',
                  color: isActive ? '#000' : (cfg?.color ?? '#ffffff'),
                  borderColor: cfg?.color ?? '#ffffff',
                  boxShadow: isActive ? `0 0 12px ${cfg?.color ?? '#fff'}80` : 'none',
                }}
              >
                {cfg ? `${cfg.emoji} ${cat}` : '🌐 All Streams'}
              </button>
            )
          })}
        </div>

        {/* Search Bar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search careers or skills..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-glass-bg border border-glass-border rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-neon-cyan"
            />
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-400 bg-glass-bg border border-glass-border rounded-lg px-4 py-3">
            <Filter className="w-4 h-4" />
            <span>{filteredCareers.length} career{filteredCareers.length !== 1 ? 's' : ''} found</span>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Career List */}
          <div className="lg:col-span-1">
            <div className="glass-card p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <Zap className="w-5 h-5 text-neon-cyan mr-2" />
                Career Options ({filteredCareers.length})
              </h3>
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {filteredCareers.map((career) => {
                  const cfg = streamConfig[career.category]
                  const isSelected = selectedCareer === career.name
                  return (
                    <button
                      key={career.name}
                      onClick={() => setSelectedCareer(career.name)}
                      className="w-full text-left p-3 rounded-lg transition-all border"
                      style={{
                        backgroundColor: isSelected ? `${cfg?.color}20` : 'rgba(31,41,55,0.3)',
                        borderColor: isSelected ? `${cfg?.color}60` : 'transparent',
                        color: isSelected ? '#fff' : '#9ca3af',
                      }}
                    >
                      <div className="font-medium">{career.emoji} {career.name}</div>
                      <div className="text-xs mt-0.5 opacity-70"
                        style={{ color: isSelected ? cfg?.color : undefined }}>
                        {career.category}
                      </div>
                    </button>
                  )
                })}
                {filteredCareers.length === 0 && (
                  <p className="text-gray-500 text-sm text-center py-4">No careers found. Try a different search.</p>
                )}
              </div>
            </div>
          </div>

          {/* 3D View */}
          <div className="lg:col-span-2">
            <div className="glass-card p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                <Star className="w-5 h-5 text-neon-pink mr-2" />
                {currentCareer.emoji} {currentCareer.name} — Interactive View
                <span className="ml-2 text-sm font-normal px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: `${streamConfig[currentCareer.category]?.color}20`,
                    color: streamConfig[currentCareer.category]?.color
                  }}>
                  {currentCareer.category}
                </span>
              </h3>
              <CareerTree3D
                careerPath={currentCareer.name}
                relatedCareers={currentCareer.relatedCareers}
                skills={currentCareer.skills}
              />
            </div>
          </div>
        </div>

        {/* Career Details Panel */}
        <AnimatePresence>
          {showInfo && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mt-8 glass-card p-6"
            >
              <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
                <BookOpen className="w-6 h-6 text-neon-cyan mr-3" />
                {currentCareer.emoji} {currentCareer.name} — Details
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Overview */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-semibold text-neon-cyan mb-2">Overview</h4>
                    <p className="text-gray-300 text-sm leading-relaxed">{currentCareer.description}</p>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-neon-pink mb-2">Work Environment</h4>
                    <p className="text-gray-300 text-sm">{currentCareer.workEnvironment}</p>
                  </div>
                </div>

                {/* Financial Info */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-semibold text-neon-cyan mb-2 flex items-center">
                      <TrendingUp className="w-4 h-4 mr-1" /> Salary Range
                    </h4>
                    <p className="text-white font-medium">{currentCareer.averageSalary}</p>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-neon-pink mb-2">Growth Rate</h4>
                    <p className="text-white font-medium">{currentCareer.growthRate}</p>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-neon-purple mb-2">Education Required</h4>
                    <div className="flex flex-wrap gap-2">
                      {currentCareer.education.map((edu, i) => (
                        <span key={i} className="inline-block bg-gray-800/50 px-2 py-1 rounded text-xs text-gray-300">
                          {edu}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Skills & Activities */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-lg font-semibold text-neon-cyan mb-2">Key Skills</h4>
                    <div className="flex flex-wrap gap-2">
                      {currentCareer.skills.map((skill, i) => (
                        <span key={i} className="inline-block bg-neon-cyan/20 px-2 py-1 rounded text-xs text-neon-cyan">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-neon-pink mb-2">Key Activities</h4>
                    <div className="space-y-1">
                      {currentCareer.keyActivities.map((act, i) => (
                        <div key={i} className="text-gray-300 text-sm">• {act}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mt-12">
          <div className="glass-card p-8">
            <h3 className="text-2xl font-bold text-white mb-4">Ready to Explore Your Career Path?</h3>
            <p className="text-gray-300 mb-6">Take our career quiz to discover which path aligns with your interests and skills.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/quiz"
                className="px-6 py-3 bg-gradient-to-r from-neon-cyan to-neon-pink rounded-lg text-space-dark font-bold hover:shadow-lg hover:shadow-neon-cyan/25 transition-all">
                Take Career Quiz
              </Link>
              <Link href="/roadmap"
                className="px-6 py-3 bg-glass-bg border border-neon-cyan/30 rounded-lg text-neon-cyan hover:bg-neon-cyan/10 transition-all">
                Create Learning Path
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}