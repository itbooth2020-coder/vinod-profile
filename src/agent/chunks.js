// Splits speech into the pieces the server voice generates one at a time. Shared by the browser
// (src/agent/voice.js) and the server (server/voiceAgent.js), so lines the server prepares in
// advance match what the browser asks for.
//
// One sentence per piece, split again after a colon ("You might ask:" / the question), and a
// short first piece (the first clause of a long first sentence), so VINCE starts talking quickly
// and each later piece is generated while the one before plays.
const FIRST_MAX = 60

export function speechChunks(text) {
  const parts = (text.match(/[^.!?]+[.!?]+["”']?|[^.!?]+$/g) || [text])
    .flatMap((s) => s.split(/(?<=:)\s+/))
    .map((s) => s.trim())
    .filter(Boolean)
  const first = parts[0]
  if (first && first.length > FIRST_MAX) {
    const cut = first.search(/[,;]\s/)
    if (cut > 8) parts.splice(0, 1, first.slice(0, cut + 1), first.slice(cut + 2).trim())
  }
  return parts
}
