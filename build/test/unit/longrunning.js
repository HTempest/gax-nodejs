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
const chai_1 = require("chai");
const grpc_js_1 = require("@grpc/grpc-js");
const sinon = require("sinon");
const src_1 = require("../../src");
const gax = require("../../src/gax");
const googleError_1 = require("../../src/googleError");
const longrunning = require("../../src/longRunningCalls/longrunning");
const utils = require("./utils");
// tslint:disable-next-line no-any
const FAKE_STATUS_CODE_1 = utils.FAKE_STATUS_CODE_1;
const RESPONSE_VAL = 'response';
const RESPONSE = {
    typyeUrl: 'mock.proto.message',
    value: Buffer.from(RESPONSE_VAL),
};
const METADATA_VAL = 'metadata';
const METADATA = {
    typeUrl: 'mock.proto.Message',
    value: Buffer.from(METADATA_VAL),
};
const OPERATION_NAME = 'operation_name';
const SUCCESSFUL_OP = {
    result: 'response',
    name: OPERATION_NAME,
    metadata: METADATA,
    done: true,
    error: null,
    response: RESPONSE,
};
const PENDING_OP = {
    result: null,
    name: OPERATION_NAME,
    metadata: METADATA,
    done: false,
    error: null,
    response: null,
};
const ERROR = {
    code: FAKE_STATUS_CODE_1,
    message: 'operation error',
};
const ERROR_OP = {
    result: 'error',
    name: OPERATION_NAME,
    metadata: METADATA,
    done: true,
    error: ERROR,
    response: null,
};
const BAD_OP = {
    name: OPERATION_NAME,
    metadata: METADATA,
    done: true,
};
const mockDecoder = (val) => {
    return val.toString();
};
function createApiCall(func, client) {
    const descriptor = new src_1.LongrunningDescriptor(client, mockDecoder, mockDecoder);
    return utils.createApiCall(func, { descriptor });
}
describe('longrunning', () => {
    // tslint:disable-next-line no-any
    function mockOperationsClient(opts) {
        opts = opts || {};
        let remainingCalls = opts.expectedCalls ? opts.expectedCalls : null;
        const cancelGetOperationSpy = sinon.spy();
        const getOperationSpy = sinon.spy(() => {
            // tslint:disable-next-line no-any
            let resolver;
            const promise = new Promise(resolve => {
                resolver = resolve;
            });
            // tslint:disable-next-line no-any
            promise.cancel = cancelGetOperationSpy;
            if (remainingCalls && remainingCalls > 1) {
                resolver([PENDING_OP]);
                --remainingCalls;
            }
            else if (!opts.dontResolve) {
                resolver([opts.finalOperation || SUCCESSFUL_OP]);
            }
            return promise;
        });
        const cancelOperationSpy = sinon.spy(() => {
            return Promise.resolve();
        });
        return {
            getOperation: getOperationSpy,
            cancelOperation: cancelOperationSpy,
            cancelGetOperationSpy,
        };
    }
    describe('createApiCall', () => {
        it('longrunning call resolves to the correct datatypes', done => {
            const func = (argument, metadata, options, callback) => {
                callback(null, PENDING_OP);
            };
            const defaultInitialRetryDelayMillis = 100;
            const defaultRetryDelayMultiplier = 1.3;
            const defaultMaxRetryDelayMillis = 60000;
            const defaultTotalTimeoutMillis = null;
            const apiCall = createApiCall(func);
            apiCall({})
                .then(responses => {
                const operation = responses[0];
                const rawResponse = responses[1];
                chai_1.expect(operation).to.be.an('object');
                chai_1.expect(operation).to.have.property('backoffSettings');
                chai_1.expect(operation.backoffSettings.initialRetryDelayMillis).to.eq(defaultInitialRetryDelayMillis);
                chai_1.expect(operation.backoffSettings.retryDelayMultiplier).to.eq(defaultRetryDelayMultiplier);
                chai_1.expect(operation.backoffSettings.maxRetryDelayMillis).to.eq(defaultMaxRetryDelayMillis);
                chai_1.expect(operation.backoffSettings.totalTimeoutMillis).to.eq(defaultTotalTimeoutMillis);
                chai_1.expect(operation).to.have.property('longrunningDescriptor');
                chai_1.expect(operation.name).to.deep.eq(OPERATION_NAME);
                // tslint:disable-next-line no-unused-expression
                chai_1.expect(operation.done).to.be.false;
                chai_1.expect(operation.latestResponse).to.deep.eq(PENDING_OP);
                // tslint:disable-next-line no-unused-expression
                chai_1.expect(operation.result).to.be.null;
                chai_1.expect(operation.metadata).to.deep.eq(METADATA_VAL);
                chai_1.expect(rawResponse).to.deep.eq(PENDING_OP);
                done();
            })
                .catch(done);
        });
    });
    describe('operation', () => {
        it('returns an Operation with correct values', done => {
            const client = mockOperationsClient();
            const desc = new src_1.LongrunningDescriptor(client, mockDecoder, mockDecoder);
            const initialRetryDelayMillis = 1;
            const retryDelayMultiplier = 2;
            const maxRetryDelayMillis = 3;
            const totalTimeoutMillis = 4;
            const unusedRpcValue = 0;
            const backoff = gax.createBackoffSettings(initialRetryDelayMillis, retryDelayMultiplier, maxRetryDelayMillis, unusedRpcValue, unusedRpcValue, unusedRpcValue, totalTimeoutMillis);
            const operation = longrunning.operation(SUCCESSFUL_OP, desc, backoff);
            chai_1.expect(operation).to.be.an('object');
            chai_1.expect(operation).to.have.property('backoffSettings');
            chai_1.expect(operation.backoffSettings.initialRetryDelayMillis).to.eq(initialRetryDelayMillis);
            chai_1.expect(operation.backoffSettings.retryDelayMultiplier).to.eq(retryDelayMultiplier);
            chai_1.expect(operation.backoffSettings.maxRetryDelayMillis).to.eq(maxRetryDelayMillis);
            chai_1.expect(operation.backoffSettings.totalTimeoutMillis).to.eq(totalTimeoutMillis);
            chai_1.expect(operation).to.have.property('longrunningDescriptor');
            chai_1.expect(operation.name).to.deep.eq(OPERATION_NAME);
            // tslint:disable-next-line no-unused-expression
            chai_1.expect(operation.done).to.be.true;
            chai_1.expect(operation.response).to.deep.eq(RESPONSE);
            chai_1.expect(operation.result).to.deep.eq(RESPONSE_VAL);
            chai_1.expect(operation.metadata).to.deep.eq(METADATA_VAL);
            chai_1.expect(operation.latestResponse).to.deep.eq(SUCCESSFUL_OP);
            done();
        });
    });
    describe('Operation', () => {
        describe('getOperation', () => {
            it('does not make an api call if cached op is finished', done => {
                const func = (argument, metadata, options, callback) => {
                    callback(null, SUCCESSFUL_OP);
                };
                const client = mockOperationsClient();
                const apiCall = createApiCall(func, client);
                apiCall({})
                    .then(responses => {
                    const operation = responses[0];
                    operation.getOperation((err, result, metadata, rawResponse) => {
                        if (err) {
                            done(err);
                        }
                        chai_1.expect(result).to.deep.eq(RESPONSE_VAL);
                        chai_1.expect(metadata).to.deep.eq(METADATA_VAL);
                        chai_1.expect(rawResponse).to.deep.eq(SUCCESSFUL_OP);
                        chai_1.expect(client.getOperation.callCount).to.eq(0);
                        done();
                    });
                })
                    .catch(done);
            });
            it('makes an api call to get the updated operation', done => {
                const func = (argument, metadata, options, callback) => {
                    callback(null, PENDING_OP);
                };
                const client = mockOperationsClient();
                const apiCall = createApiCall(func, client);
                apiCall({})
                    .then(responses => {
                    const operation = responses[0];
                    operation.getOperation((err, result, metadata, rawResponse) => {
                        if (err) {
                            done(err);
                        }
                        chai_1.expect(result).to.deep.eq(RESPONSE_VAL);
                        chai_1.expect(metadata).to.deep.eq(METADATA_VAL);
                        chai_1.expect(rawResponse).to.deep.eq(SUCCESSFUL_OP);
                        chai_1.expect(client.getOperation.callCount).to.eq(1);
                        done();
                    });
                })
                    .catch(error => {
                    done(error);
                });
            });
            it('does not return a promise when given a callback.', done => {
                const func = (argument, metadata, options, callback) => {
                    callback(null, PENDING_OP);
                };
                const client = mockOperationsClient();
                const apiCall = createApiCall(func, client);
                apiCall({})
                    .then(responses => {
                    const operation = responses[0];
                    chai_1.expect(operation.getOperation((err, result, metadata, rawResponse) => {
                        if (err) {
                            done(err);
                        }
                        chai_1.expect(result).to.deep.eq(RESPONSE_VAL);
                        chai_1.expect(metadata).to.deep.eq(METADATA_VAL);
                        chai_1.expect(rawResponse).to.deep.eq(SUCCESSFUL_OP);
                        chai_1.expect(client.getOperation.callCount).to.eq(1);
                        done();
                    })
                    // tslint:disable-next-line no-unused-expression
                    ).to.be.undefined;
                })
                    .catch(error => {
                    done(error);
                });
            });
            it('returns a promise that resolves to the correct data', done => {
                const func = (argument, metadata, options, callback) => {
                    callback(null, PENDING_OP);
                };
                const client = mockOperationsClient();
                const apiCall = createApiCall(func, client);
                apiCall({})
                    .then(responses => {
                    const operation = responses[0];
                    return operation.getOperation();
                })
                    .then((responses) => {
                    const result = responses[0];
                    const metadata = responses[1];
                    const rawResponse = responses[2];
                    chai_1.expect(result).to.deep.eq(RESPONSE_VAL);
                    chai_1.expect(metadata).to.deep.eq(METADATA_VAL);
                    chai_1.expect(rawResponse).to.deep.eq(SUCCESSFUL_OP);
                    chai_1.expect(client.getOperation.callCount).to.eq(1);
                    done();
                })
                    .catch(error => {
                    done(error);
                });
            });
            it('returns a promise that rejects an operation error.', done => {
                const func = (argument, metadata, options, callback) => {
                    callback(null, ERROR_OP);
                };
                const client = mockOperationsClient();
                const apiCall = createApiCall(func, client);
                apiCall({})
                    .then(responses => {
                    const operation = responses[0];
                    return operation.getOperation();
                })
                    .then(() => {
                    done(new Error('Should not get here.'));
                })
                    .catch(error => {
                    chai_1.expect(error).to.be.an('error');
                    done();
                });
            });
            it('uses provided promise constructor.', done => {
                const func = (argument, metadata, options, callback) => {
                    callback(null, PENDING_OP);
                };
                let called = false;
                function MockPromise(executor) {
                    const promise = new Promise(executor);
                    called = true;
                    return promise;
                }
                const client = mockOperationsClient();
                const apiCall = createApiCall(func, client);
                // @ts-ignore incomplete options
                apiCall({}, { promise: MockPromise }).then(responses => {
                    const operation = responses[0];
                    operation.getOperation();
                    // tslint:disable-next-line no-unused-expression
                    chai_1.expect(called).to.be.true;
                    done();
                });
            });
        });
        describe('promise', () => {
            it('resolves to the correct data', done => {
                const func = (argument, metadata, options, callback) => {
                    callback(null, PENDING_OP);
                };
                const expectedCalls = 3;
                const client = mockOperationsClient({ expectedCalls });
                const apiCall = createApiCall(func, client);
                apiCall({})
                    .then(responses => {
                    const operation = responses[0];
                    return operation.promise();
                })
                    .then(responses => {
                    const [result, metadata, rawResponse] = responses;
                    chai_1.expect(result).to.deep.eq(RESPONSE_VAL);
                    chai_1.expect(metadata).to.deep.eq(METADATA_VAL);
                    chai_1.expect(rawResponse).to.deep.eq(SUCCESSFUL_OP);
                    chai_1.expect(client.getOperation.callCount).to.eq(expectedCalls);
                    done();
                })
                    .catch(err => {
                    done(err);
                });
            });
            it('resolves if operation completes immediately', async () => {
                const func = (argument, metadata, options, callback) => {
                    callback(null, SUCCESSFUL_OP);
                };
                const client = mockOperationsClient({ expectedCalls: 0 });
                const apiCall = createApiCall(func, client);
                const [operation] = (await apiCall({}));
                // tslint:disable-next-line no-unused-expression
                chai_1.expect(operation).to.be.not.null;
                const [finalResult] = (await operation.promise());
                chai_1.expect(finalResult).to.deep.eq(RESPONSE_VAL);
            });
            it('resolves error', done => {
                const func = (argument, metadata, options, callback) => {
                    callback(null, PENDING_OP);
                };
                const expectedCalls = 3;
                const client = mockOperationsClient({
                    expectedCalls,
                    finalOperation: ERROR_OP,
                });
                const apiCall = createApiCall(func, client);
                apiCall({})
                    .then(responses => {
                    const operation = responses[0];
                    return operation.promise();
                })
                    .then(() => {
                    done(new Error('should not get here'));
                })
                    .catch(err => {
                    chai_1.expect(client.getOperation.callCount).to.eq(expectedCalls);
                    chai_1.expect(err.code).to.eq(FAKE_STATUS_CODE_1);
                    chai_1.expect(err.message).to.deep.eq('operation error');
                    done();
                });
            });
            it('does not hang on invalid API response', done => {
                const func = (argument, metadata, options, callback) => {
                    callback(null, PENDING_OP);
                };
                const client = mockOperationsClient({ finalOperation: BAD_OP });
                const apiCall = createApiCall(func, client);
                apiCall({})
                    .then(responses => {
                    const operation = responses[0];
                    const promise = operation.promise();
                    return promise;
                })
                    .then(() => {
                    done(new Error('Should not get here.'));
                })
                    .catch(error => {
                    chai_1.expect(error).to.be.an('error');
                    done();
                });
            });
            it('uses provided promise constructor', done => {
                const client = mockOperationsClient();
                const desc = new src_1.LongrunningDescriptor(client, mockDecoder, mockDecoder);
                const initialRetryDelayMillis = 1;
                const retryDelayMultiplier = 2;
                const maxRetryDelayMillis = 3;
                const totalTimeoutMillis = 4;
                const unusedRpcValue = 0;
                const backoff = gax.createBackoffSettings(initialRetryDelayMillis, retryDelayMultiplier, maxRetryDelayMillis, unusedRpcValue, unusedRpcValue, unusedRpcValue, totalTimeoutMillis);
                let called = false;
                function MockPromise(executor) {
                    const promise = new Promise(executor);
                    called = true;
                    return promise;
                }
                const operation = longrunning.operation(SUCCESSFUL_OP, desc, backoff, {
                    promise: MockPromise,
                });
                operation.promise();
                // tslint:disable-next-line no-unused-expression
                chai_1.expect(called).to.be.true;
                done();
            });
        });
        describe('cancel', () => {
            it('cancels the Operation and the current api call', done => {
                const func = (argument, metadata, options, callback) => {
                    callback(null, PENDING_OP);
                };
                const client = mockOperationsClient({
                    dontResolve: true,
                });
                const apiCall = createApiCall(func, client);
                apiCall({})
                    .then(responses => {
                    const operation = responses[0];
                    const p = operation.promise();
                    operation.cancel().then(() => {
                        // tslint:disable-next-line no-unused-expression
                        chai_1.expect(client.cancelOperation.called).to.be.true;
                        // tslint:disable-next-line no-unused-expression no-any
                        chai_1.expect(client.cancelGetOperationSpy.called).to.be.true;
                        done();
                    });
                    return p;
                })
                    .then(() => {
                    done(new Error('should not get here'));
                })
                    .catch(err => {
                    done(err);
                });
            });
        });
        describe('polling', () => {
            it('succesful operation emits complete', done => {
                const func = (argument, metadata, options, callback) => {
                    callback(null, PENDING_OP);
                };
                const expectedCalls = 3;
                const client = mockOperationsClient({
                    expectedCalls,
                });
                const apiCall = createApiCall(func, client);
                apiCall({})
                    .then(responses => {
                    const operation = responses[0];
                    operation.on('complete', (result, metadata, rawResponse) => {
                        chai_1.expect(result).to.deep.eq(RESPONSE_VAL);
                        chai_1.expect(metadata).to.deep.eq(METADATA_VAL);
                        chai_1.expect(rawResponse).to.deep.eq(SUCCESSFUL_OP);
                        chai_1.expect(client.getOperation.callCount).to.eq(expectedCalls);
                        done();
                    });
                    operation.on('error', () => {
                        done('should not get here');
                    });
                })
                    .catch(err => {
                    done(err);
                });
            });
            it('operation error emits an error', done => {
                const func = (argument, metadata, options, callback) => {
                    callback(null, PENDING_OP);
                };
                const expectedCalls = 3;
                const client = mockOperationsClient({
                    expectedCalls,
                    finalOperation: ERROR_OP,
                });
                const apiCall = createApiCall(func, client);
                apiCall({})
                    .then(responses => {
                    const operation = responses[0];
                    operation.on('complete', () => {
                        done(new Error('Should not get here.'));
                    });
                    operation.on('error', err => {
                        chai_1.expect(client.getOperation.callCount).to.eq(expectedCalls);
                        chai_1.expect(err.code).to.eq(FAKE_STATUS_CODE_1);
                        chai_1.expect(err.message).to.deep.eq('operation error');
                        done();
                    });
                })
                    .catch(err => {
                    done(err);
                });
            });
            it('emits progress on updated operations.', done => {
                const func = (argument, metadata, options, callback) => {
                    callback(null, PENDING_OP);
                };
                const updatedMetadataVal = 'updated';
                const updatedMetadata = {
                    typeUrl: 'mock.proto.Message',
                    value: Buffer.from(updatedMetadataVal),
                };
                const updatedOp = {
                    result: null,
                    name: OPERATION_NAME,
                    metadata: updatedMetadata,
                    done: false,
                    error: null,
                    response: null,
                };
                const expectedCalls = 3;
                const client = mockOperationsClient({
                    expectedCalls,
                    finalOperation: updatedOp,
                });
                const apiCall = createApiCall(func, client);
                apiCall({})
                    .then(responses => {
                    const operation = responses[0];
                    operation.on('complete', () => {
                        done(new Error('Should not get here.'));
                    });
                    operation.on('progress', (metadata, rawResponse) => {
                        chai_1.expect(client.getOperation.callCount).to.eq(expectedCalls);
                        chai_1.expect(metadata).to.deep.eq(updatedMetadataVal);
                        chai_1.expect(rawResponse).to.deep.eq(updatedOp);
                        chai_1.expect(operation.metadata).to.deep.eq(metadata);
                        chai_1.expect(operation.metadata).to.deep.eq(updatedMetadataVal);
                        // Shows that progress only happens on updated operations since
                        // this will produce a test error if done is called multiple
                        // times, and the same pending operation was polled thrice.
                        operation.removeAllListeners();
                        done();
                    });
                })
                    .catch(err => {
                    done(err);
                });
            });
            it('times out when polling', done => {
                const func = (argument, metadata, options, callback) => {
                    callback(null, PENDING_OP);
                };
                const client = mockOperationsClient({
                    finalOperation: PENDING_OP,
                });
                const apiCall = createApiCall(func, client);
                // @ts-ignore incomplete options
                apiCall({}, {
                    longrunning: gax.createBackoffSettings(1, 1, 1, 0, 0, 0, 1),
                })
                    .then(responses => {
                    const operation = responses[0];
                    operation.on('complete', () => {
                        done(new Error('Should not get here.'));
                    });
                    operation.on('error', err => {
                        chai_1.expect(err).to.be.instanceOf(googleError_1.GoogleError);
                        chai_1.expect(err.code).to.equal(grpc_js_1.status.DEADLINE_EXCEEDED);
                        chai_1.expect(err.message).to.deep.eq('Total timeout exceeded before ' + 'any response was received');
                        done();
                    });
                })
                    .catch(err => {
                    done(err);
                });
            });
        });
    });
});
//# sourceMappingURL=longrunning.js.map