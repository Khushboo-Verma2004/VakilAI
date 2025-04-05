const express = require('express');
const cors = require('cors');
const path = require('path');
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 


const lawyers = [
  {
    "id": 1,
    "name": "Amit Sharma",
    "specialization": "Criminal Law",
    "location": {
      "city": "Delhi",
      "state": "Delhi",
      "coordinates": [28.6139, 77.2090]
    },
    "experience_years": 12,
    "contact": {
      "phone": "+91-9876543210",
      "email": "amit.sharma@lawfirm.in"
    },
    "age": 38,
    "fees": 5000,
    "rating": 4.7
  },
  {
    "id": 2,
    "name": "Priya Patel",
    "specialization": "Family Law",
    "location": {
      "city": "Mumbai",
      "state": "Maharashtra",
      "coordinates": [19.0760, 72.8777]
    },
    "experience_years": 8,
    "contact": {
      "phone": "+91-9123456789",
      "email": "priya.patel@lawfirm.in"
    },
    "age": 34,
    "fees": 4000,
    "rating": 4.5
  },
  {
    "id": 3,
    "name": "Rahul Verma",
    "specialization": "Corporate Law",
    "location": {
      "city": "Bengaluru",
      "state": "Karnataka",
      "coordinates": [12.9716, 77.5946]
    },
    "experience_years": 15,
    "contact": {
      "phone": "+91-9988776655",
      "email": "rahul.verma@lawfirm.in"
    },
    "age": 42,
    "fees": 7000,
    "rating": 4.8
  },
  {
    "id": 4,
    "name": "Sneha Gupta",
    "specialization": "Intellectual Property",
    "location": {
      "city": "Kolkata",
      "state": "West Bengal",
      "coordinates": [22.5726, 88.3639]
    },
    "experience_years": 10,
    "contact": {
      "phone": "+91-9765432109",
      "email": "sneha.gupta@lawfirm.in"
    },
    "age": 36,
    "fees": 4500,
    "rating": 4.6
  }
];

// Root route
app.get('/', (req, res) => {
  res.send('Lawyer Search API is running. Use /api/lawyers endpoint.');
});

// API endpoint - moved before catch-all route
app.get('/api/lawyers', (req, res) => {
  try {
    const location = req.query.location ? req.query.location.toLowerCase().trim() : '';
    const specialization = req.query.specialization ? req.query.specialization.toLowerCase().trim() : '';
    
    const filteredLawyers = lawyers.filter(lawyer => {
      const cityMatch = lawyer.location.city.toLowerCase().includes(location);
      const stateMatch = lawyer.location.state.toLowerCase().includes(location);
      const matchesLocation = location === '' || cityMatch || stateMatch;
      const matchesSpecialization = specialization === '' || 
        lawyer.specialization.toLowerCase().includes(specialization);
      
      return matchesLocation && matchesSpecialization;
    });

    res.json(filteredLawyers);
  } catch (error) {
    console.error('Error in /api/lawyers:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Catch-all route - MUST come after all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});