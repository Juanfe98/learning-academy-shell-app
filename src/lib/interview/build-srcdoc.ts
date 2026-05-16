import { TEST_RUNNER_SRC } from "./test-runner-src";

// Lightweight test runner — no DOM or React deps, for node-ts challenges.
// NOTE: `not` must be a getter, not an eagerly-evaluated property — otherwise
// `mk(v, neg)` infinitely recurses building the `not` chain before any assertion runs.
const NODE_TEST_RUNNER_SRC = `(function(){
  var _r=[],_s="";
  function describe(l,fn){var p=_s;_s=l;try{fn();}catch(e){_r.push({description:l,pass:false,error:String(e&&e.message?e.message:e)});}_s=p;}
  function it(l,fn){var fl=_s?_s+" > "+l:l;try{fn();_r.push({description:fl,pass:true});}catch(e){_r.push({description:fl,pass:false,error:String(e&&e.message?e.message:e)});}}
  function expect(v){
    function mk(v,neg){
      return {
        get not(){return mk(v,!neg);},
        toBe:function(e){var p=v===e;if(neg)p=!p;if(!p)throw new Error("Expected "+JSON.stringify(v)+(neg?" not":"")+" to be "+JSON.stringify(e));},
        toEqual:function(e){var p=JSON.stringify(v)===JSON.stringify(e);if(neg)p=!p;if(!p)throw new Error("Expected "+JSON.stringify(v)+(neg?" not":"")+" to equal "+JSON.stringify(e));},
        toBeCloseTo:function(e,d){var dec=d!==undefined?d:2;var p=Math.abs(v-e)<Math.pow(10,-dec)/2;if(neg)p=!p;if(!p)throw new Error("Expected "+v+(neg?" not":"")+" to be close to "+e+" ("+dec+" decimals)");},
        toBeTruthy:function(){var p=!!v;if(neg)p=!p;if(!p)throw new Error("Expected "+JSON.stringify(v)+(neg?" not":"")+" to be truthy");},
        toBeFalsy:function(){var p=!v;if(neg)p=!p;if(!p)throw new Error("Expected "+JSON.stringify(v)+(neg?" not":"")+" to be falsy");},
        toBeGreaterThan:function(n){var p=v>n;if(neg)p=!p;if(!p)throw new Error("Expected "+v+(neg?" not":"")+" to be > "+n);},
        toBeLessThan:function(n){var p=v<n;if(neg)p=!p;if(!p)throw new Error("Expected "+v+(neg?" not":"")+" to be < "+n);},
        toContain:function(e){var p=Array.isArray(v)?v.indexOf(e)!==-1:String(v).indexOf(String(e))!==-1;if(neg)p=!p;if(!p)throw new Error("Expected "+JSON.stringify(v)+(neg?" not":"")+" to contain "+JSON.stringify(e));},
        toThrow:function(){var threw=false;try{v();}catch(e){threw=true;}var p=threw;if(neg)p=!p;if(!p)throw new Error("Expected function "+(neg?"not ":"")+"to throw");}
      };
    }
    return mk(v,false);
  }
  window.describe=describe;window.it=it;window.expect=expect;
  setTimeout(function(){window.parent.postMessage({type:"TEST_RESULTS",results:_r},"*");},50);
})();`;

