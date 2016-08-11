var Debug = require("./Debug");
var Fic = require("./Fic");
var Enums = require("./Enums");
var Utils = require("./Utils");
var ErrorHandler = require("./ErrorHandler");
var Events = require("events");


function FicEventHandler()
{
    // Defaults abstract functions
    this.onWarning = function(msg) { Debug.log("Warning: " + msg); };
    this.onError = function(msg) { Debug.log("Error: " + msg); };
    this.onStart = function(data) { Debug.log("Starting conversion"); };
    this.onFileReady = function(infos) { Debug.log("File Ready."); };
    this.onEmailStart = function() { Debug.log("Start sending email."); };
    this.onEmailSent = function(err) { Debug.log("Email sent."); };
    this.onFicInfosReady = function() { Debug.log("Fic infos ready."); };
    this.onMobiStart = function() { Debug.log("Starting mobi conversion."); };
    this.onStatus = function(msg) { Debug.log("Change status to: " + msg); };
    this.onEpubStart = function() { Debug.log("Starting epub creation."); };
    this.onChapReady = function(chapCount) { Debug.log("Chapter ready."); };
}

FicEventHandler.prototype.bindEvent = function(event)
{
    if (!event)
        return Debug.log("Invalid event object.");

    this._event = event;

    this._event.on("warning", this.onWarning);
    this._event.on("critical", this.onError);
    this._event.on("convertStart", this.onStart);
    this._event.on("fileReady", this.onFileReady);
    this._event.on("emailStart", this.onEmailStart);
    this._event.on("emailSent", this.onEmailSent);
    this._event.on("ficInfosReady", this.onFicInfosReady);
    this._event.on("mobiStart", this.onMobiStart);
    this._event.on("status", this.onStatus);
    this._event.on("epubStart", this.onEpubStart);
    this._event.on("chapReady", this.onChapReady);
};

FicEventHandler.prototype.getEvent = function() { return this._event; };

module.exports = FicEventHandler;