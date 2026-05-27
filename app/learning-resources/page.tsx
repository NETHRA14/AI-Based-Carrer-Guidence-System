'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, BookOpen, Video, FileText, ExternalLink, Clock, Star, ArrowLeft, Play, Filter, X } from 'lucide-react'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Resource {
  id: string
  title: string
  type: 'course' | 'video' | 'article' | 'book' | 'practice'
  stream: string
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced'
  duration: string
  rating: number
  description: string
  link: string
  author: string
  topics: string[]
  free: boolean
  platform: string
}

// ─── Course Database ───────────────────────────────────────────────────────────

const resources: Resource[] = [
  // ══════════════════ ENGINEERING ══════════════════
  { id: 'e1', title: 'CS50: Introduction to Computer Science', type: 'course', stream: 'Engineering', difficulty: 'Beginner', duration: '100 hrs', rating: 4.9, description: 'Harvard\'s legendary intro CS course. Covers C, Python, SQL, JavaScript, and more.', link: 'https://cs50.harvard.edu/x/', author: 'Harvard / David Malan', topics: ['C', 'Python', 'Web', 'SQL'], free: true, platform: 'edX' },
  { id: 'e2', title: 'The Complete Web Developer Bootcamp', type: 'course', stream: 'Engineering', difficulty: 'Beginner', duration: '65 hrs', rating: 4.8, description: 'Full stack web development: HTML, CSS, JS, Node, React, MongoDB.', link: 'https://www.udemy.com/course/the-complete-web-development-bootcamp/', author: 'Angela Yu', topics: ['HTML', 'CSS', 'JavaScript', 'Node.js', 'React'], free: false, platform: 'Udemy' },
  { id: 'e3', title: 'Machine Learning Specialization', type: 'course', stream: 'Engineering', difficulty: 'Intermediate', duration: '90 hrs', rating: 4.9, description: 'Andrew Ng\'s gold-standard ML course covering supervised, unsupervised learning & more.', link: 'https://www.coursera.org/specializations/machine-learning-introduction', author: 'Andrew Ng', topics: ['ML', 'Neural Networks', 'Python', 'TensorFlow'], free: false, platform: 'Coursera' },
  { id: 'e4', title: 'freeCodeCamp Full Stack Curriculum', type: 'practice', stream: 'Engineering', difficulty: 'Beginner', duration: '300 hrs', rating: 4.7, description: 'Free certifications in web dev, JS, data structures, APIs and more.', link: 'https://www.freecodecamp.org/', author: 'freeCodeCamp', topics: ['HTML', 'CSS', 'JavaScript', 'Python'], free: true, platform: 'freeCodeCamp' },
  { id: 'e5', title: 'Google Machine Learning Crash Course', type: 'course', stream: 'Engineering', difficulty: 'Intermediate', duration: '15 hrs', rating: 4.7, description: 'Google\'s fast-paced intro to machine learning with TensorFlow APIs.', link: 'https://developers.google.com/machine-learning/crash-course', author: 'Google AI', topics: ['ML', 'TensorFlow', 'Python'], free: true, platform: 'Google Developers' },
  { id: 'e6', title: 'Data Structures and Algorithms', type: 'course', stream: 'Engineering', difficulty: 'Intermediate', duration: '40 hrs', rating: 4.8, description: 'Master DSA for FAANG interviews — arrays, trees, graphs, DP and more.', link: 'https://www.udemy.com/course/js-algorithms-and-data-structures-masterclass/', author: 'Colt Steele', topics: ['DSA', 'JavaScript', 'Algorithms'], free: false, platform: 'Udemy' },
  { id: 'e7', title: 'NPTEL Engineering Mathematics', type: 'video', stream: 'Engineering', difficulty: 'Intermediate', duration: '40 hrs', rating: 4.5, description: 'IIT-level engineering mathematics with full lectures and assignments.', link: 'https://nptel.ac.in/courses/111/104/111104031/', author: 'IIT Professors', topics: ['Calculus', 'Linear Algebra', 'Probability'], free: true, platform: 'NPTEL' },
  { id: 'e8', title: 'Deep Learning Specialization', type: 'course', stream: 'Engineering', difficulty: 'Advanced', duration: '80 hrs', rating: 4.9, description: 'Five-course deep learning journey by Andrew Ng covering CNNs, RNNs, and Transformers.', link: 'https://www.coursera.org/specializations/deep-learning', author: 'Andrew Ng', topics: ['Deep Learning', 'CNN', 'RNN', 'NLP'], free: false, platform: 'Coursera' },
  { id: 'e9', title: 'MIT OpenCourseWare – Circuits & Electronics', type: 'video', stream: 'Engineering', difficulty: 'Advanced', duration: '50 hrs', rating: 4.8, description: 'MIT\'s complete 6.002 course — circuits, op-amps, transistors, digital systems.', link: 'https://ocw.mit.edu/courses/6-002-circuits-and-electronics-spring-2007/', author: 'MIT OCW', topics: ['Electronics', 'Circuits', 'Signal Processing'], free: true, platform: 'MIT OCW' },
  { id: 'e10', title: 'React — The Complete Guide', type: 'course', stream: 'Engineering', difficulty: 'Intermediate', duration: '48 hrs', rating: 4.8, description: 'Hooks, Redux, Router, Next.js — the most comprehensive React course available.', link: 'https://www.udemy.com/course/react-the-complete-guide-incl-redux/', author: 'Maximilian Schwarzmüller', topics: ['React', 'Redux', 'Next.js', 'Hooks'], free: false, platform: 'Udemy' },

  // ══════════════════ MEDICAL ══════════════════
  { id: 'm1', title: 'Human Anatomy (Crash Course)', type: 'video', stream: 'Medical', difficulty: 'Beginner', duration: '10 hrs', rating: 4.8, description: 'Fast, fun, and accurate overview of human anatomy systems.', link: 'https://www.youtube.com/playlist?list=PL8dPuuaLjXtOAKed_MxxWBNaPno5h3Zs8', author: 'CrashCourse', topics: ['Anatomy', 'Physiology', 'Biology'], free: true, platform: 'YouTube' },
  { id: 'm2', title: 'NEET Biology Masterclass', type: 'course', stream: 'Medical', difficulty: 'Beginner', duration: '120 hrs', rating: 4.7, description: 'Complete NEET Biology syllabus: Botany & Zoology with MCQ practice.', link: 'https://www.unacademy.com/goal/neet-ug/TIMEDMC', author: 'Unacademy', topics: ['Biology', 'NEET', 'Botany', 'Zoology'], free: false, platform: 'Unacademy' },
  { id: 'm3', title: 'Medical Biochemistry (NPTEL)', type: 'course', stream: 'Medical', difficulty: 'Intermediate', duration: '30 hrs', rating: 4.6, description: 'Biochemistry fundamentals: metabolism, enzymes, DNA replication, and proteins.', link: 'https://nptel.ac.in/courses/102/104/102104046/', author: 'IIT Bombay', topics: ['Biochemistry', 'Metabolism', 'Enzymes'], free: true, platform: 'NPTEL' },
  { id: 'm4', title: 'Introduction to Clinical Pharmacology', type: 'course', stream: 'Medical', difficulty: 'Intermediate', duration: '20 hrs', rating: 4.7, description: 'Drug mechanisms, pharmacokinetics, and drug interactions explained clearly.', link: 'https://www.coursera.org/learn/clinical-pharmacology', author: 'Duke University', topics: ['Pharmacology', 'Drugs', 'Medicine'], free: false, platform: 'Coursera' },
  { id: 'm5', title: 'Osmosis Medical Education', type: 'video', stream: 'Medical', difficulty: 'Intermediate', duration: '100+ hrs', rating: 4.9, description: 'Thousands of medical education videos covering pathology, clinical skills, and sciences.', link: 'https://www.osmosis.org/', author: 'Osmosis', topics: ['Pathology', 'Pharmacology', 'Clinical'], free: false, platform: 'Osmosis' },
  { id: 'm6', title: 'Khan Academy Health & Medicine', type: 'video', stream: 'Medical', difficulty: 'Beginner', duration: '50 hrs', rating: 4.8, description: 'Free medical education from Khan Academy covering health basics to advanced topics.', link: 'https://www.khanacademy.org/science/health-and-medicine', author: 'Khan Academy', topics: ['Health', 'Anatomy', 'Disease'], free: true, platform: 'Khan Academy' },
  { id: 'm7', title: 'Physiology by Guyton & Hall (Book)', type: 'book', stream: 'Medical', difficulty: 'Advanced', duration: '200 hrs', rating: 4.9, description: 'The gold standard textbook of medical physiology used by students worldwide.', link: 'https://www.elsevier.com/books/guyton-and-hall-textbook-of-medical-physiology', author: 'John E. Hall', topics: ['Physiology', 'Cardiology', 'Neurology'], free: false, platform: 'Elsevier' },
  { id: 'm8', title: 'OpenStax Anatomy & Physiology', type: 'book', stream: 'Medical', difficulty: 'Beginner', duration: '80 hrs', rating: 4.7, description: 'Completely free peer-reviewed A&P textbook from OpenStax / Rice University.', link: 'https://openstax.org/details/books/anatomy-and-physiology', author: 'OpenStax', topics: ['Anatomy', 'Physiology', 'Cell Biology'], free: true, platform: 'OpenStax' },
  { id: 'm9', title: 'First Aid USMLE Step 1 Review', type: 'book', stream: 'Medical', difficulty: 'Advanced', duration: '150 hrs', rating: 4.8, description: 'The most widely used USMLE Step 1 review book used by medical students globally.', link: 'https://www.firstaidteam.com/', author: 'Tao Le & Vikas Bhushan', topics: ['USMLE', 'Pathology', 'Pharmacology', 'Anatomy'], free: false, platform: 'First Aid' },
  { id: 'm10', title: 'Medscape Medical Reference', type: 'article', stream: 'Medical', difficulty: 'Advanced', duration: 'Reference', rating: 4.8, description: 'Professional clinical reference tool with drug info, disease overviews, and guidelines.', link: 'https://reference.medscape.com/', author: 'WebMD / Medscape', topics: ['Clinical', 'Drug Reference', 'Diseases'], free: true, platform: 'Medscape' },

  // ══════════════════ COMMERCE ══════════════════
  { id: 'c1', title: 'Financial Accounting Fundamentals', type: 'course', stream: 'Commerce', difficulty: 'Beginner', duration: '20 hrs', rating: 4.7, description: 'Master financial statements, journal entries, and accounting principles.', link: 'https://www.coursera.org/learn/financial-accounting', author: 'University of Pennsylvania', topics: ['Accounting', 'Balance Sheet', 'Income Statement'], free: false, platform: 'Coursera' },
  { id: 'c2', title: 'CA Foundation Full Course', type: 'course', stream: 'Commerce', difficulty: 'Beginner', duration: '200 hrs', rating: 4.8, description: 'Complete CA Foundation preparation: Accounts, Law, Maths, and Economics.', link: 'https://icai.org/new-foundation-course.html', author: 'ICAI', topics: ['CA Foundation', 'Accounting', 'Law', 'Economics'], free: true, platform: 'ICAI' },
  { id: 'c3', title: 'GST & Taxation Masterclass', type: 'course', stream: 'Commerce', difficulty: 'Intermediate', duration: '25 hrs', rating: 4.6, description: 'Complete guide to GST, income tax, TDS, and Indian taxation system.', link: 'https://www.udemy.com/course/goods-and-services-tax-gst-course/', author: 'CA Raj K Agrawal', topics: ['GST', 'Income Tax', 'TDS', 'ITR'], free: false, platform: 'Udemy' },
  { id: 'c4', title: 'Khan Academy Finance & Capital Markets', type: 'video', stream: 'Commerce', difficulty: 'Beginner', duration: '30 hrs', rating: 4.8, description: 'Free money & banking, stocks, bonds, derivatives and macroeconomics lessons.', link: 'https://www.khanacademy.org/economics-finance-domain/core-finance', author: 'Khan Academy', topics: ['Finance', 'Stocks', 'Economics', 'Banking'], free: true, platform: 'Khan Academy' },
  { id: 'c5', title: 'MBA Economics and Finance', type: 'course', stream: 'Commerce', difficulty: 'Intermediate', duration: '40 hrs', rating: 4.5, description: 'Core MBA concepts: micro/macro economics, financial management, marketing.', link: 'https://www.edx.org/micromasters/micromasters-program-in-finance', author: 'MIT Sloan', topics: ['Economics', 'Finance', 'Strategy', 'Marketing'], free: false, platform: 'edX' },
  { id: 'c6', title: 'Stock Market Basics (NSE)', type: 'course', stream: 'Commerce', difficulty: 'Beginner', duration: '10 hrs', rating: 4.6, description: 'NSE Academy\'s official free course on stock markets, trading, and investments.', link: 'https://www.nseindia.com/educate/content/NSE-Academy', author: 'NSE Academy', topics: ['Stock Market', 'Trading', 'Investments', 'Derivatives'], free: true, platform: 'NSE' },
  { id: 'c7', title: 'CFA Level 1 Study Materials', type: 'book', stream: 'Commerce', difficulty: 'Advanced', duration: '300 hrs', rating: 4.8, description: 'Official CFA Institute curriculum for Level 1 — ethics, economics, equity, and fixed income.', link: 'https://www.cfainstitute.org/en/programs/cfa', author: 'CFA Institute', topics: ['CFA', 'Equity', 'Fixed Income', 'Derivatives'], free: false, platform: 'CFA Institute' },
  { id: 'c8', title: 'Business Analytics with Excel', type: 'course', stream: 'Commerce', difficulty: 'Intermediate', duration: '20 hrs', rating: 4.6, description: 'Learn data analysis, pivot tables, financial models, and business dashboards.', link: 'https://www.coursera.org/learn/excel-for-business', author: 'Macquarie University', topics: ['Excel', 'Data Analysis', 'Business Intelligence'], free: false, platform: 'Coursera' },
  { id: 'c9', title: 'NPTEL Economics for Engineers', type: 'video', stream: 'Commerce', difficulty: 'Beginner', duration: '30 hrs', rating: 4.5, description: 'Microeconomics and macroeconomics fundamentals for non-economics students.', link: 'https://nptel.ac.in/courses/110/107/110107128/', author: 'IIT Kharagpur', topics: ['Economics', 'Micro', 'Macro', 'Markets'], free: true, platform: 'NPTEL' },
  { id: 'c10', title: 'Entrepreneurship & Business Strategy', type: 'course', stream: 'Commerce', difficulty: 'Intermediate', duration: '35 hrs', rating: 4.7, description: 'Launch and grow businesses with frameworks from Wharton School.', link: 'https://www.coursera.org/specializations/wharton-entrepreneurship', author: 'Wharton School', topics: ['Entrepreneurship', 'Business Model', 'Strategy'], free: false, platform: 'Coursera' },

  // ══════════════════ ARTS ══════════════════
  { id: 'a1', title: 'Introduction to Psychology', type: 'course', stream: 'Arts', difficulty: 'Beginner', duration: '20 hrs', rating: 4.9, description: 'Yale\'s most popular online course. Covers emotion, memory, perception, and wellbeing.', link: 'https://www.coursera.org/learn/introduction-to-psychology', author: 'Paul Bloom, Yale', topics: ['Psychology', 'Behaviour', 'Cognition', 'Neuroscience'], free: false, platform: 'Coursera' },
  { id: 'a2', title: 'UPSC CSE Study Plan (Unacademy)', type: 'course', stream: 'Arts', difficulty: 'Advanced', duration: '500+ hrs', rating: 4.7, description: 'Complete UPSC Civil Services preparation — History, Polity, Geography & Current Affairs.', link: 'https://unacademy.com/goal/upsc-civil-services-examination-ias-preparation/KSCGY', author: 'Various IAS Mentors', topics: ['History', 'Polity', 'Geography', 'Economy', 'UPSC'], free: false, platform: 'Unacademy' },
  { id: 'a3', title: 'History of Art (Khan Academy)', type: 'course', stream: 'Arts', difficulty: 'Beginner', duration: '40 hrs', rating: 4.8, description: 'Comprehensive art history from ancient civilizations to modern contemporary art.', link: 'https://www.khanacademy.org/humanities/art-history', author: 'Khan Academy', topics: ['Art History', 'Sculpture', 'Painting', 'Architecture'], free: true, platform: 'Khan Academy' },
  { id: 'a4', title: 'English Literature — Shakespeare to Modern', type: 'course', stream: 'Arts', difficulty: 'Intermediate', duration: '25 hrs', rating: 4.6, description: 'Survey of English literature from Chaucer through postmodern fiction.', link: 'https://www.edx.org/learn/english-literature', author: 'MIT OCW', topics: ['Literature', 'Shakespeare', 'Poetry', 'Novels'], free: true, platform: 'edX' },
  { id: 'a5', title: 'Graphic Design Specialization', type: 'course', stream: 'Arts', difficulty: 'Beginner', duration: '50 hrs', rating: 4.7, description: 'Learn typography, branding, image-making and capstone real-world design projects.', link: 'https://www.coursera.org/specializations/graphic-design', author: 'CalArts', topics: ['Graphic Design', 'Typography', 'Branding', 'Adobe'], free: false, platform: 'Coursera' },
  { id: 'a6', title: 'Indian History (NCERT Free PDFs)', type: 'article', stream: 'Arts', difficulty: 'Beginner', duration: '30 hrs', rating: 4.8, description: 'NCERT History books from Class 6–12, free and the best foundation for competitive exams.', link: 'https://ncert.nic.in/textbook.php', author: 'NCERT', topics: ['Ancient India', 'Medieval', 'Modern History', 'Freedom Struggle'], free: true, platform: 'NCERT' },
  { id: 'a7', title: 'Journalism & Media Studies', type: 'course', stream: 'Arts', difficulty: 'Beginner', duration: '15 hrs', rating: 4.5, description: 'Introduction to journalism, media ethics, reporting, and digital media.', link: 'https://www.udemy.com/course/journalism-course/', author: 'Journalism School Online', topics: ['Journalism', 'Reporting', 'Media Ethics', 'Digital Media'], free: false, platform: 'Udemy' },
  { id: 'a8', title: 'Philosophy: Ancient Greece to Modern', type: 'course', stream: 'Arts', difficulty: 'Intermediate', duration: '20 hrs', rating: 4.7, description: 'Great philosophical ideas from Plato and Aristotle to Kant, Nietzsche and Sartre.', link: 'https://www.coursera.org/learn/philosophy', author: 'University of Edinburgh', topics: ['Philosophy', 'Ethics', 'Logic', 'Metaphysics'], free: false, platform: 'Coursera' },
  { id: 'a9', title: 'Spoken English Masterclass', type: 'video', stream: 'Arts', difficulty: 'Beginner', duration: '20 hrs', rating: 4.6, description: 'Improve spoken English pronunciation, grammar, and fluency with daily exercises.', link: 'https://www.youtube.com/@LearnEnglishWithTV', author: 'BBC Learning English', topics: ['English Speaking', 'Grammar', 'Vocabulary', 'IELTS'], free: true, platform: 'YouTube' },
  { id: 'a10', title: 'Social Work & Community Development', type: 'course', stream: 'Arts', difficulty: 'Beginner', duration: '18 hrs', rating: 4.4, description: 'Introduction to social work practice, community organizing and human rights.', link: 'https://www.edx.org/learn/social-work', author: 'edX', topics: ['Social Work', 'Community', 'Human Rights', 'Welfare'], free: true, platform: 'edX' },

  // ══════════════════ AGRICULTURE ══════════════════
  { id: 'ag1', title: 'Organic Farming Practices', type: 'course', stream: 'Agriculture', difficulty: 'Beginner', duration: '15 hrs', rating: 4.7, description: 'Learn sustainable organic farming, composting, crop rotation, and pest management.', link: 'https://www.coursera.org/learn/organic-agriculture', author: 'UC Davis', topics: ['Organic Farming', 'Composting', 'Soil Health', 'Pesticides'], free: false, platform: 'Coursera' },
  { id: 'ag2', title: 'ICAR eCourse — Agronomy', type: 'course', stream: 'Agriculture', difficulty: 'Intermediate', duration: '40 hrs', rating: 4.6, description: 'Official ICAR online courses for B.Sc Agriculture students covering agronomy and soil science.', link: 'https://ecourse.icar.gov.in', author: 'ICAR India', topics: ['Agronomy', 'Soil Science', 'Crop Production', 'Horticulture'], free: true, platform: 'ICAR' },
  { id: 'ag3', title: 'Soil Science Fundamentals (NPTEL)', type: 'video', stream: 'Agriculture', difficulty: 'Beginner', duration: '25 hrs', rating: 4.5, description: 'Soil formation, properties, nutrients and fertility management for agriculture.', link: 'https://nptel.ac.in/courses/110/105/110105029/', author: 'IARI / IIT', topics: ['Soil Science', 'Nutrients', 'Fertilizers', 'pH'], free: true, platform: 'NPTEL' },
  { id: 'ag4', title: 'Agriculture Entrepreneurship (NABARD)', type: 'course', stream: 'Agriculture', difficulty: 'Beginner', duration: '10 hrs', rating: 4.5, description: 'NABARD\'s training on agri-business, farm credit, and entrepreneurship for rural India.', link: 'https://www.nabard.org/', author: 'NABARD', topics: ['Agri-Business', 'Farm Credit', 'Entrepreneurship', 'Subsidies'], free: true, platform: 'NABARD' },
  { id: 'ag5', title: 'Precision Farming & IoT in Agriculture', type: 'course', stream: 'Agriculture', difficulty: 'Advanced', duration: '20 hrs', rating: 4.6, description: 'Smart farming technologies — sensors, drones, AI, and data analytics in agriculture.', link: 'https://www.udemy.com/course/precision-agriculture/', author: 'AgriTech School', topics: ['Precision Farming', 'IoT', 'Drones', 'AI', 'Smart Agri'], free: false, platform: 'Udemy' },
  { id: 'ag6', title: 'Food Safety and Quality Control', type: 'course', stream: 'Agriculture', difficulty: 'Intermediate', duration: '18 hrs', rating: 4.6, description: 'HACCP, food testing, packaging, labeling and international food safety standards.', link: 'https://www.coursera.org/learn/food-safety', author: 'University of Michigan', topics: ['Food Safety', 'HACCP', 'Quality Control', 'FSSAI'], free: false, platform: 'Coursera' },
  { id: 'ag7', title: 'Plant Pathology (NPTEL)', type: 'video', stream: 'Agriculture', difficulty: 'Intermediate', duration: '30 hrs', rating: 4.5, description: 'Diseases of crop plants — identification, management, and biological control.', link: 'https://nptel.ac.in/courses/110/105/110105103/', author: 'IIT Kharagpur', topics: ['Plant Disease', 'Fungi', 'Bacteria', 'Pest Management'], free: true, platform: 'NPTEL' },
  { id: 'ag8', title: 'Hydroponics & Vertical Farming', type: 'course', stream: 'Agriculture', difficulty: 'Intermediate', duration: '12 hrs', rating: 4.7, description: 'Modern soilless farming techniques including hydroponics, aquaponics and vertical gardens.', link: 'https://www.udemy.com/course/hydroponics-mastery/', author: 'Urban Harvest School', topics: ['Hydroponics', 'Aquaponics', 'Vertical Farming', 'Urban Agri'], free: false, platform: 'Udemy' },
  { id: 'ag9', title: 'Animal Husbandry Basics', type: 'course', stream: 'Agriculture', difficulty: 'Beginner', duration: '15 hrs', rating: 4.4, description: 'Livestock management, dairy farming, poultry, veterinary basics and animal nutrition.', link: 'https://ecourse.icar.gov.in', author: 'ICAR', topics: ['Dairy Farming', 'Poultry', 'Livestock', 'Veterinary'], free: true, platform: 'ICAR' },
  { id: 'ag10', title: 'Government Agricultural Schemes Guide', type: 'article', stream: 'Agriculture', difficulty: 'Beginner', duration: '5 hrs', rating: 4.5, description: 'Complete guide to PM-KISAN, Kisan Credit Card, Fasal Bima Yojana and other schemes.', link: 'https://farmer.gov.in/', author: 'Ministry of Agriculture', topics: ['PM-KISAN', 'Kisan Credit', 'Subsidies', 'Insurance'], free: true, platform: 'Government Portal' },

  // ══════════════════ LAW ══════════════════
  { id: 'l1', title: 'Introduction to Indian Constitutional Law', type: 'course', stream: 'Law', difficulty: 'Beginner', duration: '20 hrs', rating: 4.8, description: 'Fundamental rights, DPSP, emergency provisions, and constitutional interpretation.', link: 'https://www.coursera.org/learn/constitutional-law', author: 'Yale Law School', topics: ['Constitution', 'Fundamental Rights', 'DPSP', 'Judiciary'], free: false, platform: 'Coursera' },
  { id: 'l2', title: 'CLAT Preparation Course', type: 'course', stream: 'Law', difficulty: 'Beginner', duration: '100 hrs', rating: 4.7, description: 'Complete CLAT prep: English, GK, Legal Reasoning, Maths, and Logical Reasoning.', link: 'https://lawschoolwallah.com/', author: 'Law School Wallah', topics: ['CLAT', 'Legal Reasoning', 'English', 'GK'], free: false, platform: 'Law School Wallah' },
  { id: 'l3', title: 'Contract Law (Harvard Free)', type: 'course', stream: 'Law', difficulty: 'Intermediate', duration: '30 hrs', rating: 4.8, description: 'Harvard Law\'s online contract law course covering formation, remedies, and interpretation.', link: 'https://pll.harvard.edu/course/contract-law-from-trust-to-promise-to-contract', author: 'Harvard Law', topics: ['Contract Law', 'Offer', 'Acceptance', 'Breach', 'Remedies'], free: true, platform: 'Harvard PLL' },
  { id: 'l4', title: 'Indian Penal Code Complete Guide', type: 'video', stream: 'Law', difficulty: 'Intermediate', duration: '30 hrs', rating: 4.7, description: 'Section-by-section walkthrough of IPC with landmark cases and amendments.', link: 'https://www.youtube.com/c/LawSikho', author: 'LawSikho', topics: ['IPC', 'Criminal Law', 'Sections', 'Cases'], free: true, platform: 'YouTube' },
  { id: 'l5', title: 'Cyber Law & IT Act India', type: 'course', stream: 'Law', difficulty: 'Intermediate', duration: '15 hrs', rating: 4.6, description: 'IT Act 2000, cyber crimes, data protection, e-commerce regulations in India.', link: 'https://www.udemy.com/course/cyber-law-india/', author: 'Bhumesh Verma', topics: ['Cyber Law', 'IT Act', 'Data Protection', 'GDPR'], free: false, platform: 'Udemy' },
  { id: 'l6', title: 'Company Law & Corporate Governance', type: 'course', stream: 'Law', difficulty: 'Advanced', duration: '25 hrs', rating: 4.6, description: 'Companies Act 2013, SEBI regulations, corporate compliance and governance.', link: 'https://www.lawsikho.com/courses', author: 'LawSikho', topics: ['Company Law', 'Companies Act', 'SEBI', 'Governance'], free: false, platform: 'LawSikho' },
  { id: 'l7', title: 'Human Rights Law (UN Free)', type: 'course', stream: 'Law', difficulty: 'Beginner', duration: '12 hrs', rating: 4.7, description: 'UN\'s official human rights online training covering UDHR, ICCPR, and treaties.', link: 'https://www.ohchr.org/en/training-and-education', author: 'OHCHR (United Nations)', topics: ['Human Rights', 'UDHR', 'International Law', 'Treaties'], free: true, platform: 'UN OHCHR' },
  { id: 'l8', title: 'International Trade Law', type: 'course', stream: 'Law', difficulty: 'Advanced', duration: '20 hrs', rating: 4.5, description: 'WTO, GATT, trade agreements, investment treaties and dispute resolution.', link: 'https://www.coursera.org/learn/international-trade-law', author: 'University of Geneva', topics: ['Trade Law', 'WTO', 'GATT', 'Arbitration'], free: false, platform: 'Coursera' },
  { id: 'l9', title: 'Family Law in India', type: 'video', stream: 'Law', difficulty: 'Intermediate', duration: '18 hrs', rating: 4.6, description: 'Hindu Marriage Act, divorce, adoption, maintenance, and personal laws in India.', link: 'https://lawschoolwallah.com/', author: 'Legal Academia India', topics: ['Family Law', 'Marriage Act', 'Divorce', 'Adoption', 'HUF'], free: false, platform: 'Law School Wallah' },
  { id: 'l10', title: 'Bare Acts — Free Legal Texts', type: 'article', stream: 'Law', difficulty: 'Advanced', duration: 'Reference', rating: 4.8, description: 'Full downloadable text of all Indian Acts, Codes, and Regulations — always free.', link: 'https://www.indiacode.nic.in/', author: 'Ministry of Law & Justice', topics: ['Bare Acts', 'Statutes', 'Legal Code', 'Amendments'], free: true, platform: 'India Code' },
]

