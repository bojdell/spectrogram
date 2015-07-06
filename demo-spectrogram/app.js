// graphics vars
var canvasContext;
var tempCanvasContext;
var gradient;
var mustang = {
    // colors: ['#000000', '#263248', '#7E8AA2', '#FFFFFF', '#FF9800']
    colors: ['#7E8AA2', '#263248', '#FF9800', '#FFFFFF']
}
var colorScheme = mustang;

// audio vars
var audioContext = new AudioContext();
var sourceNode, scriptNode, analyser;
var audioBuffer;
var isPlaying = false;

// dom vars
var canvas;
var tempCanvas;
var playStopButton;

// SoundCloud client ID
var CLIENT_ID = '7880c1eea074da712200d5c6267f3d06'
/* TODO:
    - add Angular
    - fix window resizing
    - add CSS
    - add datGui?
    - favicon?
*/

$('.spinner').one('transitionend webkitTransitionEnd oTransitionEnd otransitionend MSTransitionEnd', 
function() {
    var spinner = $('.spinner');
    if(spinner.css('opacity') == 0) {
        spinner.css('display', 'none');
    }
});

function setup() {
    canvas = document.getElementById('canvas');
    // canvas.width = window.innerWidth;
    // canvas.height = window.innerHeight;
    if (canvas.getContext) {
        canvasContext = canvas.getContext('2d');
        initFillStyle()
    }
    tempCanvas = document.createElement('canvas');
    tempCanvas.id = 'temp-canvas';
    // canvas.width = canvas.scrollWidth;
    // canvas.height = canvas.scrollHeight;
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;

    tempCanvasContext = tempCanvas.getContext('2d');
}

setup()

function processURL() {
    var url = 'https://api.soundcloud.com/resolve.json'
    url += '?url=' + document.getElementById('url').value
    url += '&client_id=' + CLIENT_ID
    var request = new XMLHttpRequest();
    request.onreadystatechange = function() {
        if(request.readyState == 4 && request.status == 200) {
            var track = JSON.parse(request.responseText);
            var streamUrl = track['stream_url'] + '?client_id=' + CLIENT_ID
            audio_player.crossOrigin = 'anonymous';
            audio_player.src = streamUrl;

            setupAudioNodes();
            loadSoundFromURL(streamUrl);
            loadUI(track);
        }
    }
    request.open("get", url, true);
    request.send();
}

function loadUI(track) {
    $('#track-thumbnail').attr('src', toHttps(track.artwork_url));
    $('#track-title').text(track.title);
    $('#track-artist').text(track.user.username);
    $('.track-link').attr('href', toHttps(track.permalink_url));
    $('#artist-link').attr('href', toHttps(track.user.permalink_url));
    $('#track-info').show();
    setLoading(true);
}

function toHttps(url) {
    return url? url.replace(/^http:\/\//i, 'https://') : '';
}

function setLoading(isLoading) {
    $('.spinner').css('opacity', isLoading ? 1.0 : 0.0);
}

function loadSoundFromURL(url) {
    var request = new XMLHttpRequest();
    request.open('GET', url, true);
    request.responseType = 'arraybuffer';

    request.onreadystatechange = function() {
        if(request.readyState == 4 && request.status == 200) {
            audioContext.decodeAudioData(request.response, function(buffer) {
                // when the audio is decoded play the sound
                playSound(buffer);
            }, onError);
        }
    }
    request.send();
}

// window.addEventListener('resize', resizeCanvas, false);

// function resizeCanvas() {
//     canvas.width = window.innerWidth;
//     canvas.height = window.innerHeight;
//     tempCanvas.width = canvas.width;
//     tempCanvas.height = canvas.height;
//     canvasContext.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
// }

function initFillStyle() {
    gradient = new chroma.scale(colorScheme.colors);
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
    analyser.smoothingTimeConstant = 0;
    analyser.fftSize = 1024;
    analyser.connect(scriptNode)

    // sourceNode -> analyser
    sourceNode = audioContext.createBufferSource();
    sourceNode.connect(analyser)
}

// updates frequency data and graphics
function processAudio(audioProcessingEvent) {
    // get freq data
    var array =  new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(array);

    // draw the spectrogram
    if (sourceNode.playbackState == sourceNode.PLAYING_STATE) {
        drawSpectrogram(array);
    }

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

// draws a spectrogram based on the array data
function drawSpectrogram(array) {
    if(isPlaying) {
        if(canvas.scrollWidth != canvas.width || canvas.scrollHeight != canvas.height) {
            canvas.width = canvas.scrollWidth;
            canvas.height = canvas.scrollHeight;
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
        }
        canvas = document.getElementById('canvas');
        tempCanvasContext.drawImage(canvas, 0, 0, canvas.width, canvas.height);

        // iterate over the array data
        for (var i = 0; i < array.length; i++) {
            // vary color based on the data value
            var val = array[i]/(canvas.height + 100);
            canvasContext.fillStyle = gradient(val).hex();
            // draw new data at the right side of the canvas
            canvasContext.fillRect(canvas.width - 1, canvas.height - i, 1, 1);
        }
        // translate the canvas data
        canvasContext.translate(-1, 0);
        // draw the copied image
        canvasContext.drawImage(tempCanvas, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height);
        // reset the transformation matrix
        canvasContext.setTransform(1, 0, 0, 1, 0, 0);
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
    // console.log(sourceNode)
    isPlaying = true;
    setLoading(false);
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