const BASE = 'https://flood-guard-three.vercel.app/api';

export async function fetchOpenWeather(lat, lon){
  try {
    const r = await fetch(`${BASE}/weather/openweather?lat=${lat}&lon=${lon}`);
    
    if (!r.ok) {
        throw new Error(`Backend Error: ${r.status} ${r.statusText}`);
    }
    
    return await r.json();
  } catch (err) {
    console.error("Gagal Fetch API:", err);
    throw err;
  }
}

export async function runPredict(latestWeather){
  try {
    const oneStep = {
      rainfall: latestWeather.rain || 0,
      temp: latestWeather.temp,
      humidity: latestWeather.humidity,
      pressure: latestWeather.pressure || 1010 
    };

    const fiveSteps = Array(5).fill(oneStep);

    const payload = {
      features: [fiveSteps]
    };

    const r = await fetch(`${BASE}/predict/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
        console.warn("Backend Predict Error:", r.status);
        return { result: 0, category: "Error", probability: 0 };
    }

    return await r.json();

  } catch (err) {
    console.error("Gagal Predict:", err);
    return { result: 0, category: "Offline", probability: 0 };
  }
}