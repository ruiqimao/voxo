var number = "";
var seconds = 0;
var hangupTimer = 20;
var connected = false;
var hungUp = false;

var socket = io('http://www.voxo.io/');

socket.on('connect', function() {
	socket.on('initStatus', function(data) {
		var clients = data['clients'];
		if(clients == 0) {
			$(".init-call").delay(200).slideDown();
			setTimeout(function() { $(".init-number").focus(); }, 600);
		}else
		{
			$(".init-retry").delay(200).slideDown();
		}
	});

	socket.on('callConnected', function() {
		hangupTimer = 20;
		if(!connected && !hungUp) {
			connected = true;
			openCall();
		}
	});

	socket.on('message', function(data) {
		var message = data['message'];
		$(".call-chatlogs").append('<div class="call-chatlog other">'+message+'</div>');
		$(".call-chatlogs").animate({ scrollTop: $('.call-chatlogs')[0].scrollHeight}, 200);
	});

	socket.on('disconnectCall', function(data) {
		$(".call-endbutton").click();
	});
});

$(".init-number").keyup(function(event) {
	if(event.keyCode == 13) {
		$(".init-button").click();
	}
});

$(".call-chatinput").keyup(function(event) {
	if(event.keyCode == 13) {
		$(".call-chatbutton").click();
	}
});

$(".init-button").click(function() {
	$(".init-button").attr("disabled",true);
	number = $(".init-number").val();
	if(number.length != 10 || isNaN(number)) {
		$(".init-button").removeAttr("disabled");
		return;
	}
	$(".init-button").text("CALLING...");
	hungUp = false;	
	socket.emit('call',{'number':number});
	setTimeout(function() {
		if(!connected && !hungUp) {
			$(".init-button").removeAttr("disabled");
			$(".init-button").text("TRY AGAIN");
		}
	},30000);
});

function openCall() {	
	seconds = 0;
	$(".init-screen, .about-text").fadeOut({duration:1200,queue:false});
	$(".init-screen").delay(300).animate({'top':'60%'},300).animate({'top':'-100%'},400);
	setTimeout(function() { showCallScreen(); },600);
}

function showCallScreen() {
	var digits = number.split("");
	$(".call-number").text("+1 ("+digits[0]+digits[1]+digits[2]+") "+digits[3]+digits[4]+digits[5]+"-"+digits[6]+digits[7]+digits[8]+digits[9]);
	$(".call-screen").fadeIn(200);
	$(".call-chatinput").focus();
}

$(".call-endbutton").click(function() {
	hungUp = true;
	connected = false;
	socket.emit('endCall');
	$(".init-button").removeAttr("disabled");
	$(".init-button").text("CALL");
	$(".init-number").val("");
	$(".call-chatlogs").empty();
	$(".call-screen").fadeOut(200);
	$(".init-screen, .about-text").fadeIn({duration:400,queue:false});
	$(".init-screen").animate({'top':'60%'},600).animate({'top':'50%'},300);
	setTimeout(function() { $(".init-number").focus(); }, 400);
});

$(".call-chatbutton").click(function() {
	var message = $(".call-chatinput").val().trim();
	if(message.length > 0) {
		$(".call-chatinput").val("");
		$(".call-chatlogs").append('<div class="call-chatlog self">'+message+'</div>');
		$(".call-chatlogs").animate({ scrollTop: $('.call-chatlogs')[0].scrollHeight}, 200);
		socket.emit('message',{'message':message});
	}
});

$(".call-button").click(function() {
	socket.emit('dial',{'key':$(this).attr("id")});
});

setInterval(function() {
	var digits = number.split("");
	var displayMinutes = Math.floor(seconds/60);
	var displaySeconds = seconds-displayMinutes*60;
	var displayHours = Math.floor(displayMinutes/60);
	displayMinutes -= displayHours*60;
	if(displaySeconds < 10) displaySeconds = "0"+displaySeconds;
	if(displayMinutes < 10) displayMinutes = "0"+displayMinutes;
	if(displayHours < 10) displayHours = "0"+displayHours;
	$(".call-number").text(displayHours+":"+displayMinutes+":"+displaySeconds+" | +1 ("+digits[0]+digits[1]+digits[2]+") "+digits[3]+digits[4]+digits[5]+"-"+digits[6]+digits[7]+digits[8]+digits[9]);
	seconds ++;
	hangupTimer --;
	if(hangupTimer <= 0 && connected) {
		$(".call-endbutton").click();
	}
}, 1000);
