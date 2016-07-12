var express = require('express');
var router = express.Router();
Debug = require("../src/Debug");

router.get('/', function (req, res, next)
{
    var autoDownload = (req.cookies.autoDL == "true") ? "checked=\"\"" : "";
    var sendEmail = (req.cookies.sendEmail == "true") ? "checked=\"\"" : "";

    res.render('index', 
        {
            autoDL: autoDownload,
            fileType: req.cookies.fileType,
            sendEmail: sendEmail,
            emailAddress: req.cookies.email
        });
});

router.get('/archive', function (req, res, next)
{
    res.render('archive');
});

router.post('/setCookie', function (req, res, next)
{
    res.cookie("autoDL", req.body.autoDL);
    res.cookie("fileType", req.body.fileType);
    res.cookie("sendEmail", req.body.sendEmail);
    res.cookie("email", req.body.email);
    res.send("Cookie set.");
});

module.exports = router;

