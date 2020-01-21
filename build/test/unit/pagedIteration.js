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
const pumpify = require("pumpify");
const sinon = require("sinon");
const streamEvents = require("stream-events");
const through2 = require("through2");
const pageDescriptor_1 = require("../../src/paginationCalls/pageDescriptor");
const util = require("./utils");
describe('paged iteration', () => {
    const pageSize = 3;
    const pagesToStream = 5;
    const descriptor = new pageDescriptor_1.PageDescriptor('pageToken', 'nextPageToken', 'nums');
    const retryOptions = util.createRetryOptions(0, 0, 0, 0, 0, 0, 100);
    const createOptions = {
        settings: { retry: retryOptions },
        descriptor,
    };
    function func(request, metadata, options, callback) {
        const pageToken = request.pageToken || 0;
        if (pageToken >= pageSize * pagesToStream) {
            callback(null, { nums: [] });
        }
        else {
            const nums = new Array(pageSize);
            for (let i = 0; i < pageSize; i++) {
                nums[i] = pageToken + i;
            }
            callback(null, { nums, nextPageToken: pageToken + pageSize });
        }
    }
    it('returns an Array of results', done => {
        const apiCall = util.createApiCall(func, createOptions);
        const expected = [];
        for (let i = 0; i < pageSize * pagesToStream; ++i) {
            expected.push(i);
        }
        apiCall({}, undefined)
            .then(results => {
            chai_1.expect(results).to.be.an('array');
            chai_1.expect(results[0]).to.deep.equal(expected);
            done();
        })
            .catch(done);
    });
    it('calls callback with an Array', done => {
        const apiCall = util.createApiCall(func, createOptions);
        const expected = [];
        for (let i = 0; i < pageSize * pagesToStream; ++i) {
            expected.push(i);
        }
        apiCall({}, undefined, (err, results) => {
            // tslint:disable-next-line no-unused-expression
            chai_1.expect(err).to.be.null;
            chai_1.expect(results).to.deep.equal(expected);
            done();
        });
    });
    it('returns a response when autoPaginate is false', done => {
        const apiCall = util.createApiCall(func, createOptions);
        let expected = 0;
        const req = {};
        apiCall(req, { autoPaginate: false })
            .then(response => {
            chai_1.expect(response).to.be.an('array');
            chai_1.expect(response[0]).to.be.an('array');
            // @ts-ignore response type
            chai_1.expect(response[0].length).to.eq(pageSize);
            for (let i = 0; i < pageSize; ++i) {
                // @ts-ignore response type
                chai_1.expect(response[0][i]).to.eq(expected);
                expected++;
            }
            chai_1.expect(response[1]).to.be.an('object');
            chai_1.expect(response[1]).to.have.property('pageToken');
            chai_1.expect(response[2]).to.be.an('object');
            chai_1.expect(response[2]).to.have.property('nums');
            // @ts-ignore response type
            return apiCall(response[1], { autoPaginate: false });
        })
            .then(response => {
            chai_1.expect(response).to.be.an('array');
            chai_1.expect(response[0]).to.be.an('array');
            chai_1.expect(response[0].length).to.eq(pageSize);
            for (let i = 0; i < pageSize; ++i) {
                chai_1.expect(response[0][i]).to.eq(expected);
                expected++;
            }
            done();
        })
            .catch(done);
    });
    it('sets additional arguments to the callback', done => {
        let counter = 0;
        const apiCall = util.createApiCall(func, createOptions);
        function callback(err, resources, next, rawResponse) {
            if (err) {
                done(err);
                return;
            }
            counter++;
            chai_1.expect(resources).to.be.an('array');
            chai_1.expect(rawResponse).to.be.an('object');
            chai_1.expect(rawResponse).to.have.property('nums');
            chai_1.expect(rawResponse.nums).to.eq(resources);
            if (next) {
                apiCall(next, { autoPaginate: false }, callback);
            }
            else {
                chai_1.expect(counter).to.eq(pagesToStream + 1);
                done();
            }
        }
        apiCall({}, { autoPaginate: false }, callback);
    });
    it('retries on failure', done => {
        let callCount = 0;
        function failingFunc(request, metadata, options, callback) {
            callCount++;
            if (callCount % 2 === 0) {
                util.fail(request, metadata, options, callback);
            }
            else {
                func(request, metadata, options, callback);
            }
        }
        const apiCall = util.createApiCall(failingFunc, createOptions);
        apiCall({}, undefined)
            .then(resources => {
            chai_1.expect(resources).to.be.an('array');
            // @ts-ignore response type
            chai_1.expect(resources[0].length).to.eq(pageSize * pagesToStream);
            done();
        })
            .catch(done);
    });
    it('caps the results by maxResults', () => {
        const spy = sinon.spy(func);
        const apiCall = util.createApiCall(spy, createOptions);
        return apiCall({}, { maxResults: pageSize * 2 + 2 }).then(response => {
            chai_1.expect(response).to.be.an('array');
            chai_1.expect(response[0]).to.be.an('array');
            // @ts-ignore response type
            chai_1.expect(response[0].length).to.eq(pageSize * 2 + 2);
            let expected = 0;
            // @ts-ignore response type
            for (let i = 0; i < response[0].length; ++i) {
                // @ts-ignore response type
                chai_1.expect(response[0][i]).to.eq(expected);
                expected++;
            }
            chai_1.expect(spy.callCount).to.eq(3);
        });
    });
    describe('stream conversion', () => {
        // tslint:disable-next-line no-any
        let spy;
        let apiCall;
        beforeEach(() => {
            spy = sinon.spy(func);
            apiCall = util.createApiCall(spy, createOptions);
        });
        function streamChecker(stream, onEnd, done, start) {
            let counter = start;
            stream
                .on('data', data => {
                chai_1.expect(data).to.eq(counter);
                counter++;
            })
                .on('end', () => {
                onEnd();
                done();
            })
                .on('error', done);
        }
        it('returns a stream', done => {
            streamChecker(
            // @ts-ignore incomplete options
            descriptor.createStream(apiCall, {}, {}), () => {
                chai_1.expect(spy.callCount).to.eq(pagesToStream + 1);
            }, done, 0);
        });
        it('stops in the middle', done => {
            // @ts-ignore incomplete options
            const stream = descriptor.createStream(apiCall, {}, null);
            stream.on('data', data => {
                if (Number(data) === pageSize + 1) {
                    stream.end();
                }
            });
            streamChecker(stream, () => {
                chai_1.expect(spy.callCount).to.eq(2);
            }, done, 0);
        });
        it('ignores autoPaginate options, but respects others', done => {
            // Specifies autoPaginate: false, which will be ignored, and pageToken:
            // pageSize which will be used so that the stream will start from the
            // specified token.
            const options = { pageToken: pageSize, autoPaginate: false };
            streamChecker(
            // @ts-ignore incomplete options
            descriptor.createStream(apiCall, {}, options), () => {
                chai_1.expect(spy.callCount).to.eq(pagesToStream);
            }, done, pageSize);
        });
        it('caps the elements by maxResults', done => {
            const onData = sinon.spy();
            const stream = 
            // @ts-ignore incomplete options
            descriptor.createStream(apiCall, {}, { maxResults: pageSize * 2 + 2 });
            stream.on('data', onData);
            streamChecker(stream, () => {
                chai_1.expect(spy.callCount).to.eq(3);
                chai_1.expect(onData.callCount).to.eq(pageSize * 2 + 2);
            }, done, 0);
        });
        it('does not call API eagerly', done => {
            // @ts-ignore incomplete options
            const stream = descriptor.createStream(apiCall, {}, null);
            setTimeout(() => {
                chai_1.expect(spy.callCount).to.eq(0);
                streamChecker(stream, () => {
                    chai_1.expect(spy.callCount).to.eq(pagesToStream + 1);
                }, done, 0);
            }, 50);
        });
        it('does not start calls when it is already started', done => {
            // @ts-ignore incomplete options
            const stream = descriptor.createStream(apiCall, {}, null);
            stream.on('end', () => {
                chai_1.expect(spy.callCount).to.eq(pagesToStream + 1);
                done();
            });
            stream.resume();
            setImmediate(() => {
                stream.pause();
                stream.resume();
            });
        });
        it('cooperates with google-cloud-node usage', done => {
            let stream;
            // tslint:disable-next-line no-any
            const output = streamEvents(pumpify.obj());
            output.once('reading', () => {
                // @ts-ignore incomplete options
                stream = descriptor.createStream(apiCall, {}, null);
                output.setPipeline(stream, through2.obj());
            });
            let count = 0;
            output
                .on('data', () => {
                count++;
                if (count === pageSize + 1) {
                    output.end();
                }
            })
                .on('end', () => {
                chai_1.expect(count).to.eq(pageSize + 1);
                chai_1.expect(spy.callCount).to.eq(2);
                done();
            })
                .on('error', done);
        });
    });
});
//# sourceMappingURL=pagedIteration.js.map