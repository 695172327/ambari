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

var App = require('app');

/**
 * Gets the view backend URI
 *
 * @return  view backend URI
 */
function _getCapacitySchedulerViewUri(adapter) {
  if (App.testMode)
    return "/data";

  var parts = window.location.pathname.match(/[^\/]*/g).filterBy('').removeAt(0),
      view = parts[0],
      version = parts[1],
      instance = parts[2];
  if (parts.length == 2) { // version is not present
    instance = parts[1];
    version = '';
  }

  return '/' + [adapter.namespace,'views',view,'versions',version,'instances',instance,'resources','scheduler','configuration'].join('/');
}


App.QueueAdapter = DS.Adapter.extend({
  defaultSerializer:'queue',
  PREFIX: "yarn.scheduler.capacity",
  namespace: 'api/v1',
  queues: [],

  createRecord: function(store, type, record) {
    var data = record.toJSON({ includeId: true });
    return new Ember.RSVP.Promise(function(resolve, reject) {
      return store.filter('queue',function (q) {
        return q.id === record.id;
      }).then(function (queues) {
        var message;
        if (record.get('name.length')==0) {
          message = "Field can not be empty";
        } else if (queues.get('length') > 1) {
          message = "Queue already exists";
        }
        if (message) {
          var error = new DS.InvalidError({path:[message]});
          store.recordWasInvalid(record, error.errors);
          return;
        }
        Ember.run(record, resolve, {'queue':data,'label':[]});

      });
    });
  },

  deleteRecord:function (store, type, record) {
    return new Ember.RSVP.Promise(function(resolve, reject) {
      Ember.run(null, resolve, {'queue':record.serialize({ includeId: true , clone: true })});
    });
  },

  saveMark:'',

  updateRecord:function (store,type,record) {
    var adapter = this;
    var saveMark = this.get('saveMark'),
        uri = _getCapacitySchedulerViewUri(this),
        serializer = store.serializerFor('queue'),
        props = serializer.serializeConfig(record),
        new_tag = 'version' + Math.floor(+moment()),
        postSaveUri,data;

    if (saveMark) {
      postSaveUri = [_getCapacitySchedulerViewUri(this),saveMark].join('/');
      this.set('saveMark','');
    }

    data = JSON.stringify({'Clusters':
      {'desired_config':
        [{
          'type': 'capacity-scheduler',
          'tag': new_tag,
          'service_config_version_note': props.service_config_version_note,
          'properties': props.properties
        }]
      }
    });

    return new Ember.RSVP.Promise(function(resolve, reject) {
      adapter.ajax(uri,'PUT',{contentType:'application/json; charset=utf-8',data:data}).then(function(data) {
        store.setProperties({'current_tag':new_tag,'tag':new_tag});
        Ember.run(null, resolve, data.resources.objectAt(0).configurations.objectAt(0).configs);
      }, function(jqXHR) {
        jqXHR.then = null;
        Ember.run(null, reject, jqXHR);
      }).then(function () {
        if (postSaveUri) {
          adapter.postSave(postSaveUri);
        }
      });
    });
  },

  postSave:function(uri){
    this.ajax(uri,'PUT',{contentType:'application/json; charset=utf-8',data:JSON.stringify({save:true})});
  },

  /**
   * Finds queue by id in store.
   *
   */
  find: function(store, type, id) {
    id = id.toLowerCase();
    var record = store.getById(type,id);
    var key = type.typeKey;
    if (record) {
      return new Ember.RSVP.Promise(function(resolve, reject) {
        resolve({key:record.toJSON({includeId:true})});
      });
    } else {
      return store.findAll('queue').then(function (queues) {
        resolve({key:store.getById(type,id).toJSON({includeId:true})});
      });
    }
  },

  /**
   * Finds all queues.
   *
   */
  findAll: function(store, type) {
    var adapter = this;
    var uri = _getCapacitySchedulerViewUri(this);
    if (App.testMode)
      uri = uri + "/scheduler-configuration.json";

    return new Ember.RSVP.Promise(function(resolve, reject) {
      adapter.ajax(uri,'GET').then(function(data) {
        var config = data.items.objectAt(0);
        if (!store.get('isInitialized')) {
          store.set('current_tag',config.tag);
        }
        store.setProperties({'clusterName':config.Config.cluster_name,'tag':config.tag});
        Ember.run(null, resolve, data.items.objectAt(0).properties);
      }, function(jqXHR) {
        jqXHR.then = null;
        Ember.run(null, reject, jqXHR);
      });
    });
  },

  findAllTagged: function(store, type) {
    var adapter = this,
        uri = [_getCapacitySchedulerViewUri(this),'byTag',store.get('tag')].join('/');

    return new Ember.RSVP.Promise(function(resolve, reject) {
      adapter.ajax(uri,'GET').then(function(data) {
        Ember.run(null, resolve, data);
      }, function(jqXHR) {
        jqXHR.then = null;
        Ember.run(null, reject, jqXHR);
      });
    });
  },

  getNodeLabels:function () {
    var uri = [_getCapacitySchedulerViewUri(this),'nodeLabels'].join('/');

    return new Ember.RSVP.Promise(function(resolve, reject) {
      this.ajax(uri,'GET').then(function(data) {
        var parsedData = JSON.parse(data), labels;
          if (parsedData && Em.isArray(parsedData.nodeLabels)) {
            labels = parsedData.nodeLabels;
          } else {
            labels = (parsedData && parsedData.nodeLabels)?[parsedData.nodeLabels]:[];
          }
        Ember.run(null, resolve, labels.map(function (label) {
          return {name:label};
        }));
      }, function(jqXHR) {
        jqXHR.then = null;
        Ember.run(null, reject, jqXHR);
      });
    }.bind(this));
  },

  getPrivilege:function () {
    var uri = [_getCapacitySchedulerViewUri(this),'privilege'].join('/');
    if (App.testMode)
      uri = uri + ".json";
    return new Ember.RSVP.Promise(function(resolve, reject) {
      this.ajax(uri,'GET').then(function(data) {
        Ember.run(null, resolve, data);
      }, function(jqXHR) {
        jqXHR.then = null;
        Ember.run(null, reject, jqXHR);
      });
    }.bind(this));
  },

  ajax: function(url, type, hash) {
    var adapter = this;

    return new Ember.RSVP.Promise(function(resolve, reject) {
      hash = adapter.ajaxOptions(url, type, hash);

      hash.success = function(json) {
        Ember.run(null, resolve, json);
      };

      hash.error = function(jqXHR, textStatus, errorThrown) {
        Ember.run(null, reject, adapter.ajaxError(jqXHR));
      };

      Ember.$.ajax(hash);
    }, "DS: RestAdapter#ajax " + type + " to " + url);
  },

  ajaxOptions: function(url, type, hash) {
    hash = hash || {};
    hash.url = url;
    hash.type = type;
    hash.dataType = 'json';
    hash.context = this;

    hash.beforeSend = function (xhr) {
      xhr.setRequestHeader('X-Requested-By', 'view-capacity-scheduler');
    };
    return hash;
  },

  ajaxError: function(jqXHR) {
    if (jqXHR && typeof jqXHR === 'object') {
      jqXHR.then = null;
    }

    return jqXHR;
  }
});

App.SchedulerAdapter = App.QueueAdapter.extend({
  find: function(store, type, id) {
    return store.findAll('scheduler').then(function (scheduler) {
      return {"scheduler":scheduler.findBy('id',id).toJSON({includeId:true})};
    });
  }
});

App.TagAdapter = App.QueueAdapter.extend({
  /**
   * Finds all tags.
   *
   */
  findAll: function(store, type) {
    var adapter = this;
    var uri = [_getCapacitySchedulerViewUri(this),'all'].join('/');

    return new Ember.RSVP.Promise(function(resolve, reject) {
      adapter.ajax(uri ,'GET').then(function(data) {
        Ember.run(null, resolve, data);
      }, function(jqXHR) {
        jqXHR.then = null;
        Ember.run(null, reject, jqXHR);
      });
    });
  }
});