export function buildNodeTestSrcdoc(bundledCode: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/></head><body><script>${NODE_TEST_RUNNER_SRC}</script><script>try{${bundledCode}}catch(e){window.parent.postMessage({type:"TEST_RESULTS",results:[{description:"Runtime error",pass:false,error:e&&e.message?e.message:String(e)}]},"*");}</script></body></html>`;
}

const PLAYGROUND_CONSOLE_SRC = `(function(){function _ser(x){if(typeof x==="string")return x;if(x===undefined)return"undefined";if(x===null)return"null";if(x instanceof Set){var a=[];x.forEach(function(v){a.push(_ser(v));});return"Set("+x.size+") {"+a.join(", ")+"}";}if(x instanceof Map){var b=[];x.forEach(function(v,k){b.push(_ser(k)+" => "+_ser(v));});return"Map("+x.size+") {"+b.join(", ")+"}";}try{return JSON.stringify(x,null,2);}catch(_){return String(x);}}["log","warn","error","info"].forEach(function(m){var o=console[m];console[m]=function(){var a=Array.prototype.slice.call(arguments).map(_ser);o.apply(console,arguments);window.parent.postMessage({type:"PLAYGROUND_CONSOLE",method:m,args:a,timestamp:Date.now()},"*");};});window.addEventListener("error",function(e){window.parent.postMessage({type:"PLAYGROUND_CONSOLE",method:"error",args:[e.error&&e.error.message?e.error.message:String(e.message)],timestamp:Date.now()},"*");});window.addEventListener("unhandledrejection",function(e){var msg=e.reason&&e.reason.message?e.reason.message:String(e.reason);window.parent.postMessage({type:"PLAYGROUND_CONSOLE",method:"error",args:["Unhandled rejection: "+msg],timestamp:Date.now()},"*");});})();`;

// buildBundle() in bundler.ts handles mount — no separate mount snippet needed.

export function buildPlaygroundSrcdoc(transpiledCode: string, css?: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>*{box-sizing:border-box}body{margin:0;padding:12px;font-family:system-ui,sans-serif;background:#fff;color:#111}${css ?? ""}</style>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script>${PLAYGROUND_CONSOLE_SRC}</script>
</head>
<body>
<div id="root"></div>
<script>
try{
${transpiledCode}
}catch(e){document.getElementById("root").innerHTML='<div style="padding:12px;font-family:monospace;color:#ef4444;font-size:12px">'+(e&&e.message?e.message:String(e))+"</div>";}
</script>
</body>
</html>`;
}

export function buildSrcdoc(transpiledCode: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
</head>
<body>
<script>
${TEST_RUNNER_SRC}
</script>
<script>
(function() {
try {
${transpiledCode}
} catch(e) {
  window.parent.postMessage({ type: "TRANSPILE_ERROR", message: String(e && e.message ? e.message : e) }, "*");
}
})();
</script>
</body>
</html>`;
}

const CONSOLE_CAPTURE_SRC = `
(function() {
  function _ser(a) {
    if (a === undefined) return "undefined";
    if (a === null) return "null";
    if (typeof a === "string") return a;
    if (a instanceof Set) {
      var items = [];
      a.forEach(function(v) { items.push(_ser(v)); });
      return "Set(" + a.size + ") {" + items.join(", ") + "}";
    }
    if (a instanceof Map) {
      var entries = [];
      a.forEach(function(v, k) { entries.push(_ser(k) + " => " + _ser(v)); });
      return "Map(" + a.size + ") {" + entries.join(", ") + "}";
    }
    try { return typeof a === "object" ? JSON.stringify(a, null, 2) : String(a); }
    catch(e) { return "[Circular]"; }
  }
  var _orig = {};
  ["log","warn","error","info"].forEach(function(m) {
    _orig[m] = console[m].bind(console);
    console[m] = function() {
      var args = Array.prototype.slice.call(arguments).map(_ser);
      window.parent.postMessage({ type: "CONSOLE_OUTPUT", level: m, args: args }, "*");
      _orig[m].apply(console, arguments);
    };
  });
  window.onerror = function(msg, src, line, col, err) {
    window.parent.postMessage({ type: "CONSOLE_OUTPUT", level: "error", args: [err ? err.message : String(msg)] }, "*");
    return true;
  };
  window.addEventListener("unhandledrejection", function(e) {
    var msg = e.reason && e.reason.message ? e.reason.message : String(e.reason);
    window.parent.postMessage({ type: "CONSOLE_OUTPUT", level: "error", args: ["Unhandled rejection: " + msg] }, "*");
  });
})();
`;

export function buildPreviewSrcdoc(transpiledCode: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    *{box-sizing:border-box}
    body{margin:0;padding:12px;font-family:system-ui,sans-serif;background:#fff;color:#111}
    code{background:#f0f0f0;padding:2px 5px;border-radius:3px;font-size:0.9em}
  </style>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
</head>
<body>
<div id="root"></div>
<script>
(function() {
try {
${transpiledCode}
} catch(e) {
  document.getElementById("root").innerHTML = '<div style="padding:12px;font-family:monospace;color:#ef4444;font-size:12px">' + (e && e.message ? e.message : String(e)) + "</div>";
}
})();
</script>
</body>
</html>`;
}

export function buildExecSrcdoc(transpiledCode: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body>
<script>${CONSOLE_CAPTURE_SRC}</script>
<script>
(function() {
try {
${transpiledCode}
} catch(e) {
  window.parent.postMessage({ type: "CONSOLE_OUTPUT", level: "error", args: [e.message || String(e)] }, "*");
}
window.parent.postMessage({ type: "EXEC_DONE" }, "*");
})();
</script>
</body>
</html>`;
}
