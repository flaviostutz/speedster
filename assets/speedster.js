//Flávio Stutz@2019
//old school here because we want this to work on older browsers

var Speedster = function() {
}

Speedster.prototype.testHttpRequest = function(url, method, data, count, callback) {
    console.log("testHttpRequest: url=" + url + "; count=" + count);
    var stats = new Stats();
    startTime = new Date();

    var xhttp = new XMLHttpRequest();
    var _self = this;
    _self.active = true;
    xhttp.onreadystatechange = function () {
        // console.log("readyState="+ this.readyState + "; status=" + this.status)
        if (this.readyState == 4) {
            if (this.status == 200 || this.status==201) {
                duration = new Date() - startTime;//in ms
                // console.log("http ping OK. duration=" + duration + "ms");
                stats.sample(duration);
                if (typeof callback.onProgress === 'function') {
                    console.log("ping ok: " + stats.tostring());
                    callback.onProgress(stats);
                }
                if(count>1 && _self.active) {
                    window.setTimeout(function() {
                        _self.testHttpRequest(url, method, data, count - 1, callback);
                    }, 100);
                } else {
                    if (typeof callback.onFinish === 'function') {
                        console.log("test finished");
                        callback.onFinish(stats);
                    }
                }
            } else {
                console.log("status!=200. status=" + this.status);
                if (typeof callback.onError === 'function') {
                    callback.onError(status);
                    _self.active = false;
                }
            }
        }
    }
    // console.log("Sending GET request to " + url);
    xhttp.open(method, url, true);
    if(data!=null) {
        xhttp.setRequestHeader("Content-Length", data.length);
    }
    xhttp.send(data);
}

Speedster.prototype.progressiveRequestTest = function(baseSpeedsterUrl, method, dataSizeKB, count, nextTimeout, nextStepDataRatio, stepNumber, maxSteps, callback) {
    var _self = this;
    _self.statsArray = [];
    _self.data = null;
    if(method=="GET") {
        _self.url = baseSpeedsterUrl + "/download/" + dataSizeKB + "/download.jpg";
    } else if(method=="POST") {
        _self.url = baseSpeedsterUrl + "/upload/upload.jpg";
        //generate random data for upload test
        _self.data = new Uint8Array(dataSizeKB*1024);
        for(i=0; i<_self.data.length; i++) {
            _self.data[i] = (Math.random()*255);
        }
    } else {
        throw new Exception("'method' must be either GET or POST");
    }
    _self.testHttpRequest(_self.url, method, _self.data, count, {
        onProgress: function (stats) {
            if (typeof callback.onStepProgress === 'function') {
                callback.onStepProgress(dataSizeKB, stats);
            }
        },
        onFinish: function (stats) {
            var totalTime = stats.count() * stats.mean();
            console.log("Test finished. time=" + totalTime + "ms");
            _self.statsArray.push(stats);
            stats.url = _self.url;
            stats.method = method;
            stats.dataSizeKB = dataSizeKB;
            if (typeof callback.onStepFinish === 'function') {
                callback.onStepFinish(dataSizeKB);
            }
            if(totalTime>nextTimeout) {
                console.log("Next test step won't be executed. Timeout reached. time=" + totalTime + "ms");
                if (typeof callback.onFinish === 'function') {
                    callback.onFinish(_self.statsArray);
                }
            } else if(stepNumber>=maxSteps) {
                console.log("Tests finished.");
                if (typeof callback.onFinish === 'function') {
                    callback.onFinish(_self.statsArray);
                }
            } else {
                _self.progressiveRequestTest(baseSpeedsterUrl, method, dataSizeKB*nextStepDataRatio, count, nextTimeout, nextStepDataRatio, stepNumber+1, maxSteps, callback)
            }
        },
        onError: function(status) {
            if (typeof callback.onError === 'function') {
                callback.onError(status);
            }
        }
    });
}

Speedster.prototype.sendResults = function (baseSpeedsterUrl, statsArray, callback) {
    // /results
}

var Stats = function() {
    this.items = [];
}

Stats.prototype.sample = function(value) {
    this.items.push(value);
}
Stats.prototype.sum = function() {
    var sum = this.items.reduce(function(a,b) {
        return a + b;
    });
    return sum;
}
Stats.prototype.min = function () {
    return data.reduce(function(min, p) {
        return (p<min ? p : min);
    }, Number.MAX_VALUE);
}
Stats.prototype.max = function () {
    return data.reduce(function (max, p) {
        return (p > max ? p : max);
    }, Number.MIN_VALUE);
}
Stats.prototype.count = function () {
    return this.items.length;
}
Stats.prototype.mean = function () {
    return this.sum() / this.count()
}
Stats.prototype.variance = function () {
    var m = this.mean();
    var a = this.items;
    var sqrSum = 0
    for (i = 0; i < this.count(); i++) {
        sqrSum += Math.pow(a[i] - m, 2);
    }
    return sqrSum / this.count();
}
Stats.prototype.stdDev = function () {
    return Math.sqrt(this.variance())
}
Stats.prototype.jitter = function () {
    return Math.sqrt(this.stdDev() / this.count())
}
Stats.prototype.tostring = function () {
    return "mean=" + this.mean() + "; stdDev=" + this.stdDev() + "; count=" + this.count()
}

