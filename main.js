// Global variables
let rawData = [];
let processedData = {
    electric: {},
    water: {},
    office: {},
    cleaning: {}
};

// Constants
const MONTHS = ['Gener', 'Febrer', 'Març', 'Abril', 'Maig', 'Juny', 'Juliol', 'Agost', 'Setembre', 'Octubre', 'Novembre', 'Desembre'];
const CHART_COLORS = {
    electric: 'rgba(243, 156, 18, 0.7)',
    water: 'rgba(52, 152, 219, 0.7)',
    office: 'rgba(155, 89, 182, 0.7)',
    cleaning: 'rgba(22, 160, 133, 0.7)'
};

// Charts references
let electricChart, waterChart, officeChart, cleaningChart;

// Load data when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Load and process data
    loadData();

    // Set up event listeners
    setupEventListeners();
});

// Load CSV data
async function loadData() {
    try {
        const response = await fetch('data/data.csv');
        const csvText = await response.text();
        parseCSV(csvText);
        processData();
        renderDashboard();
        calculateInitialPredictions();
        calculateSavingsEstimates();
    } catch (error) {
        console.error('Error loading data:', error);
        alert('Hi ha hagut un error carregant les dades. Si us plau, torna a intentar-ho més tard.');
    }
}

// Parse CSV data
function parseCSV(csvText) {
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');

    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;

        const values = lines[i].split(',');
        const entry = {};

        for (let j = 0; j < headers.length; j++) {
            entry[headers[j].trim()] = values[j] ? values[j].trim() : '';
        }

        rawData.push(entry);
    }
}

// Process raw data into categories
function processData() {
    // Process electricity data
    const electricData = rawData.filter(item => item.Tipus === 'Energia' && item.Categoria === 'Consum');
    processedData.electric.daily = electricData.map(item => ({
        date: new Date(item.Data),
        value: parseFloat(item.Valor)
    })).sort((a, b) => a.date - b.date);

    // Calculate monthly electricity average
    processedData.electric.monthly = aggregateByMonth(processedData.electric.daily);

    // Process water data
    const waterData = rawData.filter(item => item.Tipus === 'Aigua' && item.Categoria === 'Consum');
    processedData.water.daily = waterData.map(item => ({
        date: new Date(item.Data),
        value: parseFloat(item.Valor)
    })).sort((a, b) => a.date - b.date);

    // Calculate monthly water average
    processedData.water.monthly = aggregateByMonth(processedData.water.daily);

    // Process office consumables
    const officeData = rawData.filter(item =>
        item.Tipus === 'Consumible' &&
        ['Papel Universal', 'Marcador', 'Internet', 'Treballs'].includes(item.Categoria)
    );

    processedData.office.categories = {};
    officeData.forEach(item => {
        if (!processedData.office.categories[item.Categoria]) {
            processedData.office.categories[item.Categoria] = 0;
        }
        processedData.office.categories[item.Categoria] += parseFloat(item.Valor);
    });

    // Process cleaning products
    const cleaningData = rawData.filter(item =>
        item.Tipus === 'Consumible' &&
        ['WC', 'Extraordinaris'].includes(item.Categoria)
    );

    processedData.cleaning.categories = {};
    cleaningData.forEach(item => {
        if (!processedData.cleaning.categories[item.Categoria]) {
            processedData.cleaning.categories[item.Categoria] = 0;
        }
        processedData.cleaning.categories[item.Categoria] += parseFloat(item.Valor);
    });

    // Generate complete yearly data for forecasting (with seasonal patterns)
    generateCompleteYearlyData();
}

// Aggregate daily data to monthly averages
function aggregateByMonth(dailyData) {
    const monthlyData = {};

    dailyData.forEach(item => {
        const month = item.date.getMonth();
        const year = item.date.getFullYear();
        const key = `${year}-${month}`;

        if (!monthlyData[key]) {
            monthlyData[key] = {
                month: month,
                year: year,
                monthName: MONTHS[month],
                total: 0,
                count: 0
            };
        }

        monthlyData[key].total += item.value;
        monthlyData[key].count += 1;
    });

    // Calculate averages and convert to array
    return Object.values(monthlyData).map(item => ({
        month: item.month,
        year: item.year,
        monthName: item.monthName,
        value: item.total / item.count
    })).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
    });
}

