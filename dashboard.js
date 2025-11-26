// Pastikan URL ini sesuai dengan URL API Django REST Framework Anda
const API_BASE_URL = 'http://127.0.0.1:8000/api/';
const accessToken = localStorage.getItem('accessToken');

// Redirect ke halaman login jika token tidak ditemukan
if (!accessToken) {
    alert('Anda belum login. Silakan login terlebih dahulu.');
    // Arahkan ke halaman login Anda, misalnya 'index.html' atau 'login.html'
    window.location.href = 'login.html'; 
}

const messageArea = document.getElementById('message-area');
const dataModal = document.getElementById('dataModal');
const modalTitle = document.getElementById('modal-title');
const dataForm = document.getElementById('dataForm');
const modalSubmitButton = document.getElementById('modal-submit-button');

let currentModel = ''; // Menyimpan model yang sedang aktif (pasien, dokter, obat, resep)
let currentRecordId = null; // Menyimpan ID record jika dalam mode edit

// --- Fungsi Utilitas ---
async function fetchAuthenticated(url, options = {}) {
    if (!options.headers) {
        options.headers = {};
    }
    // Menggunakan skema otentikasi 'Token' yang sesuai dengan obtain_auth_token dari DRF
    options.headers['Authorization'] = `Token ${accessToken}`;
    options.headers['Content-Type'] = 'application/json';

    try {
        const response = await fetch(url, options);
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { detail: `HTTP error! status: ${response.status}` };
            }
            // Mengambil pesan error dari backend, jika ada
            const errorMessage = errorData.detail || Object.values(errorData).join(', ');
            throw new Error(errorMessage);
        }
        // Handle DELETE requests which might not return JSON content
        if (response.status === 204 || options.method === 'DELETE') {
            return {}; // Return empty object for successful delete
        }
        return response.json();
    } catch (error) {
        console.error('Fetch error:', error);
        showError(`Terjadi kesalahan: ${error.message}`);
        throw error; // Re-throw untuk penanganan error spesifik jika diperlukan
    }
}

function showMessage(message, type) {
    messageArea.textContent = message;
    messageArea.className = `message-area ${type}`;
    messageArea.style.display = 'block';
    setTimeout(() => {
        messageArea.style.display = 'none';
    }, 5000); // Sembunyikan pesan setelah 5 detik
}

function showError(message) {
    showMessage(message, 'error');
}

function showSuccess(message) {
    showMessage(message, 'success');
}

function setActiveTab(tabId) {
    // Atur model saat ini berdasarkan tab yang diaktifkan
    currentModel = tabId;

    // Nonaktifkan semua tab dan konten
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Aktifkan tab dan konten yang sesuai
    const activeButton = document.querySelector(`.tab-button[data-tab="${tabId}"]`);
    if (activeButton) {
        activeButton.classList.add('active');
    }
    const activeContent = document.getElementById(`${tabId}-tab`);
    if (activeContent) {
        activeContent.classList.add('active');
    }

    // Muat data untuk tab yang aktif
    if (tabId === 'pasien') loadPasien();
    else if (tabId === 'dokter') loadDokter();
    else if (tabId === 'obat') loadObat();
    else if (tabId === 'resep') loadResep();
}

// --- Logika Pergantian Tab ---
document.querySelectorAll('.tab-button').forEach(button => {
    button.addEventListener('click', () => {
        const tabId = button.dataset.tab;
        setActiveTab(tabId);
    });
});

