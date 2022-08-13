// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

// const ffmpeg = require('@ffmpeg-installer/ffmpeg');
// console.log(ffmpeg.path, ffmpeg.version);

function runCommand(cmd, args, onData, onFinish) {
  var proc = spawn(cmd, args.split(" "), { shell: true });
  proc.stdout.on("data", onData);
  proc.stderr.setEncoding("utf8");
  proc.stderr.on("data", (err) => console.log(err));
  proc.on("close", onFinish);
}

const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const spawn = require("child_process").spawn;

async function removeSilence(inputPath, outputPath, volume, dur, pdur) {
  await new Promise((r) =>
    runCommand(
      ffmpegPath,
      '-i ' + inputPath + ' -af "silenceremove=start_periods=1:stop_periods=-1:stop_duration=' + dur + ':start_threshold=' + volume + 'dB:stop_threshold=' + volume + 'dB:start_silence=' + (pdur/1000) + ':stop_silence=' + (pdur/1000) + '" ' + outputPath,
      (data) => console.log(data),
      () => r()
    )
  );
}

async function getAudioDuration(file, isUrl = false) {
  const dur = await new Promise((resolve, reject) => {
    let url
    if (!isUrl) {
      url = URL.createObjectURL(file)
    } else {
      url = file
    }
		const mySound = new Audio(url)
		let done = false
		mySound.addEventListener('loadedmetadata', () => {
			URL.revokeObjectURL(url)
			done = true
			resolve(mySound.duration)
		}, false)
		setTimeout(() => {
			if (!done)	reject()
		}, 2000)
	})
  return dur
}