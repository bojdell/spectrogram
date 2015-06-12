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
    gradient = canvasContext.createLinearGradient(0,0,0,300);
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
    analyser.fftSize = 512;
    analyser.connect(scriptNode)

    // sourceNode -> analyser
    sourceNode = audioContext.createBufferSource();
    sourceNode.connect(analyser)
}

// updates frequency data and graphics
function processAudio(audioProcessingEvent) {
    // get data
    var array = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(array);

    // clear old spectrum, draw new one
    canvasContext.clearRect(0, 0, 1000, 325);
    canvasContext.fillStyle = gradient;
    drawSpectrum(array)

    // output the audio
    outputAudio(audioProcessingEvent);
};

// routes input buffer of analyser node to output
function outputAudio(audioProcessingEvent) {
    var inputBuffer = audioProcessingEvent.inputBuffer;
    var outputBuffer = audioProcessingEvent.outputBuffer;
    for(var channel = 0; channel < outputBuffer.numberOfChannels; channel++) {
        var inputData = inputBuffer.getChannelData(channel);
        var outputData = outputBuffer.getChannelData(channel);
        for(var sample = 0; sample < inputBuffer.length; sample++) {
            outputData[sample] = inputData[sample];
        }
    }
}

function drawSpectrum(array) {
    for ( var i = 0; i < (array.length); i++ ){
        canvasContext.fillRect(i * 5, 325 - array[i], 3, 325);
    }
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