'use client'

import React, { useRef, useMemo, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Line } from '@react-three/drei'
import Text3DWrapper from './Text3DWrapper'
import { motion, AnimatePresence } from 'framer-motion'
import * as THREE from 'three'

interface CareerTreeProps {
  careerPath: string
  relatedCareers: string[]
  skills: string[]
}

// ─── Node Types ───────────────────────────────────────────────────────────────

type NodeType = 'main' | 'related' | 'skill'

interface SelectedNode {
  text: string
  type: NodeType
  color: string
}

// ─── Single 3D Career Node ────────────────────────────────────────────────────

function CareerNode({
  position,
  text,
  color = '#00FFFF',
  size = 0.5,
  isMain = false,
  isSelected = false,
  onSelect,
}: {
  position: [number, number, number]
  text: string
  color?: string
  size?: number
  isMain?: boolean
  isSelected?: boolean
  onSelect: () => void
}) {
  const meshRef = useRef<THREE.Mesh>(null!)
  const groupRef = useRef<THREE.Group>(null!)
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    if (meshRef.current && groupRef.current) {
      // Gentle rotation
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime + position[0]) * 0.15

      // Main node floats up/down
      if (isMain) {
        groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.12
      }

      // Pulse scale on hover or selection
      const targetScale = hovered || isSelected ? 1.25 : 1
      meshRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.1
      )
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {/* Glow ring when selected */}
      {isSelected && (
        <mesh>
          <sphereGeometry args={[size + 0.35, 32, 32]} />
          <meshBasicMaterial color={color} transparent opacity={0.15} side={THREE.BackSide} />
        </mesh>
      )}

      {/* Main sphere */}
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onSelect() }}
        onPointerEnter={() => { setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'default' }}
      >
        <sphereGeometry args={[size, 32, 32]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={hovered || isSelected ? 0.6 : isMain ? 0.3 : 0.15}
          transparent
          opacity={0.88}
          metalness={0.3}
          roughness={0.25}
        />
      </mesh>

      {/* Label */}
      <Text3DWrapper
        position={[0, size + 0.5, 0]}
        fontSize={isMain ? 0.28 : 0.18}
        color={color}
        anchorX="center"
        anchorY="middle"
        maxWidth={3}
        textAlign="center"
      >
        {text}
      </Text3DWrapper>
    </group>
  )
}

// ─── Connecting Lines ─────────────────────────────────────────────────────────

function ConnectingLine({
  start, end, color = '#00FFFF', highlighted = false
}: {
  start: [number, number, number]
  end: [number, number, number]
  color?: string
  highlighted?: boolean
}) {
  const points = useMemo(() => [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end)
  ], [start, end])

  return (
    <Line
      points={points}
      color={highlighted ? color : '#444444'}
      lineWidth={highlighted ? 3 : 1}
      transparent
      opacity={highlighted ? 0.9 : 0.4}
    />
  )
}

// ─── Floating Background Particles ───────────────────────────────────────────

function FloatingParticles() {
  const particlesRef = useRef<THREE.Points>(null!)
  const count = 80

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20
      pos[i * 3 + 1] = (Math.random() - 0.5) * 20
      pos[i * 3 + 2] = (Math.random() - 0.5) * 20
    }
    return pos
  }, [])

  useFrame((state) => {
    if (particlesRef.current) {
      particlesRef.current.rotation.y = state.clock.elapsedTime * 0.04
    }
  })

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={positions.length / 3} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.03} color="#00FFFF" transparent opacity={0.5} blending={THREE.AdditiveBlending} />
    </points>
  )
}

// ─── 3D Scene (inside Canvas) ─────────────────────────────────────────────────

function CareerTree3DScene({
  careerPath, relatedCareers, skills, selectedNode, onNodeSelect
}: CareerTreeProps & {
  selectedNode: SelectedNode | null
  onNodeSelect: (node: SelectedNode | null) => void
}) {
  const mainPosition: [number, number, number] = [0, 0, 0]

  const relatedPositions = useMemo<[number, number, number][]>(() => {
    return relatedCareers.map((_, i) => {
      const angle = (i / relatedCareers.length) * Math.PI * 2
      return [
        Math.cos(angle) * 4,
        (Math.random() - 0.5) * 2,
        Math.sin(angle) * 4,
      ]
    })
  }, [relatedCareers])

  const skillPositions = useMemo<[number, number, number][]>(() => {
    return skills.map((_, i) => {
      const angle = (i / skills.length) * Math.PI * 2 + Math.PI / skills.length
      return [
        Math.cos(angle) * 2.5,
        -2 + Math.random() * 1.5,
        Math.sin(angle) * 2.5,
      ]
    })
  }, [skills])

  const isSelected = (text: string) => selectedNode?.text === text

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} color="#00FFFF" intensity={0.9} />
      <pointLight position={[-10, -8, 5]} color="#FF007F" intensity={0.5} />
      <pointLight position={[5, -10, -5]} color="#8B00FF" intensity={0.3} />

      <FloatingParticles />

      {/* Main career node */}
      <CareerNode
        position={mainPosition}
        text={careerPath}
        color="#00FFFF"
        size={0.8}
        isMain={true}
        isSelected={isSelected(careerPath)}
        onSelect={() => onNodeSelect(
          isSelected(careerPath) ? null : { text: careerPath, type: 'main', color: '#00FFFF' }
        )}
      />

      {/* Related career nodes */}
      {relatedCareers.map((career, i) => (
        <React.Fragment key={career}>
          <CareerNode
            position={relatedPositions[i]}
            text={career}
            color="#FF007F"
            size={0.5}
            isSelected={isSelected(career)}
            onSelect={() => onNodeSelect(
              isSelected(career) ? null : { text: career, type: 'related', color: '#FF007F' }
            )}
          />
          <ConnectingLine
            start={mainPosition}
            end={relatedPositions[i]}
            color="#FF007F"
            highlighted={isSelected(career) || isSelected(careerPath)}
          />
        </React.Fragment>
      ))}

      {/* Skill nodes */}
      {skills.map((skill, i) => (
        <React.Fragment key={skill}>
          <CareerNode
            position={skillPositions[i]}
            text={skill}
            color="#8B00FF"
            size={0.3}
            isSelected={isSelected(skill)}
            onSelect={() => onNodeSelect(
              isSelected(skill) ? null : { text: skill, type: 'skill', color: '#8B00FF' }
            )}
          />
          <ConnectingLine
            start={mainPosition}
            end={skillPositions[i]}
            color="#8B00FF"
            highlighted={isSelected(skill) || isSelected(careerPath)}
          />
        </React.Fragment>
      ))}

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={16}
        autoRotate={!selectedNode}
        autoRotateSpeed={0.4}
      />
    </>
  )
}

