function l(t,r,n){let i=t[r];t[r]=t[n],t[n]=i}function o(t,r){for(const[n,i]of r)l(t,n,i)}const e=Object.freeze({nose:0,leftEyeInner:1,leftEye:2,leftEyeOuter:3,rightEyeInner:4,rightEye:5,rightEyeOuter:6,leftEar:7,rightEar:8,mouthLeft:9,mouthRight:10,leftShoulder:11,rightShoulder:12,leftElbow:13,rightElbow:14,leftWrist:15,rightWrist:16,leftPinky:17,rightPinky:18,leftIndex:19,rightIndex:20,leftThumb:21,rightThumb:22,leftHip:23,rightHip:24,leftKnee:25,rightKnee:26,leftAnkle:27,rightAnkle:28,leftHeel:29,rightHeel:30,leftFootIndex:31,rightFootIndex:32}),f=Object.freeze(Object.getOwnPropertyNames(e));function h(t){return t.replace(new RegExp("(?<!^)[A-Z]","g"),r=>`_${r.toLowerCase()}`)}const a=Object.freeze(f.map(t=>h(t).toUpperCase()));function s(t){const r=[...t];return o(r,[[e.leftEyeInner,e.rightEyeInner],[e.leftEye,e.rightEye],[e.leftEyeOuter,e.rightEyeOuter],[e.leftEar,e.rightEar],[e.mouthLeft,e.mouthRight],[e.leftShoulder,e.rightShoulder],[e.leftElbow,e.rightElbow],[e.leftWrist,e.rightWrist],[e.leftPinky,e.rightPinky],[e.leftIndex,e.rightIndex],[e.leftThumb,e.rightThumb],[e.leftHip,e.rightHip],[e.leftKnee,e.rightKnee],[e.leftAnkle,e.rightAnkle],[e.leftHeel,e.rightHeel],[e.leftFootIndex,e.rightFootIndex]]),r}function u(t){const r=t.map(n=>({...n,x:1-n.x}));return s(r)}function y(t,r,n){return((t==null?void 0:t.length)??0)<=0?null:t.map((i,g)=>({x:i.x*r,y:i.y*n,dist_from_camera:i.z*r,visibility:i.visibility??1}))}function p(t,r,n){return t.map(i=>({x:i.x/r,y:i.y/n,z:i.dist_from_camera/r,visibility:i.visibility}))}export{y as G,u as M,f as P,s as S,e as a,p as b,a as c};