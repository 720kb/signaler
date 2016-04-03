!function(e,n){"object"==typeof exports&&"undefined"!=typeof module?n(exports,require("rxjs/Rx"),require("comunicator")):"function"==typeof define&&define.amd?define("signaler",["exports","rxjs/Rx","comunicator"],n):n(e.signaler=e.signaler||{},e.Rx,e.comunicator)}(this,function(e,n,t){"use strict";n="default"in n?n["default"]:n;var r={};r.classCallCheck=function(e,n){if(!(e instanceof n))throw new TypeError("Cannot call a class as a function")},r.createClass=function(){function e(e,n){for(var t=0;t<n.length;t++){var r=n[t];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}return function(n,t,r){return t&&e(n.prototype,t),r&&e(n,r),n}}(),r.inherits=function(e,n){if("function"!=typeof n&&null!==n)throw new TypeError("Super expression must either be null or a function, not "+typeof n);e.prototype=Object.create(n&&n.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}}),n&&(Object.setPrototypeOf?Object.setPrototypeOf(e,n):e.__proto__=n)},r.possibleConstructorReturn=function(e,n){if(!e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!n||"object"!=typeof n&&"function"!=typeof n?e:n};var a={iceServers:[{urls:"stun:stun.l.google.com:19302"},{urls:"stun:23.21.150.121"}]},o={},i={},s=Symbol("ice-candidates"),c=Symbol("peer-connection"),u=Symbol("data-channel"),h=function(e){function t(e){var h=arguments.length<=1||void 0===arguments[1]?!1:arguments[1];if(r.classCallCheck(this,t),!e)throw new Error("Manadatory spd constraints missing.");var f=new n.Observable(function(e){var n=function(n){e.error({type:"error",cause:n})},t=function(n){if(n&&n.data)if(("string"==typeof n.data||String.prototype.isPrototypeOf(n.data))&&n.data.indexOf("_signaler")>=0)switch(n.data){case"_signaler:got-stream?":e.next({type:"add-stream"});break;default:e.error({type:"warn",cause:"Not interesting event atm"})}else e.next({type:"datachannel-message",payload:JSON.parse(n.data)});else e.error({type:"error",cause:"Event data not present"})},r=function(){e.next({type:"datachannel-opened"})},f=function(){e.next({type:"datachannel-closed"})},d=function(){l[c].createOffer().then(function(n){return e.next({type:"offer",offer:n}),Promise.all([l[c].setLocalDescription(new RTCSessionDescription(n)),Promise.resolve(n)])}).then(function(n){return e.next({type:"offer-set",offer:n[1]})})["catch"](function(n){e.error({type:"error",cause:n})})};return l[c]=new RTCPeerConnection(a,o),h||(l[u]=l[c].createDataChannel("signaler-datachannel",i),l[u].onerror=n,l[u].onmessage=t,l[u].onopen=r,l[u].onclose=f),l[c].onnegotiationneeded=d,l[c].onicecandidate=function(n){n.candidate?l[s].push(n.candidate):l[s]&&l[s].length>=0&&e.next({type:"use-ice-candidates",candidates:l[s].splice(0,l[s].length)})},l[c].onaddstream=function(n){return n&&n.stream?void e.next({type:"add-stream",stream:n.stream}):e.error({type:"warning",cause:"No stream arrived"})},l[c].onremovestream=function(n){return n&&n.stream?void e.next({type:"remove-stream",stream:n.stream}):e.error({type:"warning",cause:"No stream arrived"})},l[c].oniceconnectionstatechange=function(n){if(!n||!n.target||!n.target.iceConnectionState)return e.error({type:"warning",cause:"ice connection state changed without event value"});switch(n.target.iceConnectionState){case"connected":case"completed":e.next({type:"ready",state:n.target.iceConnectionState});break;default:e.next({type:"ice-connection-state",state:n.target.iceConnectionState})}},l[c].onsignalingstatechange=function(n){if(!n||!n.target||!n.target.signalingState)return e.error({type:"error",cause:"signaling state changed without event value"});switch(n.target.signalingState){default:e.next({type:"signaling-state",state:n.target.signalingState})}},l[c].ondatachannel=function(a){return a&&a.channel?(l[u]=a.channel,a.channel.onerror=n,a.channel.onmessage=t,a.channel.onopen=r,void(a.channel.onclose=f)):e.error({type:"error",cause:"channel in event is not present"})},l.setAnswer=function(n){l[c].setRemoteDescription(new RTCSessionDescription(n)).then(function(){e.next({type:"answer-set",answer:n})})},l.setOffer=function(n){l[c].setRemoteDescription(new RTCSessionDescription(n)).then(function(){return e.next({type:"offer-set",offer:n}),l[c].createAnswer(l.sdpConstr)}).then(function(n){return e.next({type:"answer",answer:n}),Promise.all([l[c].setLocalDescription(new RTCSessionDescription(n)),Promise.resolve(n)])}).then(function(n){return e.next({type:"answer-set",answer:n[1]})})["catch"](function(n){e.error({type:"error",cause:n})})},function(){l[u].close(),l[c].close()}}).share(),l=r.possibleConstructorReturn(this,Object.getPrototypeOf(t).call(this,function(e){var n=f.subscribe(e);return function(){n.unsubscribe()}}));return l[s]=[],l.sdpConstr=e,l}return r.inherits(t,e),r.createClass(t,[{key:"addIceCandidates",value:function(e){var n=this;if(!e)throw new Error("Invalid candidates");e.forEach(function(e){return n[c].addIceCandidate(new RTCIceCandidate(e))})}},{key:"dataChannel",get:function(){if(!this[u])throw new Error("Datachannel is not created");return this[u]}}]),t}(n.Observable),f=Symbol("comunicator"),l=Symbol("my-stream"),d=Symbol("user-media-constraint"),w=Symbol("sdp-constraints"),p=Symbol("initiators"),y=Symbol("peers"),m="unknown-peer",g={audio:!0,video:!0},v={mandatory:{OfferToReceiveAudio:!0,OfferToReceiveVideo:!0}},b=function(e){function a(e){var o=arguments.length<=1||void 0===arguments[1]?g:arguments[1],i=arguments.length<=2||void 0===arguments[2]?v:arguments[2],s=arguments.length<=3||void 0===arguments[3]?!1:arguments[3];r.classCallCheck(this,a);var c=new n.Observable(function(e){u[f].filter(function(e){return e.what&&"do-handshake"===e.what.type}).forEach(function(n){if(n.whoami&&n.what.channel){var t=new h(i);u[p].set(n.what.channel,n.who),s&&t.forEach(function(e){return console.info(e)}),t.filter(function(e){return"offer"===e.type}).forEach(function(e){return u[f].sendTo(n.whoami,{channel:n.what.channel,offer:e.offer})}),t.filter(function(e){return"use-ice-candidates"===e.type}).forEach(function(e){return u[f].sendTo(n.whoami,{channel:n.what.channel,candidates:e.candidates})}),t.filter(function(e){return"datachannel-message"===e.type}).forEach(function(n){return e.next(n)}),u[y].set(n.what.channel+"-"+n.who,t)}else window.setTimeout(function(){throw new Error("Missing sender and channel that are mandatory")})}),u[f].filter(function(e){return e.what&&e.what.offer}).forEach(function(n){if(n.whoami&&n.what.channel&&n.what.offer){var t=void 0;u[y].has(n.what.channel+"-"+n.who)?t=u[y].get(n.what.channel+"-"+n.who):(t=new h(i,!0),u[p].set(n.what.channel,n.whoami),u[y].set(n.what.channel+"-"+n.who,t)),s&&t.forEach(function(e){return console.info(e)}),t.filter(function(e){return"answer"===e.type}).forEach(function(e){return u[f].sendTo(n.whoami,{channel:n.what.channel,answer:e.answer})}),t.filter(function(e){return"use-ice-candidates"===e.type}).forEach(function(e){return u[f].sendTo(n.whoami,{channel:n.what.channel,candidates:e.candidates})}),t.filter(function(e){return"datachannel-message"===e.type}).forEach(function(n){return e.next(n)}),t.setOffer(n.what.offer)}else window.setTimeout(function(){throw new Error("Missing sender, channel and the offer that are mandatory")})}),u[f].filter(function(e){return e.what&&e.what.answer}).forEach(function(e){if(e.whoami&&e.what.channel&&e.what.answer){var n=void 0;u[y].has(e.what.channel+"-"+e.who)?n=u[y].get(e.what.channel+"-"+e.who):window.setTimeout(function(){throw new Error("The peer connection must be already enstablished")}),n.setAnswer(e.what.answer)}else window.setTimeout(function(){throw new Error("Missing sender, channel and the answer that are mandatory")})}),u[f].filter(function(e){return e.what&&e.what.candidates}).forEach(function(e){var n=void 0;u[y].has(e.what.channel+"-"+e.who)?n=u[y].get(e.what.channel+"-"+e.who):window.setTimeout(function(){throw new Error("The peer connection must be already enstablished")}),n.addIceCandidates(e.what.candidates)}),u.getUserMedia=function(){navigator.mediaDevices.getUserMedia(u.userMediaConstraints).then(function(n){u[l]||(e.next({type:"my-stream",stream:n}),u[l]=n)})["catch"](function(e){throw new Error(e)})}}).share(),u=r.possibleConstructorReturn(this,Object.getPrototypeOf(a).call(this,function(e){var n=c.subscribe(e);return function(){n.unsubscribe()}}));return u[f]=new t.Comunicator(e),u[d]=o,u[w]=i,u[y]=new Map,u[p]=new Map,u}return r.inherits(a,e),r.createClass(a,[{key:"createChannel",value:function(e){if(!e)throw new Error("Missing mandatory <channel> parameter.");this[f].sendTo(m,{type:"create-channel",channel:e},!0)}},{key:"joinChannel",value:function(e){if(!e)throw new Error("Missing mandatory <channel> parameter.");this[f].sendTo(m,{type:"join-channel",channel:e},!0)}},{key:"streamOnChannel",value:function(){}},{key:"sendTo",value:function(e,n,t){if(!this[y].has(e+"-"+n))throw new Error("User "+n+" for channel "+e+" do not exist");var r=this[y].get(e+"-"+n).dataChannel;r.send(JSON.stringify(t))}},{key:"broadcast",value:function(e,n){var t=this[y].keys(),r=!0,a=!1,o=void 0;try{for(var i,s=t[Symbol.iterator]();!(r=(i=s.next()).done);r=!0){var c=i.value,u=c.split("-");if(u[0]===String(e)){var h=this[y].get(c).dataChannel;h.send(JSON.stringify(n))}}}catch(f){a=!0,o=f}finally{try{!r&&s["return"]&&s["return"]()}finally{if(a)throw o}}}},{key:"approve",value:function(){}},{key:"unApprove",value:function(){}},{key:"leaveChannel",value:function(){}},{key:"userIsPresent",value:function(e,n){return this[f].userIsPresent(e,n)}},{key:"userMediaConstraints",get:function(){return this[d]}},{key:"sdpConstraints",get:function(){return this[w]}},{key:"stream",get:function(){if(!this[l])throw new Error("Stream is not present. You have to ask this to the user");return this[l]}},{key:"peers",get:function(){return this[y]}},{key:"initiators",get:function(){return this[p]}}]),a}(n.Observable);e.Signaler=b});
//# sourceMappingURL=signaler-min.js.map