'use client'

import { useRef, useState, useEffect, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Float, Line } from '@react-three/drei'
import Text3DWrapper from '../Text3DWrapper'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ────────────────────────────────────────────────────────────────────

type Stream = 'all' | 'medical' | 'engineering' | 'commerce' | 'arts' | 'agriculture' | 'law'

interface SkillNode {
  id: string
  name: string
  level: number // 0-100
  stream: Exclude<Stream, 'all'>
  category: 'core' | 'applied' | 'advanced'
  position: [number, number, number]
  connections: string[]
  color: string
  description: string
  resources?: string[]
}

// ─── Stream Config ─────────────────────────────────────────────────────────────

const STREAM_CONFIG: Record<Exclude<Stream, 'all'>, { label: string; color: string; emoji: string }> = {
  medical: { label: 'Medical', color: '#FF4C6E', emoji: '🩺' },
  engineering: { label: 'Engineering', color: '#00CFFF', emoji: '⚙️' },
  commerce: { label: 'Commerce', color: '#FFD700', emoji: '📊' },
  arts: { label: 'Arts', color: '#C678FF', emoji: '🎨' },
  agriculture: { label: 'Agriculture', color: '#56E39F', emoji: '🌾' },
  law: { label: 'Law', color: '#FF9F43', emoji: '⚖️' },
}

// ─── All Skill Data ────────────────────────────────────────────────────────────

