const router = require('express').Router();

const upload = require('../middleware/uploadLocalMiddleware');
const auth = require('../middleware/authMiddleware');
const Controller = require('../controllers/file.controller');

router.post("/upload", auth, upload.single('file'), Controller.upload);
router.get("/", auth, Controller.list);
router.get("/:id", auth, Controller.get);
router.delete("/:id", auth, Controller.delete);

module.exports = router;