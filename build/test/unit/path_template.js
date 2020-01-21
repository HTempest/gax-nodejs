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
const pathTemplate_1 = require("../../src/pathTemplate");
describe('PathTemplate', () => {
    describe('constructor', () => {
        it('should parse and obtain the correct number of segments', () => {
            const t = new pathTemplate_1.PathTemplate('a/b/**/*/{a=hello/world}');
            chai_1.expect(t.segments.length).to.eql(12);
            chai_1.expect(t.size).to.eql(6);
        });
        it('should fail on multiple path wildcards', () => {
            const shouldFail = () => {
                return new pathTemplate_1.PathTemplate('buckets/*/**/**/objects/*');
            };
            chai_1.expect(shouldFail).to.throw(TypeError);
        });
    });
    describe('method `match`', () => {
        it('should fail on an impossible match', () => {
            const t = new pathTemplate_1.PathTemplate('hello/world');
            const mismatches = ['hello', 'hello/world/fail'];
            mismatches.forEach(m => {
                chai_1.expect(() => {
                    t.match(m);
                }).to.throw(TypeError);
            });
        });
        it('should fail on mismatched literal', () => {
            const t = new pathTemplate_1.PathTemplate('hello/world');
            const mismatches = ['hello/world2', 'hello/world3'];
            mismatches.forEach(m => {
                chai_1.expect(() => {
                    t.match(m);
                }).to.throw(TypeError);
            });
        });
        it('should match atomic resource name', () => {
            const tests = [
                {
                    path: 'buckets/f/o/objects/bar',
                    template: 'buckets/*/*/objects/*',
                    want: {
                        $0: 'f',
                        $1: 'o',
                        $2: 'bar',
                    },
                },
                {
                    path: 'buckets/world',
                    template: 'buckets/{hello}',
                    want: {
                        hello: 'world',
                    },
                },
                {
                    path: 'buckets/world',
                    template: 'buckets/{hello=*}',
                    want: {
                        hello: 'world',
                    },
                },
            ];
            tests.forEach(t => {
                const template = new pathTemplate_1.PathTemplate(t.template);
                chai_1.expect(template.match(t.path)).to.eql(t.want);
            });
        });
        it('should match escaped chars', () => {
            const template = new pathTemplate_1.PathTemplate('buckets/*/objects');
            const want = { $0: 'hello%2F%2Bworld' };
            chai_1.expect(template.match('buckets/hello%2F%2Bworld/objects')).to.eql(want);
        });
        it('should match template with unbounded wildcard', () => {
            const template = new pathTemplate_1.PathTemplate('buckets/*/objects/**');
            const want = { $0: 'foo', $1: 'bar/baz' };
            chai_1.expect(template.match('buckets/foo/objects/bar/baz')).to.eql(want);
        });
        it('should match template with unbound in the middle', () => {
            const template = new pathTemplate_1.PathTemplate('bar/**/foo/*');
            const want = { $0: 'foo/foo', $1: 'bar' };
            chai_1.expect(template.match('bar/foo/foo/foo/bar')).to.eql(want);
        });
    });
    describe('method `render`', () => {
        it('should render atomic resource', () => {
            const template = new pathTemplate_1.PathTemplate('buckets/*/*/*/objects/*');
            const params = {
                $0: 'f',
                $1: 'o',
                $2: 'o',
                $3: 'google.com:a-b',
            };
            const want = 'buckets/f/o/o/objects/google.com:a-b';
            chai_1.expect(template.render(params)).to.eql(want);
        });
        it('should fail when there are too few variables', () => {
            const template = new pathTemplate_1.PathTemplate('buckets/*/*/*/objects/*');
            const params = {
                $0: 'f',
                $1: 'o',
                $2: 'o',
            };
            chai_1.expect(() => {
                template.render(params);
            }).to.throw(TypeError);
        });
        it('should succeed with an unbound in the middle', () => {
            const template = new pathTemplate_1.PathTemplate('bar/**/foo/*');
            const params = {
                $0: '1/2',
                $1: '3',
            };
            const want = 'bar/1/2/foo/3';
            chai_1.expect(template.render(params)).to.eql(want);
        });
    });
    describe('method `inspect`', () => {
        const tests = {
            'bar/**/foo/*': 'bar/{$0=**}/foo/{$1=*}',
            'buckets/*/objects/*': 'buckets/{$0=*}/objects/{$1=*}',
            '/buckets/{hello}': 'buckets/{hello=*}',
            '/buckets/{hello=what}/{world}': 'buckets/{hello=what}/{world=*}',
            '/buckets/helloazAZ09-.~_what': 'buckets/helloazAZ09-.~_what',
        };
        Object.keys(tests).forEach(template => {
            const want = tests[template];
            it(`should render template ${template} ok`, () => {
                const t = new pathTemplate_1.PathTemplate(template);
                chai_1.expect(t.inspect()).to.eql(want);
            });
        });
    });
});
//# sourceMappingURL=path_template.js.map