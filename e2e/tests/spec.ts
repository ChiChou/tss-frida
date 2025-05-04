import { test } from "node:test";
import { equal } from "node:assert";
import path from "node:path";
import fsp from 'node:fs/promises';

import { __dirname, TSServer } from '../tss.ts';


test('list classes', async (t) => {
    const s = new TSServer();

    const mockFileName = path.join(__dirname, 'test-proj', 'agent', 'index.ts');
    // const fileContent = await fsp.readFile(mockFileName, 'utf-8');
    const fileContent = `ObjC.classes.`;
    await s.sendWithReply('open', {
        file: mockFileName,
        fileContent,
        scriptKindName: 'TS'
    });

    const r2 = await s.sendWithReply('completions', {
        file: mockFileName, line: 1, offset: fileContent.length + 1
    });

    console.log('completions', r2);

    s.close();
});