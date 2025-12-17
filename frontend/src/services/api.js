// GANTI localhost MENJADI 127.0.0.1
// Ini lebih stabil di Windows agar backend terdeteksi
const BASE = 'http://127.0.0.1:8080/api'; 

export async function fetchOpenWeather(lat, lon){
  try {
    const r = await fetch(`${BASE}/weather/openweather?lat=${lat}&lon=${lon}`);
    if (!r.ok) throw new Error(`Backend Error: ${r.status}`);
    return r.json();
  } catch (err) {
    console.error("Gagal Fetch API:", err);
    throw err;
  }
}

/**
 * latestWeather = {
 *   rain, temp, humidity, pressure
 * }
 */
export async function runPredict(latestWeather){
  try {
    // 1️⃣ Bentuk 1 timestep
    const oneStep = {
      rainfall: latestWeather.rain || 0,
      temp: latestWeather.temp,
      humidity: latestWeather.humidity,
      pressure: latestWeather.pressure
    };

    // 2️⃣ Gandakan jadi 5 timestep (SEQ_LEN = 5)
    const fiveSteps = Array(5).fill(oneStep);

    // 3️⃣ Payload FINAL sesuai backend
    const payload = {
      features: [fiveSteps]
    };

    // 4️⃣ Kirim ke backend
    const r = await fetch(`${BASE}/predict/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    return await r.json();

  } catch (err) {
    console.error("Gagal Predict:", err);
    return { result: 0, category: "Error", probability: 0 };
  }
}
