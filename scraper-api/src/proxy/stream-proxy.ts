import http from 'http';
import httpProxy from 'http-proxy';
import { Request, Response } from 'express';

const proxy = httpProxy.createProxyServer({
  changeOrigin: true,
});

proxy.on('proxyReq', (proxyReq: http.ClientRequest) => {
  proxyReq.setHeader('User-Agent', 'Mozilla/5.0');
  proxyReq.removeHeader('x-api-key');
});

export function proxyStream(targetUrl: string, req: Request, res: Response): void {
  proxy.web(req, res, { target: targetUrl }, (err) => {
    if (!res.headersSent) {
      res.status(502).json({ error: 'Stream proxy failed', details: err.message });
    }
  });
}
