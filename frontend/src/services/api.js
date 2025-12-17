const BASE = 'https://vercel.com/nabilmghifari26-8173s-projects/flood-guard/4vV2r2P6oZcuaVNaFK8THkC1bYaY/api'; // <--- GANTI INI DENGAN LINK VERCEL BACKEND KAMU

// ============================================================================

export async function fetchOpenWeather(lat, lon){
  try {
    // Mengambil data cuaca dari backend kita
    const r = await fetch(`${BASE}/weather/openweather?lat=${lat}&lon=${lon}`);
    
    if (!r.ok) {
        throw new Error(`Backend Error: ${r.status} ${r.statusText}`);
    }
    
    return await r.json();
  } catch (err) {
    console.error("Gagal Fetch API:", err);
    // Kembalikan null atau throw error agar Frontend tau ada masalah
    throw err;
  }
}

/**
 * Fungsi untuk mengirim data cuaca ke AI Backend untuk prediksi banjir
 * latestWeather = { rain, temp, humidity, pressure }
 */
export async function runPredict(latestWeather){
  try {
    // 1️⃣ Bentuk 1 timestep data
    const oneStep = {
      rainfall: latestWeather.rain || 0,
      temp: latestWeather.temp,
      humidity: latestWeather.humidity,
      pressure: latestWeather.pressure || 1010 // Default pressure jika kosong
    };

    // 2️⃣ Gandakan jadi 5 timestep (Karena AI butuh input SEQ_LEN = 5)
    // Di masa depan, ini bisa diganti dengan data historis 5 jam terakhir
    const fiveSteps = Array(5).fill(oneStep);

    // 3️⃣ Bungkus sesuai format yang diminta Backend Python
    const payload = {
      features: [fiveSteps]
    };

    // 4️⃣ Kirim ke backend (Endpoint prediksi)
    const r = await fetch(`${BASE}/predict/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
        // Jika backend error, kita return default aman
        console.warn("Backend Predict Error:", r.status);
        return { result: 0, category: "Error", probability: 0 };
    }

    return await r.json();

  } catch (err) {
    console.error("Gagal Predict:", err);
    // Return nilai default agar aplikasi tidak crash
    return { result: 0, category: "Offline", probability: 0 };
  }
}