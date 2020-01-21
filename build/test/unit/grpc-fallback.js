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
const path = require("path");
const fs = require("fs");
const nodeFetch = require("node-fetch");
const abortController = require("abort-controller");
const protobuf = require("protobufjs");
const sinon = require("sinon");
const echoProtoJson_1 = require("../fixtures/echoProtoJson");
const chai_1 = require("chai");
const fallback_1 = require("../../src/fallback");
const authClient = {
    getRequestHeaders() {
        return { Authorization: 'Bearer SOME_TOKEN' };
    },
};
const authStub = {
    getClient() {
        return Promise.resolve(authClient);
    },
};
const opts = {
    auth: authStub,
};
mocha_1.describe('loadProto', () => {
    mocha_1.it('should create a root object', () => {
        // @ts-ignore incomplete options
        const gaxGrpc = new fallback_1.GrpcClient(opts);
        const protos = gaxGrpc.loadProto(echoProtoJson_1.echoProtoJson);
        assert(protos instanceof protobuf.Root);
        assert(protos.lookupService('Echo') instanceof protobuf.Service);
        assert(protos.lookupType('EchoRequest') instanceof protobuf.Type);
    });
    mocha_1.it('should be able to load no files', () => {
        // @ts-ignore incomplete options
        const gaxGrpc = new fallback_1.GrpcClient(opts);
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
        gaxGrpc = new fallback_1.GrpcClient(opts);
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
    const savedAbortController = abortController.AbortController;
    before(() => {
        stubOptions = {
            servicePath: 'foo.example.com',
            port: 443,
        };
        // @ts-ignore incomplete options
        gaxGrpc = new fallback_1.GrpcClient(opts);
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
        abortController.AbortController = AbortController;
    });
    beforeEach(() => {
        createdAbortControllers.splice(0);
    });
    afterEach(() => {
        sinon.restore();
    });
    after(() => {
        // @ts-ignore
        abortController.AbortController = savedAbortController;
    });
    mocha_1.it('should send grpc-web version in the header', () => {
        const gapicConfig = {
            interfaces: {
                'google.showcase.v1beta1.Echo': {
                    retry_codes: {
                        idempotent: ['DEADLINE_EXCEEDED', 'UNAVAILABLE'],
                        non_idempotent: [],
                    },
                    retry_params: {
                        default: {
                            initial_retry_delay_millis: 100,
                            retry_delay_multiplier: 1.3,
                            max_retry_delay_millis: 60000,
                            initial_rpc_timeout_millis: 20000,
                            rpc_timeout_multiplier: 1.0,
                            max_rpc_timeout_millis: 20000,
                            total_timeout_millis: 600000,
                        },
                    },
                    methods: {
                        Echo: {
                            timeout_millis: 60000,
                            retry_codes_name: 'idempotent',
                            retry_params_name: 'default',
                        },
                    },
                },
            },
        };
        const settings = gaxGrpc.constructSettings('google.showcase.v1beta1.Echo', gapicConfig, {}, {});
        const metadataBuilder = settings.echo.otherArgs.metadataBuilder;
        const headers = metadataBuilder();
        assert(headers['x-goog-api-client'][0].match('grpc-web/'));
    });
    mocha_1.it('should make a request', done => {
        const requestObject = { content: 'test-content' };
        const responseType = protos.lookupType('EchoResponse');
        const response = responseType.create(requestObject); // request === response for EchoService
        //@ts-ignore
        sinon.stub(nodeFetch, 'Promise').returns(Promise.resolve({
            ok: true,
            arrayBuffer: () => {
                return Promise.resolve(responseType.encode(response).finish());
            },
        }));
        gaxGrpc.createStub(echoService, stubOptions).then(echoStub => {
            echoStub.echo(requestObject, {}, {}, (err, result) => {
                assert.strictEqual(err, null);
                assert.strictEqual(requestObject.content, result.content);
                done();
            });
        });
    });
    mocha_1.it('should handle an error', done => {
        const requestObject = { content: 'test-content' };
        // example of an actual google.rpc.Status error message returned by Language API
        const fixtureName = path.resolve(__dirname, '..', 'fixtures', 'error.bin');
        const errorBin = fs.readFileSync(fixtureName);
        const expectedError = {
            code: 3,
            message: 'One of content, or gcs_content_uri must be set.',
            details: [
                {
                    fieldViolations: [
                        {
                            field: 'document.content',
                            description: 'Must have some text content to annotate.',
                        },
                    ],
                },
            ],
        };
        //@ts-ignore
        sinon.stub(nodeFetch, 'Promise').returns(Promise.resolve({
            ok: false,
            arrayBuffer: () => {
                return Promise.resolve(errorBin);
            },
        }));
        gaxGrpc.createStub(echoService, stubOptions).then(echoStub => {
            echoStub.echo(requestObject, {}, {}, (err, result) => {
                assert.strictEqual(err.message, JSON.stringify(expectedError));
                done();
            });
        });
    });
    mocha_1.it('should be able to cancel an API call using AbortController', async () => {
        // @ts-ignore
        sinon.stub(nodeFetch, 'Promise').returns(Promise.resolve({}));
        const echoStub = await gaxGrpc.createStub(echoService, stubOptions);
        const request = { content: 'content' + new Date().toString() };
        const call = echoStub.echo(request, {}, {}, () => { });
        call.cancel();
        // @ts-ignore
        assert.strictEqual(createdAbortControllers[0].abortCalled, true);
    });
});
//# sourceMappingURL=grpc-fallback.js.map