// --- Fungsi Modal (Tambah/Edit) ---
async function openModal(model, recordId = null) {
    currentModel = model;
    currentRecordId = recordId;
    dataForm.innerHTML = ''; // Bersihkan field form sebelumnya
    
    // Sisipkan kembali tombol submit ke dalam form
    dataForm.appendChild(modalSubmitButton);

    modalSubmitButton.textContent = recordId ? 'Simpan Perubahan' : 'Tambah Data';
    modalSubmitButton.onclick = (event) => {
        event.preventDefault(); // Mencegah reload halaman
        saveData();
    };

    let fields = [];
    switch (model) {
        case 'pasien':
            modalTitle.textContent = recordId ? 'Edit Pasien' : 'Tambah Pasien';
            fields = [
                { name: 'nama', label: 'Nama', type: 'text', required: true },
                { name: 'umur', label: 'Umur', type: 'number', required: true },
                { name: 'alamat', label: 'Alamat', type: 'textarea', required: true },
                { name: 'nomor_telepon', label: 'Nomor Telepon', type: 'text', required: true },
                { name: 'tanggal_lahir', label: 'Tanggal Lahir', type: 'date', required: true },
            ];
            break;
        case 'dokter':
            modalTitle.textContent = recordId ? 'Edit Dokter' : 'Tambah Dokter';
            fields = [
                { name: 'nama', label: 'Nama', type: 'text', required: true },
                { name: 'spesialisasi', label: 'Spesialisasi', type: 'text', required: true },
            ];
            break;
        case 'obat':
            modalTitle.textContent = recordId ? 'Edit Obat' : 'Tambah Obat';
            fields = [
                { name: 'nama', label: 'Nama', type: 'text', required: true },
                { name: 'deskripsi', label: 'Deskripsi', type: 'textarea', required: true },
                { name: 'stok', label: 'Stok', type: 'number', required: true },
            ];
            break;
        case 'resep':
            modalTitle.textContent = recordId ? 'Edit Resep' : 'Tambah Resep';
            fields = [
                { name: 'pasien', label: 'Pasien', type: 'select', required: true, options: [] },
                { name: 'dokter', label: 'Dokter', type: 'select', required: true, options: [] },
                { name: 'obat', label: 'Obat', type: 'select', required: true, options: [] },
                { name: 'dosis', label: 'Dosis', type: 'text', required: true },
                { name: 'tanggal_resep', label: 'Tanggal Resep', type: 'date', required: true },
            ];
            break;
    }

    // Buat field form secara dinamis
    for (const field of fields) {
        const div = document.createElement('div');
        const label = document.createElement('label');
        label.textContent = field.label;
        label.setAttribute('for', field.name);
        div.appendChild(label);

        let input;
        if (field.type === 'textarea') {
            input = document.createElement('textarea');
        } else if (field.type === 'select') {
            input = document.createElement('select');
            input.innerHTML = '<option value="">Pilih...</option>'; // Opsi default kosong
            // Muat opsi untuk select (khusus Resep)
            let apiUrl = '';
            let displayField = '';
            if (field.name === 'pasien') {
                apiUrl = `${API_BASE_URL}pasien/`;
                displayField = 'nama';
            } else if (field.name === 'dokter') {
                apiUrl = `${API_BASE_URL}dokter/`;
                displayField = 'nama';
            } else if (field.name === 'obat') {
                apiUrl = `${API_BASE_URL}obat/`;
                displayField = 'nama';
            }
            if (apiUrl) {
                try {
                    const data = await fetchAuthenticated(apiUrl);
                    data.forEach(item => {
                        const option = document.createElement('option');
                        option.value = item.id;
                        option.textContent = `${item[displayField]} (ID: ${item.id})`;
                        input.appendChild(option);
                    });
                } catch (error) {
                    console.error(`Error loading ${field.name} options:`, error);
                    showError(`Gagal memuat opsi ${field.label}.`);
                }
            }
        } else {
            input = document.createElement('input');
            input.type = field.type;
        }
        input.id = field.name;
        input.name = field.name;
        if (field.required) {
            input.required = true;
        }
        div.appendChild(input);
        dataForm.insertBefore(div, modalSubmitButton); // Sisipkan sebelum tombol submit
    }

    // Jika dalam mode edit, muat data yang ada
    if (recordId) {
        try {
            const data = await fetchAuthenticated(`${API_BASE_URL}${model}/${recordId}/`);
            for (const key in data) {
                const inputField = document.getElementById(key);
                if (inputField) {
                    // Untuk select, perlu menunggu opsi dimuat
                    if (inputField.tagName === 'SELECT') {
                        // Beri sedikit waktu agar opsi dari fetch selesai dimuat
                        setTimeout(() => {
                            inputField.value = data[key];
                        }, 100);
                    } else {
                       inputField.value = data[key];
                    }
                }
            }
        } catch (error) {
            showError(`Gagal memuat data untuk edit: ${error.message}`);
            closeModal(); // Tutup modal jika gagal memuat data
        }
    }

    dataModal.style.display = 'flex'; // Gunakan flex untuk menengahkan modal
}

