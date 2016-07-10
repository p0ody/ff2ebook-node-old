require("./Debug");
var Epub = require("./Epub");


const ARCHIVE_DIR = "./archive";

function FileMgr()
{
}

FileMgr.prototype.createEpub = function(fic)
{
    var epub = new Epub(fic);
};




module.exports = FileMgr;