const ALL_SKILLS: SkillNode[] = [
  // ── MEDICAL (Red/Pink cluster, left-back) ──
  { id: 'm1', name: 'Anatomy', level: 88, stream: 'medical', category: 'core', position: [-5, 2, -2], connections: ['m2', 'm3'], color: '#FF4C6E', description: 'Study of the human body\'s structure and organ systems.', resources: ['Gray\'s Anatomy', 'Khan Academy Medicine'] },
  { id: 'm2', name: 'Physiology', level: 82, stream: 'medical', category: 'core', position: [-7, 0, -1], connections: ['m1', 'm4'], color: '#FF4C6E', description: 'Functions and mechanisms of the living body.' },
  { id: 'm3', name: 'Pharmacology', level: 75, stream: 'medical', category: 'applied', position: [-4, 0, -4], connections: ['m1', 'm5'], color: '#FF7090', description: 'Study of drugs and their effects on body systems.', resources: ['Rang & Dale Pharmacology'] },
  { id: 'm4', name: 'Pathology', level: 70, stream: 'medical', category: 'applied', position: [-8, -2, -2], connections: ['m2'], color: '#FF7090', description: 'Understanding disease mechanisms and diagnosis.', resources: ['Robbins Pathology'] },
  { id: 'm5', name: 'Clinical Skills', level: 80, stream: 'medical', category: 'advanced', position: [-5, -2, -5], connections: ['m3', 'm6'], color: '#FF4C6E', description: 'Patient examination, diagnosis and clinical reasoning.' },
  { id: 'm6', name: 'Surgery', level: 60, stream: 'medical', category: 'advanced', position: [-3, -1, -6], connections: ['m5'], color: '#FF1744', description: 'Operative techniques and surgical decision-making.', resources: ['Bailey & Love Surgery'] },
  { id: 'm7', name: 'Diagnostics', level: 72, stream: 'medical', category: 'applied', position: [-6, 2, -5], connections: ['m4', 'm5'], color: '#FF7090', description: 'Lab investigation, imaging and diagnostic interpretation.' },
  { id: 'm8', name: 'Medical Ethics', level: 85, stream: 'medical', category: 'core', position: [-3, 3, -2], connections: ['m1'], color: '#FF4C6E', description: 'Ethical principles guiding medical practice.' },

  // ── ENGINEERING (Cyan cluster, right-back) ──
  { id: 'e1', name: 'Mathematics', level: 92, stream: 'engineering', category: 'core', position: [5, 2, -2], connections: ['e2', 'e3'], color: '#00CFFF', description: 'Calculus, linear algebra, and discrete mathematics.', resources: ['MIT OpenCourseWare', 'Khan Academy'] },
  { id: 'e2', name: 'Programming', level: 88, stream: 'engineering', category: 'core', position: [7, 0, -1], connections: ['e1', 'e4'], color: '#00CFFF', description: 'Writing efficient code in C++, Python, Java and more.', resources: ['LeetCode', 'Coursera'] },
  { id: 'e3', name: 'Physics', level: 80, stream: 'engineering', category: 'core', position: [4, 0, -4], connections: ['e1', 'e5'], color: '#45D8FF', description: 'Mechanics, electromagnetism and thermodynamics.', resources: ['Physics by Halliday'] },
  { id: 'e4', name: 'Data Structures', level: 85, stream: 'engineering', category: 'applied', position: [8, -2, -2], connections: ['e2', 'e6'], color: '#45D8FF', description: 'Arrays, trees, graphs, and algorithmic efficiency.' },
  { id: 'e5', name: 'Circuit Design', level: 70, stream: 'engineering', category: 'applied', position: [4, -2, -5], connections: ['e3', 'e6'], color: '#00CFFF', description: 'Analog and digital circuit analysis and design.' },
  { id: 'e6', name: 'Systems Design', level: 75, stream: 'engineering', category: 'advanced', position: [6, -3, -4], connections: ['e4', 'e5', 'e7'], color: '#00A8D6', description: 'Scalable system architecture and engineering design.', resources: ['Designing Data-Intensive Applications'] },
  { id: 'e7', name: 'CAD / Modeling', level: 65, stream: 'engineering', category: 'applied', position: [3, -1, -6], connections: ['e6'], color: '#45D8FF', description: 'AutoCAD, SolidWorks, and 3D mechanical modeling.' },
  { id: 'e8', name: 'Algorithms', level: 82, stream: 'engineering', category: 'advanced', position: [7, 2, -4], connections: ['e2', 'e4'], color: '#00CFFF', description: 'Sorting, searching, dynamic programming, and optimization.', resources: ['CLRS Introduction to Algorithms'] },

  // ── COMMERCE (Gold cluster, left-front) ──
  { id: 'c1', name: 'Accounting', level: 90, stream: 'commerce', category: 'core', position: [-5, 2, 3], connections: ['c2', 'c3'], color: '#FFD700', description: 'Recording, classifying and summarising financial transactions.', resources: ['ICAI Study Material'] },
  { id: 'c2', name: 'Economics', level: 85, stream: 'commerce', category: 'core', position: [-7, 0, 2], connections: ['c1', 'c4'], color: '#FFD700', description: 'Micro and macro economics, market structures and policy.', resources: ['Mankiw\'s Economics'] },
  { id: 'c3', name: 'Business Law', level: 75, stream: 'commerce', category: 'applied', position: [-4, 0, 5], connections: ['c1', 'c5'], color: '#FFDF40', description: 'Corporate law, contracts, and regulatory compliance.' },
  { id: 'c4', name: 'Finance', level: 80, stream: 'commerce', category: 'applied', position: [-8, -2, 3], connections: ['c2', 'c6'], color: '#FFD700', description: 'Investment, capital markets, and financial management.', resources: ['CFA Institute Materials'] },
  { id: 'c5', name: 'Marketing', level: 78, stream: 'commerce', category: 'applied', position: [-4, -2, 6], connections: ['c3', 'c6'], color: '#FFDF40', description: 'Market research, branding, digital and traditional marketing.' },
  { id: 'c6', name: 'Taxation', level: 70, stream: 'commerce', category: 'advanced', position: [-6, -3, 5], connections: ['c4', 'c5'], color: '#FFC300', description: 'Income Tax, GST, and international taxation principles.' },
  { id: 'c7', name: 'Statistics', level: 82, stream: 'commerce', category: 'core', position: [-3, 1, 4], connections: ['c1', 'c2'], color: '#FFD700', description: 'Data analysis, probability, and statistical inference.' },
  { id: 'c8', name: 'Entrepreneurship', level: 72, stream: 'commerce', category: 'advanced', position: [-6, 3, 4], connections: ['c2', 'c4'], color: '#FFDF40', description: 'Business planning, startup ecosystem and venture funding.' },

  // ── ARTS (Purple cluster, right-front) ──
  { id: 'a1', name: 'Literature', level: 88, stream: 'arts', category: 'core', position: [5, 2, 3], connections: ['a2', 'a3'], color: '#C678FF', description: 'Analysis of literary works, poetry, prose, and drama.', resources: ['Oxford Literature Companion'] },
  { id: 'a2', name: 'History', level: 83, stream: 'arts', category: 'core', position: [7, 0, 2], connections: ['a1', 'a4'], color: '#C678FF', description: 'Indian and world history, historiography, and sources.' },
  { id: 'a3', name: 'Philosophy', level: 75, stream: 'arts', category: 'applied', position: [4, 0, 5], connections: ['a1', 'a5'], color: '#D89FFF', description: 'Ethics, logic, metaphysics and epistemology.', resources: ['Stanford Encyclopedia of Philosophy'] },
  { id: 'a4', name: 'Fine Arts', level: 70, stream: 'arts', category: 'applied', position: [8, -2, 3], connections: ['a2', 'a6'], color: '#C678FF', description: 'Drawing, painting, sculpture, and visual composition.' },
  { id: 'a5', name: 'Creative Writing', level: 80, stream: 'arts', category: 'applied', position: [4, -2, 6], connections: ['a3', 'a6'], color: '#D89FFF', description: 'Fiction, non-fiction, screenwriting and storytelling.', resources: ['The Elements of Style'] },
  { id: 'a6', name: 'Media Studies', level: 68, stream: 'arts', category: 'advanced', position: [6, -3, 5], connections: ['a4', 'a5'], color: '#A050F0', description: 'Journalism, digital media, broadcasting and communications.' },
  { id: 'a7', name: 'Linguistics', level: 72, stream: 'arts', category: 'core', position: [3, 1, 4], connections: ['a1', 'a3'], color: '#C678FF', description: 'Language structure, phonetics, syntax, and semantics.' },
  { id: 'a8', name: 'Music & Performing Arts', level: 65, stream: 'arts', category: 'advanced', position: [6, 3, 4], connections: ['a4', 'a5'], color: '#D89FFF', description: 'Theory, composition, performance and stage arts.' },

  // ── LAW (Orange/Amber cluster, top-center) ──
  { id: 'l1', name: 'Constitutional Law', level: 88, stream: 'law', category: 'core', position: [0, 6, 0], connections: ['l2', 'l3'], color: '#FF9F43', description: 'Fundamental rights, directive principles, and constitutional framework of India.', resources: ['D.D. Basu Constitution of India', 'M.P. Jain Indian Constitutional Law'] },
  { id: 'l2', name: 'Contract Law', level: 84, stream: 'law', category: 'core', position: [-2, 7, 1], connections: ['l1', 'l4'], color: '#FF9F43', description: 'Offer, acceptance, consideration and enforceability of agreements.', resources: ['Indian Contract Act 1872', 'Anson\'s Law of Contract'] },
  { id: 'l3', name: 'Criminal Law', level: 80, stream: 'law', category: 'core', position: [2, 7, 1], connections: ['l1', 'l5'], color: '#FFBE76', description: 'IPC, CrPC, offences, punishments and criminal procedure.', resources: ['Ratanlal & Dhirajlal IPC', 'PSA Pillai Criminal Law'] },
  { id: 'l4', name: 'Tort Law', level: 74, stream: 'law', category: 'applied', position: [-3, 5, 2], connections: ['l2', 'l6'], color: '#FF9F43', description: 'Civil wrongs, negligence, liability and remedies.', resources: ['Winfield & Jolowicz on Tort'] },
  { id: 'l5', name: 'Family Law', level: 76, stream: 'law', category: 'applied', position: [3, 5, 2], connections: ['l3', 'l6'], color: '#FFBE76', description: 'Marriage, divorce, inheritance, adoption and maintenance under personal laws.', resources: ['Mulla Hindu Law', 'Tyabji Muslim Law'] },
  { id: 'l6', name: 'Corporate Law', level: 70, stream: 'law', category: 'advanced', position: [0, 5, 3], connections: ['l4', 'l5', 'l7'], color: '#E67E22', description: 'Company formation, governance, mergers, insolvency and SEBI regulations.', resources: ['Companies Act 2013', 'Avtar Singh Company Law'] },
  { id: 'l7', name: 'Intellectual Property', level: 68, stream: 'law', category: 'advanced', position: [-1, 8, 2], connections: ['l2', 'l6'], color: '#FF9F43', description: 'Patents, trademarks, copyrights and trade secrets.', resources: ['Indian Patents Act', 'WIPO Learning Resources'] },
  { id: 'l8', name: 'Legal Research & Mooting', level: 82, stream: 'law', category: 'applied', position: [1, 6, 3], connections: ['l1', 'l3'], color: '#FFBE76', description: 'Case law research, drafting, legal writing and moot court advocacy.' },

  // ── AGRICULTURE (Green cluster, center-bottom) ──
  { id: 'ag1', name: 'Soil Science', level: 85, stream: 'agriculture', category: 'core', position: [0, -3, 0], connections: ['ag2', 'ag3'], color: '#56E39F', description: 'Soil composition, fertility, conservation and management.', resources: ['Brady Soil Science'] },
  { id: 'ag2', name: 'Crop Science', level: 88, stream: 'agriculture', category: 'core', position: [-2, -5, 1], connections: ['ag1', 'ag4'], color: '#56E39F', description: 'Crop physiology, seed technology, and cropping systems.' },
  { id: 'ag3', name: 'Agri-Economics', level: 75, stream: 'agriculture', category: 'applied', position: [2, -5, 1], connections: ['ag1', 'ag5'], color: '#7EF0BB', description: 'Farm management, agricultural markets, and policy.' },
  { id: 'ag4', name: 'Horticulture', level: 72, stream: 'agriculture', category: 'applied', position: [-3, -5, -1], connections: ['ag2', 'ag6'], color: '#56E39F', description: 'Cultivation of fruits, vegetables, flowers and ornamentals.' },
  { id: 'ag5', name: 'Animal Husbandry', level: 70, stream: 'agriculture', category: 'applied', position: [3, -5, -1], connections: ['ag3', 'ag6'], color: '#7EF0BB', description: 'Livestock management, breeding and veterinary basics.' },
  { id: 'ag6', name: 'Agri-Technology', level: 68, stream: 'agriculture', category: 'advanced', position: [0, -6, -2], connections: ['ag4', 'ag5', 'ag7'], color: '#3DC87A', description: 'Drones, IoT sensors, precision farming and AgriTech.', resources: ['ICAR Research Portal'] },
  { id: 'ag7', name: 'Food Science', level: 78, stream: 'agriculture', category: 'advanced', position: [0, -5, 2], connections: ['ag2', 'ag6'], color: '#56E39F', description: 'Food processing, preservation, safety and nutrition.' },
  { id: 'ag8', name: 'Irrigation & Water Mgmt', level: 73, stream: 'agriculture', category: 'applied', position: [-1, -3, 2], connections: ['ag1', 'ag2'], color: '#7EF0BB', description: 'Drip/sprinkler irrigation, watershed management, and water conservation.' },
]

