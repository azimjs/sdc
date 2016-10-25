/**
 * BG class acts as a controller of SDC extension
 * @constructor
 */
var BG = function () {
    var context = this;
    /**
     * stores the currently assigned cases to the agent. It is response from web service
     */
    this.cases;
    /**
     * selected user
     */
    this.currentUserId;
    /**
     * selected netwrork, e.g: facebook, twitter
     */
    this.currentNetworkId;
    /**
     * all the settings
     */
    this.settings;
    /**
     * panel id if opened
     */
    this.panelTabId;
    this.panelUrl = "http://default.com/";
    /**
     * tab id whose screen capture is required
     */
    this.currentTabId;
    /**
     * one of the following:
     * TYPE_SHORT_CAPTURE, TYPE_LONG_CAPTURE, TYPE_PARTIAL_CAPTURE
     */
    this.captureType;
    /**
     * id for current long screenshot
     */
    this.session_id;
    /**
     * number of clicks performed for opening the comments, replies and translations
     */
    this.expansionClicks;
    /**
     * time required for opening the comments, replies and translations
     */
    this.expansionTime;
    this.currentTabUrl;
    this.currentTabId;
    /**
     * number of screen capture
     * @type {number}
     */
    this.count = 999;
    this.from = "NA"
    this.to;
    this.currentTop;
    this.documentHeight;
    this.windowHeight;
    this.windowWidth;
    this.currentImageCount;
    /**
     * in long capture, images data will be collected and then stitched together to store inn file.
     * @type {Array}
     */
    this.imageArray = [];
    console.log("background page loaded");
    this.initialiseSettings();
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        context.handleMessage(request, sender, sendResponse);
    });
}
BG.prototype.TYPE_SHORT_CAPTURE = 0;
BG.prototype.TYPE_LONG_CAPTURE = 1;
BG.prototype.TYPE_PARTIAL_CAPTURE = 2;

//settings initialisation
BG.prototype.initialiseSettings = function () {
    var context = this;
    chrome.storage.local.get('settings', function (result) {
        console.log('Settings retrieved');
        console.log(result);
        if (result.settings == null) {
            //save default settings
            var settings = {
                comments: ".UFIPagerLink",
                reply: ".UFICommentLink",
                translate: ".UFITranslateLink",
                year_container: "#rightColContent",
                years: "li.clearfix:not(.hidden_elem)",
                highlights: "._6a.uiPopover.uiHeaderActions",
                all_stories: "._54nh",
                seemoreposts: ".see_more_link",
                seemorecomments: "._5v47",
                seetranslation: "._43f9",
                more: "a.pam.uiBoxLightblue.uiMorePagerPrimary",
                fixed_blue_bar: "#blueBarDOMInspector",
                timeout: 3000,
                slice: 5,
                scroll_interval: 0
            }
            context.settings = settings;
            chrome.storage.local.set({'settings': settings});
            console.log("setting init complete")
        } else {
            context.settings = result.settings;
        }
    });

    chrome.storage.onChanged.addListener(function (changes, namespace) {
        console.log("Storage changed : ");
        console.log(changes)
        for (key in changes) {
            var storageChange = changes[key];
            if (key == "settings") {
                console.log("setting changed")
                context.settings = storageChange.newValue;
                console.log(context.settings);
                break;
            }
        }
    });
}

BG.prototype.handleMessage = function (request, sender, sendResponse) {
    var context = this;

    switch (request.action) {
        case "open_panel":
            this.openPanel();
            break;
        case "short_capture":
            this.captureType = this.TYPE_SHORT_CAPTURE;
            this.count = request.count;
            this.expandPosts();
            break;
        case "long_capture":
            context.count = request.count;
            context.captureType = this.TYPE_LONG_CAPTURE;

            chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
                chrome.tabs.sendMessage(tabs[0].id, {action:"get_domain_name"}, function(response){
                    console.log(response.msg);
                    if(response.msg=="facebook.com" || response.msg=="www.facebook.com")
                        context.expandPosts();
                    else {
                        context.currentTabUrl = tabs[0].url;
                        context.currentTabId = tabs[0].id;
                        context.fixTheLayout();
                    }
                })
            });
            break;
        case "partial_capture":
            this.count = request.count;
            this.captureType = this.TYPE_PARTIAL_CAPTURE;
            this.from = request.from;
            this.to = request.to;
            this.expandPosts();
            break;
        case "update_current_cases":
            this.cases = request.case;
            this.currentUserId = request.currentCaseName
            this.currentNetworkId = request.currentCaseNetwork
            //this.sendStoredData();
            break;
        case "delete_screenshot":
            this.deleteScreenshot(request.screenshotIndex);
            break;
        default :
            console.log("Not handling in BG");
            break;
    }
}

