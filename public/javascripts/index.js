var _chapReadyCount = 0;

$(document).ready(function ()
{
    showEmail($("#send-email").prop("checked"));
    var socket = io();

    $("#input-form").submit(function (e)
    {
        e.preventDefault();
        reset();
        if ($("#input-text").val().length <= 0)
            return;

        socket.emit("convert-start",
            {
                url: $("#input-text").val(),
                forceUpdate: $("#force-update").prop("checked"),
                fileType: $("#file-type").val()
            });

        $.ajax
        ({
            url: "/setCookie",
            method: "POST",
            data: {
                autoDL: $("#auto-dl").prop("checked"),
                fileType: $("#file-type").val(),
                sendEmail: $("#send-email").prop("checked"),
                email: $("#email-address").val()
            },
            dataType: "json"
        });
    });

    $("#send-email").change(function ()
    {
        showEmail(this.checked);
    });


    socket.on("critical", function(msg)
    {
        //alert("Error: "+ msg);
    });
    socket.on("warning", function(msg)
    {
        alert("Warning: "+ msg);
    });

    socket.on("status", updateStatusText);

    socket.on("chapReady", function(chapCount)
    {
        _chapReadyCount++;
        updateStatusText(_chapReadyCount +"/"+ chapCount);
    });

    socket.on("fileReady", function(data)
    {
        updateStatusText("<a href=\"/download/"+ data.source +"/"+ data.id +"/"+ data.fileType +"\">Download</a>");
    });

});

function showEmail(bool)
{
    if (bool)
        $("#email-address").show();
    else
        $("#email-address").hide();
}

function updateStatusText(msg)
{
    $("#status-text").html(msg);
}

function reset()
{
    _chapReadyCount = 0;
}