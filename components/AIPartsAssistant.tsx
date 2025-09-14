'use client'

import { useState } from 'react'

interface AIPartsAssistantProps {
  onCopyToForm: (text: string) => void
}

export default function AIPartsAssistant({ onCopyToForm }: AIPartsAssistantProps) {
  const [prompt, setPrompt] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState('')
  const [showResult, setShowResult] = useState(false)

  const handleGetSuggestion = async () => {
    if (!prompt.trim()) {
      // Focus and highlight the input
      const input = document.getElementById('ai-prompt') as HTMLTextAreaElement
      if (input) {
        input.focus()
        input.classList.add('border-red-500')
        setTimeout(() => input.classList.remove('border-red-500'), 2000)
      }
      return
    }

    setIsLoading(true)
    setShowResult(false)

    // Simulate AI response (replace with actual API call)
    setTimeout(() => {
      const suggestions = `Based on your description, here are potential parts you might need:

- Hydraulic cylinder seals - Worn seals can cause drifting and poor holding
- Control valve assembly - Internal wear affects pressure control
- Load check valve - Prevents unwanted movement when holding position
- Pilot control valve - Controls the main valve operation
- Hydraulic fluid filter - Contaminated fluid can cause valve sticking
- Pressure relief valve - Ensures proper system pressure regulation

These components work together to maintain proper hydraulic pressure and control in your loader's bucket system.`
      
      setResult(suggestions)
      setShowResult(true)
      setIsLoading(false)
    }, 2000)
  }

  const handleCopyToForm = () => {
    const fullText = `Problem Description:\n${prompt}\n\nAI Suggested Parts:\n${result}`
    onCopyToForm(fullText)
  }

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-amber-500/30">
      <h3 className="text-xl font-bold text-white mb-4 flex items-center">
        <span className="text-amber-500 mr-3 text-xl">✨</span> AI Parts Assistant
      </h3>
      <p className="text-gray-400 mb-4 text-sm">
        Describe your machine's problem, and our AI can suggest potential parts you might need.
      </p>
      <div>
        <label htmlFor="ai-prompt" className="block text-sm font-medium text-gray-300 mb-2">
          Describe the issue:
        </label>
        <textarea 
          id="ai-prompt" 
          name="ai-prompt" 
          rows={3} 
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all duration-300 resize-none" 
          placeholder="e.g., 'My loader's bucket is drifting down and won't hold a position.'"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>
      <div className="mt-4">
        <button 
          onClick={handleGetSuggestion}
          disabled={isLoading}
          className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-500 text-gray-900 font-bold rounded-lg hover:from-amber-600 hover:to-yellow-600 transition-all duration-300 hover:scale-105 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          <span>{isLoading ? 'Analyzing...' : 'Get Suggestions'}</span>
          {isLoading && (
            <div className="w-5 h-5 border-2 border-dashed rounded-full animate-spin border-gray-900 ml-3" />
          )}
        </button>
      </div>
      {showResult && (
        <div className="mt-6 animate-fade-in">
          <h4 className="font-semibold text-white mb-3">Suggested Parts:</h4>
          <div className="p-4 rounded-lg bg-gray-700/50 text-gray-300 border border-gray-600 whitespace-pre-wrap text-sm leading-relaxed">
            {result}
          </div>
          <button 
            onClick={handleCopyToForm}
            className="mt-4 w-full py-2 px-4 bg-gray-700 text-amber-500 hover:bg-gray-600 rounded-lg font-semibold transition-all duration-300 hover:scale-105"
          >
            Copy to Enquiry Form →
          </button>
        </div>
      )}
    </div>
  )
}
