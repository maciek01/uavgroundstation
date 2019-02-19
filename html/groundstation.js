/**
 * 
 */

var SERVER_URL = "/uavserver/v1";

var debug = getURLParameter("debug") == "true";
// var debug = true;

var currentUnit = "drone1";

var marker = null;

var homeMarker = null;

var mainMap = null;

var contextMenu = null;

var lastAlt = 0;

var lastSpeed = 0;

var currentWPIndex = 1;

var allMarkers = [];

var fakeDroneHeartbeat = {
	heartbeat : {
		"unitId" : "drone1",
		"stateTimestampMS" : 1482972148956,
		"gpsLatLon" : "",
		"gpsLat" : 42.5227644,
		"gpsLon" : -71.186572,
		"gpsAlt" : 51.768,
		"homeLatLon" : "",
		"homeLat" : 42.52252,
		"homeLon" : -71.1867931,
		"homeAlt" : 52.515,
		"gpsSpeed" : 0.945113480091095,
		"gpsTime" : "none",
		"gpsStatus" : "none",
		"gpsLastStatusMS" : 1482972148956,
		"airSpeed" : 0.0,
		"baroAlt" : 0.0,
		"sonarAlt" : 0.0,
		"heading" : 237,
		"status" : "STANDBY",
		"gpsNumSats" : 12,
		"gpsLock" : 4,
		"gpsHError" : 91,
		"gpsVError" : 168,
		"currVolts" : 12.316,
		"currVoltsLevel" : 88.0,
		"currMah" : 0.73,
		"unitCallbackPort" : "8080",
		"unitHostAddress" : "108.49.218.135"
	}
};

var heartbeats = null;

initMapWithRemoteCoords();

$(function() {
    $('#spinnerAlt').spinner({
        min: 2,
        max: 500,
        step: 1,
        stop:function(e,ui){
            setAlt($('#spinnerAlt').val());
        }
    });
});


$(function() {
    $('#spinnerSpeed').spinner({
        min: 1,
        max: 15,
        step: 1,
        stop:function(e,ui){
            setSpeed($('#spinnerSpeed').val());
        }
    });
});

/******************************** UI FUNCTION **********************************/

function initMapWithRemoteCoords() {

	getDroneLocation(initMap, currentUnit);

	getAllDrones(function(data) {
		heartbeats = data.data;
		var options = $("#drones");
		$.each(heartbeats.heartbeats, function() {
			options.append($("<option />").val(this.heartbeat.unitId).text(
					this.heartbeat.unitId));
		});
	});

}

function initMap(data) {
	if (!data || !data.data || !data.data.heartbeat) {
		data = {
			heartbeat : {
				gpsLat : 0,
				gpsLon : 0,
				heading : 0
			}
		};
	} else {
		data = data.data;
	}
	// if no gps lock
	if (data.heartbeat.gpsLat == null)
		data.heartbeat.gpsLat = 0;
	if (data.heartbeat.gpsLon == null)
		data.heartbeat.gpsLon = 0;

	mainMap = new GMaps({
		el : '#map',
		zoom : 20,
		lat : data.heartbeat.gpsLat,
		lng : data.heartbeat.gpsLon
	});

	// add top menu
	/*	
	 addControl("ARM", arm);
	 addControl("DISARM", disarm);
	 addControl("TAKEOFF", takeoff);	
	 addControl("LAND", land);
	 addControl("RETURN HOME", returnToHome);
	 addControl("PAUSE", pause);
 	 addControl("RESUME", resume);
 	 addControl("POSITION", position);
 	 addControl("LOITER", loiter);
 	 addControl("MANUAL", manual);
	
	 var controlDiv = document.createElement('div');
	 */

	mainMap.setContextMenu({
		control : 'map',
		options : [ {
			title : 'ADD WAYPOINT',
			name : 'add_waypoint',
			style : {
				margin : '7px',
				padding : '10px 10px',
				border : 'solid 1px #717B87',
				fontFamily : 'Roboto, sans-serif',
				background : '#fff'
			},
			action : function(e) {

				var waypoint = this.addMarker({
					lat : e.latLng.lat(),
					lng : e.latLng.lng(),
					title : 'WP ' + currentWPIndex++
				});

				allMarkers.push(waypoint);

			}
		}, {
			title : 'GO HERE',
			name : 'go_here',
			action : function(e) {

				gotoXYZ(e.latLng.lat(), e.latLng.lng());

			}
		}, {
			title : 'SET HOME',
			name : 'set_home',
			action : function(e) {

				setHome(e.latLng.lat(), e.latLng.lng());

			}
		} ]
	});

	// every 1 second
	window.setInterval(updateMarkers, 1000);

}

