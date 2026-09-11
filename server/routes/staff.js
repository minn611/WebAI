const express = require('express');
const router = express.Router();
const {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  toggleStaffStatus,
  deleteStaff
} = require('../controllers/staffController');

router.get('/', getAllStaff);
router.get('/:id', getStaffById);
router.post('/', createStaff);
router.put('/:id', updateStaff);
router.put('/:id/toggle-status', toggleStaffStatus);
router.delete('/:id', deleteStaff);

module.exports = router;
