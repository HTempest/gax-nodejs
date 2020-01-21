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
const gax = require("../../src/gax");
const googleError_1 = require("../../src/googleError");
const utils = require("./utils");
const fail = utils.fail;
const createApiCall = utils.createApiCall;
// tslint:disable-next-line no-any
const FAKE_STATUS_CODE_1 = utils.FAKE_STATUS_CODE_1;
// tslint:disable-next-line no-any
const FAKE_STATUS_CODE_2 = utils.FAKE_STATUS_CODE_1 + 1;
describe('createApiCall', () => {
    it('calls api call', done => {
        let deadlineArg;
        function func(argument, metadata, options, callback) {
            deadlineArg = options.deadline;
            callback(null, argument);
        }
        const apiCall = createApiCall(func);
        apiCall(42, undefined, (err, resp) => {
            chai_1.expect(resp).to.eq(42);
            // tslint:disable-next-line no-unused-expression
            chai_1.expect(deadlineArg).to.be.ok;
            done();
        });
    });
    it('is customized by call options', done => {
        function func(argument, metadata, options, callback) {
            callback(null, options.deadline.getTime());
        }
        const apiCall = createApiCall(func, { settings: { timeout: 100 } });
        apiCall({}, { timeout: 200 }, (err, resp) => {
            const now = new Date();
            const originalDeadline = now.getTime() + 100;
            const expectedDeadline = now.getTime() + 200;
            chai_1.expect(resp).above(originalDeadline);
            chai_1.expect(resp).most(expectedDeadline);
            done();
        });
    });
    it('chooses the proper timeout', done => {
        function func(argument, metadata, options, callback) {
            callback(null, options.deadline.getTime());
        }
        // The settings originally from the 'config_service_v2_client_config.json'
        // in @google-cloud/logging library.
        // See https://github.com/googleapis/gax-nodejs/issues/136
        const apiCall = createApiCall(func, {
            settings: {
                timeout: 30000,
                retry: gax.createRetryOptions([], gax.createBackoffSettings(100, 1.2, 1000, 2000, 1.5, 30000, 45000)),
            },
        });
        const start = new Date().getTime();
        apiCall({}, undefined, (err, resp) => {
            // The verifying value is slightly bigger than the expected number
            // 2000 / 30000, because sometimes runtime can consume some time before
            // the call starts.
            chai_1.expect(Number(resp) - start).above(2100);
            chai_1.expect(Number(resp) - start).most(30100);
            done();
        });
    });
});
describe('Promise', () => {
    it('calls api call', done => {
        let deadlineArg;
        function func(argument, metadata, options, callback) {
            deadlineArg = options.deadline;
            callback(null, 42);
        }
        const apiCall = createApiCall(func);
        // tslint:disable-next-line no-any
        apiCall(null)
            .then((response) => {
            chai_1.expect(response).to.be.an('array');
            chai_1.expect(response[0]).to.eq(42);
            // tslint:disable-next-line no-unused-expression
            chai_1.expect(deadlineArg).to.be.ok;
            done();
        })
            .catch(done);
    });
    it('emits error on failure', done => {
        const apiCall = createApiCall(fail);
        apiCall({}, undefined)
            .then(() => {
            done(new Error('should not reach'));
        })
            .catch(err => {
            chai_1.expect(err).to.be.an.instanceOf(Error);
            done();
        });
    });
    it('has cancel method', done => {
        function func(argument, metadata, options, callback) {
            setTimeout(() => {
                callback(null, 42);
            }, 0);
        }
        const apiCall = createApiCall(func, { cancel: done });
        // tslint:disable-next-line no-any
        const promise = apiCall(null);
        promise
            .then(() => {
            done(new Error('should not reach'));
        })
            .catch((err) => {
            chai_1.expect(err).to.be.an.instanceOf(googleError_1.GoogleError);
            chai_1.expect(err.code).to.equal(grpc_js_1.status.CANCELLED);
            done();
        });
        promise.cancel();
    });
    it('cancels retrying call', done => {
        const retryOptions = utils.createRetryOptions(0, 0, 0, 0, 0, 0, 100);
        let callCount = 0;
        function func(argument, metadata, options, callback) {
            callCount++;
            let err;
            let response;
            if (callCount <= 3) {
                err = new googleError_1.GoogleError();
                err.code = FAKE_STATUS_CODE_1;
            }
            else {
                response = 42;
            }
            const timeoutId = setTimeout(() => {
                callback(err, response);
            }, 10);
            return function cancelFunc() {
                clearTimeout(timeoutId);
                callback(new Error('canceled'));
            };
        }
        const apiCall = createApiCall(func, {
            settings: { retry: retryOptions },
            returnCancelFunc: true,
        });
        // tslint:disable-next-line no-any
        const promise = apiCall(null);
        promise
            .then(() => {
            done(new Error('should not reach'));
        })
            .catch(() => {
            chai_1.expect(callCount).to.be.below(4);
            done();
        })
            .catch(done);
        setTimeout(() => {
            promise.cancel();
        }, 15);
    });
    it('does not return promise when callback is supplied', done => {
        function func(argument, metadata, options, callback) {
            callback(null, 42);
        }
        const apiCall = createApiCall(func);
        chai_1.expect(apiCall({}, undefined, (err, response) => {
            // tslint:disable-next-line no-unused-expression
            chai_1.expect(err).to.be.null;
            chai_1.expect(response).to.eq(42);
            done();
        })).to.be.undefined;
    });
    it('uses a provided promise module.', done => {
        let called = false;
        function MockPromise(resolver) {
            called = true;
            return new Promise(resolver);
        }
        function func(argument, metadata, options, callback) {
            callback(null, 42);
        }
        const apiCall = createApiCall(func);
        // @ts-ignore incomplete options
        apiCall({}, { promise: MockPromise })
            .then((response) => {
            chai_1.expect(response).to.be.an('array');
            chai_1.expect(response[0]).to.eq(42);
            // tslint:disable-next-line no-unused-expression
            chai_1.expect(called).to.be.true;
            done();
        })
            .catch(done);
    });
});
describe('retryable', () => {
    const retryOptions = utils.createRetryOptions(0, 0, 0, 0, 0, 0, 100);
    const settings = { settings: { timeout: 0, retry: retryOptions } };
    it('retries the API call', done => {
        let toAttempt = 3;
        let deadlineArg;
        function func(argument, metadata, options, callback) {
            deadlineArg = options.deadline;
            toAttempt--;
            if (toAttempt > 0) {
                fail(argument, metadata, options, callback);
                return;
            }
            callback(null, 1729);
        }
        const apiCall = createApiCall(func, settings);
        apiCall({}, undefined, (err, resp) => {
            chai_1.expect(resp).to.eq(1729);
            chai_1.expect(toAttempt).to.eq(0);
            // tslint:disable-next-line no-unused-expression
            chai_1.expect(deadlineArg).to.be.ok;
            done();
        });
    });
    it('retries the API call with promise', done => {
        let toAttempt = 3;
        let deadlineArg;
        function func(argument, metadata, options, callback) {
            deadlineArg = options.deadline;
            toAttempt--;
            if (toAttempt > 0) {
                fail(argument, metadata, options, callback);
                return;
            }
            callback(null, 1729);
        }
        const apiCall = createApiCall(func, settings);
        apiCall({}, undefined)
            .then(resp => {
            chai_1.expect(resp).to.be.an('array');
            chai_1.expect(resp[0]).to.eq(1729);
            chai_1.expect(toAttempt).to.eq(0);
            // tslint:disable-next-line no-unused-expression
            chai_1.expect(deadlineArg).to.be.ok;
            done();
        })
            .catch(done);
    });
    it('cancels in the middle of retries', done => {
        let callCount = 0;
        // tslint:disable-next-line no-any
        let promise;
        function func(argument, metadata, options, callback) {
            callCount++;
            if (callCount <= 2) {
                fail(argument, metadata, options, callback);
                return;
            }
            setTimeout(() => {
                promise.cancel();
            }, 0);
            setTimeout(() => {
                callback(null, null, 1729);
            }, 10);
        }
        const apiCall = createApiCall(func, settings);
        promise = apiCall({}, undefined);
        promise
            .then(() => {
            done(new Error('should not reach'));
        })
            .catch((err) => {
            chai_1.expect(err).to.be.an.instanceOf(Error);
            done();
        });
    });
    it("doesn't retry if no codes", done => {
        const retryOptions = gax.createRetryOptions([], gax.createBackoffSettings(1, 2, 3, 4, 5, 6, 7));
        const settings = { settings: { timeout: 0, retry: retryOptions } };
        const spy = sinon.spy(fail);
        const apiCall = createApiCall(spy, settings);
        apiCall({}, undefined, err => {
            chai_1.expect(err).to.be.an('error');
            chai_1.expect(err.code).to.eq(FAKE_STATUS_CODE_1);
            // tslint:disable-next-line no-unused-expression
            chai_1.expect(err.note).to.be.undefined;
            chai_1.expect(spy.callCount).to.eq(1);
            done();
        });
    });
    it('aborts retries', done => {
        const apiCall = createApiCall(fail, settings);
        apiCall({}, undefined, err => {
            chai_1.expect(err).to.be.instanceOf(googleError_1.GoogleError);
            chai_1.expect(err.code).to.equal(grpc_js_1.status.DEADLINE_EXCEEDED);
            done();
        });
    });
    it.skip('times out', done => {
        const toAttempt = 3;
        const spy = sinon.spy(fail);
        const apiCall = createApiCall(spy, settings);
        apiCall({}, undefined, err => {
            chai_1.expect(err).to.be.an('error');
            chai_1.expect(err.code).to.eq(FAKE_STATUS_CODE_1);
            // tslint:disable-next-line no-unused-expression
            chai_1.expect(err.note).to.be.ok;
            chai_1.expect(spy.callCount).to.eq(toAttempt);
            done();
        });
    });
    // maxRetries is unsupported, and intended for internal use only.
    it('errors on maxRetries', done => {
        const toAttempt = 5;
        const backoff = gax.createMaxRetriesBackoffSettings(0, 0, 0, 0, 0, 0, toAttempt);
        const maxRetriesRetryOptions = utils.createRetryOptions(backoff);
        const maxRetrySettings = {
            settings: { timeout: 0, retry: maxRetriesRetryOptions },
        };
        const spy = sinon.spy(fail);
        const apiCall = createApiCall(spy, maxRetrySettings);
        apiCall({}, undefined, err => {
            chai_1.expect(err).to.be.instanceOf(googleError_1.GoogleError);
            chai_1.expect(err.code).to.equal(grpc_js_1.status.DEADLINE_EXCEEDED);
            chai_1.expect(spy.callCount).to.eq(toAttempt);
            done();
        });
    });
    // maxRetries is unsupported, and intended for internal use only.
    it('errors when totalTimeoutMillis and maxRetries set', done => {
        const maxRetries = 5;
        const backoff = gax.createMaxRetriesBackoffSettings(0, 0, 0, 0, 0, 0, maxRetries);
        const maxRetriesRetryOptions = utils.createRetryOptions(backoff);
        maxRetriesRetryOptions.backoffSettings.totalTimeoutMillis = 100;
        const maxRetrySettings = {
            settings: { timeout: 0, retry: maxRetriesRetryOptions },
        };
        const spy = sinon.spy(fail);
        const apiCall = createApiCall(spy, maxRetrySettings);
        apiCall({}, undefined, err => {
            chai_1.expect(err).to.be.instanceOf(googleError_1.GoogleError);
            chai_1.expect(err.code).to.equal(grpc_js_1.status.INVALID_ARGUMENT);
            chai_1.expect(spy.callCount).to.eq(0);
            done();
        });
    });
    it('aborts on unexpected exception', done => {
        function func(argument, metadata, options, callback) {
            const error = new googleError_1.GoogleError();
            error.code = FAKE_STATUS_CODE_2;
            callback(error);
        }
        const spy = sinon.spy(func);
        const apiCall = createApiCall(spy, settings);
        apiCall({}, undefined, err => {
            chai_1.expect(err).to.be.an('error');
            chai_1.expect(err.code).to.eq(FAKE_STATUS_CODE_2);
            // tslint:disable-next-line no-unused-expression
            chai_1.expect(err.note).to.be.ok;
            chai_1.expect(spy.callCount).to.eq(1);
            done();
        });
    });
    it('does not retry even when no responses', done => {
        function func(argument, metadata, options, callback) {
            callback(null, null);
        }
        const apiCall = createApiCall(func, settings);
        apiCall({}, undefined, (err, resp) => {
            // tslint:disable-next-line no-unused-expression
            chai_1.expect(err).to.be.null;
            // tslint:disable-next-line no-unused-expression
            chai_1.expect(resp).to.be.null;
            done();
        });
    });
    it.skip('retries with exponential backoff', done => {
        const startTime = new Date();
        const spy = sinon.spy(fail);
        const backoff = gax.createBackoffSettings(3, 2, 24, 5, 2, 80, 2500);
        const retryOptions = new gax.RetryOptions([FAKE_STATUS_CODE_1], backoff);
        const apiCall = createApiCall(spy, {
            settings: { timeout: 0, retry: retryOptions },
        });
        apiCall({}, undefined, err => {
            chai_1.expect(err).to.be.an('error');
            chai_1.expect(err.code).to.eq(FAKE_STATUS_CODE_1);
            // tslint:disable-next-line no-unused-expression
            chai_1.expect(err.note).to.be.ok;
            const now = new Date();
            chai_1.expect(now.getTime() - startTime.getTime()).to.be.at.least(backoff.totalTimeoutMillis);
            const callsLowerBound = backoff.totalTimeoutMillis /
                (backoff.maxRetryDelayMillis + backoff.maxRpcTimeoutMillis);
            const callsUpperBound = backoff.totalTimeoutMillis / backoff.initialRetryDelayMillis;
            chai_1.expect(spy.callCount).to.be.above(callsLowerBound);
            chai_1.expect(spy.callCount).to.be.below(callsUpperBound);
            done();
        });
    });
    it.skip('reports A/B testing', () => {
        function func(argument, metadata, options, callback) {
            callback(null, argument);
        }
        const mockBuilder = sinon.mock();
        const settings = {
            settings: {
                timeout: 0,
                retry: retryOptions,
                otherArgs: { metadataBuilder: mockBuilder },
            },
        };
        const apiCall = createApiCall(func, settings);
        mockBuilder.withExactArgs({ retry: '2' });
        return apiCall({}, undefined)
            .then(() => {
            mockBuilder.verify();
            mockBuilder.reset();
            const backoff = gax.createMaxRetriesBackoffSettings(0, 0, 0, 0, 0, 0, 5);
            mockBuilder.withExactArgs({ retry: '1' });
            return apiCall({}, { retry: utils.createRetryOptions(backoff) });
        })
            .then(() => {
            mockBuilder.verify();
            mockBuilder.reset();
            mockBuilder.withExactArgs({ retry: '2' });
            const options = {
                retry: utils.createRetryOptions(0, 0, 0, 0, 0, 0, 200),
            };
            return apiCall({}, options);
        })
            .then(() => {
            mockBuilder.verify();
        });
    });
    it('forwards metadata to builder', done => {
        function func(argument, metadata, options, callback) {
            callback(null, {});
        }
        let gotHeaders;
        const mockBuilder = (abTest, headers) => {
            gotHeaders = headers;
        };
        const settings = {
            settings: {
                otherArgs: { metadataBuilder: mockBuilder },
            },
        };
        const apiCall = createApiCall(func, settings);
        const headers = {
            h1: 'val1',
            h2: 'val2',
        };
        apiCall({}, { otherArgs: { headers } }).then(() => {
            chai_1.expect(gotHeaders.h1).to.deep.equal('val1');
            chai_1.expect(gotHeaders.h2).to.deep.equal('val2');
            done();
        });
    });
});
//# sourceMappingURL=apiCallable.js.map