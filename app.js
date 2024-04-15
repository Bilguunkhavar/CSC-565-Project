const fs = require("fs");
const subProcess = require("child_process");

function isCharNumber(c) {
    return c >= "0" && c <= "9";
}

function isStringNumber(string) {
    if (string[0] === "-") {
        return /^[0-9]*$/.test(string.substring(1));
    }
    return /^[0-9]*$/.test(string);
}

function convertToTokens(rows) {
    const tokens = [];
    let blockStart = false;
    for (let i = 0; i < rows.length; i++) {
        let row = rows[i];
        if (blockStart) {
            if (row.startsWith(" ")) {
                row = row.trim();
            } else {
                blockStart = false;
                tokens.push("END");
            }
        }

        if (row.startsWith("while ")) {
            blockStart = true;
            tokens.push("WHILE");
            const rightSide = row.substring(6);

            if (rightSide.includes("==")) {
                tokens.push("EQ");
                tokens.push(rightSide.split("==")[0].trim());
                tokens.push(rightSide.split("==")[1].trim());
            } else if (rightSide.includes(">=")) {
                tokens.push("GOE");
                tokens.push(rightSide.split(">=")[0].trim());
                tokens.push(rightSide.split(">=")[1].trim());
            } else if (rightSide.includes("<=")) {
                tokens.push("LOE");
                tokens.push(rightSide.split("<=")[0].trim());
                tokens.push(rightSide.split("<=")[1].trim());
            } else if (rightSide.includes(">")) {
                tokens.push("GE");
                tokens.push(rightSide.split(">")[0].trim());
                tokens.push(rightSide.split(">")[1].trim());
            } else if (rightSide.includes("<")) {
                tokens.push("LE");
                tokens.push(rightSide.split("<")[0].trim());
                tokens.push(rightSide.split("<")[1].trim());
            } else {
                console.log(`Error at the while statement "${rows[i]}" at line ${i}`);
                process.exit(1);
            }
        } else if (row.startsWith("if ")) {
            blockStart = true;
            tokens.push("IF");
            const rightSide = row.substring(3);

            if (rightSide.includes("==")) {
                tokens.push("EQ");
                tokens.push(rightSide.split("==")[0].trim());
                tokens.push(rightSide.split("==")[1].trim());
            } else if (rightSide.includes(">=")) {
                tokens.push("GOE");
                tokens.push(rightSide.split(">=")[0].trim());
                tokens.push(rightSide.split(">=")[1].trim());
            } else if (rightSide.includes("<=")) {
                tokens.push("LOE");
                tokens.push(rightSide.split("<=")[0].trim());
                tokens.push(rightSide.split("<=")[1].trim());
            } else if (rightSide.includes(">")) {
                tokens.push("GE");
                tokens.push(rightSide.split(">")[0].trim());
                tokens.push(rightSide.split(">")[1].trim());
            } else if (rightSide.includes("<")) {
                tokens.push("LE");
                tokens.push(rightSide.split("<")[0].trim());
                tokens.push(rightSide.split("<")[1].trim());
            } else {
                console.log(`Error at the if statement "${rows[i]}" at line ${i}`);
                process.exit(1);
            }
        } else if (row.startsWith("print ")) {
            tokens.push("PRINT");
            tokens.push(row.substring(6));
        } else if (row.startsWith("unsigned ")) {
            tokens.push("USIG");
            tokens.push(row.substring(9));
        } else if (row.startsWith("signed ")) {
            tokens.push("SIG");
            tokens.push(row.substring(7));
        } else if (row.includes("=")) {
            tokens.push("SET");
            const assign = row.split("=");
            tokens.push(assign[0].trim());
            const rightSide = assign[1].trim().split(" ").join("");

            if (rightSide.length === 0) {
                console.log(`Unknown keyword "${rows[i]}" at line ${i}`);
                process.exit(1);
            }

            let l = 0;
            let r = 0;

            while (r < rightSide.length) {
                if (r === rightSide.length - 1) {
                    tokens.push(rightSide.substring(l));
                } else if (rightSide[r] === "+") {
                    tokens.push(rightSide.substring(l, r));
                    tokens.push("ADD");
                    l = r + 1;
                } else if (rightSide[r] === "-") {
                    tokens.push(rightSide.substring(l, r));
                    tokens.push("SUB");
                    l = r + 1;
                } else if (rightSide[r] === "*") {
                    tokens.push(rightSide.substring(l, r));
                    tokens.push("MULT");
                    l = r + 1;
                } else if (rightSide[r] === "/") {
                    tokens.push(rightSide.substring(l, r));
                    tokens.push("DIV");
                    l = r + 1;
                }
                r++;
            }

            tokens.push("END");
        } else {
            console.log(`Unknown keyword "${rows[i]}" at line ${i}`);
            process.exit(1);
        }

        if (i === rows.length - 1 && blockStart) {
            tokens.push("END");
        }
    }

    return tokens;
}

