// Configuration
const API_BASE_URL = 'http://localhost:8000'; // Make sure the FastAPI is running here

// DOM Elements
const form = document.getElementById('prediction-form');
const submitBtn = document.getElementById('submit-btn');
const loader = document.getElementById('loader');
const btnText = submitBtn.querySelector('span');
const outputBox = document.getElementById('output-box');
const priceEl = document.getElementById('predicted-price');
const formulaBox = document.getElementById('model-formula');
const formError = document.getElementById('form-error');

// Chart instances (to destroy them before re-rendering)
let scatterChartInstance = null;
let weightChartInstance = null;

let datasetCache = null; // Store fetched data

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Fetch Model Formula
    try {
        const modelRes = await fetch(`${API_BASE_URL}/model_info`);
        if(modelRes.ok) {
            const modelInfo = await modelRes.json();
            formulaBox.innerText = modelInfo.formula;
            renderWeightChart(modelInfo.weights); // Graph 2
        } else {
            formulaBox.innerText = "Model info unavailable. Train it first.";
        }
    } catch (e) {
        formulaBox.innerText = "Error connecting to backend.";
    }

    // 2. Fetch Dataset for Scatter Plot
    try {
        const dataRes = await fetch(`${API_BASE_URL}/data`);
        if(dataRes.ok) {
            const dataData = await dataRes.json();
            datasetCache = dataData.data;
            renderScatterChart(datasetCache, null); // Render initial without user point
        }
    } catch (e) {
        console.warn("Dataset not available for chart", e);
    }
});

// Configure Chart.js global defaults for Dark Theme
Chart.defaults.color = '#b0d8c9';
Chart.defaults.borderColor = 'rgba(255, 255, 255, 0.1)';

function renderWeightChart(weights) {
    const ctx = document.getElementById('weightChart').getContext('2d');
    
    // Destroy if exists
    if(weightChartInstance) weightChartInstance.destroy();

    const labels = ['Area (sqft)', 'Bedrooms', 'Age (years)'];
    const data = [weights.area, weights.bedrooms, weights.age];
    
    // Colors based on negative/positive impact
    const bgColors = data.map(val => val < 0 ? 'rgba(255, 99, 132, 0.8)' : 'rgba(46, 204, 113, 0.8)');

    weightChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Coefficient Weight',
                data: data,
                backgroundColor: bgColors,
                borderWidth: 0,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (context) => `Impact per unit: $${parseFloat(context.raw).toFixed(2)}`
                    }
                }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function renderScatterChart(dataset, userPoint) {
    const ctx = document.getElementById('scatterChart').getContext('2d');
    
    if(scatterChartInstance) scatterChartInstance.destroy();

    // Format dataset -> {x: area, y: price}
    const historicalData = dataset.map(item => ({ x: item.area, y: item.price }));
    
    const datasetsConfig = [{
        label: 'Historical Data',
        data: historicalData,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        pointRadius: 5,
        pointHoverRadius: 8
    }];

    // If user made a prediction, plot it distinctly
    if (userPoint) {
        datasetsConfig.push({
            label: 'Your Prediction',
            data: [{ x: userPoint.area, y: userPoint.price }],
            backgroundColor: '#2ECC71',
            borderColor: '#ffffff',
            borderWidth: 2,
            pointRadius: 8,
            pointHoverRadius: 12
        });
    }

    scatterChartInstance = new Chart(ctx, {
        type: 'scatter',
        data: { datasets: datasetsConfig },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                tooltip: {
                    callbacks: {
                        label: (context) => `Area: ${context.raw.x} sqft | Price: $${context.raw.y.toLocaleString()}`
                    }
                }
            },
            scales: {
                x: { title: { display: true, text: 'Area (sq ft)' } },
                y: { title: { display: true, text: 'Price ($)' } }
            }
        }
    });
}

// Form Submission Handler
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    formError.innerText = '';
    
    const area = parseFloat(document.getElementById('area').value);
    const bedrooms = parseInt(document.getElementById('bedrooms').value);
    const age = parseInt(document.getElementById('age').value);

    // Basic Validation
    if(area <= 0 || bedrooms <= 0 || age < 0) {
        formError.innerText = "Please enter valid positive numbers.";
        return;
    }

    // UI Loading state
    submitBtn.disabled = true;
    loader.classList.remove('d-none');
    btnText.style.opacity = '0';
    outputBox.classList.remove('show');

    try {
        const response = await fetch(`${API_BASE_URL}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ area, bedrooms, age })
        });

        if(!response.ok) {
            const errData = await response.json();
            throw new Error(errData.detail || 'Prediction failed');
        }

        const result = await response.json();
        
        // Success - Animate Number logic
        animateValue(priceEl, 0, result.predicted_price, 1500);
        outputBox.classList.add('show');
        
        // Update Chart with User's point
        if(datasetCache) {
            renderScatterChart(datasetCache, { area: area, price: result.predicted_price });
        }

    } catch (err) {
        formError.innerText = err.message;
    } finally {
        submitBtn.disabled = false;
        loader.classList.add('d-none');
        btnText.style.opacity = '1';
    }
});

// Smooth Number Counter Animation
function animateValue(obj, start, end, duration) {
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        // easeOutQuart ease function
        const easeProgress = 1 - Math.pow(1 - progress, 4);
        const currentVal = Math.floor(easeProgress * (end - start) + start);
        
        obj.innerHTML = `$${currentVal.toLocaleString()}`;
        
        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            obj.innerHTML = `$${end.toLocaleString()}`; // exact format at end
        }
    };
    window.requestAnimationFrame(step);
}
