from flask import Flask, request, jsonify
import numpy as np
import tensorflow as tf
import joblib
import os

app = Flask(__name__)

# UPDATE PATH KE FILE .keras
MODEL_PATH = 'saved_model/lstm_flood.keras'
SCALER_PATH = 'saved_model/scaler.pkl'

if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
    model = tf.keras.models.load_model(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    print("✅ Model AI Loaded Successfully")
else:
    print(f"❌ Model tidak ditemukan di {MODEL_PATH}")
    model = None
    scaler = None

@app.route('/predict', methods=['POST'])
def predict():
    if not model:
        return jsonify({'error': 'Model not loaded'}), 500

    try:
        data = request.json.get('features')
        if not data: return jsonify({'error': 'No features provided'}), 400

        arr = np.array(data) 
        batch, seq, feat = arr.shape
        
        # Normalize
        arr_2d = arr.reshape(-1, feat)
        arr_scaled = scaler.transform(arr_2d)
        arr_scaled = arr_scaled.reshape(batch, seq, feat)

        # Predict
        preds = model.predict(arr_scaled)
        prob_value = float(preds[0][0])
        
        category = "Aman"
        if prob_value > 0.4: category = "Siaga"
        if prob_value > 0.7: category = "Awas"

        return jsonify({
            'probability': round(prob_value * 100, 2),
            'category': category
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)