function convertLMCtoYMC(fullFileName) {
    const rows = fs
        .readFileSync(fullFileName, "utf-8")
        .trim()
        .split("\n")
        .filter((x) => x.trimEnd())
        .map((x) => {
            if (x.endsWith("\r")) {
                return x.substring(0, x.length - 1);
            }
            return x;
        });

    const tokens = convertToTokens(rows);

    console.log(tokens);

    let printVariableIndex = 0;
    let ifIndex = 0;
    let whileIndex = 0;
    const variables = [];
    const prints = [];
    let currentBlock = [];
    const mainBlock = [];
    const labelBlock = [];
    let ifOpen = false;
    let whileOpen = false;

    let i = 0;
    while (i < tokens.length) {
        const action = tokens[i];
        if (action === "END") {
            if (ifOpen) {
                currentBlock.push(`jmp userIf${ifIndex}Rest`);
                labelBlock.push(currentBlock.join("\n\t"));
                currentBlock = [];
                ifIndex++;
                ifOpen = false;
            }

            if (whileOpen) {
                currentBlock.push(`jmp userWhile${whileIndex}Start`);
                labelBlock.push(currentBlock.join("\n\t"));
                currentBlock = [];
                whileIndex++;
                whileOpen = false;
            }
        } else if (action === "USIG" || action === "SIG") {
            const vars = tokens[i + 1].split(" ");

            for (const v of vars) {
                variables.push(`user${v}: ${action === "USIG" ? "US" : "S"} 0`);
            }
            i++;
        } else if (action === "SET") {
            const name = tokens[i + 1];
            const first = tokens[i + 2];

            if (isCharNumber(first[0])) {
                currentBlock.push(`MOV eax, ${first}`);
            } else {
                currentBlock.push(`MOV eax, [user${first}]`);
            }

            let p = i + 3;

            while (tokens[p] !== "END") {
                const t = tokens[p];

                if (isCharNumber(tokens[p + 1][0])) {
                    currentBlock.push(`MOV ebx, ${tokens[p + 1]}`);
                } else {
                    currentBlock.push(`MOV ebx, [user${tokens[p + 1]}]`);
                }

                if (t === "ADD") {
                    currentBlock.push("ADD eax, ebx");
                } else if (t === "SUB") {
                    currentBlock.push("SUB eax, ebx");
                } else if (t === "MULT") {
                    currentBlock.push("MUL eax, ebx");
                } else if (t === "DIV") {
                    currentBlock.push("DIV eax, ebx");
                }
                p += 2;
            }
            currentBlock.push(`MOV [user${name}], eax`);

            i = p;
        } else if (action === "PRINT") {
            const p = tokens[i + 1];
            if (p.startsWith(`"`)) {
                currentBlock.push(`MOV eax, [print${printVariableIndex}]`);
                currentBlock.push("PRINT");

                prints.push(`print${printVariableIndex}: ${p}, ${p.length - 2}`);
                printVariableIndex++;
            } else if (isCharNumber(p[0])) {
                currentBlock.push(`MOV eax, ${p}`);
                currentBlock.push("PRINTN");
            } else {
                currentBlock.push(`MOV eax, [user${p}]`);
                currentBlock.push("PRINTV");
            }
            i++;
        } else if (action === "IF") {
            ifOpen = true;
            const s = tokens[i + 1];
            const l = tokens[i + 2];
            const r = tokens[i + 3];
            if (isCharNumber(l[0])) {
                currentBlock.push(`MOV eax, ${l}`);
            } else {
                currentBlock.push(`MOV eax, [user${l}]`);
            }

            if (isCharNumber(r[0])) {
                currentBlock.push(`MOV ebx, ${r}`);
            } else {
                currentBlock.push(`MOV ebx, [user${r}]`);
            }

            currentBlock.push("CMP eax, ebx");

            if (s === "EQ") {
                currentBlock.push(`JE userIf${ifIndex}`);
            } else if (s === "GOE") {
                currentBlock.push(`JGE userIf${ifIndex}`);
            } else if (s === "LOE") {
                currentBlock.push(`JLE userIf${ifIndex}`);
            } else if (s === "GE") {
                currentBlock.push(`JG userIf${ifIndex}`);
            } else if (s === "LE") {
                currentBlock.push(`JL userIf${ifIndex}`);
            }

            currentBlock.push(`userIf${ifIndex}Rest:`);

            mainBlock.push(currentBlock.join("\n\t"));
            currentBlock = [];

            labelBlock.push(`userIf${ifIndex}:`);
            i = i + 3;
        } else if (action === "WHILE") {
            whileOpen = true;
            const s = tokens[i + 1];
            const l = tokens[i + 2];
            const r = tokens[i + 3];
            currentBlock.push(`userWhile${whileIndex}Start:`);

            if (isCharNumber(l[0])) {
                currentBlock.push(`MOV eax, ${l}`);
            } else {
                currentBlock.push(`MOV eax, [user${l}]`);
            }

            if (isCharNumber(r[0])) {
                currentBlock.push(`MOV ebx, ${r}`);
            } else {
                currentBlock.push(`MOV ebx, [user${r}]`);
            }

            currentBlock.push("CMP eax, ebx");

            if (s === "EQ") {
                currentBlock.push(`JE userWhile${whileIndex}`);
            } else if (s === "GOE") {
                currentBlock.push(`JGE userWhile${whileIndex}`);
            } else if (s === "LOE") {
                currentBlock.push(`JLE userWhile${whileIndex}`);
            } else if (s === "GE") {
                currentBlock.push(`JG userWhile${whileIndex}`);
            } else if (s === "LE") {
                currentBlock.push(`JL userWhile${whileIndex}`);
            }

            // currentBlock.push(`userWhile${whileIndex}Start:`);

            mainBlock.push(currentBlock.join("\n\t"));
            currentBlock = [];

            labelBlock.push(`userWhile${whileIndex}:`);
            i = i + 3;
        }
        i++;
    }

    mainBlock.push(currentBlock.join("\n\t"));
    mainBlock.push("EXIT");

    const varsTempate =
        variables.length === 0
            ? ""
            : `vars:
${"\t" + variables.join("\n\t")}`;
    const printTempate =
        prints.length === 0
            ? ""
            : `prints:
${"\t" + prints.join("\n\t")}`;

    return `
${varsTempate}

${printTempate}

main:
${"\t" + mainBlock.join("\n\t")}

${labelBlock.join("\n\t")}
`;
}

