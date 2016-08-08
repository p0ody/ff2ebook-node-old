var express = require('express');
var router = express.Router();
var Debug = require("../src/Debug");
var Utils = require("../src/Utils");
var Enums = require("../src/Enums");
var FFNET = require("../src/FFNET");


router.param(["source", "id", "type"], function ()
{
});

router.get('/:source/:id/:type', function (req, res, next)
{
    var source = req.params.source;
    if (!Utils.isValidSource(source))
        return res.send("Invalid Source");

    switch (source)
    {
        case Enums.Sources.FFnet:
            self.handler = new FFNET(self.url, self.socket, self.events);
            self.handler.source = source;
            break;

        /*case Enums.Sources.FPcom:
         handler = new*/
    }

});

module.exports = router;

