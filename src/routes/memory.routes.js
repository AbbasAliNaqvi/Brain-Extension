const router = require('express').Router();

const auth = require('../middleware/authMiddleware');
const Controller = require('../controllers/memory.controller');

router.get('/', auth, Controller.listMemories);
router.get('/search', auth, Controller.searchMemories);
router.get('/:id', auth, Controller.getMemory);
router.delete('/:id', auth, Controller.deleteMemory);

module.exports = router;