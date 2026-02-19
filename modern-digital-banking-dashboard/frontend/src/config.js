// src/config.js

export const API_BASE_URL =
  process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

export const API_TIMEOUT = 15000;

const config = {
  API_BASE_URL,
  API_TIMEOUT,
};

export default config;
