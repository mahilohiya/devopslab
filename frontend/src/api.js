// api.js – All API calls to FastAPI backend

import axios from 'axios';

const BASE = 'https://devops-monitor-backend.onrender.com/api';

const api = axios.create({ baseURL: BASE, timeout: 10000 });

export const fetchSystemMetrics = () => api.get('/metrics/system').then(r => r.data);
export const fetchContainers = () => api.get('/metrics/containers').then(r => r.data);
export const fetchMetricsHistory = (limit = 60) => api.get(`/metrics/history?limit=${limit}`).then(r => r.data);
export const fetchDeployments = () => api.get('/deployments').then(r => r.data);
export const addDeployment = (data) => api.post('/deployments', data).then(r => r.data);
export const fetchPrediction = () => api.get('/predict').then(r => r.data);
export const fetchPredHistory = () => api.get('/predictions/history').then(r => r.data);
export const fetchHealth = () => api.get('/health').then(r => r.data);
