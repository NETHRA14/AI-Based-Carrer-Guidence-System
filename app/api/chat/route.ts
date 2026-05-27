import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { FreeAIService } from '@/lib/free-ai-services'

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { session } } = await supabase.auth.getSession()
    
    const { message, provider, context, conversationHistory } = await request.json()
    
    if (!message || !message.trim()) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Get user subscription tier (default to free)
    let userTier = 'free'
    if (session?.user?.id) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('subscription_tier')
        .eq('id', session.user.id)
        .single()
      
      userTier = profile?.subscription_tier || 'free'
    }

    try {
      // Initialize Free AI Service
      const aiService = FreeAIService.getInstance()
      
      // Build context-aware prompt for career guidance
      const systemPrompt = "You are a friendly and expert career advisor. Respond in clear, helpful, conversational language. Do NOT return JSON or code blocks — just natural, warm, human-readable advice. Use bullet points or short paragraphs where helpful."
      
      let contextualPrompt = message

      // Format context as readable text (not raw JSON)
      if (context && Object.values(context).some(Boolean)) {
        const contextLines: string[] = []
        if (context.careerGoals?.length) contextLines.push(`Career Goals: ${context.careerGoals.join(', ')}`)
        if (context.skills?.length) contextLines.push(`Skills: ${context.skills.join(', ')}`)
        if (context.interests?.length) contextLines.push(`Interests: ${context.interests.join(', ')}`)
        if (contextLines.length) {
          contextualPrompt = `User profile:\n${contextLines.join('\n')}\n\nUser question: ${message}`
        }
      }
      
      if (conversationHistory && conversationHistory.length > 0) {
        const historyContext = conversationHistory.slice(-3).map((msg: any) => 
          `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
        ).join('\n')
        contextualPrompt = `Previous conversation:\n${historyContext}\n\nCurrent question: ${message}`
      }

      const fullPrompt = `${systemPrompt}\n\n${contextualPrompt}`

      // Generate response using free AI models
      const aiResponse = await aiService.generateResponse(fullPrompt, {
        provider: provider as any,
        maxTokens: 1000,
        temperature: 0.7
      })

      const finalResponse = {
        response: aiResponse.content,
        provider: aiResponse.provider,
        confidence: aiResponse.confidence || 0.8,
        usage: aiResponse.usage || { total_tokens: 0 }
      }

      // Save conversation if user is authenticated
      if (session?.user?.id) {
        try {
          await supabase.from('chat_conversations').insert({
            user_id: session.user.id,
            message: message,
            response: finalResponse.response,
            model_used: 'free-ai-model',
            provider_used: finalResponse.provider,
            usage_tokens: finalResponse.usage.total_tokens || 0
          })
        } catch (saveError) {
          console.warn('Failed to save conversation:', saveError)
          // Continue without failing
        }
      }

      return NextResponse.json({
        response: finalResponse.response,
        provider: finalResponse.provider,
        confidence: finalResponse.confidence,
        usage: finalResponse.usage,
        success: true
      })

    } catch (aiError: any) {
      console.error('❌ AI generation error:', aiError)
      
      // Provide helpful fallback response based on message content
      let fallbackResponse = `I apologize, but I'm having trouble accessing my AI services right now. However, I'm here to help with your career questions!`
      
      const lowerMessage = message.toLowerCase()
      
      if (lowerMessage.includes('career') || lowerMessage.includes('job') || lowerMessage.includes('work')) {
        fallbackResponse += `\n\n💡 **Career Guidance:**\n• Explore fields that match your interests and skills\n• Research industry trends and salary expectations\n• Build relevant skills through courses or projects\n• Network with professionals in your target field\n• Update your LinkedIn profile and resume regularly`
      } else if (lowerMessage.includes('interview')) {
        fallbackResponse += `\n\n🎯 **Interview Tips:**\n• Research the company and role thoroughly\n• Practice common interview questions using the STAR method\n• Prepare thoughtful questions about the role and team\n• Dress appropriately and arrive early\n• Follow up with a thank-you email within 24 hours`
      } else if (lowerMessage.includes('resume') || lowerMessage.includes('cv')) {
        fallbackResponse += `\n\n📄 **Resume Advice:**\n• Tailor your resume for each specific job application\n• Use action verbs and quantify your achievements\n• Keep it concise (1-2 pages for most roles)\n• Highlight relevant skills and experience prominently\n• Proofread carefully for errors and consistency`
      } else if (lowerMessage.includes('skill') || lowerMessage.includes('learn')) {
        fallbackResponse += `\n\n📚 **Skill Development:**\n• Identify skills in demand for your target role\n• Use free resources like Coursera, Khan Academy, or YouTube\n• Practice through personal projects and volunteer work\n• Join professional communities and attend workshops\n• Set learning goals and track your progress`
      } else {
        fallbackResponse += `\n\nBased on your message, here are some general tips:\n• Set clear, specific goals for your career development\n• Identify the skills and experience you need to gain\n• Seek mentorship from industry professionals\n• Stay updated with trends in your field of interest`
      }

      fallbackResponse += `\n\n⚡ **Note:** AI services are currently experiencing high demand. Please try again in a few moments or ask a more specific question.`

      // Check if it's an API quota issue
      if (aiError?.message?.includes('quota') || aiError?.message?.includes('rate limit')) {
        fallbackResponse += `\n\n⏰ **API Limit Reached:** Our free AI providers have reached their daily/monthly limits. Services will resume automatically when quotas reset.`
      }

      return NextResponse.json({
        response: fallbackResponse,
        provider: 'system-fallback',
        confidence: 0.6,
        usage: { total_tokens: 0 },
        success: true,
        fallback: true,
        error: aiError?.message || 'AI service temporarily unavailable'
      })
    }

  } catch (error) {
    console.error('❌ Chat API error:', error)
    
    return NextResponse.json({
      error: 'Failed to process chat message',
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}