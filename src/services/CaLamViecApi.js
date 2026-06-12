import axios from "axios";

const API_URL =
  "http://localhost:8080/api/ca-lam-viec";

export default {
  getAll() {
    return axios.get(API_URL);
  },

  getById(id) {
    return axios.get(`${API_URL}/${id}`);
  },

  create(data) {
    return axios.post(API_URL, data);
  },

  update(id, data) {
    return axios.put(`${API_URL}/${id}`, data);
  },

  doiTrangThai(id) {
    return axios.patch(
      `${API_URL}/${id}/doi-trang-thai`
    );
  },
};