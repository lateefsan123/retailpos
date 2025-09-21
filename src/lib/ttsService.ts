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

  constructor() {
    this.settings = this.loadSettings()
    this.usage = this.loadUsage()
    this.initializeUsage()
  }

  private loadSettings(): TTSSettings {
    const envElevenLabsKey = import.meta.env.VITE_ELEVENLABS_KEY || 'sk_337a097ef281682961b7c3db26217470f085fd565c3d711d'
    const envOpenAIKey = import.meta.env.VITE_OPENAI_API_KEY || ''
    
    console.log('Environment variables loaded:')
    console.log('VITE_ELEVENLABS_KEY:', envElevenLabsKey ? 'Present' : 'Missing')
    console.log('VITE_OPENAI_API_KEY:', envOpenAIKey ? 'Present' : 'Missing')
    
    const defaultSettings: TTSSettings = {
      enabled: true, // Enable TTS by default
      useElevenLabs: true,
      selectedVoice: 'HobRzuqtLputbKAXOdTj', // Custom voice specified by user
      apiKey: envElevenLabsKey,
      dailyLimit: 5000, // 5K characters per day (ElevenLabs is more expensive)
      useOpenAI: true,
      openaiApiKey: envOpenAIKey,
      openaiVoice: 'alloy'
    }

    try {
      const saved = localStorage.getItem('tts-settings')
      if (saved) {
        const parsed = JSON.parse(saved)
        // Merge with defaults to ensure new fields are present
        const merged = { ...defaultSettings, ...parsed }
        console.log('Loaded TTS settings from localStorage:', merged)
        return merged
      }
      console.log('No saved TTS settings, using defaults:', defaultSettings)
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
    console.log('TTS Service speak called with:', text)
    console.log('TTS Settings:', this.settings)
    console.log('useElevenLabs:', this.settings.useElevenLabs)
    console.log('useOpenAI:', this.settings.useOpenAI)
    console.log('openaiApiKey present:', !!this.settings.openaiApiKey)
    console.log('openaiApiKey length:', this.settings.openaiApiKey?.length || 0)
    
    if (!this.settings.enabled) {
      console.log('TTS not enabled')
      return false
    }

    const characterCount = text.length
    const estimatedCost = this.calculateCost(characterCount)

    // Check daily limit
    if (this.usage.dailyUsage + characterCount > this.settings.dailyLimit) {
      console.log('Daily limit exceeded, trying OpenAI fallback')
      // Skip ElevenLabs and go directly to OpenAI
    }

    // Try ElevenLabs TTS first if enabled and configured (and not over daily limit)
    if (this.settings.useElevenLabs && this.settings.apiKey && this.usage.dailyUsage + characterCount <= this.settings.dailyLimit) {
      console.log('Trying ElevenLabs TTS with voice:', this.settings.selectedVoice)
      const success = await this.speakWithElevenLabs(text)
      if (success) {
        this.updateUsage(characterCount, estimatedCost)
        return true
      }
      console.log('ElevenLabs failed, trying OpenAI fallback...')
    }

    // Try OpenAI TTS as fallback if enabled and configured
    if (this.settings.useOpenAI && this.settings.openaiApiKey) {
      console.log('Trying OpenAI TTS with voice:', this.settings.openaiVoice)
      const openaiCost = this.calculateOpenAICost(characterCount)
      const success = await this.speakWithOpenAI(text)
      if (success) {
        this.updateUsage(characterCount, openaiCost)
        return true
      }
      console.log('OpenAI TTS failed')
    }

    console.log('No TTS method available')
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
      console.log('Making ElevenLabs API call...')
      console.log('Voice ID:', this.settings.selectedVoice)
      console.log('API Key:', this.settings.apiKey.substring(0, 10) + '...')
      
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

      console.log('ElevenLabs response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('ElevenLabs API error response:', errorText)
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`)
      }

      const audioBlob = await response.blob()
      console.log('Audio blob received, size:', audioBlob.size)
      
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      
      return new Promise((resolve) => {
        audio.onended = () => {
          console.log('ElevenLabs audio playback ended')
          URL.revokeObjectURL(audioUrl)
          resolve(true)
        }
        audio.onerror = (e) => {
          console.error('ElevenLabs audio playback error:', e)
          URL.revokeObjectURL(audioUrl)
          resolve(false)
        }
        audio.onloadstart = () => console.log('ElevenLabs audio started loading')
        audio.oncanplay = () => console.log('ElevenLabs audio can play')
        
        console.log('Starting ElevenLabs audio playback...')
        audio.play()
      })
    } catch (error) {
      console.error('ElevenLabs TTS error:', error)
      return false
    }
  }

  private async speakWithOpenAI(text: string): Promise<boolean> {
    try {
      console.log('Making OpenAI TTS API call...')
      console.log('Voice:', this.settings.openaiVoice)
      console.log('API Key:', this.settings.openaiApiKey.substring(0, 10) + '...')
      
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

      console.log('OpenAI response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('OpenAI API error response:', errorText)
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
      }

      const audioBlob = await response.blob()
      console.log('OpenAI audio blob received, size:', audioBlob.size)
      
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      
      return new Promise((resolve) => {
        audio.onended = () => {
          console.log('OpenAI audio playback ended')
          URL.revokeObjectURL(audioUrl)
          resolve(true)
        }
        audio.onerror = (e) => {
          console.error('OpenAI audio playback error:', e)
          URL.revokeObjectURL(audioUrl)
          resolve(false)
        }
        audio.onloadstart = () => console.log('OpenAI audio started loading')
        audio.oncanplay = () => console.log('OpenAI audio can play')
        
        console.log('Starting OpenAI audio playback...')
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
    // TTS service stop method - no browser TTS to stop
    console.log('TTS service stop called')
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
    console.log('Refreshing TTS settings from environment...')
    this.settings = this.loadSettings()
    console.log('New settings loaded:', this.settings)
  }

  // Clear all settings and reload from environment
  resetToDefaults() {
    console.log('Clearing all TTS settings and reloading from environment...')
    try {
      localStorage.removeItem('tts-settings')
      console.log('Cleared localStorage settings')
    } catch (error) {
      console.error('Error clearing settings:', error)
    }
    this.settings = this.loadSettings()
    console.log('Reset to defaults:', this.settings)
  }

  // Test OpenAI connection directly
  async testOpenAI(): Promise<boolean> {
    console.log('Testing OpenAI TTS connection...')
    console.log('OpenAI API Key present:', !!this.settings.openaiApiKey)
    console.log('OpenAI Voice:', this.settings.openaiVoice)
    
    if (!this.settings.openaiApiKey) {
      console.error('No OpenAI API key found')
      return false
    }

    try {
      const success = await this.speakWithOpenAI('Test message')
      console.log('OpenAI test result:', success)
      return success
    } catch (error) {
      console.error('OpenAI test failed:', error)
      return false
    }
  }
}

export const ttsService = new TTSService()
