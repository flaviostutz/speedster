//Flávio Stutz@2019
//old school here because we want this to work on older browsers

var Speedster = function() {
    this.testsEnabled = true;
    this.statsArray = [];
}

Speedster.prototype.testHttpRequest = function(url, method, data, minCount, maxCount, maxDuration, stats, callback) {
    // console.log("testHttpRequest: url=" + url + "; maxCount=" + maxCount);    
    startTime = new Date();

    var xhttp = new XMLHttpRequest();
    var _self = this;
    var active = true;
    if (!_self.testsEnabled) {
        return
    }
    xhttp.onreadystatechange = function () {
        // console.log("readyState="+ this.readyState + "; status=" + this.status)
        if (this.readyState == 4) {
            if (this.status == 200 || this.status==201) {
                duration = new Date() - startTime;//in ms
                // console.log("http ping OK. duration=" + duration + "ms");
                stats.sample(duration);
                if (typeof callback.onProgress === 'function') {
                    // console.log("http req: " + stats.tostring());
                    callback.onProgress(stats);
                }
                if (duration > maxDuration) {
                    active = false
                    console.log("Request took too much time. method="+ method +"; url=" + url +"; duration=" + duration + "ms");
                }
                if((stats.stdDev()/stats.mean()) < 0.05 && stats.count()>minCount-1) {
                    active = false
                    console.log("Request duration converged. method=" + method +"; url=" + url +"; stats=" + stats.tostring());
                }
                if(maxCount>1 && active) {
                    window.setTimeout(function() {
                        _self.testHttpRequest(url, method, data, minCount, maxCount - 1, maxDuration, stats, callback);
                    }, 100);
                } else {
                    if (typeof callback.onFinish === 'function') {
                        console.log("test finished method=" + method + "; url=" + url + "; mean=" + stats.mean() + " ms");
                        callback.onFinish(stats);
                    }
                }
            } else {
                console.log("status!=200. method=" + method + "; url=" + url +"; status=" + this.status);
                if (typeof callback.onError === 'function') {
                    callback.onError(this.status);
                    active = false;
                }
            }
        }
    }
    // console.log("Sending GET request to " + url);
    xhttp.open(method, url, true);
    xhttp.send(data);
}

Speedster.prototype.progressiveRequestTest = function (baseSpeedsterUrl, method, dataSizeKB, minCount, maxCount, maxDuration, nextTimeout, nextStepDataRatio, stepNumber, maxSteps, callback) {
    var _self = this;
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

    if (typeof callback.onStart === 'function') {
        callback.onStart();
    }

    var stats = new Stats();
    _self.testHttpRequest(_self.url, method, _self.data, minCount, maxCount, maxDuration, stats, {
        onProgress: function (stats) {
            if (typeof callback.onStepProgress === 'function') {
                callback.onStepProgress(dataSizeKB, stats);
            }
        },
        onFinish: function (stats) {
            var totalTime = stats.count() * stats.mean();
            // console.log("Test finished. time=" + totalTime + "ms");
            _self.statsArray.push(stats);
            stats.url = _self.url;
            stats.method = method;
            stats.dataSizeKB = dataSizeKB;
            if (typeof callback.onStepFinish === 'function') {
                callback.onStepFinish(dataSizeKB);
            }
            if(totalTime>nextTimeout) {
                console.log("Next test step won't be executed. Timeout reached. method=" + method + "; url=" + _self.url +"; time=" + totalTime + "ms");
                if (typeof callback.onFinish === 'function') {
                    callback.onFinish(_self.statsArray);
                }
            } else if(stepNumber>=maxSteps) {
                console.log("Max steps reached. method = " + method + "; url =" + _self.url);
                if (typeof callback.onFinish === 'function') {
                    callback.onFinish(_self.statsArray);
                }
            } else {
                if (_self.testsEnabled) {
                    _self.progressiveRequestTest(baseSpeedsterUrl, method, dataSizeKB * nextStepDataRatio, minCount, maxCount, maxDuration, nextTimeout, nextStepDataRatio, stepNumber + 1, maxSteps, callback)
                }
            }
        },
        onError: function(status) {
            if (typeof callback.onError === 'function') {
                callback.onError(status);
            }
        }
    });
}

