require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const app = express();
const PORT = 8080;

// === KONFIGURASI ===
let API_KEY = "290a92668f1df6af52967bda525df2fc"; 
API_KEY = API_KEY.trim(); 

// URL Server AI Python
const PYTHON_AI_URL = 'http://127.0.0.1:5000/predict';

// URL BMKG PROVINSI DKI JAKARTA (ADM1 = 31)
const BMKG_JAKARTA_URL = "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm1=31";

app.use(cors());
app.use(express.json());

function mapBMKGtoPOP(desc) {
  if (!desc) return 0;
  const d = desc.toLowerCase();

  if (d.includes('petir') || d.includes('badai') || d.includes('ekstrem')) return 95;
  if (d.includes('lebat')) return 85;
  if (d.includes('sedang')) return 65; 
  if (d.includes('ringan') || d.includes('hujan')) return 40;
  if (d.includes('berawan') || d.includes('mendung')) return 20;
  if (d.includes('cerah') || d.includes('panas')) return 5;
  
  return 10;
}

async function fetchClosestBMKGData(userLat, userLon) {
    try {
        console.log("📡 [BMKG] Request ke API Provinsi Jakarta...");
        
        // 1. Ambil Data Satu Provinsi
        const response = await axios.get(BMKG_JAKARTA_URL);
        const dataWilayah = response.data.data; 

        if (!dataWilayah || dataWilayah.length === 0) {
            throw new Error("Data BMKG Kosong");
        }

        // 2. Algoritma Pencari Jarak Terdekat (Nearest Neighbor)
        let closestArea = null;
        let minDistance = Infinity;

        dataWilayah.forEach(area => {
            if (area.lat && area.lon) {
                const dist = Math.sqrt(
                    Math.pow(parseFloat(area.lat) - parseFloat(userLat), 2) + 
                    Math.pow(parseFloat(area.lon) - parseFloat(userLon), 2)
                );

                if (dist < minDistance) {
                    minDistance = dist;
                    closestArea = area;
                }
            }
        });

        // 3. Ambil Data Cuaca dari Lokasi Terdekat
        if (closestArea && closestArea.cuaca) {
            const cuacaTerkini = closestArea.cuaca.flat()[0];
            
            const deskripsi = cuacaTerkini.weather_desc || "Cerah Berawan";
            const lokasiName = closestArea.lokasi?.kotakab || closestArea.lokasi?.kecamatan || "Jakarta";

            console.log(`📍 [BMKG FOUND] Paling dekat: ${lokasiName} (Jarak: ${(minDistance*111).toFixed(2)} km)`);
            console.log(`   Cuaca: ${deskripsi}`);

            return {
                cuaca: deskripsi,
                lokasi_bmkg: lokasiName
            };
        }

        throw new Error("Format data area tidak sesuai.");

    } catch (error) {
        console.error("⚠️ [BMKG ERROR]", error.message);
        return { cuaca: "Cerah Berawan", lokasi_bmkg: "Offline" };
    }
}

app.get('/api/weather/openweather', async (req, res) => {
  try {
    const lat = req.query.lat || "-6.2088";
    const lon = req.query.lon || "106.8456";

    // 1. Ambil Data OpenWeather (Global)
    const currentRes = await axios.get(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
    const forecastRes = await axios.get(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);

    // 2. Ambil Data BMKG (Cari lokasi terdekat dari API Provinsi)
    const bmkgRes = await fetchClosestBMKGData(lat, lon);
    
    // 3. Hitung Skor Bahaya BMKG
    const bmkgScore = mapBMKGtoPOP(bmkgRes.cuaca);

    // 4. Proses Penggabungan (Max Logic)
    const formattedData = {
      location: currentRes.data.name,
      source_note: `Data: OW + BMKG ${bmkgRes.lokasi_bmkg}`,
      
      current: {
        temp: currentRes.data.main.temp,
        humidity: currentRes.data.main.humidity,
        pressure: currentRes.data.main.pressure,
        wind_speed: currentRes.data.wind.speed,
        rain: currentRes.data.rain?.['1h'] || 0
      },
      
      hourly: forecastRes.data.list.slice(0, 8).map(item => {
        const owScore = Math.round((item.pop || 0) * 100);
        const finalPop = Math.max(owScore, bmkgScore);

        return {
            dt: item.dt,
            temp: item.main.temp,
            humidity: item.main.humidity,
            rain: { '1h': item.rain?.['3h'] ? (item.rain['3h'] / 3) : 0 },
            rain_prob: finalPop 
        };
      })
    };

    console.log(`📊 [HYBRID] OW:${Math.round((forecastRes.data.list[0].pop||0)*100)}% | BMKG:${bmkgScore}% -> Final:${formattedData.hourly[0].rain_prob}%`);

    res.json({ data: formattedData });

  } catch (error) {
    console.error("❌ [WEATHER ERROR]", error.message);
    
    const mockHourly = Array.from({ length: 8 }, (_, i) => ({
      dt: Math.floor(Date.now() / 1000) + (i * 3600 * 3),
      temp: 30, humidity: 80, rain: { '1h': 0 }, rain_prob: 50
    }));

    res.json({ 
      data: {
        location: "Mode Offline",
        current: { temp: 0, humidity: 0, rain: 0 },
        hourly: mockHourly
      }
    });
  }
});


app.post('/api/predict/run', async (req, res) => {
  try {
    const rawFeatures = req.body.features && req.body.features[0];
    if (!rawFeatures || rawFeatures.length === 0) throw new Error("Data kosong");

    const formattedFeatures = rawFeatures.map(f => [
      parseFloat(f.rainfall || 0),
      parseFloat(f.temp || 30),
      parseFloat(f.humidity || 80),
      parseFloat(f.pressure || 1010)
    ]);

    const pythonPayload = { features: [formattedFeatures] };
    const aiResponse = await axios.post(PYTHON_AI_URL, pythonPayload);

    res.json({
      result: aiResponse.data.category === 'Aman' ? 0 : 1,
      category: aiResponse.data.category,
      probability: aiResponse.data.probability
    });

  } catch (error) {
    console.error("❌ [AI ERROR]", error.message);
    const manualFeatures = req.body.features ? req.body.features[0] : [];
    const totalRain = manualFeatures.reduce((acc, curr) => acc + (curr.rainfall || 0), 0);
    const isFlood = totalRain > 50;

    res.json({ 
      result: isFlood ? 1 : 0, 
      category: isFlood ? "Siaga (Fallback)" : "Aman (Fallback)",
      probability: isFlood ? 85 : 10,
      note: "Python Offline"
    });
  }
});

module.exports = app;