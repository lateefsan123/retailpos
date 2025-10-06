// Text-to-Speech Service with ElevenLabs Integration
export interface TTSVoice {
  id: string
  name: string
  type: 'standard' | 'premium'
  costPer1K: number
}

export interface TTSUsage {
  totalCharacters: number
  totalCost: number
  dailyUsage: number
  dailyCost: number
  lastResetDate: string
}

export interface TTSSettings {
  enabled: boolean
  useElevenLabs: boolean
  selectedVoice: string
  apiKey: string
  dailyLimit: number
  useOpenAI: boolean
  openaiApiKey: string
  openaiVoice: string
}

// ElevenLabs TTS Voices - High quality voices
export const ELEVENLABS_VOICES: TTSVoice[] = [
  { id: 'pNInz6obpgDQGcFmaJgB', name: 'Adam (Deep, Authoritative)', type: 'standard', costPer1K: 0.18 },
  { id: 'EXAVITQu4vr4xnSDxMaL', name: 'Bella (Warm, Friendly)', type: 'standard', costPer1K: 0.18 },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Josh (Professional, Clear)', type: 'standard', costPer1K: 0.18 },
  { id: 'AZnzlk1XvdvUeBnXmlld', name: 'Domi (Confident, Energetic)', type: 'standard', costPer1K: 0.18 },
  { id: 'ErXwobaYiN019PkySvjV', name: 'Elli (Natural, Conversational)', type: 'standard', costPer1K: 0.18 },
  { id: 'MF3mGyEYCl7XYWbV9V6O', name: 'Rachel (Professional, Warm)', type: 'standard', costPer1K: 0.18 },
  { id: 'TxGEqnHWrfWFTfGW9XjX', name: 'Drew (Deep, Authoritative)', type: 'standard', costPer1K: 0.18 },
  { id: 'VR6AewLTigWG4xSOukaG', name: 'Clyde (Friendly, Approachable)', type: 'standard', costPer1K: 0.18 }
]

// OpenAI TTS Voices - Good quality voices
export const OPENAI_VOICES: TTSVoice[] = [
  { id: 'alloy', name: 'Alloy (Neutral, Balanced)', type: 'standard', costPer1K: 0.015 },
  { id: 'echo', name: 'Echo (Clear, Professional)', type: 'standard', costPer1K: 0.015 },
  { id: 'fable', name: 'Fable (Warm, Storytelling)', type: 'standard', costPer1K: 0.015 },
  { id: 'onyx', name: 'Onyx (Deep, Authoritative)', type: 'standard', costPer1K: 0.015 },
  { id: 'nova', name: 'Nova (Friendly, Energetic)', type: 'standard', costPer1K: 0.015 },
  { id: 'shimmer', name: 'Shimmer (Soft, Gentle)', type: 'standard', costPer1K: 0.015 }
]

class TTSService {
  private settings: TTSSettings
  private usage: TTSUsage
  private isInitialized = false
  private currentAudio: HTMLAudioElement | null = null
  private currentUtterance: SpeechSynthesisUtterance | null = null

  constructor() {
    this.settings = this.loadSettings()
    this.usage = this.loadUsage()
    this.initializeUsage()
  }

  private loadSettings(): TTSSettings {
    const envElevenLabsKey = import.meta.env.VITE_ELEVENLABS_KEY || ''
    const envOpenAIKey = import.meta.env.VITE_OPENAI_API_KEY || ''
    
    // Environment variables loaded
    
    const defaultSettings: TTSSettings = {
      enabled: true, // Enable TTS by default
      useElevenLabs: !!envElevenLabsKey, // Only enable if API key is present
      selectedVoice: 'pNInz6obpgDQGcFmaJgB', // Use a standard voice instead of custom
      apiKey: envElevenLabsKey,
      dailyLimit: 1000, // Reduced daily limit to prevent quota issues
      useOpenAI: !!envOpenAIKey, // Only enable if API key is present
      openaiApiKey: envOpenAIKey,
      openaiVoice: 'alloy'
    }

    try {
      const saved = localStorage.getItem('tts-settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Merge with defaults to ensure new fields are present
        const merged = { ...defaultSettings, ...parsed }
        // Environment variables always win over cached values (trimmed)
        if (envOpenAIKey) {
          merged.openaiApiKey = String(envOpenAIKey).trim()
          merged.useOpenAI = true
        }
        if (envElevenLabsKey) {
          merged.apiKey = String(envElevenLabsKey).trim()
          merged.useElevenLabs = true
        }
        return merged
      }
      return defaultSettings
    } catch (error) {
      console.error('Error loading TTS settings:', error)
      return defaultSettings
    }
  }

