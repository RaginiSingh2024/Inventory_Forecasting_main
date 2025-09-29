# Backend - Inventory Forecasting Application

This is the backend configuration for the Inventory Forecasting Web Application using Firebase.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- Firebase CLI
- Firebase project setup

### Installation
```bash
npm install
```

### Firebase Setup
```bash
# Login to Firebase
npm run login

# Initialize Firebase (if not already done)
npm run init

# List available projects
npm run projects

# Use a specific project
npm run use
```

### Development
```bash
# Start Firebase emulators
npm run emulators:start

# Start emulators with UI
npm run emulators:ui

# Export emulator data
npm run emulators:export
```

### Deployment
```bash
# Deploy everything
npm run deploy

# Deploy only hosting
npm run deploy:hosting

# Deploy only Firestore rules
npm run deploy:firestore
```

## 📁 Structure

```
backend/
├── firebase.json          # Firebase configuration
├── firestore.rules       # Firestore security rules
├── package.json          # Dependencies and scripts
└── README.md             # This file
```

## 🔧 Firebase Configuration

### Firestore Database
- **Collections**: `users`, `products`, `sales`, `forecasts`
- **Security Rules**: User-based data isolation
- **Indexes**: Optimized for queries

### Authentication
- **Providers**: Email/Password
- **Security**: Session management
- **Demo Mode**: Available for testing

### Hosting
- **Static Files**: Frontend deployment
- **Custom Domain**: Configurable
- **SSL**: Automatic HTTPS

## 🔒 Security Rules

The Firestore security rules ensure:
- User data isolation
- Authenticated access only
- Read/write permissions per user
- Data validation

## 📊 Database Schema

### Users Collection
```javascript
users/{userId} {
  email: string,
  createdAt: timestamp,
  lastLogin: timestamp
}
```

### Products Collection
```javascript
users/{userId}/products/{productId} {
  name: string,
  category: string,
  price: number,
  stock: number,
  reorderLevel: number,
  description: string,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Sales Collection
```javascript
users/{userId}/sales/{saleId} {
  productId: string,
  productName: string,
  quantity: number,
  unitPrice: number,
  totalAmount: number,
  date: timestamp,
  createdAt: timestamp
}
```

## 🚀 Deployment Commands

```bash
# Full deployment
npm run deploy

# Hosting only
npm run deploy:hosting

# Firestore rules only
npm run deploy:firestore

# Validate rules
npm run validate:rules
```

## 🔧 Environment Setup

1. Create a Firebase project
2. Enable Firestore Database
3. Enable Authentication (Email/Password)
4. Configure hosting
5. Update `firebase.json` if needed

## 📱 Emulator Testing

```bash
# Start all emulators
npm run emulators:start

# Access emulator UI
# http://localhost:4000
```

## 🔗 Dependencies

- **firebase-admin**: Server-side Firebase SDK
- **firebase-functions**: Cloud Functions (if needed)
- **firebase-tools**: CLI tools for deployment
