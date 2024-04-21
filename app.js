const fs = require("fs");

let col1 = [];

function objectToCsv(arr) {
    const cols = Object.keys(arr[0]);
    const csv = [cols.join(",")];
    for (const o of arr) {
        const row = [];
        for (const col of cols) {
            row.push(o[col]);
        }
        csv.push(row.join(","));
    }
    return csv.join("\n");
}

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
                tokens.push([i, "END"]);
            }
        }

        if (row.startsWith("while ")) {
            blockStart = true;
            tokens.push([i, "WHILE"]);
            const rightSide = row.substring(6);

            if (rightSide.includes("==")) {
                tokens.push([i, "EQ"]);
                tokens.push([i, rightSide.split("==")[0].trim()]);
                tokens.push([i, rightSide.split("==")[1].trim()]);
            } else if (rightSide.includes(">=")) {
                tokens.push([i, "GOE"]);
                tokens.push([i, rightSide.split(">=")[0].trim()]);
                tokens.push([i, rightSide.split(">=")[1].trim()]);
            } else if (rightSide.includes("<=")) {
                tokens.push([i, "LOE"]);
                tokens.push([i, rightSide.split("<=")[0].trim()]);
                tokens.push([i, rightSide.split("<=")[1].trim()]);
            } else if (rightSide.includes(">")) {
                tokens.push([i, "GE"]);
                tokens.push([i, rightSide.split(">")[0].trim()]);
                tokens.push([i, rightSide.split(">")[1].trim()]);
            } else if (rightSide.includes("<")) {
                tokens.push([i, "LE"]);
                tokens.push([i, rightSide.split("<")[0].trim()]);
                tokens.push([i, rightSide.split("<")[1].trim()]);
            } else {
                console.log(`Error at the while statement "${rows[i]}" at line ${i}`);
                process.exit(1);
            }
        } else if (row.startsWith("if ")) {
            blockStart = true;
            tokens.push([i, "IF"]);
            const rightSide = row.substring(3);

            if (rightSide.includes("==")) {
                tokens.push([i, "EQ"]);
                tokens.push([i, rightSide.split("==")[0].trim()]);
                tokens.push([i, rightSide.split("==")[1].trim()]);
            } else if (rightSide.includes(">=")) {
                tokens.push([i, "GOE"]);
                tokens.push([i, rightSide.split(">=")[0].trim()]);
                tokens.push([i, rightSide.split(">=")[1].trim()]);
            } else if (rightSide.includes("<=")) {
                tokens.push([i, "LOE"]);
                tokens.push([i, rightSide.split("<=")[0].trim()]);
                tokens.push([i, rightSide.split("<=")[1].trim()]);
            } else if (rightSide.includes(">")) {
                tokens.push([i, "GE"]);
                tokens.push([i, rightSide.split(">")[0].trim()]);
                tokens.push([i, rightSide.split(">")[1].trim()]);
            } else if (rightSide.includes("<")) {
                tokens.push([i, "LE"]);
                tokens.push([i, rightSide.split("<")[0].trim()]);
                tokens.push([i, rightSide.split("<")[1].trim()]);
            } else {
                console.log(`Error at the if statement "${rows[i]}" at line ${i}`);
                process.exit(1);
            }
        } else if (row.startsWith("print ")) {
            tokens.push([i, "PRINT"]);
            tokens.push([i, row.substring(6)]);
        } else if (row.startsWith("unsigned ")) {
            tokens.push([i, "USIG"]);
            tokens.push([i, row.substring(9)]);
        } else if (row.startsWith("signed ")) {
            tokens.push([i, "SIG"]);
            tokens.push([i, row.substring(7)]);
        } else if (row.includes("=")) {
            tokens.push([i, "SET"]);
            const assign = row.split("=");
            tokens.push([i, assign[0].trim()]);
            const rightSide = assign[1].trim().split(" ").join("");

            if (rightSide.length === 0) {
                console.log(`Unknown keyword "${rows[i]}" at line ${i}`);
                process.exit(1);
            }

            let l = 0;
            let r = 0;

            while (r < rightSide.length) {
                if (r === rightSide.length - 1) {
                    tokens.push([i, rightSide.substring(l)]);
                } else if (rightSide[r] === "+") {
                    tokens.push([i, rightSide.substring(l, r)]);
                    tokens.push([i, "ADD"]);
                    l = r + 1;
                } else if (rightSide[r] === "-") {
                    tokens.push([i, rightSide.substring(l, r)]);
                    tokens.push([i, "SUB"]);
                    l = r + 1;
                } else if (rightSide[r] === "*") {
                    tokens.push([i, rightSide.substring(l, r)]);
                    tokens.push([i, "MULT"]);
                    l = r + 1;
                } else if (rightSide[r] === "/") {
                    tokens.push([i, rightSide.substring(l, r)]);
                    tokens.push([i, "DIV"]);
                    l = r + 1;
                }
                r++;
            }

            tokens.push([i, "END"]);
        } else {
            console.log(`Unknown keyword "${rows[i]}" at line ${i}`);
            process.exit(1);
        }

        if (i === rows.length - 1 && blockStart) {
            tokens.push([i, "END"]);
        }
    }
    return tokens;
}

