const express = require('express');
const taskController = require('../controllers/taskController');
const router = express.Router();

router.get('/', taskController.getAll);
router.post('/', taskController.create);
router.get('/:id', taskController.getById);
router.put('/:id', taskController.update);
router.delete('/:id', taskController.delete);

module.exports = router;
