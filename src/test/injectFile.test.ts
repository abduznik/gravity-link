import assert from 'assert';
import { injectFile } from '../core/services/antigravity';
import { CDPConnection, CDPContext } from '../core/types';

function makeFakeCall() {
    const responses: Record<string, any> = {
        'Page.enable': {},
        'DOM.enable': {},
        'Page.setInterceptFileChooserDialog': {},
        'DOM.setFileInputFiles': {},
        'Runtime.callFunctionOn': {}
    };

    return async (method: string, params: any) => {
        if (method === 'Runtime.evaluate') {
            const expr: string = params.expression || '';
            if (expr.includes('Add context')) {
                return { result: { value: true } };
            }
            if (expr.includes('Media')) {
                return { result: { value: 'clicked_media' } };
            }
            if (expr.includes('input[type="file"]')) {
                return { result: { value: 'ag-123' } };
            }
            if (expr.includes('data-ag-id')) {
                return { result: { objectId: 'obj-1' } };
            }
            return { result: { value: null } };
        }
        if (method in responses) return responses[method];
        throw new Error(`Unexpected method ${method}`);
    };
}

describe('injectFile (unit)', () => {
    it('injects via Add context / Media flow when UI is found', async () => {
        const contexts: CDPContext[] = [{ id: 1, name: 'main', origin: 'http://localhost' }];
        const cdp: CDPConnection = {
            id: 'fake-id',
            ws: null as any,
            call: makeFakeCall(),
            contexts,
            title: 'fake',
            url: 'ws://fake'
        };

        const res = await injectFile(cdp, '/tmp/file.txt');
        assert.strictEqual(res.ok, true);
    });
});
