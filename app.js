
// const { createApp } = Vue;
const fs = require('fs')
const shell = require('electron').shell

const app = new Vue({
  el: '#app',
  data: {
    tempPath: null,
    audioFileList: [],
    processing: false,
    volume: -50,
    dur: 2000,
    pdur: 2000,
    old_volume: -50,
    old_dur: 2000,
    old_pdur: 2000,
    showParamsBox: false,
    showCancelBtn: false
  },
  computed: {
    totalDur() {
      return this.audioFileList.map(af => af.duration).reduce((a, b) => a + b, 0)
    },
    totalPDur() {
      return this.audioFileList.map(af => af.pDuration).reduce((a, b) => a + b, 0)
    },
    progressHint() {
      const processed = this.audioFileList.filter(af => af.done)
      return processed.length + '/' + this.audioFileList.length
    },
    processDone() {
      return this.audioFileList.length && this.audioFileList.length === this.audioFileList.filter(af => af.done).length
    }
  },
  async mounted() {
    await this.initTempDir()
    this.initParams()
    document.addEventListener('drop', async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const newList = []
      let i = 0
      for (const f of event.dataTransfer.files) {
        console.log(f)
        console.log('File Path of dragged files: ', f.path)
        if (f.type.startsWith('audio/')) {
          const containerId = 'f' + Date.now() + '_' + (i++)
          const duration = await getAudioDuration(f)
          console.log(duration)
          newList.push({
            containerId, filePath: f.path, fileName: f.name, outputPath: this.tempPath + containerId + '_' + f.name, duration
          })
        }
      }
      this.audioFileList = [...this.audioFileList, ...newList]
      console.log(this.audioFileList)
      setTimeout(() => {
        for (const f of newList) {
          this.drawBuffer(f.containerId, f.filePath)
        }
      }, 100)
    });
    document.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
    window.addEventListener('resize', this.autoRedraw)
  },
	methods: {
    autoRedraw() {
      for (const af of this.audioFileList) {
        console.log(af)
        if (fs.existsSync(af.outputPath)) {
          af.wavesurfer.load(af.outputPath)
        } else if (af.filePath) {
          af.wavesurfer.load(af.filePath)
        }
      }
    },
    handleDurChange(cdur) {
      if (cdur < this.pdur) {
        this.pdur = cdur
      }
    },
    openLink(link) {
      shell.openExternal(link)
    },
    showCancel() {
      this.showCancelBtn = true
    },
    hideCancel() {
      this.showCancelBtn = false
    },
    async initTempDir() {
      const tempPath = await window.electronAPI.getTempPath()
      this.tempPath = tempPath + 'sil_r/'
      if (!fs.existsSync(this.tempPath)) {
        fs.mkdirSync(this.tempPath, { recursive: true });
      }
    },
    removeAudio(f) {
      if (this.processing)  return
      this.audioFileList = this.audioFileList.filter(af => af.containerId !== f.containerId)
    },
    openParamsBox() {
      if (this.processing)  return
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
      if (this.processing)  return
      localStorage.setItem('params', JSON.stringify({
        volume: this.volume,
        dur: this.dur,
        pdur: this.pdur
      }))
      this.showParamsBox = false
    },
    initParams() {
      const p = localStorage.getItem('params')
      if (p) {
        const params = JSON.parse(p)
        this.volume = params.volume
        this.dur = params.dur
        this.pdur = params.pdur
      }
    },
    drawBuffer(containerId, filePath) {
      const wavesurfer = WaveSurfer.create({
        container: '#'+containerId,
        waveColor: 'rgb(255, 68, 0)',
        progressColor: 'rgb(250, 149, 112)',
        cursorColor: 'rgb(255, 68, 0)'
        // cursorWidth: 0,
        // interact: false
      });
      wavesurfer.load(filePath);
      this.audioFileList = this.audioFileList.map(f => f.containerId === containerId? ({ ...f, wavesurfer }): f)
      wavesurfer.on('ready', () => {
        this.audioFileList = this.audioFileList.map(f => f.containerId === containerId? ({ ...f, wavesurfer, readyPlay: true, playing: false }): f)
      })
    },
    playAudio(f) {
      for (const afl of this.audioFileList) {
        this.pauseAudio(afl)
      }
      f.wavesurfer.play()
      this.audioFileList = this.audioFileList.map(af => af.containerId === f.containerId? ({ ...af, playing: true }): af)
    },
    pauseAudio(f) {
      f.wavesurfer.pause()
      this.audioFileList = this.audioFileList.map(af => af.containerId === f.containerId? ({ ...af, playing: false }): af)
    },
    clearAll() {
      if (this.processing || !this.audioFileList.length)  return this.$message.warning('请先加载音频文件')
      for (const af of this.audioFileList) {
        if (af.wavesurfer.isPlaying()) {
          af.wavesurfer.stop()
        }
      }
      this.audioFileList = []
      fs.rmdirSync(this.tempPath, { recursive: true })
      this.initTempDir()
      this.$message.success('已清空')
    },
    save() {
      if (!this.processDone) return this.$message.warning('请先加载音频后处理')
      this.$confirm('此操作将永久覆盖原有文件, 是否继续?', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        for (const f of this.audioFileList) {
          fs.copyFileSync(f.outputPath, f.filePath)
        }
        this.$message.success('操作成功')
      }).catch(() => {
        //
      });
    },
    async saveAs() {
      if (!this.processDone)  return this.$message.warning('请先处理音频后操作')
      const filePath = await window.electronAPI.openFolder()
      console.log(filePath)
      for (const f of this.audioFileList) {
        fs.copyFileSync(f.outputPath, filePath + '/【已脱水】' + f.fileName)
      }
      this.$message.success('操作成功')
    },
    async processNow() {
      if (this.processing)  return
      if (!this.audioFileList.length) {
        return this.$message.warning('请先加载音频文件后操作')
      }
      if (this.showParamsBox) this.hideParamsBox()
      this.processing = true
      try {
        await Promise.all(this.audioFileList.map(async f => {
          await removeSilence(f.filePath, f.outputPath, f.duration, this.volume, this.dur, this.pdur)
          if (this.processing) {
            console.log('!!reload waveform')
            f.wavesurfer.load(f.outputPath)
            console.log('!!get dur')
            const dur = await getAudioDuration('file:///' + f.outputPath, true)
            this.audioFileList = this.audioFileList.map(af => af.containerId === f.containerId? ({ ...af, pDuration: dur, done: true }): af)
            console.log(dur)  
          }
        }))
      } catch(err) {
        this.$message.error('报错了！')
        console.error(err)
      }
      this.processing = false
    },
    cancelProcessing() {
      killAllProcesses()
      this.processing = false
    },
    isAudioType(s) { 
      return /\.(mp3|wav|m4a|ogg|flac|aiff|aif|aac|ema)$/i.test(s);
    },
		async loadFolder() {
      if (this.processing)  return
      const folderPath = await window.electronAPI.openFolder();
      const files = fs.readdirSync(folderPath)
      const newList = []
      for (let i = 0; i < files.length; i++) {
        const fileName = files[i]
        if (this.isAudioType(fileName)) {
          const filePath = folderPath + '/' + fileName
          const containerId = 'f' + Date.now() + '_' + i
          const duration = await getAudioDuration(filePath, true)
          newList.push({
            containerId, filePath, fileName, outputPath: this.tempPath + containerId + '_' + fileName, duration
          })
        }
      }
      this.audioFileList = [...this.audioFileList, ...newList]
      setTimeout(() => {
        for (const f of newList) {
          this.drawBuffer(f.containerId, f.filePath)
        }
      }, 100)
		}
	}
})
