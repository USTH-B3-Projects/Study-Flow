const express = require('express');
const courseController = require('../controllers/courseController');
const router = express.Router();

router.get('/', courseController.getAll);
router.post('/', courseController.create);
router.get('/:id', courseController.getById);
router.put('/:id', courseController.update);
router.delete('/:id', courseController.delete);

module.exports = router;
