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
const createApiCall_1 = require("../../src/createApiCall");
const gax = require("../../src/gax");
const googleError_1 = require("../../src/googleError");
const FAKE_STATUS_CODE_1 = (exports.FAKE_STATUS_CODE_1 = 1);
function fail(argument, metadata, options, callback) {
    const error = new googleError_1.GoogleError();
    error.code = FAKE_STATUS_CODE_1;
    callback(error);
}
exports.fail = fail;
function createApiCall(func, opts) {
    const settings = new gax.CallSettings((opts && opts.settings) || {});
    const descriptor = opts && opts.descriptor;
    return createApiCall_1.createApiCall(Promise.resolve((argument, metadata, options, callback) => {
        if (opts && opts.returnCancelFunc) {
            return {
                cancel: func(argument, metadata, options, callback),
                completed: true,
                call: () => {
                    throw new Error('should not be run');
                },
            };
        }
        func(argument, metadata, options, callback);
        return {
            cancel: (opts && opts.cancel) ||
                (() => {
                    callback(new Error('canceled'));
                }),
            completed: true,
            call: () => {
                throw new Error('should not be run');
            },
        };
    }), settings, descriptor);
}
exports.createApiCall = createApiCall;
function createRetryOptions(backoffSettingsOrInitialRetryDelayMillis, retryDelayMultiplier, maxRetryDelayMillis, initialRpcTimeoutMillis, rpcTimeoutMultiplier, maxRpcTimeoutMillis, totalTimeoutMillis) {
    const backoff = typeof backoffSettingsOrInitialRetryDelayMillis === 'number'
        ? gax.createBackoffSettings(backoffSettingsOrInitialRetryDelayMillis, retryDelayMultiplier, maxRetryDelayMillis, initialRpcTimeoutMillis, rpcTimeoutMultiplier, maxRpcTimeoutMillis, totalTimeoutMillis)
        : backoffSettingsOrInitialRetryDelayMillis;
    return gax.createRetryOptions([FAKE_STATUS_CODE_1], backoff);
}
exports.createRetryOptions = createRetryOptions;
//# sourceMappingURL=utils.js.map