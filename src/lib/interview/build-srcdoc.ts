import { TEST_RUNNER_SRC } from "./test-runner-src";

const PLAYGROUND_CONSOLE_SRC = `(function(){["log","warn","error","info"].forEach(function(m){var o=console[m];console[m]=function(){var a=Array.prototype.slice.call(arguments).map(function(x){try{return typeof x==="string"?x:JSON.stringify(x,null,2);}catch(_){return String(x);}});o.apply(console,arguments);window.parent.postMessage({type:"PLAYGROUND_CONSOLE",method:m,args:a,timestamp:Date.now()},"*");};});window.addEventListener("error",function(e){window.parent.postMessage({type:"PLAYGROUND_CONSOLE",method:"error",args:[e.error&&e.error.message?e.error.message:String(e.message)],timestamp:Date.now()},"*");});window.addEventListener("unhandledrejection",function(e){var msg=e.reason&&e.reason.message?e.reason.message:String(e.reason);window.parent.postMessage({type:"PLAYGROUND_CONSOLE",method:"error",args:["Unhandled rejection: "+msg],timestamp:Date.now()},"*");});})();`;

// Appended to user source BEFORE transpilation so it runs inside the UMD factory closure
// where App is in scope. Do NOT inject this after transpilation.
export const PLAYGROUND_MOUNT_SRC = `
;(function(){
  var _c=typeof App!=="undefined"?App:typeof Demo!=="undefined"?Demo:null;
  if(_c){ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(_c));}
  else{document.getElementById("root").innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:80px;font-family:sans-serif;color:#888;font-size:13px">Export an <code style="margin:0 4px;background:#f0f0f0;padding:2px 5px;border-radius:3px">App</code> component to see the preview</div>';}
})();`;

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
  var _orig = {};
  ["log","warn","error","info"].forEach(function(m) {
    _orig[m] = console[m].bind(console);
    console[m] = function() {
      var args = Array.prototype.slice.call(arguments).map(function(a) {
        if (a === undefined) return "undefined";
        if (a === null) return "null";
        try { return typeof a === "object" ? JSON.stringify(a, null, 2) : String(a); }
        catch(e) { return "[Circular]"; }
      });
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
