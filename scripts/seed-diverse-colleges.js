const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const colleges = [
  {
    name: 'All India Institute of Medical Sciences (AIIMS)',
    location: 'Ansari Nagar, New Delhi',
    state: 'Delhi',
    city: 'New Delhi',
    type: 'Government',
    established: 1956,
    website: 'https://www.aiims.edu',
    courses: JSON.stringify(['MBBS', 'MD', 'MS', 'Medical', 'Nursing']),
    programs: JSON.stringify(['Medical']),
    rating: 4.9,
    fees: JSON.stringify('₹6,000 - 10,000'),
    cutoff: JSON.stringify('NEET Rank 1-50'),
    latitude: 28.5659,
    longitude: 77.2088,
    image: 'https://images.unsplash.com/photo-1581595220892-0b2fbc456b3e?w=400'
  },
  {
    name: 'Christian Medical College (CMC)',
    location: 'Vellore, Tamil Nadu',
    state: 'Tamil Nadu',
    city: 'Vellore',
    type: 'Private',
    established: 1900,
    website: 'https://www.cmch-vellore.edu',
    courses: JSON.stringify(['MBBS', 'BSc Nursing', 'Medical']),
    programs: JSON.stringify(['Medical']),
    rating: 4.8,
    fees: JSON.stringify('₹1.5L - 2L'),
    cutoff: JSON.stringify('NEET + CMC Test'),
    latitude: 12.9244,
    longitude: 79.1350,
    image: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400'
  },
  {
    name: 'National Law School of India University (NLSIU)',
    location: 'Nagarbhavi, Bangalore',
    state: 'Karnataka',
    city: 'Bangalore',
    type: 'Government',
    established: 1986,
    website: 'https://www.nls.ac.in',
    courses: JSON.stringify(['BA LLB', 'LLM', 'Law']),
    programs: JSON.stringify(['Law']),
    rating: 4.9,
    fees: JSON.stringify('₹2.5L - 3L'),
    cutoff: JSON.stringify('CLAT Rank 1-60'),
    latitude: 12.9716,
    longitude: 77.5946,
    image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400'
  },
  {
    name: 'Shri Ram College of Commerce (SRCC)',
    location: 'North Campus, Delhi University',
    state: 'Delhi',
    city: 'New Delhi',
    type: 'Government',
    established: 1926,
    website: 'https://www.srcc.edu',
    courses: JSON.stringify(['B.Com (Hons)', 'BA Economics', 'Commerce']),
    programs: JSON.stringify(['Commerce']),
    rating: 4.7,
    fees: JSON.stringify('₹30,000'),
    cutoff: JSON.stringify('CUET 99%ile'),
    latitude: 28.6874,
    longitude: 77.2068,
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400'
  },
  {
    name: 'St. Xavier\'s College',
    location: 'Mahapalika Marg, Mumbai',
    state: 'Maharashtra',
    city: 'Mumbai',
    type: 'Private',
    established: 1869,
    website: 'https://xaviers.ac',
    courses: JSON.stringify(['BMM', 'BMS', 'Arts', 'Science', 'Commerce']),
    programs: JSON.stringify(['Arts', 'Commerce']),
    rating: 4.6,
    fees: JSON.stringify('₹40,000'),
    cutoff: JSON.stringify('Merit based / Entrance'),
    latitude: 18.9431,
    longitude: 72.8315,
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400'
  },
  {
    name: 'National Institute of Design (NID)',
    location: 'Paldi, Ahmedabad',
    state: 'Gujarat',
    city: 'Ahmedabad',
    type: 'Government',
    established: 1961,
    website: 'https://www.nid.edu',
    courses: JSON.stringify(['B.Des', 'M.Des', 'Design', 'Arts']),
    programs: JSON.stringify(['Design', 'Arts']),
    rating: 4.8,
    fees: JSON.stringify('₹3L - 4L'),
    cutoff: JSON.stringify('NID DAT'),
    latitude: 23.0135,
    longitude: 72.5623,
    image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=400'
  },
  // ── ARTS COLLEGES ──────────────────────────────────────────────────
  {
    name: 'Lady Shri Ram College for Women (LSR)',
    location: 'Lajpat Nagar, New Delhi',
    state: 'Delhi',
    city: 'New Delhi',
    type: 'Government',
    established: 1956,
    website: 'https://www.lsr.edu.in',
    courses: JSON.stringify(['BA English', 'BA History', 'BA Psychology', 'BA Economics', 'BA Political Science', 'Arts']),
    programs: JSON.stringify(['Arts']),
    rating: 4.8,
    fees: JSON.stringify('₹20,000 - 40,000'),
    cutoff: JSON.stringify('CUET 98%ile+'),
    latitude: 28.5665,
    longitude: 77.2431,
    image: 'https://images.unsplash.com/photo-1562774053-701939374585?w=400'
  },
  {
    name: 'Miranda House',
    location: 'North Campus, Delhi University',
    state: 'Delhi',
    city: 'New Delhi',
    type: 'Government',
    established: 1948,
    website: 'https://www.mirandahouse.ac.in',
    courses: JSON.stringify(['BA English', 'BA Hindi', 'BA History', 'BA Sociology', 'BA Philosophy', 'Arts']),
    programs: JSON.stringify(['Arts']),
    rating: 4.8,
    fees: JSON.stringify('₹15,000 - 35,000'),
    cutoff: JSON.stringify('CUET 97%ile+'),
    latitude: 28.6877,
    longitude: 77.2108,
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400'
  },
  {
    name: 'Presidency College',
    location: 'College Street, Kolkata',
    state: 'West Bengal',
    city: 'Kolkata',
    type: 'Government',
    established: 1817,
    website: 'https://www.presiuniv.ac.in',
    courses: JSON.stringify(['BA English', 'BA History', 'BA Philosophy', 'BA Sociology', 'Arts', 'Science']),
    programs: JSON.stringify(['Arts']),
    rating: 4.7,
    fees: JSON.stringify('₹10,000 - 25,000'),
    cutoff: JSON.stringify('WBJEE / Merit Based'),
    latitude: 22.5793,
    longitude: 88.3640,
    image: 'https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?w=400'
  },
  {
    name: 'Loyola College',
    location: 'Nungambakkam, Chennai',
    state: 'Tamil Nadu',
    city: 'Chennai',
    type: 'Private',
    established: 1925,
    website: 'https://www.loyolacollege.edu',
    courses: JSON.stringify(['BA English', 'BA History', 'BA Economics', 'BA Visual Communication', 'Arts', 'Commerce']),
    programs: JSON.stringify(['Arts', 'Commerce']),
    rating: 4.7,
    fees: JSON.stringify('₹30,000 - 60,000'),
    cutoff: JSON.stringify('Merit / Entrance Test'),
    latitude: 13.0711,
    longitude: 80.2393,
    image: 'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=400'
  },
  {
    name: 'Fergusson College',
    location: 'Shivajinagar, Pune',
    state: 'Maharashtra',
    city: 'Pune',
    type: 'Autonomous',
    established: 1885,
    website: 'https://www.fergusson.edu',
    courses: JSON.stringify(['BA English', 'BA History', 'BA Psychology', 'BA Sociology', 'Arts', 'Science']),
    programs: JSON.stringify(['Arts']),
    rating: 4.5,
    fees: JSON.stringify('₹15,000 - 30,000'),
    cutoff: JSON.stringify('Merit Based'),
    latitude: 18.5284,
    longitude: 73.8442,
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400'
  },
  {
    name: 'Jadavpur University',
    location: 'Jadavpur, Kolkata',
    state: 'West Bengal',
    city: 'Kolkata',
    type: 'Government',
    established: 1955,
    website: 'https://www.jadavpuruniversity.in',
    courses: JSON.stringify(['BA Comparative Literature', 'BA Bengali', 'BA English', 'BA History', 'Arts', 'Engineering']),
    programs: JSON.stringify(['Arts', 'Engineering']),
    rating: 4.7,
    fees: JSON.stringify('₹10,000 - 20,000'),
    cutoff: JSON.stringify('WBJEE / Jadavpur Entrance'),
    latitude: 22.4974,
    longitude: 88.3714,
    image: 'https://images.unsplash.com/photo-1571260899304-425eee4c7efc?w=400'
  },
  {
    name: 'Kalindi College',
    location: 'East Patel Nagar, New Delhi',
    state: 'Delhi',
    city: 'New Delhi',
    type: 'Government',
    established: 1967,
    website: 'https://www.kalindi.du.ac.in',
    courses: JSON.stringify(['BA English', 'BA Sanskrit', 'BA Hindi', 'BA Political Science', 'BA Geography', 'Arts']),
    programs: JSON.stringify(['Arts']),
    rating: 4.3,
    fees: JSON.stringify('₹12,000 - 25,000'),
    cutoff: JSON.stringify('CUET 90%ile+'),
    latitude: 28.6466,
    longitude: 77.1636,
    image: 'https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?w=400'
  },
  {
    name: 'Symbiosis College of Arts and Commerce',
    location: 'Senapati Bapat Road, Pune',
    state: 'Maharashtra',
    city: 'Pune',
    type: 'Private',
    established: 1983,
    website: 'https://www.symbiosis.ac.in',
    courses: JSON.stringify(['BA English', 'BA Mass Communication', 'BAF', 'BBA', 'Arts', 'Commerce']),
    programs: JSON.stringify(['Arts', 'Commerce']),
    rating: 4.5,
    fees: JSON.stringify('₹60,000 - 1.2L'),
    cutoff: JSON.stringify('SET Entrance Exam'),
    latitude: 18.5204,
    longitude: 73.8380,
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=400'
  },
  {
    name: 'Stella Maris College',
    location: 'Cathedral Road, Chennai',
    state: 'Tamil Nadu',
    city: 'Chennai',
    type: 'Private',
    established: 1947,
    website: 'https://www.stellamariscollege.edu.in',
    courses: JSON.stringify(['BA English', 'BA History', 'BA Sociology', 'BA Visual Communication', 'Arts', 'Commerce']),
    programs: JSON.stringify(['Arts']),
    rating: 4.6,
    fees: JSON.stringify('₹25,000 - 50,000'),
    cutoff: JSON.stringify('Merit Based'),
    latitude: 13.0530,
    longitude: 80.2476,
    image: 'https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=400'
  },
  {
    name: 'Hansraj College',
    location: 'Mahatma Hans Raj Marg, New Delhi',
    state: 'Delhi',
    city: 'New Delhi',
    type: 'Government',
    established: 1948,
    website: 'https://hansraj.du.ac.in',
    courses: JSON.stringify(['BA English', 'BA History', 'BA Sanskrit', 'BA Economics', 'Arts', 'Science', 'Commerce']),
    programs: JSON.stringify(['Arts', 'Commerce']),
    rating: 4.6,
    fees: JSON.stringify('₹15,000 - 30,000'),
    cutoff: JSON.stringify('CUET 95%ile+'),
    latitude: 28.6884,
    longitude: 77.2077,
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=400'
  },
  {
    name: 'Government Arts College, Ariyalur',
    location: 'Ariyalur - 621713, Tamil Nadu',
    state: 'Tamil Nadu',
    city: 'Ariyalur',
    type: 'Government',
    established: 2010,
    website: '',
    courses: JSON.stringify(['BA Tamil', 'BA English', 'BA History', 'BA Economics', 'BSc Mathematics', 'BSc Physics', 'BSc Chemistry', 'BSc Computer Science', 'Arts', 'Science']),
    programs: JSON.stringify(['Arts', 'Science']),
    rating: 3.8,
    fees: JSON.stringify('₹3,000 - 8,000'),
    cutoff: JSON.stringify('TNEA / Merit Based'),
    latitude: 11.1392,
    longitude: 79.0792,
    image: 'https://images.unsplash.com/photo-1562774053-701939374585?w=400'
  },
  {
    name: 'Government Arts and Science College, Jayankondam',
    location: 'Jayankondam - 621802, Tamil Nadu',
    state: 'Tamil Nadu',
    city: 'Jayankondam',
    type: 'Government',
    established: 2012,
    website: '',
    courses: JSON.stringify(['BA Tamil', 'BA English', 'BA History', 'BSc Mathematics', 'BSc Physics', 'BSc Chemistry', 'BSc Computer Science', 'BCA', 'Arts', 'Science', 'Commerce']),
    programs: JSON.stringify(['Arts', 'Science', 'Commerce']),
    rating: 3.7,
    fees: JSON.stringify('₹3,000 - 8,000'),
    cutoff: JSON.stringify('TNEA / Merit Based'),
    latitude: 11.2358,
    longitude: 79.3584,
    image: 'https://images.unsplash.com/photo-1580537659466-0a9bfa916a54?w=400'
  }
];

async function main() {
  console.log('Seeding diverse colleges...');
  let added = 0;
  for (const college of colleges) {
    // Upsert to avoid duplicates if run multiple times
    const existing = await prisma.college.findFirst({
      where: { name: college.name }
    });
    
    if (!existing) {
      await prisma.college.create({
        data: college
      });
      console.log(`Added: ${college.name}`);
      added++;
    } else {
      console.log(`Already exists: ${college.name}`);
    }
  }
  console.log(`Done! Added ${added} new colleges.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