Speedster.prototype.sendResults = function(baseSpeedsterUrl, successCallback, errorCallback) {
    //prepare statistics
    var statsArray2 = this.statsArray.map(function (a) {
        return {
            url:a.url,
            method:a.method,
            dataSizeKB:a.dataSizeKB,
            max: a.max().toFixed(2),
            min:a.min().toFixed(2),
            mean:a.mean().toFixed(2),
            count:a.count(),
            stddev:a.stdDev().toFixed(2),
            kbps:(a.dataSizeKB*1024*10/(a.mean())).toFixed(2)
        }
    });

    uploadStats = statsArray2.filter(function (a) {
        return a.url.includes("upload");
    });
    su = new Stats();
    uploadStats.map(function(stats) {
        su.sample(stats.kbps);
    });

    downloadStats = statsArray2.filter(function (a) {
        return a.url.includes("download") && !a.url.includes("/0/");
    });
    sd = new Stats();
    downloadStats.map(function (stats) {
        sd.sample(stats.kbps);
    });

    pingStats = statsArray2.filter(function (a) {
        return a.url.includes("download") && a.url.includes("/0/");
    });



    //retrieve more info about our IP
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4) {
            var ipinfo = {};
            if (this.status == 200 || this.status == 201) {
                ipinfo = JSON.parse(this.responseText);
            } else {
                console.log("Couldn't get IP info");
                alert("Couldn't get IP info");
            }

            //post results
            var _self = this;
            var xhttp = new XMLHttpRequest();
            xhttp.onreadystatechange = function () {
                if (this.readyState == 4) {
                    if (this.status == 200 || this.status == 201) {
                        successCallback();
                    } else {
                        errorCallback(this.status);
                    }
                }
            }
            var url = baseSpeedsterUrl + "/results";
            xhttp.open("POST", url, true);
            xhttp.setRequestHeader("Content-Type", "application/json");

            var results = {
                "location": {},
                "ip": ipinfo.ip,
                "city": ipinfo.city,
                "region": ipinfo.region_code,
                "country": ipinfo.country_name,
                "continent": ipinfo.continent_code,
                "provider": ipinfo.org,
                "http-ping-ms": pingStats[0].mean,
                "http-ping-stddev": pingStats[0].stddev,
                "http-download-kbps": sd.max(),
                "http-upload-kbps": su.max(),
                "ipinfo": ipinfo,
                "stats": statsArray2
            }

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function showPosition(position) {
                    var geojson = geopositionToGeojson(position);
                    results.location = geojson;
                    console.log(results);
                    alert(results);
                    xhttp.send(JSON.stringify(results));
                });
            } else {
                console.log("This navigator doesn't support Geolocalization");
                alert("This navigator doesn't support Geolocalization");
                xhttp.send(JSON.stringify(results));
            }

        }
    }
    xhttp.open("GET", "https://ipapi.co/json/", true);
    xhttp.send();
}

Speedster.prototype.cancelOngoingTests = function () {
    this.testsEnabled = false;
}



var Stats = function() {
    this.items = [];
}

Stats.prototype.sample = function(value) {
    // console.log("SAMPLE " + this.items.length);
    this.items.push(value);
}
Stats.prototype.sum = function() {
    var sum = this.items.reduce(function(a,b) {
        return a + b;
    });
    return sum;
}
Stats.prototype.min = function () {
    return this.items.reduce(function(min, p) {
        return (p<min ? p : min);
    }, Number.MAX_VALUE);
}
Stats.prototype.max = function () {
    return this.items.reduce(function (max, p) {
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
Stats.prototype.tostring = function () {
    return "mean=" + this.mean().toFixed(2) + "; stdDev=" + this.stdDev().toFixed(2) + "; count=" + this.count().toFixed(2)
}

