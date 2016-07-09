$(document).ready(function ()
{
    showEmail($("#send-email").prop("checked"));
    var socket = io();

    $("#input-form").submit(function (e)
    {
        e.preventDefault();
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


    socket.on("error", function(msg)
    {
        alert("Error: "+ msg);
    });
    socket.on("warning", function(msg)
    {
        alert("Warning: "+ msg);
    });

    socket.on("status", updateStatusText);

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
    $("#status-text").html($("#status-text").html()+"<br />"+msg);
}