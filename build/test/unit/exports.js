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
const index = require("../../src/index");
const fallback = require("../../src/fallback");
const assert = require("assert");
const mocha_1 = require("mocha");
const version = require('../../../package.json').version;
// The following export tests validate the Gax interface that is used by client libraries.
// Removing any of the following exports will break client libraries.
mocha_1.describe('exports', () => {
    mocha_1.describe('index', () => {
        mocha_1.it('exports GrpcClient', () => {
            assert(typeof index.GrpcClient === 'function');
        });
        mocha_1.it('exports createApiCall', () => {
            assert(typeof index.createApiCall === 'function');
        });
        mocha_1.it('exports PathTemplate', () => {
            assert(typeof index.PathTemplate === 'function');
        });
        mocha_1.it('exports PageDescriptor', () => {
            assert(typeof index.PageDescriptor === 'function');
        });
        mocha_1.it('exports StreamDescriptor', () => {
            assert(typeof index.StreamDescriptor === 'function');
        });
        mocha_1.it('exports BundleDescriptor', () => {
            assert(typeof index.BundleDescriptor === 'function');
        });
        mocha_1.it('exports LongrunningDescriptor', () => {
            assert(typeof index.LongrunningDescriptor === 'function');
        });
        mocha_1.it('exports lro', () => {
            assert(typeof index.lro === 'function');
        });
        mocha_1.it('exports version', () => {
            assert(typeof index.version === 'string');
            assert.strictEqual(index.version, version);
        });
        mocha_1.it('exports fallback', () => {
            assert(typeof index.fallback === 'object');
        });
    });
    mocha_1.describe('fallback', () => {
        mocha_1.it('exports GrpcClient', () => {
            assert(typeof fallback.GrpcClient === 'function');
        });
        mocha_1.it('exports createApiCall', () => {
            assert(typeof fallback.createApiCall === 'function');
        });
        mocha_1.it('exports PathTemplate', () => {
            assert(typeof fallback.PathTemplate === 'function');
        });
        mocha_1.it('exports PageDescriptor', () => {
            assert(typeof fallback.PageDescriptor === 'function');
        });
        mocha_1.it('exports StreamDescriptor', () => {
            assert(typeof fallback.StreamDescriptor === 'function');
        });
        mocha_1.it('exports BundleDescriptor', () => {
            assert(typeof fallback.BundleDescriptor === 'function');
        });
        mocha_1.it('exports LongrunningDescriptor', () => {
            assert(typeof fallback.LongrunningDescriptor === 'function');
        });
        mocha_1.it('exports lro', () => {
            assert(typeof fallback.lro === 'function');
        });
        mocha_1.it('exports version', () => {
            assert(typeof fallback.version === 'string');
            assert.strictEqual(fallback.version, version + '-fallback');
        });
    });
});
//# sourceMappingURL=exports.js.map