// Generate a complete yearly dataset with seasonal patterns for forecasting
function generateCompleteYearlyData() {
    // Complete electric data with seasonal pattern
    const electricSeasonalFactors = [1.2, 1.2, 1.0, 0.9, 0.8, 0.8, 0.7, 0.7, 0.9, 1.0, 1.1, 1.2]; // Higher in winter, lower in summer
    processedData.electric.yearlyData = generateYearlyDataWithPattern(300, 350, electricSeasonalFactors);

    // Complete water data with seasonal pattern
    const waterSeasonalFactors = [0.8, 0.8, 0.9, 1.0, 1.1, 1.2, 1.2, 1.2, 1.0, 0.9, 0.8, 0.8]; // Higher in summer, lower in winter
    processedData.water.yearlyData = generateYearlyDataWithPattern(5000, 9000, waterSeasonalFactors);

    // Set up office consumables data with quarterly patterns
    processedData.office.yearlyData = {
        'Papel Universal': 198.56,
        'Marcador': 34.36,
        'Internet': 50,
        'Treballs': 454.72
    };

    // Set up cleaning products data
    processedData.cleaning.yearlyData = {
        'WC': 620.05,
        'Extraordinaris': 2548.02
    };
}

// Generate yearly data with seasonal patterns
function generateYearlyDataWithPattern(minValue, maxValue, seasonalFactors) {
    const yearlyData = [];
    const now = new Date();
    const currentYear = now.getFullYear();

    for (let month = 0; month < 12; month++) {
        const baseValue = minValue + Math.random() * (maxValue - minValue);
        const seasonalValue = baseValue * seasonalFactors[month];

        yearlyData.push({
            month: month,
            monthName: MONTHS[month],
            year: currentYear,
            value: seasonalValue
        });
    }

    return yearlyData;
}

// Render the dashboard
function renderDashboard() {
    renderElectricChart();
    renderWaterChart();
    renderOfficeChart();
    renderCleaningChart();
    updateDashboardStats();
}

