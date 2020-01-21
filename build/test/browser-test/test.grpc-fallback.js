"use strict";
/**
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const assert = require("assert");
const mocha_1 = require("mocha");
const protobuf = require("protobufjs");
const fallback = require("../../src/fallback");
const sinon = require("sinon");
const echoProtoJson_1 = require("../fixtures/echoProtoJson");
const chai_1 = require("chai");
//@ts-ignore
const EchoClient = require("../fixtures/google-gax-packaging-test-app/src/v1beta1/echo_client");
const statusJsonProto = require('../../protos/status.json');
const authStub = {
    getRequestHeaders() {
        return { Authorization: 'Bearer SOME_TOKEN' };
    },
};
const opts = {
    auth: authStub,
};
mocha_1.describe('loadProto', () => {
    mocha_1.it('should create a root object', () => {
        // @ts-ignore incomplete options
        const gaxGrpc = new fallback.GrpcClient(opts);
        const protos = gaxGrpc.loadProto(echoProtoJson_1.echoProtoJson);
        assert(protos instanceof protobuf.Root);
        assert(protos.lookupService('Echo') instanceof protobuf.Service);
        assert(protos.lookupType('EchoRequest') instanceof protobuf.Type);
    });
    mocha_1.it('should be able to load no files', () => {
        // @ts-ignore incomplete options
        const gaxGrpc = new fallback.GrpcClient(opts);
        const protos = gaxGrpc.loadProto({});
        assert(protos instanceof protobuf.Root);
        assert(protos.nested === undefined);
        assert.strictEqual(protos.nested, undefined);
    });
});
mocha_1.describe('createStub', () => {
    let gaxGrpc, protos, echoService, stubOptions, stubExtraOptions;
    beforeEach(() => {
        // @ts-ignore incomplete options
        gaxGrpc = new fallback.GrpcClient(opts);
        protos = gaxGrpc.loadProto(echoProtoJson_1.echoProtoJson);
        echoService = protos.lookupService('Echo');
        stubOptions = {
            servicePath: 'foo.example.com',
            port: 443,
        };
        stubExtraOptions = {
            servicePath: 'foo.example.com',
            port: 443,
            other_dummy_options: 'test',
        };
    });
    mocha_1.it('should create a stub', async () => {
        // tslint:disable-next-line no-any
        const echoStub = await gaxGrpc.createStub(echoService, stubOptions);
        assert(echoStub instanceof protobuf.rpc.Service);
        // The stub should consist of service methods
        chai_1.expect(echoStub.echo).to.be.a('Function');
        chai_1.expect(echoStub.pagedExpand).to.be.a('Function');
        chai_1.expect(echoStub.wait).to.be.a('Function');
        // There should be 6 methods for the echo service (and 4 other methods in the object)
        assert.strictEqual(Object.keys(echoStub).length, 10);
        // Each of the service methods should take 4 arguments (so that it works with createApiCall)
        assert.strictEqual(echoStub.echo.length, 4);
    });
    mocha_1.it('should support optional parameters', async () => {
        // tslint:disable-next-line no-any
        const echoStub = await gaxGrpc.createStub(echoService, stubExtraOptions);
        assert(echoStub instanceof protobuf.rpc.Service);
        // The stub should consist of methods
        chai_1.expect(echoStub.echo).to.be.a('Function');
        chai_1.expect(echoStub.collect).to.be.a('Function');
        chai_1.expect(echoStub.chat).to.be.a('Function');
        // There should be 6 methods for the echo service (and 4 other members in the object)
        assert.strictEqual(Object.keys(echoStub).length, 10);
        // Each of the service methods should take 4 arguments (so that it works with createApiCall)
        assert.strictEqual(echoStub.echo.length, 4);
    });
});
mocha_1.describe('grpc-fallback', () => {
    let gaxGrpc, protos, echoService, stubOptions;
    const createdAbortControllers = [];
    // @ts-ignore
    const savedAbortController = window.AbortController;
    const authStub = {
        getRequestHeaders() {
            return { Authorization: 'Bearer SOME_TOKEN' };
        },
    };
    const opts = {
        auth: authStub,
        protocol: 'http',
        port: 1337,
    };
    before(() => {
        stubOptions = {
            servicePath: 'foo.example.com',
            port: 443,
        };
        // @ts-ignore incomplete options
        gaxGrpc = new fallback.GrpcClient(opts);
        protos = gaxGrpc.loadProto(echoProtoJson_1.echoProtoJson);
        echoService = protos.lookupService('Echo');
        stubOptions = {
            servicePath: 'foo.example.com',
            port: 443,
        };
        //tslint:disable-next-line variable-name
        const AbortController = function () {
            // @ts-ignore
            this.abort = function () {
                // @ts-ignore
                this.abortCalled = true;
            };
            // @ts-ignore
            createdAbortControllers.push(this);
        };
        // @ts-ignore
        window.AbortController = AbortController;
    });
    beforeEach(() => {
        createdAbortControllers.splice(0);
    });
    afterEach(() => {
        sinon.restore();
    });
    after(() => {
        // @ts-ignore
        window.AbortController = savedAbortController;
    });
    mocha_1.it('should make a request', async () => {
        const client = new EchoClient(opts);
        const requestObject = { content: 'test-content' };
        const responseType = protos.lookupType('EchoResponse');
        const response = responseType.create(requestObject); // request === response for EchoService
        const fakeFetch = sinon.fake.resolves({
            ok: true,
            arrayBuffer: () => {
                return Promise.resolve(responseType.encode(response).finish());
            },
        });
        sinon.replace(window, 'fetch', fakeFetch);
        const [result] = await client.echo(requestObject);
        assert.strictEqual(requestObject.content, result.content);
    });
    mocha_1.it('should be able to cancel an API call using AbortController', async () => {
        const fakeFetch = sinon.fake.resolves({});
        sinon.replace(window, 'fetch', fakeFetch);
        const echoStub = await gaxGrpc.createStub(echoService, stubOptions);
        const request = { content: 'content' + new Date().toString() };
        const call = echoStub.echo(request, {}, {}, (err, result) => { });
        call.cancel();
        // @ts-ignore
        assert.strictEqual(createdAbortControllers[0].abortCalled, true);
    });
    mocha_1.it('should be able to add extra headers to the request', async () => {
        const client = new EchoClient(opts);
        const requestObject = { content: 'test-content' };
        // tslint:disable-next-line no-any
        const options = {};
        options.otherArgs = {};
        options.otherArgs.headers = {};
        options.otherArgs.headers['x-goog-request-params'] = fallback.routingHeader.fromParams({
            abc: 'def',
        });
        const responseType = protos.lookupType('EchoResponse');
        const response = responseType.create(requestObject);
        const savedFetch = window.fetch;
        // @ts-ignore
        window.fetch = (url, options) => {
            // @ts-ignore
            assert.strictEqual(options.headers['x-goog-request-params'], 'abc=def');
            return Promise.resolve({
                ok: true,
                arrayBuffer: () => {
                    return Promise.resolve(responseType.encode(response).finish());
                },
            });
        };
        const [result] = await client.echo(requestObject, options);
        assert.strictEqual(requestObject.content, result.content);
        window.fetch = savedFetch;
    });
    mocha_1.it('should handle an error', done => {
        const requestObject = { content: 'test-content' };
        // example of an actual google.rpc.Status error message returned by Language API
        const expectedError = {
            code: 3,
            message: 'Error message',
            details: [],
        };
        const fakeFetch = sinon.fake.resolves({
            ok: false,
            arrayBuffer: () => {
                const root = protobuf.Root.fromJSON(statusJsonProto);
                const statusType = root.lookupType('google.rpc.Status');
                const statusMessage = statusType.fromObject(expectedError);
                return Promise.resolve(statusType.encode(statusMessage).finish());
            },
        });
        sinon.replace(window, 'fetch', fakeFetch);
        gaxGrpc.createStub(echoService, stubOptions).then(echoStub => {
            echoStub.echo(requestObject, {}, {}, (err, result) => {
                assert.strictEqual(err.message, JSON.stringify(expectedError));
                done();
            });
        });
    });
});
//# sourceMappingURL=test.grpc-fallback.js.map