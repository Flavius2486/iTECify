const BASE = 'http://localhost:3000/api'

function getToken() {
  return localStorage.getItem('token')
}

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...options.headers,
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Request failed')
  return data
}

export const api = {
  login: (identifier, password) =>
    request('/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }),

  register: (email, username, password) =>
    request('/register', { method: 'POST', body: JSON.stringify({ email, username, password }) }),

  getRooms: () => request('/rooms'),

  createRoom: (name) =>
    request('/rooms', { method: 'POST', body: JSON.stringify({ name }) }),

  joinRoom: (joinCode) =>
    request('/rooms/join', { method: 'POST', body: JSON.stringify({ joinCode }) }),

  deleteRoom: (roomId) =>
    request(`/rooms/${roomId}`, { method: 'DELETE' }),

  leaveRoom: (roomId) =>
    request(`/rooms/${roomId}/leave`, { method: 'POST' }),

  kickUser: (roomId, targetId) =>
    request(`/rooms/${roomId}/kick/${targetId}`, { method: 'POST' }),

  getFiles: (roomId) => request(`/rooms/${roomId}/code`),

  createFile: (roomId, name, content, language) =>
    request(`/rooms/${roomId}/code`, { method: 'POST', body: JSON.stringify({ name, content, language }) }),

  updateFile: (roomId, fileId, content, name, language, aiLines) =>
    request(`/rooms/${roomId}/code/${fileId}`, { method: 'PUT', body: JSON.stringify({ content, name, language, ai_lines: aiLines }) }),

  deleteFile: (roomId, fileId) =>
    request(`/rooms/${roomId}/code/${fileId}`, { method: 'DELETE' }),

  getMessages: (roomId) => request(`/rooms/${roomId}/messages`),

  sendMessage: (roomId, content) =>
    request(`/rooms/${roomId}/messages`, { method: 'POST', body: JSON.stringify({ content }) }),

  getParticipants: (roomId) => request(`/rooms/${roomId}/participants`),

  getUsers: (ids) =>
    request(`/users?ids=${ids.join(',')}`),
}
