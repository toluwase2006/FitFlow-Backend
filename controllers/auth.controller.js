const User = require("../models/user.model");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// User Registration
const register = async (req, res) => {
    const { firstName, lastName, email, password, role, country, state, city, phone, profileImage, bio } = req.body;
    try {

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            res.status(400).json({ message: "User already exists" })
        }
        
        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            role,
            country,
            state,
            city,
            phone,
            profileImage,
            bio
        })
        await newUser.save()
        res.status(201).json({ message: "User registered successfully", newUser });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
}

// User Login
const Login = async (req, res) => {
    const { email, password } = req.body
    try {
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" })
        }
        // Compare password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" })
        }

        // Create and assign a token
        const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({ token, user: { id: user._id, firstName: user.firstName, lastName: user.lastName, email: user.email, role: user.role } });
    } catch (error) {
        res.status(500).json({ message: "Server error", error: error.message });
    }
}

module.exports = { register, Login }