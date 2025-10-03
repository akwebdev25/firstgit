var express = require('express');
var router = express.Router();

/* GET WebRTC demo page. */
router.get('/', function(req, res, next) {
  res.render('webrtc', { title: 'WebRTC Demo' });
});

module.exports = router;
