package main

import (
	"time"

	"github.com/Sirupsen/logrus"
	mgo "gopkg.in/mgo.v2"
)

//Repository repository struct
type Repository struct {
	session *mgo.Session
}

//NewRepository instantiate new repo
func NewRepository(host string, user string, password string) (Repository, error) {
	mongoDBDialInfo := &mgo.DialInfo{
		Addrs:    []string{host},
		Timeout:  2 * time.Second,
		Database: "admin",
		Username: user,
		Password: password,
	}
	session, err := mgo.DialWithInfo(mongoDBDialInfo)
	if err != nil {
		return Repository{}, err
	}
	logrus.Debugf("Connected to MongoDB successfully")
	rep := Repository{}
	rep.session = session
	return rep, nil
}

//CreateTestResults create new test results in MongoDB
func (r *Repository) CreateTestResults(testResults map[string]interface{}) error {
	sc := r.session.Copy()
	defer sc.Close()
	st := sc.DB("speedster").C("test-results")
	err := st.Insert(testResults)
	return err
}
