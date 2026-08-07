import axios from "axios";

const API = axios.create({
  baseURL: "https://stats-jhin.onrender.com/api",
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const register = (username, password) =>
  API.post("/auth/register", { username, password });

export const login = (username, password) =>
  API.post("/auth/login", { username, password });

export const getMatches = () => API.get("/matches");
export const addMatch = (data) => API.post("/matches", data);
export const deleteMatch = (id) => API.delete(`/matches/${id}`);

export const getFavorites = () => API.get("/favorites");
export const toggleFavorite = (champion) =>
  API.post("/favorites/toggle", { champion });

export const getRiotAccount = (gameName, tagLine) =>
  API.get(`/riot/account/${gameName}/${tagLine}`);