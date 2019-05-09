FROM golang:1.10 AS BUILD

# RUN go get -v github.com/Soulou/curl-unix-socket

#doing dependency build separated from source build optimizes time for developer, but is not required
#install external dependencies first
# ADD go-plugins-helpers/Gopkg.toml $GOPATH/src/go-plugins-helpers/
ADD /main.dep $GOPATH/src/speedster/main.go
RUN go get -v speedster

#now build source code
ADD speedster $GOPATH/src/speedster
RUN go get -v speedster
# RUN go test -v speedster


FROM golang:1.10

ENV LOG_LEVEL ''
ENV BASE_DIR ''
ENV MONGO_HOST ''
ENV MONGO_USERNAME ''
ENV MONGO_PASSWORD ''

ENV PING_MIN_COUNT 20
ENV PING_MAX_COUNT 40
ENV PING_MAX_DURATION 5000

ENV TRANSFER_MIN_COUNT 5
ENV TRANSFER_MAX_COUNT 10
ENV TRANSFER_MAX_DURATION 15000
ENV TRANSFER_MAX_STEPS 4

COPY --from=BUILD /go/bin/* /bin/
ADD startup.sh /
ADD assets/* /opt/

EXPOSE 50000

CMD [ "/startup.sh" ]