function addControl(name, callback) {
	mainMap.addControl({
		position : 'bottom_center',
		content : name,
		style : {
			margin : '7px',
			padding : '10px 10px',
			border : 'solid 1px #717B87',
			fontFamily : 'Roboto, sans-serif',
			background : '#fff'
		},
		events : {
			click : callback
		}
	});
}

function removeMarkers() {
	for (i = 0; i < allMarkers.length; i++) {
		allMarkers[i].setMap(null);
	}
	allMarkers = [];
}

function isInBounds(aMarker) {
	return mainMap.getBounds().contains(aMarker.getPosition());
}

function updateMarkers() {

	// a.forEach(function(element) {
	// console.log(element);
	// });

	getDroneLocation(function(data) {

		if (!data || !data.data || !data.data.heartbeat) {
			data = {
				heartbeat : {
					gpsLat : 0,
					gpsLon : 0,
					heading : 0
				}
			};
		} else {
			data = data.data;
		}
		// if no GPS Lock
		if (data.heartbeat.gpsLat == null)
			data.heartbeat.gpsLat = 0;
		if (data.heartbeat.gpsLon == null)
			data.heartbeat.gpsLon = 0;

		//draw drone
		if (marker == null) {

			marker = mainMap.addMarker({
				lat : data.heartbeat.gpsLat,
				lng : data.heartbeat.gpsLon,
				title : data.heartbeat.unitId,
				label : data.heartbeat.unitId,
				icon : {
					path : typeof data.heartbeat.heading !== 'undefined' ? google.maps.SymbolPath.FORWARD_CLOSED_ARROW : google.maps.SymbolPath.CIRCLE,
					scale : 10,
					strokeColor : "red",
					rotation : data.heartbeat.heading
				},
				click : function(e) {
					alert('You clicked in this marker');
				}
			});

		} else {
			marker.setPosition({
				lat : data.heartbeat.gpsLat,
				lng : data.heartbeat.gpsLon
			});
			marker.setIcon({
				path : typeof data.heartbeat.heading !== 'undefined' ? google.maps.SymbolPath.FORWARD_CLOSED_ARROW : google.maps.SymbolPath.CIRCLE,
				scale : 10,
				strokeColor : "red",
				rotation : data.heartbeat.heading
			});
		}
		//draw home
		if (homeMarker == null) {

			if (data.heartbeat.homeLat && data.heartbeat.homeLon) {

				homeMarker = mainMap.addMarker({
					lat : data.heartbeat.homeLat,
					lng : data.heartbeat.homeLon,
					title : "home-"+data.heartbeat.unitId,
					label : "home-"+data.heartbeat.unitId,
					icon : {
						path : google.maps.SymbolPath.CIRCLE,
						scale : 10,
						strokeColor : "red"
						//rotation : data.heartbeat.heading
					},
					click : function(e) {
						alert('You clicked in this marker');
					}
				});
			}

		} else {
			if (data.heartbeat.homeLat && data.heartbeat.homeLon) {
				homeMarker.setPosition({
					lat : data.heartbeat.homeLat,
					lng : data.heartbeat.homeLon
				});
			}
			homeMarker.setIcon({
				path : google.maps.SymbolPath.CIRCLE,
				scale : 10,
				strokeColor : "red"
				//rotation : data.heartbeat.heading
			});
		}
		updateInfo(data);
	}, currentUnit);
}

