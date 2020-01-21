#!/usr/bin/env node
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
/**
 * Main function. Takes an array of directories to process.
 * Looks for JSON files matching `PROTO_LIST_REGEX`, parses them to get a list of all
 * proto files used by the client library, and calls `pbjs` to compile them all into
 * JSON (`pbjs -t json`).
 *
 * Exported to be called from a test.
 *
 * @param {string[]} directories List of directories to process. Normally, just the
 * `./src` folder of the given client library.
 */
export declare function main(directories: string[]): Promise<void>;