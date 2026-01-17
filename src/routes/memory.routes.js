const router = require('express').Router();

const requireVerified = require('../middleware/requireVerified');
const auth = require('../middleware/authMiddleware');
const Controller = require('../controllers/memory.controller');


router.get('/', auth, requireVerified, Controller.listMemories);

router.post("/", auth, requireVerified, Controller.addMemory);

router.get('/search', auth, requireVerified, Controller.searchMemories);

router.get('/:id', auth, requireVerified, Controller.getMemory);

router.delete('/:id', auth, requireVerified, Controller.deleteMemory);

module.exports = router;