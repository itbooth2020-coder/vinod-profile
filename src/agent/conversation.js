// One conversation for VINCE's two interfaces (CHAT-001): the text console in the page ("Ask VINCE
// (text)", PromptConsole.jsx) and the VINCE panel (VoiceAssistant.jsx). Both add their turns here and
// render the shared log in their own way, so a question asked in either shows in both, and a
// follow-up in one can refer to an answer given in the other.
//
// Turns: { id, role, content, via, pending, sig, sources, citations }
//   role     'user' | 'assistant': questions and answers, shared and sent to the agent as history;
//            'note': VINCE's own lines (introduction, tour stops, suggestions), shown only in his panel,
//            with speaker 'you' | 'vince'
//   via      'console' | 'vince': where the turn was asked, so only VINCE's own answers are spoken
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

// Whether an answer asked through the other interface is on its way: that interface's log doesn't
// announce it to screen readers, so it isn't read out twice.
export const pendingElsewhere = (list, via) => list.some((t) => t.pending && t.via !== via)
