/**
 * Created by Kapil on 7/22/2015.
 */
var sdcApp = angular.module('SdcApp', ['ngRoute']).config( ['$compileProvider', '$routeProvider', function( $compileProvider, $routeProvider ) {
    var currentImgSrcSanitizationWhitelist = $compileProvider.imgSrcSanitizationWhitelist();
    var newImgSrcSanitizationWhiteList = currentImgSrcSanitizationWhitelist.toString().slice(0,-1)+'|filesystem:chrome-extension:'+'|blob:chrome-extension%3A'+currentImgSrcSanitizationWhitelist.toString().slice(-1);
    $compileProvider.imgSrcSanitizationWhitelist(newImgSrcSanitizationWhiteList);
    console.log("Img : "+newImgSrcSanitizationWhiteList);

    $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|tel|file|filesystem:chrome-extension|chrome-extension):/);

    $routeProvider.
        when('/user-cases', {
            templateUrl: 'user-cases.html',
            controller: 'PanelController'
        }).
        when('/settings', {
            templateUrl: 'settings.html',
            controller: 'SettingsController'
        }).
        when('/screenshot_item/:screenshotIndex/:imageIndex', {
            templateUrl: 'screenshot_item.html',
            controller: 'ScreenshotItemController'
        }).
        otherwise({
            redirectTo: '/user-cases'
        });
}]);
sdcApp.filter('reverse', function() {
    return function(items) {
        return items.slice().reverse();
    };
});
sdcApp.directive('customOnChange', function() {
    return {
        restrict: 'A',
        link: function (scope, element, attrs) {
            var onChangeHandler = scope.$eval(attrs.customOnChange);
            element.bind('change', onChangeHandler);
        }
    };
});

