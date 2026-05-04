import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'

const api = axios.create({ baseURL: BASE_URL })

export const syncUser = (telegram_id, username) =>
  api.post('/users/sync', { telegram_id, username }).then(r => r.data)

export const getGremlins = (user_id) =>
  api.get(`/gremlins?user_id=${user_id}`).then(r => r.data)

export const getGremlin = (id) =>
  api.get(`/gremlins/${id}`).then(r => r.data)

export const createGremlin = (data) =>
  api.post('/gremlins', data).then(r => r.data)

export const updateGremlin = (id, data) =>
  api.patch(`/gremlins/${id}`, data).then(r => r.data)

export const deleteGremlin = (id) =>
  api.delete(`/gremlins/${id}`).then(r => r.data)

export const getEntries = (gremlin_id) =>
  api.get(`/entries?gremlin_id=${gremlin_id}`).then(r => r.data)

export const sendChat = (user_id, gremlin_id, text, is_file = false, parsedTotals = null, fileName = null) =>
  api.post('/entries/chat', { gremlin_id, content: text, is_file, parsed_totals: parsedTotals, file_name: fileName }).then(r => r.data)
export const getWeeklyReport = (user_id) =>
  api.get(`/reports/weekly?user_id=${user_id}`).then(r => r.data)

export const getTransactions = (gremlin_id) =>
  api.get('/transactions?gremlin_id=' + gremlin_id).then(r => r.data)

export const addTransaction = (gremlin_id, data) =>
  api.post('/transactions', { gremlin_id, ...data }).then(r => r.data)

export const deleteTransaction = (id, gremlin_id) =>
  api.delete('/transactions/' + id, { data: { gremlin_id } }).then(r => r.data)

// Тренер
export const getWorkouts = (gremlin_id) =>
  api.get('/workouts?gremlin_id=' + gremlin_id).then(r => r.data)
export const addWorkout = (gremlin_id, data) =>
  api.post('/workouts', { gremlin_id, ...data }).then(r => r.data)
export const deleteWorkout = (id, gremlin_id) =>
  api.delete('/workouts/' + id, { data: { gremlin_id } }).then(r => r.data)

// Повар
export const getMeals = (gremlin_id) =>
  api.get('/meals?gremlin_id=' + gremlin_id).then(r => r.data)
export const addMeal = (gremlin_id, data) =>
  api.post('/meals', { gremlin_id, ...data }).then(r => r.data)
export const deleteMeal = (id, gremlin_id) =>
  api.delete('/meals/' + id, { data: { gremlin_id } }).then(r => r.data)

// Секретарь
export const getTasks = (gremlin_id) =>
  api.get('/tasks?gremlin_id=' + gremlin_id).then(r => r.data)
export const addTask = (gremlin_id, data) =>
  api.post('/tasks', { gremlin_id, ...data }).then(r => r.data)
export const updateTask = (id, data) =>
  api.patch('/tasks/' + id, data).then(r => r.data)
export const deleteTask = (id, gremlin_id) =>
  api.delete('/tasks/' + id, { data: { gremlin_id } }).then(r => r.data)
