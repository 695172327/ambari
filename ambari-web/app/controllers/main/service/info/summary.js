/**
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with this
 * work for additional information regarding copyright ownership. The ASF
 * licenses this file to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

var App = require('app');

App.MainServiceInfoSummaryController = Em.Controller.extend({
  name: 'mainServiceInfoSummaryController',

  selectedFlumeAgent: null,

  /**
   * Indicates whether Ranger plugins status update polling is active
   * @type {boolean}
   */
  isRangerUpdateWorking: false,

  /**
   * Indicates whether array with initial Ranger plugins data is set
   * @type {boolean}
   */
  isRangerPluginsArraySet: false,

  /**
   * Indicates whether previous AJAX request for Ranger plugins config properties has failed
   * @type {boolean}
   */
  isPreviousRangerConfigsCallFailed: false,

  /**
   * UI section name
   */
  sectionName: function() {
    return this.get('content.serviceName') + "_SUMMARY";
  }.property('content.serviceName'),

  /**
   * Ranger plugins data
   * @type {array}
   */
  rangerPlugins: [
    {
      serviceName: 'HDFS',
      type: 'ranger-hdfs-plugin-properties',
      propertyName: 'ranger-hdfs-plugin-enabled'
    },
    {
      serviceName: 'HIVE',
      type: 'ranger-hive-plugin-properties',
      propertyName: 'ranger-hive-plugin-enabled'
    },
    {
      serviceName: 'HBASE',
      type: 'ranger-hbase-plugin-properties',
      propertyName: 'ranger-hbase-plugin-enabled'
    },
    {
      serviceName: 'KNOX',
      type: 'ranger-knox-plugin-properties',
      propertyName: 'ranger-knox-plugin-enabled'
    },
    {
      serviceName: 'STORM',
      type: 'ranger-storm-plugin-properties',
      propertyName: 'ranger-storm-plugin-enabled'
    }
  ],

  /**
   * Set initial Ranger plugins data
   * @method setRangerPlugins
   */
  setRangerPlugins: function () {
    if (App.get('router.clusterController.isLoaded') && !this.get('isRangerPluginsArraySet')) {
      this.setProperties({
        rangerPlugins: this.get('rangerPlugins').map(function (item) {
          var stackService = App.StackService.find().findProperty('serviceName', item.serviceName);
          var displayName = (stackService) ? stackService.get('displayName') : item.serviceName;
          return $.extend(item, {
            pluginTitle: Em.I18n.t('services.service.summary.ranger.plugin.title').format(displayName),
            isDisplayed: App.Service.find().someProperty('serviceName', item.serviceName),
            status: Em.I18n.t('services.service.summary.ranger.plugin.loadingStatus')
          });
        }),
        isRangerPluginsArraySet: true
      });
    }
  }.observes('App.router.clusterController.isLoaded'),

  /**
   * Get latest config tags
   * @method updateRangerPluginsStatus
   * @param callback
   */
  updateRangerPluginsStatus: function (callback) {
    App.ajax.send({
      name: 'config.tags',
      sender: this,
      success: 'getRangerPluginsStatus',
      callback: callback
    });
  },

  /**
   * Get latest Ranger plugins config properties
   * @method getRangerPluginsStatus
   * @param data
   */
  getRangerPluginsStatus: function (data) {
    var urlParams = [];
    this.get('rangerPlugins').forEach(function (item) {
      if (App.Service.find().someProperty('serviceName', item.serviceName)) {
        var currentTag = data.Clusters.desired_configs[item.type].tag;
        var isTagChanged = item.tag != currentTag;
        Em.set(item, 'isDisplayed', true);
        //Request for properties should be sent either if configs have changed or if previous Ranger plugins config properties has failed
        if (isTagChanged || this.get('isPreviousRangerConfigsCallFailed')) {
          Em.set(item, 'tag', currentTag);
          urlParams.push('(type=' + item.type + '&tag=' + currentTag + ')');
        }
      } else {
        Em.set(item, 'isDisplayed', false);
      }
    }, this);
    if (urlParams.length) {
      App.ajax.send({
        name: 'reassign.load_configs',
        sender: this,
        data: {
          urlParams: urlParams.join('|')
        },
        success: 'getRangerPluginsStatusSuccess',
        error: 'getRangerPluginsStatusError'
      });
    }
  },

  /**
   * Set Ranger plugins statuses
   * @method getRangerPluginsStatusSuccess
   * @param data
   */
  getRangerPluginsStatusSuccess: function (data) {
    this.set('isPreviousRangerConfigsCallFailed', false);
    data.items.forEach(function (item) {
      var serviceName = this.get('rangerPlugins').findProperty('type', item.type).serviceName;
      var propertyName = this.get('rangerPlugins').findProperty('type', item.type).propertyName;
      var statusMap = {
        Yes: 'alerts.table.state.enabled',
        No: 'alerts.table.state.disabled'
      };
      var statusString = statusMap[item.properties[propertyName]] || 'common.unknown';
      Em.set(this.get('rangerPlugins').findProperty('serviceName', serviceName), 'status', Em.I18n.t(statusString));
    }, this);
  },

  /**
   * Method executed if Ranger plugins config properties request has failed
   * @method getRangerPluginsStatusError
   */
  getRangerPluginsStatusError: function () {
    this.set('isPreviousRangerConfigsCallFailed', true);
  },

  /**
   * Send start command for selected Flume Agent
   * @method startFlumeAgent
   */
  startFlumeAgent: function () {
    var selectedFlumeAgent = arguments[0].context;
    if (selectedFlumeAgent && selectedFlumeAgent.get('status') === 'NOT_RUNNING') {
      var self = this;
      App.showConfirmationPopup(function () {
        var state = 'STARTED';
        var context = Em.I18n.t('services.service.summary.flume.start.context').format(selectedFlumeAgent.get('name'));
        self.sendFlumeAgentCommandToServer(state, context, selectedFlumeAgent);
      });
    }
  },

  /**
   * Send stop command for selected Flume Agent
   * @method stopFlumeAgent
   */
  stopFlumeAgent: function () {
    var selectedFlumeAgent = arguments[0].context;
    if (selectedFlumeAgent && selectedFlumeAgent.get('status') === 'RUNNING') {
      var self = this;
      App.showConfirmationPopup(function () {
        var state = 'INSTALLED';
        var context = Em.I18n.t('services.service.summary.flume.stop.context').format(selectedFlumeAgent.get('name'));
        self.sendFlumeAgentCommandToServer(state, context, selectedFlumeAgent);
      });
    }
  },

  /**
   * Send command for Flume Agent to server
   * @param {string} state
   * @param {string} context
   * @param {Object} agent
   * @method sendFlumeAgentCommandToServer
   */
  sendFlumeAgentCommandToServer: function (state, context, agent) {
    App.ajax.send({
      name: 'service.flume.agent.command',
      sender: this,
      data: {
        state: state,
        context: context,
        agentName: agent.get('name'),
        host: agent.get('hostName')
      },
      success: 'commandSuccessCallback'
    });
  },

  /**
   * Callback, that shows Background operations popup if request was successful
   */
  commandSuccessCallback: function () {
    console.log('Send request for refresh configs successfully');
    // load data (if we need to show this background operations popup) from persist
    App.router.get('applicationController').dataLoading().done(function (showPopup) {
      if (showPopup) {
        App.router.get('backgroundOperationsController').showPopup();
      }
    });
  },

  gotoConfigs: function () {
    App.router.get('mainServiceItemController').set('routeToConfigs', true);
    App.router.transitionTo('main.services.service.configs', this.get('content'));
    App.router.get('mainServiceItemController').set('routeToConfigs', false);
  },

  showServiceAlertsPopup: function (event) {
    var service = event.context;
    return App.ModalPopup.show({
      header: Em.I18n.t('services.service.summary.alerts.popup.header').format(service.get('displayName')),
      autoHeight: false,
      classNames: [ 'forty-percent-width-modal' ],
      bodyClass: Em.View.extend({
        templateName: require('templates/main/service/info/service_alert_popup'),
        classNames: ['service-alerts'],
        controllerBinding: 'App.router.mainAlertDefinitionsController',
        didInsertElement: function () {
          Em.run.next(this, function () {
            App.tooltip($(".timeago"));
          });
        },
        alerts: function () {
          var serviceDefinitions = this.get('controller.content').filterProperty('service', service);
          // definitions should be sorted in order: critical, warning, ok, unknown, other
          var criticalDefinitions = [], warningDefinitions = [], okDefinitions = [], unknownDefinitions = [];
          serviceDefinitions.forEach(function (definition) {
            if (definition.get('isCritical')) {
              criticalDefinitions.push(definition);
              serviceDefinitions = serviceDefinitions.without(definition);
            } else if (definition.get('isWarning')) {
              warningDefinitions.push(definition);
              serviceDefinitions = serviceDefinitions.without(definition);
            } else if (definition.get('isOK')) {
              okDefinitions.push(definition);
              serviceDefinitions = serviceDefinitions.without(definition);
            } else if (definition.get('isUnknown')) {
              unknownDefinitions.push(definition);
              serviceDefinitions = serviceDefinitions.without(definition);
            }
          });
          serviceDefinitions = criticalDefinitions.concat(warningDefinitions, okDefinitions, unknownDefinitions, serviceDefinitions);
          return serviceDefinitions;
        }.property('controller.content'),
        gotoAlertDetails: function (event) {
          if (event && event.context) {
            this.get('parentView').hide();
            App.router.transitionTo('main.alerts.alertDetails', event.context);
          }
        },
        closePopup: function () {
          this.get('parentView').hide();
        }
      }),
      isHideBodyScroll: false,
      primary: Em.I18n.t('common.close'),
      secondary: null
    });
  },

  /**
   * @type {boolean}
   */
  isWidgetsLoaded: false,

  /**
   * @type {boolean}
   */
  isWidgetLayoutsLoaded: false,

  /**
   * @type {boolean}
   */
  isAllSharedWidgetsLoaded: false,

  /**
   * @type {Em.A}
   */
  widgets: function() {
    return App.Widget.find().filterProperty('sectionName', this.get('content.serviceName') + '_SUMMARY');
  }.property('isWidgetsLoaded'),

  /**
   * @type {Em.A}
   */
  widgetLayouts: function() {
    return App.WidgetLayout.find();
  }.property('isWidgetLayoutsLoaded'),

  /**
   * load widget layouts across all users in CLUSTER scope
   * @returns {$.ajax}
   */
  loadWidgetLayouts: function() {
    this.set('isWidgetLayoutsLoaded', false);
    return App.ajax.send({
      name: 'widgets.layouts.get',
      sender: this,
      data: {
        sectionName: this.get('sectionName')
      },
      success: 'loadWidgetLayoutsSuccessCallback'
    });
  },

  loadWidgetLayoutsSuccessCallback: function(data) {
    App.widgetLayoutMapper.map(data);
    this.set('isWidgetLayoutsLoaded', true);
  },

  /**
   * load widgets defined by user
   * @returns {$.ajax}
   */
  loadWidgets: function () {
    this.set('isWidgetsLoaded', false);
    return App.ajax.send({
      name: 'widgets.layout.userDefined.get',
      sender: this,
      data: {
        loginName: App.router.get('loginName'),
        sectionName: this.get('sectionName')
      },
      success: 'loadWidgetsSuccessCallback'
    });
  },

  /**
   * success callback of <code>loadWidgets()</code>
   * @param {object|null} data
   */
  loadWidgetsSuccessCallback: function (data) {
    if (data.items[0]) {
      App.widgetMapper.map(data.items[0], this.get('content.serviceName'));
      this.set('isWidgetsLoaded', true);
    } else {
      this.loadStackWidgetsLayout();
    }
  },

  /**
   * load all shared widgets to show on widget browser
   * @returns {$.ajax}
   */
  loadAllSharedWidgets: function () {
    this.set('isAllSharedWidgetsLoaded', false);
    return App.ajax.send({
      name: 'widgets.all.shared.get',
      sender: this,
      success: 'loadAllSharedWidgetsSuccessCallback'
    });
  },

  /**
   * success callback of <code>loadAllSharedWidgets</code>
   * @param {object|null} data
   */
  loadAllSharedWidgetsSuccessCallback: function (data) {
    var addedWidgetsNames = this.get('widgets').mapProperty('widgetName');
    if (data.items[0] && data.items.length) {
      this.set("allSharedWidgets",
        data.items.map(function (widget) {
          var widgetType = widget.Widgets.widget_type;
          var widgetName = widget.Widgets.widget_name;
          return Em.Object.create({
            iconPath: "/img/widget-" + widgetType.toLowerCase() + ".png",
            widgetName: widgetName,
            displayName: widget.Widgets.display_name,
            description: widget.Widgets.description,
            widgetType: widgetType,
            serviceName: widget.Widgets.metrics.mapProperty('service_name').uniq().join('-'),
            added: addedWidgetsNames.contains(widgetName)
          });
        })
      );
      this.set('isAllSharedWidgetsLoaded', true);
    }
  },

  allSharedWidgets: [],

  /**
   * load widgets defined by stack
   * @returns {$.ajax}
   */
  loadStackWidgetsLayout: function () {
    return App.ajax.send({
      name: 'widgets.layout.stackDefined.get',
      sender: this,
      data: {
        stackVersionURL: App.get('stackVersionURL'),
        serviceName: this.get('content.serviceName')
      },
      success: 'loadStackWidgetsLayoutSuccessCallback'
    });
  },

  /**
   * success callback of <code>loadStackWidgetsLayout()</code>
   * @param {object|null} data
   */
  loadStackWidgetsLayoutSuccessCallback: function (data) {
    App.widgetMapper.map(data.artifact_data.layouts.findProperty('section_name', this.get('sectionName')), this.get('content.serviceName'));
    this.set('isWidgetsLoaded', true);
  },

  /**
   * add widgets, on click handler for "Add"
   */
  addWidget: function (event) {
    var widget = event.context;
    var widgetName = widget.widgetName;
    widget.set('added',!widget.added);
    // add current widget to current layout

  },

  /**
   * delete widgets, on click handler for "Added"
   */
  hideWidget: function (event) {
    var widget = event.context;
    var widgetName = widget.widgetName;
    widget.set('added',!widget.added);
    // hide current widget from current layout

  },

  /**
   * save layout
   * return {$.ajax}
   */
  saveLayout: function (widgets, layout) {
    var data = {
      "layout_name": layout.get('layoutName'),
      "section_name": layout.get('sectionName'),
      "scope": layout.get('scope'),
      "widgetLayoutInfo": widgets.map(function (widget) {
        return {
          "widget_name": widget.get('widgetName'),
          "id": widget.get('widgetId')
        }
      })
    };
    return App.ajax.send({
      name: 'widgets.layout.save',
      sender: this,
      data: data
    });
  },

  /**
   * create widget
   */
  createWidget: function () {
    App.router.send('addServiceWidget', this.get('content'));
  },

  /**
   * launch Widgets Browser popup
   * @method showPopup
   * @return {App.ModalPopup}
   */
  goToWidgetsBrowser: function () {

    var self = this;

    return App.ModalPopup.show({
      header: function () {
        return Em.I18n.t('dashboard.widgets.browser.header');
      }.property(''),

      classNames: ['sixty-percent-width-modal', 'widgets-browser-popup'],
      primary: Em.I18n.t('common.close'),
      secondary: null,
      onPrimary: function () {
        this.hide();
        self.set('isAllSharedWidgetsLoaded', false);
        self.set('allSharedWidgets', []);
      },
      autoHeight: false,
      isHideBodyScroll: false,
      bodyClass: Ember.View.extend({

        templateName: require('templates/common/modal_popups/widget_browser_popup'),
        controller: self,
        willInsertElement: function () {
          this.get('controller').loadAllSharedWidgets();
        },

        activeTab: 'shared',
        activeService: this.get('controller.content.serviceName'),
        activeStatus: '',

        content: function () {
          return this.get('controller.allSharedWidgets');
        }.property('controller.allSharedWidgets.length', 'controller.isAllSharedWidgetsLoaded'),

        // content filtered by tab, service name and status.
        // If tab changed, service/status set to default
        filteredContent: function () {

        }.property('content', 'activeTab', 'activeService', 'activeStatus'),

        isLoaded: function () {
          return !!this.get('controller.isAllSharedWidgetsLoaded');
        }.property('controller.isAllSharedWidgetsLoaded'),

        isWidgetEmptyList: function () {
          return !this.get('content.length');
        }.property('content.length'),

        /**
         * top tabs: Share / Mine
         */
        categories: [
          {
            name: 'shared',
            label: Em.I18n.t('dashboard.widgets.browser.menu.shared')
          },
          {
            name: 'mine',
            label: Em.I18n.t('dashboard.widgets.browser.menu.mine')
          }
        ],

        NavItemView: Ember.View.extend({
          tagName: 'li',
          classNameBindings: 'isActive:active'.w(),
          isActive: function () {
            return this.get('item') == this.get('parentView.activeTab');
          }.property('item', 'parentView.activeTab'),
          elementId: Ember.computed(function(){
            var label = Em.get(this, 'templateData.keywords.category.label');
            return label ? 'widget-browser-view-tab-' + label.toLowerCase().replace(/\s/g, '-') : "";
          }),
          goToWidgetTab: function (event) {
            var targetName = event.context;
            this.set('parentView.activeTab', targetName);
          }
        }),

        /**
         * service name filter
         */
        serviceNames: function () {

        }.property(),

        createWidget: function () {
          this.get('parentView').onPrimary();
          this.get('controller').createWidget();
        },

        didInsertElement: function () {

        }
      })
    });
  }

});