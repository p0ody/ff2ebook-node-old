$(document).ready(function()
{
    var socket = io();
    $("#input-form").submit(function(e)
    {
        e.preventDefault();
        socket.emit("convert-start", { url: $("#input-text").val() });
    });

});