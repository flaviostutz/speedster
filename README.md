# speedster

[<img src="https://img.shields.io/docker/automated/flaviostutz/speedster"/>](https://hub.docker.com/r/flaviostutz/speedster)

Javascript based bandwidth tester that runs on html devices.

You can deploy Speedster backend on any server so that you can check for connectivity specifically to that server.

## Usage

* Create docker-compose.yml

```yml
version: '3.7'

services:

  speedster:
    image: flaviostutz/speedster
    environment:
      - LOG_LEVEL=debug
      - BASE_DIR=/opt/
      - MONGO_HOST=mongo
      - MONGO_USERNAME=root
      - MONGO_PASSWORD=root
    ports:
      - 50000:50000

  mongo:
    image: mongo:4.1.10
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: root
    ports:
      - 27017-27019:27017-27019

  mongo-express:
    image: mongo-express:0.49.0
    ports:
      - 8081:8081
    environment:
      ME_CONFIG_MONGODB_ADMINUSERNAME: root
      ME_CONFIG_MONGODB_ADMINPASSWORD: root

```

* Run 'docker-compose up'

* Open http://localhost:50000 on your browser and click "Start test!"

* Open http://localhost:8081/db/speedster/test-results and view the stored test results


## Environment properties

* MONGO_HOST - mongodb host
* MONGO_USERNAME - mongodb username
* MONGO_PASSWORD - mongdb password
* PING_MIN_COUNT - min pings
* PING_MAX_COUNT - max pings (may not reach if jitter converge among pings)
* PING_MAX_DURATION - max duration for each ping until skipping test
* TRANSFER_MIN_COUNT - min download/uploads for each data size tested
* TRANSFER_MAX_COUNT - max download/uploads for each data size tested
* TRANSFER_MAX_DURATION - max duration for each download/upload request until the test for the data size is skipped
* TRANSFER_MAX_STEPS - max data size steps used. Each step increments data download/upload by 10x, starting with 1kB