// ─── 3D Skill Node ─────────────────────────────────────────────────────────────

function SkillNode3D({ skill, isSelected, onSelect }: {
  skill: SkillNode
  isSelected: boolean
  onSelect: (skill: SkillNode) => void
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const [hovered, setHovered] = useState(false)

  useFrame(({ clock }) => {
    if (meshRef.current) {
      const intensity = skill.level / 100
      const pulse = 1 + Math.sin(clock.elapsedTime * 2 + skill.id.length) * 0.1 * intensity
      meshRef.current.scale.setScalar(pulse)
      if (isSelected) meshRef.current.rotation.y = clock.elapsedTime
    }
  })

  const nodeSize = 0.28 + (skill.level / 100) * 0.28

  return (
    <group position={skill.position}>
      <Float speed={1 + skill.level / 120} rotationIntensity={0.15} floatIntensity={0.1}>
        <mesh
          ref={meshRef}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          onClick={() => onSelect(skill)}
        >
          <icosahedronGeometry args={[nodeSize, 1]} />
          <meshStandardMaterial
            color={skill.color}
            emissive={skill.color}
            emissiveIntensity={hovered || isSelected ? 0.6 : 0.2}
            transparent
            opacity={0.85}
            metalness={0.4}
            roughness={0.2}
          />
        </mesh>

        {/* Ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[nodeSize + 0.08, nodeSize + 0.13, 32]} />
          <meshBasicMaterial color={skill.color} transparent opacity={0.5} />
        </mesh>

        {/* Label */}
        <Text3DWrapper position={[0, nodeSize + 0.5, 0]} fontSize={0.18} color="white" anchorX="center" anchorY="middle">
          {skill.name}
        </Text3DWrapper>

        <Text3DWrapper position={[0, nodeSize + 0.3, 0]} fontSize={0.14} color={skill.color} anchorX="center" anchorY="middle">
          {skill.level}%
        </Text3DWrapper>

        {/* Selection glow */}
        {isSelected && (
          <mesh>
            <sphereGeometry args={[nodeSize + 0.35, 32, 32]} />
            <meshBasicMaterial color={skill.color} transparent opacity={0.15} side={THREE.BackSide} />
          </mesh>
        )}
      </Float>
    </group>
  )
}

// ─── Connection Lines ──────────────────────────────────────────────────────────

function SkillConnections({ skills, selectedSkill }: { skills: SkillNode[]; selectedSkill: SkillNode | null }) {
  const connections = useMemo(() => {
    const lines: Array<{ from: SkillNode; to: SkillNode }> = []
    skills.forEach(skill => {
      skill.connections.forEach(cid => {
        const to = skills.find(s => s.id === cid)
        if (to) lines.push({ from: skill, to })
      })
    })
    return lines
  }, [skills])

  return (
    <>
      {connections.map((conn, i) => {
        const highlighted = selectedSkill &&
          (conn.from.id === selectedSkill.id || conn.to.id === selectedSkill.id)
        return (
          <Line
            key={i}
            points={[conn.from.position, conn.to.position]}
            color={highlighted ? conn.from.color : '#555555'}
            lineWidth={highlighted ? 3 : 1}
            transparent
            opacity={highlighted ? 0.9 : 0.35}
          />
        )
      })}
    </>
  )
}

// ─── Stream Selector ───────────────────────────────────────────────────────────

function StreamSelector({ activeStream, onChange }: {
  activeStream: Stream
  onChange: (s: Stream) => void
}) {
  const streams: Stream[] = ['all', 'medical', 'engineering', 'commerce', 'arts', 'agriculture', 'law']

  return (
    <div className="flex flex-wrap gap-2 justify-center mb-4">
      {streams.map(stream => {
        const cfg = stream === 'all' ? null : STREAM_CONFIG[stream]
        const isActive = activeStream === stream
        return (
          <button
            key={stream}
            onClick={() => onChange(stream)}
            className="px-4 py-2 rounded-full text-sm font-semibold transition-all duration-200 border"
            style={{
              backgroundColor: isActive ? (cfg?.color ?? '#ffffff') : 'transparent',
              color: isActive ? '#000000' : (cfg?.color ?? '#ffffff'),
              borderColor: cfg?.color ?? '#ffffff',
              boxShadow: isActive ? `0 0 12px ${cfg?.color ?? '#fff'}80` : 'none',
            }}
          >
            {cfg ? `${cfg.emoji} ${cfg.label}` : '🌐 All Streams'}
          </button>
        )
      })}
    </div>
  )
}

// ─── Category Legend ───────────────────────────────────────────────────────────

function CategoryLegend({ activeStream }: { activeStream: Stream }) {
  const categories = [
    { key: 'core', label: 'Core / Foundation', opacity: 1 },
    { key: 'applied', label: 'Applied', opacity: 0.75 },
    { key: 'advanced', label: 'Advanced', opacity: 0.5 },
  ]

  const color = activeStream === 'all' ? '#ffffff' : STREAM_CONFIG[activeStream]?.color ?? '#ffffff'

  return (
    <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm rounded-lg p-3 space-y-2">
      <h4 className="text-white font-semibold text-xs mb-2 uppercase tracking-wider">Level</h4>
      {categories.map(cat => (
        <div key={cat.key} className="flex items-center space-x-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color, opacity: cat.opacity }} />
          <span className="text-xs text-gray-300">{cat.label}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Skill Detail Panel ────────────────────────────────────────────────────────

function SkillDetailPanel({ skill, onClose }: { skill: SkillNode | null; onClose: () => void }) {
  if (!skill) return null
  const streamCfg = STREAM_CONFIG[skill.stream]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: 320 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 320 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="absolute top-4 right-4 bg-black/85 backdrop-blur-xl rounded-xl p-5 w-72 border"
        style={{ borderColor: skill.color + '60' }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full mb-1 inline-block"
              style={{ backgroundColor: skill.color + '25', color: skill.color }}>
              {streamCfg.emoji} {streamCfg.label} · {skill.category.toUpperCase()}
            </span>
            <h3 className="text-lg font-bold text-white mt-1">{skill.name}</h3>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors mt-1 ml-2">✕</button>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">Proficiency</span>
            <span className="font-bold" style={{ color: skill.color }}>{skill.level}%</span>
          </div>
          <div className="w-full bg-gray-800 rounded-full h-2">
            <div
              className="rounded-full h-2 transition-all duration-700"
              style={{ width: `${skill.level}%`, backgroundColor: skill.color, boxShadow: `0 0 6px ${skill.color}` }}
            />
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-300 mb-4 leading-relaxed">{skill.description}</p>

        {/* Resources */}
        {skill.resources && skill.resources.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Learning Resources</p>
            <ul className="space-y-1">
              {skill.resources.map((r, i) => (
                <li key={i} className="text-sm flex items-center gap-2" style={{ color: skill.color }}>
                  <span>→</span> {r}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <button className="flex-1 py-2 rounded-lg text-sm font-bold text-black transition-opacity hover:opacity-80"
            style={{ backgroundColor: skill.color }}>
            Practice
          </button>
          <button className="flex-1 py-2 rounded-lg text-sm font-semibold text-white bg-gray-800 hover:bg-gray-700 transition-colors">
            Learn More
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Stats Bar ─────────────────────────────────────────────────────────────────

function StreamStats({ skills, activeStream }: { skills: SkillNode[]; activeStream: Stream }) {
  const avgLevel = skills.length > 0
    ? Math.round(skills.reduce((sum, s) => sum + s.level, 0) / skills.length)
    : 0

  const color = activeStream === 'all' ? '#ffffff' : STREAM_CONFIG[activeStream]?.color ?? '#ffffff'

  return (
    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
      <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
        <p className="text-xs text-gray-400">Click nodes • Drag to rotate • Scroll to zoom</p>
      </div>
      <div className="bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2 flex gap-4">
        <div className="text-center">
          <p className="text-xs text-gray-400">Skills</p>
          <p className="text-sm font-bold" style={{ color }}>{skills.length}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-400">Avg Level</p>
          <p className="text-sm font-bold" style={{ color }}>{avgLevel}%</p>
        </div>
      </div>
    </div>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function SkillTree3D({ userId }: { userId: string }) {
  const [activeStream, setActiveStream] = useState<Stream>('all')
  const [selectedSkill, setSelectedSkill] = useState<SkillNode | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(t)
  }, [userId])

  // Reset selection when stream changes
  const handleStreamChange = (s: Stream) => {
    setActiveStream(s)
    setSelectedSkill(null)
  }

  const visibleSkills = activeStream === 'all'
    ? ALL_SKILLS
    : ALL_SKILLS.filter(s => s.stream === activeStream)

  if (loading) {
    return (
      <div className="h-[500px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-gray-700 border-t-neon-cyan rounded-full mx-auto mb-4" />
          <p className="text-gray-400">Loading 3D Skill Map…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stream Tabs */}
      <StreamSelector activeStream={activeStream} onChange={handleStreamChange} />

      {/* Stream description */}
      {activeStream !== 'all' && (
        <motion.div
          key={activeStream}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <span className="text-sm text-gray-400">
            Showing <span className="font-semibold" style={{ color: STREAM_CONFIG[activeStream].color }}>
              {STREAM_CONFIG[activeStream].label}
            </span> stream — {visibleSkills.length} skills
          </span>
        </motion.div>
      )}

      {/* 3D Canvas */}
      <div className="relative rounded-xl overflow-hidden bg-gradient-to-b from-gray-900/40 to-black/60"
        style={{ height: '480px' }}>
        <Canvas camera={{ position: [8, 6, 8], fov: 55 }} style={{ background: 'transparent' }}>
          <ambientLight intensity={0.35} />
          <pointLight position={[12, 12, 12]} intensity={0.8} />
          <pointLight position={[-12, -8, 6]} intensity={0.4} color="#00CFFF" />
          <pointLight position={[6, -12, -6]} intensity={0.3} color="#FF4C6E" />
          <pointLight position={[-6, 6, -10]} intensity={0.3} color="#C678FF" />
          <pointLight position={[0, -8, 4]} intensity={0.3} color="#56E39F" />

          {visibleSkills.map(skill => (
            <SkillNode3D
              key={skill.id}
              skill={skill}
              isSelected={selectedSkill?.id === skill.id}
              onSelect={setSelectedSkill}
            />
          ))}

          <SkillConnections skills={visibleSkills} selectedSkill={selectedSkill} />

          <OrbitControls
            enablePan={true}
            enableZoom={true}
            enableRotate={true}
            minDistance={4}
            maxDistance={22}
          />
        </Canvas>

        {/* Overlays */}
        <CategoryLegend activeStream={activeStream} />
        <SkillDetailPanel skill={selectedSkill} onClose={() => setSelectedSkill(null)} />
        <StreamStats skills={visibleSkills} activeStream={activeStream} />
      </div>
    </div>
  )
}