  private loadUsage(): TTSUsage {
    const defaultUsage: TTSUsage = {
      totalCharacters: 0,
      totalCost: 0,
      dailyUsage: 0,
      dailyCost: 0,
      lastResetDate: new Date().toISOString().split('T')[0]
    }

    try {
      const saved = localStorage.getItem('tts-usage')
      return saved ? { ...defaultUsage, ...JSON.parse(saved) } : defaultUsage
    } catch {
      return defaultUsage
    }
  }

  private saveSettings() {
    try {
      localStorage.setItem('tts-settings', JSON.stringify(this.settings))
    } catch (error) {
      console.error('Failed to save TTS settings:', error)
    }
  }

  private saveUsage() {
    try {
      localStorage.setItem('tts-usage', JSON.stringify(this.usage))
    } catch (error) {
      console.error('Failed to save TTS usage:', error)
    }
  }

  private initializeUsage() {
    const today = new Date().toISOString().split('T')[0]
    if (this.usage.lastResetDate !== today) {
      this.usage.dailyUsage = 0
      this.usage.dailyCost = 0
      this.usage.lastResetDate = today
      this.saveUsage()
    }
  }

  // Public methods
  getSettings(): TTSSettings {
    return { ...this.settings }
  }

  getUsage(): TTSUsage {
    this.initializeUsage() // Update daily usage if needed
    return { ...this.usage }
  }

  updateSettings(newSettings: Partial<TTSSettings>) {
    this.settings = { ...this.settings, ...newSettings }
    this.saveSettings()
  }

  async speak(text: string): Promise<boolean> {
    if (!this.settings.enabled) {
      return false
    }

    // If no API keys are available, disable TTS gracefully
    if (!this.settings.apiKey && !this.settings.openaiApiKey) {
      this.settings.enabled = false
      this.saveSettings()
      return false
    }

    const characterCount = text.length
    const estimatedCost = this.calculateCost(characterCount)

    // Check daily limit
    if (this.usage.dailyUsage + characterCount > this.settings.dailyLimit) {
      // Skip ElevenLabs and go directly to OpenAI
    }

    // Try ElevenLabs TTS first if enabled and configured (and not over daily limit)
    if (this.settings.useElevenLabs && this.settings.apiKey && this.usage.dailyUsage + characterCount <= this.settings.dailyLimit) {
      const success = await this.speakWithElevenLabs(text)
      if (success) {
        this.updateUsage(characterCount, estimatedCost)
        return true
      }
    }

    // Try OpenAI TTS as fallback if enabled and configured
    if (this.settings.useOpenAI && this.settings.openaiApiKey) {
      const openaiCost = this.calculateOpenAICost(characterCount)
      const success = await this.speakWithOpenAI(text)
      if (success) {
        this.updateUsage(characterCount, openaiCost)
        return true
      }
    }

    // If both APIs fail, try browser TTS as final fallback
    if (this.isBrowserTTSAvailable()) {
      return this.speakWithBrowserTTS(text)
    }

    return false
  }

