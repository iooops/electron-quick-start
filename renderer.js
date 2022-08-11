// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

// const ffmpeg = require('@ffmpeg-installer/ffmpeg');
// console.log(ffmpeg.path, ffmpeg.version);

function runCommand(cmd, args, onData, onFinish) {
    var proc = spawn(cmd, args.split(' '), { shell: true });
    proc.stdout.on('data', onData);
    proc.stderr.setEncoding("utf8")
    proc.stderr.on('data', err => console.log(err) );
    proc.on('close', onFinish);
}

module.exports = { runCommand }

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const spawn = require('child_process').spawn;

async function helloworld() {
    await new Promise(r => runCommand(ffmpegPath, '-i /Users/miooo/Downloads/nongjia279mp3_1659620142298.mp3', data => console.log(data), () => r()))
}
helloworld()