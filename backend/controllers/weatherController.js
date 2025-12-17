const axios = require('axios');
const db = require('../firestore');

// Helper untuk format tanggal
const getCurrentTimestamp = () => new Date().toISOString();

// Fungsi mengambil data dari OpenWeatherMap/BMKG
const fetchAndSaveWeatherData = async () => {
    try {
        // Contoh koordinat Jakarta
        const lat = '-6.2088';
        const lon = '106.8456';
        const apiKey = process.env.OPENWEATHERMAP_KEY;
        
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
        
        const response = await axios.get(url);
        const data = response.data;

        // Format data sesuai input model LSTM (Bab 3.3)
        const weatherRecord = {
            temperature: data.main.temp,
            humidity: data.main.humidity,
            pressure: data.main.pressure,
            rainfall: data.rain ? data.rain['1h'] || 0 : 0, // Curah hujan 1 jam terakhir
            timestamp: admin.firestore.FieldValue.serverTimestamp(), // Waktu server
            location: 'DKI Jakarta'
        };

        // Simpan ke Collection 'weather_history' untuk keperluan training ulang/grafik
        await db.collection('weather_history').add(weatherRecord);
        
        // Simpan/Update 'current_weather' untuk ditampilkan di Dashboard real-time
        await db.collection('latest_status').doc('jakarta').set(weatherRecord);

        return weatherRecord;
    } catch (error) {
        console.error("Error fetching weather:", error.message);
        throw error;
    }
};

module.exports = { fetchAndSaveWeatherData };