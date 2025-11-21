// let localStream;
// let peerConnection;
// let ws;
// let roomId;
// let peerId;
// let isVideoEnabled = true;
// let isAudioEnabled = true;

// const servers = {
//   iceServers: [
//     { urls: "stun:stun.l.google.com:19302" },
//     { urls: "stun:stun1.l.google.com:19302" },
//     { urls: "stun:stun2.l.google.com:19302" },
//     { urls: "stun:stun3.l.google.com:19302" },
//     { urls: "stun:stun4.l.google.com:19302" },
//   ],
// };

// // WebRTC configuration
// const peerConfig = {
//   iceServers: servers.iceServers,
//   iceCandidatePoolSize: 10,
// };

// async function joinRoom() {
//   roomId = document.getElementById("roomId").value;
//   if (!roomId) {
//     alert("Please enter a room ID");
//     return;
//   }

//   // Check browser support for WebRTC
//   if (!window.RTCPeerConnection) {
//     alert("Your browser doesn't support WebRTC. Please use a modern browser like Chrome, Firefox, or Edge.");
//     return;
//   }

//   // Check HTTPS in production
//   if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
//     if (window.location.protocol !== 'https:') {
//       alert("For security reasons, this application requires HTTPS in production. Please use an HTTPS connection.");
//       window.location.href = 'https://' + window.location.host + window.location.pathname;
//       return;
//     }
//   }

//   // Update status to show we're connecting
//   document.getElementById("connectionStatus").textContent = "Connecting... Please allow camera/microphone access if prompted";

//   // Generate a random peer ID
//   peerId = Math.random().toString(36).substr(2, 9);

//   try {
//     // First check if media devices are available
//     if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
//       throw new Error("Your browser doesn't support media devices");
//     }

//     // Try to get both video and audio
//     try {
//       localStream = await navigator.mediaDevices.getUserMedia({
//         video: true,
//         audio: true,
//       });
//     } catch (mediaError) {
//       // If full access fails, try audio only
//       console.log("Failed to get video and audio, trying audio only:", mediaError);
//       try {
//         localStream = await navigator.mediaDevices.getUserMedia({
//           video: false,
//           audio: true,
//         });
//         alert("Video access was denied. Continuing with audio only.");
//       } catch (audioError) {
//         // If audio only fails, try video only
//         console.log("Failed to get audio, trying video only:", audioError);
//         try {
//           localStream = await navigator.mediaDevices.getUserMedia({
//             video: true,
//             audio: false,
//           });
//           alert("Audio access was denied. Continuing with video only.");
//         } catch (videoError) {
//           // If everything fails, throw a user-friendly error
//           throw new Error("Unable to access camera or microphone. Please make sure:\n\n" +
//             "1. Your camera and microphone are properly connected\n" +
//             "2. You have given permission to use them\n" +
//             "3. No other application is using them");
//         }
//       }
//     }
//     document.getElementById("localVideo").srcObject = localStream;

//     // Initialize WebSocket connection after media is ready
//     const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
//     // ws = new WebSocket(`${protocol}//${window.location.host}/ws`);
//     // Use your specific dev-tunnel URL for the WebSocket
//     const wsUrl = "wss://9d5rn0r8-5050.inc1.devtunnels.ms/ws";
//     ws = new WebSocket(wsUrl);


//     // Wait for WebSocket connection to be ready
//     await new Promise((resolve) => {
//       ws.onopen = () => resolve();
//     });

//     // Set up WebSocket handlers
//     setupWebSocket();

//     // Create and configure peer connection
//     createPeerConnection();

//     // Join the room
//     ws.send(
//       JSON.stringify({
//         type: "join",
//         roomId: roomId,
//         peerId: peerId,
//       })
//     );

//     // Update UI to show connection status
//     document.getElementById("connectionStatus").textContent =
//       "Connected to room: " + roomId;
//     updateMediaButtons();
//   } catch (err) {
//     console.error("Error in join room:", err);
    
//     // Update status with error
//     const statusEl = document.getElementById("connectionStatus");
//     statusEl.style.color = '#ef4444';  // Red color for error
    
//     if (err.name === 'NotAllowedError') {
//       statusEl.textContent = "Permission denied. Please allow camera/microphone access and try again.";
//     } else if (err.name === 'NotFoundError') {
//       statusEl.textContent = "Camera or microphone not found. Please check your devices and try again.";
//     } else if (err.name === 'NotReadableError') {
//       statusEl.textContent = "Unable to access your camera/microphone. They might be in use by another application.";
//     } else {
//       statusEl.textContent = "Error: " + err.message;
//     }
//   }
// }

