// Generează o culoare deterministă bazată pe user_id
// Același id = aceeași culoare mereu
const COLORS = [
  '#4ec9b0', '#569cd6', '#ce9178', '#dcdcaa',
  '#c586c0', '#9cdcfe', '#f48771', '#4CAF50',
  '#e5c07b', '#61afef', '#98c379', '#e06c75',
]

export function getUserColor(userId) {
  if (!userId) return '#888'
  let hash = 0
  for (let i = 0; i < userId.length; i++) {
    hash = userId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return COLORS[Math.abs(hash) % COLORS.length]
}
