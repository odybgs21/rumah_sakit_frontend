document.getElementById('loginForm').addEventListener('submit', async function(event) {
    // Mencegah form dari perilaku default (reload halaman)
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMessage = document.getElementById('error-message');

    // Sembunyikan pesan error sebelumnya
    errorMessage.style.display = 'none';

    try {
        // Menggunakan endpoint login obtain_auth_token dari Django REST Framework
        const response = await fetch('http://127.0.0.1:8000/api/auth/token/', { // URL ini sudah benar
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                username: username,
                password: password,
            })
        });

        if (response.ok) {
            // Jika login berhasil (status 200-299)
            const data = await response.json();
            // Simpan token ke localStorage. obtain_auth_token mengembalikan { "token": "..." }
            localStorage.setItem('accessToken', data.token);
            console.log('Login berhasil');
            // Arahkan ke halaman dashboard setelah login berhasil
            window.location.href = 'dashboard.html'; // Pastikan nama file ini benar
        } else {
            // Jika login gagal (misal: username/password salah)
            const data = await response.json();
            // Menampilkan pesan error yang lebih spesifik dari backend
            const errorText = (data.non_field_errors && data.non_field_errors[0]) || 'Username atau password salah.';
            errorMessage.textContent = errorText;
            errorMessage.style.display = 'block';
        }
    } catch (error) {
        // Jika ada error jaringan atau server tidak berjalan
        console.error('Error:', error);
        errorMessage.textContent = 'Tidak dapat terhubung ke server. Pastikan backend berjalan.';
        errorMessage.style.display = 'block';
    }
});