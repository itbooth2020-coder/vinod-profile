// VINCE's conversation (CHAT-001), kept outside the panel (VoiceAssistant.jsx), so it survives the
// panel being remounted after an error, and follow-ups can refer to earlier answers.
//
// Turns: { id, role, content, pending, sig, sources, citations }
//   role     'user' | 'assistant': questions and answers, sent to the agent as history;
//            'note': VINCE's own lines (introduction, tour stops, suggestions), with speaker 'you' | 'vince'
//   pending  the answer is still on its way
// React components read it with useSyncExternalStore(subscribe, getTurns).

let turns = []
let nextId = 1
const listeners = new Set()
const emit = () => listeners.forEach((fn) => fn())

export const getTurns = () => turns

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// Adds a turn and returns its id.
export function append(turn) {
  const id = nextId++
  turns = [...turns, { id, ...turn }]
  emit()
  return id
}

// patch: an object, or a function of the turn returning one.
export function update(id, patch) {
  turns = turns.map((t) => (t.id === id ? { ...t, ...(typeof patch === 'function' ? patch(t) : patch) } : t))
  emit()
}

// The finished questions and answers, oldest first, as the agent's history (askAgent.js).
export const history = (limit = 10) =>
  turns
    .filter((t) => (t.role === 'user' || t.role === 'assistant') && !t.pending && t.content)
    .slice(-limit)
    .map(({ role, content, sig }) => ({ role, content, sig }))