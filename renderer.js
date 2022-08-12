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

async function removeSilence(inputPath, outputPath) {
  await new Promise((r) =>
    runCommand(
      ffmpegPath,
      '-i ' + inputPath + ' -af "silenceremove=start_periods=1:stop_periods=-1:start_threshold=-30dB:stop_threshold=-30dB:start_silence=2:stop_silence=2" ' + outputPath,
      (data) => console.log(data),
      () => r()
    )
  );
}
