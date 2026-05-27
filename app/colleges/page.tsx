'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Filter,
  MapPin,
  Map as MapIcon,
  Grid3X3,
  SlidersHorizontal,
  X,
  Star,
  Loader
} from 'lucide-react'
import CollegeCard from '@/components/CollegeCard'
import dynamic from 'next/dynamic'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

// Dynamically import map components (Leaflet fallback)
const MapContainer = dynamic(() => import('react-leaflet').then(mod => mod.MapContainer), { ssr: false })
const TileLayer = dynamic(() => import('react-leaflet').then(mod => mod.TileLayer), { ssr: false })
const Marker = dynamic(() => import('react-leaflet').then(mod => mod.Marker), { ssr: false })
const Popup = dynamic(() => import('react-leaflet').then(mod => mod.Popup), { ssr: false })

// Google Maps (preferred if API key present)
const GoogleCollegesMap = dynamic(() => import('@/components/GoogleCollegesMap'), { ssr: false }) as any

interface College {
  id: string
  name: string
  shortName: string
  location: string
  state: string
  city: string
  ranking: number
  acceptanceRate: number
  tuition: string
  imageUrl: string
  programs: string[]
  averageGPA: string
  averageSAT: number
  description: string
  highlights: string[]
  campusSize: string
  studentPopulation: number
  isPublic: boolean
  website: string
  established: number
  fees: string
  cutoff: string
  rating: number
  type: string
  latitude: number
  longitude: number
  courses: string[]
  isSaved?: boolean
  distance?: number
}