function closeModal() {
    dataModal.style.display = 'none';
    dataForm.reset(); // Reset form
    currentModel = '';
    currentRecordId = null;
}

async function saveData() {
    const formData = {};
    const inputs = dataForm.querySelectorAll('input, textarea, select');
    let isValid = true;
    inputs.forEach(input => {
        if (input.name) {
            if (input.required && !input.value) {
                isValid = false;
                input.style.borderColor = 'red'; // Tandai field yang kosong
            } else {
                input.style.borderColor = ''; // Hapus tanda
            }
            formData[input.name] = input.value;
        }
    });

    if (!isValid) {
        showError('Harap isi semua field yang wajib diisi.');
        return;
    }

    let url = `${API_BASE_URL}${currentModel}/`;
    let method = 'POST';

    if (currentRecordId) {
        url += `${currentRecordId}/`;
        method = 'PUT'; // Gunakan PUT untuk update penuh
    }

    try {
        await fetchAuthenticated(url, {
            method: method,
            body: JSON.stringify(formData)
        });
        showSuccess(`Data ${currentModel} berhasil ${currentRecordId ? 'diperbarui' : 'ditambahkan'}.`);
        closeModal();
        // Atur tab yang sesuai menjadi aktif
        setActiveTab(currentModel);
    } catch (error) {
        showError(`Gagal menyimpan data ${currentModel}: ${error.message}`);
    }
}

async function deleteRecord(model, id) {
    if (!confirm(`Apakah Anda yakin ingin menghapus data ${model} ini (ID: ${id})?`)) {
        return;
    }

    try {
        await fetchAuthenticated(`${API_BASE_URL}${model}/${id}/`, {
            method: 'DELETE'
        });
        showSuccess(`Data ${model} berhasil dihapus.`);
        // Muat ulang data untuk tab yang aktif
        setActiveTab(currentModel);
    } catch (error) {
        showError(`Gagal menghapus data ${model}: ${error.message}`);
    }
}

// --- Fungsi Memuat dan Merender Data ---

async function loadPasien() {
    try {
        const pasienData = await fetchAuthenticated(`${API_BASE_URL}pasien/`);
        renderPasienTable(pasienData);
    } catch (error) {
        // Error sudah ditangani oleh fetchAuthenticated
        document.getElementById('pasien-table-body').innerHTML = `<tr><td colspan="7" style="text-align:center;">Gagal memuat data pasien.</td></tr>`;
    }
}

function renderPasienTable(pasien) {
    const tbody = document.getElementById('pasien-table-body');
    tbody.innerHTML = ''; // Bersihkan tabel
    if (!pasien || pasien.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Tidak ada data pasien.</td></tr>`;
        return;
    }
    pasien.forEach(p => {
        const row = tbody.insertRow();
        row.insertCell().textContent = p.id;
        row.insertCell().textContent = p.nama;
        row.insertCell().textContent = p.umur;
        row.insertCell().textContent = p.alamat;
        row.insertCell().textContent = p.nomor_telepon;
        row.insertCell().textContent = p.tanggal_lahir;
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <button class="btn-edit" onclick="openModal('pasien', ${p.id})">Edit</button>
            <button class="btn-delete" onclick="deleteRecord('pasien', ${p.id})">Hapus</button>
        `;
    });
}

async function loadDokter() {
    try {
        const dokterData = await fetchAuthenticated(`${API_BASE_URL}dokter/`);
        renderDokterTable(dokterData);
    } catch (error) {
        document.getElementById('dokter-table-body').innerHTML = `<tr><td colspan="4" style="text-align:center;">Gagal memuat data dokter.</td></tr>`;
    }
}

