window.onLoad = function() {
	draw();
	console.log('loaded');
};

var ctx;
setup()

function setup() {
  var canvas = document.getElementById('canvas');
  if (canvas.getContext) {
    ctx = canvas.getContext('2d');

    ctx.fillRect(25,25,100,100);
    ctx.clearRect(45,45,60,60);
    ctx.strokeRect(50,50,50,50);
  }
  console.log('setup')
}

audio_file.onchange = function(){
    var file = this.files[0];
    if(file) {
	    audio_player.src = URL.createObjectURL(file);

	    // load the sound
		setupAudioNodes();
		loadSound(file)
	}
};

// check naming
if (! window.AudioContext) {
    if (! window.webkitAudioContext) {
        alert('no audiocontext found');
    }
    window.AudioContext = window.webkitAudioContext;
}
var context = new AudioContext();
var sourceNode, scriptNode, analyser;

// path: sourceNode -> analyser -> scriptNode -> context.destination
function setupAudioNodes() {
	// scriptNode -> context.destination
	scriptNode = context.createScriptProcessor(2048, 1, 1);
	scriptNode.onaudioprocess = processAudio
	scriptNode.connect(context.destination);

	// analyser -> scriptNode
	analyser = context.createAnalyser();
    analyser.smoothingTimeConstant = 0.3;
    analyser.fftSize = 1024;
    analyser.connect(scriptNode)

    // sourceNode -> analyser
    sourceNode = context.createBufferSource();
    sourceNode.connect(analyser)
}

function processAudio(audioProcessingEvent) {
	// get the average amplitude across bins, bincount is fftsize / 2
    var array =  new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(array);
    var average = getAverageAmplitude(array);

    // clear old meter, draw new one
    ctx.clearRect(0, 0, 60, 130);
    // ctx.fillStyle = gradient;
    ctx.fillRect(0, 130 - average, 25, 130);

	var inputBuffer = audioProcessingEvent.inputBuffer;
    var outputBuffer = audioProcessingEvent.outputBuffer;
    for(var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
    	var inputData = inputBuffer.getChannelData(channel);
    	var outputData = outputBuffer.getChannelData(channel);
    	for(var sample = 0; sample < inputBuffer.length; sample++) {
	    	outputData[sample] = inputData[sample];
	    }
    }
};

function getAverageAmplitude(array) {
    var sum = 0;
    var length = array.length;

    // accumulate all the frequency amplitudes
    for (var i = 0; i < length; i++) {
        sum += array[i];
    }

    return sum / length;
}

function loadSound(file) {
	var reader = new FileReader();
	// set file read callback
	reader.onload = function(progressEvent) {
		// decode audio on load
        context.decodeAudioData(reader.result, function(buffer) {
            // once the audio is decoded, play the sound
            playSound(buffer);
        }, onError);
    };
	reader.readAsArrayBuffer(file);
}

function playSound(buffer) {
    sourceNode.buffer = buffer;
    sourceNode.start(0);
}

// log if an error occurs
function onError(e) {
    console.log(e);
}