import{S as Ae,i as Ne,s as we,k as l,q as G,a as m,l as o,m as c,r as L,h,c as _,n as t,b as Ye,D as e,P as S,N as C,Q as A,I as _e,R as je,H as z,y as qe,z as He,A as Ce,g as ze,d as Oe,B as Qe}from"../chunks/index.63361c4d.js";import{d as ye,a as Be,p as Me,e as Ge,f as Le,b as Se}from"../chunks/settings.f2d99c93.js";import{l as Re}from"../chunks/math.c86fcf30.js";function Fe(r){let a,u,s,g,I,P,k,y,T,B,O,Q,E,R,D,i,x,$,M,ee,N,Y,te,ae,p,ne,w,j,re,se,f,le,V,q,oe,ue,b,ie,U,H,de,he,v,ce,fe;return{c(){a=l("section"),u=l("nav"),s=l("a"),g=G("< Home"),I=m(),P=l("h1"),k=G("Settings"),y=m(),T=l("div"),B=l("label"),O=G("Debug Mode"),Q=m(),E=l("input"),R=m(),D=l("div"),i=l("label"),x=G("Pause in Practice Page"),$=m(),M=l("input"),ee=m(),N=l("div"),Y=l("label"),te=G("Debug Pause Duration"),ae=m(),p=l("input"),ne=m(),w=l("div"),j=l("label"),re=G("Good/Bad Trial Threshold"),se=m(),f=l("input"),le=m(),V=l("div"),q=l("label"),oe=G("Yellow Threshold"),ue=m(),b=l("input"),ie=m(),U=l("div"),H=l("label"),de=G("Green Threshold"),he=m(),v=l("input"),this.h()},l(d){a=o(d,"SECTION",{class:!0});var n=c(a);u=o(n,"NAV",{class:!0});var be=c(u);s=o(be,"A",{class:!0,href:!0});var ve=c(s);g=L(ve,"< Home"),ve.forEach(h),be.forEach(h),I=_(n),P=o(n,"H1",{});var ge=c(P);k=L(ge,"Settings"),ge.forEach(h),y=_(n),T=o(n,"DIV",{});var F=c(T);B=o(F,"LABEL",{for:!0});var Pe=c(B);O=L(Pe,"Debug Mode"),Pe.forEach(h),Q=_(F),E=o(F,"INPUT",{type:!0,name:!0}),F.forEach(h),R=_(n),D=o(n,"DIV",{});var J=c(D);i=o(J,"LABEL",{for:!0});var Te=c(i);x=L(Te,"Pause in Practice Page"),Te.forEach(h),$=_(J),M=o(J,"INPUT",{type:!0,name:!0}),J.forEach(h),ee=_(n),N=o(n,"DIV",{});var K=c(N);Y=o(K,"LABEL",{for:!0});var Ee=c(Y);te=L(Ee,"Debug Pause Duration"),Ee.forEach(h),ae=_(K),p=o(K,"INPUT",{type:!0,name:!0,min:!0,max:!0,step:!0}),K.forEach(h),ne=_(n),w=o(n,"DIV",{});var W=c(w);j=o(W,"LABEL",{for:!0});var De=c(j);re=L(De,"Good/Bad Trial Threshold"),De.forEach(h),se=_(W),f=o(W,"INPUT",{type:!0,name:!0,min:!0,max:!0,step:!0}),W.forEach(h),le=_(n),V=o(n,"DIV",{});var X=c(V);q=o(X,"LABEL",{for:!0});var Ie=c(q);oe=L(Ie,"Yellow Threshold"),Ie.forEach(h),ue=_(X),b=o(X,"INPUT",{type:!0,name:!0,min:!0,max:!0,step:!0}),X.forEach(h),ie=_(n),U=o(n,"DIV",{});var Z=c(U);H=o(Z,"LABEL",{for:!0});var ke=c(H);de=L(ke,"Green Threshold"),ke.forEach(h),he=_(Z),v=o(Z,"INPUT",{type:!0,name:!0,min:!0,max:!0,step:!0}),Z.forEach(h),n.forEach(h),this.h()},h(){t(s,"class","button outlined"),t(s,"href","/"),t(u,"class","svelte-sijead"),t(B,"for","debugMode"),t(E,"type","checkbox"),t(E,"name","debugMode"),t(i,"for","pauseInPracticePage"),t(M,"type","checkbox"),t(M,"name","pauseInPracticePage"),t(Y,"for","debugPauseDuration"),t(p,"type","number"),t(p,"name","debugPauseDuration"),t(p,"min",Ve),t(p,"max",Ue),t(p,"step",r[1]),t(j,"for","evaluation_GoodBadTrialThreshold"),t(f,"type","number"),t(f,"name","evaluation_GoodBadTrialThreshold"),t(f,"min",pe),t(f,"max",me),t(f,"step",.1),t(q,"for","feedback_YellowThreshold"),t(b,"type","number"),t(b,"name","feedback_YellowThreshold"),t(b,"min",pe),t(b,"max",me),t(b,"step",.1),t(H,"for","feedback_GreenThreshold"),t(v,"type","number"),t(v,"name","feedback_GreenThreshold"),t(v,"min",pe),t(v,"max",me),t(v,"step",.1),t(a,"class","settingsPage svelte-sijead")},m(d,n){Ye(d,a,n),e(a,u),e(u,s),e(s,g),e(a,I),e(a,P),e(P,k),e(a,y),e(a,T),e(T,B),e(B,O),e(T,Q),e(T,E),E.checked=r[2],e(a,R),e(a,D),e(D,i),e(i,x),e(D,$),e(D,M),M.checked=r[3],e(a,ee),e(a,N),e(N,Y),e(Y,te),e(N,ae),e(N,p),S(p,r[0]),e(a,ne),e(a,w),e(w,j),e(j,re),e(w,se),e(w,f),S(f,r[4]),e(a,le),e(a,V),e(V,q),e(q,oe),e(V,ue),e(V,b),S(b,r[5]),e(a,ie),e(a,U),e(U,H),e(H,de),e(U,he),e(U,v),S(v,r[6]),ce||(fe=[C(E,"change",r[7]),C(M,"change",r[8]),C(p,"input",r[9]),C(f,"input",r[10]),C(b,"input",r[11]),C(v,"input",r[12])],ce=!0)},p(d,[n]){n&4&&(E.checked=d[2]),n&8&&(M.checked=d[3]),n&2&&t(p,"step",d[1]),n&1&&A(p.value)!==d[0]&&S(p,d[0]),n&16&&A(f.value)!==d[4]&&S(f,d[4]),n&32&&A(b.value)!==d[5]&&S(b,d[5]),n&64&&A(v.value)!==d[6]&&S(v,d[6])},i:_e,o:_e,d(d){d&&h(a),ce=!1,je(fe)}}}const Ve=.1,Ue=120,Je=.1,Ke=5,pe=0,me=5;function We(r,a,u){let s,g,I,P,k,y;z(r,ye,i=>u(0,s=i)),z(r,Be,i=>u(2,g=i)),z(r,Me,i=>u(3,I=i)),z(r,Ge,i=>u(4,P=i)),z(r,Le,i=>u(5,k=i)),z(r,Se,i=>u(6,y=i));let T=.1;function B(){g=this.checked,Be.set(g)}function O(){I=this.checked,Me.set(I)}function Q(){s=A(this.value),ye.set(s)}function E(){P=A(this.value),Ge.set(P)}function R(){k=A(this.value),Le.set(k)}function D(){y=A(this.value),Se.set(y)}return r.$$.update=()=>{r.$$.dirty&1&&u(1,T=Math.round(10*Re(s,Ve,Ue,Je,Ke,!0))/10)},[s,T,g,I,P,k,y,B,O,Q,E,R,D]}class Xe extends Ae{constructor(a){super(),Ne(this,a,We,Fe,we,{})}}function Ze(r){let a,u;return a=new Xe({}),{c(){qe(a.$$.fragment)},l(s){He(a.$$.fragment,s)},m(s,g){Ce(a,s,g),u=!0},p:_e,i(s){u||(ze(a.$$.fragment,s),u=!0)},o(s){Oe(a.$$.fragment,s),u=!1},d(s){Qe(a,s)}}}class tt extends Ae{constructor(a){super(),Ne(this,a,null,Ze,we,{})}}export{tt as component};