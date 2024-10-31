// Fungsi-fungsi untuk halaman login
function initializeLoginPage() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

function handleLogin(event) {
    event.preventDefault();
    
    const namaGuru = document.getElementById('namaGuru').value.trim();
    const password = document.getElementById('password').value.trim();
    const jabatan = document.getElementById('jabatan').value;

    // Tambahkan pengecekan untuk admin
    if(jabatan === 'admin' && password === 'kepo123') {
    // Login sebagai admin
    } else if (jabatan !== 'admin' && password) {
    // Login sebagai guru biasa
    } else {
        showError('Password tidak valid');
        return;
    }

    if (!namaGuru || !password || !jabatan) {
        showError('Semua field harus diisi');
        return;
    }

    // Simpan sesi pengguna
    const sessionData = {
        nama: namaGuru,
        jabatan: jabatan,
        timestamp: new Date().getTime(),
        token: generateToken(namaGuru, jabatan)
    };

    sessionStorage.setItem('userSession', JSON.stringify(sessionData));
    window.location.href = 'dashboard.html';
}

function generateToken(username, role) {
    return btoa(`${username}:${role}:${Date.now()}`);
}

function showError(message) {
    const errorDiv = document.getElementById('loginError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
}

// Fungsi-fungsi untuk halaman dashboard
function initializeDashboardPage() {
    if (!verifySession()) {
        window.location.href = 'index.html';
        return;
    }

    setupFormListeners();
    setupAdminFeatures();
    setupLogout();
    updateWelcomeMessage();
}

function verifySession() {
    try {
        const session = JSON.parse(sessionStorage.getItem('userSession'));
        if (!session) return false;

        // Cek waktu kedaluwarsa (2 jam)
        const now = new Date().getTime();
        if (now - session.timestamp > 2 * 60 * 60 * 1000) {
            sessionStorage.clear();
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

function setupFormListeners() {
    const form = document.getElementById('formPenilaian');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
        
        const inputs = form.querySelectorAll('input[type="number"]');
        inputs.forEach(input => {
            input.addEventListener('input', function() {
                validateInput(this);
            });
        });
    }
}

function validateInput(input) {
    const value = parseInt(input.value);
    const validationMessage = input.nextElementSibling;
    
    if (isNaN(value) || value < 0 || value > 1000) {
        validationMessage.textContent = 'Nilai harus antara 0-1000';
        input.classList.add('invalid');
        return false;
    } else {
        validationMessage.textContent = '';
        input.classList.remove('invalid');
        return true;
    }
}

function handleFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const inputs = form.querySelectorAll('input[type="number"]');
    let isValid = true;
    
    inputs.forEach(input => {
        if (!validateInput(input)) {
            isValid = false;
        }
    });
    
    if (!isValid) {
        showMessage('error', 'Mohon periksa kembali input Anda');
        return;
    }

    const formData = {
        timestamp: new Date().toISOString(),
        guru: JSON.parse(sessionStorage.getItem('userSession')).nama,
        diknas: {
            membuatSoal: parseInt(form.diknasMembuatSoal.value),
            koreksi: parseInt(form.diknasKoreksi.value)
        },
        lokal: {
            membuatSoal: parseInt(form.lokalMembuatSoal.value),
            koreksi: parseInt(form.lokalKoreksi.value)
        },
        diniyah: {
            koreksi: parseInt(form.diniyahKoreksi.value),
            raport: parseInt(form.diniyahRaport.value)
        },
        lain: {
            editorSoal: parseInt(form.lainEditorSoal.value),
            raportWalas: parseInt(form.lainRaportWalas.value),
            mengawasUjian: parseInt(form.lainMengawasUjian.value)
        }
    };

    saveFormData(formData);
}

function saveFormData(formData) {
    try {
        let existingData = JSON.parse(localStorage.getItem('penilaianData')) || [];
        existingData.push(formData);
        localStorage.setItem('penilaianData', JSON.stringify(existingData));
        showMessage('success', 'Data berhasil disimpan');
        resetForm();
    } catch (error) {
        console.error('Error menyimpan data:', error);
        showMessage('error', 'Gagal menyimpan data');
    }
}

function setupAdminFeatures() {
    const session = JSON.parse(sessionStorage.getItem('userSession'));
    const adminSection = document.getElementById('adminSection');
    
    if (session?.jabatan === 'admin' && adminSection) {
        adminSection.style.display = 'block';
        
        document.getElementById('ambilDataButton')?.addEventListener('click', displayData);
        document.getElementById('exportExcel')?.addEventListener('click', exportToExcel);
        document.getElementById('deleteAllData')?.addEventListener('click', confirmDeleteAll);
    }
}

function displayData() {
    const tableBody = document.querySelector('#tableData tbody');
    if (!tableBody) return;

    try {
        const data = JSON.parse(localStorage.getItem('penilaianData')) || [];
        tableBody.innerHTML = '';

        data.forEach((entry, index) => {
            Object.entries(entry).forEach(([category, values]) => {
                if (category !== 'timestamp' && category !== 'guru') {
                    Object.entries(values).forEach(([subCategory, value]) => {
                        const row = document.createElement('tr');
                        row.innerHTML = `
                            <td>${new Date(entry.timestamp).toLocaleDateString('id-ID')}</td>
                            <td>${entry.guru}</td>
                            <td>${category} - ${subCategory}</td>
                            <td>${value}</td>
                            <td>
                                <button onclick="deleteEntry(${index})" class"btn-danger">Hapus</button>
                            </td>
                        `;
                        tableBody.appendChild(row);
                    });
                }
            });
        });

        document.getElementById('tableData').style.display = 'table';
    } catch (error) {
        console.error('Error menampilkan data:', error);
        showMessage('error', 'Gagal menampilkan data');
    }
}

function exportToExcel() {
    try {
        const data = JSON.parse(localStorage.getItem('penilaianData')) || [];
        if (data.length === 0) {
            showMessage('error', 'Tidak ada data untuk diekspor');
            return;
        }

        const ws = XLSX.utils.json_to_sheet(flattenData(data));
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Penilaian");
        XLSX.writeFile(wb, `Penilaian_${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch (error) {
        console.error('Error mengekspor data:', error);
        showMessage('error', 'Gagal mengekspor data');
    }
}

function flattenData(data) {
    return data.map(entry => ({
        Tanggal: new Date(entry.timestamp).toLocaleDateString('id-ID'),
        Guru: entry.guru,
        'Diknas - Membuat Soal': entry.diknas.membuatSoal,
        'Diknas - Koreksi': entry.diknas.koreksi,
        'Lokal - Membuat Soal': entry.lokal.membuatSoal,
        'Lokal - Koreksi': entry.lokal.koreksi,
        'Diniyah - Koreksi': entry.diniyah.koreksi,
        'Diniyah - Raport': entry.diniyah.raport,
        'Lain - Editor Soal': entry.lain.editorSoal,
        'Lain - Raport Walas': entry.lain.raportWalas,
        'Lain - Mengawas Ujian': entry.lain.mengawasUjian
    }));
}

function confirmDeleteAll() {
    if (confirm('Anda yakin ingin menghapus semua data?')) {
        localStorage.removeItem('penilaianData');
        showMessage('success', 'Semua data telah dihapus');
        displayData();
    }
}

function deleteEntry(index) {
    try {
        let data = JSON.parse(localStorage.getItem('penilaianData')) || [];
        data.splice(index, 1);
        localStorage.setItem('penilaianData', JSON.stringify(data));
        showMessage('success', 'Data berhasil dihapus');
        displayData();
    } catch (error) {
        console.error('Error menghapus data:', error);
        showMessage('error', 'Gagal menghapus data');
    }
}

function setupLogout() {
    document.getElementById('logoutBtn')?.addEventListener('click', () => {
        sessionStorage.clear();
        window.location.href = 'index.html';
    });
}

function updateWelcomeMessage() {
    const welcomeMessage = document.getElementById('welcomeMessage');
    const session = JSON.parse(sessionStorage.getItem('userSession'));
    if (welcomeMessage && session) {
        welcomeMessage.textContent = `Selamat datang, Bapak/Ibu ${session.nama}, silahkan mengisi`;
    }
}

function showMessage(type, message) {
    const messageElement = document.getElementById(`${type}Message`);
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.style.display = 'block';
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 3000);
    }
}

function resetForm() {
    const form = document.getElementById('formPenilaian');
    if (form) {
        form.reset();
        const validationMessages = form.querySelectorAll('.validation-message');
        validationMessages.forEach(msg => msg.textContent = '');
        const inputs = form.querySelectorAll('input');
        inputs.forEach(input => input.classList.remove('invalid'));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Memastikan session user tersedia
    const userSession = JSON.parse(sessionStorage.getItem('userSession'));
    
    if (userSession && userSession.jabatan) {
        // Menampilkan jabatan pengguna di elemen yang sesuai
        const jabatanElement = document.querySelector('.jabatan-badge');
        if (jabatanElement) {
            jabatanElement.textContent = userSession.jabatan; 
        }
    }
});

// Inisialisasi halaman yang sesuai
document.addEventListener('DOMContentLoaded', function() {
    if (document.getElementById('loginForm')) {
        initializeLoginPage();
    } else if (document.getElementById('formPenilaian')) {
        initializeDashboardPage();
    }
});