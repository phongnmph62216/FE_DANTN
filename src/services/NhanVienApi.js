import api from "./api";
import axios from "axios";
import { ref, onMounted } from "vue";


const luuNhanVien = async () => {
  try {
    await axios.post(
      'http://localhost:8080/api/nhan_vien',
      form
    )

    router.push('/nhan-vien')
  } catch (error) {
    console.error(error)
  }
}


const tinhThanhList = ref([]);
const phuongXaList = ref([]);

const selectedTinh = ref("");
const selectedPhuong = ref("");



export default {

    getAll() {
        return api.get("/api/nhan_vien");
    },

    getById(id) {
        return api.get(`/api/nhan_vien/${id}`);
    },

    create(data) {
        return api.post("/api/nhan_vien", data);
    },

 

    update(id, data) {
        return api.put(`/api/nhan_vien/${id}`, data);
    },

    doiTrangThai(id) {
        return api.patch(`/api/nhan_vien/${id}/trang_thai`);
    }
}