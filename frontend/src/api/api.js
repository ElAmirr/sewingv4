import axios from "axios";

const baseURL =
  import.meta.env.VITE_API_BASE ||
  (window?.location?.hostname ? `${window.location.protocol}//${window.location.hostname}:5000` : "http://localhost:5000");

const api = axios.create({
  baseURL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

export { api };