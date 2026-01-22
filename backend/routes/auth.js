const express = require('express');
const User = require('../models/user');
const router = express.Router();

// signup
router.post('/signup', async (req, res) => {
    try{
        const { username, password } = req.body;
        const user = new User({username, password});
        await user.save();
    } catch (error) {
        console.error('Error during signup:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }

    res.send('Signup route');
});

// signin

// change password

module.exports = router;
