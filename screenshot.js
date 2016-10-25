function cropImageFromCanvas(ctx, canvas) {

    var w = canvas.width,
            h = canvas.height,
            pix = {x: [], y: []},
    imageData = ctx.getImageData(0, 0, canvas.width, canvas.height),
            x, y, index;

    for (y = 0; y < h; y++) {
        for (x = 0; x < w; x++) {
            index = (y * w + x) * 4;
            if (imageData.data[index + 3] > 0) {

                pix.x.push(x);
                pix.y.push(y);

            }
        }
    }
    pix.x.sort(function (a, b) {
        return a - b
    });
    pix.y.sort(function (a, b) {
        return a - b
    });
    var n = pix.x.length - 1;

    w = pix.x[n] - pix.x[0];
    h = pix.y[n] - pix.y[0];
    var cut = ctx.getImageData(pix.x[0], pix.y[0], w, h);

    canvas.width = w;
    canvas.height = h;
    ctx.putImageData(cut, 0, 0);

//    var image = canvas.toDataURL();
//    var win = window.open(image, '_blank');
//    win.focus();

}

function setCaptureUrl(imagearray, loop_total, doc_height,shot_is_on) {
    var canvas = document.getElementById('canvas');
    var context = canvas.getContext('2d');
    canvas.width = screen.width;
    canvas.height = doc_height;
    console.log("imagearray-" + imagearray.length);
    console.log("shotison-" + shot_is_on);
    console.log("loop_total-" + loop_total + " doc_height-" + doc_height);
    for (var i = 0; i < imagearray.length; i++) {
        var imgDisp = new Image();
        imgDisp.src = imagearray[i];
        
        console.log(imgDisp.src);

//        context.strokeStyle='#F00';
//        context.lineWidth=3;
//        context.moveTo(0,i * imgDisp.height);
//        context.lineTo(imgDisp.width,i * imgDisp.height);
//        context.stroke();

        if (i === imagearray.length - 2 && !shot_is_on) {
            console.log("if ");
            var sourceX = 0;
            var minus = loop_total - doc_height;
            console.log(minus);
            var sourceY = minus;
            var sourceWidth = imgDisp.width;
            var sourceHeight = imgDisp.height;
            var destWidth = sourceWidth;
            var destHeight = sourceHeight;
            var destX = 0;
            var destY = i * imgDisp.height;
            context.drawImage(imgDisp, sourceX, sourceY, sourceWidth, sourceHeight, destX, destY, destWidth, destHeight);
            //context.drawImage(imgDisp, 0, i * imgDisp.height);
            console.log("loop_total-" + loop_total + " doc_height-" + doc_height + " imgDisp.height-" + imgDisp.height + " screen.height-" + screen.height + " imagearray.length-" + imagearray.length);
            cropImageFromCanvas(context, canvas);
        }
        else if(i === imagearray.length - 1 && shot_is_on){
            console.log("else if");            
            context.drawImage(imgDisp, 0, i * imgDisp.height);
            cropImageFromCanvas(context, canvas);
        }
        else{
            console.log("else");
            context.drawImage(imgDisp, 0, i * imgDisp.height);
        }

    }
    function downloadCanvas(link, canvasId, filename) {

//        var blob = dataURItoBlob(document.getElementById(canvasId).toDataURL());
//        link.href = blob;
//        link.download = filename;

        var dataURL = document.getElementById(canvasId).toDataURL('image/jpeg', 0.5);
        //var blob = dataURItoBlob(dataURL);

        link.href = dataURL;
        link.download = filename;
    }

    document.getElementById('download').addEventListener('click', function () {
        downloadCanvas(this, 'canvas', Math.random().toString(36).substring(7));
    }, false);

}
setTimeout(function () {
    var l = document.getElementById('download');
    l.click();
}, 5000);

function dataURItoBlob(dataURI) {
    // convert base64/URLEncoded data component to raw binary data held in a string
    var byteString;
    if (dataURI.split(',')[0].indexOf('base64') >= 0)
        byteString = atob(dataURI.split(',')[1]);
    else
        byteString = unescape(dataURI.split(',')[1]);

    // separate out the mime component
    var mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to a typed array
    var ia = new Uint8Array(byteString.length);
    for (var i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ia], {type:mimeString});
}