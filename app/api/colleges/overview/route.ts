import { NextRequest, NextResponse } from 'next/server'
import { aiService } from '@/lib/ai-services'

// Recursively extract all string values from a JSON object/array
function extractTextFromJson(obj: any, results: string[] = []): string[] {
  if (typeof obj === 'string') {
    const trimmed = obj.trim()
    if (trimmed.length > 20) results.push(trimmed)
  } else if (Array.isArray(obj)) {
    obj.forEach(item => extractTextFromJson(item, results))
  } else if (obj && typeof obj === 'object') {
    Object.values(obj).forEach(val => extractTextFromJson(val, results))
  }
  return results
}

// Clean raw AI output into plain readable paragraphs
function cleanToPlainText(raw: string): string {
  // 1. Try to parse as JSON and extract just the text values
  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      const texts = extractTextFromJson(parsed)
      if (texts.length > 0) return texts.join('\n\n')
    }
  } catch {
    // Not valid JSON — fall through to text cleanup
  }

  let text = raw
  // Remove code fences
  text = text.replace(/```[\s\S]*?```/g, '')
  // Remove JSON key patterns like "paragraph1": or "collegeOverview":
  text = text.replace(/"[a-zA-Z0-9_]+":\s*/g, '')
  // Remove surrounding quote marks from extracted values
  text = text.replace(/^"([\s\S]*)"$/gm, '$1')
  // Remove curly braces and square brackets
  text = text.replace(/[{}\[\]]/g, '')
  // Remove markdown bold/italic
  text = text.replace(/\*\*|__|\*(?!\s)|_/g, '')
  // Convert bullet lines into plain text (remove bullet character)
  text = text.replace(/^[\s]*[-•*]\s+/gm, '')
  // Remove trailing commas
  text = text.replace(/,\s*$/gm, '')
  // Collapse 3+ blank lines
  text = text.replace(/\n{3,}/g, '\n\n')

  return text.trim()
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, city, state, programs, rating, type } = body || {}

    if (!name) {
      return NextResponse.json({ error: 'Missing required field: name' }, { status: 400 })
    }

    const prompt = `Write a student-friendly college overview for "${name}" as exactly 3 paragraphs of plain prose.

Paragraph 1: Location, type of institution, overall reputation, and what makes it stand out.
Paragraph 2: Academic programs offered, curriculum strengths, and faculty.
Paragraph 3: Campus life, student activities, career/placement outcomes, and what kind of student it suits best.

College details:
- Location: ${city || ''}${city && state ? ', ' : ''}${state || ''}
- Type: ${type || 'N/A'}
- Rating: ${rating || 'N/A'} / 5
- Programs: ${(programs || []).slice(0, 6).join(', ') || 'N/A'}

IMPORTANT: Output ONLY the 3 paragraphs separated by a blank line. Do not use JSON, bullet points, headings, markdown, or any formatting symbols whatsoever.`

    const ai = await aiService.generateResponse(prompt, {
      provider: 'auto',
      maxTokens: 450,
      temperature: 0.5,
      systemPrompt: 'You are a helpful college counselor. Always respond with plain paragraph text only. Never output JSON, bullet points, or markdown.'
    })

    const overview = cleanToPlainText(ai.content || '')

    return NextResponse.json({ success: true, overview, provider: ai.provider })
  } catch (error: any) {
    console.error('College overview error:', error)
    return NextResponse.json({
      success: true,
      overview: `This institution offers a strong academic environment with reputable programs and a dedicated faculty. Known for quality education, it attracts students from across the region seeking a well-rounded learning experience.\n\nThe college provides a range of undergraduate and postgraduate courses with a curriculum designed to build both theoretical foundations and practical skills. Faculty members bring deep expertise to their respective disciplines.\n\nStudents enjoy an active campus life with cultural events, sports, and student clubs. Strong placement support and an active alumni network help graduates build successful careers after completing their studies.`,
      provider: 'fallback'
    })
  }
}