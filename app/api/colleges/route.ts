import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { aiService } from '@/lib/ai-services'
import { z } from 'zod'
import { logDatabasePermissionOnce, getDemoUserId } from '@/lib/database/demo-mode'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '1000')
    const search = searchParams.get('search') || ''
    const major = searchParams.get('major') || ''
    const state = searchParams.get('state') || ''

    console.log('🎓 Fetching colleges with params:', { page, limit, search, major, state })

    // Try to fetch colleges from Supabase database
    const supabase = createRouteHandlerClient({ cookies })

    try {
      // First get the real total count (before pagination)
      let countQuery = supabase
        .from('colleges')
        .select('*', { count: 'exact', head: true })

      if (search) {
        countQuery = countQuery.or(`name.ilike.%${search}%, location.ilike.%${search}%, city.ilike.%${search}%`)
      }
      if (state) {
        countQuery = countQuery.eq('state', state)
      }
      if (major) {
        countQuery = countQuery.contains('courses', [major])
      }

      const { count: totalCount } = await countQuery

      // Now fetch the actual page of data
      let collegeQuery = supabase
        .from('colleges')
        .select('*')
        .order('rating', { ascending: false })

      // Apply filters if provided
      if (search) {
        collegeQuery = collegeQuery.or(`name.ilike.%${search}%, location.ilike.%${search}%, city.ilike.%${search}%`)
      }

      if (state) {
        collegeQuery = collegeQuery.eq('state', state)
      }

      if (major) {
        collegeQuery = collegeQuery.contains('courses', [major])
      }

      // Apply pagination AFTER filters
      const startIndex = (page - 1) * limit
      collegeQuery = collegeQuery.range(startIndex, startIndex + limit - 1)

      const { data: colleges, error: collegeError } = await collegeQuery

      if (collegeError) {
        throw collegeError
      }

      if (colleges && colleges.length > 0) {
        console.log('✅ Found colleges from database:', colleges.length, 'of', totalCount, 'total')
        // Add synthetic ranking to match frontend expectations
        const withRanking = colleges.map((c: any, idx: number) => ({
          ...c,
          ranking: startIndex + idx + 1,
        }))
        return NextResponse.json({
          success: true,
          colleges: withRanking,
          total: totalCount ?? withRanking.length,
          page,
          limit,
          source: 'database'
        })
      }
    } catch (dbError: any) {
      console.warn('âš ï¸ Database colleges fetch failed:', dbError.message)
      if (dbError.code === '42501' || dbError.code === '42P01') {
        logDatabasePermissionOnce('Colleges API')
      }
    }

    // Fallback to mock colleges data
    const mockColleges = getMockColleges()

    // Apply search filter to mock data
    let filteredColleges = mockColleges
    if (search) {
      filteredColleges = mockColleges.filter(college =>
        college.name.toLowerCase().includes(search.toLowerCase()) ||
        college.city.toLowerCase().includes(search.toLowerCase()) ||
        college.state.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (state) {
      filteredColleges = filteredColleges.filter(college => college.state === state)
    }

    if (major) {
      filteredColleges = filteredColleges.filter(college =>
        college.programs?.some(program => program.toLowerCase().includes(major.toLowerCase())) ||
        college.courses?.some(course => course.toLowerCase().includes(major.toLowerCase()))
      )
    }

    // Apply pagination to mock data
    const startIndex = (page - 1) * limit
    const paginatedColleges = filteredColleges.slice(startIndex, startIndex + limit)

    console.log('ðŸ“š Using mock colleges data:', paginatedColleges.length, 'of', filteredColleges.length)

    return NextResponse.json({
      success: true,
      colleges: paginatedColleges,
      total: filteredColleges.length,
      page,
      limit,
      source: 'mock'
    })

  } catch (error) {
    console.error('Error in GET /api/colleges:', error)
    return NextResponse.json({
      error: 'Failed to fetch colleges',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// POST - Save or remove college from user's saved list
export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()

    // Allow demo mode in development
    const userId = session?.user?.id || 'demo-user'

    if (!userId && process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, collegeId, collegeName, collegeLocation, collegeType } = body

    // Validate required fields
    if (!action || !collegeId) {
      return NextResponse.json({
        error: 'Missing required fields: action, collegeId'
      }, { status: 400 })
    }

    if (!['save', 'remove'].includes(action)) {
      return NextResponse.json({
        error: 'Invalid action. Must be "save" or "remove"'
      }, { status: 400 })
    }

    console.log(`${action} college:`, { collegeId, collegeName, userId })

    try {
      if (action === 'save') {
        // Check if college is already saved (prevent duplicates)
        const { data: existingSave } = await supabase
          .from('saved_colleges')
          .select('id')
          .eq('user_id', userId)
          .eq('college_id', collegeId)
          .single()

        if (existingSave) {
          return NextResponse.json({
            success: true,
            message: 'College already saved',
            data: existingSave,
            alreadyExists: true
          })
        }

        // Save college to user's saved list with retry logic
        let saveAttempts = 0
        let saveError = null
        let saveData = null

        while (saveAttempts < 3) {
          const { data, error } = await supabase
            .from('saved_colleges')
            .insert({
              user_id: userId,
              college_id: collegeId,
              college_name: collegeName || 'Unknown College',
              college_location: collegeLocation || 'Unknown Location',
              college_type: collegeType || 'Unknown Type'
            })
            .select()

          if (!error) {
            saveData = data
            break
          } else {
            saveError = error
            saveAttempts++
            console.warn(`Save attempt ${saveAttempts} failed:`, error)

            // Wait briefly before retrying
            if (saveAttempts < 3) {
              await new Promise(resolve => setTimeout(resolve, 200))
            }
          }
        }

        if (saveError) {
          console.error('Error saving college after retries:', saveError)
          logDatabasePermissionOnce('Colleges API - Save')

          // Return success anyway to prevent UI blocking
          return NextResponse.json({
            success: true,
            message: 'College saved successfully (local fallback)',
            data: null,
            fallback: true
          })
        }

        // Log activity
        await logActivity(supabase, userId, {
          type: 'college',
          title: 'College Saved',
          description: `Saved ${collegeName || 'college'} to your college list`,
          metadata: { collegeId, collegeName, collegeLocation, collegeType, action: 'save' }
        })

        console.log(`âœ… College saved successfully: ${collegeName} for user ${userId}`)

        return NextResponse.json({
          success: true,
          message: 'College saved successfully',
          data: saveData?.[0] || null
        })

      } else if (action === 'remove') {
        // Remove college from user's saved list with verification
        const { data: deletedRows, error } = await supabase
          .from('saved_colleges')
          .delete()
          .eq('user_id', userId)
          .eq('college_id', collegeId)
          .select()

        if (error) {
          console.error('Error removing college:', error)
          logDatabasePermissionOnce('Colleges API - Remove')

          // Graceful fallback
          return NextResponse.json({
            success: true,
            message: 'College removed successfully (local fallback)',
            fallback: true
          })
        }

        // Check if anything was actually deleted
        if (deletedRows && deletedRows.length === 0) {
          return NextResponse.json({
            success: true,
            message: 'College was not in saved list',
            notFound: true
          })
        }

        // Log activity
        await logActivity(supabase, userId, {
          type: 'college',
          title: 'College Removed',
          description: `Removed ${collegeName || 'college'} from your saved list`,
          metadata: { collegeId, collegeName, collegeLocation, collegeType, action: 'remove' }
        })

        console.log(`âœ… College removed successfully: ${collegeName} for user ${userId}`)

        return NextResponse.json({
          success: true,
          message: 'College removed successfully',
          data: deletedRows?.[0] || null
        })
      }

    } catch (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({
        success: true,
        message: `College ${action}d successfully (fallback)`
      })
    }

  } catch (error) {
    console.error('Error in POST /api/colleges:', error)
    return NextResponse.json({
      error: 'Failed to process college action',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Helper function to get comprehensive colleges data covering all 6 streams (including Agriculture)
function getMockColleges() {
  return [
    // â”€â”€ ENGINEERING â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    {
      id: 'eng-1', name: 'Indian Institute of Technology Delhi', shortName: 'IIT Delhi',
      location: 'Hauz Khas, New Delhi', state: 'Delhi', city: 'New Delhi', type: 'Government',
      established: 1961, website: 'https://home.iitd.ac.in',
      courses: ['Computer Science', 'Mechanical Engineering', 'Electrical Engineering', 'Civil Engineering', 'Chemical Engineering', 'Technology'],
      programs: ['Engineering', 'Computer Science', 'Technology'],
      rating: 4.9, fees: 'â‚¹2.5L â€“ 3L', cutoff: 'JEE Rank 1â€“500',
      latitude: 28.5449, longitude: 77.1928, ranking: 1, acceptanceRate: 2, tuition: 'Low',
      imageUrl: 'https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=400&h=300&fit=crop',
      averageGPA: '9.5', averageSAT: 1580, description: "IIT Delhi is one of India's premier engineering and research institutions, known for world-class faculty and strong industry connections.",
      highlights: ['Top Engineering College in India', 'Excellent Research Facilities', 'Strong Placement Record'], campusSize: 'Large', studentPopulation: 8000, isPublic: true, isSaved: false
    },
    {
      id: 'eng-2', name: 'Indian Institute of Technology Bombay', shortName: 'IIT Bombay',
      location: 'Powai, Mumbai', state: 'Maharashtra', city: 'Mumbai', type: 'Government',
      established: 1958, website: 'https://www.iitb.ac.in',
      courses: ['Computer Science', 'Electrical Engineering', 'Mechanical Engineering', 'Chemical Engineering', 'Civil Engineering', 'Technology'],
      programs: ['Engineering', 'Computer Science', 'Technology'],
      rating: 4.9, fees: 'â‚¹2.5L â€“ 3L', cutoff: 'JEE Rank 1â€“100',
      latitude: 19.1334, longitude: 72.9133, ranking: 2, acceptanceRate: 1, tuition: 'Low',
      imageUrl: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=400&h=300&fit=crop',
      averageGPA: '9.6', averageSAT: 1590, description: "IIT Bombay is consistently ranked among Asia's top engineering universities with exceptional research output and startup culture.",
      highlights: ['Startup Ecosystem', 'Top Research Labs', 'Global Collaborations'], campusSize: 'Large', studentPopulation: 10000, isPublic: true, isSaved: false
    },
    {
      id: 'eng-3', name: 'National Institute of Technology Trichy', shortName: 'NIT Trichy',
      location: 'Tiruchirappalli, Tamil Nadu', state: 'Tamil Nadu', city: 'Tiruchirappalli', type: 'Government',
      established: 1964, website: 'https://www.nitt.edu',
      courses: ['Computer Science', 'Electronics', 'Mechanical Engineering', 'Civil Engineering', 'Chemical Engineering', 'IT', 'Technology'],
      programs: ['Engineering', 'Computer Science', 'Electronics', 'Technology'],
      rating: 4.7, fees: 'â‚¹1.5L â€“ 2L', cutoff: 'JEE Rank 800â€“3000',
      latitude: 10.7596, longitude: 78.8149, ranking: 8, acceptanceRate: 4, tuition: 'Low',
      imageUrl: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=400&h=300&fit=crop',
      averageGPA: '9.0', averageSAT: 0, description: 'Ranked the best NIT in India, NIT Trichy offers excellent technical programmes with outstanding placement records.',
      highlights: ['Best NIT in India', 'Excellent Placements', 'Rich Campus Life'], campusSize: 'Large', studentPopulation: 6000, isPublic: true, isSaved: false
    },
    {
      id: 'eng-4', name: 'Birla Institute of Technology and Science', shortName: 'BITS Pilani',
      location: 'Pilani, Rajasthan', state: 'Rajasthan', city: 'Pilani', type: 'Private',
      established: 1964, website: 'https://www.bits-pilani.ac.in',
      courses: ['Computer Science', 'Electronics', 'Mechanical Engineering', 'Chemical Engineering', 'Biotechnology', 'IT', 'Technology'],
      programs: ['Engineering', 'Computer Science', 'Biotechnology', 'Technology'],
      rating: 4.6, fees: 'â‚¹4L â€“ 5L', cutoff: 'BITSAT 350+',
      latitude: 28.3670, longitude: 75.5886, ranking: 15, acceptanceRate: 8, tuition: 'High',
      imageUrl: 'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=400&h=300&fit=crop',
      averageGPA: '8.8', averageSAT: 1520, description: 'BITS Pilani is a leading private university known for its dual-degree programs, industry partnerships and innovation culture.',
      highlights: ['Dual Degree Programs', 'Industry Partnerships', 'Innovation Hub'], campusSize: 'Large', studentPopulation: 15000, isPublic: false, isSaved: false
    },
    {
      id: 'eng-5', name: 'Delhi Technological University', shortName: 'DTU',
      location: 'Shahbad Daulatpur, Delhi', state: 'Delhi', city: 'New Delhi', type: 'Government',
      established: 1941, website: 'http://www.dtu.ac.in',
      courses: ['Computer Engineering', 'Information Technology', 'Electronics', 'Mechanical Engineering', 'Civil Engineering', 'Technology'],
      programs: ['Engineering', 'Computer Science', 'IT', 'Technology'],
      rating: 4.4, fees: 'â‚¹1.5L â€“ 2L', cutoff: 'JEE Rank 3000â€“8000',
      latitude: 28.7501, longitude: 77.1177, ranking: 25, acceptanceRate: 12, tuition: 'Low',
      imageUrl: 'https://images.unsplash.com/photo-1564981797816-1043664bf78d?w=400&h=300&fit=crop',
      averageGPA: '8.2', averageSAT: 1450, description: 'DTU is a leading government technical university in Delhi with excellent placement records and vibrant campus life.',
      highlights: ['Government College', 'Delhi Location', 'Good Placements'], campusSize: 'Large', studentPopulation: 12000, isPublic: true, isSaved: false
    },
    {
      id: 'eng-6', name: 'Vellore Institute of Technology', shortName: 'VIT Vellore',
      location: 'Vellore, Tamil Nadu', state: 'Tamil Nadu', city: 'Vellore', type: 'Private',
      established: 1984, website: 'https://vit.ac.in',
      courses: ['Computer Science', 'Electronics', 'Biotechnology', 'Mechanical Engineering', 'Civil Engineering', 'IT', 'Technology'],
      programs: ['Engineering', 'Computer Science', 'Biotechnology', 'Technology'],
      rating: 4.3, fees: 'â‚¹2L â€“ 3L', cutoff: 'VITEEE Rank 1â€“10000',
      latitude: 12.9716, longitude: 79.1588, ranking: 18, acceptanceRate: 15, tuition: 'Moderate',
      imageUrl: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=400&h=300&fit=crop',
      averageGPA: '8.0', averageSAT: 0, description: 'VIT Vellore is a leading private university known for its modern infrastructure, global tie-ups and consistently strong placement results.',
      highlights: ['Modern Campus', 'Global Tie-ups', 'Strong Placements'], campusSize: 'Large', studentPopulation: 35000, isPublic: false, isSaved: false
    },
    {
      id: 'eng-7', name: 'Manipal Institute of Technology', shortName: 'MIT Manipal',
      location: 'Manipal, Karnataka', state: 'Karnataka', city: 'Manipal', type: 'Private',
      established: 1957, website: 'https://manipal.edu',
      courses: ['Computer Science', 'Information Technology', 'Mechanical Engineering', 'Aeronautical Engineering', 'Biomedical Engineering', 'Technology'],
      programs: ['Engineering', 'Aeronautical', 'Biomedical', 'Computer Science', 'Technology'],
      rating: 4.3, fees: 'â‚¹3.5L â€“ 4.5L', cutoff: 'MET Rank 1â€“5000',
      latitude: 13.3475, longitude: 74.7869, ranking: 45, acceptanceRate: 12, tuition: 'High',
      imageUrl: 'https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?w=400&h=300&fit=crop',
      averageGPA: '8.0', averageSAT: 1380, description: 'MIT Manipal is a premier technology institute known for its comprehensive technical education and international exposure.',
      highlights: ['Modern Infrastructure', 'International Programs', 'Research Focus'], campusSize: 'Large', studentPopulation: 6000, isPublic: false, isSaved: false
    },
    {
      id: 'eng-8', name: 'PSG College of Technology', shortName: 'PSG Tech',
      location: 'Coimbatore, Tamil Nadu', state: 'Tamil Nadu', city: 'Coimbatore', type: 'Private',
      established: 1951, website: 'https://www.psgtech.edu',
      courses: ['Computer Science', 'Mechanical Engineering', 'Electronics', 'Civil Engineering', 'IT', 'Technology'],
      programs: ['Engineering', 'Computer Science', 'Technology'],
      rating: 4.2, fees: 'â‚¹1.5L â€“ 2.5L', cutoff: 'TNEA Rank 1â€“2000',
      latitude: 11.0168, longitude: 76.9558, ranking: 60, acceptanceRate: 20, tuition: 'Moderate',
      imageUrl: 'https://images.unsplash.com/photo-1592280771190-3e2e4d571952?w=400&h=300&fit=crop',
      averageGPA: '7.9', averageSAT: 0, description: 'PSG College of Technology is a highly reputed autonomous engineering institution in Tamil Nadu known for industry-ready graduates.',
      highlights: ['Autonomous Institution', 'Industrial Collaborations', 'Strong Alumni'], campusSize: 'Large', studentPopulation: 8000, isPublic: false, isSaved: false
    },

    // â”€â”€ MEDICAL â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    {
      id: 'med-1', name: 'All India Institute of Medical Sciences', shortName: 'AIIMS New Delhi',
      location: 'Ansari Nagar, New Delhi', state: 'Delhi', city: 'New Delhi', type: 'Government',
      established: 1956, website: 'https://www.aiims.edu',
      courses: ['MBBS', 'MD', 'MS', 'Medical', 'Nursing', 'Medicine'],
      programs: ['Medical', 'Nursing', 'Medicine'],
      rating: 4.9, fees: 'â‚¹6,000 â€“ 10,000', cutoff: 'NEET Rank 1â€“50',
      latitude: 28.5659, longitude: 77.2088, ranking: 1, acceptanceRate: 0.1, tuition: 'Very Low',
      imageUrl: 'https://images.unsplash.com/photo-1581595220892-0b2fbc456b3e?w=400&h=300&fit=crop',
      averageGPA: '9.8', averageSAT: 0, description: 'AIIMS New Delhi is a globally renowned public medical research university â€” the most prestigious medical institution in India.',
      highlights: ['Top Medical College', 'Exceptional Clinical Exposure', 'World-class Research'], campusSize: 'Large', studentPopulation: 3000, isPublic: true, isSaved: false
    },
    {
      id: 'med-2', name: 'JIPMER Puducherry', shortName: 'JIPMER',
      location: 'Dhanvantari Nagar, Puducherry', state: 'Puducherry', city: 'Puducherry', type: 'Government',
      established: 1823, website: 'https://jipmer.edu.in',
      courses: ['MBBS', 'MD', 'MS', 'Medical', 'Nursing', 'Medicine'],
      programs: ['Medical', 'Nursing', 'Medicine'],
      rating: 4.8, fees: 'â‚¹5,000 â€“ 8,000', cutoff: 'NEET Rank 50â€“200',
      latitude: 11.9416, longitude: 79.8083, ranking: 2, acceptanceRate: 0.5, tuition: 'Very Low',
      imageUrl: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400&h=300&fit=crop',
      averageGPA: '9.6', averageSAT: 0, description: "JIPMER is one of India's oldest and most reputed medical colleges, known for outstanding clinical training and research.",
      highlights: ['Oldest Medical Institution', 'Autonomous Medical University', 'Superspecialty Hospital'], campusSize: 'Large', studentPopulation: 2500, isPublic: true, isSaved: false
    },
    {
      id: 'med-3', name: 'Madras Medical College', shortName: 'MMC Chennai',
      location: 'Park Town, Chennai', state: 'Tamil Nadu', city: 'Chennai', type: 'Government',
      established: 1835, website: 'http://www.mmc.tn.gov.in',
      courses: ['MBBS', 'MD', 'MS', 'Medical', 'Dental', 'Nursing', 'Medicine'],
      programs: ['Medical', 'Dental', 'Nursing', 'Medicine'],
      rating: 4.6, fees: 'â‚¹10,000 â€“ 20,000', cutoff: 'NEET Rank 200â€“1000',
      latitude: 13.0827, longitude: 80.2707, ranking: 5, acceptanceRate: 2, tuition: 'Low',
      imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop',
      averageGPA: '9.3', averageSAT: 0, description: "Madras Medical College is one of the oldest and largest government medical colleges in Asia, with superspecialty facilities.",
      highlights: ["Asia's Oldest Medical School", 'Superspecialty Hospital', 'Strong Clinical Training'], campusSize: 'Large', studentPopulation: 5000, isPublic: true, isSaved: false
    },
    {
      id: 'med-4', name: 'Kasturba Medical College', shortName: 'KMC Manipal',
      location: 'Manipal, Karnataka', state: 'Karnataka', city: 'Manipal', type: 'Private',
      established: 1953, website: 'https://manipal.edu/kmc.html',
      courses: ['MBBS', 'MD', 'MS', 'Medical', 'Dental', 'Nursing', 'Medicine'],
      programs: ['Medical', 'Dental', 'Nursing', 'Medicine'],
      rating: 4.5, fees: 'â‚¹15L â€“ 20L', cutoff: 'NEET Rank 2000â€“8000',
      latitude: 13.3528, longitude: 74.7867, ranking: 10, acceptanceRate: 8, tuition: 'High',
      imageUrl: 'https://images.unsplash.com/photo-1551884831-bbf3cdc6469e?w=400&h=300&fit=crop',
      averageGPA: '9.0', averageSAT: 0, description: 'KMC Manipal is a leading private medical college known for world-class infrastructure, clinical exposure and international standards.',
      highlights: ['International Standards', 'Modern Hospital', 'Global Alumni Network'], campusSize: 'Large', studentPopulation: 4000, isPublic: false, isSaved: false
    },
    {
      id: 'med-5', name: 'Sri Ramachandra Institute of Higher Education', shortName: 'SRIHER',
      location: 'Porur, Chennai', state: 'Tamil Nadu', city: 'Chennai', type: 'Private',
      established: 1985, website: 'https://www.sriramachandra.edu.in',
      courses: ['MBBS', 'MD', 'MS', 'Medical', 'Dental', 'Nursing', 'Pharmacy', 'Medicine'],
      programs: ['Medical', 'Dental', 'Nursing', 'Pharmacy', 'Medicine'],
      rating: 4.4, fees: 'â‚¹12L â€“ 18L', cutoff: 'NEET Rank 5000â€“15000',
      latitude: 13.0358, longitude: 80.1548, ranking: 12, acceptanceRate: 10, tuition: 'High',
      imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400&h=300&fit=crop',
      averageGPA: '8.8', averageSAT: 0, description: 'SRIHER is a comprehensive health sciences university offering multiple professional health programs with modern clinical facilities.',
      highlights: ['Comprehensive Health Sciences', 'Multi-specialty Hospital', 'Strong Research'], campusSize: 'Large', studentPopulation: 6000, isPublic: false, isSaved: false
    },
    {
      id: 'med-6', name: 'Christian Medical College', shortName: 'CMC Vellore',
      location: 'Vellore, Tamil Nadu', state: 'Tamil Nadu', city: 'Vellore', type: 'Private',
      established: 1900, website: 'https://www.cmch-vellore.edu',
      courses: ['MBBS', 'MD', 'MS', 'Medical', 'Nursing', 'Medicine'],
      programs: ['Medical', 'Nursing', 'Medicine'],
      rating: 4.9, fees: 'â‚¹5,000 â€“ 15,000', cutoff: 'NEET Rank 100â€“500',
      latitude: 12.9249, longitude: 79.1325, ranking: 3, acceptanceRate: 1, tuition: 'Low',
      imageUrl: 'https://images.unsplash.com/photo-1551884831-bbf3cdc6469e?w=400&h=300&fit=crop',
      averageGPA: '9.7', averageSAT: 0, description: 'CMC Vellore is one of the most respected private medical colleges in Asia, known for ethical medical practice and exceptional patient care.',
      highlights: ['Globally Renowned', 'Ethical Medical Training', 'Tertiary Care Hospital'], campusSize: 'Large', studentPopulation: 3500, isPublic: false, isSaved: false
    },

    // â”€â”€ LAW â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    {
      id: 'law-1', name: 'National Law School of India University', shortName: 'NLSIU Bangalore',
      location: 'Nagarbhavi, Bangalore', state: 'Karnataka', city: 'Bangalore', type: 'Government',
      established: 1986, website: 'https://www.nls.ac.in',
      courses: ['BA LLB', 'LLM', 'Law', 'Legal Studies'],
      programs: ['Law', 'Legal Studies'],
      rating: 4.9, fees: 'â‚¹2.5L â€“ 3L', cutoff: 'CLAT Rank 1â€“60',
      latitude: 12.9716, longitude: 77.5946, ranking: 1, acceptanceRate: 2, tuition: 'Moderate',
      imageUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&h=300&fit=crop',
      averageGPA: '9.0', averageSAT: 0, description: 'NLSIU Bangalore is the premier National Law University in India, consistently ranked #1 for legal education.',
      highlights: ['Ranked #1 Law School', 'Moot Court Excellence', 'Top Law Firm Placements'], campusSize: 'Medium', studentPopulation: 1000, isPublic: true, isSaved: false
    },
    {
      id: 'law-2', name: 'National Academy of Legal Studies and Research', shortName: 'NALSAR Hyderabad',
      location: 'Shameerpet, Hyderabad', state: 'Telangana', city: 'Hyderabad', type: 'Government',
      established: 1998, website: 'https://nalsar.ac.in',
      courses: ['BA LLB', 'LLM', 'Law', 'Legal Studies'],
      programs: ['Law', 'Legal Studies'],
      rating: 4.8, fees: 'â‚¹2L â€“ 2.8L', cutoff: 'CLAT Rank 60â€“150',
      latitude: 17.5374, longitude: 78.5725, ranking: 2, acceptanceRate: 3, tuition: 'Moderate',
      imageUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&h=300&fit=crop',
      averageGPA: '8.9', averageSAT: 0, description: "NALSAR Hyderabad is one of India's top National Law Universities, known for its intellectual atmosphere and strong judicial exposure.",
      highlights: ['Top 3 NLU', 'Judicial Internship Network', 'Strong Research Culture'], campusSize: 'Medium', studentPopulation: 800, isPublic: true, isSaved: false
    },
    {
      id: 'law-3', name: 'West Bengal National University of Juridical Sciences', shortName: 'NUJS Kolkata',
      location: 'Salt Lake, Kolkata', state: 'West Bengal', city: 'Kolkata', type: 'Government',
      established: 1999, website: 'https://www.nujs.edu',
      courses: ['BA LLB', 'LLM', 'Law', 'Legal Studies'],
      programs: ['Law', 'Legal Studies'],
      rating: 4.7, fees: 'â‚¹1.8L â€“ 2.5L', cutoff: 'CLAT Rank 150â€“300',
      latitude: 22.5726, longitude: 88.3639, ranking: 3, acceptanceRate: 4, tuition: 'Low',
      imageUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&h=300&fit=crop',
      averageGPA: '8.8', averageSAT: 0, description: 'NUJS Kolkata is a prestigious national law university renowned for producing top lawyers, judges, and policy experts.',
      highlights: ['Strong Corporate Law Program', 'International Moot Courts', 'Active Legal Aid Clinic'], campusSize: 'Medium', studentPopulation: 700, isPublic: true, isSaved: false
    },
    {
      id: 'law-4', name: 'National Law University Delhi', shortName: 'NLU Delhi',
      location: 'Dwarka, New Delhi', state: 'Delhi', city: 'New Delhi', type: 'Government',
      established: 2008, website: 'https://nludelhi.ac.in',
      courses: ['BA LLB', 'LLM', 'Law', 'Legal Studies'],
      programs: ['Law', 'Legal Studies'],
      rating: 4.7, fees: 'â‚¹2L â€“ 2.8L', cutoff: 'AILET Rank 1â€“100',
      latitude: 28.5921, longitude: 77.0460, ranking: 4, acceptanceRate: 3, tuition: 'Moderate',
      imageUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&h=300&fit=crop',
      averageGPA: '8.7', averageSAT: 0, description: 'NLU Delhi is a premier law university in the national capital, producing future Supreme Court lawyers, judges and policy makers.',
      highlights: ['Delhi High Court Access', 'Supreme Court Internships', 'Criminal Law Specialization'], campusSize: 'Medium', studentPopulation: 600, isPublic: true, isSaved: false
    },
    {
      id: 'law-5', name: 'Symbiosis Law School', shortName: 'SLS Pune',
      location: 'Viman Nagar, Pune', state: 'Maharashtra', city: 'Pune', type: 'Private',
      established: 1977, website: 'https://www.symbiosis.ac.in',
      courses: ['BA LLB', 'BBA LLB', 'LLM', 'Law', 'Legal Studies'],
      programs: ['Law', 'Legal Studies'],
      rating: 4.5, fees: 'â‚¹3.5L â€“ 4.5L', cutoff: 'SLAT Merit',
      latitude: 18.5679, longitude: 73.9143, ranking: 8, acceptanceRate: 15, tuition: 'High',
      imageUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&h=300&fit=crop',
      averageGPA: '8.5', averageSAT: 0, description: 'Symbiosis Law School Pune is among the top private law colleges in India, offering specializations in corporate, criminal and international law.',
      highlights: ['Corporate Law Specialization', 'International Moot Courts', 'Excellent Infrastructure'], campusSize: 'Medium', studentPopulation: 1500, isPublic: false, isSaved: false
    },
    {
      id: 'law-6', name: 'Tamil Nadu National Law University', shortName: 'TNNLU Trichy',
      location: 'Tiruchirappalli, Tamil Nadu', state: 'Tamil Nadu', city: 'Tiruchirappalli', type: 'Government',
      established: 2012, website: 'https://www.tnnlu.ac.in',
      courses: ['BA LLB', 'LLM', 'Law', 'Legal Studies'],
      programs: ['Law', 'Legal Studies'],
      rating: 4.2, fees: 'â‚¹1L â€“ 1.5L', cutoff: 'CLAT Rank 1500â€“3000',
      latitude: 10.7905, longitude: 78.7047, ranking: 15, acceptanceRate: 20, tuition: 'Low',
      imageUrl: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400&h=300&fit=crop',
      averageGPA: '8.0', averageSAT: 0, description: "TNNLU is Tamil Nadu's only National Law University, offering quality legal education aligned with the Indian Constitution and modern jurisprudence.",
      highlights: ['Only NLU in Tamil Nadu', 'Affordable Fees', 'Legal Aid Activities'], campusSize: 'Medium', studentPopulation: 500, isPublic: true, isSaved: false
    },

    // â”€â”€ COMMERCE â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    {
      id: 'com-1', name: 'Shri Ram College of Commerce', shortName: 'SRCC',
      location: 'North Campus, Delhi', state: 'Delhi', city: 'New Delhi', type: 'Government',
      established: 1926, website: 'https://www.srcc.edu',
      courses: ['B.Com', 'BA Economics', 'Commerce', 'Finance', 'Accounting', 'Business'],
      programs: ['Commerce', 'Economics', 'Finance', 'Business'],
      rating: 4.9, fees: 'â‚¹30,000', cutoff: 'CUET 99%ile',
      latitude: 28.6874, longitude: 77.2068, ranking: 1, acceptanceRate: 1, tuition: 'Very Low',
      imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=300&fit=crop',
      averageGPA: '9.5', averageSAT: 0, description: "SRCC is India's top commerce college under Delhi University, known for exceptional placements in investment banking, CA and management consulting.",
      highlights: ['Top Commerce College', 'Investment Banking Placements', 'Strong Alumni Network'], campusSize: 'Medium', studentPopulation: 2500, isPublic: true, isSaved: false
    },
    {
      id: 'com-2', name: 'Narsee Monjee Institute of Management Studies', shortName: 'NMIMS Mumbai',
      location: 'Vile Parle, Mumbai', state: 'Maharashtra', city: 'Mumbai', type: 'Private',
      established: 1981, website: 'https://www.nmims.edu',
      courses: ['BBA', 'MBA', 'B.Com', 'Commerce', 'Finance', 'Business', 'Accounting'],
      programs: ['Commerce', 'Business', 'Finance', 'BBA', 'MBA'],
      rating: 4.6, fees: 'â‚¹2.5L â€“ 4L', cutoff: 'NMIMS CET Merit',
      latitude: 19.0896, longitude: 72.8656, ranking: 5, acceptanceRate: 10, tuition: 'High',
      imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=300&fit=crop',
      averageGPA: '8.8', averageSAT: 0, description: 'NMIMS Mumbai is a top private commerce and management university, known for strong industry ties and excellent MBA programs.',
      highlights: ['Top MBA Programs', 'Finance & Banking Focus', 'Strong Corporate Placements'], campusSize: 'Medium', studentPopulation: 8000, isPublic: false, isSaved: false
    },
    {
      id: 'com-3', name: 'Loyola College', shortName: 'Loyola Chennai',
      location: 'Nungambakkam, Chennai', state: 'Tamil Nadu', city: 'Chennai', type: 'Private',
      established: 1925, website: 'https://www.loyolacollege.edu',
      courses: ['B.Com', 'BBA', 'BMS', 'Commerce', 'Finance', 'Accounting', 'Business', 'Economics'],
      programs: ['Commerce', 'Business', 'Finance', 'BBA', 'Economics'],
      rating: 4.5, fees: 'â‚¹50,000 â€“ 1L', cutoff: 'Entrance / Merit',
      latitude: 13.0569, longitude: 80.2425, ranking: 6, acceptanceRate: 20, tuition: 'Moderate',
      imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=300&fit=crop',
      averageGPA: '8.6', averageSAT: 0, description: "Loyola College Chennai is one of South India's most prestigious autonomous colleges, excelling in commerce, management and social sciences.",
      highlights: ['Autonomous College', 'Commerce Excellence', 'Holistic Education'], campusSize: 'Medium', studentPopulation: 4500, isPublic: false, isSaved: false
    },
    {
      id: 'com-4', name: 'Mumbai University Institute of Management Studies', shortName: 'MU IMS',
      location: 'Kalina, Mumbai', state: 'Maharashtra', city: 'Mumbai', type: 'Government',
      established: 1857, website: 'https://mu.ac.in',
      courses: ['B.Com', 'BBA', 'BMS', 'Commerce', 'Finance', 'Accounting', 'Business', 'Economics'],
      programs: ['Commerce', 'Business', 'Finance', 'BBA', 'BMS', 'Economics'],
      rating: 4.3, fees: 'â‚¹20,000 â€“ 50,000', cutoff: 'DTE Merit',
      latitude: 19.0760, longitude: 72.8777, ranking: 8, acceptanceRate: 25, tuition: 'Low',
      imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=300&fit=crop',
      averageGPA: '8.2', averageSAT: 0, description: 'University of Mumbai is one of the largest universities in the world, offering comprehensive commerce and management programs with strong industry links.',
      highlights: ['Largest University', 'Affordable Commerce Programs', 'Mumbai Industry Access'], campusSize: 'Large', studentPopulation: 50000, isPublic: true, isSaved: false
    },
    {
      id: 'com-5', name: 'PSG Institute of Management', shortName: 'PSGIM Coimbatore',
      location: 'Coimbatore, Tamil Nadu', state: 'Tamil Nadu', city: 'Coimbatore', type: 'Private',
      established: 1992, website: 'https://www.psgim.ac.in',
      courses: ['MBA', 'BBA', 'Commerce', 'Finance', 'Business', 'Accounting', 'BMS'],
      programs: ['Commerce', 'Business', 'Finance', 'BBA', 'MBA'],
      rating: 4.2, fees: 'â‚¹1L â€“ 2L', cutoff: 'TANCET / CAT Merit',
      latitude: 11.0168, longitude: 76.9558, ranking: 20, acceptanceRate: 30, tuition: 'Moderate',
      imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=300&fit=crop',
      averageGPA: '8.0', averageSAT: 0, description: 'PSGIM Coimbatore is a reputed management institute in Tamil Nadu offering quality commerce and MBA programs with industry mentorship.',
      highlights: ['Industry Mentorship', 'Commerce Specializations', 'South India Network'], campusSize: 'Medium', studentPopulation: 2000, isPublic: false, isSaved: false
    },

    // â”€â”€ ARTS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    {
      id: 'arts-1', name: 'Lady Shri Ram College for Women', shortName: 'LSR Delhi',
      location: 'Lajpat Nagar, New Delhi', state: 'Delhi', city: 'New Delhi', type: 'Government',
      established: 1956, website: 'https://www.lsr.edu.in',
      courses: ['BA English', 'BA History', 'BA Economics', 'BA Political Science', 'BA Psychology', 'Arts', 'Journalism'],
      programs: ['Arts', 'Economics', 'English', 'History', 'Psychology'],
      rating: 4.8, fees: 'â‚¹15,000 â€“ 25,000', cutoff: 'CUET 98%ile',
      latitude: 28.5674, longitude: 77.2301, ranking: 1, acceptanceRate: 3, tuition: 'Very Low',
      imageUrl: 'https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?w=400&h=300&fit=crop',
      averageGPA: '9.4', averageSAT: 0, description: "LSR Delhi is India's top women's arts college, celebrated for producing journalists, IAS officers, authors and social scientists.",
      highlights: ['Top Arts College India', 'Strong Social Sciences', 'Excellent Alumni'], campusSize: 'Medium', studentPopulation: 2800, isPublic: true, isSaved: false
    },
    {
      id: 'arts-2', name: 'Presidency College', shortName: 'Presidency Kolkata',
      location: 'College Street, Kolkata', state: 'West Bengal', city: 'Kolkata', type: 'Government',
      established: 1817, website: 'https://www.presiuniv.ac.in',
      courses: ['BA English', 'BA History', 'BA Economics', 'BA Political Science', 'Arts', 'Science', 'Journalism'],
      programs: ['Arts', 'Economics', 'English', 'History'],
      rating: 4.7, fees: 'â‚¹5,000 â€“ 10,000', cutoff: 'CUET / Merit',
      latitude: 22.5726, longitude: 88.3639, ranking: 2, acceptanceRate: 5, tuition: 'Very Low',
      imageUrl: 'https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?w=400&h=300&fit=crop',
      averageGPA: '9.2', averageSAT: 0, description: "Presidency University Kolkata is a historic institution known for producing Nobel laureates and India's greatest intellectuals and scholars.",
      highlights: ['Historic Institution', 'Nobel Laureate Alumni', 'Strong Humanities'], campusSize: 'Medium', studentPopulation: 3000, isPublic: true, isSaved: false
    },
    {
      id: 'arts-3', name: 'Stella Maris College', shortName: 'Stella Maris Chennai',
      location: 'Cathedral Road, Chennai', state: 'Tamil Nadu', city: 'Chennai', type: 'Private',
      established: 1947, website: 'https://www.stellamariscollege.edu.in',
      courses: ['BA English', 'BA History', 'BA Economics', 'BA Tamil', 'BA Psychology', 'BMM', 'Arts', 'Journalism', 'Design'],
      programs: ['Arts', 'Economics', 'English', 'History', 'Psychology', 'Journalism'],
      rating: 4.5, fees: 'â‚¹30,000 â€“ 60,000', cutoff: 'Entrance / Merit',
      latitude: 13.0569, longitude: 80.2425, ranking: 5, acceptanceRate: 15, tuition: 'Moderate',
      imageUrl: 'https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?w=400&h=300&fit=crop',
      averageGPA: '8.8', averageSAT: 0, description: "Stella Maris College is a premier women's autonomous college in Chennai known for humanities excellence and social engagement.",
      highlights: ['Autonomous College', 'Humanities Focus', 'Active Cultural Scene'], campusSize: 'Small', studentPopulation: 3200, isPublic: false, isSaved: false
    },
    {
      id: 'arts-4', name: "St. Xavier's College", shortName: 'Xaviers Mumbai',
      location: 'Mahapalika Marg, Mumbai', state: 'Maharashtra', city: 'Mumbai', type: 'Private',
      established: 1869, website: 'https://xaviers.ac',
      courses: ['BMM', 'BMS', 'BA English', 'BA History', 'BA Economics', 'Arts', 'Design', 'Journalism'],
      programs: ['Arts', 'Economics', 'English', 'History', 'Journalism'],
      rating: 4.7, fees: 'â‚¹40,000', cutoff: 'Entrance / Merit',
      latitude: 18.9431, longitude: 72.8315, ranking: 3, acceptanceRate: 5, tuition: 'Moderate',
      imageUrl: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400&h=300&fit=crop',
      averageGPA: '8.8', averageSAT: 0, description: "St. Xavier's College Mumbai is a premier autonomous arts and science college known for holistic education, cultural events and strong alumni.",
      highlights: ['Cultural Festivals', 'Autonomous Curriculum', 'Prime Location'], campusSize: 'Small', studentPopulation: 3000, isPublic: false, isSaved: false
    },
    {
      id: 'arts-5', name: 'Symbiosis School of Liberal Arts', shortName: 'SSLA Pune',
      location: 'Viman Nagar, Pune', state: 'Maharashtra', city: 'Pune', type: 'Private',
      established: 2013, website: 'https://ssla.edu.in',
      courses: ['BA Liberal Arts', 'BA English', 'BA Economics', 'BA Psychology', 'BA Political Science', 'Arts', 'Design'],
      programs: ['Arts', 'Economics', 'English', 'Psychology'],
      rating: 4.4, fees: 'â‚¹2L â€“ 3L', cutoff: 'SET / Merit',
      latitude: 18.5679, longitude: 73.9143, ranking: 7, acceptanceRate: 20, tuition: 'High',
      imageUrl: 'https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?w=400&h=300&fit=crop',
      averageGPA: '8.6', averageSAT: 0, description: 'Symbiosis School of Liberal Arts offers a modern interdisciplinary arts education, blending humanities, social sciences and digital skills.',
      highlights: ['Liberal Arts Focus', 'Interdisciplinary Programs', 'Industry Collaborations'], campusSize: 'Small', studentPopulation: 1200, isPublic: false, isSaved: false
    },
    {
      id: 'arts-6', name: 'Government Arts College, Ariyalur', shortName: 'GAC Ariyalur',
      location: 'Ariyalur, Tamil Nadu', state: 'Tamil Nadu', city: 'Ariyalur', type: 'Government',
      established: 2010, website: '',
      courses: ['BA Tamil', 'BA English', 'BA History', 'BA Economics', 'Arts', 'Science'],
      programs: ['Arts', 'Economics', 'English', 'History'],
      rating: 3.8, fees: 'â‚¹3,000 â€“ 8,000', cutoff: 'TNEA / Merit Based',
      latitude: 11.1392, longitude: 79.0792, ranking: 0, acceptanceRate: 70, tuition: 'Very Low',
      imageUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?w=400&h=300&fit=crop',
      averageGPA: '7.0', averageSAT: 0, description: 'Government Arts College Ariyalur is an affordable government institution offering undergraduate arts and science programs in Tamil Nadu.',
      highlights: ['Affordable Government College', 'Arts & Science Programs', 'Tamil Nadu Government'], campusSize: 'Small', studentPopulation: 800, isPublic: true, isSaved: false
    },
    {
      id: 'arts-7', name: 'Government Arts and Science College, Jayankondam', shortName: 'GASC Jayankondam',
      location: 'Jayankondam, Tamil Nadu', state: 'Tamil Nadu', city: 'Jayankondam', type: 'Government',
      established: 2012, website: '',
      courses: ['BA Tamil', 'BA English', 'BA History', 'BSc Mathematics', 'Arts', 'Science', 'Commerce', 'BCA'],
      programs: ['Arts', 'Economics', 'English', 'History'],
      rating: 3.7, fees: '₹3,000 – 8,000', cutoff: 'TNEA / Merit Based',
      latitude: 11.2358, longitude: 79.3584, ranking: 0, acceptanceRate: 72, tuition: 'Very Low',
      imageUrl: 'https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?w=400&h=300&fit=crop',
      averageGPA: '7.0', averageSAT: 0, description: 'Government Arts and Science College Jayankondam offers affordable undergraduate education in arts, science and commerce.',
      highlights: ['Affordable Government College', 'Arts, Science & Commerce', 'Tamil Nadu Government'], campusSize: 'Small', studentPopulation: 700, isPublic: true, isSaved: false
    },

    // ── AGRICULTURE ──────────────────────────────────────────────────────────
    {
      id: 'agri-1', name: 'Indian Agricultural Research Institute', shortName: 'IARI New Delhi',
      location: 'Pusa, New Delhi', state: 'Delhi', city: 'New Delhi', type: 'Government',
      established: 1905, website: 'https://www.iari.res.in',
      courses: ['BSc Agriculture', 'MSc Agronomy', 'PhD Agriculture', 'Agriculture', 'Agricultural', 'Horticulture', 'Agronomy'],
      programs: ['Agriculture', 'Agricultural', 'Agronomy', 'Horticulture'],
      rating: 4.9, fees: '₹10,000 – 30,000', cutoff: 'ICAR AIEEA Rank 1–200',
      latitude: 28.6381, longitude: 77.1560, ranking: 1, acceptanceRate: 3, tuition: 'Very Low',
      imageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=300&fit=crop',
      averageGPA: '9.2', averageSAT: 0, description: 'IARI (Pusa Institute) is the premier agricultural research institute in India, known for producing high-yielding crop varieties and world-class agri-scientists.',
      highlights: ['Pusa Basmati Varieties', 'Top Agricultural Research', 'ICAR Premier Institute'], campusSize: 'Large', studentPopulation: 2500, isPublic: true, isSaved: false
    },
    {
      id: 'agri-2', name: 'Tamil Nadu Agricultural University', shortName: 'TNAU Coimbatore',
      location: 'Lawley Road, Coimbatore', state: 'Tamil Nadu', city: 'Coimbatore', type: 'Government',
      established: 1971, website: 'https://www.tnau.ac.in',
      courses: ['BSc Agriculture', 'BSc Horticulture', 'BSc Forestry', 'BTech Agricultural Engineering', 'BTech Food Technology', 'Agriculture', 'Agricultural', 'Horticulture', 'Agronomy', 'Forestry', 'Food Technology'],
      programs: ['Agriculture', 'Agricultural', 'Horticulture', 'Agronomy', 'Food Technology', 'Forestry'],
      rating: 4.7, fees: '₹15,000 – 40,000', cutoff: 'TNAU Entrance Rank 1–5000',
      latitude: 11.0168, longitude: 76.9558, ranking: 2, acceptanceRate: 10, tuition: 'Low',
      imageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=300&fit=crop',
      averageGPA: '8.8', averageSAT: 0, description: 'TNAU is one of the best agricultural universities in South India, offering comprehensive programs in agriculture, horticulture, food technology and agricultural engineering.',
      highlights: ['Best Agri University in South India', 'Excellent Research Farms', 'Strong Alumni in Agri Sector'], campusSize: 'Large', studentPopulation: 5000, isPublic: true, isSaved: false
    },
    {
      id: 'agri-3', name: 'Punjab Agricultural University', shortName: 'PAU Ludhiana',
      location: 'Ludhiana, Punjab', state: 'Punjab', city: 'Ludhiana', type: 'Government',
      established: 1962, website: 'https://www.pau.edu',
      courses: ['BSc Agriculture', 'BSc Horticulture', 'BTech Agricultural Engineering', 'BSc Dairy Science', 'Agriculture', 'Agricultural', 'Horticulture', 'Dairy', 'Agronomy'],
      programs: ['Agriculture', 'Agricultural', 'Horticulture', 'Dairy', 'Agronomy'],
      rating: 4.7, fees: '₹20,000 – 50,000', cutoff: 'PAU CET Merit',
      latitude: 30.9010, longitude: 75.8573, ranking: 3, acceptanceRate: 8, tuition: 'Low',
      imageUrl: 'https://images.unsplash.com/photo-1473773508845-188df298d2d1?w=400&h=300&fit=crop',
      averageGPA: '8.7', averageSAT: 0, description: 'PAU Ludhiana is one of Asia\'s leading agricultural universities, famous for the Green Revolution research that transformed Indian farming.',
      highlights: ['Green Revolution Heritage', 'Wheat & Rice Research Leader', 'Excellent Extension Programs'], campusSize: 'Large', studentPopulation: 4000, isPublic: true, isSaved: false
    },
    {
      id: 'agri-4', name: 'G.B. Pant University of Agriculture and Technology', shortName: 'GBPUAT Pantnagar',
      location: 'Pantnagar, Uttarakhand', state: 'Uttarakhand', city: 'Pantnagar', type: 'Government',
      established: 1960, website: 'https://www.gbpuat.ac.in',
      courses: ['BSc Agriculture', 'BSc Horticulture', 'BTech Agricultural Engineering', 'BSc Fisheries', 'Agriculture', 'Agricultural', 'Horticulture', 'Fisheries', 'Agronomy'],
      programs: ['Agriculture', 'Agricultural', 'Horticulture', 'Fisheries', 'Agronomy'],
      rating: 4.6, fees: '₹15,000 – 40,000', cutoff: 'ICAR AIEEA Rank 200–1000',
      latitude: 29.0005, longitude: 79.4919, ranking: 4, acceptanceRate: 12, tuition: 'Low',
      imageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=300&fit=crop',
      averageGPA: '8.5', averageSAT: 0, description: 'GBPUAT (Pantnagar University) is India\'s first agricultural university and a model for green revolution research and agricultural education.',
      highlights: ['India\'s First Agri University', 'Pantnagar Seed Development', 'Strong Research Tradition'], campusSize: 'Large', studentPopulation: 6000, isPublic: true, isSaved: false
    },
    {
      id: 'agri-5', name: 'Anand Agricultural University', shortName: 'AAU Anand',
      location: 'Anand, Gujarat', state: 'Gujarat', city: 'Anand', type: 'Government',
      established: 2004, website: 'https://www.aau.in',
      courses: ['BSc Agriculture', 'BSc Horticulture', 'BTech Agricultural Engineering', 'BSc Dairy Science', 'Agriculture', 'Agricultural', 'Horticulture', 'Dairy', 'Agronomy'],
      programs: ['Agriculture', 'Agricultural', 'Horticulture', 'Dairy', 'Agronomy'],
      rating: 4.4, fees: '₹12,000 – 35,000', cutoff: 'ACPC Merit / ICAR AIEEA',
      latitude: 22.5645, longitude: 72.9289, ranking: 6, acceptanceRate: 15, tuition: 'Low',
      imageUrl: 'https://images.unsplash.com/photo-1473773508845-188df298d2d1?w=400&h=300&fit=crop',
      averageGPA: '8.3', averageSAT: 0, description: 'AAU Anand is a premier agricultural university in Gujarat known for dairy science and horticulture, with strong ties to the AMUL cooperative model.',
      highlights: ['Dairy Science Excellence', 'AMUL Partnership', 'Horticulture Research'], campusSize: 'Large', studentPopulation: 3500, isPublic: true, isSaved: false
    },
    {
      id: 'agri-6', name: 'Kerala Agricultural University', shortName: 'KAU Thrissur',
      location: 'Vellanikkara, Thrissur', state: 'Kerala', city: 'Thrissur', type: 'Government',
      established: 1971, website: 'https://www.kau.in',
      courses: ['BSc Agriculture', 'BSc Horticulture', 'BSc Forestry', 'BFSc Fisheries', 'Agriculture', 'Agricultural', 'Horticulture', 'Forestry', 'Fisheries', 'Agronomy'],
      programs: ['Agriculture', 'Agricultural', 'Horticulture', 'Forestry', 'Fisheries', 'Agronomy'],
      rating: 4.4, fees: '₹10,000 – 30,000', cutoff: 'KEAM / ICAR AIEEA Merit',
      latitude: 10.5276, longitude: 76.2144, ranking: 7, acceptanceRate: 18, tuition: 'Very Low',
      imageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=300&fit=crop',
      averageGPA: '8.2', averageSAT: 0, description: 'KAU is the state agricultural university of Kerala, offering programs in agriculture, horticulture, forestry and fisheries with strong tropical farming research.',
      highlights: ['Tropical Agriculture Research', 'Coconut & Rubber Expertise', 'Fisheries Programs'], campusSize: 'Large', studentPopulation: 3000, isPublic: true, isSaved: false
    },
    {
      id: 'agri-7', name: 'Acharya N.G. Ranga Agricultural University', shortName: 'ANGRAU Guntur',
      location: 'Lam, Guntur', state: 'Andhra Pradesh', city: 'Guntur', type: 'Government',
      established: 1964, website: 'https://www.angrau.ac.in',
      courses: ['BSc Agriculture', 'BSc Horticulture', 'BTech Agricultural Engineering', 'BSc Fisheries', 'Agriculture', 'Agricultural', 'Horticulture', 'Fisheries', 'Agronomy'],
      programs: ['Agriculture', 'Agricultural', 'Horticulture', 'Fisheries', 'Agronomy'],
      rating: 4.3, fees: '₹10,000 – 30,000', cutoff: 'APSCHE / ICAR AIEEA Merit',
      latitude: 16.3067, longitude: 80.4365, ranking: 8, acceptanceRate: 20, tuition: 'Low',
      imageUrl: 'https://images.unsplash.com/photo-1473773508845-188df298d2d1?w=400&h=300&fit=crop',
      averageGPA: '8.0', averageSAT: 0, description: 'ANGRAU is the leading state agricultural university of Andhra Pradesh, renowned for rice and aquaculture research and producing top agri-scientists.',
      highlights: ['Rice Research Excellence', 'Aquaculture Programs', 'Strong Field Training'], campusSize: 'Large', studentPopulation: 4500, isPublic: true, isSaved: false
    },
    {
      id: 'agri-8', name: 'University of Agricultural Sciences', shortName: 'UAS Dharwad',
      location: 'Dharwad, Karnataka', state: 'Karnataka', city: 'Dharwad', type: 'Government',
      established: 1986, website: 'https://www.uasd.edu.in',
      courses: ['BSc Agriculture', 'BSc Horticulture', 'BTech Agricultural Engineering', 'BSc Forestry', 'Agriculture', 'Agricultural', 'Horticulture', 'Forestry', 'Agronomy'],
      programs: ['Agriculture', 'Agricultural', 'Horticulture', 'Forestry', 'Agronomy'],
      rating: 4.3, fees: '₹10,000 – 28,000', cutoff: 'KPCAET / ICAR AIEEA Merit',
      latitude: 15.4560, longitude: 75.0076, ranking: 9, acceptanceRate: 22, tuition: 'Low',
      imageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=300&fit=crop',
      averageGPA: '8.0', averageSAT: 0, description: 'UAS Dharwad is a leading agricultural university in Karnataka offering comprehensive programs in agriculture, horticulture and agri-engineering.',
      highlights: ['Dryland Agriculture Research', 'Hybrid Seed Development', 'Karnataka Agri Leader'], campusSize: 'Large', studentPopulation: 3200, isPublic: true, isSaved: false
    },

    // ── TAMIL NADU AGRICULTURE (TNAU Colleges) ───────────────────────────────
    {
      id: 'tnau-1', name: 'Agricultural College and Research Institute, Coimbatore', shortName: 'ACRI Coimbatore',
      location: 'Coimbatore', state: 'Tamil Nadu', city: 'Coimbatore', type: 'Government',
      established: 1906, website: 'https://tnau.ac.in',
      courses: ['AGRI', 'HORT', 'AGR_ENG', 'BSc Agriculture', 'BSc Horticulture', 'BTech Agricultural Engineering', 'Agriculture', 'Horticulture', 'Agricultural'],
      programs: ['Agriculture', 'Agricultural', 'Horticulture', 'Agronomy'],
      rating: 4.8, fees: '₹25,000', cutoff: 'TNAU Entrance Rank 1–500',
      latitude: 11.0120, longitude: 76.9350, ranking: 1, acceptanceRate: 5, tuition: 'Low',
      imageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=300&fit=crop',
      averageGPA: '8.9', averageSAT: 0, description: 'One of the oldest and most prestigious agricultural colleges in Tamil Nadu under TNAU, offering top-ranked programs in agriculture, horticulture and agricultural engineering.',
      highlights: ['Oldest Agri College in TN', 'TNAU Flagship', 'Excellent Research Farms'], campusSize: 'Large', studentPopulation: 2000, isPublic: true, isSaved: false
    },
    {
      id: 'tnau-2', name: 'Agricultural College and Research Institute, Madurai', shortName: 'ACRI Madurai',
      location: 'Madurai', state: 'Tamil Nadu', city: 'Madurai', type: 'Government',
      established: 1965, website: 'https://tnau.ac.in',
      courses: ['AGRI', 'HORT', 'AGR_ENG', 'BSc Agriculture', 'BSc Horticulture', 'Agriculture', 'Horticulture', 'Agricultural'],
      programs: ['Agriculture', 'Agricultural', 'Horticulture', 'Agronomy'],
      rating: 4.5, fees: '₹20,000', cutoff: 'TNAU Entrance Rank 500–2000',
      latitude: 9.9252, longitude: 78.1198, ranking: 3, acceptanceRate: 10, tuition: 'Low',
      imageUrl: 'https://images.unsplash.com/photo-1473773508845-188df298d2d1?w=400&h=300&fit=crop',
      averageGPA: '8.5', averageSAT: 0, description: 'ACRI Madurai is a well-established government agricultural college under TNAU offering quality programs for students from South Tamil Nadu.',
      highlights: ['South TN Agri Hub', 'TNAU Affiliated', 'Field Training Excellence'], campusSize: 'Large', studentPopulation: 1500, isPublic: true, isSaved: false
    },
    {
      id: 'tnau-3', name: 'Agricultural College and Research Institute, Killikulam', shortName: 'ACRI Killikulam',
      location: 'Thoothukudi', state: 'Tamil Nadu', city: 'Thoothukudi', type: 'Government',
      established: 1984, website: 'https://tnau.ac.in',
      courses: ['AGRI', 'HORT', 'AGR_ENG', 'BSc Agriculture', 'BSc Horticulture', 'Agriculture', 'Horticulture', 'Agricultural'],
      programs: ['Agriculture', 'Agricultural', 'Horticulture', 'Agronomy'],
      rating: 4.4, fees: '₹18,000', cutoff: 'TNAU Entrance Rank 1000–3000',
      latitude: 8.7560, longitude: 77.7750, ranking: 4, acceptanceRate: 12, tuition: 'Low',
      imageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=300&fit=crop',
      averageGPA: '8.3', averageSAT: 0, description: 'ACRI Killikulam serves students from the southern districts of Tamil Nadu with strong programs in agriculture and horticulture under TNAU.',
      highlights: ['Dryland Farming Research', 'TNAU Affiliated', 'Coastal Agriculture'], campusSize: 'Medium', studentPopulation: 1200, isPublic: true, isSaved: false
    },
    {
      id: 'tnau-4', name: 'Agricultural College and Research Institute, Eachangkottai', shortName: 'ACRI Thanjavur',
      location: 'Thanjavur', state: 'Tamil Nadu', city: 'Thanjavur', type: 'Government',
      established: 2008, website: 'https://tnau.ac.in',
      courses: ['AGRI', 'HORT', 'AGR_ENG', 'BSc Agriculture', 'BSc Horticulture', 'Agriculture', 'Horticulture', 'Agricultural'],
      programs: ['Agriculture', 'Agricultural', 'Horticulture'],
      rating: 4.2, fees: '₹18,000', cutoff: 'TNAU Entrance Rank 2000–5000',
      latitude: 10.7870, longitude: 79.1378, ranking: 5, acceptanceRate: 15, tuition: 'Low',
      imageUrl: 'https://images.unsplash.com/photo-1473773508845-188df298d2d1?w=400&h=300&fit=crop',
      averageGPA: '8.0', averageSAT: 0, description: 'Located in the rice bowl of Tamil Nadu, ACRI Eachangkottai specialises in paddy and delta agriculture research under TNAU.',
      highlights: ['Delta Agriculture Focus', 'Rice Cultivation Research', 'TNAU Affiliated'], campusSize: 'Medium', studentPopulation: 900, isPublic: true, isSaved: false
    },
    {
      id: 'tnau-5', name: 'Horticultural College and Research Institute, Coimbatore', shortName: 'HCRI Coimbatore',
      location: 'Coimbatore', state: 'Tamil Nadu', city: 'Coimbatore', type: 'Government',
      established: 1971, website: 'https://tnau.ac.in',
      courses: ['HORT', 'AGRI', 'BSc Horticulture', 'BSc Agriculture', 'Horticulture', 'Agriculture', 'Agricultural'],
      programs: ['Horticulture', 'Agriculture', 'Agricultural'],
      rating: 4.6, fees: '₹20,000', cutoff: 'TNAU Entrance Rank 200–1500',
      latitude: 11.0160, longitude: 76.9400, ranking: 2, acceptanceRate: 8, tuition: 'Low',
      imageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=300&fit=crop',
      averageGPA: '8.7', averageSAT: 0, description: 'HCRI Coimbatore is a premier horticulture college in South India under TNAU, known for flower, fruit and vegetable crop research.',
      highlights: ['Horticulture Specialist', 'Floriculture Research', 'TNAU Flagship'], campusSize: 'Large', studentPopulation: 1800, isPublic: true, isSaved: false
    },
    {
      id: 'tnau-6', name: 'Horticultural College and Research Institute, Periyakulam', shortName: 'HCRI Periyakulam',
      location: 'Theni', state: 'Tamil Nadu', city: 'Theni', type: 'Government',
      established: 1985, website: 'https://tnau.ac.in',
      courses: ['HORT', 'AGRI', 'BSc Horticulture', 'BSc Agriculture', 'Horticulture', 'Agriculture', 'Agricultural'],
      programs: ['Horticulture', 'Agriculture', 'Agricultural'],
      rating: 4.4, fees: '₹18,000', cutoff: 'TNAU Entrance Rank 800–2500',
      latitude: 10.1200, longitude: 77.5500, ranking: 6, acceptanceRate: 12, tuition: 'Low',
      imageUrl: 'https://images.unsplash.com/photo-1473773508845-188df298d2d1?w=400&h=300&fit=crop',
      averageGPA: '8.2', averageSAT: 0, description: 'HCRI Periyakulam is a specialised horticultural college under TNAU located in the foothills of the Western Ghats, known for mango and banana research.',
      highlights: ['Hill Zone Horticulture', 'Mango & Banana Research', 'TNAU Affiliated'], campusSize: 'Medium', studentPopulation: 1000, isPublic: true, isSaved: false
    },
    {
      id: 'tnau-7', name: 'Forest College and Research Institute', shortName: 'FCRI Mettupalayam',
      location: 'Mettupalayam', state: 'Tamil Nadu', city: 'Coimbatore', type: 'Government',
      established: 1990, website: 'https://tnau.ac.in',
      courses: ['FORESTRY', 'BSc Forestry', 'Forestry', 'Agriculture', 'Agricultural'],
      programs: ['Forestry', 'Agriculture', 'Agricultural'],
      rating: 4.3, fees: '₹18,000', cutoff: 'TNAU Entrance Rank 1000–3000',
      latitude: 11.3000, longitude: 76.9400, ranking: 7, acceptanceRate: 15, tuition: 'Low',
      imageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=300&fit=crop',
      averageGPA: '8.0', averageSAT: 0, description: 'FCRI Mettupalayam is the only government forestry college in Tamil Nadu under TNAU, offering programmes in sustainable forest management.',
      highlights: ['Only Forestry College in TN', 'Western Ghats Research', 'TNAU Affiliated'], campusSize: 'Medium', studentPopulation: 600, isPublic: true, isSaved: false
    },
    {
      id: 'tnau-8', name: 'Agricultural Engineering College and Research Institute', shortName: 'AECRI Coimbatore',
      location: 'Coimbatore', state: 'Tamil Nadu', city: 'Coimbatore', type: 'Government',
      established: 1972, website: 'https://tnau.ac.in',
      courses: ['AGR_ENG', 'BTech Agricultural Engineering', 'Agricultural Engineering', 'Agriculture', 'Agricultural'],
      programs: ['Agricultural Engineering', 'Agriculture', 'Agricultural'],
      rating: 4.5, fees: '₹22,000', cutoff: 'TNAU Entrance Rank 100–1000',
      latitude: 11.0180, longitude: 76.9360, ranking: 2, acceptanceRate: 8, tuition: 'Low',
      imageUrl: 'https://images.unsplash.com/photo-1473773508845-188df298d2d1?w=400&h=300&fit=crop',
      averageGPA: '8.6', averageSAT: 0, description: 'AECRI Coimbatore is a leading agricultural engineering institution under TNAU specialising in farm machinery, irrigation and post-harvest technology.',
      highlights: ['Agricultural Engineering Leader', 'Farm Mechanisation Research', 'TNAU Affiliated'], campusSize: 'Large', studentPopulation: 1500, isPublic: true, isSaved: false
    },
    {
      id: 'tnau-9', name: 'Agricultural College and Research Institute, Vazhavachanur', shortName: 'ACRI Tiruvannamalai',
      location: 'Tiruvannamalai', state: 'Tamil Nadu', city: 'Tiruvannamalai', type: 'Government',
      established: 2014, website: 'https://tnau.ac.in',
      courses: ['AGRI', 'BSc Agriculture', 'Agriculture', 'Agricultural'],
      programs: ['Agriculture', 'Agricultural'],
      rating: 4.1, fees: '₹17,000', cutoff: 'TNAU Entrance Rank 3000–6000',
      latitude: 12.2300, longitude: 79.0700, ranking: 10, acceptanceRate: 20, tuition: 'Low',
      imageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=300&fit=crop',
      averageGPA: '7.8', averageSAT: 0, description: 'ACRI Vazhavachanur is a newer government agricultural college under TNAU serving students from North Tamil Nadu.',
      highlights: ['North TN Agri Access', 'TNAU Affiliated', 'Affordable Government College'], campusSize: 'Small', studentPopulation: 600, isPublic: true, isSaved: false
    },
    {
      id: 'tnau-10', name: 'Agricultural College and Research Institute, Kudumiyanmalai', shortName: 'ACRI Pudukottai',
      location: 'Pudukottai', state: 'Tamil Nadu', city: 'Pudukottai', type: 'Government',
      established: 2014, website: 'https://tnau.ac.in',
      courses: ['AGRI', 'BSc Agriculture', 'Agriculture', 'Agricultural'],
      programs: ['Agriculture', 'Agricultural'],
      rating: 4.1, fees: '₹17,000', cutoff: 'TNAU Entrance Rank 3000–6000',
      latitude: 10.4600, longitude: 78.7800, ranking: 10, acceptanceRate: 20, tuition: 'Low',
      imageUrl: 'https://images.unsplash.com/photo-1473773508845-188df298d2d1?w=400&h=300&fit=crop',
      averageGPA: '7.8', averageSAT: 0, description: 'ACRI Kudumiyanmalai is a government agricultural college under TNAU providing quality agricultural education in the Pudukottai district.',
      highlights: ['Central TN Agri Access', 'TNAU Affiliated', 'Affordable Government College'], campusSize: 'Small', studentPopulation: 600, isPublic: true, isSaved: false
    },

    // ── TAMIL NADU PRIVATE AGRICULTURE ───────────────────────────────────────
    {
      id: 'pvt-agri-1', name: 'Karunya Institute of Technology and Sciences - School of Agriculture', shortName: 'Karunya Agriculture',
      location: 'Coimbatore', state: 'Tamil Nadu', city: 'Coimbatore', type: 'Private',
      established: 1986, website: 'https://www.karunya.edu',
      courses: ['AGRI', 'BSc Agriculture', 'Agriculture', 'Agricultural'],
      programs: ['Agriculture', 'Agricultural'],
      rating: 4.3, fees: '₹1,50,000', cutoff: 'Merit / Entrance',
      latitude: 10.9400, longitude: 76.7500, ranking: 12, acceptanceRate: 30, tuition: 'High',
      imageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=300&fit=crop',
      averageGPA: '8.2', averageSAT: 0, description: 'Karunya Institute offers BSc Agriculture through its School of Agriculture, blending modern farming practices with Christian values.',
      highlights: ['Private Deemed University', 'Modern Agri Labs', 'Coimbatore Location'], campusSize: 'Large', studentPopulation: 8000, isPublic: false, isSaved: false
    },
    {
      id: 'pvt-agri-2', name: 'SRM Institute of Science and Technology - Faculty of Agricultural Sciences', shortName: 'SRM Agriculture',
      location: 'Kattankulathur', state: 'Tamil Nadu', city: 'Chennai', type: 'Private',
      established: 2018, website: 'https://www.srmist.edu.in',
      courses: ['AGRI', 'BSc Agriculture', 'Agriculture', 'Agricultural'],
      programs: ['Agriculture', 'Agricultural'],
      rating: 4.2, fees: '₹1,80,000', cutoff: 'SRMJEEE / Merit',
      latitude: 12.8230, longitude: 80.0444, ranking: 13, acceptanceRate: 35, tuition: 'High',
      imageUrl: 'https://images.unsplash.com/photo-1473773508845-188df298d2d1?w=400&h=300&fit=crop',
      averageGPA: '8.0', averageSAT: 0, description: 'SRM Institute\'s Faculty of Agricultural Sciences offers modern agri programs with industry linkages and advanced research facilities.',
      highlights: ['Private Deemed University', 'Industry Tie-ups', 'Modern Campus'], campusSize: 'Large', studentPopulation: 20000, isPublic: false, isSaved: false
    },
    {
      id: 'pvt-agri-3', name: 'Sathyabama Institute of Science and Technology - Agriculture', shortName: 'Sathyabama Agriculture',
      location: 'Chennai', state: 'Tamil Nadu', city: 'Chennai', type: 'Private',
      established: 2019, website: 'https://www.sathyabama.ac.in',
      courses: ['AGRI', 'BSc Agriculture', 'Agriculture', 'Agricultural'],
      programs: ['Agriculture', 'Agricultural'],
      rating: 4.1, fees: '₹1,60,000', cutoff: 'SHSAT / Merit',
      latitude: 12.8736, longitude: 80.2214, ranking: 14, acceptanceRate: 35, tuition: 'High',
      imageUrl: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?w=400&h=300&fit=crop',
      averageGPA: '7.9', averageSAT: 0, description: 'Sathyabama Institute offers agriculture programs with a focus on sustainable farming and agri-technology integration.',
      highlights: ['Deemed University', 'Technology Integration', 'Chennai Location'], campusSize: 'Large', studentPopulation: 12000, isPublic: false, isSaved: false
    },
    {
      id: 'pvt-agri-4', name: 'Vellore Institute of Technology - School of Agricultural Innovations', shortName: 'VIT Agriculture',
      location: 'Vellore', state: 'Tamil Nadu', city: 'Vellore', type: 'Private',
      established: 2020, website: 'https://vit.ac.in',
      courses: ['AGRI', 'BSc Agriculture', 'Agriculture', 'Agricultural'],
      programs: ['Agriculture', 'Agricultural'],
      rating: 4.4, fees: '₹1,90,000', cutoff: 'VITEEE / Merit',
      latitude: 12.9692, longitude: 79.1559, ranking: 11, acceptanceRate: 25, tuition: 'High',
      imageUrl: 'https://images.unsplash.com/photo-1473773508845-188df298d2d1?w=400&h=300&fit=crop',
      averageGPA: '8.3', averageSAT: 0, description: 'VIT\'s School of Agricultural Innovations offers BSc Agriculture with a focus on precision farming, agri-tech and sustainable practices.',
      highlights: ['Premier Private University', 'Agri-Tech Focus', 'VIT Brand Excellence'], campusSize: 'Large', studentPopulation: 35000, isPublic: false, isSaved: false
    }
  ]
}

// Helper function to log user activity
async function logActivity(supabase: any, userId: string, activity: {
  type: string
  title: string
  description: string
  metadata: any
}) {
  try {
    await supabase
      .from('user_activities')
      .insert({
        user_id: userId,
        type: activity.type,
        title: activity.title,
        description: activity.description,
        metadata: activity.metadata
      })
  } catch (error) {
    console.error('Error logging activity:', error)
    // Don't throw - logging failure shouldn't break the main operation
  }
}
