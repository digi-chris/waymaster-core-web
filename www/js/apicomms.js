var apiHost = "http://...";

var authString = null;
var __callIdCounter = 0;
var __cancelledCalls = {};
var __currentCalls = 0;

var originalHref = '';

if (originalHref.endsWith('/')) {
    originalHref = originalHref.substring(0, originalHref.length - 1);
}

function cancelApiCall(callid) {
    if (__cancelledCalls[callid] === -1) {
        // only signal for a cancel if the call exists, just to keep things tidy.
        __cancelledCalls[callid] = 1;
    }
}

var waitObj = null;

function apiCall(functionName, args, callback, fail, cancelled) {
    var tItem = null;

    __callIdCounter++;
    __currentCalls++;
    var thisCallId = __callIdCounter;
    __cancelledCalls[thisCallId] = -1;
    var fullURL = apiHost;
    if (functionName.substring(0, 1) === '/') {
        fullURL = apiHost + functionName + '?';
    } else {
        fullURL = apiHost + '/' + functionName + '?';
    }

    for (var obj in args) {
        fullURL += obj + '=' + args[obj] + '&';
    }

    var opts = {};
    if (rgApi.Authentication.__identity !== null) {
        opts.headers = { "identity": JSON.stringify(rgApi.Authentication.__identity) };
    }

    var request = new XMLHttpRequest();

    request.open('GET', fullUrl, true);
    var contentTypeSet = false;
    var jsonExpected = false;
    for(var headerName in opts.headers) {
        request.setRequestHeader(headerName, opts.headers[headerName]);
        if(headerName.toUpperCase() === "CONTENT-TYPE") {
            contentTypeSet = true;
            if(opts.headers[headerName].indexOf("application/json") > -1) {
                jsonExpected = true;
            }
        }
    }

    if(!contentTypeSet) {
        request.setRequestHeader("Content-Type", "application/json; charset=UTF-8");
        jsonExpected = true;
    }

    request.onload = function() {
        if(this.status >= 200 && this.status < 400) {
            __currentCalls--;
            var data;
            if(jsonExpected && this.responseText && this.responseText !== "") {
                data = JSON.parse(this.responseText);
            } else {
                data = this.responseText;
            }

            if(__cancelledCalls[thisCallId] === -1) {
                if (!data) {
                    callback();
                } else if (data === "") {
                    callback();
                } else {
                    callback(data);
                }
            } else {
                if (cancelled) {
                    cancelled(data);
                }
            }
            delete __cancelledCalls[thisCallId];
        } else {
            __currentCalls--;
            delete __cancelledCalls[thisCallId];
            if (this.status === 401 || this.status === 400) {
                loginAlert(() => {
                    // successCallback - try running the last call again
                    apiCall(functionName, args, callback, fail, cancelled);
                }, () => {
                    // errorCallback - do exactly the same thing as above
                    apiCall(functionName, args, callback, fail, cancelled);
                });
            } else {
                if (fail) {
                    fail(this);
                } else {
                    console.error("Unhandled exception from apiCall.", this);
                }
            }
        }
    };
    request.send();
    return __callIdCounter;
}

function apiCallPost(functionName, obj, callback, cancelled, responseType) {
    var tItem = null;

    __currentCalls++;
    __callIdCounter++;
    var thisCallId = __callIdCounter;
    __cancelledCalls[thisCallId] = -1;
    var fullURL;
    if (functionName.substring(0, 1) === '/') {
        fullURL = apiHost + functionName;
    } else {
        fullURL = apiHost + '/' + functionName;
    }

    var request = new XMLHttpRequest();
    request.open('POST', fullUrl, true);

    if (rgApi.Authentication.__identity !== null) {
        request.setRequestHeader("identity", JSON.stringify(rgApi.Authentication.__identity));
    }

    request.onload = function() {
        if(this.status >= 200 && this.status < 400) {
            __currentCalls--;
            var data;
            if(jsonExpected && this.responseText && this.responseText !== "") {
                data = JSON.parse(this.responseText);
            } else {
                data = this.responseText;
            }

            if(__cancelledCalls[thisCallId] === -1) {
                if (!data) {
                    callback();
                } else if (data === "") {
                    callback();
                } else {
                    callback(data);
                }
            } else {
                if (cancelled) {
                    cancelled(data);
                }
            }
            delete __cancelledCalls[thisCallId];
        } else {
            __currentCalls--;
            delete __cancelledCalls[thisCallId];
            if (this.status === 401 || this.status === 400) {
                loginAlert(() => {
                    // successCallback - try running the last call again
                    apiCallPost(functionName, obj, callback, cancelled);
                }, () => {
                    // errorCallback - do exactly the same thing as above
                    apiCallPost(functionName, obj, callback, cancelled);
                });
            } else {
                if (cancelled) {
                    cancelled(this);
                } else {
                    console.error("Unhandled exception from apiCall.", this);
                }
            }
        }
    };

    if (responseType) {
        request.responseType = responseType;
    } else {
        request.responseType = "json";
    }

    request.send(JSON.stringify(obj));

    return __callIdCounter;
}