// Render electricity chart
function renderElectricChart() {
    const ctx = document.getElementById('electricChart').getContext('2d');

    // Solo usar datos reales, no usar datos generados
    const data = processedData.electric.monthly;

    // Si no hay datos, mostrar un gráfico vacío o un mensaje
    if (data.length === 0) {
        // Opción 1: Mostrar gráfico vacío
        electricChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Consum Elèctric (kWh)',
                    data: [],
                    backgroundColor: CHART_COLORS.electric,
                    borderColor: CHART_COLORS.electric.replace('0.7', '1'),
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
        return;
    }

    // Si hay datos, continúa normalmente
    const labels = data.map(item => item.monthName);
    const values = data.map(item => item.value);

    // Crear gráfico con datos reales
    electricChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Consum Elèctric (kWh)',
                data: values,
                backgroundColor: CHART_COLORS.electric,
                borderColor: CHART_COLORS.electric.replace('0.7', '1'),
                borderWidth: 2,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

// Render water chart
function renderWaterChart() {
    const ctx = document.getElementById('waterChart').getContext('2d');

    // Solo usar datos reales, no usar datos generados
    const data = processedData.water.monthly;

    // Si no hay datos, mostrar un gráfico vacío o un mensaje
    if (data.length === 0) {
        // Opción 1: Mostrar gráfico vacío
        waterChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Consum d\'Aigua (m³)',
                    data: [],
                    backgroundColor: CHART_COLORS.water,
                    borderColor: CHART_COLORS.water.replace('0.7', '1'),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
        return;
    }

    // Si hay datos, continúa normalmente
    const labels = data.map(item => item.monthName);
    const values = data.map(item => item.value);

    // Crear gráfico con datos reales
    waterChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Consum d\'Aigua (m³)',
                data: values,
                backgroundColor: CHART_COLORS.water,
                borderColor: CHART_COLORS.water.replace('0.7', '1'),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

// Render office consumables chart
function renderOfficeChart() {
    const ctx = document.getElementById('officeChart').getContext('2d');

    // Prepare chart data from categories
    const data = processedData.office.categories || processedData.office.yearlyData;
    const labels = Object.keys(data);
    const values = Object.values(data);

    // Create chart
    officeChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    'rgba(155, 89, 182, 0.7)',
                    'rgba(142, 68, 173, 0.7)',
                    'rgba(127, 140, 141, 0.7)',
                    'rgba(116, 185, 255, 0.7)'
                ],
                borderColor: [
                    'rgba(155, 89, 182, 1)',
                    'rgba(142, 68, 173, 1)',
                    'rgba(127, 140, 141, 1)',
                    'rgba(116, 185, 255, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

// Render cleaning products chart
function renderCleaningChart() {
    const ctx = document.getElementById('cleaningChart').getContext('2d');

    // Prepare chart data from categories
    const data = processedData.cleaning.categories || processedData.cleaning.yearlyData;
    const labels = Object.keys(data);
    const values = Object.values(data);

    // Create chart
    cleaningChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    'rgba(22, 160, 133, 0.7)',
                    'rgba(39, 174, 96, 0.7)'
                ],
                borderColor: [
                    'rgba(22, 160, 133, 1)',
                    'rgba(39, 174, 96, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}

// Update dashboard statistics
function updateDashboardStats() {
    // Electric stats
    let electricTotal = 0;
    let electricData = processedData.electric.monthly;

    electricData.forEach(item => {
        electricTotal += item.value;
    });

    const electricAvg = electricData.length > 0 ? electricTotal / electricData.length : 0;
    document.getElementById('electric-total').textContent = electricTotal.toFixed(2);
    document.getElementById('electric-avg').textContent = electricAvg.toFixed(2);

    // Water stats
    let waterTotal = 0;
    let waterData = processedData.water.monthly;

    waterData.forEach(item => {
        waterTotal += item.value;
    });

    const waterAvg = waterData.length > 0 ? waterTotal / waterData.length : 0;
    document.getElementById('water-total').textContent = waterTotal.toFixed(2);
    document.getElementById('water-avg').textContent = waterAvg.toFixed(2);

    // Office stats
    const officeData = processedData.office.categories || processedData.office.yearlyData;
    let officeTotal = Object.values(officeData).reduce((sum, value) => sum + value, 0);
    document.getElementById('office-total').textContent = officeTotal.toFixed(2);

    // Find highest category
    let highestCategory = '';
    let highestValue = 0;

    for (const [category, value] of Object.entries(officeData)) {
        if (value > highestValue) {
            highestValue = value;
            highestCategory = category;
        }
    }

    document.getElementById('office-distribution').textContent = `${highestCategory} (${((highestValue / officeTotal) * 100).toFixed(1)}%)`;

    // Cleaning stats
    const cleaningData = processedData.cleaning.categories || processedData.cleaning.yearlyData;
    let cleaningTotal = Object.values(cleaningData).reduce((sum, value) => sum + value, 0);
    document.getElementById('cleaning-total').textContent = cleaningTotal.toFixed(2);
    document.getElementById('cleaning-trend').textContent = 'Estable';
}

// Calculate initial predictions for calculator section
function calculateInitialPredictions() {
    // Calculate predictions for next year
    calculatePredictions('nextYear');
}

// Calculate predictions based on the selected period
function calculatePredictions(period) {
    let electricPrediction, waterPrediction, officePrediction, cleaningPrediction;
    let electricComparison, waterComparison, officeComparison, cleaningComparison;

    // Get current totals
    const electricData = processedData.electric.monthly.length > 0 ?
        processedData.electric.monthly :
        processedData.electric.yearlyData;
    const waterData = processedData.water.monthly.length > 0 ?
        processedData.water.monthly :
        processedData.water.yearlyData;

    const currentElectricTotal = electricData.reduce((sum, item) => sum + item.value, 0);
    const currentWaterTotal = waterData.reduce((sum, item) => sum + item.value, 0);

    const officeData = processedData.office.categories || processedData.office.yearlyData;
    const cleaningData = processedData.cleaning.categories || processedData.cleaning.yearlyData;

    const currentOfficeTotal = Object.values(officeData).reduce((sum, value) => sum + value, 0);
    const currentCleaningTotal = Object.values(cleaningData).reduce((sum, value) => sum + value, 0);

    // Calculate predictions based on period
    if (period === 'nextYear') {
        // Predictions for next year (add some variance)
        electricPrediction = currentElectricTotal * (1 + (Math.random() * 0.1 - 0.05)); // +/- 5%
        waterPrediction = currentWaterTotal * (1 + (Math.random() * 0.15 - 0.05)); // +/- 5-10%
        officePrediction = currentOfficeTotal * (1 + (Math.random() * 0.08 - 0.02)); // +/- 2-6%
        cleaningPrediction = currentCleaningTotal * (1 + (Math.random() * 0.07)); // +0-7%

        // Calculate comparisons
        electricComparison = ((electricPrediction / currentElectricTotal) - 1) * 100;
        waterComparison = ((waterPrediction / currentWaterTotal) - 1) * 100;
        officeComparison = ((officePrediction / currentOfficeTotal) - 1) * 100;
        cleaningComparison = ((cleaningPrediction / currentCleaningTotal) - 1) * 100;
    } else if (period === 'nextCourse') {
        // Predictions for next course (September-June, 10 months)
        const courseRatio = 10 / 12; // 10 months out of 12

        electricPrediction = currentElectricTotal * courseRatio * (1 + (Math.random() * 0.08 - 0.03));
        waterPrediction = currentWaterTotal * courseRatio * (1 + (Math.random() * 0.1 - 0.02));
        officePrediction = currentOfficeTotal * courseRatio * (1 + (Math.random() * 0.12));
        cleaningPrediction = currentCleaningTotal * courseRatio * (1 + (Math.random() * 0.05));

        // Calculate comparisons (against 10/12 of current)
        electricComparison = ((electricPrediction / (currentElectricTotal * courseRatio)) - 1) * 100;
        waterComparison = ((waterPrediction / (currentWaterTotal * courseRatio)) - 1) * 100;
        officeComparison = ((officePrediction / (currentOfficeTotal * courseRatio)) - 1) * 100;
        cleaningComparison = ((cleaningPrediction / (currentCleaningTotal * courseRatio)) - 1) * 100;
    } else if (period === 'custom') {
        // Get custom dates
        const startDate = new Date(document.getElementById('start-date').value);
        const endDate = new Date(document.getElementById('end-date').value);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            alert('Si us plau, selecciona dates vàlides');
            return;
        }

        // Calculate days in period
        const days = Math.round((endDate - startDate) / (1000 * 60 * 60 * 24));
        const ratio = days / 365;

        // Adjust for seasonality (simplified approach)
        let seasonalFactor = 1;
        const startMonth = startDate.getMonth();
        const endMonth = endDate.getMonth();

        if (startMonth <= 1 && endMonth >= 1) seasonalFactor += 0.1; // Winter months
        if (startMonth <= 7 && endMonth >= 7) seasonalFactor -= 0.05; // Summer months

        electricPrediction = currentElectricTotal * ratio * seasonalFactor;
        waterPrediction = currentWaterTotal * ratio * ((seasonalFactor < 1) ? 1.1 : 0.9); // Inverse seasonal effect
        officePrediction = currentOfficeTotal * ratio;
        cleaningPrediction = currentCleaningTotal * ratio;

        // Calculate comparisons (against ratio of current)
        electricComparison = ((electricPrediction / (currentElectricTotal * ratio)) - 1) * 100;
        waterComparison = ((waterPrediction / (currentWaterTotal * ratio)) - 1) * 100;
        officeComparison = ((officePrediction / (currentOfficeTotal * ratio)) - 1) * 100;
        cleaningComparison = ((cleaningPrediction / (currentCleaningTotal * ratio)) - 1) * 100;
    }

    // Update the UI with predictions
    document.getElementById('electric-prediction').textContent = `${electricPrediction.toFixed(2)} kWh`;
    document.getElementById('water-prediction').textContent = `${waterPrediction.toFixed(2)} m³`;
    document.getElementById('office-prediction').textContent = `${officePrediction.toFixed(2)} €`;
    document.getElementById('cleaning-prediction').textContent = `${cleaningPrediction.toFixed(2)} €`;

    // Update comparisons with appropriate classes
    updateComparisonElement('electric-comparison', electricComparison);
    updateComparisonElement('water-comparison', waterComparison);
    updateComparisonElement('office-comparison', officeComparison);
    updateComparisonElement('cleaning-comparison', cleaningComparison);
}

// Update comparison element with value and appropriate color
function updateComparisonElement(elementId, value) {
    const element = document.getElementById(elementId);
    const formattedValue = value.toFixed(1);
    let symbol, className;

    if (value > 0) {
        symbol = '+';
        className = 'increase';
    } else if (value < 0) {
        symbol = '';
        className = 'decrease';
    } else {
        symbol = '';
        className = '';
    }

    element.textContent = `${symbol}${formattedValue}%`;
    element.className = className;
}

// Calculate potential savings estimates
function calculateSavingsEstimates() {
    // Calculate electric savings (15-25% potential savings)
    const electricData = processedData.electric.monthly.length > 0 ?
        processedData.electric.monthly :
        processedData.electric.yearlyData;
    const currentElectricTotal = electricData.reduce((sum, item) => sum + item.value, 0);
    const electricSavingsPercent = 15 + Math.random() * 10; // 15-25%
    const electricSavings = currentElectricTotal * (electricSavingsPercent / 100);
    document.getElementById('electric-savings').textContent = electricSavings.toFixed(2);

    // Calculate water savings (10-20% potential savings)
    const waterData = processedData.water.monthly.length > 0 ?
        processedData.water.monthly :
        processedData.water.yearlyData;
    const currentWaterTotal = waterData.reduce((sum, item) => sum + item.value, 0);
    const waterSavingsPercent = 10 + Math.random() * 10; // 10-20%
    const waterSavings = currentWaterTotal * (waterSavingsPercent / 100);
    document.getElementById('water-savings').textContent = waterSavings.toFixed(2);

    // Calculate office consumables savings (20-30% potential savings)
    const officeData = processedData.office.categories || processedData.office.yearlyData;
    const currentOfficeTotal = Object.values(officeData).reduce((sum, value) => sum + value, 0);
    const officeSavingsPercent = 20 + Math.random() * 10; // 20-30%
    const officeSavings = currentOfficeTotal * (officeSavingsPercent / 100);
    document.getElementById('office-savings').textContent = officeSavings.toFixed(2);

    // Calculate cleaning products savings (5-15% potential savings)
    const cleaningData = processedData.cleaning.categories || processedData.cleaning.yearlyData;
    const currentCleaningTotal = Object.values(cleaningData).reduce((sum, value) => sum + value, 0);
    const cleaningSavingsPercent = 5 + Math.random() * 10; // 5-15%
    const cleaningSavings = currentCleaningTotal * (cleaningSavingsPercent / 100);
    document.getElementById('cleaning-savings').textContent = cleaningSavings.toFixed(2);
}

// Set up event listeners
function setupEventListeners() {
    // Date range change for dashboard
    document.getElementById('date-range').addEventListener('change', function() {
        // Update charts based on selected range
        // This would filter data based on the selected range
        // For this demo, we'll just redraw the charts
        if (electricChart) electricChart.destroy();
        if (waterChart) waterChart.destroy();
        renderElectricChart();
        renderWaterChart();
        updateDashboardStats();
    });


    // Export to PDF button
document.getElementById('export-pdf').addEventListener('click', function() {
    const { jsPDF } = window.jspdf;

    // Create a new PDF document
    const doc = new jsPDF('landscape', 'mm', 'a4');
    const dashboardSection = document.getElementById('dashboard');

    // Add title
    doc.setFontSize(18);
    doc.text('Informe d\'Estalvi Energètic - ITB', 14, 15);

    // Add date
    const today = new Date();
    doc.setFontSize(10);
    doc.text(`Data de generació: ${today.toLocaleDateString('ca-ES')}`, 14, 22);

    // Capture each chart and add it to the PDF
    const promises = [];
    const chartCanvases = dashboardSection.querySelectorAll('.chart-container canvas');

    chartCanvases.forEach((canvas, index) => {
        promises.push(html2canvas(canvas).then(canvas => {
            // Convert the canvas to an image
            const imgData = canvas.toDataURL('image/png');

            // Calculate position
            const imgWidth = 120;
            const imgHeight = canvas.height * imgWidth / canvas.width;

            // Position in a 2x2 grid
            const xPos = (index % 2 === 0) ? 14 : 150;
            const yPos = (index < 2) ? 30 : 110;

            // Add image to PDF
            doc.addImage(imgData, 'PNG', xPos, yPos, imgWidth, imgHeight);
        }));
    });

    // Get stats data
    Promise.all(promises).then(() => {
        // Add statistics section
        doc.addPage();
        doc.setFontSize(16);
        doc.text('Estadístiques i Prediccions', 14, 15);

        // Electric stats
        doc.setFontSize(12);
        doc.text('Consum Elèctric:', 14, 25);
        doc.setFontSize(10);
        doc.text(`Total: ${document.getElementById('electric-total').textContent} kWh`, 20, 32);
        doc.text(`Mitjana mensual: ${document.getElementById('electric-avg').textContent} kWh`, 20, 38);
        doc.text(`Predicció: ${document.getElementById('electric-prediction').textContent}`, 20, 44);
        doc.text(`Estalvi potencial: ${document.getElementById('electric-savings').textContent} kWh/any`, 20, 50);

        // Water stats
        doc.setFontSize(12);
        doc.text('Consum d\'Aigua:', 14, 60);
        doc.setFontSize(10);
        doc.text(`Total: ${document.getElementById('water-total').textContent} m³`, 20, 67);
        doc.text(`Mitjana mensual: ${document.getElementById('water-avg').textContent} m³`, 20, 73);
        doc.text(`Predicció: ${document.getElementById('water-prediction').textContent}`, 20, 79);
        doc.text(`Estalvi potencial: ${document.getElementById('water-savings').textContent} m³/any`, 20, 85);

        // Office consumables stats
        doc.setFontSize(12);
        doc.text('Consumibles d\'Oficina:', 120, 25);
        doc.setFontSize(10);
        doc.text(`Total: ${document.getElementById('office-total').textContent} €`, 126, 32);
        doc.text(`Distribució: ${document.getElementById('office-distribution').textContent}`, 126, 38);
        doc.text(`Predicció: ${document.getElementById('office-prediction').textContent}`, 126, 44);
        doc.text(`Estalvi potencial: ${document.getElementById('office-savings').textContent} €/any`, 126, 50);

        // Cleaning products stats
        doc.setFontSize(12);
        doc.text('Productes de Neteja:', 120, 60);
        doc.setFontSize(10);
        doc.text(`Total: ${document.getElementById('cleaning-total').textContent} €`, 126, 67);
        doc.text(`Tendència: ${document.getElementById('cleaning-trend').textContent}`, 126, 73);
        doc.text(`Predicció: ${document.getElementById('cleaning-prediction').textContent}`, 126, 79);
        doc.text(`Estalvi potencial: ${document.getElementById('cleaning-savings').textContent} €/any`, 126, 85);

        // Add footer
        doc.setFontSize(8);
        doc.text('© 2025 - Calculadora d\'Estalvi Energètic - Institut Tecnològic de Barcelona', 14, 200);

        // Save the PDF
        doc.save('Informe_Estalvi_Energetic_ITB.pdf');
    });
});

    // Period selector for predictions
    document.getElementById('prediction-period').addEventListener('change', function() {
        const periodType = this.value;
        const customPeriodContainer = document.getElementById('custom-period-container');

        if (periodType === 'custom') {
            customPeriodContainer.style.display = 'flex';
        } else {
            customPeriodContainer.style.display = 'none';
        }
    });

    // Calculate button for predictions
    document.getElementById('calculate-btn').addEventListener('click', function() {
        const periodType = document.getElementById('prediction-period').value;
        calculatePredictions(periodType);
    });
}

// Helper function to format date as YYYY-MM-DD
function formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Helper function to get random number between min and max
function getRandomInRange(min, max) {
    return min + Math.random() * (max - min);
}

// Crear el botón de flecha dinámicamente
const scrollToTopBtn = document.createElement('div');
scrollToTopBtn.innerHTML = '⬆';
scrollToTopBtn.id = 'scrollToTop';
document.body.appendChild(scrollToTopBtn);

// Estilos dinámicos con JavaScript
const style = document.createElement('style');
style.innerHTML = `
    #scrollToTop {
        position: fixed;
        bottom: 185px; /* Más arriba */
        right: 150px;  /* Más a la izquierda */
        width: 55px;
        height: 55px;
        background: linear-gradient(135deg, #ff416c, #ff4b2b);
        color: white;
        font-size: 28px;
        text-align: center;
        line-height: 55px;
        border-radius: 50%;
        box-shadow: 0 8px 15px rgba(255, 75, 43, 0.3);
        cursor: pointer;
        transition: all 0.4s ease;
        opacity: 0;
        transform: translateY(20px) scale(0.9);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: bold;
        text-shadow: 2px 2px 10px rgba(0,0,0,0.2);
    }

    #scrollToTop:hover {
        background: linear-gradient(135deg, #ff4b2b, #ff416c);
        box-shadow: 0 10px 20px rgba(255, 75, 43, 0.4);
        transform: translateY(-5px) scale(1);
    }

    #scrollToTop.show {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
`;
document.head.appendChild(style);

// Mostrar o ocultar el botón al hacer scroll
window.addEventListener('scroll', () => {
    if (window.scrollY > 300) {
        scrollToTopBtn.classList.add('show');
    } else {
        scrollToTopBtn.classList.remove('show');
    }
});

// Evento para hacer scroll suave al inicio
scrollToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
});