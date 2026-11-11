#!/usr/bin/env python3
"""自部署的小页面服务（参照 claude.ai Artifact）：
  /                       -> 默认页面（sites/<DEFAULT>/）
  /p/<page>/...           -> 静态页面 sites/<page>/...
  /api/<page>/<coll>      -> 每个页面自己的数据（JSON 文档）：GET 列表，POST 新建
  /api/<page>/<coll>/<id> -> GET / PUT（整条替换）/ DELETE
数据接口要带口令：请求头 Authorization: Bearer <token>（口令在 /opt/pages/token）。
页面本身谁都能打开。80 端口只做证书验证和跳转 HTTPS。只用 Python 标准库。"""
import json, os, re, sqlite3, ssl, sys, threading, time, uuid, mimetypes, hmac
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlsplit, unquote

ROOT = os.environ.get('PAGES_ROOT', '/opt/pages')
SITES = os.path.join(ROOT, 'sites')
ACME = os.path.join(ROOT, 'acme')
DB = os.path.join(ROOT, 'data', 'pages.db')
DEFAULT = os.environ.get('PAGES_DEFAULT', 'game')
HOST = os.environ.get('PAGES_HOST', '176.122.144.145')
HTTPS_PORT = int(os.environ.get('PAGES_HTTPS_PORT', '8443'))
CERT = os.path.join(ROOT, 'letsencrypt', 'live', HOST)
TOKEN = open(os.path.join(ROOT, 'token')).read().strip()
MAX_BODY = 512 * 1024
NAME = re.compile(r'^[a-z0-9][a-z0-9_-]{0,63}$')

_db_lock = threading.Lock()
def db():
    c = sqlite3.connect(DB, timeout=10)
    c.execute('create table if not exists docs (page text, coll text, id text, data text, created real, updated real, primary key (page, coll, id))')
    return c

class H(BaseHTTPRequestHandler):
    server_version = 'pages/1'
    protocol_version = 'HTTP/1.1'  # 长连接：离得远，每次重新握手要 2 秒
    def log_message(self, fmt, *a):
        sys.stderr.write('%s %s\n' % (self.address_string(), fmt % a))

    def send(self, code, body=b'', ctype='application/json; charset=utf-8', extra=None):
        if isinstance(body, (dict, list)): body = json.dumps(body, ensure_ascii=False).encode()
        elif isinstance(body, str): body = body.encode()
        self.send_response(code)
        self.send_header('Content-Type', ctype)
        self.send_header('Content-Length', str(len(body)))
        for k, v in (extra or {}).items(): self.send_header(k, v)
        self.end_headers()
        if self.command != 'HEAD': self.wfile.write(body)

    def authed(self):
        a = self.headers.get('Authorization', '')
        return a.startswith('Bearer ') and hmac.compare_digest(a[7:].strip(), TOKEN)

    # ---------- 静态文件 ----------
    def static(self, page, rest):
        base = os.path.realpath(os.path.join(SITES, page))
        if not NAME.match(page) or not os.path.isdir(base): return self.send(404, '没有这个页面', 'text/plain; charset=utf-8')
        f = os.path.realpath(os.path.join(base, rest or 'index.html'))
        if not (f == base or f.startswith(base + os.sep)): return self.send(403, 'forbidden', 'text/plain')
        if os.path.isdir(f): f = os.path.join(f, 'index.html')
        if not os.path.isfile(f): return self.send(404, 'not found', 'text/plain')
        ctype = mimetypes.guess_type(f)[0] or 'application/octet-stream'
        if ctype.startswith('text/') or ctype in ('application/javascript', 'application/json'): ctype += '; charset=utf-8'
        with open(f, 'rb') as fh: body = fh.read()
        self.send(200, body, ctype, {'Cache-Control': 'no-cache'})

    # ---------- 数据接口 ----------
    def api(self, parts):
        if not self.authed(): return self.send(401, {'error': 'need token'})
        if len(parts) not in (2, 3) or not all(NAME.match(p) or (i == 2 and re.match(r'^[A-Za-z0-9_-]{1,64}$', p)) for i, p in enumerate(parts)):
            return self.send(400, {'error': 'bad path'})
        page, coll = parts[0], parts[1]; did = parts[2] if len(parts) == 3 else None
        body = None
        if self.command in ('POST', 'PUT'):
            n = int(self.headers.get('Content-Length') or 0)
            if n > MAX_BODY: return self.send(413, {'error': 'too large'})
            try: body = json.loads(self.rfile.read(n) or b'null')
            except Exception: return self.send(400, {'error': 'bad json'})
        now = time.time()
        with _db_lock:
            c = db()
            try:
                if self.command == 'GET' and did is None:
                    rows = c.execute('select id, data, created, updated from docs where page=? and coll=? order by created', (page, coll)).fetchall()
                    return self.send(200, [{'id': r[0], 'data': json.loads(r[1]), 'created': r[2], 'updated': r[3]} for r in rows])
                if self.command == 'GET':
                    r = c.execute('select data, created, updated from docs where page=? and coll=? and id=?', (page, coll, did)).fetchone()
                    return self.send(200, {'id': did, 'data': json.loads(r[0]), 'created': r[1], 'updated': r[2]}) if r else self.send(404, {'error': 'not found'})
                if self.command == 'POST' and did is None:
                    nid = uuid.uuid4().hex[:12]
                    c.execute('insert into docs values (?,?,?,?,?,?)', (page, coll, nid, json.dumps(body, ensure_ascii=False), now, now)); c.commit()
                    return self.send(201, {'id': nid, 'data': body, 'created': now, 'updated': now})
                if self.command == 'PUT' and did:
                    old = c.execute('select created from docs where page=? and coll=? and id=?', (page, coll, did)).fetchone()
                    c.execute('insert or replace into docs values (?,?,?,?,?,?)', (page, coll, did, json.dumps(body, ensure_ascii=False), old[0] if old else now, now)); c.commit()
                    return self.send(200, {'id': did, 'data': body})
                if self.command == 'DELETE' and did:
                    c.execute('delete from docs where page=? and coll=? and id=?', (page, coll, did)); c.commit()
                    return self.send(200, {'ok': True})
                return self.send(405, {'error': 'method'})
            finally:
                c.close()

    def route(self):
        path = unquote(urlsplit(self.path).path)
        if path.startswith('/api/'): return self.api([p for p in path[5:].split('/') if p])
        if self.command not in ('GET', 'HEAD'): return self.send(405, {'error': 'method'})
        if path in ('/', ''): return self.static(DEFAULT, '')
        m = re.match(r'^/p/([^/]+)(/.*)?$', path)
        if m:
            if m.group(2) is None: return self.send(301, '', 'text/plain', {'Location': path + '/'})
            return self.static(m.group(1), m.group(2).lstrip('/'))
        return self.static(DEFAULT, path.lstrip('/'))

    do_GET = do_HEAD = do_POST = do_PUT = do_DELETE = lambda self: self.route()

