// graphics vars
var canvasContext;
var gradient;

// audio vars
var audioContext = new AudioContext();
var sourceNode, scriptNode, analyser;
var audioBuffer;
var isPlaying = false;

// dom vars
var playStopButton;

setup()

function setup() {
  var canvas = document.getElementById('canvas');
  if (canvas.getContext) {
    canvasContext = canvas.getContext('2d');
    initFillStyle()
  }
}

function initFillStyle() {
    gradient = canvasContext.createLinearGradient(0,0,0,200);
    gradient.addColorStop(1,'#000000');
    gradient.addColorStop(0.75,'#ff0000');
    gradient.addColorStop(0.25,'#ffff00');
    gradient.addColorStop(0,'#ffffff');
    canvasContext.fillStyle = gradient;
}

window.onLoad = function() {
    draw();
    console.log('loaded');
};

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

// path: sourceNode -> analyser -> scriptNode -> context.destination
function setupAudioNodes() {
    // scriptNode -> context.destination
    scriptNode = audioContext.createScriptProcessor(2048, 1, 1);
    scriptNode.onaudioprocess = processAudio
    scriptNode.connect(audioContext.destination);

    // analyser -> scriptNode
    analyser = audioContext.createAnalyser();
    analyser.smoothingTimeConstant = 0.3;
    analyser.fftSize = 1024;
    analyser.connect(scriptNode)

    // sourceNode -> analyser
    sourceNode = audioContext.createBufferSource();
    sourceNode.connect(analyser)
}

function processAudio(audioProcessingEvent) {
    // get the average amplitude across bins, bincount is fftsize / 2
    var array =  new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(array);
    var average = getAverageAmplitude(array);

    // clear old meter, draw new one
    canvasContext.clearRect(0, 0, 60, 130);
    canvasContext.fillStyle = gradient;
    canvasContext.fillRect(0, 130 - average, 25, 130);

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
        audioContext.decodeAudioData(reader.result, function(buffer) {
            // once the audio is decoded, play the sound
            playSound(buffer);
        }, onError);
    };
    reader.readAsArrayBuffer(file);
}

function playSound(buffer) {
    audioBuffer = buffer;
    sourceNode.buffer = buffer;
    sourceNode.start(0);
    isPlaying = true;
}

// log if an error occurs
function onError(e) {
    console.log(e);
}

function playOrStopAudio() {
    if(!playStopButton) {
        playStopButton = document.getElementById('play-stop-button')
    }

    if(isPlaying) {
        sourceNode.stop(0);
        isPlaying = false;
        playStopButton.textContent = 'Play'
    }
    else {
        sourceNode = audioContext.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(analyser)
        sourceNode.start(0);
        isPlaying = true;
        playStopButton.textContent = 'Stop'
    }
}