// function setupWebSocket() {
//   ws.onmessage = async function (event) {
//     const message = JSON.parse(event.data);
//     console.log("Received message:", message.type);

//     switch (message.type) {
//       case "peer-joined":
//         console.log("Peer joined:", message.peerId);
//         // Create an offer if our peerId is greater than the joined peer's ID
//         if (peerId > message.peerId) {
//           try {
//             console.log(
//               "Creating offer as initiator for peer:",
//               message.peerId
//             );
//             if (
//               !peerConnection ||
//               peerConnection.connectionState === "closed"
//             ) {
//               createPeerConnection();
//             }

//             const offer = await peerConnection.createOffer({
//               offerToReceiveAudio: true,
//               offerToReceiveVideo: true,
//             });

//             console.log("Setting local description:", offer.type);
//             await peerConnection.setLocalDescription(offer);

//             console.log("Sending offer to peer:", message.peerId);
//             ws.send(
//               JSON.stringify({
//                 type: "offer",
//                 roomId: roomId,
//                 peerId: message.peerId, // This is the target peer
//                 payload: offer,
//               })
//             );
//           } catch (err) {
//             console.error("Error creating offer:", err);
//           }
//         } else {
//           console.log("Waiting for offer from peer:", message.peerId);
//           if (!peerConnection) {
//             createPeerConnection();
//           }
//         }
//         break;

//       case "offer":
//         await handleOffer(message);
//         break;

//       case "answer":
//         await handleAnswer(message);
//         break;

//       case "ice-candidate":
//         await handleIceCandidate(message);
//         break;

//       case "peer-left":
//         handlePeerLeft();
//         break;
//     }
//   };

//   ws.onerror = function (error) {
//     console.error("WebSocket Error:", error);
//   };

//   ws.onclose = function () {
//     console.log("WebSocket Connection Closed");
//   };
// }

// function createPeerConnection() {
//   if (peerConnection) {
//     peerConnection.close();
//   }

//   peerConnection = new RTCPeerConnection(peerConfig);
//   console.log("Created new peer connection");

//   // Add local stream tracks to peer connection
//   localStream.getTracks().forEach((track) => {
//     const sender = peerConnection.addTrack(track, localStream);
//     console.log(
//       "Added local track:",
//       track.kind,
//       "with sender:",
//       sender.toString()
//     );
//   });

//   // Handle ICE candidates
//   peerConnection.onicecandidate = (event) => {
//     if (event.candidate) {
//       console.log("New ICE candidate:", event.candidate.type);
//       ws.send(
//         JSON.stringify({
//           type: "ice-candidate",
//           roomId: roomId,
//           peerId: peerId,
//           payload: event.candidate,
//         })
//       );
//     } else {
//       console.log("All ICE candidates gathered");
//     }
//   };

//   // Handle connection state changes
//   peerConnection.onconnectionstatechange = () => {
//     const state = peerConnection.connectionState;
//     console.log("Connection state changed:", state);
//     document.getElementById("connectionStatus").textContent =
//       "Connection state: " + state;

//     if (state === "failed") {
//       console.log("Connection failed, restarting peer connection");
//       createPeerConnection();
//     }
//   };

//   peerConnection.oniceconnectionstatechange = () => {
//     const state = peerConnection.iceConnectionState;
//     console.log("ICE connection state:", state);

//     if (state === "disconnected" || state === "failed") {
//       console.log("ICE connection failed, checking tracks");
//       checkAndRestartTracks();
//     }
//   };

//   peerConnection.onsignalingstatechange = () => {
//     console.log("Signaling state:", peerConnection.signalingState);
//   };

//   // Log ICE connection state changes
//   peerConnection.oniceconnectionstatechange = () => {
//     console.log("ICE connection state:", peerConnection.iceConnectionState);
//     document.getElementById("connectionStatus").textContent =
//       "Connection status: " + peerConnection.iceConnectionState;
//   };

//   // Handle receiving remote stream
//   peerConnection.ontrack = (event) => {
//     console.log(
//       "Received remote track:",
//       event.track.kind,
//       "streams:",
//       event.streams.length
//     );

//     const remoteVideo = document.getElementById("remoteVideo");
//     if (!remoteVideo.srcObject) {
//       remoteVideo.srcObject = new MediaStream();
//     }

