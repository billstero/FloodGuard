const express = require('express');
const router = express.Router();
const axios = require('axios');
const db = require('../firestore');

router.post('/now', async (req, res) => {
    try {
        // 1. Ambil data historis terakhir (misal model butuh 5 data time-steps ke belakang)
        // Sesuai Bab 3.3: Data diubah menjadi deret waktu
        const snapshot = await db.collection('weather_history')
            .orderBy('timestamp', 'desc')
            .limit(5) // Asumsi LSTM butuh sequence length = 5
            .get();

        if (snapshot.empty || snapshot.docs.length < 5) {
            return res.status(400).json({ message: "Data historis belum cukup untuk prediksi LSTM" });
        }

        // Format data agar sesuai input Flask/Python (urutan harus benar, misal ascending)
        const inputData = snapshot.docs.map(doc => {
            const d = doc.data();
            return [d.rainfall, d.temperature, d.humidity, d.pressure]; // Fitur sesuai Bab 3.3
        }).reverse(); // Balik jadi urutan lama -> baru

        // 2. Kirim ke Model Service (Python)
        // Di env kamu: MODEL_SERVICE_URL=http://localhost:5000/predict
        const modelResponse = await axios.post(process.env.MODEL_SERVICE_URL, {
        features: [inputData]  // LSTM expects shape: (batch=1, seq_len, features=4)
            });


        const prediction = modelResponse.data; // Harapannya { result: 0.85, status: "Awas" }

        // 3. Simpan hasil prediksi ke DB untuk riwayat
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