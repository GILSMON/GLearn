import axios from 'axios'

/**
 * Pre-configured axios instance.
 * All API calls use this — so changing the base URL is a one-line fix.
 */
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8005',
})

export default API
