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
const chai_1 = require("chai");
// @ts-ignore
const EchoClient = require("../fixtures/google-gax-packaging-test-app/src/v1beta1/echo_client");
function sleep(timeout) {
    return new Promise(resolve => {
        setTimeout(resolve, timeout);
    });
}
mocha_1.describe('Run tests against gRPC server', () => {
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
    // @ts-ignore
    global.isBrowser = true;
    const client = new EchoClient(opts);
    before(async function () {
        this.timeout(40000);
        const request = {
            content: 'test',
        };
        const MAX_RETRIES = 20;
        const TIMEOUT = 1000;
        let retryCount = 0;
        // Making sure server is up before starting tests.
        for (; retryCount < MAX_RETRIES; ++retryCount) {
            try {
                await client.echo(request);
            }
            catch (err) {
                await sleep(TIMEOUT);
                continue;
            }
            break;
        }
        if (retryCount === MAX_RETRIES) {
            throw new Error(`gapic-showcase server did not respond after ${MAX_RETRIES} attempts, aborting end-to-end browser tests`);
        }
    });
    mocha_1.it('should be able to call simple RPC methods', async () => {
        const request = {
            content: 'test',
        };
        const [response] = await client.echo(request);
        assert.deepStrictEqual(request.content, response.content);
    });
    mocha_1.it('should throw an error when calling server-side streaming calls', async () => {
        const words = ['nobody', 'ever', 'reads', 'test', 'input'];
        const request = {
            content: words.join(' '),
        };
        chai_1.expect(() => {
            client.expand(request);
        }).to.throw();
    });
    mocha_1.it('should be able to call paging calls', async () => {
        const words = ['nobody', 'ever', 'reads', 'test', 'input'];
        const request = {
            content: words.join(' '),
            pageSize: 2,
        };
        const [response] = await client.pagedExpand(request);
        const result = response.map((r) => r.content);
        assert.deepStrictEqual(words, result);
    });
    mocha_1.it('should throw an error when calling client-side streaming calls', async () => {
        chai_1.expect(() => {
            client.collect();
        }).to.throw();
    });
    mocha_1.it('should throw an error when calling bi-direction streaming calls', async () => {
        chai_1.expect(() => {
            client.chat();
        }).to.throw();
    });
    mocha_1.it('should be able to call long-running calls', async function () {
        // LRO is being tested here, which takes at least 5000ms to finish running
        this.timeout(60000);
        const request = {
            ttl: {
                seconds: 5,
                nanos: 0,
            },
            success: {
                content: 'done',
            },
        };
        const [operation] = await client.wait(request);
        const [response] = await operation.promise();
        assert.deepStrictEqual(response.content, request.success.content);
    });
});
//# sourceMappingURL=test.endtoend.js.map