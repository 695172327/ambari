#!/usr/bin/env bash +a
#   Licensed under the Apache License, Version 2.0 (the "License");
#   you may not use this file except in compliance with the License.
#   You may obtain a copy of the License at
#
#       http://www.apache.org/licenses/LICENSE-2.0
#
#   Unless required by applicable law or agreed to in writing, software
#   distrbuted under the License is distributed on an "AS IS" BASIS,
#   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#   See the License for the specific language governing permissions and
#   limitations under the License.


check-dev-env(){
: ${HOME?"Please set the variable in the .dev-profile file"}
: ${DEV_AMBARI_PROJECT_DIR?"Please set the variable in the .dev-profile file"}
: ${DEV_AMBARI_SERVER_CONFIG_DIR?"Please set the variable in the .dev-profile file"}
: ${DEV_NUMBER_OF_AGENTS:=3}
}

show-dev-env(){
  echo "Development environement variables: "
  for i in ${!DEV_*}
  do
    eval val=\$$i
    echo $i = $val
  done
}

generate-dev-env-profile() {
  if [ ! -f .dev-profile ]
    then
      cat > .dev-profile <<EOF
# The locatin of theambari project on the host
#DEV_AMBARI_PROJECT_DIR=

# The location of the server configuration files
#DEV_AMBARI_SERVER_CONFIG_DIR=

# Number of ambari agents to start
#DEV_NUMBER_OF_AGENTS=
EOF
echo "Please fill the newly generated .dev-profile in the current directory"
exit 1;
   else
    source .dev-profile
    show-dev-env
  fi
}

check-dev-docker-image() {
  if docker history -q ambari/docker-dev:latest 2>&1 >/dev/null; then
    echo "ambari/docker-dev image found."
  else
    docker build -t ambari/docker-dev .
  fi
}

build-ambari-agent-rpm() {
  if [ "$(ls $DEV_AMBARI_PROJECT_DIR/ambari-agent/target/rpm/ambari-agent/RPMS/x86_64 | wc -l)" -ge "1" ]
  then
    echo "Ambari agent rpm found."
  else
    echo "Generating ambari agent rpm ..."
    docker run --rm --privileged -v $DEV_AMBARI_PROJECT_DIR/:/ambari -v $DEV_AMBARI_PROJECT_DIR/dev-support/docker/dev-docker:/scripts -v $HOME/.m2/:/root/.m2 --entrypoint=/bin/bash ambari/docker-dev -c '/scripts/buildAgentRpm.sh'
  fi
}


generate-docker-compose-yml() {
  echo "Regenerating the compose file..."
  echo "Removing existing compose file..."
  rm $1  &>/dev/null
  echo "Done."
  echo "Generating the compose file ..."
  cat > $1<<EOF
ambari-db:
  privileged: true
  container_name: ambari-db
  ports:
    - "5432:5432"
  volumes:
    - "/var/lib/boot2docker/ambari:/var/lib/postgresql/data"
  image: sequenceiq/ambari-dev-psql

ambari-server:
  privileged: true
  container_name:
    - ambari-server
  ports:
    - "50100:50100"
    - "8080:8080"
  volumes:
    - "$DEV_AMBARI_PROJECT_DIR/:/ambari"
    - "$HOME/.m2/:/root/.m2"
    - "$DEV_AMBARI_SERVER_CONFIG_DIR/:/ambari-server-conf"
    - "$DEV_AMBARI_PROJECT_DIR/dev-support/docker/dev-docker:/scripts"
    - "$HOME/tmp/:/tmp"
  hostname: ambari-server
  image: ambari/docker-dev
  entrypoint: ["/bin/sh"]
  command: -c '/scripts/runServer.sh'
EOF

for (( i=1; i<=$DEV_NUMBER_OF_AGENTS; i++ ))
do
    cat <<EOF >> $1
ambari-agent-$i:
  privileged: true
  container_name: ambari-agent-$i
  hostname: ambari-agent-$i
  image: ambari/docker-dev
  environment:
    - AMBARI_SERVER_HOSTNAME=ambari-server
  entrypoint: ["/bin/sh"]
  volumes:
    - "$DEV_AMBARI_PROJECT_DIR/:/ambari"
    - "$HOME/.m2/:/root/.m2"
    - "$DEV_AMBARI_PROJECT_DIR/dev-support/docker/dev-docker:/scripts"
  command: -c '/scripts/runAgent.sh'
EOF
done
echo "Done."
}

main() {
  generate-dev-env-profile
  check-dev-env
  check-dev-docker-image
  build-ambari-agent-rpm
  generate-docker-compose-yml docker-compose.yml
}

main "$@"