BG.prototype.deleteScreenshot = function(index){
    var context = this;
    chrome.storage.local.get( ""+context.currentUserId, function (result) {
        var userDataObject = result[context.currentUserId];
        var user_networks = userDataObject['user_networks'];
        var networkIndex = context.findWithAttr(user_networks,'network_id',context.currentNetworkId);
        userDataObject.user_networks[networkIndex].screen_shot.splice(index, 1);

        var obj = {};
        obj[context.currentUserId] = userDataObject;
        chrome.storage.local.set(obj);
    });
}

BG.prototype.findWithAttr = function(array, attr, value) {
    for(var i = 0; i < array.length; i += 1) {
        if(array[i][attr] == value) {
            return i;
        }
    }
    return null;
}

BG.prototype.expandPosts = function () {
    var context = this;
    //view comments & reply
    context.showMessage("Expanding comments", 25);
    chrome.tabs.query({active: true, currentWindow: true}, function (tabs) {
        context.currentTabUrl = tabs[0].url;
        context.currentTabId = tabs[0].id;
        chrome.tabs.sendMessage(context.currentTabId, {
            action: "view_all_comments",
            from: context.from,
            to: context.to
        }, function (response) {
            console.log("Click Count : " + response.clickCount);
            console.log("Expanstion time : " + response.time);
            context.expansionClicks = response.clickCount;
            context.expansionTime = response.time;
            context.from = response.from;
            context.to = response.to;
            context.fixTheLayout();
        });
    });
}

BG.prototype.fixTheLayout = function () {
    var context = this;
    chrome.tabs.sendMessage(context.currentTabId, {action: "fix_the_layout"}, function (response) {
        context.documentHeight = response.documentHeight;
        context.windowHeight = response.windowHeight;
        context.windowWidth = response.windowWidth;
        context.moveToTop();
    });
}

BG.prototype.moveToTop = function () {
    var context = this;
    var top = 0;
    if (context.captureType === context.TYPE_PARTIAL_CAPTURE) {
        top = context.from;
    }
    chrome.tabs.sendMessage(context.currentTabId, {action: "move_to_top", top: top}, function (response) {
        context.documentHeight = response.documentHeight;
        console.log(";;DOCUMENT_HEIGHT: "+context.documentHeight);
        context.currentTop = top;
        context.imageArray = [];
        //generate unique id for current capture session
        context.session_id = Math.floor((Math.random() * 1000000) + 1);
        context.createScreenshotDataObject();
        context.showMessage("Taking screen shot", 50);
        context.currentImageCount = 0;
        context.captureScreen();
    });
}

BG.prototype.createScreenshotDataObject = function(){
    this.currentScreenshotDataObject = {
                                            session_id: this.session_id,
                                            URL: this.currentTabUrl,
                                            htmlMetadata: "",
                                            clickCount: this.expansionClicks,
                                            commentExpansionTime : this.expansionTime,
                                            images : [],
                                            status : "Not Uploaded"
                                        }
}

BG.prototype.saveScreenshotDataObject = function(){
    var context = this;
    chrome.storage.local.get( ""+context.currentUserId, function (result) {
        var userDataObject = null;
        var caseUserIndex = context.findWithAttr(context.cases, 'id', context.currentUserId);
        var caseNetworkIndex = context.findWithAttr(context.cases[caseUserIndex].user_networks,'id',context.currentNetworkId);
        if(result[context.currentUserId]){
            userDataObject = result[context.currentUserId];
            var user_networks = userDataObject['user_networks'];
            var networkIndex = context.findWithAttr(user_networks,'network_id',context.currentNetworkId);
            if(networkIndex == null) {
                //network data not available
                userDataObject.user_networks =  [
                                                    {
                                                        network_id: context.currentNetworkId,
                                                        network_name: context.cases[caseUserIndex].user_networks[caseNetworkIndex].name,
                                                        status: "complete",
                                                        screen_shot: [
                                                            context.currentScreenshotDataObject
                                                        ]
                                                    }
                                                ]
            } else {
                userDataObject.user_networks[networkIndex].screen_shot.push(context.currentScreenshotDataObject);
            }

        } else {
            //no data available for user
            console.log(context.cases);
            console.log(context.currentUserId);
                userDataObject = {
                                        id: context.currentUserId,
                                        name: context.cases[caseUserIndex].name,
                                        user_networks: [
                                            {
                                                network_id: context.currentNetworkId,
                                                network_name: context.cases[caseUserIndex].user_networks[caseNetworkIndex].name,
                                                status: "complete",
                                                screen_shot: [
                                                    context.currentScreenshotDataObject
                                                ]
                                            }
                                        ]
                                    }
        }
        //here we have the updated userDataObject, store it
        var obj = {};
        obj[context.currentUserId] = userDataObject;
        chrome.storage.local.set(obj);
        context.showMessage("Complete", 100);
        context.doMemoryClearingStuff();
    });
}

