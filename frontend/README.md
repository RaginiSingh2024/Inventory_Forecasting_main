# Frontend - Inventory Forecasting Application

This is the frontend client-side application for the Inventory Forecasting Web Application.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- Python 3 (for local development server)

### Installation
```bash
npm install
```

### Development
```bash
# Start development server on port 3000
npm run dev

# Start production server on port 8080
npm start

# Alternative server on port 9000
npm run serve
```

## 📁 Structure

```
frontend/
├── index.html              # Login page
├── dashboard.html          # Main dashboard
├── products.html           # Product management
├── sales.html             # Sales management
├── forecast.html          # Demand forecasting
├── reports.html           # Reports and analytics
├── js/                    # JavaScript modules
│   ├── auth.js            # Authentication logic
│   ├── dashboard.js       # Dashboard functionality
│   ├── products.js        # Product management
│   ├── sales.js           # Sales management
│   ├── forecasting.js     # Forecasting algorithms
│   └── ...               # Other modules
└── styles/
    └── main.css           # Main stylesheet
```

## 🔧 Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Dashboard**: Live inventory statistics and charts
- **Product Management**: CRUD operations for products
- **Sales Tracking**: Record and track sales transactions
- **Demand Forecasting**: Predict future inventory needs
- **Reports & Analytics**: Generate detailed reports
- **User Authentication**: Secure login system

## 🎨 Styling

The application uses a clean, professional light theme with:
- White backgrounds
- Standard color scheme
- Responsive grid layouts
- Interactive charts using Chart.js
- Font Awesome icons

## 🔗 Dependencies

- **Chart.js**: For data visualization
- **Firebase**: For authentication and database
- **Font Awesome**: For icons

## 📱 Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## 🚀 Deployment

The frontend can be deployed to:
- Firebase Hosting
- Netlify
- Vercel
- Any static hosting service

```bash
# Deploy to Firebase (from backend directory)
cd ../backend && npm run deploy:hosting
```