// Mock college data - replace with real API
// @ts-ignore
const mockColleges: College[] = [
  {
    id: '1',
    name: 'Indian Institute of Technology Delhi',
    shortName: 'IIT Delhi',
    location: 'Hauz Khas, New Delhi',
    state: 'Delhi',
    city: 'New Delhi',
    type: 'Government',
    established: 1961,
    website: 'https://home.iitd.ac.in',
    courses: ['Computer Science', 'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering', 'Chemical Engineering'],
    programs: ['Computer Science', 'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering', 'Chemical Engineering'],
    rating: 4.8,
    fees: '₹2.5L - 3L',
    cutoff: 'JEE Rank 1-500',
    latitude: 28.5449,
    longitude: 77.1928,
    ranking: 2,
    acceptanceRate: 2,
    tuition: 'Low',
    imageUrl: 'https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=400',
    averageGPA: '9.5',
    averageSAT: 1580,
    description: 'IIT Delhi is one of the premier engineering institutions in India, known for excellence in technical education and research.',
    highlights: ['Top Engineering Program', 'Research Excellence', 'Industry Connections'],
    campusSize: 'Large',
    studentPopulation: 8000,
    isPublic: true
  },
  {
    id: '2',
    name: 'Birla Institute of Technology and Science',
    shortName: 'BITS Pilani',
    location: 'Pilani, Rajasthan',
    state: 'Rajasthan',
    city: 'Pilani',
    type: 'Private',
    established: 1964,
    website: 'https://www.bits-pilani.ac.in',
    courses: ['Computer Science', 'Electronics', 'Mechanical', 'Chemical', 'Biotechnology'],
    programs: ['Computer Science', 'Electronics', 'Mechanical', 'Chemical', 'Biotechnology'],
    rating: 4.6,
    fees: '₹4L - 5L',
    cutoff: 'BITSAT 350+',
    latitude: 28.3670,
    longitude: 75.5886,
    ranking: 30,
    acceptanceRate: 5,
    tuition: 'High',
    imageUrl: 'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=400',
    averageGPA: '8.5',
    averageSAT: 1480,
    description: 'BITS Pilani is a leading private technical university known for its innovative education and industry partnerships.',
    highlights: ['Industry Partnerships', 'Innovation Focus', 'High Placement Rates'],
    campusSize: 'Large',
    studentPopulation: 4000,
    isPublic: false
  },
  {
    id: '3',
    name: 'Delhi Technological University',
    shortName: 'DTU',
    location: 'Shahbad Daulatpur, Delhi',
    state: 'Delhi',
    city: 'New Delhi',
    type: 'Government',
    established: 1941,
    website: 'http://www.dtu.ac.in',
    courses: ['Computer Engineering', 'Information Technology', 'Electronics', 'Mechanical', 'Civil'],
    programs: ['Computer Engineering', 'Information Technology', 'Electronics', 'Mechanical', 'Civil'],
    rating: 4.4,
    fees: '₹1.5L - 2L',
    cutoff: 'JEE Rank 3000-8000',
    latitude: 28.7501,
    longitude: 77.1177,
    ranking: 58,
    acceptanceRate: 8,
    tuition: 'Low',
    imageUrl: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=400',
    averageGPA: '8.2',
    averageSAT: 1400,
    description: 'DTU is a leading government technical university in Delhi known for its quality engineering education.',
    highlights: ['Government College', 'Delhi Location', 'Good Placements'],
    campusSize: 'Large',
    studentPopulation: 7000,
    isPublic: true
  },
  {
    id: '4',
    name: 'Manipal Institute of Technology',
    shortName: 'MIT Manipal',
    location: 'Manipal, Karnataka',
    state: 'Karnataka',
    city: 'Manipal',
    type: 'Private',
    established: 1957,
    website: 'https://manipal.edu',
    courses: ['Computer Science', 'Information Technology', 'Mechanical', 'Aeronautical', 'Biomedical'],
    programs: ['Computer Science', 'Information Technology', 'Mechanical', 'Aeronautical', 'Biomedical'],
    rating: 4.3,
    fees: '₹3.5L - 4.5L',
    cutoff: 'MET Rank 1-5000',
    latitude: 13.3475,
    longitude: 74.7869,
    ranking: 45,
    acceptanceRate: 12,
    tuition: 'High',
    imageUrl: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=400',
    averageGPA: '8.0',
    averageSAT: 1380,
    description: 'MIT Manipal is a premier private engineering institute known for its comprehensive technical education.',
    highlights: ['Modern Infrastructure', 'Industry Connections', 'Research Focus'],
    campusSize: 'Large',
    studentPopulation: 6000,
    isPublic: false
  },
  {
    id: '5',
    name: 'Vellore Institute of Technology',
    shortName: 'VIT',
    location: 'Vellore, Tamil Nadu',
    state: 'Tamil Nadu',
    city: 'Vellore',
    type: 'Private',
    established: 1984,
    website: 'https://vit.ac.in',
    courses: ['Computer Science', 'Electronics', 'Biotechnology', 'Chemical', 'Mechanical'],
    programs: ['Computer Science', 'Biotechnology', 'Electronics'],
    rating: 4.2,
    fees: '₹2L - 3L',
    cutoff: 'VITEEE Rank 1-10000',
    latitude: 12.9716,
    longitude: 79.1588,
    ranking: 15,
    acceptanceRate: 15,
    tuition: 'Moderate',
    imageUrl: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=400',
    averageGPA: '8.0',
    averageSAT: 0,
    description: 'VIT is a leading private university known for engineering and technology programs.',
    highlights: ['Modern Campus', 'Global Tie-ups', 'Strong Placements'],
    campusSize: 'Large',
    studentPopulation: 35000,
    isPublic: false,
    isSaved: false
  },
  {
    id: '6',
    name: 'National Institute of Technology Trichy',
    shortName: 'NIT Trichy',
    location: 'Tiruchirappalli, Tamil Nadu',
    state: 'Tamil Nadu',
    city: 'Tiruchirappalli',
    type: 'Government',
    established: 1964,
    website: 'https://www.nitt.edu',
    courses: ['Computer Science', 'Electronics', 'Mechanical', 'Civil', 'Chemical'],
    programs: ['Computer Science', 'Electronics', 'Mechanical'],
    rating: 4.7,
    fees: '₹1.5L - 2L',
    cutoff: 'JEE Rank 800-3000',
    latitude: 10.7596,
    longitude: 78.8149,
    ranking: 8,
    acceptanceRate: 4,
    tuition: 'Low',
    imageUrl: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=400',
    averageGPA: '9.0',
    averageSAT: 0,
    description: 'NIT Trichy is one of the premier engineering institutions in India and the top NIT.',
    highlights: ['Top NIT', 'Excellent Placements', 'Rich Campus Life'],
    campusSize: 'Large',
    studentPopulation: 6000,
    isPublic: true,
    isSaved: false
  },
  {
    id: '7',
    name: 'All India Institute of Medical Sciences',
    shortName: 'AIIMS',
    location: 'Ansari Nagar, New Delhi',
    state: 'Delhi',
    city: 'New Delhi',
    type: 'Government',
    established: 1956,
    website: 'https://www.aiims.edu',
    courses: ['MBBS', 'MD', 'MS', 'Medical', 'Nursing'],
    programs: ['Medical', 'Nursing'],
    rating: 4.9,
    fees: '₹6,000 - 10,000',
    cutoff: 'NEET Rank 1-50',
    latitude: 28.5659,
    longitude: 77.2088,
    ranking: 1,
    acceptanceRate: 0.1,
    tuition: 'Low',
    imageUrl: 'https://images.unsplash.com/photo-1581595220892-0b2fbc456b3e?w=400',
    averageGPA: '9.8',
    averageSAT: 0,
    description: 'AIIMS New Delhi is a globally renowned public medical research university and hospital.',
    highlights: ['Top Medical College', 'Exceptional Clinical Exposure', 'Research Driven'],
    campusSize: 'Large',
    studentPopulation: 3000,
    isPublic: true,
    isSaved: false
  },
  {
    id: '8',
    name: 'National Law School of India University',
    shortName: 'NLSIU',
    location: 'Nagarbhavi, Bangalore',
    state: 'Karnataka',
    city: 'Bangalore',
    type: 'Government',
    established: 1986,
    website: 'https://www.nls.ac.in',
    courses: ['BA LLB', 'LLM', 'Law'],
    programs: ['Law'],
    rating: 4.9,
    fees: '₹2.5L - 3L',
    cutoff: 'CLAT Rank 1-60',
    latitude: 12.9716,
    longitude: 77.5946,
    ranking: 1,
    acceptanceRate: 2,
    tuition: 'Moderate',
    imageUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400',
    averageGPA: '9.0',
    averageSAT: 0,
    description: 'NLSIU Bangalore is the premier law university in India offering undergraduate and postgraduate legal education.',
    highlights: ['Top Law School in India', 'Moot Court Excellence', 'High Placements'],
    campusSize: 'Medium',
    studentPopulation: 1000,
    isPublic: true,
    isSaved: false
  },
  {
    id: '9',
    name: 'Shri Ram College of Commerce',
    shortName: 'SRCC',
    location: 'North Campus, Delhi',
    state: 'Delhi',
    city: 'New Delhi',
    type: 'Government',
    established: 1926,
    website: 'https://www.srcc.edu',
    courses: ['B.Com', 'BA Economics', 'Commerce'],
    programs: ['Commerce', 'Economics'],
    rating: 4.8,
    fees: '₹30,000',
    cutoff: 'CUET 99%ile',
    latitude: 28.6874,
    longitude: 77.2068,
    ranking: 1,
    acceptanceRate: 1,
    tuition: 'Low',
    imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400',
    averageGPA: '9.5',
    averageSAT: 0,
    description: 'SRCC is India\'s top college for Commerce and Economics, located in the Delhi University campus.',
    highlights: ['Best Commerce Faculty', 'Corporate Placements', 'Strong Alumni Network'],
    campusSize: 'Medium',
    studentPopulation: 2500,
    isPublic: true,
    isSaved: false
  },
  {
    id: '10',
    name: 'St. Xavier\'s College, Mumbai',
    shortName: 'Xaviers',
    location: 'Mahapalika Marg, Mumbai',
    state: 'Maharashtra',
    city: 'Mumbai',
    type: 'Private',
    established: 1869,
    website: 'https://xaviers.ac',
    courses: ['BMM', 'BMS', 'Arts', 'Science', 'Commerce'],
    programs: ['Arts', 'Commerce', 'Science'],
    rating: 4.7,
    fees: '₹40,000',
    cutoff: 'Entrance / Merit',
    latitude: 18.9431,
    longitude: 72.8315,
    ranking: 3,
    acceptanceRate: 5,
    tuition: 'Moderate',
    imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400',
    averageGPA: '8.8',
    averageSAT: 0,
    description: 'St. Xavier\'s College is a premier arts and science college in Mumbai known for its holistic education.',
    highlights: ['Cultural Festivals', 'Autonomous Curriculum', 'Prime Location'],
    campusSize: 'Small',
    studentPopulation: 3000,
    isPublic: false,
    isSaved: false
  },
  {
    id: '11',
    name: 'Government Arts College, Ariyalur',
    shortName: 'GAC Ariyalur',
    location: 'Ariyalur - 621713, Tamil Nadu',
    state: 'Tamil Nadu',
    city: 'Ariyalur',
    type: 'Government',
    established: 2010,
    website: '',
    courses: ['BA Tamil', 'BA English', 'BA History', 'BA Economics', 'BSc Mathematics', 'BSc Physics', 'BSc Chemistry', 'BSc Computer Science', 'Arts', 'Science'],
    programs: ['Arts', 'Science'],
    rating: 3.8,
    fees: '₹3,000 - 8,000',
    cutoff: 'TNEA / Merit Based',
    latitude: 11.1392,
    longitude: 79.0792,
    ranking: 0,
    acceptanceRate: 70,
    tuition: 'Low',
    imageUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?w=400',
    averageGPA: '7.0',
    averageSAT: 0,
    description: 'Government Arts College, Ariyalur is an affordable government institution offering undergraduate arts and science programs in Tamil Nadu.',
    highlights: ['Affordable Government College', 'Arts & Science Programs', 'Tamil Nadu Government'],
    campusSize: 'Small',
    studentPopulation: 800,
    isPublic: true,
    isSaved: false
  },
  {
    id: '12',
    name: 'Government Arts and Science College, Jayankondam',
    shortName: 'GASC Jayankondam',
    location: 'Jayankondam - 621802, Tamil Nadu',
    state: 'Tamil Nadu',
    city: 'Jayankondam',
    type: 'Government',
    established: 2012,
    website: '',
    courses: ['BA Tamil', 'BA English', 'BA History', 'BSc Mathematics', 'BSc Physics', 'BSc Chemistry', 'BSc Computer Science', 'BCA', 'Arts', 'Science', 'Commerce'],
    programs: ['Arts', 'Science', 'Commerce'],
    rating: 3.7,
    fees: '₹3,000 - 8,000',
    cutoff: 'TNEA / Merit Based',
    latitude: 11.2358,
    longitude: 79.3584,
    ranking: 0,
    acceptanceRate: 72,
    tuition: 'Low',
    imageUrl: 'https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?w=400',
    averageGPA: '7.0',
    averageSAT: 0,
    description: 'Government Arts and Science College, Jayankondam offers affordable undergraduate education in arts, science and commerce for students in the Ariyalur district of Tamil Nadu.',
    highlights: ['Affordable Government College', 'Arts, Science & Commerce', 'Tamil Nadu Government'],
    campusSize: 'Small',
    studentPopulation: 700,
    isPublic: true,
    isSaved: false
  }
]

