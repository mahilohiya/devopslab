// api.js – All API calls to FastAPI backend

import axios from 'axios';

const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const BASE = isLocal
    ? 'http://localhost:8000/api'
    : 'https://devops-monitor-backend.onrender.com/api';

const api = axios.create({ baseURL: BASE, timeout: 10000 });

export const fetchSystemMetrics = () => api.get('/metrics/system').then(r => r.data);
export const fetchContainers = () => api.get('/metrics/containers').then(r => r.data);
export const startContainer = (name) => api.post(`/containers/${name}/start`).then(r => r.data);
export const stopContainer = (name) => api.post(`/containers/${name}/stop`).then(r => r.data);
export const deleteContainer = (name) => api.delete(`/containers/${name}`).then(r => r.data);
export const fetchMetricsHistory = (limit = 60) => api.get(`/metrics/history?limit=${limit}`).then(r => r.data);
export const fetchDeployments = () => api.get('/deployments').then(r => r.data);
export const addDeployment = (data) => api.post('/deployments', data).then(r => r.data);
export const fetchPrediction = (engine) => api.get(`/predict${engine ? `?engine=${engine}` : ''}`).then(r => r.data);
export const fetchPredHistory = () => api.get('/predictions/history').then(r => r.data);
export const fetchHealth = () => api.get('/health').then(r => r.data);
export const login = (username, password) => api.post('/login', { username, password }).then(r => r.data);
