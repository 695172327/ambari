#!/usr/bin/env bash
#
# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.
#

# the arguments passed to the hook script
HOOK_ARGS="$*"

echo "Executing user hook with parameters: $HOOK_ARGS"

# check for hadoop
type hadoop > /dev/null 2>&1 || { echo >&2 "hadoop tool not installed "; exit 1; }

# check for the hdfs
hadoop fs -ls / > /dev/null 2>&1 || { echo >&2 "dfs not available "; exit 1; }

# perform any specific logic on the arguments
# the default implementation creates user home folders; the first argument must be the username

# create the user home folder
hadoop fs -mkdir /user/$1