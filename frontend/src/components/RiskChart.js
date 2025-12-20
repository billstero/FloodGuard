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
  const colors = {
    rain: isDark ? '#00f3ff' : '#00a8cc',
    humidity: isDark ? '#bc13fe' : '#9d00d6', 
    text: isDark ? '#ffffff' : '#1e293b',
    grid: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
    tooltipBg: isDark ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)',
    tooltipText: isDark ? '#ffffff' : '#000000'
  };

  const DATA_LIMIT = 9; 

  const labels = hourlyData
    ? hourlyData.slice(0, DATA_LIMIT).map(h => {
        const date = new Date(h.dt * 1000);
        return date.toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: false 
        }).replace('.', ':');
      })
    : [];

  const rainProbData = hourlyData
    ? hourlyData.slice(0, DATA_LIMIT).map(h => {
        if (h.pop !== undefined) return h.pop * 100;
        if (h.rain_prob !== undefined) return h.rain_prob;

        const rainMm = (h.rain && h.rain['1h']) ? h.rain['1h'] : 0;
        return rainMm > 0 ? Math.min(rainMm * 10, 100) : 0; 
      })
    : [];

  const humidityData = hourlyData
    ? hourlyData.slice(0, DATA_LIMIT).map(h => h.humidity ?? 0)
    : [];

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
        max: 100, 
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
        tension: 0.4, 
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
        borderDash: [5, 5], 
        tension: 0.4,
        borderWidth: 2,
        pointRadius: 0, 
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