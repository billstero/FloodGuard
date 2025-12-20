const express = require('express');
const router = express.Router();
const db = require('../firestore');
const { fetchAndSaveWeatherData } = require('../controllers/weatherController');

router.get('/current', async (req, res) => {
    try {
        const doc = await db.collection('latest_status').doc('jakarta').get();
        if (!doc.exists) {
            const newData = await fetchAndSaveWeatherData();
            return res.json(newData);
        }
        res.json(doc.data());
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/history', async (req, res) => {
    try {
        const snapshot = await db.collection('weather_history')
            .orderBy('timestamp', 'desc')
            .limit(24) 
            .get();
            
        const data = snapshot.docs.map(doc => doc.data());
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;