//     // Add the track to the remote stream if it's not already there
//     const stream = remoteVideo.srcObject;
//     if (!stream.getTracks().some((t) => t.id === event.track.id)) {
//       stream.addTrack(event.track);
//       console.log("Added track to remote stream:", event.track.kind);
//     }

//     // Monitor track state
//     event.track.onmute = () =>
//       console.log("Remote track muted:", event.track.kind);
//     event.track.onunmute = () =>
//       console.log("Remote track unmuted:", event.track.kind);
//     event.track.onended = () =>
//       console.log("Remote track ended:", event.track.kind);
//   };
// }

// async function handleOffer(message) {
//   try {
//     console.log("Handling offer from peer:", message.peerId);

//     if (!peerConnection || peerConnection.signalingState === "closed") {
//       console.log("Creating new peer connection for offer");
//       createPeerConnection();
//     }

//     if (peerConnection.signalingState !== "stable") {
//       console.log("Signaling state not stable, resetting connection");
//       await Promise.all([
//         peerConnection.setLocalDescription({ type: "rollback" }),
//         peerConnection.setRemoteDescription(
//           new RTCSessionDescription(message.payload)
//         ),
//       ]);
//     } else {
//       await peerConnection.setRemoteDescription(
//         new RTCSessionDescription(message.payload)
//       );
//     }

//     console.log("Creating answer");
//     const answer = await peerConnection.createAnswer();
//     console.log("Setting local description (answer)");
//     await peerConnection.setLocalDescription(answer);

//     console.log("Sending answer to peer:", message.peerId);
//     ws.send(
//       JSON.stringify({
//         type: "answer",
//         roomId: roomId,
//         peerId: message.peerId,
//         payload: answer,
//       })
//     );
//   } catch (err) {
//     console.error("Error handling offer:", err);
//   }
// }

// async function handleAnswer(message) {
//   try {
//     console.log("Handling answer from peer:", message.peerId);
//     if (peerConnection.signalingState === "have-local-offer") {
//       await peerConnection.setRemoteDescription(
//         new RTCSessionDescription(message.payload)
//       );
//       console.log("Set remote description from answer successfully");
//     } else {
//       console.warn(
//         "Received answer but peer connection is in state:",
//         peerConnection.signalingState
//       );
//     }
//   } catch (err) {
//     console.error("Error handling answer:", err);
//   }
// }

// async function handleIceCandidate(message) {
//   if (peerConnection && peerConnection.remoteDescription) {
//     try {
//       console.log("Adding ICE candidate from peer:", message.peerId);
//       await peerConnection.addIceCandidate(
//         new RTCIceCandidate(message.payload)
//       );
//       console.log("Added ICE candidate successfully");
//     } catch (e) {
//       console.error("Error adding received ice candidate:", e);
//     }
//   } else {
//     console.warn("Received ICE candidate but peer connection is not ready");
//   }
// }

// function handlePeerLeft() {
//   document.getElementById("remoteVideo").srcObject = null;
//   if (peerConnection) {
//     peerConnection.close();
//     peerConnection = null;
//   }
// }

// function toggleVideo() {
//   if (localStream) {
//     isVideoEnabled = !isVideoEnabled;
//     localStream.getVideoTracks().forEach((track) => {
//       track.enabled = isVideoEnabled;
//     });
//     // Update button state
//     const videoBtn = document.getElementById("videoBtn");
//     videoBtn.textContent = isVideoEnabled ? "Turn Off Video" : "Turn On Video";
//     videoBtn.classList.toggle("off", !isVideoEnabled);
//   }
// }

// function toggleAudio() {
//   if (localStream) {
//     isAudioEnabled = !isAudioEnabled;
//     localStream.getAudioTracks().forEach((track) => {
//       track.enabled = isAudioEnabled;
//     });
//     // Update button state
//     const audioBtn = document.getElementById("audioBtn");
//     audioBtn.textContent = isAudioEnabled ? "Mute Audio" : "Unmute Audio";
//     audioBtn.classList.toggle("off", !isAudioEnabled);
//   }
// }

// function updateMediaButtons() {
//   // Update both sets of buttons (main controls and video overlay)
//   const videoBtns = document.querySelectorAll("#videoBtn, #mainVideoBtn");
//   const audioBtns = document.querySelectorAll("#audioBtn, #mainAudioBtn");

//   videoBtns.forEach((btn) => {
//     btn.classList.toggle("off", !isVideoEnabled);
//     btn.title = isVideoEnabled ? "Turn Off Video" : "Turn On Video";
//   });

