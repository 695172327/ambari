/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.ambari.server.security;

import javax.servlet.http.HttpServletResponse;

import org.apache.ambari.server.configuration.Configuration;
import org.apache.commons.lang.StringUtils;

import com.google.inject.Singleton;

/**
 * AmbariServerSecurityHeaderFilter adds security-related headers to HTTP response messages for Ambari Server UI
 */
@Singleton
public class AmbariServerSecurityHeaderFilter extends AbstractSecurityHeaderFilter {

  @Override
  protected void processConfig(Configuration configuration) {
    setSslEnabled(configuration.getApiSSLAuthentication());
    setStrictTransportSecurity(configuration.getStrictTransportSecurityHTTPResponseHeader());
    setxFrameOptionsHeader(configuration.getXFrameOptionsHTTPResponseHeader());
    setxXSSProtectionHeader(configuration.getXXSSProtectionHTTPResponseHeader());
  }

  @Override
  protected void handleXFrameOptionsHeader(HttpServletResponse httpServletResponse, String headerValue) {
    if (StringUtils.isEmpty(httpServletResponse.getHeader(DENY_OVERRIDE_XFRAME_OPTIONS_FLAG))) {
      httpServletResponse.setHeader(X_FRAME_OPTIONS_HEADER, headerValue);
    }
    // todo the flag is left in the header! use the session instead?!
  }

}
