/* import the require libraries */
var http = require('http');
var fs   = require('fs');
var path = require('path');
var mime = require('mime');
var cache = {};

/*Logc to create an HTTP server */

var server = http.createServer(function(request,response){

    var filePath = false;

    if ( request.url == '/'){
        filePath = 'public/index.html';
    }else {
        filePath ='public' + request.url;
    }
    

    var absPath = './' + filePath;
    serveStatic(response,cache,absPath);
    
});

server.listen(3000,function(){
   console.log("Server listening on port 3000....."); 
});

/*Setting up the Socket.IO server */
var chatServer = require('./lib/chatserver');
chatServer.listen(server);

/* Response funcation for Resource not found */
function send404Response(response){
    response.writeHead(404, {'Content-Type' : 'text/plain'});
    response.write('Error 404: Resource not found');
    response.end();
}

/* Response to send file request */
function sendFile(response,filePath, fileContents){
    response.writeHead(200, {'Content-Type' : mime.lookup(path.basename(filePath))});
    response.write(fileContents);
    response.end();
}

/* Serve the static files*/
function serveStatic (response, cache, absPath){
    
    if (cache[absPath]){
        sendFile(response,absPath,cache[absPath]);
    } else {
        fs.exists(absPath,function (exsits) {
            if (exsits){
                
                fs.readFile(absPath, function (err, data) {
                    if (err){
                        send404Response(response);
                    }
                    else {
                        cache[absPath] = data;
                        sendFile(response,absPath,data);
                    }
                });
            }
            else {
                 send404Response(response);
            }
        });
    }
}