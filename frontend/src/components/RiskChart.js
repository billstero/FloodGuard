import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const WeatherTrendChart = ({ theme, hourlyData }) => {
  const isDark = theme === 'dark';

  // === WARNA KONSISTEN (NEON) ===
  const colors = {
    rain: isDark ? '#00f3ff' : '#00a8cc',      // Cyan Neon (Dark) vs Cyan Deep (Light)
    humidity: isDark ? '#bc13fe' : '#9d00d6',  // Purple Neon
    text: isDark ? '#ffffff' : '#1e293b',
    grid: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    tooltipBg: isDark ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)',
    tooltipText: isDark ? '#ffffff' : '#000000'
  };

  // === DATA PROCESSING (24 JAM FULL) ===
  // OpenWeatherMap Forecast biasanya per 3 jam.
  // Untuk 24 jam kedepan, kita butuh sekitar 8 sampai 9 titik data.
  const DATA_LIMIT = 9; 

  const labels = hourlyData
    ? hourlyData.slice(0, DATA_LIMIT).map(h => {
        const date = new Date(h.dt * 1000);
        // Format 24 Jam (Contoh: 13:00, 23:00, 00:00)
        return date.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false 
        }).replace('.', ':'); // Ganti titik jadi titik dua
      })
    : [];

  // PENTING: Jika backend kamu kirim "rain_prob" pakai itu, 
  // Jika tidak, kita hitung manual dari data "rain" (mm) untuk visualisasi
  const rainProbData = hourlyData
    ? hourlyData.slice(0, DATA_LIMIT).map(h => {
        // Cek apakah ada properti pop (Probability of Precipitation) dari OpenWeather
        // Nilai pop biasanya 0 s/d 1. Kita kali 100 biar jadi Persen.
        if (h.pop !== undefined) return h.pop * 100;
        
        // Fallback: Jika backend custom kamu kirim rain_prob
        if (h.rain_prob !== undefined) return h.rain_prob;

        // Fallback Terakhir: Jika cuma ada curah hujan (mm), kita kira-kira saja buat grafik
        // (Hanya visualisasi, bukan akurat)
        const rainMm = (h.rain && h.rain['1h']) ? h.rain['1h'] : 0;
        return rainMm > 0 ? Math.min(rainMm * 10, 100) : 0; 
      })
    : [];

  const humidityData = hourlyData
    ? hourlyData.slice(0, DATA_LIMIT).map(h => h.humidity ?? 0)
    : [];

  // === CHART CONFIG ===
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        align: 'end',
        labels: {
          color: colors.text,
          boxWidth: 12,
          font: { family: 'Outfit, sans-serif', weight: '600', size: 11 }
        }
      },
      tooltip: {
        backgroundColor: colors.tooltipBg,
        titleColor: colors.tooltipText,
        bodyColor: colors.tooltipText,
        borderColor: colors.rain,
        borderWidth: 1,
        titleFont: { size: 13, weight: 'bold' },
        padding: 10,
        displayColors: false,
        callbacks: {
          label: (context) => ` ${context.dataset.label}: ${Math.round(context.raw)}%`
        }
      }
    },
    scales: {
      x: {
        ticks: { 
          color: colors.text,
          font: { size: 10, family: 'Outfit, sans-serif' }
        },
        grid: { display: false }
      },
      y: {
        min: 0,
        max: 100, // Persentase selalu 0-100
        ticks: {
          stepSize: 25,
          color: colors.text,
          font: { size: 10 },
          callback: (v) => v + '%'
        },
        grid: {
          color: colors.grid,
          borderDash: [5, 5]
        }
      }
    }
  };

  // === DATASET SETUP ===
  const data = {
    labels,
    datasets: [
      {
        label: 'Peluang Hujan',
        data: rainProbData,
        borderColor: colors.rain,
        backgroundColor: (ctx) => {
          const canvas = ctx.chart.ctx;
          const gradient = canvas.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, isDark ? 'rgba(0, 243, 255, 0.5)' : 'rgba(0, 168, 204, 0.5)');
          gradient.addColorStop(1, isDark ? 'rgba(0, 243, 255, 0)' : 'rgba(0, 168, 204, 0)');
          return gradient;
        },
        tension: 0.4, // Garis melengkung halus
        fill: true,
        borderWidth: 3,
        pointBackgroundColor: colors.rain,
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6
      },
      {
        label: 'Kelembaban',
        data: humidityData,
        borderColor: colors.humidity,
        borderDash: [5, 5], // Garis putus-putus
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0, // Titik disembunyikan biar tidak semrawut
        pointHoverRadius: 4
      }
    ]
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <Line options={options} data={data} />
    </div>
  );
};