import axios from 'axios'

/**
 * Pre-configured axios instance.
 * VITE_API_URL is set via GitHub secrets for production builds.
 */
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8005',
})

export default API