class Plain(BaseHTTPRequestHandler):  # 80 端口：证书验证 + 跳转 HTTPS
    def log_message(self, *a): pass
    def do_GET(self):
        p = urlsplit(self.path).path
        if p.startswith('/.well-known/acme-challenge/'):
            f = os.path.realpath(os.path.join(ACME, p.lstrip('/')))
            if f.startswith(os.path.realpath(ACME) + os.sep) and os.path.isfile(f):
                b = open(f, 'rb').read(); self.send_response(200); self.send_header('Content-Type', 'text/plain'); self.send_header('Content-Length', str(len(b))); self.end_headers(); self.wfile.write(b); return
            self.send_response(404); self.end_headers(); return
        self.send_response(308); self.send_header('Location', 'https://%s:%d%s' % (HOST, HTTPS_PORT, self.path)); self.send_header('Content-Length', '0'); self.end_headers()
    do_HEAD = do_GET

def main():
    os.makedirs(os.path.dirname(DB), exist_ok=True); db().close()
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER); fc, pk = os.path.join(CERT, 'fullchain.pem'), os.path.join(CERT, 'privkey.pem'); ctx.load_cert_chain(fc, pk)
    def reload_cert():  # 证书 6 天一换：每 10 分钟看一眼文件，换了就热加载（之后的新连接用新证书），不用重启
        last = os.path.getmtime(os.path.realpath(fc))
        while True:
            time.sleep(600)
            try:
                m = os.path.getmtime(os.path.realpath(fc))
                if m != last: ctx.load_cert_chain(fc, pk); last = m; print('cert reloaded', flush=True)
            except Exception as e: print('cert reload failed:', e, flush=True)
    threading.Thread(target=reload_cert, daemon=True).start()
    ThreadingHTTPServer.daemon_threads = True
    https = ThreadingHTTPServer(('0.0.0.0', HTTPS_PORT), H); https.socket = ctx.wrap_socket(https.socket, server_side=True, do_handshake_on_connect=False)  # 握手放到处理线程里，慢客户端不会卡住 accept
    http = ThreadingHTTPServer(('0.0.0.0', int(os.environ.get('PAGES_HTTP_PORT', '80'))), Plain)
    threading.Thread(target=http.serve_forever, daemon=True).start()
    print('pages on https://%s:%d' % (HOST, HTTPS_PORT), flush=True)
    https.serve_forever()

if __name__ == '__main__':
    main()
