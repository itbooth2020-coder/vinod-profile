// VINCE's voice (voice.js) as an optional chunk (FUNC-014): if it can't load, VINCE, the domain graph
// and the case studies carry on without speech instead of failing with it. Vince.jsx waits for
// loadVoice() before showing the panel; the graph and case studies start it when they load, so
// unlockSpeech() can run synchronously inside the visitor's tap.
import { importAgain } from '../importAgain.js'

const NO_VOICE = {
  canListen: false,
  canSpeak: false,
  listen: () => () => {},
  speak: (_text, { onEnd } = {}) => setTimeout(() => onEnd?.()),
  stopSpeaking: () => {},
  unlockSpeech: () => {},
  voiceName: () => '',
}

let mod = null
let loading = null

// Resolves with the voice module, or null if it couldn't load (a later call tries again).
export const loadVoice = () =>
  (loading ||= importAgain(() => import('./voice.js')).then(
    (m) => (mod = m),
    () => {
      loading = null
      return null
    },
  ))

// The voice module once loaded, else a silent stand-in (no speech, no listening).
export const voiceApi = () => mod || NO_VOICE
export const unlockSpeech = () => mod?.unlockSpeech()