sdcApp.controller('PanelController', function ($scope, $http, $rootScope) {
    $scope.image= "N/A"
    $scope.userCaseStatus = "Please go to user profile";
    $scope.progress_value = 0;
    $scope.clickedScreenshot;
    if($rootScope.currentCase) {
        console.log("retaining value")
        $scope.currentCase = $rootScope.currentCase;
    } else {
        console.log("initialising value")
        $scope.currentCase = {user : null , network: null, screen_shot: []};
    }
    $scope.$watch('currentCase', function() {
        console.log("current case changed");
        $rootScope.currentCase = $scope.currentCase;
        console.log($rootScope.currentCase);
    }, true);
    $scope.init = function(){
        console.log("rootscope");
        console.log($rootScope.currentCase);
        console.log($rootScope.cases);
        if(! $rootScope.cases){
            console.log("fetching cases")
            $scope.getCases();
        }
        chrome.runtime.onMessage.addListener( function(request, sender, sendResponse) {
            console.log("Panel: incoming message");
            console.log(request);
            if(request.action == "user_case_status"){
                $scope.userCaseStatus = request.message;
                //$scope.progress_value = request.progress;
                var pb = $("#progress_bar").progressBar();
                pb.progressBar('progress', request.progress);
            } else if (request.action == "screenshot_update") {
                request.screenshot.status = "Not Sent"
                //$scope.currentCase.screen_shot.push(request.screenshot);
                chrome.runtime.sendMessage({
                        action : "update_current_cases",
                        case : $rootScope.cases,
                        currentCaseName : $scope.currentCase.user.id,
                        currentCaseNetwork : $scope.currentCase.network.id
                    },
                    function(response) {

                    });
            } else if(request.action== "UserCaseData"){
                    console.log(request.object);
                $scope.currentCase.screen_shot = [];
                if(request.object!=null){
                    $scope.currentCase.screen_shot = request.object.screen_shot;
                    /*if(request.object.screen_shot.length > 0) {
                        $scope.groupScreenshots(request.object.screen_shot);
                    }*/
                }
            }
            $scope.$apply();
        });

        chrome.storage.onChanged.addListener(function (changes, namespace) {
            console.log("Storage changed : ");
            console.log(changes)
            for (key in changes) {
                var storageChange = changes[key];
                if(key == $scope.currentCase.user.id){
                    $scope.getStoredData();
                    break;
                }
            }
        });

    }
    $scope.getStoredData = function(){
        chrome.storage.local.get( ""+$scope.currentCase.user.id, function (result) {
            console.log(result);
            if(result[$scope.currentCase.user.id]){
                var user_networks = result[$scope.currentCase.user.id]['user_networks'];
                var requestedIndex = $scope.findWithAttr(user_networks,'network_id',$scope.currentCase.network.id);
                console.log(user_networks[requestedIndex]);
                $scope.currentCase.screen_shot = [];
                if(user_networks[requestedIndex]!=null){
                    for(var i=0; i<user_networks[requestedIndex].screen_shot.length; i++  ){
                        user_networks[requestedIndex].screen_shot[i].htmlMetadata = "";
                    }
                    $scope.currentCase.screen_shot = user_networks[requestedIndex].screen_shot;
                }
            }
            $scope.$apply();
        });
    }
    $scope.getCases = function(){
        $http.get("http://52.7.181.63/agents/37/assigned_cases?api_key=sdc-reporting")
            .success(function(response) {
                $rootScope.cases = response.cases;
            });
    }
    $scope.submitToSDC =  function(reverseIndex){
        var index = $scope.currentCase.screen_shot.length - (reverseIndex +1);//we are displaying screenshot in reverse order
        chrome.storage.local.get( ""+$scope.currentCase.user.id, function (result) {
            var userDataObject = result[$scope.currentCase.user.id];
            var user_networks = userDataObject['user_networks'];
            var networkIndex = $scope.findWithAttr(user_networks,'network_id',$scope.currentCase.network.id);
            var screenshotToUpload = userDataObject.user_networks[networkIndex].screen_shot[index];
            $scope.postImage(index, reverseIndex, screenshotToUpload, 0);
        });
    }

    $scope.postImage = function(screenshotIndex, reverseIndex, screenshot, imageIndex){
        console.log("updating user networks"+ imageIndex);
        $scope.$apply(function(){
            $scope.currentCase.screen_shot[screenshotIndex].status = "Uploading "+imageIndex+"/"+screenshot.images.length;
        });
        var oData = new FormData();

        oData.append("CustomField", "This is some extra data");
        oData.append("user_network[external_notes]", "AngularPluginTest");
        oData.append("profile_id", $scope.currentCase.user.id);
        oData.append("usr_network_id", $scope.currentCase.network.id);
        oData.append("network_id", $scope.currentCase.network.id);
        oData.append("screenshots[html_source][]", screenshot.htmlMetadata);
        oData.append("commit", "UpdateUsernetwork");
        oData.append("_method", "put");

        var oReq = new XMLHttpRequest();
        oReq.open("POST", "http://52.7.181.63/user_networks/"+$scope.currentCase.network.id, true);
        oReq.onload = function(oEvent) {
            console.log("response : "+oReq.status)
            if (oReq.status == 200) {
                imageIndex++;
                if(imageIndex <= (screenshot.images.length-1)){
                    $scope.postImage(screenshotIndex, reverseIndex, screenshot, imageIndex++)
                }else {
                    $scope.updateStatus(screenshotIndex, reverseIndex);
                }
            } else {
                $scope.$apply(function(){
                    $scope.currentCase.screen_shot[screenshotIndex].status = "Not Uploaded";
                });
                console.log("Error " + oReq.status + "occurred when trying to upload your file.");
            }
        };

        window.resolveLocalFileSystemURL = window.resolveLocalFileSystemURL || window.webkitResolveLocalFileSystemURL;
        var filename = screenshot.images[imageIndex].localURL;
        console.log("File : "+filename);

        window.resolveLocalFileSystemURL(filename, function(fileEntry) {
            console.log("file entry found");
            fileEntry.file(function(file) {
                console.log("file found"+file.name);
                oData.append("screenshots[image][]", file, file.name);
                oReq.send(oData);
                console.log("file sent");

            });
        });
    }
    $scope.updateStatus = function(screenshotIndex, reverseIndex){
        chrome.storage.local.get( ""+$scope.currentCase.user.id, function (result) {
            var userDataObject = result[$scope.currentCase.user.id];
            var user_networks = userDataObject['user_networks'];
            var networkIndex = $scope.findWithAttr(user_networks,'network_id',$scope.currentCase.network.id);
            userDataObject.user_networks[networkIndex].screen_shot[screenshotIndex].status = "Uploaded";
            var obj = {};
            obj[$scope.currentCase.user.id] = userDataObject;
            chrome.storage.local.set(obj);
            $scope.$apply(function(){
                $scope.currentCase.screen_shot[screenshotIndex].status = "Uploaded";
            });
        });
    }
    $scope.downloadImage = function(image){
        var a = $("<a>").attr("href", image.localURL).attr("download", image.localURL.replace(/^.*[\\\/]/, '')).appendTo("body");
        a[0].click();
        a.remove();
    }
    $scope.updateUser = function(){
        $scope.currentCase.screen_shot=[];
    }
    $scope.updateCurrentCase = function(){
        console.log("@@@@ updateurrentCase");
        $scope.getStoredData();
        chrome.runtime.sendMessage({
                action : "update_current_cases",
                case : $rootScope.cases,
                currentCaseName : $scope.currentCase.user.id,
                currentCaseNetwork : $scope.currentCase.network.id
            },
            function(response) {

            });
    }
    $scope.findWithAttr = function(array, attr, value) {
        for(var i = 0; i < array.length; i += 1) {
            if(array[i][attr] == value) {
                return i;
            }
        }
        return null;
    }
    $scope.deleteScreenshot = function(index){
        var reverseIndex = $scope.currentCase.screen_shot.length - (index +1);//we are displaying screenshot in reverse order
        chrome.runtime.sendMessage({
                action : "delete_screenshot",
                screenshotIndex : reverseIndex
            },
            function(response) {
            });
    }
    $scope.showTime = function(screenshot){
        alert("Comment Expansion Time : "+screenshot.commentExpansionTime+" secs\n"+
              "Screenshot Time : "+screenshot.screenshotTime+" secs\n"+
              "Saving Time : "+screenshot.savingTime+" secs");
    }
    $scope.groupScreenshots = function(screenshot){
        console.log(screenshot);
        var groupedScreenshot = [];
        var sessionMap = {};
        for(var i=0; i<screenshot.length; i++){
            var sessionId = screenshot[i].session_id;
            console.log(sessionId);
            console.log(sessionMap[sessionId]);
            if(sessionMap[sessionId]!=undefined){
                groupedScreenshot[sessionMap[sessionId]].groupedImages.push(screenshot[i].localURL);
            } else {
                screenshot[i].groupedImages = [screenshot[i].localURL];
                groupedScreenshot.push(screenshot[i]);
                sessionMap[sessionId] = groupedScreenshot.length -1;
            }
        }
        $scope.$apply(function(){
            $scope.currentCase.screen_shot = groupedScreenshot;
        });
        console.log(groupedScreenshot);
    }
    $scope.downloadZip = function(reverseIndex){
        var screenshotIndex = $scope.currentCase.screen_shot.length - (reverseIndex +1);//we are displaying screenshot in reverse order
        var images = $scope.currentCase.screen_shot[screenshotIndex].images;
        if(images && images.length > 0){
            $scope.zip=new JSZip();
            $scope.getBinaryContent(images, 0, screenshotIndex);
        } else {
            $scope.currentCase.screen_shot[screenshotIndex].status = "No image to download";
        }
        //var imgLinks=["filesystem:chrome-extension://cbbphkhpiijopkpclklhokmabjggmdac/persistent/SDC/1443492888776.png", "filesystem:chrome-extension://cbbphkhpiijopkpclklhokmabjggmdac/persistent/SDC/1443492884757.png", "filesystem:chrome-extension://cbbphkhpiijopkpclklhokmabjggmdac/persistent/SDC/1443492872201.png"];

    }
    $scope.getBinaryContent = function(images, index, screenshotIndex){
        $scope.$apply(function(){
            $scope.currentCase.screen_shot[screenshotIndex].status = "Zipping "+index+"/"+images.length;
        });
        console.log("Current index : "+index)
        JSZipUtils.getBinaryContent(images[index].localURL, function (err, data) {
            if(err) {
                console.error("Problem happened when download img");
            } else {
                $scope.zip.file("picture"+index+".png", data, {binary:true});
                data = null;
                if(index < (images.length - 1)){
                    index++;
                    $scope.getBinaryContent(images, index, screenshotIndex);
                } else{
                    var content = $scope.zip.generate({type:"blob"});
                    saveAs(content, "screenshots.zip");
                    content= null;
                    $scope.$apply(function(){
                        $scope.currentCase.screen_shot[screenshotIndex].status = "Complete";
                    });
                }
            }
        });
    }
    $scope.init();
});

