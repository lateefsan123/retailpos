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
  fallbackToBrowser: boolean
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
    const envApiKey = import.meta.env.VITE_ELEVENLABS_KEY || 'sk_337a097ef281682961b7c3db26217470f085fd565c3d711d'
    
    const defaultSettings: TTSSettings = {
      enabled: false,
      useElevenLabs: true,
      selectedVoice: 'HobRzuqtLputbKAXOdTj', // Custom voice specified by user
      apiKey: envApiKey,
      dailyLimit: 5000, // 5K characters per day (ElevenLabs is more expensive)
      fallbackToBrowser: true
    }

    // Clear old OpenAI settings and force ElevenLabs
    try {
      localStorage.removeItem('tts-settings')
      console.log('Cleared old TTS settings, using ElevenLabs defaults')
      return defaultSettings
    } catch {
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
    
    if (!this.settings.enabled) {
      console.log('TTS not enabled')
      return false
    }

    const characterCount = text.length
    const estimatedCost = this.calculateCost(characterCount)

    // Check daily limit
    if (this.usage.dailyUsage + characterCount > this.settings.dailyLimit) {
      console.log('Daily limit exceeded, using fallback')
      if (this.settings.fallbackToBrowser) {
        return this.speakWithBrowser(text)
      }
      return false
    }

    // Try ElevenLabs TTS first if enabled and configured
    if (this.settings.useElevenLabs && this.settings.apiKey) {
      console.log('Trying ElevenLabs TTS with voice:', this.settings.selectedVoice)
      const success = await this.speakWithElevenLabs(text)
      if (success) {
        this.updateUsage(characterCount, estimatedCost)
        return true
      }
    }

    // Fallback to browser TTS
    if (this.settings.fallbackToBrowser) {
      console.log('Falling back to browser TTS')
      return this.speakWithBrowser(text)
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

  private speakWithBrowser(text: string): boolean {
    if (!('speechSynthesis' in window)) {
      return false
    }

    try {
      speechSynthesis.cancel()
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.volume = 0.8
      
      speechSynthesis.speak(utterance)
      return true
    } catch (error) {
      return false
    }
  }

  private calculateCost(characterCount: number): number {
    const voice = ELEVENLABS_VOICES.find(v => v.id === this.settings.selectedVoice)
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
    if ('speechSynthesis' in window) {
      speechSynthesis.cancel()
    }
  }

  getAvailableVoices(): TTSVoice[] {
    return ELEVENLABS_VOICES
  }

  resetDailyUsage() {
    this.usage.dailyUsage = 0
    this.usage.dailyCost = 0
    this.usage.lastResetDate = new Date().toISOString().split('T')[0]
    this.saveUsage()
  }
}

export const ttsService = new TTSService()
