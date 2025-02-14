/**
 * 
 */

var SERVER_URL = "/uavserver/v1";

var debug = getURLParameter("debug") == "true";
// var debug = true;

var currentUnit = ""
var currentServerData = {};

//var marker = null;
var markers = [];

var adsbMarkers = [];

//var homeMarker = null;
var homeMarkers = [];

var mainMap = null;

var contextMenu = null;

var lastAlt = 0;

var lastSpeed = 0;

var lastGotoLat = null;

var lastGotoLon = null;

var dest = null;

var currentWPIndex = 1;

var allMarkers = [];

var current_videostat = "";

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


function onUnitChange() {

    currentUnit = $('#drones').val();
    clearQueue();
    console.log("Unit changed to: " + currentUnit);
    var newPos = markers[currentUnit].getPosition();
    mainMap.setCenter(newPos.lat(), newPos.lng());
    //$("#gsTitle").html("Ground Station - tracking " + currentUnit);
    document.title = "Ground Station - tracking " + currentUnit;
}

/******************************** UI FUNCTION **********************************/

function initMapWithRemoteCoords() {
	
	//get all drones and find the current one

	var maxTSUnitId = "";
	var maxTS = 0;
	getAllDrones(function(data) {
		heartbeats = data.data;
		var options = $("#drones");
		$.each(heartbeats.heartbeats, function() {
			options.append($("<option />").val(this.heartbeat.unitId).text(this.heartbeat.unitId));
			console.log("found unit:" + this.heartbeat.unitId + "/" + this.heartbeat.stateTimestampMS);
			if (this.heartbeat.stateTimestampMS > maxTS) {
				maxTS = this.heartbeat.stateTimestampMS;
				maxTSUnitId = this.heartbeat.unitId;
			}
		});

		$('#drones').val(maxTSUnitId != "" ? maxTSUnitId : $('#drones').val());
		currentUnit = $('#drones').val();
		console.log("selected:" + maxTSUnitId);

		if (currentUnit != "") {
			//getDroneLocation(initMap, currentUnit);
			getAllDrones(initMap);
			document.title = "Ground Station - tracking " + currentUnit;
		}
	});
}

