/**
 * This software is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License version 2.1 as published by the Free Software Foundation
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the GNU
 * Lesser General Public License for more details.
 *
 * @copyright  Copyright (c) 2008 Mayflower GmbH (http://www.mayflower.de)
 * @license    LGPL 2.1 (See LICENSE file)
 * @version    $Id$
 * @author     Gustavo Solt <solt@mayflower.de>
 * @package    PHProjekt
 * @link       http://www.phprojekt.com
 * @since      File available since Release 6.0
 */

dojo.provide("phpr.Calendar.Form");

dojo.declare("phpr.Calendar.Form", phpr.Default.Form, {

    _participantUrl: null,
    _multipleEvents: null,
    _owner:          null,

    initData:function() {
        // Get all the active users
        this.userStore = new phpr.Store.User();
        this._initData.push({'store': this.userStore});

        // Get the participants
        this._participantUrl = phpr.webpath + 'index.php/Calendar/index/jsonGetParticipants/id/' + this.id;
        this._initData.push({'url': this._participantUrl, 'noCache': true});

        // Get the tags
        this._tagUrl = phpr.webpath + 'index.php/Default/Tag/jsonGetTagsByModule/moduleName/' + phpr.module
            + '/id/' + this.id;
        this._initData.push({'url': this._tagUrl});
    },

    setPermissions:function(data) {
        if (this.id > 0) {
            this._accessPermissions = true;
            this._writePermissions  = true;
            this._deletePermissions = true;
        }
    },

    prepareSubmission:function() {
        this.sendData = new Array();

        for (var i = 0; i < this.formsWidget.length; i++) {
            if (!this.formsWidget[i].isValid()) {
                var parent = this.formsWidget[i].containerNode.parentNode.id;
                this.form.selectChild(parent);
                this.formsWidget[i].validate();
                return false;
            }
            this.sendData = dojo.mixin(this.sendData, this.formsWidget[i].attr('value'));
        }

        if (this.id > 0 && this.sendData.rruleFreq && null === this._multipleEvents) {
            this.showEventSelector('Edit', "submitForm");
            return false;
        }

        // check if rule for recurrence is set
        if (this.id > 0 && false === this._multipleEvents) {
            this.sendData.rrule = null;
        } else if (this.sendData.rruleFreq) {
            // set frequence
            var rrule = 'FREQ=' + this.sendData.rruleFreq;

            // set until value if available
            if (this.sendData.rruleUntil) {
                until = this.sendData.rruleUntil;
                if (!until.setHours) {
                    until = phpr.Date.isoDateTojsDate(until);
                }
                until.setHours(this.sendData.startTime.getHours());
                until.setMinutes(this.sendData.startTime.getMinutes());
                until.setSeconds(this.sendData.startTime.getSeconds());
                until = dojo.date.add(until, 'minute', until.getTimezoneOffset());
                rrule += ';UNTIL=' + dojo.date.locale.format(until, {datePattern: 'yyyyMMdd\'T\'HHmmss\'Z\'',
                    selector: 'date'});
                this.sendData.rruleUntil = null;
            }

            // set interval if available
            if (this.sendData.rruleInterval) {
                rrule += ';INTERVAL=' + this.sendData.rruleInterval;
                this.sendData.rruleInterval = null;
            }

            // set weekdays if available
            if (this.sendData['rruleByDay[]']) {
                rrule += ';BYDAY=' + this.sendData['rruleByDay[]'];
                this.sendData['rruleByDay[]'] = null;
            } else if (this.sendData['rruleByDay']) {
                rrule += ';BYDAY=' + this.sendData['rruleByDay'];
                this.sendData['rruleByDay'] = null;
            }
            this.sendData.rruleFreq = null;

            this.sendData.rrule = rrule;
        } else {
            this.sendData.rrule = null;
        }

        this.sendData.multipleEvents = this._multipleEvents;

        return true;
    },

    addModuleTabs:function(data) {
        this._owner = true;
        if (this.id > 0) {
            this._owner = data[0]["rights"]["currentUser"]["admin"];
        }

        if (this._owner) {
            this.addParticipantsTab(data);
        }

        this.addRecurrenceTab(data);
        this.addNotificationTab(data);
        if (this.id > 0) {
            this.addTab(this.render(["phpr.Default.template.history", "content.html"]), 'tabHistory', 'History');
        }
    },

    addParticipantsTab:function(data) {
        // summary:
        //    Participants tab
        // description:
        //    Display all the users for add into the event
        var userList     = this.userStore.getList();
        var urlData      = phpr.DataStore.getData({url: this._participantUrl});
        var currentUser  = data[0]["rights"]["currentUser"]["userId"] || 0;
        var participants = new Array();
        var users        = new Array();

        if (userList) {
            for (var i in userList) {
                // Make an array with the users expect the current one
                if (userList[i].id != currentUser) {
                    users.push({'id': userList[i].id, 'name': userList[i].name});
                }
            }
        }

        // Make an array with the current participants
        if (urlData.length > 0) {
            var temp = urlData.split(',');
            for (var i in temp) {
                if (temp[i] != currentUser) {
                    for (var j in userList) {
                        if (userList[j].id == temp[i]) {
                            var userName = userList[j].name;
                            break;
                        }
                    }
                    participants.push({'userId': temp[i], 'userName': userName});
                }
            }
        }

        // Template for the participants tab
        var participantData = this.render(["phpr.Calendar.template", "participanttab.html"], null, {
            participantUserText:    phpr.nls.get('User'),
            participantActionText:  phpr.nls.get('Action'),
            users:                  users,
            currentUser:            currentUser,
            participants:           participants
        });

        this.addTab(participantData, 'tabParticipant', 'Participants', 'participantFormTab');

        // Add button for participant
        var params = {
            label:     '',
            iconClass: 'add',
            alt:       'Add'
        };
        newParticipant = new dijit.form.Button(params);
        dojo.byId("participantAddButton").appendChild(newParticipant.domNode);
        dojo.connect(newParticipant, "onClick", dojo.hitch(this, "newParticipant"));

        // Delete buttons for participant
        for (i in participants) {
            var userId     = participants[i]["userId"];
            var buttonName = "participantDeleteButton" + userId;
            var params = {
                label:     '',
                iconClass: 'cross',
                alt:       'Delete'
            };

            var tmp = new dijit.form.Button(params);
            dojo.byId(buttonName).appendChild(tmp.domNode);
            dojo.connect(tmp, "onClick", dojo.hitch(this, "deleteParticipant", userId));
        }
    },

    newParticipant:function() {
        // summary:
        //    Add a new row of one participant
        // description:
        //    Add a the row of one participant
        var userId = dijit.byId("dataParticipantAdd").attr('value');
        if (!dojo.byId("trParticipantFor" + userId) && userId > 0) {
            phpr.destroyWidget("dataParticipant[" + userId + "]");
            phpr.destroyWidget("ParticipantDeleteButton" + userId);

            var userName = dijit.byId("dataParticipantAdd").attr('displayedValue');
            var table    = dojo.byId("participantTable");
            var row      = table.insertRow(table.rows.length);
            row.id       = "trParticipantFor" + userId;

            var cell = row.insertCell(0);
            cell.innerHTML = '<input id="dataParticipant[' + userId + ']" name="dataParticipant[' + userId + ']" '
                + ' type="hidden" value="' + userId + '" dojoType="dijit.form.TextBox" />' + userName;
            var cell = row.insertCell(1);
            cell.innerHTML = '<div id="participantDeleteButton' + userId + '"></div>';

            dojo.parser.parse(row);

            var buttonName = "participantDeleteButton" + userId;
            var params = {
                label:     '',
                iconClass: 'cross',
                alt:       'Delete'
            };
            var tmp = new dijit.form.Button(params);
            dojo.byId(buttonName).appendChild(tmp.domNode);
            dojo.connect(dijit.byId(tmp.id), "onClick", dojo.hitch(this, "deleteParticipant", userId));
        }
    },

    deleteParticipant:function(userId) {
        // summary:
        //    Remove the row of one participant
        // description:
        //    Remove the row of one participant
        //    and destroy all the used widgets
        phpr.destroyWidget("dataParticipant[" + userId + "]");
        phpr.destroyWidget("participantDeleteButton" + userId);

        var e      = dojo.byId("trParticipantFor" + userId);
        var parent = e.parentNode;
        parent.removeChild(e);
    },

    addRecurrenceTab:function(data) {
        // summary:
        //    Adds a tab for recurrence
        // description:
        //    Adds a tab to configure the rules if/when the event will reoccure
        var recurrenceTab = '';

        // Preset values
        var values = {
            FREQ: '',
            INTERVAL: 1,
            UNTIL: '',
            BYDAY: ''
        };

        // Parse data to fill the form
        if (data[0].rrule && data[0].rrule.length > 0) {
            var rrule = data[0].rrule.split(';');
            for (var i = 0; i < rrule.length; i++) {
                rule  = rrule[i].split('=');
                name  = rule[0];
                value = rule[1];
                switch (name) {
                    case 'UNTIL':
                        value = dojo.date.locale.parse(value, {datePattern: "yyyyMMdd'T'HHmmss'Z'", selector: 'date'});
                        value = dojo.date.add(value, 'minute', -value.getTimezoneOffset());
                        value = dojo.date.locale.format(value, {datePattern: 'yyyy-MM-dd', selector: 'date'});
                        break;
                }
                values[name] = value;
            }
        }

        // Create ranges
        var rangeFreq = new Array(
            {'id': '', 'name': phpr.nls.get('None')},
            {'id': 'DAILY', 'name': phpr.nls.get('Daily')},
            {'id': 'WEEKLY', 'name': phpr.nls.get('Weekly')},
            {'id': 'MONTHLY', 'name': phpr.nls.get('Monthly')},
            {'id': 'YEARLY', 'name': phpr.nls.get('Yearly')}
        );

        var rangeByday = new Array(
            {'id': 'MO', 'name': phpr.nls.get('Monday')},
            {'id': 'TU', 'name': phpr.nls.get('Tuesday')},
            {'id': 'WE', 'name': phpr.nls.get('Wednesday')},
            {'id': 'TH', 'name': phpr.nls.get('Thursday')},
            {'id': 'FR', 'name': phpr.nls.get('Friday')},
            {'id': 'SA', 'name': phpr.nls.get('Saturday')},
            {'id': 'SU', 'name': phpr.nls.get('Sunday')}
        );

        // Add fields
        // If the user is not the owner, can see the recurrence but disabled (add hidden fields for keep the value)
        if (this.id > 0) {
            var disabled = !this._owner;
        } else {
            var disabled = false;
        }
        recurrenceTab += this.fieldTemplate.selectRender(rangeFreq, phpr.nls.get('Repeats'), 'rruleFreq', values.FREQ,
            false, disabled);
        recurrenceTab += this.fieldTemplate.textFieldRender(phpr.nls.get('Interval'), 'rruleInterval',
            values.INTERVAL, false, disabled);
        recurrenceTab += this.fieldTemplate.dateRender(phpr.nls.get('Until'), 'rruleUntil', values.UNTIL, false,
            disabled);
        recurrenceTab += this.fieldTemplate.multipleSelectRender(rangeByday, phpr.nls.get('Weekdays'), 'rruleByDay',
            values.BYDAY, false, disabled, 7, true);

        // Add the tab to the form
        this.addTab(recurrenceTab, 'tabRecurrence', 'Recurrence', 'recurrenceTab');
    },

    deleteForm:function() {
        // summary:
        //    This function is responsible for deleting a dojo element
        // description:
        //    This function calls jsonDeleteAction

        if (this.id > 0 && null === this._multipleEvents) {
            this.showEventSelector('Delete', "deleteForm");
            return false;
        }

        this.sendData.multipleEvents = this._multipleEvents;

        phpr.send({
            url:       phpr.webpath + 'index.php/' + phpr.module + '/index/jsonDelete/id/' + this.id,
            content:   this.sendData,
            onSuccess: dojo.hitch(this, function(data) {
               new phpr.handleResponse('serverFeedback', data);
               if (data.type == 'success') {
                   phpr.send({
                        url: phpr.webpath + 'index.php/Default/Tag/jsonDeleteTags/moduleName/' + phpr.module
                            + '/id/' + this.id,
                        onSuccess: dojo.hitch(this, function(data) {
                            new phpr.handleResponse('serverFeedback', data);
                            if (data.type =='success') {
                                this.publish("updateCacheData");
                                this.publish("setUrlHash", [phpr.module]);
                            }
                        })
                    });
               }
            })
        });
    },

    showEventSelector:function(action, nextFunction) {
        dojo.byId("eventSelectorContainer").innerHTML = '';

        dojo.byId('eventSelectorTitle').innerHTML = phpr.nls.get(action + ' repeating events');
        dijit.byId('eventSelectorDialog').attr('title', phpr.nls.get('Calendar'));

        // Add button for one event
        var params = {
            label: phpr.nls.get(action + ' just this occurrence'),
            alt:   phpr.nls.get(action + ' just this occurrence')
        };
        var singleEvent = new dijit.form.Button(params);
        dojo.byId("eventSelectorContainer").appendChild(singleEvent.domNode);
        dojo.connect(singleEvent, "onClick", dojo.hitch(this, function() {
            this._multipleEvents = false;
            dijit.byId('eventSelectorDialog').hide();
            eval('this.' + nextFunction + '()');
        }));

        // Add button for multiple event
        var params = {
            label: phpr.nls.get(action + ' all occurrences'),
            alt:   phpr.nls.get(action + ' all occurrences')
        };
        var multipleEvent = new dijit.form.Button(params);
        dojo.byId("eventSelectorContainer").appendChild(multipleEvent.domNode);
        dojo.connect(multipleEvent, "onClick", dojo.hitch(this, function() {
            this._multipleEvents = true;
            dijit.byId('eventSelectorDialog').hide();
            eval('this.' + nextFunction + '()');
        }));

        dijit.byId('eventSelectorDialog').show();
    },

    updateData:function() {
        phpr.DataStore.deleteData({url: this._url});
        phpr.DataStore.deleteData({url: this._participantUrl});
        phpr.DataStore.deleteData({url: this._tagUrl});
    }
});
