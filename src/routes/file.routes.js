const router = require('express').Router();

const upload = require('../middleware/uploadLocalMiddleware');
const auth = require('../middleware/authMiddleware');
const Controller = require('../controllers/file.controller');
const requireVerified = require('../middleware/requireVerified');

router.post("/upload", auth, requireVerified, upload.single('file'), Controller.upload);
router.get("/", auth, requireVerified, Controller.list);
router.get("/:id", auth, requireVerified, Controller.get);
router.delete("/:id", auth, requireVerified, Controller.delete);

module.exports = router;