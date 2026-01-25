const express = require('express');
const authMiddleware = require('../middleware/auth');
const router = express.Router();

// Test Up Bank connection
router.get('/test-up', async (req, res) => {
  try {
    const response = await fetch('https://api.up.com.au/api/v1/util/ping', {
      headers: {
        'Authorization': `Bearer ${process.env.UP_API_KEY}`
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching data from Up API:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get all accounts from Up Bank
router.get('/accounts', async (req, res) => {
  try {
    const response = await fetch('https://api.up.com.au/api/v1/accounts', {
      headers: {
        'Authorization': `Bearer ${process.env.UP_API_KEY}`
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching accounts from Up API:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Get all transactions from Up Bank
router.get('/all', authMiddleware, async (req, res) => {
  try {
    const response = await fetch('https://api.up.com.au/api/v1/transactions', {
      headers: {
        'Authorization': `Bearer ${process.env.UP_API_KEY}`
      }
    });
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error('Error fetching transactions from Up API:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
