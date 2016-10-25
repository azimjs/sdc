// Copyright (c) 2014 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

var ContentScript = function(){
    this.viewingMore = false;
    this.settings;
    this.clickCount;
    this.startTime;
    this.endTime;
    this.documentHeight;

    this.initialiseSettings();
    var context = this;
    chrome.runtime.onMessage.addListener( function(request, sender, sendResponse) {
        context.handleMessage(request, sender, sendResponse);
        return true;
    });
}

ContentScript.prototype.initialiseSettings = function(){
    var context = this;
    chrome.storage.local.get('settings', function(result) {
        console.log('Settings retrieved');
        console.log(result);
        context.settings = result.settings;
    });

    chrome.storage.onChanged.addListener(function(changes, namespace) {
        for (key in changes) {
            var storageChange = changes[key];
            if(key == "settings"){
                console.log("setting changed")
                context.settings = storageChange.newValue;
                console.log(context.settings);
                break;
            }
        }
    });
}


ContentScript.prototype.handleMessage = function(request, sender, sendResponse) {
    console.log("on message");
    console.log(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension");
    var context = this;
    if (request.action == "get_domain_name") {
        var domain_name = document.domain;
        sendResponse({msg: domain_name});

    } else if (request.action == "view_all_comments") {
        this.clickCount = 0;
        this.startTime = new Date().getTime();
        context.viewComments(request, sendResponse);
    } else if (request.action == "view_all_stories") {
        this.clickCount = 0;
        this.startTime = new Date().getTime();
        this.hightlight2AllStories()
    } else if (request.action == "toggle_view_more_stories") {
        if(this.viewingMore == false) {
            this.clickCount = 0;
            this.startTime = new Date().getTime();
            this.viewingMore = true;
            this.viewMoreStories()
        } else {
            this.viewingMore = false;
        }
    } else if (request.action == "fix_the_layout") {
        console.log("layout fixing..")
        this.fixPosition(document.location.hostname, sendResponse);
    } else if (request.action == "move_to_top") {
        console.log("scrolling..."+request.top);
        this.scroll(request.top, sendResponse)
    } else if (request.action == "get_html_metadata"){
        sendResponse({msg : "done", data : document.body.outerHTML });
    }
}

ContentScript.prototype.viewComments = function(request, sendResponse) {
    var context = this;
    var viewAllElements = $(context.settings.comments);

    var replyElements = $(context.settings.reply);
    console.log("@@ expanding replies : "+replyElements.length);

    console.log("viewAllElements" + viewAllElements.length || (replyElements != null && replyElements.length > 0));
    if(viewAllElements.length > 0) {
        console.log("view option available");
        for(var i=0; i< viewAllElements.length; i++){
            viewAllElements[i].click();
            context.clickCount++;
        }

        for(var j= replyElements.length-1 ; j>=0; j--){
            replyElements[j].click();
            context.clickCount++;
        }

        //wait for 2-3 seconds more to see if there are more coments available
        setTimeout(function(){
            context.viewComments(request, sendResponse);
        }, context.settings.timeout);
    } else {
        console.log("done loading all comments");

        //reply
        var replyElements = $(context.settings.reply);
        console.log("@@ expanding replies : "+replyElements.length);
        if(replyElements != null && replyElements.length > 0){
            //I don't know why but reverse order works here
            for(var j= replyElements.length-1 ; j>=0; j--){
                replyElements[j].click();
                context.clickCount++;
            }

        }

        // view translation if available
        var translateElements = $(context.settings.translate);
        console.log("@@ translating : "+translateElements.length);
        if(translateElements != null && translateElements.length > 0){
            //I don't know why but reverse order works here
            for(var j= translateElements.length-1 ; j>=0; j--){
                translateElements[j].click();
                context.clickCount++;
            }
        }

        //click on see more from posts
        var seemoreposts = $(context.settings.seemoreposts);
        console.log("@@ see more posts found: " + seemoreposts.length);
        if(seemoreposts!=null && seemoreposts.length>0){
            for(var j= seemoreposts.length-1 ; j >=0 ; j--){
                seemoreposts[j].click();
                context.clickCount++;
            }
        }

        //click on see more from comments
        var seemorecomments = $(context.settings.seemorecomments);
        console.log("@@ see more comments found: " + seemorecomments.length);
        if(seemorecomments!=null && seemorecomments.length>0){
            for(var j= seemorecomments.length-1 ; j >=0 ; j--){
                seemorecomments[j].click();
                context.clickCount++;
            }
        }

        //click on see translation
        var seetranslation = $(context.settings.seetranslation);
        console.log("@@ see translation found: " + seetranslation.length);
        if(seetranslation!=null && seetranslation.length>0){
            for(var j= seetranslation.length-1 ; j >=0 ; j--){
                seetranslation[j].click();
                context.clickCount++;
            }
        }

        // view translation if available
        var translateElements = $(context.settings.translate > context.settings.translate);
        console.log("@@ translating : "+translateElements.length);
        if(translateElements != null && translateElements.length > 0){
            //I don't know why but reverse order works here
            for(var j= translateElements.length-1 ; j>=0; j--){
                translateElements[j].click();
                context.clickCount++;
            }
        }


        //wait to load reply & translations
        setTimeout(function(){
            //find parial area if necessary
            var pixels = {from: "NA", to: "NA"};
            if(request.from != "NA"){
                var from = Date.parse(request.from);
                var to = Date.parse(request.to);
                console.log("capturing partial screen : "+from + " to "+to);
                var pixels = context.findPartialCaptureScreen(from, to);
            }

            //viewing all the comments & replies
            console.log("Sending Response");
            context.endTime = new Date().getTime();
            sendResponse({farewell: "Done", clickCount : context.clickCount, time : (context.endTime-context.startTime)/1000, from: pixels.from, to: pixels.to});
            console.log("Response sent");
        }, 2000);

    }


}

ContentScript.prototype.hightlight2AllStories = function(){
    console.log("@@ all stories");
    $(".fbTimelineStickyHeader:first").removeClass("fbTimelineStickyHeaderHidden");
    var right = $("#fbProfileCover .uiButtonGroupItem:nth-child(3)");
    right.click();
    var years = right.find("li.uiMenuItem");

    console.log(years);

    this.expandYear(years, 1);
}

ContentScript.prototype.viewMoreStories = function(){
    var context = this;
    var more = $(context.settings.more);
    console.log("found more links : "+more.length);
    console.log(more);
    //last link is not required
    if(more.length > 1 && context.viewingMore == true) {
        chrome.runtime.sendMessage({action: "user_case_status", message : "View more : "+more.length , progress: 50});//updates status on panel
        more[0].click();
        context.clickCount++;
        setTimeout(function(){
            context.viewMoreStories();
        }, context.settings.timeout);

    } else {
        //goto bottom
        context.reachBottom(0);
    }
}

ContentScript.prototype.reachBottom = function(height){
    //var documentHeight = $(document).height();
    var context = this;

    if(height < $(document).height()) {
        var body = $("html, body");
        height = $(document).height();
        body.stop().animate({scrollTop: $(document).height()}, '500', 'swing', function () {
            setTimeout(function(){
                context.reachBottom(height);
            },3000);
        });
    }
    else{
        //stopping once bottom is found
        context.endTime = new Date().getTime();
        chrome.runtime.sendMessage({action: "user_case_status", message : "Complete. Clicks:"+context.clickCount+", Time:"+(context.endTime-context.startTime)/1000+" secs" , progress: 100});//updates status on panel
        console.log("stopping...");
    }

}

ContentScript.prototype.expandYear = function(years, index){
    var context = this;

    console.log("Expanding : "+index);
    var anchor = $(years[index]).find("a");

    console.log("anchor : ");
    console.log(anchor[0]);

    anchor[0].click();

    context.clickCount++;

    chrome.runtime.sendMessage({action: "user_case_status", message : "Viewing all stories : "+$(anchor[0]).text() , progress: 50});//updates status on panel

    setTimeout(function(){

        console.log("Viewing highlights..");
        var highlights = $($("#fbProfileCover div.uiSelector.inlineBlock.subsectionMenu.uiSelectorNormal.uiSelectorDynamicLabel:nth-child(2)"));
        highlights.click();

        var month = highlights.find("li.uiMenuItem");

        console.log(month);

        context.expandMonth(month,years,index,1);

    }, context.settings.timeout);

}

ContentScript.prototype.expandMonth = function(month,years,index,monthNum){
    var context = this;

    var anchor2 = $(month[monthNum]).find("a");
    anchor2[0].click();

    context.clickCount++;

    console.log("expanding month: " + monthNum);
    //this timeout is work around as sometimes fb never naviagates to specific year, double click requires.

    setTimeout(function(){
    /*
        console.log("double click");
         var highlights = $($("#u_0_2s .uiButtonGroupItem:nth-child(4)")).find("li.uiMenuItem");
         var anchor2 = $(highlights[index+1]).find("a");
         anchor2[0].click();
         */
        if(monthNum < month.length - 1) {
            monthNum++;
            context.expandMonth(month, years,index,monthNum);
        }
        else {
            setTimeout(function () {
                console.log("Viewing all stories..")
                /*var allStories = $(context.settings.all_stories);
                 allStories = allStories[allStories.length - 1].childNodes[0];
                 console.log(allStories);
                 *///allStories.click();
                //context.clickCount++;
                setTimeout(function () {
                    if (index < years.length-1) {
                        index++;
                        context.expandYear(years, index);
                    } else {
                        context.endTime = new Date().getTime();
                        chrome.runtime.sendMessage({
                            action: "user_case_status",
                            message: "Complete. Clicks:" + context.clickCount + ", Time:" + (context.endTime - context.startTime) / 1000 + " secs",
                            progress: 100
                        });//updates status on panel
                    }
                }, context.settings.timeout);

            }, context.settings.timeout);
        }
    }, 100);
}

ContentScript.prototype.findPartialCaptureScreen = function (from, to){
    var fromPixel = 0;
    var toPixel = document.height;
    var dateElements = $("._5ptz");
    var calculateFrom = true;
    var currentPixel = 0;
    for(var i =0 ; i< dateElements.length; i++){
        var current_date = Date.parse($(dateElements[i]).text().replace("at",""));
        console.log(" current date : "+current_date);
        console.log($(dateElements[i]));
        //if current element is older than user selected date then stop
        if((current_date <= from) && calculateFrom) {
            var post = $(dateElements[i]).parents("._4-u2.mbm._5jmm._5pat._5v3q._4-u8");
            console.log("from post found");
            console.log(post);
            console.log("OFFSET : "+$(post).offset().top)
            console.log("Height : "+$(post).outerHeight());
            fromPixel = $(post).offset().top;
            calculateFrom = false;
        }
        else if(current_date < to) {
            var post = $(dateElements[i]).parents("._4-u2.mbm._5jmm._5pat._5v3q._4-u8");
            console.log("to post found");
            console.log(post);
            console.log("OFFSET : "+$(post).offset().top);
            console.log("Height : "+$(post).outerHeight());
            toPixel = $(post).offset().top;
            break;
        }
    }
    console.log("from : "+fromPixel +", to : "+toPixel);
    return {from : fromPixel, to: toPixel};
}

ContentScript.prototype.fixPosition = function(hostname, sendResponse) {
    var context = this;
    switch (hostname) {
        case "www.facebook.com":
            $(context.settings.fixed_blue_bar).removeClass("fixed_elem");
            $(context.settings.fixed_blue_bar).css('display','none');
            $('#fbProfileCover .fbTimelineStickyHeader .stickyHeaderWrap').css({'opacity':'0'});
            $('._4fn6._3zm-').css('display','none');
            $('.fbTimelineCapsule > div:nth-child(2)').css('display','none');
            $('div#content div#rightCol').css('display','none');
            $('#pagelet_sidebar ').css('display','none');
            $('#pagelet_dock').css('display','none');
            //this.removeClass(b, "fixed_elem");
            break;
        case "pinterest.com":
            var c = document.getElementById("CategoriesBar"),
                d = document.getElementsByClassName("Nag");
            0 != d.length && d[0].style.setProperty("position", "absolute", "important"), c.style.setProperty("position", "absolute", "important");
            break;
        default:
            break;
            //this.enableFixedPosition(!1);
    }

    sendResponse({msg : "done", documentHeight : $(document).height(), windowHeight : $(window).height(), windowWidth : $(window).width()});
}
ContentScript.prototype.restorePosition = function(a) {
    var context = this;
    switch (a) {
        case "www.facebook.com":
            $(context.settings.fixed_blue_bar).addClass("fixed_elem");
            $(context.settings.fixed_blue_bar).css('display','block');
            $('#fbProfileCover .fbTimelineStickyHeader .stickyHeaderWrap').css({'opacity':'1'});
            $('._4fn6._3zm-').css('display','block');
            $('.fbTimelineCapsule > div:nth-child(2)').css('display','block');
            $('div#content div#rightCol').css('display','block');
            $('#pagelet_sidebar ').css('display','block');
            $('#pagelet_dock').css('display','block');
            //this.addClass(b, "fixed_elem");
            break;
        case "pinterest.com":
            var c = document.getElementById("CategoriesBar"),
                d = document.getElementsByClassName("Nag");
            0 != d.length && (d[0].style.position = ""), c.style.position = ""
    }
}
ContentScript.prototype.enableFixedPosition = function(a) {
    if (a)
        for (var b = 0, c = fixedElements.length; c > b; ++b) fixedElements[b].style.position = "fixed";
    else
        for (var d, e = document.createNodeIterator(document.documentElement, NodeFilter.SHOW_ELEMENT, null, !1); d = e.nextNode();) {
            var f = document.defaultView.getComputedStyle(d, "");
            if (!f) return;
            var g = f.getPropertyValue("position");
            "fixed" === g && (fixedElements.push(d), d.style.position = "absolute")
        }
}
ContentScript.prototype.restoreFixedElements = function() {
    if (fixedElements) {
        for (var a = 0, b = fixedElements.length; b > a; a++) fixedElements[a].style.position = "fixed";
        fixedElements = []
    }
}
ContentScript.prototype.addClass = function(a, b) {
    this.hasClass(a, b) || (a.className += " " + b)
}
ContentScript.prototype.hasClass = function(a, b) {
    return a.className.match(new RegExp("(\\s|^)" + b + "(\\s|$)"))
}
ContentScript.prototype.removeClass = function(a, b) {
    if (this.hasClass(a, b)) {
        var c = new RegExp("(\\s|^)" + b + "(\\s|$)");
        a.className = a.className.replace(c, " ")
    }
}
ContentScript.prototype.scroll = function(top, sendResponse){
    var context = this;
    var body = $("html, body");
    var scroll_interval = context.settings.scroll_interval * 1000;
    body.stop().animate({scrollTop:top}, '500', 'swing', function() {

        setTimeout(function () {
            console.log("pause for (s):" + scroll_interval);
            sendResponse({msg: "done", documentHeight : $(document).height()});
        }, scroll_interval);
    });
}

var contentScript = new ContentScript();