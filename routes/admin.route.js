const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth.middleware');
const checkRole = require('../middleware/checkRole.middleware');
const { getAllUsers, getUnassignedTrainees, getAllTrainersWithCount, updateUser, deleteUser, assignTrainee, unassignTrainee, getActiveAssignments, getAdminStats} = require('../controllers/admin.controller');

const adminOnly = [auth, checkRole('admin')];


router.get('/users', adminOnly, getAllUsers);
router.get('/unassigned', adminOnly, getUnassignedTrainees);
router.get('/trainers', adminOnly, getAllTrainersWithCount);
router.get('/stats', adminOnly, getAdminStats);
router.patch('/users/:id', adminOnly, updateUser);
router.delete('/users/:id', adminOnly, deleteUser);


router.post('/assign', adminOnly, assignTrainee);
router.delete('/unassign/:traineeId', adminOnly, unassignTrainee);
router.get('/assignments', adminOnly, getActiveAssignments);
  

module.exports = router;
