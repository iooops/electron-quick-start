
// const { createApp } = Vue;
const fs = require('fs')

const app = new Vue({
  el: '#app',
  data: {
    tempPath: null,
    audioFileList: [],
    processing: false,
    processDone: false,
    volume: -30,
    dur: 5000,
    pdur: 2000,
    old_volume: -30,
    old_dur: 5000,
    old_pdur: 2000,
    showParamsBox: false
  },
  computed: {
    totalDur() {
      return this.audioFileList.map(af => af.duration).reduce((a, b) => a + b, 0)
    }
  },
  async mounted() {
    const tempPath = await window.electronAPI.getTempPath()
    console.log(tempPath)
    this.tempPath = tempPath
    const dir = this.tempPath + 'sil_r/'
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    document.addEventListener('drop', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      for (let i = 0; i < event.dataTransfer.files.length; i++) {
        const f = event.dataTransfer.files[i]
        // console.log(f)
        console.log('File Path of dragged files: ', f.path)
        const containerId = 'f' + Date.now() + '_' + i
        const duration = await getAudioDuration(f)
        console.log(duration)
        this.audioFileList.push({
          containerId, filePath: f.path, fileName: f.name, outputPath: this.tempPath + 'sil_r/' + containerId + '_' + f.name, duration
        })
      }
      setTimeout(() => {
        for (const f of this.audioFileList) {
          this.drawBuffer(f.containerId, f.filePath)
        }
      }, 100)
    });
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  },
	methods: {
    removeAudio(f) {
      this.audioFileList = this.audioFileList.filter(af => af.containerId !== f.containerId)
    },
    openParamsBox() {
      this.showParamsBox = true
      this.old_volume = this.volume
      this.old_dur = this.dur
      this.old_pdur = this.pdur
    },
    hideParamsBox() {
      this.showParamsBox = false
      this.volume = this.old_volume
      this.dur = this.old_dur
      this.pdur = this.old_pdur
    },
    confirmParams() {
      this.showParamsBox = false
    },
    drawBuffer(containerId, filePath) {
      const wavesurfer = WaveSurfer.create({
        container: '#'+containerId,
        waveColor: 'rgb(255, 68, 0)',
        cursorWidth: 0,
        interact: false
      });
      wavesurfer.load(filePath);
      this.audioFileList = this.audioFileList.map(f => f.containerId === containerId? ({ ...f, wavesurfer }): f)
    },
    clearAll() {
      if (this.processing)  return
      this.audioFileList = []
      this.processDone = false
    },
    save() {
      if (!this.processDone)  return
      for (const f of this.audioFileList) {
        fs.renameSync(f.outputPath, f.filePath)
      }
    },
    async saveAs() {
      if (!this.processDone)  return
      const filePath = await window.electronAPI.openFolder()
      console.log(filePath)
      for (const f of this.audioFileList) {
        fs.rename(f.outputPath, filePath + '/【已脱水】' + f.fileName)
      }
    },
    async processNow() {
      if (this.showParamsBox) this.hideParamsBox()
      this.processing = true
      try {
        await Promise.all(this.audioFileList.map(async f => {
          await removeSilence(f.filePath, f.outputPath, this.volume, this.dur, this.pdur)
          f.wavesurfer.load(f.outputPath)
          const dur = await getAudioDuration('file:///' + f.outputPath, true)
          this.audioFileList = this.audioFileList.map(af => af.containerId === f.containerId? ({ ...af, pDuration: dur }): af)
          console.log(dur)
        }))
      } catch(err) {
        console.err(err)
      }
      this.processing = false
      this.processDone = true
    },
		async loadFolder() {
			console.log('!!!')
      const filePath = await window.electronAPI.openFolder();
      console.log(filePath)
		}
	}
})
