#!/usr/bin/python
"""
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

"""

import sys
import os
from resource_management.libraries.functions.version import compare_versions, format_hdp_stack_version
from resource_management.libraries.functions.dynamic_variable_interpretation import copy_tarballs_to_hdfs
from resource_management.libraries.functions.format import format
from resource_management.libraries.functions.check_process_status import check_process_status
from resource_management.core.resources import Execute
from resource_management.core.exceptions import ComponentIsNotRunning
from resource_management.core.logger import Logger
from resource_management.core import shell
from setup_spark import *
from spark_service import spark_service


class JobHistoryServer(Script):

  def install(self, env):
    import params
    env.set_params(params)
    
    self.install_packages(env)
    
  def configure(self, env):
    import params
    env.set_params(params)
    
    setup_spark(env, 'server', action = 'config')
    
  def start(self, env, rolling_restart=False):
    import params
    env.set_params(params)
    
    self.configure(env)
    spark_service(action='start')

  def stop(self, env, rolling_restart=False):
    import params
    env.set_params(params)
    
    spark_service(action='stop')

  def status(self, env):
    import status_params
    env.set_params(status_params)

    check_process_status(status_params.spark_history_server_pid_file)
    

  def get_stack_to_component(self):
     return {"HDP": "spark-historyserver"}

  def pre_rolling_restart(self, env):
    import params

    env.set_params(params)
    if params.version and compare_versions(format_hdp_stack_version(params.version), '2.2.0.0') >= 0:
      Execute(format("hdp-select set spark-historyserver {version}"))
      copy_tarballs_to_hdfs('tez', 'spark-historyserver', params.spark_user, params.hdfs_user, params.user_group)

if __name__ == "__main__":
  JobHistoryServer().execute()
