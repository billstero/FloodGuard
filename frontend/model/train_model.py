import numpy as np
import pandas as pd
import os
import joblib
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout, Input
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split

#SETUP PATH
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SAVED_MODEL_DIR = os.path.join(BASE_DIR, 'saved_model')
DATA_DIR = os.path.join(BASE_DIR, 'data')
CSV_PATH = os.path.join(DATA_DIR, 'historical_weather_labels.csv')

if not os.path.exists(SAVED_MODEL_DIR): os.makedirs(SAVED_MODEL_DIR)
if not os.path.exists(DATA_DIR): os.makedirs(DATA_DIR)

print(f"📂 Working Directory: {BASE_DIR}")

#1. GENERATE DATA DUMMY (2020 - 2025)
if os.path.exists(CSV_PATH):
    os.remove(CSV_PATH)
    print("🗑️ Menghapus data lama...")

print("⚠️ Membuat data simulasi baru (2020-2025)...")

# 5 Tahun x 365 Hari x 24 Jam = Sekitar 43.800 data points. Kita bulatkan jadi 45.000
DATA_SIZE = 45000 

dates = pd.date_range(start='2020-01-01', periods=DATA_SIZE, freq='h')
df = pd.DataFrame({'datetime': dates})

# Isi data random dengan pola sedikit lebih realistis
np.random.seed(42) # Biar hasilnya konsisten
df['rainfall'] = np.random.gamma(shape=2, scale=2, size=DATA_SIZE)
df['temp'] = np.random.normal(28, 2, size=DATA_SIZE)
df['humidity'] = np.random.normal(75, 10, size=DATA_SIZE)
df['pressure'] = np.random.normal(1010, 5, size=DATA_SIZE)

# Label: 1 jika Hujan > 10mm ATAU (Hujan > 5mm DAN Lembab > 85%)
df['label'] = ((df['rainfall'] > 10) | ((df['rainfall'] > 5) & (df['humidity'] > 85))).astype(int)

df.to_csv(CSV_PATH, index=False)
print(f"✅ Data simulasi {DATA_SIZE} baris berhasil dibuat.")

#2. PREPROCESSING
print("⚙️ Sedang memproses data...")
features = ['rainfall', 'temp', 'humidity', 'pressure']
scaler = MinMaxScaler()
X_scaled = scaler.fit_transform(df[features])
y = df['label'].values

SEQ_LEN = 24 

def create_sequences(X, y, seq_len):
    xs, ys = [], []
    for i in range(len(X) - seq_len):
        xs.append(X[i:(i + seq_len)])
        ys.append(y[i + seq_len])
    return np.array(xs), np.array(ys)

X_seq, y_seq = create_sequences(X_scaled, y, SEQ_LEN)

# Split Training & Test (80% Latih, 20% Uji)
X_train, X_test, y_train, y_test = train_test_split(X_seq, y_seq, test_size=0.2, shuffle=False)

#3. BUILD MODEL
print("🚀 Sedang Melatih Model AI (Ini mungkin agak lama)...")
model = Sequential()
model.add(Input(shape=(X_train.shape[1], X_train.shape[2])))
model.add(LSTM(64, return_sequences=False))
model.add(Dropout(0.2))
model.add(Dense(32, activation='relu'))
model.add(Dense(1, activation='sigmoid'))

model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])

# Epochs dinaikkan dikit biar makin pinter karena datanya banyak
model.fit(X_train, y_train, epochs=5, batch_size=64, validation_data=(X_test, y_test))

#4. SAVE MODEL & SCALER
model_path = os.path.join(SAVED_MODEL_DIR, 'lstm_flood.keras')
scaler_path = os.path.join(SAVED_MODEL_DIR, 'scaler.pkl')

model.save(model_path)
joblib.dump(scaler, scaler_path)

print(f"✅ SUKSES! Model baru tersimpan di {model_path}")