function convertYMCtoBinary(fileName) {
    const rows = fs
        .readFileSync(fileName, "utf-8")
        .trim()
        .split("\n")
        .filter((x) => x.trim())
        .map((x) => {
            x = x.split("\t").join("");
            if (x.endsWith("\r")) {
                return x.substring(0, x.length - 1);
            }
            return x;
        });

    console.log(rows);

    let byteCount = 0;

    const REGS = new Set(["eax", "ebx", "ecx", "edx"]);

    const map = new Map([
        ["MOV1", [0xaa, 4]],
        ["MOV2", [0xab, 4]],
        ["MOV3", [0xac, 4]],
        ["MOV4", [0xad, 4]],
        ["ADD", [0xb0, 4]],
        ["SUB", [0xb1, 4]],
        ["MUL", [0xb2, 4]],
        ["DIV", [0xb3, 4]],
        ["CMP", [0xf0, 4]],
        ["JG", [0xd0, 4]],
        ["JGE", [0xd1, 4]],
        ["JL", [0xd2, 4]],
        ["JLE", [0xd3, 4]],
        ["JNE", [0xd4, 4]],
        ["JE", [0xd5, 4]],
        ["PRINT", [0x80, 4]],
        ["PRINTN", [0x81, 4]],
        ["PRINTV", [0x82, 4]],
        ["PRINTV", [0x82, 4]],
        ["JMP", [0x55, 2]],
        ["eax", [0x01, 1]],
        ["ebx", [0x02, 1]],
        ["ecx", [0x03, 1]],
        ["edx", [0x04, 1]],
    ]);

    let binaryCode = Buffer.from([]);

    const localVars = new Map();
    let unsignedSize = 0;
    let signedSize = 0;
    let printSize = 0;

    // Store variables
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].startsWith("vars:")) {
            for (j = i + 1; j < rows.length; j++) {
                if (rows[j].trim() === "" || rows[j].endsWith(":")) {
                    break;
                }
                const comps = rows[j].split(": ");
                const varName = comps[0];
                const varVal = comps[1].split(" ")[0];

                if (varVal === "US") {
                    localVars.set(varName, [unsignedSize + 0xb0, +comps[1].split(" ")[1]]);
                    unsignedSize++;
                } else if (varVal === "S") {
                    localVars.set(varName, [signedSize + 0xa0, +comps[1].split(" ")[1]]);
                    signedSize++;
                }
            }
            break;
        }
    }

    // Print variables
    for (let i = 0; i < rows.length; i++) {
        if (rows[i].startsWith("prints:")) {
            for (j = i + 1; j < rows.length; j++) {
                if (rows[j].trim() === "" || rows[j].endsWith(":")) {
                    break;
                }
                const comps = rows[j].split(": ");
                const varName = comps[0];
                const varVal = comps[1].split('", ')[0];

                localVars.set(varName, [printSize + 0xc0, varVal.substring(1), +comps[1].split('", ')[1]]);
                printSize++;
            }
            break;
        }
    }

    console.log(localVars);

    const jumpToIndex = new Map();
    const indexToJump = new Map();

    // main function
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        if (row.endsWith(":")) {
            if (row.startsWith("main") || row.startsWith("prints") || row.startsWith("vars")) {
                continue;
            }

            jumpToIndex.set(row.substring(0, row.length - 1), binaryCode.length);
        } else if (row.startsWith("MOV ")) {
            const [l, r] = row.substring(4).split(", ");
            console.log(l, r);
            const mc = [0x00, 0x00, 0x00, 0x00];
            if (l.startsWith("[")) {
                mc[0] = 0xac;
                mc[2] = localVars.get(l.substring(1, l.length - 1))[0];
                mc[3] = map.get(r)[0];
            } else if (r.startsWith("[")) {
                mc[0] = 0xad;
                mc[2] = map.get(l)[0];
                console.log(localVars);
                console.log(r);
                mc[3] = localVars.get(r.substring(1, r.length - 1))[0];
            } else if (REGS.has(l)) {
                if (isStringNumber(r)) {
                    mc[0] = 0xaa;
                    mc[2] = map.get(l)[0];
                    mc[3] = +r;
                }
            }

            console.log(mc);

            binaryCode = Buffer.concat([binaryCode, Buffer.from(mc)]);
        } else if (row.startsWith("CMP ")) {
            const l = row.substring(4).split(", ")[0];
            const r = row.substring(4).split(", ")[1];
            binaryCode = Buffer.concat([binaryCode, Buffer.from([0xf0, map.get(l)[0], map.get(r)[0], 0])]);
        } else if (row.startsWith("JG ")) {
            const jumpTo = row.substring(3);
            const index = binaryCode.length + 1;
            indexToJump.set(index, jumpTo);
            binaryCode = Buffer.concat([binaryCode, Buffer.from([0xd0, 0])]);
        } else if (row.startsWith("JGE ")) {
            const jumpTo = row.substring(3);
            const index = binaryCode.length + 1;
            indexToJump.set(index, jumpTo);
            binaryCode = Buffer.concat([binaryCode, Buffer.from([0xd1, 0])]);
        } else if (row.startsWith("JL ")) {
            const jumpTo = row.substring(3);
            const index = binaryCode.length + 1;
            indexToJump.set(index, jumpTo);
            binaryCode = Buffer.concat([binaryCode, Buffer.from([0xd2, 0])]);
        } else if (row.startsWith("JLE ")) {
            const jumpTo = row.substring(3);
            const index = binaryCode.length + 1;
            indexToJump.set(index, jumpTo);
            binaryCode = Buffer.concat([binaryCode, Buffer.from([0xd3, 0])]);
        } else if (row.startsWith("JNE ")) {
            const jumpTo = row.substring(3);
            const index = binaryCode.length + 1;
            indexToJump.set(index, jumpTo);
            binaryCode = Buffer.concat([binaryCode, Buffer.from([0xd4, 0])]);
        } else if (row.startsWith("JE ")) {
            const jumpTo = row.substring(3);
            const index = binaryCode.length + 1;
            indexToJump.set(index, jumpTo);
            binaryCode = Buffer.concat([binaryCode, Buffer.from([0xd5, 0])]);
        } else if (row.startsWith("ADD ")) {
            const r1 = row.substring(4).split(", ")[0];
            const r2 = row.substring(4).split(", ")[1];

            binaryCode = Buffer.concat([binaryCode, Buffer.from([0xb0, 0, map.get(r1)[0], map.get(r2)[0]])]);
        } else if (row.startsWith("SUB ")) {
            const r1 = row.substring(4).split(", ")[0];
            const r2 = row.substring(4).split(", ")[1];

            binaryCode = Buffer.concat([binaryCode, Buffer.from([0xb1, 0, map.get(r1)[0], map.get(r2)[0]])]);
        } else if (row.startsWith("MUL ")) {
            const r1 = row.substring(4).split(", ")[0];
            const r2 = row.substring(4).split(", ")[1];
            binaryCode = Buffer.concat([binaryCode, Buffer.from([0xb2, 0, map.get(r1)[0], map.get(r2)[0]])]);
        } else if (row.startsWith("DIV ")) {
            const r1 = row.substring(4).split(", ")[0];
            const r2 = row.substring(4).split(", ")[1];
            binaryCode = Buffer.concat([binaryCode, Buffer.from([0xb3, 0, map.get(r1)[0], map.get(r2)[0]])]);
        } else if (row === "PRINT") {
            binaryCode = Buffer.concat([binaryCode, Buffer.from([0x80, 0])]);
        } else if (row === "PRINTN") {
            binaryCode = Buffer.concat([binaryCode, Buffer.from([0x81, 0])]);
        } else if (row === "PRINTV") {
            binaryCode = Buffer.concat([binaryCode, Buffer.from([0x82, 0])]);
        }
    }

    console.log({ indexToJump });
    console.log({ jumpToIndex });

    for (const [key, value] of indexToJump.entries()) {
        binaryCode[key] = jumpToIndex.get(value);
    }

    console.log(binaryCode.length);
    return Buffer.from(binaryCode);
}

(async () => {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log("Please specify file name of your High Level Code");
        process.exit(1);
    }

    const fullFileName = args[0];

    if (!fullFileName.endsWith("hlc")) {
        console.log("The file format should be hlc");
        process.exit(1);
    }

    const assemblyCode = convertLMCtoYMC(fullFileName);

    const filename = fullFileName.split(".")[0];
    const assemblyFileName = `${filename}.ymc`;

    fs.writeFileSync(assemblyFileName, assemblyCode);

    const binaryFileName = `${filename}.bymc`;

    const binaryCode = convertYMCtoBinary(assemblyFileName);

    fs.writeFileSync(binaryFileName, binaryCode);

    console.log(binaryCode);
})();
