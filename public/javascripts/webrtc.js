(function () {
  const btnStart = document.getElementById('btnStart');
  const btnCall = document.getElementById('btnCall');
  const btnHangup = document.getElementById('btnHangup');
  const localVideo = document.getElementById('localVideo');
  const remoteVideo = document.getElementById('remoteVideo');
  const roomInfo = document.getElementById('roomInfo');
  const logEl = document.getElementById('log');

  /** State */
  let socket;            // Socket.IO client
  let roomId;            // Current room
  let isInitiator = false;
  let localStream = null;
  let peerConnection = null;

  const rtcConfig = {
    iceServers: [
      { urls: ['stun:stun.l.google.com:19302'] }
    ]
  };

  function log(message, ...args) {
    const ts = new Date().toISOString().substring(11, 19);
    const line = `[${ts}] ${message}${args.length ? ' ' + JSON.stringify(args) : ''}`;
    console.log(line);
    if (logEl) {
      const div = document.createElement('div');
      div.textContent = line;
      logEl.appendChild(div);
    }
  }

  function parseOrCreateRoom() {
    const url = new URL(window.location.href);
    const existing = url.searchParams.get('room');
    if (existing) return existing;
    const generated = 'room-' + Math.random().toString(36).slice(2, 8);
    url.searchParams.set('room', generated);
    history.replaceState(null, '', url.toString());
    return generated;
  }

  function setUiState({ started, calling, canCall }) {
    if (btnStart) btnStart.disabled = !!started;
    if (btnCall) btnCall.disabled = !canCall || !!calling;
    if (btnHangup) btnHangup.disabled = !calling;
  }

  async function startMedia() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
      localStream = stream;
      localVideo.srcObject = stream;
      setUiState({ started: true, calling: false, canCall: true });
      log('Local media captured');
    } catch (err) {
      log('getUserMedia failed', err);
      alert('Could not access camera/microphone.');
      throw err;
    }
  }

  function ensureSocket() {
    if (socket && socket.connected) return;
    socket = io();

    socket.on('connect', () => {
      log('Socket connected', socket.id);
      socket.emit('join', roomId);
    });

    socket.on('created', (id) => {
      log('Room created', id);
      isInitiator = true;
    });

    socket.on('joined', (id) => {
      log('Joined room', id);
      isInitiator = false;
    });

    socket.on('full', () => {
      log('Room is full');
      alert('Room is full (2 peers max in this demo).');
    });

    // When the second peer joins, the server notifies readiness
    socket.on('ready', async () => {
      log('Room ready');
      if (isInitiator && localStream) {
        await beginCall(true);
      }
    });

    socket.on('offer', async (remoteDesc) => {
      log('Received offer');
      await beginCall(false);
      await peerConnection.setRemoteDescription(new RTCSessionDescription(remoteDesc));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      socket.emit('answer', { roomId, desc: answer });
      log('Sent answer');
    });

    socket.on('answer', async (remoteDesc) => {
      log('Received answer');
      await peerConnection.setRemoteDescription(new RTCSessionDescription(remoteDesc));
    });

    socket.on('ice-candidate', async (candidate) => {
      try {
        await peerConnection?.addIceCandidate(candidate);
        log('Added remote ICE candidate');
      } catch (e) {
        log('Failed to add ICE candidate', e);
      }
    });

    socket.on('peer-left', () => {
      log('Peer left');
      endCall();
    });
  }

  async function beginCall(initiator) {
    if (peerConnection) return; // already started
    peerConnection = new RTCPeerConnection(rtcConfig);

    // Local tracks
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });

    // Remote tracks
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      if (remoteStream) {
        remoteVideo.srcObject = remoteStream;
      }
    };

    // ICE
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('ice-candidate', { roomId, candidate: event.candidate });
      }
    };

    peerConnection.onconnectionstatechange = () => {
      log('PC state', peerConnection.connectionState);
    };

    setUiState({ started: true, calling: true, canCall: false });

    if (initiator) {
      const offer = await peerConnection.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
      await peerConnection.setLocalDescription(offer);
      socket.emit('offer', { roomId, desc: offer });
      log('Sent offer');
    }
  }

  function endCall() {
    if (peerConnection) {
      try { peerConnection.ontrack = null; } catch (_) {}
      try { peerConnection.onicecandidate = null; } catch (_) {}
      try { peerConnection.close(); } catch (_) {}
      peerConnection = null;
    }
    remoteVideo.srcObject = null;
    setUiState({ started: true, calling: false, canCall: true });
  }

  // UI handlers
  btnStart?.addEventListener('click', async () => {
    roomId = parseOrCreateRoom();
    if (roomInfo) roomInfo.textContent = `Room: ${roomId}`;
    await startMedia();
    ensureSocket();
  });

  btnCall?.addEventListener('click', async () => {
    ensureSocket();
    if (isInitiator && localStream) {
      await beginCall(true);
    } else {
      log('Waiting for the other peer to start...');
    }
  });

  btnHangup?.addEventListener('click', () => {
    if (socket && roomId) socket.emit('leave', roomId);
    endCall();
  });

  // Auto-start media if user granted permission before
  // (Keeps UX simple if you reload the page)
  // Do not auto-join to avoid prompting without user action.
})();
