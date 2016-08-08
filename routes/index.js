var express = require('express');
var router = express.Router();
var Debug = require("../src/Debug");

router.get('/', function (req, res, next)
{
    var autoDownload = (req.cookies.autoDL == "true") ? "checked=\"\"" : "";
    var sendEmail = (req.cookies.sendEmail == "true") ? "checked=\"\"" : "";
    var epub, mobi;
    if (req.cookies.fileType == "EPUB")
    {
        epub = "selected=\"selected\"";
        mobi = "";
    }
    else
    {
        epub = "";
        mobi = "selected=\"selected\"";
    }

    res.render('index', 
        {
            autoDL: autoDownload,
            typeEpub: epub,
            typeMobi: mobi,
            sendEmail: sendEmail,
            emailAddress: req.cookies.email
        });
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

