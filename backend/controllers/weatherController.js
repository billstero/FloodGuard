const axios = require('axios');
const db = require('../firestore');

const getCurrentTimestamp = () => new Date().toISOString();

const fetchAndSaveWeatherData = async () => {
    try {
        const lat = '-6.2088';
        const lon = '106.8456';
        const apiKey = process.env.OPENWEATHERMAP_KEY;
        
        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
        
        const response = await axios.get(url);
        const data = response.data;
        const weatherRecord = {
            temperature: data.main.temp,
            humidity: data.main.humidity,
            pressure: data.main.pressure,
            rainfall: data.rain ? data.rain['1h'] || 0 : 0, 
            timestamp: admin.firestore.FieldValue.serverTimestamp(), 
            location: 'DKI Jakarta'
        };
            await db.collection('weather_history').add(weatherRecord);
            await db.collection('latest_status').doc('jakarta').set(weatherRecord);

        return weatherRecord;
    } catch (error) {
        console.error("Error fetching weather:", error.message);
        throw error;
    }
};

module.exports = { fetchAndSaveWeatherData };