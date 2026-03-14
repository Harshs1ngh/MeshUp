import axios from "axios";

const api = axios.create({
  baseURL: "https://meshup-z0g6.onrender.com/",
  withCredentials: true,
});


export default api;