// ─── Filters Config ───────────────────────────────────────────────────────────

const STREAMS = ['All', 'Engineering', 'Medical', 'Commerce', 'Arts', 'Agriculture', 'Law']
const PRICE_FILTERS = ['All', 'Free', 'Paid']
const DIFFICULTIES = ['All', 'Beginner', 'Intermediate', 'Advanced']
const TYPES = ['All', 'course', 'video', 'article', 'book', 'practice']

const STREAM_CONFIG: Record<string, { emoji: string; color: string; glow: string }> = {
  All:         { emoji: '🌐', color: '#00CFFF', glow: '#00CFFF30' },
  Engineering: { emoji: '⚙️', color: '#00CFFF', glow: '#00CFFF30' },
  Medical:     { emoji: '🩺', color: '#ef4444', glow: '#ef444430' },
  Commerce:    { emoji: '📊', color: '#22c55e', glow: '#22c55e30' },
  Arts:        { emoji: '🎨', color: '#a855f7', glow: '#a855f730' },
  Agriculture: { emoji: '🌾', color: '#84cc16', glow: '#84cc1630' },
  Law:         { emoji: '⚖️', color: '#f59e0b', glow: '#f59e0b30' },
}

// ─── Resource Card ─────────────────────────────────────────────────────────────

function ResourceCard({ resource }: { resource: Resource }) {
  const streamCfg = STREAM_CONFIG[resource.stream] ?? STREAM_CONFIG['All']

  const typeIcon = resource.type === 'video' ? '▶' :
                   resource.type === 'book' ? '📖' :
                   resource.type === 'article' ? '📄' :
                   resource.type === 'practice' ? '🏋' : '📚'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      className="flex flex-col h-full rounded-2xl border border-[#1e293b] bg-[#0a0f1e] overflow-hidden transition-all duration-300 hover:border-opacity-60 group"
      style={{ '--stream-color': streamCfg.color } as any}
    >
      {/* Colored top stripe */}
      <div className="h-1" style={{ background: `linear-gradient(90deg, ${streamCfg.color}, ${streamCfg.color}44)` }} />

      <div className="flex flex-col flex-1 p-5 gap-3">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className="text-white font-bold text-sm leading-snug group-hover:text-[var(--stream-color)] transition-colors line-clamp-2">
              {resource.title}
            </h3>
            <p className="text-gray-500 text-xs mt-1">by {resource.author} · {resource.platform}</p>
          </div>
          <div className="flex flex-col gap-1 items-end flex-shrink-0">
            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${resource.free ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'}`}>
              {resource.free ? '🆓 Free' : '💳 Paid'}
            </span>
            <span className="text-gray-600 text-xs">{typeIcon} {resource.type}</span>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-400 text-xs leading-relaxed line-clamp-2 flex-1">{resource.description}</p>

        {/* Topics */}
        <div className="flex flex-wrap gap-1.5">
          {resource.topics.slice(0, 3).map(t => (
            <span key={t} className="px-2 py-0.5 rounded-full text-xs bg-[#1e293b] text-gray-400">{t}</span>
          ))}
          {resource.topics.length > 3 && (
            <span className="px-2 py-0.5 rounded-full text-xs bg-[#1e293b] text-gray-600">+{resource.topics.length - 3}</span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-1 border-t border-[#1e293b]">
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {resource.duration}</span>
            <span className="flex items-center gap-1 text-yellow-400"><Star className="w-3 h-3" /> {resource.rating}</span>
            <span className={`px-1.5 py-0.5 rounded text-xs ${
              resource.difficulty === 'Beginner' ? 'bg-green-500/15 text-green-400' :
              resource.difficulty === 'Intermediate' ? 'bg-yellow-500/15 text-yellow-400' :
              'bg-red-500/15 text-red-400'}`}>
              {resource.difficulty}
            </span>
          </div>
          <a
            href={resource.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={e => e.stopPropagation()}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-80"
            style={{ background: `${streamCfg.color}20`, color: streamCfg.color, border: `1px solid ${streamCfg.color}33` }}
          >
            Access <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function LearningResourcesPage() {
  const [search, setSearch] = useState('')
  const [stream, setStream] = useState('All')
  const [priceFilter, setPriceFilter] = useState('All')
  const [difficulty, setDifficulty] = useState('All')
  const [type, setType] = useState('All')

  const filtered = useMemo(() => resources.filter(r => {
    const q = search.toLowerCase()
    const matchSearch = !q || r.title.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || r.topics.some(t => t.toLowerCase().includes(q)) || r.author.toLowerCase().includes(q)
    const matchStream = stream === 'All' || r.stream === stream
    const matchPrice = priceFilter === 'All' || (priceFilter === 'Free' ? r.free : !r.free)
    const matchDiff = difficulty === 'All' || r.difficulty === difficulty
    const matchType = type === 'All' || r.type === type
    return matchSearch && matchStream && matchPrice && matchDiff && matchType
  }), [search, stream, priceFilter, difficulty, type])

  const clearAll = () => { setSearch(''); setStream('All'); setPriceFilter('All'); setDifficulty('All'); setType('All') }
  const hasFilters = search || stream !== 'All' || priceFilter !== 'All' || difficulty !== 'All' || type !== 'All'
  const freeCount = filtered.filter(r => r.free).length
  const paidCount = filtered.filter(r => !r.free).length

  return (
    <div className="min-h-screen bg-[#060612] pt-20 pb-16">
      {/* Background glow */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-[#00CFFF]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-[#a855f7]/5 rounded-full blur-3xl" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">

        {/* Header */}
        <div className="mb-10">
          <Link href="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4">
              <span className="bg-gradient-to-r from-[#00CFFF] to-[#FF007F] bg-clip-text text-transparent">Learning Resources</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              60+ curated courses, videos, books & articles across all academic streams — free and paid.
            </p>
          </motion.div>
        </div>

        {/* ── Stream Filter Pills ─────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {STREAMS.map(s => {
            const cfg = STREAM_CONFIG[s]
            const active = stream === s
            return (
              <button key={s} onClick={() => setStream(s)}
                className="px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border"
                style={{
                  background: active ? `${cfg.color}22` : 'transparent',
                  color: active ? cfg.color : '#64748b',
                  borderColor: active ? `${cfg.color}44` : '#1e293b',
                  boxShadow: active ? `0 0 12px ${cfg.glow}` : 'none',
                }}>
                {cfg.emoji} {s}
              </button>
            )
          })}
        </div>

        {/* ── Search + Filters Row ────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input type="text" placeholder="Search courses, topics, authors..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-[#0a0f1e] border border-[#1e293b] rounded-xl text-white placeholder-gray-600 focus:outline-none focus:border-[#00CFFF] text-sm"
            />
          </div>

          {/* Price Toggle */}
          <div className="flex rounded-xl overflow-hidden border border-[#1e293b] bg-[#0a0f1e]">
            {PRICE_FILTERS.map(p => (
              <button key={p} onClick={() => setPriceFilter(p)}
                className={`px-4 py-2 text-sm font-semibold transition-all ${priceFilter === p ? 'bg-[#00CFFF] text-black' : 'text-gray-400 hover:text-white'}`}>
                {p === 'Free' ? '🆓' : p === 'Paid' ? '💳' : '🌐'} {p}
              </button>
            ))}
          </div>

          {/* Difficulty */}
          <select value={difficulty} onChange={e => setDifficulty(e.target.value)}
            className="bg-[#0a0f1e] border border-[#1e293b] rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#00CFFF]">
            {DIFFICULTIES.map(d => <option key={d} value={d} className="bg-[#0a0f1e]">{d}</option>)}
          </select>

          {/* Type */}
          <select value={type} onChange={e => setType(e.target.value)}
            className="bg-[#0a0f1e] border border-[#1e293b] rounded-xl px-3 py-2.5 text-sm text-gray-300 focus:outline-none focus:border-[#00CFFF]">
            {TYPES.map(t => <option key={t} value={t} className="bg-[#0a0f1e]">{t === 'All' ? 'All Types' : t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
          </select>

          {hasFilters && (
            <button onClick={clearAll} className="flex items-center gap-1 px-3 py-2 rounded-xl border border-red-500/30 text-red-400 text-sm hover:bg-red-500/10 transition-all">
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          )}
        </div>

        {/* Stats bar */}
        <div className="flex items-center justify-between mb-6 text-sm text-gray-500">
          <span>Showing <span className="text-white font-semibold">{filtered.length}</span> of {resources.length} resources</span>
          <div className="flex gap-3">
            <span className="text-green-400">🆓 {freeCount} Free</span>
            <span className="text-orange-400">💳 {paidCount} Paid</span>
          </div>
        </div>

        {/* ── Course Grid ─────────────────────────────────────────────── */}
        <AnimatePresence mode="popLayout">
          {filtered.length > 0 ? (
            <motion.div layout className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filtered.map(r => <ResourceCard key={r.id} resource={r} />)}
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-24">
              <div className="text-5xl mb-4">🔍</div>
              <h3 className="text-xl font-bold text-white mb-2">No courses found</h3>
              <p className="text-gray-500 mb-6">Try different filters or search terms</p>
              <button onClick={clearAll} className="px-5 py-2.5 bg-[#00CFFF]/20 border border-[#00CFFF]/30 text-[#00CFFF] rounded-xl text-sm hover:bg-[#00CFFF]/10 transition-all">
                Clear All Filters
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Quick Collection Links ──────────────────────────────────── */}
        <div className="mt-16 grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Free Engineering', icon: '⚙️', action: () => { setStream('Engineering'); setPriceFilter('Free') } },
            { label: 'Free Medical', icon: '🩺', action: () => { setStream('Medical'); setPriceFilter('Free') } },
            { label: 'Free Commerce', icon: '📊', action: () => { setStream('Commerce'); setPriceFilter('Free') } },
            { label: 'Beginner Friendly', icon: '🌱', action: () => { setDifficulty('Beginner'); clearAll(); setDifficulty('Beginner') } },
            { label: 'Law Resources', icon: '⚖️', action: () => setStream('Law') },
            { label: 'Free Agriculture', icon: '🌾', action: () => { setStream('Agriculture'); setPriceFilter('Free') } },
          ].map(({ label, icon, action }) => (
            <button key={label} onClick={action}
              className="flex items-center gap-3 p-4 rounded-xl bg-[#0a0f1e] border border-[#1e293b] hover:border-[#00CFFF]/30 text-left transition-all hover:bg-[#0f172a] group">
              <span className="text-2xl">{icon}</span>
              <span className="text-sm font-semibold text-gray-300 group-hover:text-white">{label}</span>
            </button>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center bg-[#0a0f1e] border border-[#1e293b] rounded-2xl p-8">
          <h3 className="text-2xl font-bold text-white mb-3">Find Your Perfect Career Path</h3>
          <p className="text-gray-400 mb-6">Take our AI-powered career quiz to get personalized resource recommendations.</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/quiz" className="px-6 py-3 bg-gradient-to-r from-[#00CFFF] to-[#FF007F] text-black font-bold rounded-xl hover:scale-105 transition-all">
              Take Career Quiz
            </Link>
            <Link href="/career-tree" className="px-6 py-3 bg-[#0f172a] border border-[#1e293b] text-gray-300 font-semibold rounded-xl hover:border-[#00CFFF]/30 transition-all">
              Explore Career Tree 🌳
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}