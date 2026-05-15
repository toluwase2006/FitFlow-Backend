const User = require('../models/user.model');

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateMe = async (req, res) => {
  const { firstName, lastName, city, state, phone, bio, profileImage } = req.body;
  const updates = {};

  if (firstName !== undefined) updates.firstName = firstName;
  if (lastName !== undefined) updates.lastName = lastName;
  if (city !== undefined) updates.city = city;
  if (state !== undefined) updates.state = state;
  if (phone !== undefined) updates.phone = phone;
  if (bio !== undefined) updates.bio = bio;
  if (profileImage !== undefined) updates.profileImage = profileImage;

  if (Object.keys(updates).length === 0) {
    return res.status(400).json({ message: 'No profile fields provided to update' });
  }

  try {
    const updatedUser = await User.findByIdAndUpdate(req.user.id, updates, {
      new: true,
      runValidators: true
    }).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getMe, updateMe };