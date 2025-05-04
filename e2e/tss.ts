import { server as tss } from 'typescript';

import * as path from 'node:path';
import { ChildProcess, fork } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createInterface, Interface } from 'node:readline';
import { EventEmitter } from 'node:events';


const DEBUG_PORT = 5999;

export const __server = fileURLToPath(import.meta.resolve('typescript/lib/tsserver.js'));
export const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class TSServer extends EventEmitter {
    private server: ChildProcess;
    private seq = 0;

    private rl: Interface;

    constructor() {
        super();

        const logfile = path.join(__dirname, 'tsserver.log');
        const server = this.server = fork(__server, [
            '--logVerbosity', 'verbose',
            '--logFile', logfile,
            '--pluginProbeLocations', path.join(__dirname, 'test-proj')
        ], {
            cwd: __dirname,
            stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
            execArgv: [`--inspect=${DEBUG_PORT}`]
        });

        if (!server || !server.stdout)
            throw new Error('Failed to start TypeScript server');

        server.stdout.setEncoding('utf-8');

        this.rl = createInterface({
            input: server.stdout,
        }).on('line', (line: string) => {
            // simplify the logic: don't parse Content-Length, simply detect if it's a JSON literal

            if (line.startsWith('{')) {
                const response = JSON.parse(line) as tss.protocol.Response;
                this.emit(response.type, response);
                return;
            } else if (line.match(/Content-Length:\s*\d+/i) || line.trim() === '') {
                return;
            }

            throw new Error('Invalid line: ' + line);
        });

        // if debug
        server.stdout.pipe(process.stdout);
    }

    send(cmd: string, args?: any) {
        const seq = ++this.seq;
        const request: tss.protocol.Request = {
            seq,
            type: 'request',
            command: cmd,
            arguments: args
        };
        this.#write(request);
    }

    sendWithReply(cmd: string, args?: any) {
        const seq = ++this.seq;
        const promise = new Promise<tss.protocol.Response>((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.removeListener('response', listener);
                reject(new Error(`Request timed out: ${cmd}`));
            }, 5000); // 5 seconds timeout

            const listener = (response: tss.protocol.Response) => {
                if (response.command === cmd && response.request_seq === seq) {
                    clearTimeout(timeout);
                    this.removeListener('response', listener);
                    resolve(response);
                }
            };

            this.on('response', listener);
        });

        const request: tss.protocol.Request = {
            seq,
            type: 'request',
            command: cmd,
            arguments: args
        };
        this.#write(request);
        return promise;
    }

    #write(request: tss.protocol.Request) {
        this.server.stdin?.write(JSON.stringify(request) + '\n');
    }

    close() {
        this.server.stdin?.end();
    }
}
