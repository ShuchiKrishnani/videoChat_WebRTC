let isAlreadyCalling = false;
let getCalled = false;

const existingCalls = [];
var iceConfig = { 'iceServers': [{ 'url': 'stun:stun.l.google.com:19302' }]},
        peerConnections = {},
        currentId, roomId,
        finalStream,rooms
const { RTCPeerConnection, RTCSessionDescription } = window;

function createVideoContainer(videoID,stream) {
  const videoContainer = document.getElementById("video-container");
  const videoEl = document.createElement("video")
  videoEl.setAttribute("class","remote-video")
  videoEl.setAttribute("id",videoID)
  console.log(videoID)
  //videoEl.setAttribute("autoplay")
  videoEl.srcObject = stream
  videoEl.autoplay = true
  //event.track.onended = event => videoEl.srcObject = videoEl.srcObject;
  videoContainer.append(videoEl)
  
}

const socket =  io.connect('https://fitnessvideo.herokuapp.com/', {secure: true})// for local connection io.connect("localhost:5000");

navigator.getUserMedia(
  { video: true, audio: true },
  stream => {
    const localVideo = document.getElementById("local-video");
    if (localVideo) {
      localVideo.srcObject = stream;
    }
    this.stream = stream
    createRoom((roomid) => {
      console.log(`room id is ${roomid}`)
    })
  },
  error => {
    console.warn(error.message);
  }
);

socket.on('peer.connected', function (params) {
  console.log("in peer connected")
  makeOffer(params.id);
});

socket.on('peer.disconnected', function (data) {
  api.trigger('peer.disconnected', [data]);
});
socket.on('msg', function (data) {
  console.log("in msg of client")
  handleMessage(data);
});
function handleMessage(data) {
  console.log("in handlemessage")
  var pc = getPeerConnection(data.by);
  switch (data.type) {
    case 'sdp-offer':
      pc.setRemoteDescription(new RTCSessionDescription(data.sdp), function () {
        console.log('Setting remote description by offer');
        pc.createAnswer(function (sdp) {
          pc.setLocalDescription(sdp);
          socket.emit('msg', { by: currentId, to: data.by, sdp: sdp, type: 'sdp-answer' });
        }, function(e) {
          console.error(e)
        });
      }, function (e) {
        console.error(e);
      });
      break;
    case 'sdp-answer':
      pc.setRemoteDescription(new RTCSessionDescription(data.sdp), function () {
        console.log('Setting remote description by answer');
      }, function (e) {
        console.error(e);
      });
      break;
    case 'ice':
      if (data.ice) {
        console.log('Adding ice candidates');
        pc.addIceCandidate(new RTCIceCandidate(data.ice));
      }
      break;
  }
}

function getPeerConnection(id) {
  if (this.peerConnections[id]) {
    return peerConnections[id]
  } 
  var pc = new RTCPeerConnection(iceConfig)
  peerConnections[id] = pc
  stream.getTracks().forEach(track => pc.addTrack(track, stream));
  pc.onicecandidate = function (evnt) {
    socket.emit('msg', { by: currentId, to: id, ice: evnt.candidate, type: 'ice' });
  };
  pc.onaddstream = function (evnt) {
    console.log('Received new stream');
    createVideoContainer(id,stream)
  };
  return pc;
}

function makeOffer(id) {
  var pc = getPeerConnection(id);
  console.log("in make offer")
  pc.createOffer(function (sdp) {
    pc.setLocalDescription(sdp);
    console.log('Creating an offer for', id);
    socket.emit('msg', { by: currentId, to: id, sdp: sdp, type: 'sdp-offer' });
  }, function (e) {
    console.log(`in make offer ${e}`);
  },
  { mandatory: { OfferToReceiveVideo: true, OfferToReceiveAudio: true }});
}

function joinRoom(room) {
  socket.emit('init', { room: room }, function (roomid, id) {
    currentId = id;
    roomId = roomid;
  });
}

function createRoom(room,callback) {
  socket.emit('init', {room: 1234}, function (roomid, id) {
    roomId = roomid;
    currentId = id;
    connected = true;
  });
 // callback(roomid)
}