function renderDokterTable(dokter) {
    const tbody = document.getElementById('dokter-table-body');
    tbody.innerHTML = '';
    if (!dokter || dokter.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center;">Tidak ada data dokter.</td></tr>`;
        return;
    }
    dokter.forEach(d => {
        const row = tbody.insertRow();
        row.insertCell().textContent = d.id;
        row.insertCell().textContent = d.nama;
        row.insertCell().textContent = d.spesialisasi;
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <button class="btn-edit" onclick="openModal('dokter', ${d.id})">Edit</button>
            <button class="btn-delete" onclick="deleteRecord('dokter', ${d.id})">Hapus</button>
        `;
    });
}

async function loadObat() {
    try {
        const obatData = await fetchAuthenticated(`${API_BASE_URL}obat/`);
        renderObatTable(obatData);
    } catch (error) {
        document.getElementById('obat-table-body').innerHTML = `<tr><td colspan="5" style="text-align:center;">Gagal memuat data obat.</td></tr>`;
    }
}

function renderObatTable(obat) {
    const tbody = document.getElementById('obat-table-body');
    tbody.innerHTML = '';
    if (!obat || obat.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;">Tidak ada data obat.</td></tr>`;
        return;
    }
    obat.forEach(o => {
        const row = tbody.insertRow();
        row.insertCell().textContent = o.id;
        row.insertCell().textContent = o.nama;
        row.insertCell().textContent = o.deskripsi;
        row.insertCell().textContent = o.stok;
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <button class="btn-edit" onclick="openModal('obat', ${o.id})">Edit</button>
            <button class="btn-delete" onclick="deleteRecord('obat', ${o.id})">Hapus</button>
        `;
    });
}

async function loadResep() {
    try {
        // Ambil semua data terkait untuk menampilkan nama alih-alih ID
        const [resepData, pasienList, dokterList, obatList] = await Promise.all([
            fetchAuthenticated(`${API_BASE_URL}resep/`),
            fetchAuthenticated(`${API_BASE_URL}pasien/`),
            fetchAuthenticated(`${API_BASE_URL}dokter/`),
            fetchAuthenticated(`${API_BASE_URL}obat/`)
        ]);

        // Buat map untuk memetakan ID ke nama
        const pasienMap = new Map(pasienList.map(p => [p.id, p.nama]));
        const dokterMap = new Map(dokterList.map(d => [d.id, d.nama]));
        const obatMap = new Map(obatList.map(o => [o.id, o.nama]));

        renderResepTable(resepData, pasienMap, dokterMap, obatMap);
    } catch (error) {
        document.getElementById('resep-table-body').innerHTML = `<tr><td colspan="7" style="text-align:center;">Gagal memuat data resep.</td></tr>`;
    }
}

function renderResepTable(resep, pasienMap, dokterMap, obatMap) {
    const tbody = document.getElementById('resep-table-body');
    tbody.innerHTML = '';
    if (!resep || resep.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;">Tidak ada data resep.</td></tr>`;
        return;
    }
    resep.forEach(r => {
        const row = tbody.insertRow();
        row.insertCell().textContent = r.id;
        // Tampilkan nama atau ID jika nama tidak ditemukan
        row.insertCell().textContent = pasienMap.get(r.pasien) || `ID: ${r.pasien}`;
        row.insertCell().textContent = dokterMap.get(r.dokter) || `ID: ${r.dokter}`;
        row.insertCell().textContent = obatMap.get(r.obat) || `ID: ${r.obat}`;
        row.insertCell().textContent = r.dosis;
        row.insertCell().textContent = r.tanggal_resep;
        const actionsCell = row.insertCell();
        actionsCell.innerHTML = `
            <button class="btn-edit" onclick="openModal('resep', ${r.id})">Edit</button>
            <button class="btn-delete" onclick="deleteRecord('resep', ${r.id})">Hapus</button>
        `;
    });
}

// --- Pemuatan Awal ---
document.addEventListener('DOMContentLoaded', () => {
    // Muat data Pasien secara default saat halaman dimuat
    loadPasien();
});

// Tutup modal saat mengklik di luar area modal
window.onclick = function(event) {
    if (event.target == dataModal) {
        closeModal();
    }
}

// Tutup modal saat menekan tombol Escape
window.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});