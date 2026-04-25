// Global variables for charts
let areaPriceChart, actualPredChart, featureImpChart;
let globalData = [];
let modelInfo = null;

// DOM Elements
const predictForm = document.getElementById('prediction-form');
const predictBtn = document.getElementById('predict-btn');
const errorMsg = document.getElementById('error-message');
const priceDisplay = document.getElementById('predicted-price');
const confidenceBadge = document.getElementById('confidence-badge');
const loadingSpinner = document.getElementById('loading-spinner');
const modelEquation = document.getElementById('model-equation');
const r2Value = document.getElementById('r2-value');
const r2Fill = document.getElementById('r2-fill');
const mseValue = document.getElementById('mse-value');

// Base API URL
// Replace with your actual backend URL when deployed
const API_URL = 'https://void-housing-predictor-api.onrender.com';

// Format currency
const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
});

// Initialize dashboard
async function initDashboard() {
    try {
        // Fetch base data for charts
        const response = await fetch(`${API_URL}/data`);
        if (response.ok) {
            const result = await response.json();
            globalData = result.data;
            initCharts(globalData);
        }
        
        // Fetch model info
        const infoResponse = await fetch(`${API_URL}/model_info`);
        if (infoResponse.ok) {
            modelInfo = await infoResponse.json();
            updateModelInfoUI(modelInfo);
            if(globalData.length > 0) {
                updateFeatureImportanceChart(modelInfo.weights);
            }
        }
    } catch (error) {
        console.error("Error initializing dashboard:", error);
    }
}

function updateModelInfoUI(info) {
    if(info.formula) {
        modelEquation.innerText = info.formula;
    }
}