// Filter options are now dynamic, set in state

const STREAM_KEYWORDS: Record<string, string[]> = {
  'Engineering': ['Computer', 'Engineering', 'Technology', 'Mechanical', 'Civil', 'Electronics', 'Chemical', 'Biotechnology', 'Aeronautical', 'Biomedical', 'IT', 'AGR_ENG'],
  'Medical': ['MBBS', 'MD', 'MS', 'Medical', 'Nursing', 'Dental', 'Medicine', 'VET'],
  'Arts': ['BA', 'BFA', 'BMM', 'Arts', 'Economics', 'History', 'Political', 'Design', 'English', 'BCA'],
  'Commerce': ['BCom', 'BBA', 'BMS', 'Commerce', 'Account', 'Finance', 'Business'],
  'Law': ['LLB', 'LLM', 'Law', 'Legal'],
  'Science': ['BSc', 'MSc', 'Science', 'Physics', 'Chemistry', 'Math', 'Botany', 'Zoology'],
  // Includes DB short-codes: AGRI, HORT, AGR_ENG, FORESTRY inserted via SQL
  'Agriculture': ['Agriculture', 'Agronomy', 'Horticulture', 'Forestry', 'Veterinary', 'Fisheries', 'Dairy', 'Food Technology', 'BSc Agri', 'Agricultural', 'AGRI', 'HORT', 'AGR_ENG', 'FORESTRY', 'AGRIC', 'Agri']
};

