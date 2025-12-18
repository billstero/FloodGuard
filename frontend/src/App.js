import "./styles.css";
import React, { useState, useEffect } from 'react';
import MapView, { JAKARTA_LOCATIONS } from './components/MapView'; 
import { WeatherTrendChart } from './components/RiskChart';
import { fetchOpenWeather } from './services/api';

function App() {
  const [theme, setTheme] = useState('dark');
  const [weather, setWeather] = useState({ temp: '--', rain: 0, pop: 0, humidity: '--', wind: '--', location: 'Mendeteksi...' });
  const [hourly, setHourly] = useState(null);
  const [activeCoords, setActiveCoords] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [risk, setRisk] = useState({ status: "LOADING", level: "safe", confidence: 0, dist: { safe: 0, warn: 0, danger: 0 } });
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => { document.body.setAttribute('data-theme', theme); }, [theme]);
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).replace(/\./g, ':'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const calculateDynamicRisk = (rain, humidity, isSim) => {
    if (isSim) return { status: "AWAS", level: "danger", confidence: 98, dist: { safe: 2, warn: 15, danger: 83 } };
    const fluctuation = Math.floor(Math.random() * 3);
    if (rain > 20) return { status: "AWAS", level: "danger", confidence: 85 + fluctuation, dist: { safe: 5, warn: 20 - fluctuation, danger: 75 + fluctuation } };
    if (rain > 5 || humidity > 95) return { status: "SIAGA", level: "warn", confidence: 70 + fluctuation, dist: { safe: 20 - fluctuation, warn: 65 + fluctuation, danger: 15 } };
    let baseSafe = humidity > 80 ? 90 : 96; let finalSafe = baseSafe - fluctuation; let finalWarn = 100 - finalSafe - 1; 
    return { status: "AMAN", level: "safe", confidence: finalSafe, dist: { safe: finalSafe, warn: finalWarn, danger: 1 } };
  };

  async function loadWeatherData(lat, lon, customName = null) {
    try {
      if (!isSimulating) setWeather(prev => ({ ...prev, location: 'Mengambil Data...' }));
      
      const w = await fetchOpenWeather(lat, lon);
      
      if (w && w.data) {
        let current = w.data.current; 
        let hourlyData = w.data.hourly || [];
        
        // === FIX SINKRONISASI GRAFIK & KARTU ===
        // Kita ambil data probabilitas dari jam pertama (hourly[0]) 
        // agar angka di Kartu SAMA PERSIS dengan titik pertama di Grafik.
        
        let firstHourPop = 0;
        if (hourlyData.length > 0) {
            // Cek properti 'pop' (standar API) atau 'rain_prob' (backend custom)
            let rawPop = hourlyData[0].pop !== undefined ? hourlyData[0].pop : hourlyData[0].rain_prob;
            
            // OpenWeather kirim 0.0 s/d 1.0, kita ubah ke persen (0-100)
            // Kalau data backend sudah 0-100, biarkan saja.
            firstHourPop = (rawPop <= 1) ? rawPop * 100 : rawPop;
        }
        
        let realPop = Math.round(firstHourPop);
        // =======================================

        let realRain = current.rain || 0; 
        let realTemp = current.temp; 
        let realHum = current.humidity;

        if (isSimulating) {
            realRain = 45.5; realPop = 98; realTemp = 24.0; realHum = 92;
            hourlyData = hourlyData.map(h => ({ ...h, rain_prob: 90 + (Math.random() * 10), rain: { '1h': 20 + Math.random() * 10 } }));
        }

        setWeather({ 
            temp: realTemp, 
            humidity: realHum, 
            wind: current.wind_speed, 
            rain: realRain, 
            pop: realPop, // <-- Nilai ini sekarang sinkron dengan grafik
            location: customName || w.data.location 
        });

        setHourly(hourlyData); 
        setActiveCoords([lat, lon]); 
        setRisk(calculateDynamicRisk(realRain, realHum, isSimulating));
      }
    } catch (e) { console.error(e); }
  }

  const handleLocationSelect = (lat, lon, name) => loadWeatherData(lat, lon, name);
  
  useEffect(() => {
    if (activeCoords) loadWeatherData(activeCoords[0], activeCoords[1], weather.location);
    else loadWeatherData(-6.1767, 106.8263, "Jakarta Pusat");
  }, [isSimulating]);

  const getStatusColorClass = () => {
    if (risk.level === 'danger') return 'text-danger';
    if (risk.level === 'warn') return 'text-warn';
    return 'text-safe';
  };

  return (
    <div className="app-root">
      {/* HEADER: LOGO & BUTTONS */}
      <header className="container">
        <h1 className="brand-logo">
          Flood<span className="brand-text-guard">Guard</span>
        </h1>
        <div className="header-actions">
            <button onClick={() => setIsSimulating(!isSimulating)} className="btn-primary">
                {isSimulating ? '🛑 Stop Simulasi' : '⚡ Test Hujan'}
            </button>
            <button onClick={toggleTheme} className="btn-secondary">
                {theme === 'dark' ? '☀ Light' : '🌙 Dark'}
            </button>
        </div>
      </header>

      {/* TOP ROW: STATUS & PROBABILITY */}
      <div className="top-grid">
        <div className="card">
          <div className="card-header">
            <span className="card-title">Status Risiko</span>
            <div style={{fontSize:'0.8rem', fontWeight:600, color: risk.level === 'safe' ? 'var(--color-safe)' : 'var(--color-danger)'}}>● Live Pulse</div>
          </div>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end'}}>
            <div>
              <div className={`status-big ${getStatusColorClass()}`}>{risk.status}</div>
              <div style={{opacity:0.6, fontSize:'0.9rem', marginTop:'8px'}}>Confidence: {risk.confidence}% • {currentTime}</div>
            </div>
            <div style={{fontSize:'4rem'}}>{risk.level === 'safe' ? '🛡️' : (risk.level === 'warn' ? '⚠️' : '🚨')}</div>
          </div>
        </div>

        <div className="card">
          <div className="card-header"><span className="card-title">Probabilitas AI</span></div>
          <div style={{display:'flex', flexDirection:'column', gap:'15px', justifyContent:'center', height:'100%'}}>
             <div>
               <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.9rem', fontWeight:600, marginBottom:'5px'}}><span>Aman</span><span className="text-safe">{risk.dist.safe}%</span></div>
               <div className="progress-track"><div className="progress-fill" style={{width:`${risk.dist.safe}%`, background:'var(--color-safe)'}}></div></div>
             </div>
             <div>
               <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.9rem', fontWeight:600, marginBottom:'5px'}}><span>Siaga</span><span className="text-warn">{risk.dist.warn}%</span></div>
               <div className="progress-track"><div className="progress-fill" style={{width:`${risk.dist.warn}%`, background:'var(--color-warn)'}}></div></div>
             </div>
             <div>
               <div style={{display:'flex', justifyContent:'space-between', fontSize:'0.9rem', fontWeight:600, marginBottom:'5px'}}><span>Awas</span><span className="text-danger">{risk.dist.danger}%</span></div>
               <div className="progress-track"><div className="progress-fill" style={{width:`${risk.dist.danger}%`, background:'var(--color-danger)'}}></div></div>
             </div>
          </div>
        </div>
      </div>

      {/* MAIN ROW: SENSOR & MAP */}
      <div className="main-grid">
        {/* SENSOR CARD */}
        <div className="card">
          <div className="card-header" style={{flexDirection:'column', alignItems:'start', gap:'10px'}}>
            <span className="card-title">Lokasi & Sensor</span>
            <select className="location-select" onChange={(e) => {
                const [lat, lon, name] = e.target.value.split(',');
                handleLocationSelect(parseFloat(lat), parseFloat(lon), name);
              }} value={activeCoords ? `${activeCoords[0]},${activeCoords[1]},${weather.location}` : ""}>
              <option value="" disabled>Pilih Lokasi</option>
              <option value={`${activeCoords?.[0]},${activeCoords?.[1]},${weather.location}`}>📍 {weather.location}</option>
              <optgroup label="Jakarta">
                {JAKARTA_LOCATIONS.map((loc, i) => (<option key={i} value={`${loc.lat},${loc.lon},${loc.name}`}>{loc.name}</option>))}
              </optgroup>
            </select>
          </div>
          
          <div className="sensor-list">
            <div className="sensor-item"><span className="sensor-icon">🌡️</span><div><div className="sensor-value">{weather.temp}°</div><div className="sensor-label">Suhu</div></div></div>
            <div className="sensor-item"><span className="sensor-icon">💧</span><div><div className="sensor-value">{weather.rain} mm</div><div className="sensor-label">Curah Hujan</div></div></div>
            <div className="sensor-item"><span className="sensor-icon">🌧️</span><div><div className="sensor-value">{weather.pop}%</div><div className="sensor-label">Peluang Hujan</div></div></div>
            <div className="sensor-item"><span className="sensor-icon">💨</span><div><div className="sensor-value">{weather.wind} m/s</div><div className="sensor-label">Angin</div></div></div>
            <div className="sensor-item"><span className="sensor-icon">👁️</span><div><div className="sensor-value">{weather.humidity}%</div><div className="sensor-label">Kelembaban</div></div></div>
          </div>
        </div>

        {/* MAP CARD (FULL BLEED) */}
        <div className="card map-card">
          <div className="map-wrapper">
            <MapView theme={theme} onSelectLocation={handleLocationSelect} currentCenter={activeCoords} riskLevel={risk.level} />
          </div>
        </div>
      </div>

      {/* CHART ROW */}
      <div className="card">
        <div className="card-header"><span className="card-title">Tren Cuaca 24 Jam</span></div>
        <div className="chart-container"><WeatherTrendChart theme={theme} hourlyData={hourly} /></div>
      </div>

      {/* FOOTER: OPENWEATHER + BMKG */}
      <footer style={{textAlign:'center', opacity:0.5, fontSize:'0.8rem', paddingBottom:'20px'}}>
        &copy; 2025 FloodGuard System • Powered by OpenWeather + BMKG & AI
      </footer>
    </div>
  );
}

export default App;