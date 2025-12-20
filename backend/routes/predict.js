const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../firestore');

router.post('/now', async (req, res) => {
    try {
        const snapshot = await db.collection('weather_history')
            .orderBy('timestamp', 'desc')
            .limit(5) 
            .get();

        if (snapshot.empty || snapshot.docs.length < 5) {
            return res.status(400).json({ message: "Data historis belum cukup untuk prediksi LSTM" });
        }

        const inputData = snapshot.docs.map(doc => {
            const d = doc.data();
            return [d.rainfall, d.temperature, d.humidity, d.pressure]; 
        }).reverse(); 

        const modelResponse = await axios.post(process.env.MODEL_SERVICE_URL, {
        features: [inputData] 
            });


        const prediction = modelResponse.data; 

        await db.collection('predictions').add({
            timestamp: new Date(),
            input_features: inputData,
            risk_score: prediction.result,
            status: prediction.status
        });

        res.json(prediction);

    } catch (error) {
        console.error("Prediction Error:", error.message);
        res.status(500).json({ error: "Gagal memproses prediksi", details: error.message });
    }
});

module.exports = router;