const STREAM_COURSES: Record<string, string[]> = {
  'Engineering': ['BTech', 'BE', 'Computer Science', 'Mechanical Engineering', 'Civil Engineering', 'IT', 'ECE', 'EEE'],
  'Medical': ['MBBS', 'BDS', 'Nursing', 'Pharmacy', 'Medical', 'Dental'],
  'Arts': ['BA', 'BFA', 'BA Economics', 'BA History', 'BA English', 'BMM', 'Design', 'Arts', 'BCA'],
  'Commerce': ['BCom', 'BBA', 'BMS', 'Commerce', 'Finance', 'Accounting'],
  'Law': ['LLB', 'BA LLB', 'LLM', 'Law'],
  'Science': ['BSc', 'MSc', 'Science', 'Physics', 'Chemistry', 'Mathematics', 'Biology'],
  'Agriculture': ['BSc Agriculture', 'BSc Horticulture', 'BSc Forestry', 'BTech Agricultural Engineering', 'BTech Food Technology', 'BVSc', 'BSc Fisheries', 'BSc Dairy Science']
};

export default function CollegesPage() {
  const { user } = useAuth()
  const searchParams = useSearchParams()
  const [colleges, setColleges] = useState<College[]>([])
  const [filteredColleges, setFilteredColleges] = useState<College[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid')
  const [selectedCollegeId, setSelectedCollegeId] = useState<string | undefined>(undefined)
  const GOOGLE_MAPS_API_KEY = 'your_google_maps_api_key'
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [savedColleges, setSavedColleges] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [states, setStates] = useState<string[]>([])
  const [types, setTypes] = useState<string[]>([])
  const [courses, setCourses] = useState<string[]>([])

  // Filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedState, setSelectedState] = useState('')
  const [selectedType, setSelectedType] = useState('')
  const [selectedStream, setSelectedStream] = useState('')
  const [selectedCourse, setSelectedCourse] = useState('')
  const [minRating, setMinRating] = useState(0)
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'fees'>('rating')
  const [aiOverview, setAiOverview] = useState<string>('')
  const [aiLoading, setAiLoading] = useState<boolean>(false)

  // Auto-apply stream filter from URL query param (e.g. /colleges?stream=Law or ?stream=Agriculture)
  useEffect(() => {
    const streamParam = searchParams.get('stream')
    if (streamParam) {
      // Match against known stream keys (case-insensitive)
      // Also map 'Agri' alias -> 'Agriculture' for backward compatibility
      const validStreams = ['Engineering', 'Medical', 'Arts', 'Commerce', 'Law', 'Science', 'Agriculture']
      const normalized = streamParam.toLowerCase() === 'agri' ? 'Agriculture' : streamParam
      const match = validStreams.find(s => s.toLowerCase() === normalized.toLowerCase())
      if (match) {
        setSelectedStream(match)
        setFiltersOpen(true) // open filters panel so user can see the active filter
      }
    }
  }, [searchParams])

  // Fetch colleges and saved colleges data
  useEffect(() => {
    fetchColleges()
    if (user) {
      fetchSavedColleges()
    }
  }, [user])

  const fetchColleges = async () => {
    try {
      setLoading(true)
      console.log('🎓 Fetching colleges data...')

      const response = await fetch('/api/colleges')
      const data = await response.json()

      if (data.success && data.colleges) {
        console.log('✅ Colleges fetched:', data.colleges.length)
        setColleges(data.colleges)

        // Extract unique values for filters
        const uniqueStates = Array.from(new Set(data.colleges.map((c: College) => c.state))).sort() as string[]
        const uniqueTypes = Array.from(new Set(data.colleges.map((c: College) => c.type))).sort() as string[]
        const uniqueCourses = Array.from(new Set(data.colleges.flatMap((c: College) => c.courses || c.programs || []))).sort() as string[]

        setStates(uniqueStates)
        setTypes(uniqueTypes)
        setCourses(uniqueCourses)
      } else {
        console.warn('⚠️ No colleges data received, using fallback')
        setColleges(mockColleges as College[])
        setStates(Array.from(new Set((mockColleges as College[]).map(c => c.state))).sort() as string[])
        setTypes(Array.from(new Set((mockColleges as College[]).map(c => c.type))).sort() as string[])
        setCourses(Array.from(new Set((mockColleges as College[]).flatMap(c => c.courses || c.programs || []))).sort() as string[])
      }
    } catch (error) {
      console.error('❌ Error fetching colleges:', error)
      toast.error('Failed to load colleges')
      setColleges(mockColleges)
    } finally {
      setLoading(false)
    }
  }

  const fetchSavedColleges = async () => {
    try {
      const response = await fetch('/api/saved-colleges')
      const data = await response.json()

      if (data.success && data.savedColleges) {
        console.log('📚 Saved colleges fetched:', data.savedColleges.length)
        setSavedColleges(data.savedColleges.map((sc: any) => sc.collegeId || sc.college_id))
      }
    } catch (error) {
      console.error('❌ Error fetching saved colleges:', error)
    }
  }

  // Apply filters
  useEffect(() => {
    let filtered = colleges.filter(college => {
      const matchesSearch = college.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        college.city.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesState = !selectedState || college.state === selectedState
      const matchesType = !selectedType || college.type === selectedType
      const matchesStream = !selectedStream ||
        (college.courses && college.courses.some(c => STREAM_KEYWORDS[selectedStream]?.some(k => c.toLowerCase().includes(k.toLowerCase())))) ||
        (college.programs && college.programs.some(p => STREAM_KEYWORDS[selectedStream]?.some(k => p.toLowerCase().includes(k.toLowerCase()))))
      const matchesCourse = !selectedCourse ||
        (college.courses && college.courses.some(c => c.toLowerCase().includes(selectedCourse.toLowerCase()))) ||
        (college.programs && college.programs.some(p => p.toLowerCase().includes(selectedCourse.toLowerCase())))
      const matchesRating = college.rating >= minRating

      return matchesSearch && matchesState && matchesType && matchesStream && matchesCourse && matchesRating
    })

    // Sort results
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name)
        case 'rating':
          return b.rating - a.rating
        case 'fees':
          // Simple fee comparison (would need better parsing in real app)
          return a.fees.localeCompare(b.fees)
        default:
          return 0
      }
    })

    setFilteredColleges(filtered)
  }, [colleges, searchQuery, selectedState, selectedType, selectedStream, selectedCourse, minRating, sortBy])

  // Fetch AI overview when a college is selected
  useEffect(() => {
    const selected = filteredColleges.find(c => c.id === selectedCollegeId)
    if (!selected) return

    const run = async () => {
      try {
        setAiLoading(true)
        setAiOverview('')
        const resp = await fetch('/api/colleges/overview', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: selected.name,
            city: selected.city,
            state: selected.state,
            programs: selected.courses,
            rating: selected.rating,
            type: selected.type,
            website: selected.website,
          })
        })
        const data = await resp.json()
        if (data.success && data.overview) setAiOverview(data.overview)
      } catch (e) {
        console.error('AI overview error', e)
      } finally {
        setAiLoading(false)
      }
    }

    run()
  }, [selectedCollegeId, filteredColleges])

  const handleSaveCollege = async (collegeId: string) => {
    if (!user) {
      toast.error('Please log in to save colleges')
      return
    }

    const isSaved = savedColleges.includes(collegeId)
    const college = colleges.find(c => c.id === collegeId)

    if (!college) {
      toast.error('College not found')
      return
    }

    try {
      // Optimistically update UI
      setSavedColleges(prev =>
        isSaved
          ? prev.filter(id => id !== collegeId)
          : [...prev, collegeId]
      )

      const response = await fetch('/api/colleges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: isSaved ? 'remove' : 'save',
          collegeId: college.id,
          collegeName: college.name,
          collegeLocation: college.location,
          collegeType: college.type
        })
      })

      const result = await response.json()

      if (result.success) {
        toast.success(isSaved ? 'College removed from saved list' : 'College saved successfully!')
      } else {
        // Revert optimistic update on error
        setSavedColleges(prev =>
          isSaved
            ? [...prev, collegeId]
            : prev.filter(id => id !== collegeId)
        )
        toast.error(result.error || 'Failed to update college')
      }
    } catch (error) {
      console.error('Error saving college:', error)
      // Revert optimistic update on error
      setSavedColleges(prev =>
        isSaved
          ? [...prev, collegeId]
          : prev.filter(id => id !== collegeId)
      )
      toast.error('Failed to save college')
    }
  }

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedState('')
    setSelectedType('')
    setSelectedStream('')
    setSelectedCourse('')
    setMinRating(0)
  }

  const activeFiltersCount = [selectedState, selectedType, selectedStream, selectedCourse].filter(Boolean).length + (minRating > 0 ? 1 : 0)

  const availableCourses = selectedStream
    ? Array.from(new Set([
      ...(STREAM_COURSES[selectedStream] || []),
      ...courses.filter(course =>
        STREAM_KEYWORDS[selectedStream]?.some(keyword =>
          course.toLowerCase().includes(keyword.toLowerCase())
        )
      )
    ])).sort()
    : courses;

  return (
    <div className="min-h-screen bg-space-dark relative overflow-hidden pt-20">
      {/* Background */}
      <div className="absolute inset-0 opacity-10">
        <div className="grid-bg"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="text-center mb-6">
            <h1 className="text-4xl font-bold text-white mb-4">
              Find Your Perfect <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-cyan to-neon-pink">College</span>
            </h1>
            <p className="text-gray-400 text-lg">
              Discover top engineering colleges across India with detailed information and insights
            </p>
          </div>

          {/* Search and Controls */}
          <div className="glass-card p-6 rounded-2xl">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search colleges or cities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-black/20 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/50 transition-all"
                />
              </div>

              {/* Controls */}
              <div className="flex items-center space-x-4">
                {/* Filters Toggle */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-all ${filtersOpen
                    ? 'border-neon-cyan bg-neon-cyan/10 text-neon-cyan'
                    : 'border-gray-600 text-gray-400 hover:border-neon-cyan hover:text-neon-cyan'
                    }`}
                >
                  <SlidersHorizontal className="w-5 h-5" />
                  <span>Filters</span>
                  {activeFiltersCount > 0 && (
                    <span className="bg-neon-pink text-space-dark px-2 py-1 text-xs rounded-full">
                      {activeFiltersCount}
                    </span>
                  )}
                </motion.button>

                {/* View Toggle */}
                <div className="flex bg-black/20 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'grid'
                      ? 'bg-neon-cyan text-space-dark'
                      : 'text-gray-400 hover:text-white'
                      }`}
                  >
                    <Grid3X3 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setViewMode('map')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'map'
                      ? 'bg-neon-cyan text-space-dark'
                      : 'text-gray-400 hover:text-white'
                      }`}
                  >
                    <MapIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Filters Panel */}
            <AnimatePresence>
              {filtersOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-6 pt-6 border-t border-gray-700 overflow-hidden"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
                    {/* State Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">State</label>
                      <select
                        value={selectedState}
                        onChange={(e) => setSelectedState(e.target.value)}
                        className="w-full px-3 py-2 bg-black/20 border border-gray-600 rounded-lg text-white focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/50 transition-all"
                      >
                        <option value="">All States</option>
                        {states.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>

                    {/* Type Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
                      <select
                        value={selectedType}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="w-full px-3 py-2 bg-black/20 border border-gray-600 rounded-lg text-white focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/50 transition-all"
                      >
                        <option value="">All Types</option>
                        {types.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    {/* Stream Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Stream</label>
                      <select
                        value={selectedStream}
                        onChange={(e) => {
                          setSelectedStream(e.target.value)
                          setSelectedCourse('')
                        }}
                        className="w-full px-3 py-2 bg-black/20 border border-gray-600 rounded-lg text-white focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/50 transition-all"
                      >
                        <option value="">All Streams</option>
                        {Object.keys(STREAM_KEYWORDS).map(stream => (
                          <option key={stream} value={stream}>{stream}</option>
                        ))}
                      </select>
                    </div>

                    {/* Course Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Course</label>
                      <select
                        value={selectedCourse}
                        onChange={(e) => setSelectedCourse(e.target.value)}
                        className="w-full px-3 py-2 bg-black/20 border border-gray-600 rounded-lg text-white focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/50 transition-all"
                      >
                        <option value="">All Courses</option>
                        {availableCourses.map(course => (
                          <option key={course} value={course}>{course}</option>
                        ))}
                      </select>
                    </div>

                    {/* Rating Filter */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Min Rating: {minRating.toFixed(1)}
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="5"
                        step="0.1"
                        value={minRating}
                        onChange={(e) => setMinRating(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Sort by</label>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as any)}
                          className="px-3 py-2 bg-black/20 border border-gray-600 rounded-lg text-white focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan/50 transition-all"
                        >
                          <option value="rating">Rating</option>
                          <option value="name">Name</option>
                          <option value="fees">Fees</option>
                        </select>
                      </div>

                      <div className="pt-6">
                        <span className="text-sm text-gray-400">
                          {filteredColleges.length} colleges found
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={clearFilters}
                      className="flex items-center space-x-1 text-neon-pink hover:text-neon-cyan transition-colors text-sm font-semibold"
                    >
                      <X className="w-4 h-4" />
                      <span>Clear Filters</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Content */}
        {loading ? (
          /* Loading State */
          <div className="flex items-center justify-center py-12">
            <div className="flex flex-col items-center space-y-4">
              <Loader className="w-8 h-8 text-neon-cyan animate-spin" />
              <p className="text-gray-400">Loading colleges...</p>
            </div>
          </div>
        ) : filteredColleges.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <div className="text-gray-400">
              <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-xl font-semibold mb-2">No colleges found</h3>
              <p>Try adjusting your filters or search query</p>
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {filteredColleges.map((college, index) => (
              <motion.div
                key={college.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                onClick={() => { setSelectedCollegeId(college.id); setViewMode('map') }}
              >
                <CollegeCard
                  college={college}
                  onSave={handleSaveCollege}
                  isSaved={savedColleges.includes(college.id)}
                />
              </motion.div>
            ))}
          </motion.div>
        ) : (
          /* Map View */
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-4 rounded-2xl"
          >
            <div className="rounded-lg grid grid-cols-1 lg:grid-cols-3 gap-4" style={{ height: '600px' }}>
              {/* Map */}
              <div className="col-span-2 min-h-[400px] lg:h-full overflow-hidden rounded-lg">
                {typeof window !== 'undefined' && (
                  <GoogleCollegesMap colleges={filteredColleges as any} selectedCollegeId={selectedCollegeId} apiKeyOverride={GOOGLE_MAPS_API_KEY} />
                )}
              </div>
              {/* AI Overview */}
              <div className="col-span-1 flex flex-col" style={{ height: '600px' }}>
                <div className="flex flex-col h-full glass-card rounded-lg overflow-hidden">
                  {/* Fixed header */}
                  <div className="px-4 pt-4 pb-2 border-b border-white/10 flex-shrink-0">
                    <h3 className="text-white font-semibold text-base">AI Overview</h3>
                  </div>
                  {/* Scrollable content */}
                  <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                    {!selectedCollegeId && (
                      <p className="text-gray-400 text-sm">Select a college card to see an AI overview here.</p>
                    )}
                    {selectedCollegeId && aiLoading && (
                      <div className="flex items-center space-x-2 text-gray-400 text-sm">
                        <svg className="animate-spin w-4 h-4 text-neon-cyan" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        <span>Generating overview...</span>
                      </div>
                    )}
                    {selectedCollegeId && !aiLoading && aiOverview && (
                      <div className="space-y-3">
                        {aiOverview.split('\n\n').filter(p => p.trim()).map((para, i) => (
                          <p key={i} className="text-gray-300 text-sm leading-relaxed">
                            {para.trim()}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* No Results */}
        {filteredColleges.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="glass-card p-12 rounded-2xl max-w-md mx-auto">
              <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">No Colleges Found</h3>
              <p className="text-gray-400 mb-4">
                Try adjusting your filters or search criteria
              </p>
              <button
                onClick={clearFilters}
                className="bg-gradient-to-r from-neon-cyan to-neon-pink px-6 py-3 rounded-lg text-space-dark font-semibold hover:shadow-lg hover:shadow-neon-cyan/25 transition-all"
              >
                Clear All Filters
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}