function updateInfo(data) {

	if (currentUnit == data.heartbeat.unitId) {

		$("#unit").html(data.heartbeat.unitId);
		$("#uavMode").html(data.heartbeat.mode);
		$("#armed").html(data.heartbeat.armed ? "ARMED" : "DISARMED");
		$("#heading").html(data.heartbeat.heading);
		$("#spinnerAlt").val(data.heartbeat.operatingAlt);
		$("#spinnerSpeed").val(data.heartbeat.operatingSpeed);
		$("#gps-speed").html((data.heartbeat.gpsSpeed ? data.heartbeat.gpsSpeed.toFixed(2) : "--") + " m/s");
		$("#alt-baro").html((data.heartbeat.baroAlt ? data.heartbeat.baroAlt.toFixed(2) : "--") + " m");
		$("#alt-lidar").html((data.heartbeat.lidarAlt ? data.heartbeat.lidarAlt.toFixed(2) : "--") + " m");
		//$("#alt-gps").html((data.heartbeat.gpsAlt ? data.heartbeat.gpsAlt.toFixed(2) : "--") + " m");
		$("#alt-gps").html((data.heartbeat.gpsAltRel ? data.heartbeat.gpsAltRel.toFixed(2) : "--") + " m");
		$("#gps-sats").html(data.heartbeat.gpsNumSats);
		$("#gps-lock").html(data.heartbeat.gpsLock);
		$("#bat").html(
				data.heartbeat.currVolts + " V " + data.heartbeat.currVoltsLevel
						+ "%");
		$("#curr").html(data.heartbeat.currA + " A");
		$("#curr_tot").html(data.heartbeat.currTotmAh + " mAh");
		$("#modemstatus").html(data.heartbeat.modemstatus);
		$("#modemsignal").html(data.heartbeat.modemsignal);

		//update command list
		listActions(currentUnit, function(commands) {
			
			var html = "";
			if (commands && commands.data) {
				commands = commands.data;
				$.each(commands, function() {
					html += "<div id=\"command-list-item\">"+this.command.name+"</div>";
				});
			}
			$("#command-list").html(html);
		});
	}
}

/********************* DATA FUNCTIONS ******************************************/

function getURLParameter(sParam) {
	var sPageURL = window.location.search.substring(1);
	var sURLVariables = sPageURL.split('&');
	for (var i = 0; i < sURLVariables.length; i++) {
		var sParameterName = sURLVariables[i].split('=');
		if (sParameterName[0] == sParam) {
			return sParameterName[1];
		}
	}

	return "";
}

function getDroneLocationURL(unitId) {
	return SERVER_URL + "/heartbeat/" + unitId;
}

function getComandsURL(unitId) {
	return SERVER_URL + "/actions/" + unitId;
}

function getAllDronesURL() {
	return SERVER_URL + "/heartbeats";
}

function getActionURL() {
	return SERVER_URL + "/action";
}

function getDroneLocation(callback, unitId) {
	if (debug) {
		// make it rotate a bit with every refresh

		fakeDroneHeartbeat.heartbeat.heading += 10;

		if (fakeDroneHeartbeat.heartbeat.heading > 360)
			fakeDroneHeartbeat.heartbeat.heading -= 360;

		callback({data:fakeDroneHeartbeat});

		return;
	}
	// $.getJSON(getDroneLocationURL(unitId), callback);
	$.get(getDroneLocationURL(unitId), {}, callback).fail(function() {
		// Handle error here
		callback(null);
	});
}

function listActions(unitId, callback) {
	$.get(getComandsURL(unitId), {}, callback).fail(function() {
		// Handle error here
		callback(null);
	});	
}

function deleteActions(unitId, callback) {
	
	$.get(getComandsURL("delete/" + unitId), {}, callback).fail(function() {
		// Handle error here
		callback(null);
	});	
	
	/*
	$.ajax({
		url : getComandsURL(unitId),
		type : 'DELETE',
		data : '',
		dataType : 'text',
		success : callback
	});
	*/
}

function getAllDrones(callback) {
	if (debug) {
		// make it rotate a bit with every refresh

		fakeDroneHeartbeat.heartbeat.heading += 10;

		if (fakeDroneHeartbeat.heartbeat.heading > 360)
			fakeDroneHeartbeat.heartbeat.heading -= 360;

		heartbeats = {
			heartbeats : [ fakeDroneHeartbeat ]
		}

		//TODO: why not heartbeats??
		callback({data:fakeDroneHeartbeat});

		return;
	}
	$.get(getAllDronesURL(), {}, callback).fail(function() {
		// Handle error here
		callback(null);
	});
}

