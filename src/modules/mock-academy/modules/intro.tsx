import type { TocItem } from "@/lib/types/academy";

export const toc: TocItem[] = [
  { id: "what-is-the-web", title: "What is the Web?", level: 2 },
  { id: "how-it-works", title: "How It Works", level: 2 },
  { id: "key-protocols", title: "Key Protocols", level: 2 },
  { id: "anatomy-of-a-url", title: "Anatomy of a URL", level: 3 },
  { id: "key-takeaways", title: "Key Takeaways", level: 2 },
];

export default function IntroToWeb() {
  return (
    <div className="article-content">
      <p>
        The web is one of humanity&apos;s most consequential inventions — a global system
        of interlinked hypertext documents that runs on top of the internet. Understanding
        how it works at a fundamental level makes you a better engineer, no matter what
        layer of the stack you work in.
      </p>

      <h2 id="what-is-the-web">What is the Web?</h2>

      <p>
        The <strong>World Wide Web</strong> (WWW) is an information system built on top of
        the internet. The internet is the underlying network infrastructure — cables, routers,
        and protocols that move data between machines. The web is one of many services that
        runs on top of it, alongside email (SMTP), file transfer (FTP), and more.
      </p>

      <p>
        Tim Berners-Lee invented the web in 1989 while at CERN. His original proposal
        combined three ideas that remain central today:
      </p>

      <ul>
        <li><strong>HTML</strong> — a language for structuring content</li>
        <li><strong>HTTP</strong> — a protocol for transferring content between machines</li>
        <li><strong>URLs</strong> — a universal addressing scheme to identify resources</li>
      </ul>

      <p>
        Every webpage you visit is simply a document retrieved over HTTP, parsed by your
        browser, and rendered on screen.
      </p>

      <h2 id="how-it-works">How It Works</h2>

      <p>
        When you type <code>https://example.com</code> into a browser, a chain of events
        unfolds in milliseconds:
      </p>

      <ol>
        <li>
          <strong>DNS resolution</strong> — the browser asks a DNS server to translate
          <code> example.com</code> into an IP address (e.g. <code>93.184.216.34</code>)
        </li>
        <li>
          <strong>TCP connection</strong> — the browser opens a reliable connection to
          that IP address on port 443
        </li>
        <li>
          <strong>TLS handshake</strong> — for HTTPS, the browser and server negotiate
          encryption keys before any data flows
        </li>
        <li>
          <strong>HTTP request</strong> — the browser sends{" "}
          <code>GET / HTTP/1.1</code> (or HTTP/2, HTTP/3)
        </li>
        <li>
          <strong>HTTP response</strong> — the server returns an HTML document with a
          200 status code
        </li>
        <li>
          <strong>Rendering</strong> — the browser parses HTML, fetches referenced CSS
          and JS, and paints pixels to the screen
        </li>
      </ol>

      <p>
        This entire round trip typically completes in under 200ms for servers with good
        infrastructure and users on fast connections.
      </p>

      <h2 id="key-protocols">Key Protocols</h2>

      <p>
        <strong>HTTP (HyperText Transfer Protocol)</strong> is the language browsers and
        servers use to communicate. An HTTP request is plain text:
      </p>

      <pre>
        <code>{`GET /index.html HTTP/1.1
Host: example.com
Accept: text/html`}</code>
      </pre>

      <p>
        The server responds with a status code, headers, and a body:
      </p>

      <pre>
        <code>{`HTTP/1.1 200 OK
Content-Type: text/html; charset=utf-8
Content-Length: 1256

<!DOCTYPE html>
<html>...</html>`}</code>
      </pre>

      <p>
        <strong>HTTPS</strong> wraps HTTP inside a TLS layer. The content is encrypted in
        transit, preventing eavesdroppers from reading or modifying it. Today,{" "}
        <strong>all production web traffic should use HTTPS</strong>. Browsers actively
        warn users when sites don&apos;t.
      </p>

      <h3 id="anatomy-of-a-url">Anatomy of a URL</h3>

      <p>
        A URL (Uniform Resource Locator) has several distinct parts. Take{" "}
        <code>https://api.example.com:8080/users?id=42#profile</code>:
      </p>

      <ul>
        <li><code>https</code> — the <strong>scheme</strong> (protocol)</li>
        <li><code>api.example.com</code> — the <strong>host</strong> (domain)</li>
        <li><code>:8080</code> — the <strong>port</strong> (omitted if using the default: 80 for HTTP, 443 for HTTPS)</li>
        <li><code>/users</code> — the <strong>path</strong> (the resource)</li>
        <li><code>?id=42</code> — the <strong>query string</strong> (parameters)</li>
        <li><code>#profile</code> — the <strong>fragment</strong> (in-page anchor, never sent to the server)</li>
      </ul>

      <h2 id="key-takeaways">Key Takeaways</h2>

      <ul>
        <li>The web is built on three primitives: HTML, HTTP, and URLs</li>
        <li>Every browser request triggers DNS lookup → TCP connection → TLS handshake → HTTP exchange</li>
        <li>HTTP is a stateless request-response protocol; HTTPS adds encryption via TLS</li>
        <li>URLs have six components: scheme, host, port, path, query, and fragment</li>
        <li>The fragment (<code>#...</code>) is client-only — it never reaches the server</li>
      </ul>

      <p>
        In the next module we&apos;ll look at <strong>HTML Structure</strong> — how to
        write well-formed, semantic markup that browsers (and search engines) can
        understand.
      </p>
    </div>
  );
}