// Predict Price Handler
predictForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsg.innerText = '';
    
    const area = parseFloat(document.getElementById('area').value);
    const bedrooms = parseInt(document.getElementById('bedrooms').value);
    const age = parseInt(document.getElementById('age').value);

    if (area < 0 || bedrooms < 0 || age < 0) {
        errorMsg.innerText = 'Please enter positive values.';
        return;
    }

    // UI Loading state
    loadingSpinner.classList.remove('hidden');
    predictBtn.disabled = true;

    try {
        const response = await fetch(`${API_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ area, bedrooms, age })
        });

        if (!response.ok) {
            throw new Error('Prediction failed. Is the backend running?');
        }

        const data = await response.json();
        
        // Animate counter
        animateValue(priceDisplay, 0, data.predicted_price, 1500);
        confidenceBadge.classList.remove('hidden');
        
        // Update Performance Metrics
        if (data.r2_score !== undefined) {
            const r2Percentage = Math.max(0, data.r2_score * 100).toFixed(1);
            r2Value.innerText = `${r2Percentage}%`;
            r2Fill.style.width = `${r2Percentage}%`;
        }
        
        if (data.mse !== undefined) {
            // Format large numbers with M or K
            let mseFormatted = data.mse;
            if (data.mse > 1000000) mseFormatted = (data.mse / 1000000).toFixed(2) + 'M';
            else if (data.mse > 1000) mseFormatted = (data.mse / 1000).toFixed(2) + 'K';
            mseValue.innerText = mseFormatted;
        }

        // Highlight the predicted point on the charts
        highlightPredictionOnCharts({ area, bedrooms, age }, data.predicted_price);

    } catch (error) {
        errorMsg.innerText = error.message;
    } finally {
        loadingSpinner.classList.add('hidden');
        predictBtn.disabled = false;
    }
});

// Animate numbers
function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        // Easing function: easeOutQuart
        const easeProgress = 1 - Math.pow(1 - progress, 4);
        const currentVal = Math.floor(easeProgress * (end - start) + start);
        obj.innerHTML = formatter.format(currentVal);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Chart.js Default styling
Chart.defaults.color = '#B0C4DE';
Chart.defaults.font.family = 'Outfit';

function initCharts(data) {
    const ctxArea = document.getElementById('area-price-chart').getContext('2d');
    const ctxActualPred = document.getElementById('actual-pred-chart').getContext('2d');
    const ctxFeatureImp = document.getElementById('feature-imp-chart').getContext('2d');

    // 1. Area vs Price (Scatter)
    const scatterData = data.map(d => ({ x: d.area, y: d.price }));
    
    areaPriceChart = new Chart(ctxArea, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Historical Data',
                data: scatterData,
                backgroundColor: 'rgba(27, 127, 220, 0.5)', // #1B7FDC
                pointRadius: 4,
                pointHoverRadius: 6
            }, {
                label: 'Prediction',
                data: [],
                backgroundColor: '#0DB8D3', // Light Accent
                borderColor: '#FFFFFF',
                borderWidth: 2,
                pointRadius: 8,
                pointHoverRadius: 10,
                pointStyle: 'star'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(25, 53, 70, 0.9)',
                    titleColor: '#0DB8D3',
                    callbacks: {
                        label: (ctx) => `Area: ${ctx.parsed.x} sqft | Price: ${formatter.format(ctx.parsed.y)}`
                    }
                }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'Area (sq ft)' } },
                y: { grid: { color: 'rgba(255,255,255,0.05)' }, title: { display: true, text: 'Price' } }
            }
        }
    });

    // 2. Actual vs Predicted Distribution
    const sortedPrices = [...data].sort((a,b) => a.price - b.price);
    
    actualPredChart = new Chart(ctxActualPred, {
        type: 'line',
        data: {
            labels: sortedPrices.map((_, i) => i),
            datasets: [{
                label: 'Actual Prices',
                data: sortedPrices.map(d => d.price),
                borderColor: 'rgba(27, 127, 220, 0.5)', // #1B7FDC
                backgroundColor: 'rgba(27, 127, 220, 0.05)',
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }, {
                label: 'Predicted Value',
                data: [],
                borderColor: '#0DB8D3', // Light Accent
                backgroundColor: 'rgba(13, 184, 211, 0.2)',
                fill: false,
                borderDash: [5, 5],
                pointRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(25, 53, 70, 0.9)'
                }
            },
            scales: {
                x: { display: false },
                y: { grid: { color: 'rgba(255,255,255,0.05)' } }
            }
        }
    });

    // 3. Feature Importance
    featureImpChart = new Chart(ctxFeatureImp, {
        type: 'bar',
        data: {
            labels: ['Area', 'Bedrooms', 'Age'],
            datasets: [{
                label: 'Weight',
                data: [0, 0, 0],
                backgroundColor: [
                    'rgba(13, 184, 211, 0.8)', // #0DB8D3
                    'rgba(27, 127, 220, 0.8)', // #1B7FDC
                    'rgba(6, 91, 152, 0.8)'    // #065B98
                ],
                borderRadius: 4
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(25, 53, 70, 0.9)'
                }
            },
            scales: {
                x: { grid: { color: 'rgba(255,255,255,0.05)' } },
                y: { grid: { display: false } }
            }
        }
    });
}

function updateFeatureImportanceChart(weights) {
    if(!featureImpChart) return;
    
    // Normalize weights roughly for visualization
    const max = Math.max(Math.abs(weights.area), Math.abs(weights.bedrooms), Math.abs(weights.age));
    
    featureImpChart.data.datasets[0].data = [
        Math.abs(weights.area) / max * 100,
        Math.abs(weights.bedrooms) / max * 100,
        Math.abs(weights.age) / max * 100
    ];
    featureImpChart.update();
}

function highlightPredictionOnCharts(input, predictedPrice) {
    if(!areaPriceChart || !actualPredChart) return;

    // Update Scatter Plot
    areaPriceChart.data.datasets[1].data = [{ x: input.area, y: predictedPrice }];
    areaPriceChart.update();

    // Update Line Chart (add horizontal line for predicted price)
    const lineData = actualPredChart.data.labels.map(() => predictedPrice);
    actualPredChart.data.datasets[1].data = lineData;
    actualPredChart.update();
}

// Run init
window.addEventListener('DOMContentLoaded', initDashboard);