sdcApp.controller('SettingsController', function ($scope) {
    $scope.settings = {};
    $scope.init = function(){
        chrome.storage.local.get('settings', function(result) {
            $scope.$apply(function(){
                $scope.settings = result.settings;
            });
        });

    }
    $scope.doTheBack = function() {
        window.history.back();
    };
    $scope.saveChanges = function(){
        chrome.storage.local.set({'settings': $scope.settings});
        console.log("setting saved..");
        $scope.doTheBack();
    }
    $scope.init();

});

sdcApp.controller('ScreenshotItemController', function ($scope, $rootScope, $routeParams) {
    $scope.clickedScreenshot;
    console.log("screenshot index : "+$routeParams.screenshotIndex);
    console.log("image index : "+$routeParams.imageIndex);
    console.log($rootScope.currentCase);
    //screenshot was showed in reverse order
    $scope.sIndex = ($rootScope.currentCase.screen_shot.length - (parseInt($routeParams.screenshotIndex) + 1));
    console.log("Index : "+$scope.sIndex);
    $scope.imageIndex = parseInt($routeParams.imageIndex);
    $scope.image = $rootScope.currentCase.screen_shot[$scope.sIndex].images[parseInt($scope.imageIndex)];
    console.log($scope.image);
    $scope.init = function(){

    }
    $scope.doTheBack = function() {
        window.history.back();
    };
    $scope.previousImage = function() {
        if($scope.imageIndex == 0) {
            $scope.imageIndex = $rootScope.currentCase.screen_shot[$scope.sIndex].images.length - 1;
        } else {
            $scope.imageIndex--;
        }
        $scope.image = $rootScope.currentCase.screen_shot[$scope.sIndex].images[parseInt($scope.imageIndex)];
    };
    $scope.nextImage = function() {
        if($scope.imageIndex == $rootScope.currentCase.screen_shot[$scope.sIndex].images.length - 1) {
            $scope.imageIndex = 0;
        } else {
            $scope.imageIndex++;
        }
        $scope.image = $rootScope.currentCase.screen_shot[$scope.sIndex].images[parseInt($scope.imageIndex)];
    };
    $scope.downloadImage = function(image){
        var a = $("<a>").attr("href", image.localURL).attr("download", image.localURL.replace(/^.*[\\\/]/, '')).appendTo("body");
        a[0].click();
        a.remove();
    }
    $scope.screenshotClicked = function(screenshot){
        console.log("screenshotClicked");
        console.log(screenshot);
        $scope.clickedScreenshot = screenshot;
    }
    $scope.uploadFile = function(element) {
        console.log("file changed");
        var files = event.target.files;
        console.log("@@upload files");
        console.log(files[0]);

        $scope.$apply(function(scope) {
            var photofile = files[0];
            console.log("file : "+photofile.name);
            navigator.webkitPersistentStorage.requestQuota(1024 * 1024, function () {
                window.webkitRequestFileSystem(window.PERSISTENT, 1024 * 1024, function (localstorage) {
                    console.log("creating file");
                    localstorage.root.getDirectory("demo", {create: true}, function() {
                        localstorage.root.getFile("/demo/"+photofile.name, {create: true}, function (DatFile) {
                            DatFile.createWriter(function (DatContent) {
                                DatContent.write(photofile);
                                console.log("write success");
                                console.log("clicked : "+$scope.clickedScreenshot);
                                chrome.storage.local.get( ""+$rootScope.currentCase.user.id, function (result) {
                                    var userDataObject = result[$rootScope.currentCase.user.id];;
                                    var caseUserIndex = $scope.findWithAttr($rootScope.cases, 'id', $rootScope.currentCase.user.id);
                                    var caseNetworkIndex = $scope.findWithAttr($rootScope.cases[caseUserIndex].user_networks,'id',$rootScope.currentCase.network.id);
                                    userDataObject.user_networks[caseNetworkIndex].screen_shot[$scope.sIndex].images[$scope.imageIndex].localURL = DatFile.toURL();

                                    var obj = {};
                                    obj[$rootScope.currentCase.user.id] = userDataObject;
                                    chrome.storage.local.set(obj);
                                    //update on UI
                                    $scope.$apply(function(){
                                        $scope.image.localURL = DatFile.toURL();
                                    });

                                });
                            });
                        }, function(e){ console.log(e)});

                    });
                });
            });

        });
    }
    $scope.findWithAttr = function(array, attr, value) {
        for(var i = 0; i < array.length; i += 1) {
            if(array[i][attr] == value) {
                return i;
            }
        }
        return null;
    }
    $scope.init();

});

/*
 $(function() {
 var interval = 10;
 var duration= 1000;
 var shake= 3;
 var selector = $('.view_more_box'); // Your own container ID
$(selector).each(function(){
    var elem = this;
    var vibrateIndex;
    var timeoutIndex;
    $(this).hover( //The button ID 

        function(){
            vibrateIndex = setInterval(function(){
                vibrate(elem);
            }, interval, 0);
            timeoutIndex = setTimeout(function(){clearInterval(vibrateIndex)},1000);
        },
        function(){
            clearInterval(vibrateIndex);
            clearTimeout(timeoutIndex);
        }
    );
})

var vibrate = function(elem){
    $(elem).stop(true,false)
        .css({position: 'relative',
            left: Math.round(Math.random() * shake) - ((shake + 1) / 2) +'px',
            top: Math.round(Math.random() * shake) - ((shake + 1) / 2) +'px'
        });
}
});
 */