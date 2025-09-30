'use client'

import React from 'react'
import { useLanguage } from '@/contexts/LanguageContext'

interface GEQSScore {
  total_score: number
  cfc_score: number
  cov_score: number
  cons_score: number
  msa_score: number
  ilq_score: number
  recommendation: string
  quality_level: string
}

interface GEQSDetails {
  field_confidences: Record<string, number>
  missing_required_fields: string[]
  consistency_issues: string[]
  multi_signal_agreement: {
    total_agreement: boolean
    date_agreement: boolean
    merchant_agreement: boolean
    regex_extractions: Record<string, string>
  }
  image_quality_metrics: {
    text_length: number
    extraction_rate: number
    pattern_matches: {
      currency: boolean
      date: boolean
      ticket_id: boolean
    }
  }
}

interface QualityAnalysis {
  overall_assessment: string
  strengths: string[]
  weaknesses: string[]
  recommendations: string[]
  confidence_breakdown: Record<string, string>
}

interface GEQSQualityScoreProps {
  geqsScore?: GEQSScore | null
  geqsDetails?: GEQSDetails | null
  qualityAnalysis?: QualityAnalysis | null
  className?: string
}

export function GEQSQualityScore({ 
  geqsScore, 
  geqsDetails, 
  qualityAnalysis, 
  className = '' 
}: GEQSQualityScoreProps) {
  const { t } = useLanguage()

  console.log('🎯 GEQSQualityScore component rendered with:', {
    geqsScore,
    geqsDetails,
    qualityAnalysis,
    hasScore: !!geqsScore
  })

  // Always return null - user wants this component completely hidden
  console.log('❌ GEQSQualityScore: Component disabled by user request, returning null')
  return null
}

export default GEQSQualityScore
