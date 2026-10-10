import express from 'express';
import jwt from 'jsonwebtoken';
import dbService from '../services/dbService.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'nexora_telemedicine_super_secure_jwt_secret_2026';

// POST /api/auth/register (New User Registration)
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role = 'patient', phone, age, gender, village } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Name, email, and password are required.',
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Password must be at least 6 characters.',
      });
    }

    const existingUser = await dbService.findUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'Conflict',
        message: 'A user with this email address is already registered.',
      });
    }

    const userCount = Math.floor(Math.random() * 9000 + 1000);
    const id = role === 'doctor' ? `doc-${userCount}` : `pat-${userCount}`;
    const healthId = role === 'patient' ? `NX-${userCount}-${Date.now().toString().slice(-4)}` : undefined;

    const newUser = await dbService.createUser({
      id,
      email,
      password,
      name,
      fullName: name,
      role,
      phone: phone || '+91 98000 00000',
      age: age ? Number(age) : 40,
      gender: gender || 'Male',
      village: village || 'Rural Outpost',
      healthId,
      bloodGroup: 'B+',
      primaryKiosk: 'Community Tele-Kiosk',
      allergies: ['None known'],
      existingConditions: [],
      currentMedications: [],
      previousDiagnoses: [],
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        id: newUser.id,
        role: newUser.role,
        name: newUser.name,
        email: newUser.email,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      success: true,
      message: `Account created successfully as ${newUser.role}`,
      token,
      user: newUser,
    });
  } catch (err) {
    console.error('[Auth Register Error]:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: err.message,
    });
  }
});

// POST /api/auth/login (Bcrypt Verified Login)
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: 'Email and password are required.',
      });
    }

    // Support demo shortcuts if provided
    const demoEmailMap = {
      'patient@nexora.com': 'ramesh.patient@nexora.health',
      'doctor@nexora.com': 'ananya.doctor@nexora.health',
      'patient@nexora.health': 'ramesh.patient@nexora.health',
      'doctor@nexora.health': 'ananya.doctor@nexora.health',
      'patient': 'ramesh.patient@nexora.health',
      'doctor': 'ananya.doctor@nexora.health',
    };
    const lookupEmail = demoEmailMap[email.toLowerCase()] || email;

    // Lookup user in database
    let user = await dbService.findUserByEmail(lookupEmail, role);

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Failed',
        message: 'Invalid credentials. User not found.',
      });
    }

    // Verify bcrypt password
    const isPasswordValid = await dbService.verifyPassword(user, password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Failed',
        message: 'Invalid email or password.',
      });
    }

    // Create JWT token
    const token = jwt.sign(
      {
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Return clean user without password
    const { password: _, ...cleanUser } = user;

    res.status(200).json({
      success: true,
      message: `Authenticated successfully as ${user.role}`,
      token,
      user: cleanUser,
    });
  } catch (err) {
    console.error('[Auth Login Error]:', err);
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: err.message,
    });
  }
});

import { authenticate } from '../middleware/auth.js';

// GET /api/auth/me (Current Authenticated User)
router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await dbService.findUserById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'Authenticated user profile not found in database.',
      });
    }

    const { password: _, ...cleanUser } = user;
    res.json({ success: true, user: cleanUser });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Server Error',
      message: 'Failed to retrieve profile.',
    });
  }
});

export default router;
