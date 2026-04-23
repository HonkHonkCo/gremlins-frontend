import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const api = axios.create({ baseURL: BASE_URL })

export const syncUser = (telegram_id, username) =>
  api.post('/users/sync', { telegram_id, username }).then(r => r.data)

export const getGremlins = (user_id) =>
  api.get(`/gremlins?user_id=${user_id}`).then(r => r.data)

export const createGremlin = (data) =>
  api.post('/gremlins', data).then(r => r.data)

export const deleteGremlin = (id) =>
  api.delete(`/gremlins/${id}`).then(r => r.data)

export const getEntries = (gremlin_id) =>
  api.get(`/entries?gremlin_id=${gremlin_id}`).then(r => r.data)

export const sendChat = (user_id, gremlin_id, text) =>
  api.post('/entries/chat', { gremlin_id, content: text }).then(r => r.data)

export const getWeeklyReport = (user_id) =>
  api.get(`/reports/weekly?user_id=${user_id}`).then(r => r.data)
