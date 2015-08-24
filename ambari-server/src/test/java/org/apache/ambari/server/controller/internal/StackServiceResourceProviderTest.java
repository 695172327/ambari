/**
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

package org.apache.ambari.server.controller.internal;


import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableMap;
import com.google.common.collect.ImmutableSet;
import org.apache.ambari.server.controller.AmbariManagementController;
import org.apache.ambari.server.controller.StackServiceRequest;
import org.apache.ambari.server.controller.StackServiceResponse;
import org.apache.ambari.server.controller.spi.Request;
import org.apache.ambari.server.controller.spi.Resource;
import org.apache.ambari.server.controller.spi.ResourceProvider;
import org.apache.ambari.server.controller.utilities.PropertyHelper;
import org.apache.ambari.server.state.ServiceInfo;
import org.apache.ambari.server.state.ServicePropertyInfo;
import org.junit.Before;
import org.junit.Test;

import java.util.List;
import java.util.Map;
import java.util.Set;

import static org.junit.Assert.assertEquals;
import static org.mockito.Mockito.*;


public class StackServiceResourceProviderTest {

  private final String  SERVICE_PROPERTIES_PROPERTY_ID = PropertyHelper.getPropertyId("StackServices", "properties");
  private final ServicePropertyInfo P1 = new ServicePropertyInfo();
  private final ServicePropertyInfo P2 = new ServicePropertyInfo();

  private Map<String, String> TEST_SERVICE_PROPERTIES = null;

  private  List<ServicePropertyInfo> TEST_SERVICE_PROPERTY_LIST = null;

  @Before
  public void setUp() throws Exception {
    P1.setName("P1");
    P1.setValue("V1");

    P2.setName("P2");
    P2.setValue("V2");

    TEST_SERVICE_PROPERTY_LIST = ImmutableList.of(P1, P2);
    TEST_SERVICE_PROPERTIES = ImmutableMap.of(P1.getName(), P1.getValue(), P2.getName(), P2.getValue());
  }

  @Test
  public void testGetServiceProperties() throws Exception {
    // Given
    AmbariManagementController managementController = mock(AmbariManagementController.class);
    Resource.Type type = Resource.Type.StackService;

    StackServiceResponse stackServiceResponse = mock(StackServiceResponse.class);
    when(stackServiceResponse.getServiceProperties()).thenReturn(TEST_SERVICE_PROPERTIES);

    when(managementController.getStackServices(anySetOf(StackServiceRequest.class)))
      .thenReturn(ImmutableSet.of(stackServiceResponse));

    Request request = PropertyHelper.getReadRequest(SERVICE_PROPERTIES_PROPERTY_ID);

    ResourceProvider stackServiceResourceProvider = AbstractControllerResourceProvider.getResourceProvider(type,
      PropertyHelper.getPropertyIds(type),
      PropertyHelper.getKeyPropertyIds(type),
      managementController);

    // When
    Set<Resource> resources = stackServiceResourceProvider.getResources(request, null);

    // Then
    Resource expected =  new ResourceImpl(type);


    BaseProvider.setResourceProperty(expected, SERVICE_PROPERTIES_PROPERTY_ID, TEST_SERVICE_PROPERTIES, ImmutableSet.of(SERVICE_PROPERTIES_PROPERTY_ID));

    assertEquals(ImmutableSet.of(expected), resources);
  }


  @Test
  public void testGetVisibilityServiceProperties() throws Exception {
    // Given
    AmbariManagementController managementController = mock(AmbariManagementController.class);
    Resource.Type type = Resource.Type.StackService;

    ServiceInfo serviceInfo = mock(ServiceInfo.class);
    when(serviceInfo.getServicePropertyList()).thenReturn(TEST_SERVICE_PROPERTY_LIST);
    when(serviceInfo.getServiceProperties()).thenCallRealMethod();

    StackServiceResponse stackServiceResponse = new StackServiceResponse(serviceInfo);

    when(managementController.getStackServices(anySetOf(StackServiceRequest.class)))
      .thenReturn(ImmutableSet.of(stackServiceResponse));

    Request request = PropertyHelper.getReadRequest(SERVICE_PROPERTIES_PROPERTY_ID);

    ResourceProvider stackServiceResourceProvider = AbstractControllerResourceProvider.getResourceProvider(type,
      PropertyHelper.getPropertyIds(type),
      PropertyHelper.getKeyPropertyIds(type),
      managementController);

    // When
    Set<Resource> resources = stackServiceResourceProvider.getResources(request, null);
    Map<String, String> expectedServiceProperties = ImmutableMap.<String, String>builder()
      .putAll(TEST_SERVICE_PROPERTIES)
      .put(ServiceInfo.DEFAULT_SERVICE_INSTALLABLE_PROPERTY)
      .put(ServiceInfo.DEFAULT_SERVICE_MANAGED_PROPERTY)
      .put(ServiceInfo.DEFAULT_SERVICE_MONITORED_PROPERTY)
      .build();

    // Then
    Resource expected =  new ResourceImpl(type);
    BaseProvider.setResourceProperty(expected, SERVICE_PROPERTIES_PROPERTY_ID, expectedServiceProperties, ImmutableSet.of(SERVICE_PROPERTIES_PROPERTY_ID));

    assertEquals(ImmutableSet.of(expected), resources);
  }
}
