const User = require('../models/user.model');
const { cloudinary } = require('../config/cloudinary');

const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

const updateMe = async (req, res) => {
  try {
    console.log('--- updateMe hit ---');
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);

    const { firstName, lastName, city, state, phone, bio } = req.body;
    const updates = {};

    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName  !== undefined) updates.lastName  = lastName;
    if (city      !== undefined) updates.city      = city;
    if (state     !== undefined) updates.state     = state;
    if (phone     !== undefined) updates.phone     = phone;
    if (bio       !== undefined) updates.bio       = bio;

    if (req.file?.path) {
      try {
        const existing = await User.findById(req.user.id).select('profileImage');
        if (existing?.profileImage?.includes('cloudinary')) {
          const publicId = existing.profileImage.split('/').slice(-1)[0].split('.')[0];
          await cloudinary.uploader.destroy(`fitflow/avatars/${publicId}`);
        }
        updates.profileImage = req.file.path;
      } catch (cloudErr) {
        console.error('Cloudinary delete error:', cloudErr.message);
        // Don't crash — just skip the delete and still save new image
        updates.profileImage = req.file.path;
      }
    }

    console.log('updates to apply:', updates);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'No profile fields provided to update' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'Profile updated successfully', user: updatedUser });

  } catch (error) {
    console.error('updateMe error:', error.message);
    console.error(error.stack);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = { getMe, updateMe };