//   audioBtns.forEach((btn) => {
//     btn.classList.toggle("off", !isAudioEnabled);
//     btn.title = isAudioEnabled ? "Mute Audio" : "Unmute Audio";
//   });
// }

// // Function to check device permissions
// async function checkDevicePermissions() {
//   try {
//     // Check if the browser supports the permissions API
//     if (navigator.permissions && navigator.permissions.query) {
//       // Check camera permission
//       const cameraResult = await navigator.permissions.query({ name: 'camera' });
//       if (cameraResult.state === 'denied') {
//         throw new Error('Camera access is blocked. Please allow camera access in your browser settings.');
//       }

//       // Check microphone permission
//       const micResult = await navigator.permissions.query({ name: 'microphone' });
//       if (micResult.state === 'denied') {
//         throw new Error('Microphone access is blocked. Please allow microphone access in your browser settings.');
//       }
//     }

//     // List available devices
//     const devices = await navigator.mediaDevices.enumerateDevices();
//     const hasVideo = devices.some(device => device.kind === 'videoinput');
//     const hasAudio = devices.some(device => device.kind === 'audioinput');

//     if (!hasVideo && !hasAudio) {
//       throw new Error('No camera or microphone found. Please connect a device and try again.');
//     }

//     return { hasVideo, hasAudio };
//   } catch (error) {
//     console.error('Error checking permissions:', error);
//     throw error;
//   }
// }

// function checkAndRestartTracks() {
//   const remoteVideo = document.getElementById("remoteVideo");
//   const stream = remoteVideo.srcObject;

//   if (stream) {
//     const videoTrack = stream.getVideoTracks()[0];
//     const audioTrack = stream.getAudioTracks()[0];

//     console.log("Video track state:", videoTrack?.readyState);
//     console.log("Audio track state:", audioTrack?.readyState);

//     if (
//       videoTrack?.readyState === "ended" ||
//       audioTrack?.readyState === "ended"
//     ) {
//       console.log("Tracks ended, negotiating new connection");
//       if (peerConnection && peerConnection.connectionState === "connected") {
//         peerConnection.restartIce();
//       }
//     }
//   }
// }



let localStream;
let peerConnection;
let ws;
let roomId;
let peerId;
let isVideoEnabled = true;
let isAudioEnabled = true;

const servers = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ],
};

const peerConfig = {
  iceServers: servers.iceServers,
  iceCandidatePoolSize: 10,
};

async function joinRoom() {
  roomId = document.getElementById("roomId").value;
  if (!roomId) {
    alert("Please enter a room ID");
    return;
  }

  if (!window.RTCPeerConnection) {
    alert("Your browser doesn't support WebRTC.");
    return;
  }

  document.getElementById("connectionStatus").textContent = "Initializing media...";

  peerId = Math.random().toString(36).substr(2, 9);

  try {
    // 1. Get Media
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Media devices not supported");
    }

    try {
      localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (e) {
      console.warn("Video/Audio failed, trying audio only", e);
      try {
        localStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        alert("Video denied. Audio only mode.");
      } catch (e2) {
        console.warn("Audio failed, trying video only", e2);
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        alert("Audio denied. Video only mode.");
      }
    }
    
    if (!localStream) throw new Error("Could not access camera or microphone.");
    document.getElementById("localVideo").srcObject = localStream;

    // 2. Initialize WebSocket (THE FIX IS HERE)
    document.getElementById("connectionStatus").textContent = "Connecting to server...";
    
    // -----------------------------------------------------------
    // MICROSOFT DEV TUNNELS FIX
    // -----------------------------------------------------------
    const isSecure = window.location.protocol === 'https:';
    const protocol = isSecure ? 'wss:' : 'ws:';
    
    // In Dev Tunnels, the port is part of the domain (or hidden), so we usually
    // just want to use 'window.location.host' directly without adding a port number.
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    console.log(`Connecting to WebSocket: ${wsUrl}`);
    ws = new WebSocket(wsUrl);
    // -----------------------------------------------------------

    // Wait for connection
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("WebSocket connection timed out. Ensure backend is running."));
      }, 5000);

      ws.onopen = () => {
        clearTimeout(timer);
        console.log("WebSocket Connected!");
        resolve();
      };

      ws.onerror = (err) => {
        clearTimeout(timer);
        // Don't reject immediately on error to allow retries if needed, 
        // but here we fail fast to show the alert.
        console.error("WS Error Details:", err);
      };
    });

    setupWebSocket();
    createPeerConnection();

    ws.send(JSON.stringify({
      type: "join",
      roomId: roomId,
      peerId: peerId,
    }));

    document.getElementById("connectionStatus").textContent = `Connected to Room: ${roomId}`;
    updateMediaButtons();

  } catch (err) {
    console.error("Join Room Error:", err);
    const statusEl = document.getElementById("connectionStatus");
    statusEl.style.color = '#ef4444';
    statusEl.textContent = `Error: ${err.message}`;
    
    if (err.message.includes("WebSocket")) {
        alert("WebSocket connection failed. \n\nSince you are using a Tunnel, ensure the Port Visibility is set to 'Public' in VS Code.");
    }
  }
}

