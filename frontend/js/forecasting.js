// Forecasting algorithms and utilities
class ForecastingEngine {
    constructor() {
        this.algorithms = {
            moving_average: this.movingAverage.bind(this),
            linear_regression: this.linearRegression.bind(this)
        };
    }

    // Moving Average Algorithm
    movingAverage(salesData, windowSize = 7) {
        if (salesData.length < windowSize) {
            // If not enough data, use simple average
            const sum = salesData.reduce((acc, val) => acc + val, 0);
            return salesData.length > 0 ? sum / salesData.length : 0;
        }

        // Calculate moving average using the last 'windowSize' data points
        const recentData = salesData.slice(-windowSize);
        const sum = recentData.reduce((acc, val) => acc + val, 0);
        return sum / windowSize;
    }

    // Linear Regression Algorithm
    linearRegression(salesData, forecastPeriod = 7) {
        if (salesData.length < 2) {
            return salesData.length > 0 ? salesData[0] : 0;
        }

        const n = salesData.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

        // Calculate sums for linear regression formula
        for (let i = 0; i < n; i++) {
            const x = i + 1; // Time period (1, 2, 3, ...)
            const y = salesData[i]; // Sales value
            
            sumX += x;
            sumY += y;
            sumXY += x * y;
            sumXX += x * x;
        }

        // Calculate slope (m) and intercept (b) for y = mx + b
        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        // Predict next value
        const nextX = n + 1;
        const prediction = slope * nextX + intercept;

        return Math.max(0, prediction); // Ensure non-negative prediction
    }

    // Exponential Smoothing Algorithm
    exponentialSmoothing(salesData, alpha = 0.3) {
        if (salesData.length === 0) return 0;
        if (salesData.length === 1) return salesData[0];

        let forecast = salesData[0];
        
        for (let i = 1; i < salesData.length; i++) {
            forecast = alpha * salesData[i] + (1 - alpha) * forecast;
        }

        return forecast;
    }

    // Generate forecast for multiple periods
    generateForecast(salesData, method = 'moving_average', periods = 7, options = {}) {
        const algorithm = this.algorithms[method];
        if (!algorithm) {
            throw new Error(`Unknown forecasting method: ${method}`);
        }

        const forecasts = [];
        let currentData = [...salesData];

        for (let i = 0; i < periods; i++) {
            const forecast = algorithm(currentData, options.windowSize || 7);
            forecasts.push(forecast);
            
            // For multi-period forecasting, add the forecast to the data
            // This allows the next prediction to consider the previous forecast
            currentData.push(forecast);
        }

        return forecasts;
    }

    // Calculate forecast accuracy metrics
    calculateAccuracy(actualData, forecastData) {
        if (actualData.length !== forecastData.length || actualData.length === 0) {
            return { mae: 0, mape: 0, rmse: 0 };
        }

        let sumAbsoluteError = 0;
        let sumPercentageError = 0;
        let sumSquaredError = 0;
        let validPoints = 0;

        for (let i = 0; i < actualData.length; i++) {
            const actual = actualData[i];
            const forecast = forecastData[i];
            
            if (actual !== null && forecast !== null && !isNaN(actual) && !isNaN(forecast)) {
                const absoluteError = Math.abs(actual - forecast);
                sumAbsoluteError += absoluteError;
                sumSquaredError += Math.pow(actual - forecast, 2);
                
                if (actual !== 0) {
                    sumPercentageError += Math.abs((actual - forecast) / actual) * 100;
                }
                
                validPoints++;
            }
        }

        if (validPoints === 0) {
            return { mae: 0, mape: 0, rmse: 0 };
        }

        return {
            mae: sumAbsoluteError / validPoints, // Mean Absolute Error
            mape: sumPercentageError / validPoints, // Mean Absolute Percentage Error
            rmse: Math.sqrt(sumSquaredError / validPoints) // Root Mean Square Error
        };
    }

