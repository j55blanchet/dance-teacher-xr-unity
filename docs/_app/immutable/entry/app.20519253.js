import{S as C,i as q,s as U,a as j,e as d,c as z,b as g,d as h,f as L,g as p,h as w,j as W,o as F,k as G,l as H,m as J,n as y,p as m,q as K,r as M,u as Q,v as P,t as X,w as T,x as E,y as v,z as A,A as R,B as I}from"../chunks/index.63361c4d.js";const Y="modulepreload",Z=function(a,e){return new URL(a,e).href},D={},k=function(e,n,i){if(!n||n.length===0)return e();const s=document.getElementsByTagName("link");return Promise.all(n.map(f=>{if(f=Z(f,i),f in D)return;D[f]=!0;const t=f.endsWith(".css"),r=t?'[rel="stylesheet"]':"";if(!!i)for(let l=s.length-1;l>=0;l--){const u=s[l];if(u.href===f&&(!t||u.rel==="stylesheet"))return}else if(document.querySelector(`link[href="${f}"]${r}`))return;const o=document.createElement("link");if(o.rel=t?"stylesheet":Y,t||(o.as="script",o.crossOrigin=""),o.href=f,document.head.appendChild(o),t)return new Promise((l,u)=>{o.addEventListener("load",l),o.addEventListener("error",()=>u(new Error(`Unable to preload CSS for ${f}`)))})})).then(()=>e()).catch(f=>{const t=new Event("vite:preloadError",{cancelable:!0});if(t.payload=f,window.dispatchEvent(t),!t.defaultPrevented)throw f})},se={};function $(a){let e,n,i;var s=a[1][0];function f(t){return{props:{data:t[3],form:t[2]}}}return s&&(e=E(s,f(a)),a[12](e)),{c(){e&&v(e.$$.fragment),n=d()},l(t){e&&A(e.$$.fragment,t),n=d()},m(t,r){e&&R(e,t,r),g(t,n,r),i=!0},p(t,r){const _={};if(r&8&&(_.data=t[3]),r&4&&(_.form=t[2]),r&2&&s!==(s=t[1][0])){if(e){P();const o=e;h(o.$$.fragment,1,0,()=>{I(o,1)}),L()}s?(e=E(s,f(t)),t[12](e),v(e.$$.fragment),p(e.$$.fragment,1),R(e,n.parentNode,n)):e=null}else s&&e.$set(_)},i(t){i||(e&&p(e.$$.fragment,t),i=!0)},o(t){e&&h(e.$$.fragment,t),i=!1},d(t){a[12](null),t&&w(n),e&&I(e,t)}}}function x(a){let e,n,i;var s=a[1][0];function f(t){return{props:{data:t[3],$$slots:{default:[ee]},$$scope:{ctx:t}}}}return s&&(e=E(s,f(a)),a[11](e)),{c(){e&&v(e.$$.fragment),n=d()},l(t){e&&A(e.$$.fragment,t),n=d()},m(t,r){e&&R(e,t,r),g(t,n,r),i=!0},p(t,r){const _={};if(r&8&&(_.data=t[3]),r&8215&&(_.$$scope={dirty:r,ctx:t}),r&2&&s!==(s=t[1][0])){if(e){P();const o=e;h(o.$$.fragment,1,0,()=>{I(o,1)}),L()}s?(e=E(s,f(t)),t[11](e),v(e.$$.fragment),p(e.$$.fragment,1),R(e,n.parentNode,n)):e=null}else s&&e.$set(_)},i(t){i||(e&&p(e.$$.fragment,t),i=!0)},o(t){e&&h(e.$$.fragment,t),i=!1},d(t){a[11](null),t&&w(n),e&&I(e,t)}}}function ee(a){let e,n,i;var s=a[1][1];function f(t){return{props:{data:t[4],form:t[2]}}}return s&&(e=E(s,f(a)),a[10](e)),{c(){e&&v(e.$$.fragment),n=d()},l(t){e&&A(e.$$.fragment,t),n=d()},m(t,r){e&&R(e,t,r),g(t,n,r),i=!0},p(t,r){const _={};if(r&16&&(_.data=t[4]),r&4&&(_.form=t[2]),r&2&&s!==(s=t[1][1])){if(e){P();const o=e;h(o.$$.fragment,1,0,()=>{I(o,1)}),L()}s?(e=E(s,f(t)),t[10](e),v(e.$$.fragment),p(e.$$.fragment,1),R(e,n.parentNode,n)):e=null}else s&&e.$set(_)},i(t){i||(e&&p(e.$$.fragment,t),i=!0)},o(t){e&&h(e.$$.fragment,t),i=!1},d(t){a[10](null),t&&w(n),e&&I(e,t)}}}function N(a){let e,n=a[6]&&O(a);return{c(){e=G("div"),n&&n.c(),this.h()},l(i){e=H(i,"DIV",{id:!0,"aria-live":!0,"aria-atomic":!0,style:!0});var s=J(e);n&&n.l(s),s.forEach(w),this.h()},h(){y(e,"id","svelte-announcer"),y(e,"aria-live","assertive"),y(e,"aria-atomic","true"),m(e,"position","absolute"),m(e,"left","0"),m(e,"top","0"),m(e,"clip","rect(0 0 0 0)"),m(e,"clip-path","inset(50%)"),m(e,"overflow","hidden"),m(e,"white-space","nowrap"),m(e,"width","1px"),m(e,"height","1px")},m(i,s){g(i,e,s),n&&n.m(e,null)},p(i,s){i[6]?n?n.p(i,s):(n=O(i),n.c(),n.m(e,null)):n&&(n.d(1),n=null)},d(i){i&&w(e),n&&n.d()}}}function O(a){let e;return{c(){e=K(a[7])},l(n){e=M(n,a[7])},m(n,i){g(n,e,i)},p(n,i){i&128&&Q(e,n[7])},d(n){n&&w(e)}}}function te(a){let e,n,i,s,f;const t=[x,$],r=[];function _(l,u){return l[1][1]?0:1}e=_(a),n=r[e]=t[e](a);let o=a[5]&&N(a);return{c(){n.c(),i=j(),o&&o.c(),s=d()},l(l){n.l(l),i=z(l),o&&o.l(l),s=d()},m(l,u){r[e].m(l,u),g(l,i,u),o&&o.m(l,u),g(l,s,u),f=!0},p(l,[u]){let b=e;e=_(l),e===b?r[e].p(l,u):(P(),h(r[b],1,1,()=>{r[b]=null}),L(),n=r[e],n?n.p(l,u):(n=r[e]=t[e](l),n.c()),p(n,1),n.m(i.parentNode,i)),l[5]?o?o.p(l,u):(o=N(l),o.c(),o.m(s.parentNode,s)):o&&(o.d(1),o=null)},i(l){f||(p(n),f=!0)},o(l){h(n),f=!1},d(l){r[e].d(l),l&&w(i),o&&o.d(l),l&&w(s)}}}function ne(a,e,n){let{stores:i}=e,{page:s}=e,{constructors:f}=e,{components:t=[]}=e,{form:r}=e,{data_0:_=null}=e,{data_1:o=null}=e;W(i.page.notify);let l=!1,u=!1,b=null;F(()=>{const c=i.page.subscribe(()=>{l&&(n(6,u=!0),X().then(()=>{n(7,b=document.title||"untitled page")}))});return n(5,l=!0),c});function V(c){T[c?"unshift":"push"](()=>{t[1]=c,n(0,t)})}function S(c){T[c?"unshift":"push"](()=>{t[0]=c,n(0,t)})}function B(c){T[c?"unshift":"push"](()=>{t[0]=c,n(0,t)})}return a.$$set=c=>{"stores"in c&&n(8,i=c.stores),"page"in c&&n(9,s=c.page),"constructors"in c&&n(1,f=c.constructors),"components"in c&&n(0,t=c.components),"form"in c&&n(2,r=c.form),"data_0"in c&&n(3,_=c.data_0),"data_1"in c&&n(4,o=c.data_1)},a.$$.update=()=>{a.$$.dirty&768&&i.page.set(s)},[t,f,r,_,o,l,u,b,i,s,V,S,B]}class re extends C{constructor(e){super(),q(this,e,ne,te,U,{stores:8,page:9,constructors:1,components:0,form:2,data_0:3,data_1:4})}}const oe=[()=>k(()=>import("../nodes/0.73c13985.js"),["../nodes/0.73c13985.js","../chunks/index.63361c4d.js","../chunks/mediapipe-utils.7a327831.js","../chunks/VirtualMirror.svelte_svelte_type_style_lang.c4235c89.js","../chunks/index.04079824.js","../chunks/control.f5b05b5f.js","../chunks/index.0f0bec89.js","../assets/VirtualMirror.62b38448.css","../assets/0.c47bc17b.css","../assets/SketchButton.4076af0e.css"],import.meta.url),()=>k(()=>import("../nodes/1.be242e4b.js"),["../nodes/1.be242e4b.js","../chunks/index.63361c4d.js","../chunks/stores.c3cac2de.js","../chunks/singletons.606eb2c7.js","../chunks/index.0f0bec89.js"],import.meta.url),()=>k(()=>import("../nodes/2.079d50cb.js"),["../nodes/2.079d50cb.js","../chunks/index.63361c4d.js","../chunks/dances-store.8daf6854.js","../chunks/mediapipe-utils.7a327831.js","../assets/2.5a93e16e.css"],import.meta.url),()=>k(()=>import("../nodes/3.5d934bd5.js"),["../nodes/3.5d934bd5.js","../chunks/index.63361c4d.js","../chunks/settings.f2d99c93.js","../chunks/index.0f0bec89.js","../chunks/math.c86fcf30.js","../assets/3.5fcf6812.css"],import.meta.url),()=>k(()=>import("../nodes/4.e4bf405c.js"),["../nodes/4.e4bf405c.js","../chunks/index.04079824.js","../chunks/control.f5b05b5f.js","../chunks/dances-store.8daf6854.js","../chunks/mediapipe-utils.7a327831.js","../chunks/index.63361c4d.js","../chunks/VideoWithSkeleton.2819482f.js","../chunks/singletons.606eb2c7.js","../chunks/index.0f0bec89.js","../assets/VideoWithSkeleton.b190af48.css","../chunks/stores.c3cac2de.js","../chunks/settings.f2d99c93.js","../assets/4.b4f9d144.css","../assets/SketchButton.4076af0e.css"],import.meta.url),()=>k(()=>import("../nodes/5.5ae3d111.js"),["../nodes/5.5ae3d111.js","../chunks/index.04079824.js","../chunks/control.f5b05b5f.js","../chunks/dances-store.8daf6854.js","../chunks/mediapipe-utils.7a327831.js","../chunks/index.63361c4d.js","../chunks/VideoWithSkeleton.2819482f.js","../chunks/singletons.606eb2c7.js","../chunks/index.0f0bec89.js","../assets/VideoWithSkeleton.b190af48.css","../chunks/settings.f2d99c93.js","../chunks/math.c86fcf30.js","../chunks/VirtualMirror.svelte_svelte_type_style_lang.c4235c89.js","../assets/VirtualMirror.62b38448.css","../assets/5.32ce12b9.css"],import.meta.url)],ae=[],le={"/":[2],"/settings":[3],"/teachlesson/[danceTreeId]":[4],"/teachlesson/[danceTreeId]/practicenode/[practiceNodeId]":[5]},fe={handleError:({error:a})=>{console.error(a)}};export{le as dictionary,fe as hooks,se as matchers,oe as nodes,re as root,ae as server_loads};