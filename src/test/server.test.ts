import { expect } from 'chai';
import path from 'path';
import http from 'http';
import { AntigravityServer } from '../core/server/index';
import { ServerConfig } from '../core/config';

describe('AntigravityServer', () => {
    let server: AntigravityServer;
    const testPort = 3005;
    const extensionPath = path.join(__dirname, '../../');
    const workspaceRoot = path.join(__dirname, '../../../');

    before(async () => {
        const serverConfig: ServerConfig = {
            port: testPort,
            useHttps: false // HTTP for test
        };
        server = new AntigravityServer(serverConfig, extensionPath, workspaceRoot);
    });

    after(() => {
        server.stop();
    });

    it('should start successfully and generate URLs', async () => {
        const urls = await server.start();
        expect(urls.localUrl).to.contain('http://');
        expect(urls.localUrl).to.contain(':' + testPort);
        expect(urls.secureUrl).to.contain('https://');
        expect(urls.secureUrl).to.contain(':' + testPort);

        expect(server.localUrl).to.equal(urls.localUrl);
        expect(server.secureUrl).to.equal(urls.secureUrl);
    });

    it('should have basic routes working', (done) => {
        http.get('http://localhost:' + testPort + '/ping', (res: http.IncomingMessage) => {
            expect(res.statusCode).to.equal(200);
            let data = '';
            res.on('data', (chunk: Buffer) => data += chunk.toString());
            res.on('end', () => {
                expect(data).to.equal('pong');
                done();
            });
        }).on('error', done);
    });

    it('should serve public assets', (done) => {
        http.get('http://localhost:' + testPort + '/index.html', (res: http.IncomingMessage) => {
            expect(res.statusCode).to.equal(200);
            expect(res.headers['content-type']).to.contain('text/html');
            done();
        }).on('error', done);
    });
});