// ─── Info Popup Panel ─────────────────────────────────────────────────────────

const NODE_META: Record<NodeType, { label: string; emoji: string; hint: string }> = {
  main:    { label: 'Main Career',     emoji: '🎯', hint: 'This is your selected career path. All related careers and skills branch from this node.' },
  related: { label: 'Related Career',  emoji: '🔗', hint: 'A closely related career path. You can pivot into this role with similar skills and experience.' },
  skill:   { label: 'Required Skill',  emoji: '⚡', hint: 'A core skill needed for this career. Building proficiency here will boost your career prospects.' },
}

function NodeInfoPanel({
  node, onClose, careerPath
}: {
  node: SelectedNode
  onClose: () => void
  careerPath: string
}) {
  const meta = NODE_META[node.type]
  return (
    <motion.div
      key={node.text}
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="absolute top-4 right-4 w-72 rounded-2xl border p-5 backdrop-blur-xl"
      style={{
        background: 'rgba(5,5,15,0.88)',
        borderColor: node.color + '55',
        boxShadow: `0 0 24px ${node.color}30`,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <span
            className="text-xs font-bold px-2 py-0.5 rounded-full mb-1 inline-block"
            style={{ backgroundColor: node.color + '25', color: node.color }}
          >
            {meta.emoji} {meta.label}
          </span>
          <h3 className="text-white font-bold text-base mt-1 leading-snug">{node.text}</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white transition-colors text-lg ml-2 mt-1"
        >✕</button>
      </div>

      {/* Divider */}
      <div className="w-full h-px mb-3" style={{ backgroundColor: node.color + '33' }} />

      {/* Info */}
      <p className="text-gray-300 text-sm leading-relaxed mb-4">{meta.hint}</p>

      {/* Context */}
      {node.type !== 'main' && (
        <div className="rounded-lg p-3 text-xs" style={{ backgroundColor: node.color + '12' }}>
          <span className="text-gray-400">
            {node.type === 'skill'
              ? `Required for → `
              : `Related to → `}
          </span>
          <span className="font-semibold" style={{ color: '#00FFFF' }}>{careerPath}</span>
        </div>
      )}

      {/* Type-specific badges */}
      <div className="flex gap-2 mt-3">
        {node.type === 'skill' && (
          <span className="text-xs px-2 py-1 rounded-full bg-purple-900/40 text-purple-300">🎓 Learn this skill</span>
        )}
        {node.type === 'related' && (
          <span className="text-xs px-2 py-1 rounded-full bg-pink-900/40 text-pink-300">💼 Explore this path</span>
        )}
        {node.type === 'main' && (
          <span className="text-xs px-2 py-1 rounded-full bg-cyan-900/40 text-cyan-300">⭐ Your career goal</span>
        )}
      </div>
    </motion.div>
  )
}

// ─── Main Export ──────────────────────────────────────────────────────────────

const CareerTree3D: React.FC<CareerTreeProps> = ({ careerPath, relatedCareers, skills }) => {
  const [selectedNode, setSelectedNode] = useState<SelectedNode | null>(null)

  // Reset selection when career changes
  React.useEffect(() => { setSelectedNode(null) }, [careerPath])

  return (
    <div className="w-full h-96 relative">
      <Canvas camera={{ position: [8, 5, 8], fov: 60 }} style={{ background: 'transparent' }}>
        <CareerTree3DScene
          careerPath={careerPath}
          relatedCareers={relatedCareers}
          skills={skills}
          selectedNode={selectedNode}
          onNodeSelect={setSelectedNode}
        />
      </Canvas>

      {/* Click Info Panel */}
      <AnimatePresence>
        {selectedNode && (
          <NodeInfoPanel
            node={selectedNode}
            onClose={() => setSelectedNode(null)}
            careerPath={careerPath}
          />
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg p-3 space-y-1.5">
        {[
          { color: '#00FFFF', label: 'Main Career' },
          { color: '#FF007F', label: 'Related Career' },
          { color: '#8B00FF', label: 'Required Skill' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
            <span className="text-xs text-gray-300">{label}</span>
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-2">
        <p className="text-xs text-gray-400">
          {selectedNode ? '✕ Click ball again to deselect' : '👆 Click any ball • Drag to rotate • Scroll to zoom'}
        </p>
      </div>
    </div>
  )
}

export default CareerTree3D