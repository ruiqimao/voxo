var serverRoot = "SERVER_ROOT";
var accountSid = "ACCOUNT_SID";
var authToken = "AUTH_TOKEN";
var callNumber = "+15555555555";

var client = require('twilio')(accountSid, authToken);

var express = require('express');
var bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended:false }));
var port = 80;

var querystring = require('querystring');
var fs = require('fs');
var http = require('http');
var https = require('https');
var request = require('request');
var python = require('python-shell');

app.use(express.static(__dirname + '/static'));

app.get('/', function(req, res) {
    res.sendFile(__dirname + '/static/index.html');
});

var io = require('socket.io').listen(app.listen(port));

var clients = 0;
var sid = "";
var app_socket;
var keys = "";
var keysTimer = 2000;

app.post('/record', function(req, res) {
	app_socket.emit('callConnected');
	console.log("Recording received");
	var url = req.body.RecordingUrl;	
	var transcription = new python('transcribe2.py', {args: [url]});
	transcription.on('message', function(message) {
		if(message.trim() != '') {
			console.log('    '+message);
			app_socket.emit('message',{'message':message});
		}else
		{
			console.log('    <inaudible>');
		}
	});
	transcription.end(function(err) {});
	if(clients > 0) res.sendFile(__dirname + '/static/xml/call.xml');
	else res.sendFile(__dirname + '/static/xml/hangup.xml');
});

app.post('/callback', function(req, res) {
	var status = req.body.CallStatus;
	console.log("Call status: "+status);
});

app.post('*.xml', function(req, res) {
	res.sendFile(__dirname + '/static' + req.url);
});

io.sockets.on('connection',function(socket) {
	if(clients == 0) app_socket = socket;
	socket.emit('initStatus',{'clients':clients});
	clients ++;
	
	socket.on('disconnect', function() {
		if(socket == app_socket) socket.emit('disconnectCall');
		clients --;
	});

	socket.on('call', function(data) {
		var number = data['number'];
		console.log('Calling '+number+'...');
		client.calls.create({
    		url:serverRoot+'/xml/init.xml',
    		to:number,
    		from: callNumber,
			timeout: '30'
		}, function(err, call) {
    		if(!err) {
        		sid = call.sid;	
    		}
		});
	});

	socket.on('message', function(data) {
		var message = data['message'];
		var content = ''+
			'<?xml version="1.0" encoding="UTF-8" ?>'+
			'<Response>'+
			'	<Say>'+message+'</Say>'+
			'	<Redirect method="POST">'+serverRoot+'/xml/call.xml</Redirect>'+
			'</Response>';
		fs.writeFile('static/xml/'+sid+'.xml',content,function(err) {
			if(err) throw err;
			client.calls(sid).update({
				url: serverRoot+'/xml/'+sid+'.xml',
				method: 'POST'
			});
		});
	});

	socket.on('dial', function(data) {
		var key = data['key'];
		if(key == "star") key = "*";
		if(key == "#") key = "#";
		keys += key;
		keysTimer = 2000;
	});

	socket.on('endCall', function() {
		client.calls(sid).update({
			url: serverRoot+'/xml/hangup.xml',
			method: 'POST'
		},
		function(err, call) {
			if(!err) {
				console.log('Call ended.');
			}
		});
	});
});

setInterval(function() {
	keysTimer -= 100;
	if(keysTimer <= 0) {
		if(keys != "") {
			var content = ''+
				'<?xml version="1.0" encoding="UTF-8" ?>'+
				'<Response>'+
				'	<Play digits="'+keys+'"></Play>'+
				'	<Redirect method="POST">'+serverRoot+'/xml/call.xml</Redirect>'+
				'</Response>';
			fs.writeFile('static/xml/'+sid+'.xml',content,function(err) {
				if(err) throw err;
				client.calls(sid).update({
					url: serverRoot+'/xml/'+sid+'.xml',
					method: 'POST'
				});
			});
			keys = "";
		}
		keysTimer = 2000;
	}
}, 100);

console.log('Listening on port '+port+'...');