function sendAction(data, callback) {

	$.ajax({
        processData:false,
		url : getActionURL(),
		type : 'POST',
        contentType:"application/json",
        //headers: { 'Content-Type': 'application/json' },
		dataType : 'json',
		success : callback,
		data : JSON.stringify(data)
        //data : data
	});

	//console.log(JSON.stringify(data));
}

function buildActionRequest(unitId, command, parameters) {

	var action = {
		unitId : unitId,
		command : {
			name : command,
			parameters : parameters
		}

	};

	return action;
}

/******************* MENU HANDLERS *********************************************/

/** clear unsent command queue for current unit */
function clearQueue() {

	if (!currentUnit)
		return;

	deleteActions(currentUnit, function(data) {});
	$("#command-list").html("");

}

function handleActionResponse(data) {
	// ???
}

function arm() {
	sendAction(buildActionRequest(currentUnit, "ARM"), function() {

	});
}
function disarm() {
	sendAction(buildActionRequest(currentUnit, "DISARM"), function() {

	});
}
function takeoff() {
	sendAction(buildActionRequest(currentUnit, "TAKEOFF"), function() {

	});
}
function land() {
	sendAction(buildActionRequest(currentUnit, "LAND"), function() {

	});
}
function returnToHome() {
	sendAction(buildActionRequest(currentUnit, "RTL"), function() {

	});
}
function pause() {
	sendAction(buildActionRequest(currentUnit, "PAUSE"), function() {

	});
}
function resume() {
	sendAction(buildActionRequest(currentUnit, "RESUME"), function() {

	});
}
function loiter() {
	sendAction(buildActionRequest(currentUnit, "LOITER"), function() {

	});
}
function position() {
	sendAction(buildActionRequest(currentUnit, "POSITION"), function() {

	});
}
function manual() {
	sendAction(buildActionRequest(currentUnit, "MANUAL"), function() {

	});
}
function rehome() {
	sendAction(buildActionRequest(currentUnit, "REHOME"), function() {

	});
}
function decAlt1() {
	sendAction(buildActionRequest(currentUnit, "DECALT1"), function() {

	});
}
function decAlt10() {
	sendAction(buildActionRequest(currentUnit, "DECALT10"), function() {

	});
}
function incAlt10() {
	sendAction(buildActionRequest(currentUnit, "INCALT10"), function() {

	});
}
function incAlt1() {
	sendAction(buildActionRequest(currentUnit, "INCALT1"), function() {

	});
}

function decSpeed1() {
	sendAction(buildActionRequest(currentUnit, "DECSPEED1"), function() {

	});
}
function decSpeed10() {
	sendAction(buildActionRequest(currentUnit, "DECSPEED10"), function() {

	});
}
function incSpeed10() {
	sendAction(buildActionRequest(currentUnit, "INCSPEED10"), function() {

	});
}
function incSpeed1() {
	sendAction(buildActionRequest(currentUnit, "INCSPEED1"), function() {

	});
}

function gotoXYZ(lat, lon) {

	var parameters = [ {
		name : "lat",
		value : lat
	}, {
		name : "lon",
		value : lon
	} ];

	sendAction(buildActionRequest(currentUnit, "GOTO", parameters),
			function() {

			});
}

function setHome(lat, lon) {

	var parameters = [ {
		name : "lat",
		value : lat
	}, {
		name : "lon",
		value : lon
	} ];

	sendAction(buildActionRequest(currentUnit, "SETHOME", parameters),
			function() {

			});
}


function setSpeed(speed) {

	var parameters = [ {
		name : "speed",
		value : speed
	}];

	sendAction(buildActionRequest(currentUnit, "SPEED", parameters),
			function() {

			});
}


function setAlt(alt) {

	var parameters = [ {
		name : "alt",
		value : alt
	}];

	sendAction(buildActionRequest(currentUnit, "ALT", parameters),
			function() {

			});
}