function initMap(data) {
	var currentHeartBeat = {
		gpsLat : 0,
		gpsLon : 0,
		heading : 0,
		unidId : "none"
	};

	//if (!data || !data.data || !data.data.heartbeat) {
	if (!data || !data.data || !data.data.heartbeats) {
		data = {
			//heartbeat : currentHeartBeat
			heartbeats : [currentHeartBeat]
		};
	} else {
		data = data.data;
	}

	data.heartbeats.forEach(function(heartbeat) {
		//console.log(heartbeat);
		// if no gps lock
		//if (data.heartbeat.gpsLat == null)
			//data.heartbeat.gpsLat = 0;
		//if (data.heartbeat.gpsLon == null)
			//data.heartbeat.gpsLon = 0;
		if (heartbeat.heartbeat.gpsLat == null)
			heartbeat.heartbeat.gpsLat = 0;
		if (heartbeat.heartbeat.gpsLon == null)
			heartbeat.heartbeat.gpsLon = 0;

		if (heartbeat.heartbeat.unitId == currentUnit) {
			currentHeartBeat = heartbeat.heartbeat;
		}
	});

	console.log("center map around:");
	console.log(currentHeartBeat);

	mainMap = new GMaps({
		el : '#map',
		zoom : 20,
		lat : currentHeartBeat.gpsLat,
		lng : currentHeartBeat.gpsLon
	});

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

				addWP(e.latLng.lat(), e.latLng.lng());

			}
		}, {
			title : 'GO HERE',
			name : 'go_here',
			action : function(e) {

				if (dest) {
					dest.setPosition({
						lat : e.latLng.lat(),
                                                lng : e.latLng.lng()
					});
				} else {
					dest = this.addMarker({
						lat : e.latLng.lat(),
						lng : e.latLng.lng(),
						title : 'DEST',
						icon : {
							path : google.maps.SymbolPath.CIRCLE,
							scale : 10,
							strokeColor : "green"
						}
					});
				}

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

//MAIN LOOP
function updateMarkers() {

	//getDroneLocation(drawMarkers, currentUnit);
	getAllDrones(drawAllMarkers);

	getAllAdsbs(drawAllAdsbs);
}


function drawAllAdsbs(data) {

	
	//console.log("ADSB data: " + data.data.adbs.unitId);
	//console.log("ADSB data: " +  JSON.stringify(data.data.adsb.targets));
	//console.log("ADSB data: " +  JSON.stringify(data));

	if (data.data && data.data.adsb && data.data.adsb.targets && data.data.adsb.targets.ac) {
		//console.log(data.data.adsb.targets.ac[0].flight);

		var list = [];

		data.data.adsb.targets.ac.forEach(function(adsb) {
			drawAdsbs({
					unitId : data.data.adsb.unitId,
					adsb : adsb
			});
			list.push(adsb.hex);
		});

		console.log("Rendered ADSB targets: " + list.length);

		Object.keys(adsbMarkers).forEach(function(key) {

			if (!list.includes(key)) {
				mainMap.removeMarkers(adsbMarkers[key]);
				adsbMarkers[key].setMap(null);
				adsbMarkers[key] = null;
				delete adsbMarkers[key];

				console.log("Removed ADSB " + key);
			}
                });

	}

}

function drawAllMarkers(data) {

	currentServerData = data;

	data.data.heartbeats.forEach(function(pheartbeat) {
		drawMarkers({
			data : {
				heartbeat : pheartbeat.heartbeat
			}
		});
	});
}

function drawAdsbs(data) {


        var marker = adsbMarkers[data.adsb.hex];

	var heading = data.adsb.track ? data.adsb.track : data.adsb.true_heading;
	var flight = data.adsb.flight ? data.adsb.flight : "--";
	var alt = data.adsb.alt_geom ? Math.floor(data.adsb.alt_geom * 0.3048) : "--";
	var speed = data.adsb.gs ? data.adsb.gs : "--";

	//draw adsb
	if (marker == null) {

		marker = mainMap.addMarker({
                        lat : data.adsb.lat,
                        lng : data.adsb.lon,
                        title : flight + "\nALT: " + alt + "\nSPEED: " + speed,
                        label : flight + " / " + alt,
                        icon : {
                                path : heading ? google.maps.SymbolPath.FORWARD_CLOSED_ARROW : google.maps.SymbolPath.CIRCLE,
                                scale : 5,
                                strokeColor : alt > 200 ? "green" : "orange",
                                rotation : heading
                        },
                        click : function(e) {
                                alert('You clicked in this marker');
                        }
                });

                adsbMarkers[data.adsb.hex] = marker;

        } else {
                marker.setPosition({
                        lat : data.adsb.lat,
                        lng : data.adsb.lon
                });
		marker.setTitle(flight + "\nALT: " + alt + "\nSPEED: " + speed);
		marker.setLabel(flight + " / " + alt);
                marker.setIcon({
                        path : heading ? google.maps.SymbolPath.FORWARD_CLOSED_ARROW : google.maps.SymbolPath.CIRCLE,
                        scale : 5,
                        strokeColor : data.adsb.alt_geom > 600 ? "green" : "orange",
                        rotation : heading
                });
        }


}

function drawMarkers(data) {

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

	var marker = markers[data.heartbeat.unitId];

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

		markers[data.heartbeat.unitId] = marker;

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
	var homeMarker = homeMarkers[data.heartbeat.unitId];
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
			homeMarkers[data.heartbeat.unitId] = homeMarker;
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
	if (data.heartbeat.unitId == currentUnit) {
		updateInfo(data);
	}
}

function updateInfo(data) {

	if (currentUnit == data.heartbeat.unitId) {

		$("#unit").html(data.heartbeat.unitId);
		$("#uavMode").html(data.heartbeat.mode);
		$("#armed").html(data.heartbeat.armed ? "ARMED" : "DISARMED");
		$("#heading").html(data.heartbeat.heading ? data.heartbeat.heading.toFixed(0) : "--");
		$("#spinnerAlt").val(data.heartbeat.operatingAlt);
		$("#spinnerSpeed").val(data.heartbeat.operatingSpeed);
		$("#gps-speed").html((data.heartbeat.gpsSpeed ? data.heartbeat.gpsSpeed.toFixed(1) : "--") + " m/s");
		$("#alt-baro").html((data.heartbeat.baroAlt ? data.heartbeat.baroAlt.toFixed(1) : "--") + " m");
		$("#alt-lidar").html((data.heartbeat.lidarAlt ? data.heartbeat.lidarAlt.toFixed(1) : "--") + " m");
		//$("#alt-gps").html((data.heartbeat.gpsAlt ? data.heartbeat.gpsAlt.toFixed(1) : "--") + " m");
		$("#alt-gps").html((data.heartbeat.gpsAltRel ? data.heartbeat.gpsAltRel.toFixed(1) : "--") + " m");
		$("#gps-sats").html(data.heartbeat.gpsNumSats
				   + (data.heartbeat.gps2NumSats ? "/" + data.heartbeat.gps2NumSats : ""));
		$("#gps-lock").html(data.heartbeat.gpsLock
				   + (data.heartbeat.gps2Lock ? "/" + data.heartbeat.gps2Lock : ""));
		$("#bat").html((data.heartbeat.currVolts ? data.heartbeat.currVolts.toFixed(1) : "--") + " V "
				+ (data.heartbeat.currVoltsLevel ? ((data.heartbeat.currVoltsLevel > 1 ? 1 : 100) * data.heartbeat.currVoltsLevel).toFixed(0) : "--") + "%");
		$("#curr").html((data.heartbeat.currA ? data.heartbeat.currA.toFixed(2) : "--") + " A");
		$("#curr_tot").html((data.heartbeat.currTotmAh ? data.heartbeat.currTotmAh.toFixed(0) : "--") + " mAh");
		$("#videostat").html((data.heartbeat.videostat ? data.heartbeat.videostat : "--"));
		$("#modemstatus").html(data.heartbeat.modemstatus);
		$("#modemsignal").html(data.heartbeat.modemsignal);
		$("#message").html(data.heartbeat.message ? data.heartbeat.message + " / " + data.heartbeat.messageSev : "--");

		//toggle video
		if (current_videostat !== data.heartbeat.videostat) {
			current_videostat = data.heartbeat.videostat;
			if (current_videostat === "ON") {
				$("#vidtoggle").html("VIDEO OFF");
				startStream(data.heartbeat.videoChannel, data.heartbeat.unitId);
			} else {
				$("#vidtoggle").html("VIDEO ON");
				stopStream();
			}
		}

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

function getAdsbURL(unit) {
	return SERVER_URL + "/adsb/" + unit;
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

function getAllAdsbs(callback) {
	if (!currentUnit)
		return;
	$.get(getAdsbURL(currentUnit), {}, callback).fail(function() {
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
function autonomous() {
	sendAction(buildActionRequest(currentUnit, "AUTO"), function() {

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
function togglevid() {
	sendAction(buildActionRequest(currentUnit, "TOGGLEVID"), function() {

	});
}
function upWifi() {
	sendAction(buildActionRequest(currentUnit, "UPWIFI"), function() {

	});
}
function downWifi() {
	sendAction(buildActionRequest(currentUnit, "DOWNWIFI"), function() {

	});
}
function moveLeft() {
	sendAction(buildActionRequest(currentUnit, "MVLEFT"), function() {

	});
}
function moveRight() {
	sendAction(buildActionRequest(currentUnit, "MVRIGHT"), function() {

	});
}
function moveForward() {
	sendAction(buildActionRequest(currentUnit, "MVFWD"), function() {

	});
}
function moveBack() {
	sendAction(buildActionRequest(currentUnit, "MVBCK"), function() {

	});
}
function setToCurrAlt() {
	sendAction(buildActionRequest(currentUnit, "SETCURRALT"), function() {

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

	lastGotoLat = lat;
	lastGotoLon = lon;

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