BG.prototype.captureScreen = function () {
    var context = this;
    console.log(";;Current Top : " + this.currentTop);
    console.log(";;Document Height : " + this.documentHeight);
    var bottom = this.documentHeight;
    if (this.captureType === this.TYPE_PARTIAL_CAPTURE) {
        bottom = this.to;
    }
    if ((this.currentTop <= bottom) && (this.currentImageCount < this.count)) {
        chrome.tabs.captureVisibleTab(null, {format:'jpeg', quality: 60}, function (dataUrl) { //, quality: 20
                context.currentImageCount ++;
                //TODO: handle image
                console.log(";;Image-"+context.currentImageCount+" ");//+dataUrl);
                // console.log(dataUrl);
                context.imageArray.push(dataUrl);
                console.log(";;Image Index : " + context.imageArray.length);
                if ((context.imageArray.length % context.settings.slice) == 0) {
                    //save these images as one file
                    context.createImage(false);
                } else {
                    context.moveToNextScreen();
                }
            }
        )
    } else {
        if (context.imageArray.length > 0) {
            context.createImage(true);
        } else {
            context.getHtmlMetadata();
        }
    }
}

BG.prototype.getHtmlMetadata = function () {
    var context = this;
    chrome.tabs.sendMessage(context.currentTabId, {action: "get_html_metadata"}, function (response) {
        context.currentScreenshotDataObject.htmlMetadata = response.data;
        context.saveScreenshotDataObject();
    });
}

BG.prototype.moveToNextScreen = function () {
    var context = this;
    //if(top < this.documentHeight) {
    var top = context.currentTop + context.windowHeight;
    //}
    chrome.tabs.sendMessage(context.currentTabId, {action: "move_to_top", top: top}, function (response) {
        context.documentHeight = response.documentHeight;
        context.currentTop = top;
        context.captureScreen();
    });
}

BG.prototype.createImage = function (isFinished) {
    var bgContext = this;
    var canvas = document.getElementById('canvas');
    var context = canvas.getContext('2d');
    var height;
    //context.clearRect(0, 0, canvas.width, canvas.height);

    console.log("-----------------------------------------------------------------------------");
    console.log(";;;;heights :  " + this.windowHeight + " " + this.currentTop + " " + this.documentHeight );

    if(this.currentTop > this.documentHeight){
        this.currentTop = this.currentTop - this.windowHeight;
    }
    if(this.currentTop + this.windowHeight > this.documentHeight ){
        height = (this.windowHeight * (this.imageArray.length - 1)) + (this.documentHeight - this.currentTop);
    }
    else{
        height = this.windowHeight * this.imageArray.length;
    }

    canvas.width = this.windowWidth;
    canvas.height = height;

    //console.log(this.imageArray);
    console.log(";;Image size " + this.imageArray.length);
    console.log(";;Canvas Height: " + height +"; Canvas Width: " + canvas.width);
    console.log(";;Top: " + this.currentTop);

    //plot last image at the bottom.
    var imgDisp = new Image();
    imgDisp.src = this.imageArray[this.imageArray.length - 1];
    imgDisp.onload = function(){
        console.log("@@ width : "+this.width);


        if(bgContext.currentTop > bgContext.documentHeight){
            bgContext.currentTop = bgContext.currentTop - this.height;
        }
        if(bgContext.currentTop + this.height > bgContext.documentHeight ){
            height = (this.height * (bgContext.imageArray.length - 1)) + (bgContext.documentHeight - bgContext.currentTop);
        }
        else{
            height = this.height * bgContext.imageArray.length;
        }
        canvas.width = this.width;
        canvas.height = height;


        bgContext.doCanvasstuff(context, canvas, imgDisp, this.width, height, isFinished);
    }


}

