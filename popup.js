// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
var PopupPage = function(){
    console.log("popup loaded");
    var context = this;
    window.addEventListener("load", function(){
        context.initialize();
    });
}
PopupPage.prototype.initialize = function() {
    var context = this;
    $("#openPanel").click(function () {
        context.sendPanelOpenRequest();
    });
    $("#all_stories").click(function () {
        context.sendViewAllStoriesMessage();
    });
    $("#more_stories").click(function () {
        context.sendToggleViewMoreStoriesMessage();
    });
    $("#capture").click(function(){
        var capture_type = $("input[name=capture_type]:checked").val();

        switch(capture_type){
            case 'long_capture':
                console.log("long_capture");
                context.sendCaptureMessage("long");
                break;
            case 'short_capture':
                console.log("short_capture");
                context.sendCaptureMessage("short");
                break;
            case 'partial_capture':
                console.log("partial_capture");
                context.sendPartialCaptureMessage();
                break;
        }
    });
    $("#long_capture").click(function () {
        $("#short_capture_box").hide();
        $("#partial_capture_box").hide();
    });
    $("#short_capture").click(function () {
        $("#short_capture_box").show();
        $("#partial_capture_box").hide();
    });
    $("#partial_capture").click(function () {
        $("#short_capture_box").hide();
        $("#partial_capture_box").show();
    });
}

PopupPage.prototype.sendViewAllStoriesMessage = function() {
    console.log("Viewing all stories");
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "view_all_stories"}, function (response) {
        });
    });
    chrome.runtime.sendMessage({action: "view_all_stories"});
}

PopupPage.prototype.sendToggleViewMoreStoriesMessage = function() {
    console.log("Viewing more stories");
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: "toggle_view_more_stories"}, function (response) {
        });
    });
}

PopupPage.prototype.sendCaptureMessage = function(type) {
    var num_of_screens = $("#pageCount").val();
    if (num_of_screens == undefined || num_of_screens == null || num_of_screens == "" || isNaN(num_of_screens)) {
        num_of_screens == 999;
    }
    console.log("capturing : " + num_of_screens);
    if (type == "long")
        chrome.runtime.sendMessage({action: "long_capture", count: 999});
    else
        chrome.runtime.sendMessage({action: "short_capture", count: num_of_screens});
}

PopupPage.prototype.sendPartialCaptureMessage = function() {
    var from = $("#fromDate").val();
    var to = $("#toDate").val();
    console.log("From : " + from);
    console.log("To: " + to);
    chrome.runtime.sendMessage({action: "partial_capture", count: 999, from: from, to: to});
}

PopupPage.prototype.sendPanelOpenRequest = function() {
    chrome.runtime.sendMessage({
        action: "open_panel"
    });
}

var popupPage = new PopupPage();