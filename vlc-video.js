class VLCVideo extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });

    this.videoInfo = {
      source: this.getAttribute('source'),
      options: "--codec=webcodec --aout=emworklet_audio -vv --input-repeat=10000",
      size: {
        width: this.getAttribute('width') || '800',
        height: this.getAttribute('height') || '450'
      }
    };

    this.iframe = document.createElement('iframe');
    this.iframe.src = 'vlc-sandbox.html';
    this.iframe.width = this.videoInfo.size.width;
    this.iframe.height = this.videoInfo.size.height;
    this.iframe.style.border = 'none';

    this.shadowRoot.appendChild(this.iframe);

    this._onMessage = this._onMessage.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);

    this._duration = 0;
    this._currentTime = 0;
    this._paused = true;

    this._volume = 100;
    this._muted = false;

    this._pendingVolumeRequest = false;
  }

  connectedCallback() {
    this.iframe.onload = () => {
      this.iframe.contentWindow.postMessage({
        action: 'load',
        video: this.videoInfo
      }, '*');
      this.getDuration();
    };

    window.addEventListener('message', this._onMessage);
    window.addEventListener('keydown', this._onKeyDown);
  }

  disconnectedCallback() {
    window.removeEventListener('message', this._onMessage);
    window.removeEventListener('keydown', this._onKeyDown);
  }

  _onMessage(event) {
    if (event.source !== this.iframe.contentWindow) return;

    const { action, progress, time, length, value } = event.data;

    if (action === 'progress') {
      this.dispatchEvent(new CustomEvent('timeupdate', {
        detail: { progress },
        bubbles: true
      }));
    } else if (action === 'current_time') {
      this._currentTime = time;
    } else if (action === 'duration') {
      this._duration = length;
    } else if (action === 'volume') {
      this._volume = value;
      this._pendingVolumeRequest = false;
      this.dispatchEvent(new CustomEvent('volumechange', {
        detail: { volume: this._volume }
      }));
    } else if (action === 'muted') {
      // 保持 mute 相关不变
      this._muted = value;
    }
  }

  _onKeyDown(event) {
    if (event.key === 'Escape') {
      this.toggleFullscreen();
    }
  }

  play() {
    this._paused = false;
    this.iframe.contentWindow.postMessage({ action: 'play' }, '*');
  }

  pause() {
    this._paused = true;
    this.iframe.contentWindow.postMessage({ action: 'pause' }, '*');
  }

  load() {
    this.iframe.contentWindow.postMessage({
      action: 'load',
      video: this.videoInfo
    }, '*');
  }

  stop() {
    this._paused = true;
    this.iframe.contentWindow.postMessage({ action: 'stop' }, '*');
  }

  toggleFullscreen() {
    this.iframe.contentWindow.postMessage({ action: 'fullscreen' }, '*');
  }

  get currentTime() {
    this.iframe.contentWindow.postMessage({ action: 'get_time' }, '*');
    return this._currentTime;
  }

  set currentTime(value) {
    this._currentTime = value;
    this.iframe.contentWindow.postMessage({ action: 'set_time', value }, '*');
  }

  get duration() {
    return this._duration;
  }

  get paused() {
    return this._paused;
  }

  // volume 相关
  get volume() {
    if (!this._pendingVolumeRequest) {
      this._pendingVolumeRequest = true;
      this.iframe.contentWindow.postMessage({ action: 'get_volume' }, '*');
    }
    return this._volume;
  }

  set volume(value) {
    this._volume = value;
    this.iframe.contentWindow.postMessage({ action: 'set_volume', value }, '*');
    this.dispatchEvent(new CustomEvent('volumechange', {
      detail: { volume: this._volume }
    }));
  }

  // mute 相关函数，保持不变
  toggleMute() {
    this.iframe.contentWindow.postMessage({ action: 'toggle_mute' }, '*');
    this._muted = !this._muted;
  }

  setMute(value) {
    this._muted = !!value;
    this.iframe.contentWindow.postMessage({ action: 'set_mute', value: this._muted }, '*');
  }

  get muted() {
    this.iframe.contentWindow.postMessage({ action: 'get_muted' }, '*');
    return this._muted;
  }

  updateOverlay() {
    this.iframe.contentWindow?.update_overlay?.();
  }

  getDuration() {
    this.iframe.contentWindow.postMessage({ action: 'get_length' }, '*');
  }

  getCurrentTime() {
    this.iframe.contentWindow.postMessage({ action: 'get_time' }, '*');
  }
}

customElements.define('vlc-video', VLCVideo);