BG.prototype.doCanvasstuff = function(context, canvas, imgDisp, width, height, isFinished){
    console.log(";;screenshot Height: " + imgDisp.height);
    context.drawImage(imgDisp, 0, (height - imgDisp.height));

    //now draw all the images sequestially from to, so that if the repeated last image will be replaces by original
    var currentHeight = 0;
    for (var i = 0; i < this.imageArray.length - 1; i++) {
        console.log(">Current Height : " + currentHeight);
        var imgDisp = new Image();
        imgDisp.src = this.imageArray[i];

        console.log("@@ image width : "+imgDisp.width);
        context.drawImage(imgDisp, 0, currentHeight);
        // console.log(";;Image : " + this.imageArray[i]);

        context.beginPath();
        context.moveTo(0,currentHeight);
        context.lineTo(canvas.width,currentHeight);
        //context.stroke();
        //context.strokeStyle = "red";

        console.log(";;Image Height : " + imgDisp.height);
        currentHeight = currentHeight + imgDisp.height;
        //delete this.imageArray[i];
    }
    //var dataURL = document.getElementById("canvas").toDataURL('image/png', 0.5);
    var img = $(Canvas2Image.convertToJPEG(canvas, canvas.width, height));
    // console.log(img.attr("src"));
    console.log("-----------------------------------------------------------------------------");
    // delete img;
    this.imageArray = [];
    this.saveImageFile(img.attr("src"), isFinished);
}

BG.prototype.saveImageFile = function (data, isFinished) {
    var context = this;
    navigator.webkitPersistentStorage.requestQuota(1024 * 1024, function () {
        window.webkitRequestFileSystem(window.PERSISTENT, 1024 * 1024, function (localstorage) {
            console.log("creating file");
            localstorage.root.getDirectory("SDC", {create: true}, function () {
                localstorage.root.getFile("/SDC/" + new Date().getTime() + ".jpg", {create: true}, function (DatFile) {
                    DatFile.createWriter(function (DatContent) {
                        DatContent.write(context.dataURItoBlob(data));
                        context.updateFileURL(DatFile.toURL(), isFinished);
                        //delete data;
                    });
                }, function (e) {
                    console.log(e)
                });

            });


        });
    });
}
BG.prototype.dataURItoBlob = function (dataURI) {
    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs
    var byteString = atob(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to an ArrayBuffer
    var ab = new ArrayBuffer(byteString.length);
    var ia = new Uint8Array(ab);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    // write the ArrayBuffer to a blob, and you're done
    //var bb = new window.WebKitBlobBuilder();
    //bb.append(ab);
    console.log("returing blob");
    //return bb.getBlob(mimeString);
    var dataView = new DataView(ab);
    return new Blob([dataView], {type: mimeString});
}

BG.prototype.updateFileURL = function (url, isFinished) {
    console.log("File URL : " + url);
    this.currentScreenshotDataObject.images.push({localURL : url, status : "Not Sent"});
    if (isFinished) {
        this.getHtmlMetadata();
    } else {
        this.moveToNextScreen();
    }
}

BG.prototype.openPanel = function () {
    var context = this;
    chrome.tabs.query({url: context.panelUrl}, function (tabs) {
        // if no tab found, open a new one
        if (tabs.length == 0 || context.panelUrl == "http://default.com/") {
            chrome.windows.getCurrent(function (win) {
/*
                chrome.tabs.getSelected(null, function (tab) {
                    context.currentTabId = tab.id;
                });
*/
                chrome.tabs.query({'active': true, 'windowId': chrome.windows.WINDOW_ID_CURRENT},
                    function(tabs){
                        console.log(tabs[0].id);
                        context.currentTabId = tabs[0].id;
                        console.log(tabs[0]);
                        console.log("win.id" + win.id);
                        //currentTabId = win.id;
                        if (tabs[0].width >= screen.width) {
                            var updateInfo = {
                                left: 211,
                                width: tabs[0].width - 210
                            };
                            chrome.windows.update(tabs[0].windowId, updateInfo, function () {
                                console.log("resize done");
                            });
                        }
                    }
                );

                var createData = {
                    url: "panel.html", type: "popup",
                    top: win.top, left: 0,
                    width: 210, height: win.height, focused: false
                };


                chrome.windows.create(createData, function (w) {
                    console.log("window created");
                    console.log(w.tabs[0].url);
                    context.panelUrl = w.tabs[0].url;
                    context.panelTabId = w.id;
                });
            });
        }
        // otherwise, focus on the first one
        else {
            console.log(context.panelTabId);
            chrome.windows.update(context.panelTabId, {"focused": true});
            return;
        }
    });

}

BG.prototype.doMemoryClearingStuff = function(){
    // this.currentScreenshotDataObject = null;
    //TODO
}

BG.prototype.gcd = function(a, b) {
    return (b == 0) ? a : gcd (b, a%b);
}

BG.prototype.showMessage = function (msg, progress) {
    chrome.runtime.sendMessage({action: "user_case_status", message: msg, progress: progress});//updates status on panel
}
//create the object of BG class
var bg = new BG();