    // Prepare sales data for forecasting
    prepareSalesData(sales, productId, days = 30) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - days);

        // Filter sales for the specific product within the date range
        const productSales = sales.filter(sale => {
            const saleDate = new Date(sale.date.seconds ? sale.date.seconds * 1000 : sale.date);
            return sale.productId === productId && 
                   saleDate >= startDate && 
                   saleDate <= endDate;
        });

        // Group sales by date
        const dailySales = {};
        
        // Initialize all days with 0 sales
        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            dailySales[dateStr] = 0;
        }

        // Add actual sales data
        productSales.forEach(sale => {
            const saleDate = new Date(sale.date.seconds ? sale.date.seconds * 1000 : sale.date);
            const dateStr = saleDate.toISOString().split('T')[0];
            dailySales[dateStr] += sale.quantity;
        });

        // Convert to array of values
        return Object.values(dailySales);
    }

    // Calculate restock recommendations
    calculateRestockRecommendations(products, sales, forecastPeriod = 30) {
        const recommendations = [];

        products.forEach(product => {
            const salesData = this.prepareSalesData(sales, product.id, 30);
            const avgDailySales = salesData.reduce((sum, val) => sum + val, 0) / salesData.length;
            
            
            // Forecast demand for the specified period
            const forecastedDemand = this.movingAverage(salesData) * forecastPeriod;
            
            // Calculate days until stock out
            const daysUntilStockOut = avgDailySales > 0 ? Math.floor(product.stock / avgDailySales) : Infinity;
            
            // Determine if restock is needed
            const needsRestock = product.stock <= product.reorderLevel || 
                               daysUntilStockOut <= forecastPeriod;

            if (needsRestock) {
                // Calculate recommended order quantity
                const safetyStock = product.reorderLevel;
                const forecastedConsumption = avgDailySales * (forecastPeriod + 7); // Add 7 days buffer
                const recommendedOrder = Math.max(
                    safetyStock + forecastedConsumption - product.stock,
                    product.reorderLevel * 2 // Minimum order
                );

                // Determine priority
                let priority = 'low';
                if (daysUntilStockOut <= 7) {
                    priority = 'high';
                } else if (daysUntilStockOut <= 14) {
                    priority = 'medium';
                }

                recommendations.push({
                    product: product,
                    currentStock: product.stock,
                    avgDailySales: avgDailySales,
                    forecastedDemand: forecastedDemand,
                    daysUntilStockOut: daysUntilStockOut,
                    recommendedOrder: Math.ceil(recommendedOrder),
                    priority: priority
                });
            }
        });

        // Sort by priority and days until stock out
        recommendations.sort((a, b) => {
            const priorityOrder = { high: 3, medium: 2, low: 1 };
            if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
                return priorityOrder[b.priority] - priorityOrder[a.priority];
            }
            return a.daysUntilStockOut - b.daysUntilStockOut;
        });

        return recommendations;
    }

    // Generate detailed forecast for all products
    generateDetailedForecast(products, sales, method = 'moving_average', period = 7) {
        const forecasts = [];

        products.forEach(product => {
            const salesData = this.prepareSalesData(sales, product.id, 30);
            const avgDailySales = salesData.reduce((sum, val) => sum + val, 0) / salesData.length;
            
            // Generate forecast
            const forecastedDemand = this.generateForecast(salesData, method, period);
            const totalForecastedDemand = forecastedDemand.reduce((sum, val) => sum + val, 0);
            
            // Determine stock status
            let stockStatus = 'normal';
            if (product.stock <= product.reorderLevel) {
                stockStatus = 'critical';
            } else if (totalForecastedDemand > product.stock) {
                stockStatus = 'warning';
            } else if (product.stock > product.reorderLevel * 3) {
                stockStatus = 'excess';
            }

            forecasts.push({
                product: product,
                avgDailySales: avgDailySales,
                forecastPeriod: period,
                forecastedDemand: totalForecastedDemand,
                dailyForecasts: forecastedDemand,
                stockStatus: stockStatus,
                daysUntilStockOut: avgDailySales > 0 ? Math.floor(product.stock / avgDailySales) : Infinity
            });
        });

        return forecasts;
    }

    // Calculate seasonal adjustments (basic implementation)
    calculateSeasonalAdjustment(salesData, period = 7) {
        if (salesData.length < period * 2) {
            return 1; // No adjustment if insufficient data
        }

        const seasonalFactors = [];
        const avgSales = salesData.reduce((sum, val) => sum + val, 0) / salesData.length;

        for (let i = 0; i < period; i++) {
            let seasonSum = 0;
            let seasonCount = 0;

            for (let j = i; j < salesData.length; j += period) {
                seasonSum += salesData[j];
                seasonCount++;
            }

            const seasonAvg = seasonCount > 0 ? seasonSum / seasonCount : avgSales;
            seasonalFactors.push(avgSales > 0 ? seasonAvg / avgSales : 1);
        }

        return seasonalFactors;
    }
}

// Export for use in other modules
window.ForecastingEngine = ForecastingEngine;