function setupWebSocket() {
  ws.onmessage = async function (event) {
    const message = JSON.parse(event.data);
    switch (message.type) {
      case "peer-joined":
        console.log("Peer joined:", message.peerId);
        if (peerId > message.peerId) {
          if (!peerConnection) createPeerConnection();
          try {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            ws.send(JSON.stringify({
              type: "offer",
              roomId: roomId,
              peerId: message.peerId,
              payload: offer,
            }));
          } catch (e) { console.error("Offer error:", e); }
        }
        break;

      case "offer":
        await handleOffer(message);
        break;

      case "answer":
        await handleAnswer(message);
        break;

      case "ice-candidate":
        await handleIceCandidate(message);
        break;

      case "peer-left":
        handlePeerLeft();
        break;
    }
  };

  ws.onclose = () => console.log("WS Connection Closed");
}

function createPeerConnection() {
  if (peerConnection) peerConnection.close();
  peerConnection = new RTCPeerConnection(peerConfig);

  if (localStream) {
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream);
    });
  }

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      ws.send(JSON.stringify({
        type: "ice-candidate",
        roomId: roomId,
        peerId: peerId,
        payload: event.candidate,
      }));
    }
  };

  peerConnection.onconnectionstatechange = () => {
    console.log("Connection State:", peerConnection.connectionState);
  };

  peerConnection.ontrack = (event) => {
    const remoteVideo = document.getElementById("remoteVideo");
    if (!remoteVideo.srcObject) {
      remoteVideo.srcObject = new MediaStream();
    }
    remoteVideo.srcObject.addTrack(event.track);
  };
}

async function handleOffer(message) {
  if (!peerConnection) createPeerConnection();
  
  if (peerConnection.signalingState !== "stable") {
      await Promise.all([
        peerConnection.setLocalDescription({ type: "rollback" }),
        peerConnection.setRemoteDescription(new RTCSessionDescription(message.payload))
      ]);
  } else {
      await peerConnection.setRemoteDescription(new RTCSessionDescription(message.payload));
  }

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  ws.send(JSON.stringify({
    type: "answer",
    roomId: roomId,
    peerId: message.peerId,
    payload: answer,
  }));
}

async function handleAnswer(message) {
  if (peerConnection.signalingState === "have-local-offer") {
    await peerConnection.setRemoteDescription(new RTCSessionDescription(message.payload));
  }
}

async function handleIceCandidate(message) {
  if (peerConnection && peerConnection.remoteDescription) {
    try {
      await peerConnection.addIceCandidate(new RTCIceCandidate(message.payload));
    } catch (e) { console.error("Error adding ICE:", e); }
  }
}

function handlePeerLeft() {
  document.getElementById("remoteVideo").srcObject = null;
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
    createPeerConnection();
  }
}

function toggleVideo() {
  if (localStream) {
    isVideoEnabled = !isVideoEnabled;
    localStream.getVideoTracks().forEach(track => track.enabled = isVideoEnabled);
    updateMediaButtons();
  }
}

function toggleAudio() {
  if (localStream) {
    isAudioEnabled = !isAudioEnabled;
    localStream.getAudioTracks().forEach(track => track.enabled = isAudioEnabled);
    updateMediaButtons();
  }
}

function updateMediaButtons() {
  const videoBtns = document.querySelectorAll("#videoBtn, #mainVideoBtn");
  const audioBtns = document.querySelectorAll("#audioBtn, #mainAudioBtn");

  videoBtns.forEach((btn) => {
    btn.textContent = isVideoEnabled ? "Turn Off Video" : "Turn On Video";
    btn.classList.toggle("off", !isVideoEnabled);
  });

  audioBtns.forEach((btn) => {
    btn.textContent = isAudioEnabled ? "Mute Audio" : "Unmute Audio";
    btn.classList.toggle("off", !isAudioEnabled);
  });
}