function convertLMCtoYMC(tokens) {
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
        const action = tokens[i][1];
        const index = tokens[i][0];
        if (action === "END") {
            if (ifOpen) {
                currentBlock.push(`JMP userIf${ifIndex}Rest`);
                col1[index]["YMC assembly"].push(`JMP userIf${ifIndex}Rest`);
                labelBlock.push(currentBlock.join("\n\t"));
                currentBlock = [];
                ifIndex++;
                ifOpen = false;
            }

            if (whileOpen) {
                currentBlock.push(`JMP userWhile${whileIndex}Start`);
                col1[index]["YMC assembly"].push(`JMP userWhile${whileIndex}Start`);
                labelBlock.push(currentBlock.join("\n\t"));
                currentBlock = [];
                whileIndex++;
                whileOpen = false;
            }
        } else if (action === "USIG" || action === "SIG") {
            const vars = tokens[i + 1][1].split(" ");

            for (const v of vars) {
                variables.push(`user${v}: ${action === "USIG" ? "US" : "S"} 0`);
                col1[index]["YMC assembly"].push(`user${v}: ${action === "USIG" ? "US" : "S"} 0`);
            }
            i++;
        } else if (action === "SET") {
            const name = tokens[i + 1][1];
            const first = tokens[i + 2][1];

            if (isCharNumber(first[0])) {
                currentBlock.push(`MOV eax, ${first}`);
                col1[index]["YMC assembly"].push(`MOV eax, ${first}`);
                col1[index]["Modified registers"].add("eax");
            } else {
                currentBlock.push(`MOV eax, [user${first}]`);
                col1[index]["YMC assembly"].push(`MOV eax, [user${first}]`);
                col1[index]["Modified registers"].add("eax");
            }

            let p = i + 3;

            while (tokens[p][1] !== "END") {
                const t = tokens[p][1];

                if (isCharNumber(tokens[p + 1][1][0])) {
                    currentBlock.push(`MOV ebx, ${tokens[p + 1][1]}`);
                    col1[index]["YMC assembly"].push(`MOV ebx, ${tokens[p + 1][1]}`);
                    col1[index]["Modified registers"].add("ebx");
                } else {
                    currentBlock.push(`MOV ebx, [user${tokens[p + 1][1]}]`);
                    col1[index]["YMC assembly"].push(`MOV ebx, [user${tokens[p + 1][1]}]`);
                    col1[index]["Modified registers"].add("ebx");
                }

                if (t === "ADD") {
                    currentBlock.push("ADD eax, ebx");
                    col1[index]["YMC assembly"].push("ADD eax, ebx");
                    col1[index]["Modified registers"].add("eax");
                } else if (t === "SUB") {
                    currentBlock.push("SUB eax, ebx");
                    col1[index]["YMC assembly"].push("SUB eax, ebx");
                    col1[index]["Modified registers"].add("eax");
                } else if (t === "MULT") {
                    currentBlock.push("MUL eax, ebx");
                    col1[index]["YMC assembly"].push("MUL eax, ebx");
                    col1[index]["Modified registers"].add("eax");
                } else if (t === "DIV") {
                    currentBlock.push("DIV eax, ebx");
                    col1[index]["YMC assembly"].push("DIV eax, ebx");
                    col1[index]["Modified registers"].add("eax");
                }
                p += 2;
            }
            currentBlock.push(`MOV [user${name}], eax`);
            col1[index]["YMC assembly"].push(`MOV [user${name}], eax`);

            i = p;
        } else if (action === "PRINT") {
            const p = tokens[i + 1][1];
            if (p.startsWith(`"`)) {
                currentBlock.push(`MOV eax, [print${printVariableIndex}]`);
                col1[index]["YMC assembly"].push(`MOV eax, [print${printVariableIndex}]`);

                currentBlock.push("PRINT");
                col1[index]["YMC assembly"].push("PRINT");
                col1[index]["Modified registers"].add("eax");

                prints.push(`print${printVariableIndex}: ${p}, ${p.length - 2}`);
                printVariableIndex++;
            } else if (isCharNumber(p[0])) {
                currentBlock.push(`MOV eax, ${p}`);
                col1[index]["YMC assembly"].push(`MOV eax, ${p}`);

                currentBlock.push("PRINTN");
                col1[index]["YMC assembly"].push("PRINTN");
                col1[index]["Modified registers"].add("eax");
            } else {
                currentBlock.push(`MOV eax, [user${p}]`);
                col1[index]["YMC assembly"].push(`MOV eax, [user${p}]`);

                currentBlock.push("PRINTV");
                col1[index]["YMC assembly"].push("PRINTV");
                col1[index]["Modified registers"].add("eax");
            }
            i++;
        } else if (action === "IF") {
            ifOpen = true;
            const s = tokens[i + 1][1];
            const l = tokens[i + 2][1];
            const r = tokens[i + 3][1];
            if (isCharNumber(l[0])) {
                currentBlock.push(`MOV eax, ${l}`);
                col1[index]["YMC assembly"].push(`MOV eax, ${l}`);
                col1[index]["Modified registers"].add("eax");
            } else {
                currentBlock.push(`MOV eax, [user${l}]`);
                col1[index]["YMC assembly"].push(`MOV eax, [user${l}]`);
                col1[index]["Modified registers"].add("eax");
            }

            if (isCharNumber(r[0])) {
                currentBlock.push(`MOV ebx, ${r}`);
                col1[index]["YMC assembly"].push(`MOV ebx, ${r}`);
                col1[index]["Modified registers"].add("ebx");
            } else {
                currentBlock.push(`MOV ebx, [user${r}]`);
                col1[index]["YMC assembly"].push(`MOV ebx, [user${r}]`);
                col1[index]["Modified registers"].add("ebx");
            }

            currentBlock.push("CMP eax, ebx");
            col1[index]["YMC assembly"].push("CMP eax, ebx");

            if (s === "EQ") {
                currentBlock.push(`JE userIf${ifIndex}`);
                col1[index]["YMC assembly"].push(`JE userIf${ifIndex}`);
            } else if (s === "GOE") {
                currentBlock.push(`JGE userIf${ifIndex}`);
                col1[index]["YMC assembly"].push(`JGE userIf${ifIndex}`);
            } else if (s === "LOE") {
                currentBlock.push(`JLE userIf${ifIndex}`);
                col1[index]["YMC assembly"].push(`JLE userIf${ifIndex}`);
            } else if (s === "GE") {
                currentBlock.push(`JG userIf${ifIndex}`);
                col1[index]["YMC assembly"].push(`JG userIf${ifIndex}`);
            } else if (s === "LE") {
                currentBlock.push(`JL userIf${ifIndex}`);
                col1[index]["YMC assembly"].push(`JL userIf${ifIndex}`);
            }

            currentBlock.push(`userIf${ifIndex}Rest:`);
            col1[index]["YMC assembly"].push(`userIf${ifIndex}Rest:`);

            mainBlock.push(currentBlock.join("\n\t"));
            currentBlock = [];

            labelBlock.push(`userIf${ifIndex}:`);
            i = i + 3;
        } else if (action === "WHILE") {
            whileOpen = true;
            const s = tokens[i + 1][1];
            const l = tokens[i + 2][1];
            const r = tokens[i + 3][1];
            currentBlock.push(`userWhile${whileIndex}Start:`);
            col1[index]["YMC assembly"].push(`userWhile${whileIndex}Start:`);

            if (isCharNumber(l[0])) {
                currentBlock.push(`MOV eax, ${l}`);
                col1[index]["YMC assembly"].push(`MOV eax, ${l}`);
                col1[index]["Modified registers"].add("eax");
            } else {
                currentBlock.push(`MOV eax, [user${l}]`);
                col1[index]["YMC assembly"].push(`MOV eax, [user${l}]`);
                col1[index]["Modified registers"].add("eax");
            }

            if (isCharNumber(r[0])) {
                currentBlock.push(`MOV ebx, ${r}`);
                col1[index]["YMC assembly"].push(`MOV ebx, ${r}`);
                col1[index]["Modified registers"].add("ebx");
            } else {
                currentBlock.push(`MOV ebx, [user${r}]`);
                col1[index]["YMC assembly"].push(`MOV ebx, [user${r}]`);
                col1[index]["Modified registers"].add("ebx");
            }

            currentBlock.push("CMP eax, ebx");
            col1[index]["YMC assembly"].push("CMP eax, ebx");

            if (s === "EQ") {
                currentBlock.push(`JE userWhile${whileIndex}`);
                col1[index]["YMC assembly"].push(`JE userWhile${whileIndex}`);
            } else if (s === "GOE") {
                currentBlock.push(`JGE userWhile${whileIndex}`);
                col1[index]["YMC assembly"].push(`JGE userWhile${whileIndex}`);
            } else if (s === "LOE") {
                currentBlock.push(`JLE userWhile${whileIndex}`);
                col1[index]["YMC assembly"].push(`JLE userWhile${whileIndex}`);
            } else if (s === "GE") {
                currentBlock.push(`JG userWhile${whileIndex}`);
                col1[index]["YMC assembly"].push(`JG userWhile${whileIndex}`);
            } else if (s === "LE") {
                currentBlock.push(`JL userWhile${whileIndex}`);
                col1[index]["YMC assembly"].push(`JL userWhile${whileIndex}`);
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

    const jumpToIndex = new Map();
    const indexToJump = new Map();

    let startI = 0;
    let startJ = 0;

    // main function
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        [startI, startJ] = findIndex(row, startI, startJ);

        if (row.endsWith(":")) {
            if (row.startsWith("main") || row.startsWith("prints") || row.startsWith("vars")) {
                continue;
            }
            
            jumpToIndex.set(row.substring(0, row.length - 1), binaryCode.length);
        } else if (row.startsWith("MOV ")) {
            const [l, r] = row.substring(4).split(", ");
            const mc = [0x00, 0x00, 0x00, 0x00];
            if (l.startsWith("[")) {
                mc[0] = 0xac;
                mc[2] = localVars.get(l.substring(1, l.length - 1))[0];
                mc[3] = map.get(r)[0];
            } else if (r.startsWith("[")) {
                mc[0] = 0xad;
                mc[2] = map.get(l)[0];
                mc[3] = localVars.get(r.substring(1, r.length - 1))[0];
            } else if (REGS.has(l)) {
                if (isStringNumber(r)) {
                    mc[0] = 0xaa;
                    mc[2] = map.get(l)[0];
                    mc[3] = +r;
                }
            }

            col1[startI]["YMC Address"] =
                col1[startI]["YMC Address"] === 0 ? binaryCode.length : col1[startI]["YMC Address"];
            binaryCode = Buffer.concat([binaryCode, Buffer.from(mc)]);

            col1[startI]["YMC encoding"].push(formatBuffer(Buffer.from(mc)));
        } else if (row.startsWith("CMP ")) {
            const l = row.substring(4).split(", ")[0];
            const r = row.substring(4).split(", ")[1];
            col1[startI]["YMC Address"] =
                col1[startI]["YMC Address"] === 0 ? binaryCode.length : col1[startI]["YMC Address"];
            binaryCode = Buffer.concat([binaryCode, Buffer.from([0xf0, map.get(l)[0], map.get(r)[0], 0])]);
            col1[startI]["YMC encoding"].push(formatBuffer(Buffer.from([0xf0, map.get(l)[0], map.get(r)[0], 0])));
        } else if (row.startsWith("JG ")) {
            const jumpTo = row.substring(3);
            const index = binaryCode.length + 1;
            indexToJump.set(index, jumpTo);
            col1[startI]["YMC Address"] =
                col1[startI]["YMC Address"] === 0 ? binaryCode.length : col1[startI]["YMC Address"];
            binaryCode = Buffer.concat([binaryCode, Buffer.from([0xd0, 0])]);

            col1[startI]["YMC encoding"].push(formatBuffer(Buffer.from([0xd0, 0])));
        } else if (row.startsWith("JGE ")) {
            const jumpTo = row.substring(4);
            const index = binaryCode.length + 1;
            indexToJump.set(index, jumpTo);
            col1[startI]["YMC Address"] =
                col1[startI]["YMC Address"] === 0 ? binaryCode.length : col1[startI]["YMC Address"];
            binaryCode = Buffer.concat([binaryCode, Buffer.from([0xd1, 0])]);

            col1[startI]["YMC encoding"].push(formatBuffer(Buffer.from([0xd1, 0])));
        } else if (row.startsWith("JL ")) {
            const jumpTo = row.substring(3);
            const index = binaryCode.length + 1;
            indexToJump.set(index, jumpTo);
            col1[startI]["YMC Address"] =
                col1[startI]["YMC Address"] === 0 ? binaryCode.length : col1[startI]["YMC Address"];
            binaryCode = Buffer.concat([binaryCode, Buffer.from([0xd2, 0])]);

            col1[startI]["YMC encoding"].push(formatBuffer(Buffer.from([0xd2, 0])));
        } else if (row.startsWith("JLE ")) {
            const jumpTo = row.substring(4);
            const index = binaryCode.length + 1;
            indexToJump.set(index, jumpTo);
            col1[startI]["YMC Address"] =
                col1[startI]["YMC Address"] === 0 ? binaryCode.length : col1[startI]["YMC Address"];
            binaryCode = Buffer.concat([binaryCode, Buffer.from([0xd3, 0])]);

            col1[startI]["YMC encoding"].push(formatBuffer(Buffer.from([0xd3, 0])));
        } else if (row.startsWith("JNE ")) {
            const jumpTo = row.substring(4);
            const index = binaryCode.length + 1;
            indexToJump.set(index, jumpTo);
            col1[startI]["YMC Address"] =
                col1[startI]["YMC Address"] === 0 ? binaryCode.length : col1[startI]["YMC Address"];

            binaryCode = Buffer.concat([binaryCode, Buffer.from([0xd4, 0])]);

            col1[startI]["YMC encoding"].push(formatBuffer(Buffer.from([0xd4, 0])));
        } else if (row.startsWith("JE ")) {
            const jumpTo = row.substring(3);
            const index = binaryCode.length + 1;
            indexToJump.set(index, jumpTo);
            col1[startI]["YMC Address"] =
                col1[startI]["YMC Address"] === 0 ? binaryCode.length : col1[startI]["YMC Address"];

            binaryCode = Buffer.concat([binaryCode, Buffer.from([0xd5, 0])]);

            col1[startI]["YMC encoding"].push(formatBuffer(Buffer.from([0xd5, 0])));
        } else if (row.startsWith("JMP ")) {
            const jumpTo = row.substring(4);
            const index = binaryCode.length + 1;
            indexToJump.set(index, jumpTo);
            col1[startI]["YMC Address"] =
                col1[startI]["YMC Address"] === 0 ? binaryCode.length : col1[startI]["YMC Address"];

            binaryCode = Buffer.concat([binaryCode, Buffer.from([0x55, 0])]);

            col1[startI]["YMC encoding"].push(formatBuffer(Buffer.from([0x55, 0])));
        } else if (row.startsWith("ADD ")) {
            const r1 = row.substring(4).split(", ")[0];
            const r2 = row.substring(4).split(", ")[1];

            col1[startI]["YMC Address"] =
                col1[startI]["YMC Address"] === 0 ? binaryCode.length : col1[startI]["YMC Address"];

            binaryCode = Buffer.concat([binaryCode, Buffer.from([0xb0, 0, map.get(r1)[0], map.get(r2)[0]])]);

            col1[startI]["YMC encoding"].push(formatBuffer(Buffer.from([0xb0, 0, map.get(r1)[0], map.get(r2)[0]])));
        } else if (row.startsWith("SUB ")) {
            const r1 = row.substring(4).split(", ")[0];
            const r2 = row.substring(4).split(", ")[1];
            col1[startI]["YMC Address"] =
                col1[startI]["YMC Address"] === 0 ? binaryCode.length : col1[startI]["YMC Address"];

            binaryCode = Buffer.concat([binaryCode, Buffer.from([0xb1, 0, map.get(r1)[0], map.get(r2)[0]])]);

            col1[startI]["YMC encoding"].push(formatBuffer(Buffer.from([0xb1, 0, map.get(r1)[0], map.get(r2)[0]])));
        } else if (row.startsWith("MUL ")) {
            const r1 = row.substring(4).split(", ")[0];
            const r2 = row.substring(4).split(", ")[1];
            col1[startI]["YMC Address"] =
                col1[startI]["YMC Address"] === 0 ? binaryCode.length : col1[startI]["YMC Address"];

            binaryCode = Buffer.concat([binaryCode, Buffer.from([0xb2, 0, map.get(r1)[0], map.get(r2)[0]])]);

            col1[startI]["YMC encoding"].push(formatBuffer(Buffer.from([0xb2, 0, map.get(r1)[0], map.get(r2)[0]])));
        } else if (row.startsWith("DIV ")) {
            const r1 = row.substring(4).split(", ")[0];
            const r2 = row.substring(4).split(", ")[1];
            col1[startI]["YMC Address"] =
                col1[startI]["YMC Address"] === 0 ? binaryCode.length : col1[startI]["YMC Address"];

            binaryCode = Buffer.concat([binaryCode, Buffer.from([0xb3, 0, map.get(r1)[0], map.get(r2)[0]])]);

            col1[startI]["YMC encoding"].push(formatBuffer(Buffer.from([0xb3, 0, map.get(r1)[0], map.get(r2)[0]])));
        } else if (row === "PRINT") {
            col1[startI]["YMC Address"] =
                col1[startI]["YMC Address"] === 0 ? binaryCode.length : col1[startI]["YMC Address"];

            binaryCode = Buffer.concat([binaryCode, Buffer.from([0x80, 0])]);

            col1[startI]["YMC encoding"].push(formatBuffer(Buffer.from([0x80, 0])));
        } else if (row === "PRINTN") {
            col1[startI]["YMC Address"] =
                col1[startI]["YMC Address"] === 0 ? binaryCode.length : col1[startI]["YMC Address"];

            binaryCode = Buffer.concat([binaryCode, Buffer.from([0x81, 0])]);

            col1[startI]["YMC encoding"].push(formatBuffer(Buffer.from([0x81, 0])));
        } else if (row === "PRINTV") {
            col1[startI]["YMC Address"] =
                col1[startI]["YMC Address"] === 0 ? binaryCode.length : col1[startI]["YMC Address"];

            binaryCode = Buffer.concat([binaryCode, Buffer.from([0x82, 0])]);

            col1[startI]["YMC encoding"].push(formatBuffer(Buffer.from([0x82, 0])));
        } else if (row === "EXIT") {
            binaryCode = Buffer.concat([binaryCode, Buffer.from([0x99, 0])]);
        }
    }

    for (const [key, value] of indexToJump.entries()) {
        binaryCode[key] = jumpToIndex.get(value);
    }

    return Buffer.from(binaryCode);
}

function formatBuffer(b) {
    let c = b.toString("hex").toUpperCase();
    const arr = [];
    for (let i = 0; i < c.length; i += 2) {
        arr.push(c.substring(i, i + 2));
    }
    return arr.join(" ");
}

function getRowsFromFile(fileName) {
    return fs
        .readFileSync(fileName, "utf-8")
        .trim()
        .split("\n")
        .filter((x) => x.trimEnd())
        .map((x) => {
            if (x.endsWith("\r")) {
                return x.substring(0, x.length - 1);
            }
            return x;
        });
}

function findIndex(row, x, y) {
    if (x === -1) {
        x = 0;
    }
    if (y === -1) {
        y = 0;
    }

    let first = true;
    for (let i = x; i < col1.length; i++) {
        for (let j = first ? y : 0; j < col1[i]["YMC assembly"].length; j++) {
            if (col1[i]["YMC assembly"][j] === row) {
                return [i, j];
            }
        }
        first = false;
    }
    return [-1, -1];
}

function driverMain(fullFileName) {
    const rows = getRowsFromFile(fullFileName);

    col1 = rows.map((x) => ({
        "HLC instruction": x,
        "YMC Address": 0,
        "YMC assembly": [],
        "YMC encoding": [],
        "Modified registers": new Set(),
        "Modified flags": "",
    }));

    const tokens = convertToTokens(rows);

    const assemblyCode = convertLMCtoYMC(tokens);

    const filename = fullFileName.split(".")[0];
    const assemblyFileName = `${filename}.ymc`;

    fs.writeFileSync(assemblyFileName, assemblyCode);

    const binaryFileName = `${filename}.bymc`;

    const binaryCode = convertYMCtoBinary(assemblyFileName);

    fs.writeFileSync(binaryFileName, binaryCode);

    const csvFileName = `${filename}.csv`;

    const csv = objectToCsv(
        col1.map((x) => ({
            ...x,
            // "YMC Address": x["YMC Address"],
            "YMC assembly": `"${x["YMC assembly"].join("\\n")}"`,
            "YMC encoding": `"${x["YMC encoding"].join("\\n")}"`,
            "Modified registers": Array.from(x["Modified registers"]).join(" "),
        }))
    );

    fs.writeFileSync(csvFileName, csv);

    console.log("Assembly, Binary, and CSV files have been generated...");
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

    driverMain(fullFileName);
})();
