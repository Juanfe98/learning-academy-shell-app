import type { FileMap } from "./file-tree";
import { normalizePath } from "./file-tree";

export interface BundleResult {
  bundle: string;
  css: string;
  error?: string;
}

const BUILTINS: Record<string, string> = {
  react: "window.React",
  "react-dom": "window.ReactDOM",
  "react-dom/client": "window.ReactDOM",
  "react/jsx-runtime": `{jsx:window.React.createElement,jsxs:window.React.createElement,Fragment:window.React.Fragment}`,
  "react/jsx-dev-runtime": `{jsxDEV:window.React.createElement,Fragment:window.React.Fragment}`,
};

function buildResolverFn(): string {
  return `
function __resolve(id,from){
  var fromDir=from.lastIndexOf("/")>0?from.substring(0,from.lastIndexOf("/")):"." ;
  var raw=fromDir+"/"+id;
  var parts=raw.split("/"),stack=[];
  for(var i=0;i<parts.length;i++){
    var p=parts[i];
    if(p===""||p===".")continue;
    if(p==="..")stack.pop();
    else stack.push(p);
  }
  var base="./"+stack.join("/");
  var exts=["",".jsx",".js",".tsx",".ts","/index.jsx","/index.js","/index.tsx","/index.ts"];
  for(var e=0;e<exts.length;e++){if(__m[base+exts[e]])return base+exts[e];}
  return null;
}`;
}

function buildRequireFn(): string {
  return `
function __req(id,from){
  ${Object.entries(BUILTINS).map(([k, v]) => `if(id===${JSON.stringify(k)})return ${v};`).join("")}
  var r=__resolve(id,from||".");
  if(!r)throw new Error("Module not found: "+JSON.stringify(id)+(from?" (from "+from+")":""));
  if(__c[r])return __c[r].exports;
  var mod={exports:{}};__c[r]=mod;
  var _from=r;
  __m[r](mod,mod.exports,function(i){return __req(i,_from);});
  return mod.exports;
}`;
}

export async function buildBundle(
  fileMap: FileMap,
  entryPath: string,
  environment: "react-js" | "react-ts" | "node-ts" = "react-js"
): Promise<BundleResult> {
  const Babel = await import("@babel/standalone");

  const transpiled: Record<string, string> = {};
  const cssPaths: string[] = [];
  let css = "";

  for (const [path, entry] of Object.entries(fileMap)) {
    if (entry.language === "css") {
      css += entry.content + "\n";
      cssPaths.push(path);
      continue;
    }
    try {
      const ext = path.split(".").pop() ?? "";
      // Presets run in reverse array order. TypeScript must strip types first,
      // then React transforms JSX, then env compiles to CommonJS.
      const presets: (string | [string, object])[] = [
        ["env", { targets: { browsers: "last 2 versions" }, modules: "commonjs" }],
      ];
      if (ext === "tsx" || ext === "jsx") presets.push("react");
      if (ext === "ts" || ext === "tsx") presets.push("typescript");

      const result = Babel.transform(entry.content, {
        presets,
        filename: path.replace(/^\.\//, ""),
      });
      transpiled[path] = result.code ?? "";
    } catch (err) {
      return {
        bundle: "",
        css,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // Normalise entry path to match FileMap keys (./App.jsx etc.)
  const normalizedEntry = entryPath.startsWith("./") ? entryPath : "./" + entryPath;

  let bundle = `var __m={};var __c={};${buildResolverFn()}${buildRequireFn()}\n`;

  // CSS files are injected into <style> by the srcdoc builder.
  // Register them as empty no-op modules so `import "./styles.css"` doesn't throw.
  for (const cssPath of cssPaths) {
    bundle += `__m[${JSON.stringify(cssPath)}]=function(module,exports,require){};\n`;
  }

  for (const [path, code] of Object.entries(transpiled)) {
    bundle +=
      `__m[${JSON.stringify(path)}]=function(module,exports,require){\n` +
      `var React=window.React;var ReactDOM=window.ReactDOM;\n` +
      code +
      `\n};\n`;
  }

  if (environment === "node-ts") {
    bundle += `
try{
  __req(${JSON.stringify(normalizedEntry)},".");
} catch(e) {
  var _msg=e&&e.message?e.message:String(e);
  window.parent&&window.parent.postMessage({type:"PLAYGROUND_CONSOLE",method:"error",args:[_msg],timestamp:Date.now()},"*");
}
`;
  } else {
    bundle += `
try{
  var __entry=__req(${JSON.stringify(normalizedEntry)},".");
  var App=(__entry&&__entry.default)||__entry;
  if(typeof App==="function"){
    ReactDOM.createRoot(document.getElementById("root")).render(React.createElement(App));
  } else {
    document.getElementById("root").innerHTML='<div style="padding:12px;font-family:sans-serif;color:#888;font-size:13px">Export an <code style="background:#f0f0f0;padding:2px 4px;border-radius:3px">App</code> component as default export</div>';
  }
} catch(e) {
  var _msg=e&&e.message?e.message:String(e);
  document.getElementById("root").innerHTML='<div style="padding:12px;font-family:monospace;color:#ef4444;font-size:12px">'+_msg+"</div>";
  window.parent&&window.parent.postMessage({type:"PLAYGROUND_CONSOLE",method:"error",args:[_msg],timestamp:Date.now()},"*");
}
`;
  }

  return { bundle, css };
}

// Synchronous path validation for tests — does not transpile
export { normalizePath };
