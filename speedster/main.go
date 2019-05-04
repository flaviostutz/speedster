package main

import (
	"bytes"
	"crypto/rand"
	"encoding/json"
	"flag"
	"fmt"
	"io/ioutil"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/Sirupsen/logrus"
	"github.com/gorilla/mux"
)

const VERSION = "0.0.1"

var (
	baseDir    = ""
	repository Repository
)

func main() {
	logLevel := flag.String("loglevel", "debug", "debug, info, warning, error")
	mongoHost0 := flag.String("mongo-host", "", "MongoDB host")
	mongoUser0 := flag.String("mongo-username", "", "MongoDB username")
	mongoPassword0 := flag.String("mongo-password", "", "MongoDB password")
	baseDir0 := flag.String("base-dir", "", "Base dir")
	flag.Parse()

	switch *logLevel {
	case "debug":
		logrus.SetLevel(logrus.DebugLevel)
		break
	case "warning":
		logrus.SetLevel(logrus.WarnLevel)
		break
	case "error":
		logrus.SetLevel(logrus.ErrorLevel)
		break
	default:
		logrus.SetLevel(logrus.InfoLevel)
	}

	logrus.Infof("====Starting Speedster %s====", VERSION)

	baseDir = *baseDir0
	if baseDir == "" {
		panic("--assets-dir is required")
	}

	mongoHost := *mongoHost0
	if mongoHost == "" {
		panic("--mongo-host is required")
	}

	mongoUser := *mongoUser0
	if mongoUser == "" {
		panic("--mongo-user is required")
	}

	mongoPassword := *mongoPassword0
	if mongoPassword == "" {
		panic("--mongo-password is required")
	}

	i := 0
	for {
		logrus.Infof("Connecting to MongoDB at %s...", mongoHost)
		rep, err := NewRepository(mongoHost, mongoUser, mongoPassword)
		if err != nil {
			logrus.Infof("Could not connect to MongoDB. err=%s", err)
			if i < 5 {
				logrus.Infof("Retrying...")
				time.Sleep(2 * time.Second)
				i++
				continue
			} else {
				panic("Timeout trying to connect to MongoDB")
			}
		}
		repository = rep
		break
	}

	logrus.Infof("Listening on port 50000")

	router := mux.NewRouter()
	router.HandleFunc("/assets/{name}", handlerAssets).Methods("GET")
	router.HandleFunc("/download/{sizek}/{name}", handlerDownload).Methods("GET")
	router.HandleFunc("/upload/{name}", handlerUpload).Methods("POST")
	router.HandleFunc("/results", handlerResultsPost).Methods("POST")
	err := http.ListenAndServe("0.0.0.0:50000", router)
	if err != nil {
		logrus.Errorf("Error while listening requests: %s", err)
		os.Exit(1)
	}
}

func handlerResultsPost(w http.ResponseWriter, r *http.Request) {
	decoder := json.NewDecoder(r.Body)
	b := make(map[string]interface{})
	err := decoder.Decode(&b)
	if err != nil {
		writeResponse(w, http.StatusBadRequest, fmt.Sprintf("Error handling results post. err=%s", err.Error()))
	}

	//FIXME validate and fix input attribute

	err = repository.CreateTestResults(b)
	if err != nil {
		writeResponse(w, http.StatusInternalServerError, fmt.Sprintf("Error storing results. err=%s", err.Error()))
	}
}

func handlerAssets(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	name := vars["name"]
	logrus.Debugf("Asset start %s", name)
	start := time.Now()

	if name == "" {
		writeResponse(w, http.StatusBadRequest, fmt.Sprintf("Asset name not defined"))
		return
	}

	data, err := ioutil.ReadFile(fmt.Sprintf("%s%s", baseDir, name))
	if err != nil {
		writeResponse(w, http.StatusNotFound, fmt.Sprintf("Asset %s not found. err=%s", name, err))
		return
	}

	if strings.HasSuffix(name, ".jpg") {
		w.Header().Set("content-type", "image/jpg")
	}

	datab := bytes.NewBuffer(data)
	totalBytes, err := datab.WriteTo(w)
	if err != nil {
		logrus.Debugf("Asset error. err=%s", err)
		writeResponse(w, http.StatusInternalServerError, fmt.Sprintf("Error sending file. err=%s", err))
		return
	}
	t := time.Now()
	elapsedMillis := int64(t.Sub(start) / time.Millisecond)
	logrus.Debugf("Asset end name=%s; size=%d; time=%d ms; bps=%d", name, totalBytes, elapsedMillis, int64(float64(totalBytes)/(float64(elapsedMillis)/1000.0)))
}

func handlerDownload(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	name := vars["name"]
	sizek := vars["sizek"]
	logrus.Debugf("Download start %s. size=%s", name, sizek)
	start := time.Now()

	sizekn, err := strconv.Atoi(sizek)
	if err != nil {
		writeResponse(w, http.StatusBadRequest, "")
		return
	}

	totalBytes := 0
	data := make([]byte, 1024)
	for i := 0; i < sizekn; i++ {
		rand.Read(data)
		s, err := w.Write(data)
		totalBytes = totalBytes + s
		if err != nil {
			logrus.Debugf("Download error. err=%s", err)
			writeResponse(w, http.StatusInternalServerError, fmt.Sprintf("Error generating random data. err=%s", err.Error()))
			return
		}
	}

	t := time.Now()
	elapsedMillis := int64(t.Sub(start) / time.Millisecond)
	logrus.Debugf("Download end name=%s; size=%d; time=%d ms; bps=%d", name, totalBytes, elapsedMillis, int64(float64(totalBytes)/(float64(elapsedMillis)/1000.0)))
}

func handlerUpload(w http.ResponseWriter, r *http.Request) {
	vars := mux.Vars(r)
	name := vars["name"]
	logrus.Debugf("Upload start name=%s", name)
	start := time.Now()

	//read body contents
	data, err := ioutil.ReadAll(r.Body)
	if err != nil {
		logrus.Debugf("Upload error. err=%s", err)
		writeResponse(w, http.StatusInternalServerError, fmt.Sprintf("err=%s", err.Error()))
		return
	}

	totalBytes := len(data)
	t := time.Now()
	elapsedMillis := int64(t.Sub(start) / time.Millisecond)
	logrus.Debugf("Upload end name=%s; size=%d; time=%d ms; bps=%d", name, totalBytes, elapsedMillis, int64(float64(totalBytes)/(float64(elapsedMillis)/1000.0)))

	msg := make(map[string]map[string]interface{})
	attr := make(map[string]interface{})
	msg["result"] = attr
	attr["message"] = "File uploaded successfully"
	attr["size"] = totalBytes
	attr["durationMillis"] = elapsedMillis
	attr["bps"] = float64(totalBytes) / float64(elapsedMillis/1000)
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(msg)
}

func writeResponse(w http.ResponseWriter, statusCode int, message string) {
	msg := make(map[string]string)
	msg["message"] = message
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	json.NewEncoder(w).Encode(msg)
}