  // New method to speak with delay for Nigerian food messages
  async speakWithDelay(text: string, delayMs: number = 2000): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(async () => {
        const result = await this.speak(text)
        resolve(result)
      }, delayMs)
    })
  }

  private async speakWithElevenLabs(text: string): Promise<boolean> {
    try {
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${this.settings.selectedVoice}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.settings.apiKey
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.5
          }
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`)
      }

      const audioBlob = await response.blob()
      
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      
      // Store current audio for stop functionality
      this.currentAudio = audio
      
      return new Promise((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl)
          this.currentAudio = null
          resolve(true)
        }
        audio.onerror = (e) => {
          URL.revokeObjectURL(audioUrl)
          this.currentAudio = null
          resolve(false)
        }
        audio.play()
      })
    } catch (error) {
      console.error('ElevenLabs TTS error:', error)
      return false
    }
  }

  private async speakWithOpenAI(text: string): Promise<boolean> {
    try {
      
      const response = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.settings.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: this.settings.openaiVoice,
          response_format: 'mp3'
        })
      })

      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('OpenAI API error response:', errorText)
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
      }

      const audioBlob = await response.blob()
      
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      
      // Store current audio for stop functionality
      this.currentAudio = audio
      
      return new Promise((resolve) => {
        audio.onended = () => {
          URL.revokeObjectURL(audioUrl)
          this.currentAudio = null
          resolve(true)
        }
        audio.onerror = (e) => {
          URL.revokeObjectURL(audioUrl)
          this.currentAudio = null
          resolve(false)
        }
        audio.play()
      })
    } catch (error) {
      console.error('OpenAI TTS error:', error)
      return false
    }
  }


  private calculateCost(characterCount: number): number {
    const voice = ELEVENLABS_VOICES.find(v => v.id === this.settings.selectedVoice)
    if (!voice) return 0
    return (characterCount / 1000) * voice.costPer1K
  }

  private calculateOpenAICost(characterCount: number): number {
    const voice = OPENAI_VOICES.find(v => v.id === this.settings.openaiVoice)
    if (!voice) return 0
    return (characterCount / 1000) * voice.costPer1K
  }

  private updateUsage(characterCount: number, cost: number) {
    this.usage.totalCharacters += characterCount
    this.usage.totalCost += cost
    this.usage.dailyUsage += characterCount
    this.usage.dailyCost += cost
    this.saveUsage()
  }

  stop() {
    
    // Stop current audio if playing
    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio.currentTime = 0
      this.currentAudio = null
    }
    
    // Stop current browser TTS utterance if speaking
    if (this.currentUtterance) {
      speechSynthesis.cancel()
      this.currentUtterance = null
    }
    
    // Cancel any ongoing speech synthesis
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
    }
  }

  isPlaying(): boolean {
    // Check if audio is playing
    if (this.currentAudio && !this.currentAudio.paused && !this.currentAudio.ended) {
      return true
    }
    
    // Check if browser TTS is speaking
    if ('speechSynthesis' in window && speechSynthesis.speaking) {
      return true
    }
    
    return false
  }

  getAvailableVoices(): TTSVoice[] {
    return ELEVENLABS_VOICES
  }

  getAvailableOpenAIVoices(): TTSVoice[] {
    return OPENAI_VOICES
  }

  resetDailyUsage() {
    this.usage.dailyUsage = 0
    this.usage.dailyCost = 0
    this.usage.lastResetDate = new Date().toISOString().split('T')[0]
    this.saveUsage()
  }

  // Force refresh settings from environment variables
  refreshSettings() {
    this.settings = this.loadSettings()
  }

  // Clear all settings and reload from environment
  resetToDefaults() {
    try {
      localStorage.removeItem('tts-settings')
    } catch (error) {
      console.error('Error clearing settings:', error)
    }
    this.settings = this.loadSettings()
  }

  // Browser TTS fallback methods
  private isBrowserTTSAvailable(): boolean {
    return 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
  }

  private async speakWithBrowserTTS(text: string): Promise<boolean> {
    if (!this.isBrowserTTSAvailable()) {
      return false
    }

    return new Promise((resolve) => {
      try {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 0.9
        utterance.pitch = 1
        utterance.volume = 0.8

        // Store current utterance for stop functionality
        this.currentUtterance = utterance

        utterance.onend = () => {
          this.currentUtterance = null
          resolve(true)
        }

        utterance.onerror = (event) => {
          console.error('Browser TTS error:', event.error)
          this.currentUtterance = null
          resolve(false)
        }

        speechSynthesis.speak(utterance)
      } catch (error) {
        console.error('Browser TTS failed:', error)
        this.currentUtterance = null
        resolve(false)
      }
    })
  }

  // Test OpenAI connection directly
  async testOpenAI(): Promise<boolean> {
    
    if (!this.settings.openaiApiKey) {
      console.error('No OpenAI API key found')
      return false
    }

    try {
      const success = await this.speakWithOpenAI('Test message')
      return success
    } catch (error) {
      return false
    }
  }

  // Test browser TTS
  async testBrowserTTS(): Promise<boolean> {
    return this.speakWithBrowserTTS('Test message')
  }
}

export const ttsService = new TTSService()
