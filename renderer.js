// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

// const ffmpeg = require('@ffmpeg-installer/ffmpeg');
// console.log(ffmpeg.path, ffmpeg.version);

// const ffmpegPath = require("@ffmpeg-installer/ffmpeg").path;
const ffmpegPath = require('ffmpeg-static');
const spawn = require("child_process").spawn;

let proc_list = []

function runCommand(cmd, args, onData, onInfo, onFinish) {
  const proc = spawn(cmd, args, { shell: true });
  proc.stdout.on("data", onData);
  proc.stderr.setEncoding("utf8");
  proc.stderr.on("data", onInfo);
  proc.on("close", onFinish);
  proc_list.push(proc)
}

async function removeSilence(inputPath, outputPath, duration, volume, dur, pdur) {
  const args = ['-i', inputPath, '-af', 'silencedetect=n='+volume+'dB:d='+dur/1000, '-f', 'null', '-']
  console.log(args)
  let last_start
  const silence_list = []
  await new Promise((r) =>
    runCommand(
      ffmpegPath,
      args,
      (data) => console.log(data),
      (info) => {
        console.log(info)
        const uinfo = info.split(' ')
        if (uinfo.includes('silence_start:')) {
          const start = parseFloat(uinfo[uinfo.indexOf('silence_start:')+1])
          last_start = start
        } else if (uinfo.includes('silence_end:')) {
          // console.log(uinfo[uinfo.indexOf('silence_end:')+1])
          const end = parseFloat(uinfo[uinfo.indexOf('silence_end:')+1])
          silence_list.push({ start: last_start, end })
        }
      },
      () => r()
    )
  );
  console.log(silence_list)
  const trim_list = []
  let audio_duration = 0
  if (silence_list.length) {
    if (silence_list[0].start > 0) {
      trim_list.push({ start: 0, end: silence_list[0].start, offset: 0 })
      audio_duration += silence_list[0].start
    }
    for (let i = 1; i < silence_list.length; i++) {
      const new_trim = { start: silence_list[i-1].end, end: silence_list[i].start, offset: audio_duration + pdur/1000 }
      trim_list.push(new_trim)
      audio_duration += (pdur/1000 + new_trim.end - new_trim.start)
    }
    if (duration - trim_list[trim_list.length-1].end > pdur) {
      audio_duration += pdur
    } else {
      audio_duration += (duration - trim_list[trim_list.length-1].end)
    }
  }
  console.log(trim_list)
  let trim_script = '"'
  let i = 0
  const chunk_list = []
  for (const t of trim_list) {
    trim_script += ('[0]atrim='+t.start.toFixed(3)+':'+t.end.toFixed(3)+',adelay='+(t.offset*1000).toFixed(3)+'|'+(t.offset*1000).toFixed(3)+'[t'+i+'];')
    chunk_list.push('[t'+i+']')
    i++
  }
  chunk_list.push('[1]')
  trim_script += chunk_list.join('')
  trim_script += ('amix=inputs='+chunk_list.length+':normalize=0"' )
  const mix_script = ['-i', inputPath, '-f', 'lavfi', '-t', audio_duration.toFixed(3), '-i', 'anullsrc', '-filter_complex', trim_script, '-map_metadata', '-1', outputPath]
  console.log(mix_script)
  await new Promise((r) => 
    runCommand(
      ffmpegPath,
      mix_script,
      (data) => console.log(data),
      (info) => console.log(info),
      () => r()
    )
  )
  proc_list.length = 0
  proc_list = []
}

function killAllProcesses() {
  for (const p of proc_list) {
    p.kill('SIGKILL')
  }
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