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
const sinon = require("sinon");
const through2 = require("through2");
const createApiCall_1 = require("../../src/createApiCall");
const gax = require("../../src/gax");
const streamDescriptor_1 = require("../../src/streamingCalls/streamDescriptor");
const streaming = require("../../src/streamingCalls/streaming");
function createApiCallStreaming(func, type) {
    const settings = new gax.CallSettings();
    return createApiCall_1.createApiCall(
    //@ts-ignore
    Promise.resolve(func), settings, new streamDescriptor_1.StreamDescriptor(type));
}
describe('streaming', () => {
    it('handles server streaming', done => {
        const spy = sinon.spy((...args) => {
            chai_1.expect(args.length).to.eq(3);
            const s = through2.obj();
            s.push({ resources: [1, 2] });
            s.push({ resources: [3, 4, 5] });
            s.push(null);
            setImmediate(() => {
                s.emit('metadata');
            });
            return s;
        });
        const apiCall = createApiCallStreaming(spy, streaming.StreamType.SERVER_STREAMING);
        const s = apiCall({}, undefined);
        const callback = sinon.spy(data => {
            if (callback.callCount === 1) {
                chai_1.expect(data).to.deep.equal({ resources: [1, 2] });
            }
            else {
                chai_1.expect(data).to.deep.equal({ resources: [3, 4, 5] });
            }
        });
        // tslint:disable-next-line no-unused-expression
        chai_1.expect(s.readable).to.be.true;
        // tslint:disable-next-line no-unused-expression
        chai_1.expect(s.writable).to.be.false;
        s.on('data', callback);
        s.on('end', () => {
            chai_1.expect(callback.callCount).to.eq(2);
            done();
        });
    });
    it('handles client streaming', done => {
        function func(metadata, options, callback) {
            chai_1.expect(arguments.length).to.eq(3);
            const s = through2.obj();
            const written = [];
            s.on('end', () => {
                callback(null, written);
            });
            s.on('error', callback);
            s.on('data', data => {
                written.push(data);
            });
            return s;
        }
        const apiCall = createApiCallStreaming(
        //@ts-ignore
        func, streaming.StreamType.CLIENT_STREAMING);
        const s = apiCall({}, undefined, (err, response) => {
            // tslint:disable-next-line no-unused-expression
            chai_1.expect(err).to.be.null;
            chai_1.expect(response).to.deep.eq(['foo', 'bar']);
            done();
        });
        // tslint:disable-next-line no-unused-expression
        chai_1.expect(s.readable).to.be.false;
        // tslint:disable-next-line no-unused-expression
        chai_1.expect(s.writable).to.be.true;
        s.write('foo');
        s.write('bar');
        s.end();
    });
    it('handles bidi streaming', done => {
        function func() {
            chai_1.expect(arguments.length).to.eq(2);
            const s = through2.obj();
            setImmediate(() => {
                s.emit('metadata');
            });
            return s;
        }
        const apiCall = createApiCallStreaming(
        //@ts-ignore
        func, streaming.StreamType.BIDI_STREAMING);
        const s = apiCall({}, undefined);
        const arg = { foo: 'bar' };
        const callback = sinon.spy(data => {
            chai_1.expect(data).to.eq(arg);
        });
        s.on('data', callback);
        s.on('end', () => {
            chai_1.expect(callback.callCount).to.eq(2);
            done();
        });
        // tslint:disable-next-line no-unused-expression
        chai_1.expect(s.readable).to.be.true;
        // tslint:disable-next-line no-unused-expression
        chai_1.expect(s.writable).to.be.true;
        s.write(arg);
        s.write(arg);
        s.end();
    });
    it('forwards metadata and status', done => {
        const responseMetadata = { metadata: true };
        const status = { code: 0, metadata: responseMetadata };
        const expectedResponse = {
            code: 200,
            message: 'OK',
            details: '',
            metadata: responseMetadata,
        };
        function func() {
            const s = through2.obj();
            setTimeout(() => {
                s.emit('metadata', responseMetadata);
            }, 10);
            s.on('finish', () => {
                s.emit('status', status);
            });
            return s;
        }
        const apiCall = createApiCallStreaming(
        //@ts-ignore
        func, streaming.StreamType.BIDI_STREAMING);
        const s = apiCall({}, undefined);
        let receivedMetadata;
        let receivedStatus;
        let receivedResponse;
        s.on('metadata', data => {
            receivedMetadata = data;
        });
        s.on('status', data => {
            receivedStatus = data;
        });
        s.on('response', data => {
            receivedResponse = data;
        });
        s.on('finish', () => {
            chai_1.expect(receivedMetadata).to.deep.eq(responseMetadata);
            chai_1.expect(receivedStatus).to.deep.eq(status);
            chai_1.expect(receivedResponse).to.deep.eq(expectedResponse);
            done();
        });
        // tslint:disable-next-line no-unused-expression
        chai_1.expect(s.readable).to.be.true;
        // tslint:disable-next-line no-unused-expression
        chai_1.expect(s.writable).to.be.true;
        setTimeout(() => {
            s.end(s);
        }, 50);
    });
    it('cancels in the middle', done => {
        // tslint:disable-next-line no-any
        function schedulePush(s, c) {
            const intervalId = setInterval(() => {
                s.push(c);
                c++;
            }, 10);
            s.on('finish', () => {
                clearInterval(intervalId);
            });
        }
        const cancelError = new Error('cancelled');
        function func() {
            const s = through2.obj();
            schedulePush(s, 0);
            // tslint:disable-next-line no-any
            s.cancel = () => {
                s.end();
                s.emit('error', cancelError);
            };
            setImmediate(() => {
                s.emit('metadata');
            });
            return s;
        }
        const apiCall = createApiCallStreaming(
        //@ts-ignore
        func, streaming.StreamType.SERVER_STREAMING);
        const s = apiCall({}, undefined);
        let counter = 0;
        const expectedCount = 5;
        s.on('data', data => {
            chai_1.expect(data).to.eq(counter);
            counter++;
            if (counter === expectedCount) {
                s.cancel();
            }
            else if (counter > expectedCount) {
                done(new Error('should not reach'));
            }
        });
        s.on('error', err => {
            chai_1.expect(err).to.eq(cancelError);
            done();
        });
    });
});
//# sourceMappingURL=streaming.js.map