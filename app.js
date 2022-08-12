
// const { createApp } = Vue;
const fs = require('fs')

const app = new Vue({
  el: '#app',
  data() {
    return {
      tempPath: null,
      audioFileList: [],
      processing: false,
      processDone: false
    };
  },
  async mounted() {
    const tempPath = await window.electronAPI.getTempPath()
    console.log(tempPath)
    this.tempPath = tempPath
    const dir = this.tempPath + 'sil_r/'
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    document.addEventListener('drop', (event) => {
      event.preventDefault();
      event.stopPropagation();
      for (let i = 0; i < event.dataTransfer.files.length; i++) {
        const f = event.dataTransfer.files[i]
        // console.log(f)
        console.log('File Path of dragged files: ', f.path)
        const containerId = 'f' + Date.now() + '_' + i
        this.audioFileList.push({
          containerId, filePath: f.path, fileName: f.name, outputPath: this.tempPath + 'sil_r/' + containerId + '_' + f.name
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
    drawBuffer(containerId, filePath) {
      const wavesurfer = WaveSurfer.create({
        container: '#'+containerId,
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
      this.processing = true
      try {
        await Promise.all(this.audioFileList.map(async f => {
          await removeSilence(f.filePath, f.outputPath)
          f.wavesurfer.load(f.outputPath)
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
