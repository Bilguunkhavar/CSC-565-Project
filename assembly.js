const fs = require("fs");
const subProcess = require("child_process");

function isCharNumber(c) {
    return c >= "0" && c <= "9";
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

    // console.log({filename: fullFileName})

    const rows = fs
        .readFileSync(fullFileName, "utf-8")
        .trim()
        .split("\n")
        .filter((x) => x);

    // console.log(rows);

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

    console.log(tokens);

    let printVariableIndex = 0;
    let ifIndex = 0;
    const variables = [];
    let currentBlock = [];
    const mainBlock = [];
    const labelBlock = [];

    let i = 0;
    while (i < tokens.length) {
        const action = tokens[i];
        if (action === "END") {
            currentBlock.push(`jmp userIf${ifIndex}Rest`);
            labelBlock.push(currentBlock.join("\n\t"));
            currentBlock = [];
            ifIndex++;
        } else if (action === "USIG" || action === "SIG") {
            const vars = tokens[i + 1].split(" ");

            for (const v of vars) {
                variables.push(`user${v}: DQ 0`);
            }
            i++;
        } else if (action === "SET") {
            const name = tokens[i + 1];
            const first = tokens[i + 2];

            if (isCharNumber(first[0])) {
                currentBlock.push(`MOV RAX, ${first}`);
            } else {
                currentBlock.push(`MOV RAX, [user${first}]`);
            }

            let p = i + 3;

            while (tokens[p] !== "END") {
                const t = tokens[p];

                if (isCharNumber(tokens[p + 1][0])) {
                    currentBlock.push(`MOV RBX, ${tokens[p + 1]}`);
                } else {
                    currentBlock.push(`MOV RBX, [user${tokens[p + 1]}]`);
                }

                if (t === "ADD") {
                    currentBlock.push("ADD RAX, RBX");
                } else if (t === "SUB") {
                    currentBlock.push("SUB RAX, RBX");
                } else if (t === "MULT") {
                    currentBlock.push("IMUL RAX, RBX");
                } else if (t === "DIV") {
                    currentBlock.push("MOV RDX, 0");
                    currentBlock.push("DIV RBX");
                }
                p += 2;
            }
            currentBlock.push(`MOV qword[user${name}], RAX`);

            i = p;
        } else if (action === "PRINT") {
            const p = tokens[i + 1];
            if (p.startsWith(`"`)) {
                currentBlock.push("MOV rax, 0x1");
                currentBlock.push("MOV rdi, 0x1");
                currentBlock.push(`MOV rsi, print${printVariableIndex}`);
                currentBlock.push(`MOV rdx, print${printVariableIndex}length`);
                currentBlock.push("SYSCALL");

                variables.push(`print${printVariableIndex}: DB ${p}, 0xA`);
                variables.push(`print${printVariableIndex}length: EQU $ - print${printVariableIndex}`);
                printVariableIndex++;
            } else if (isCharNumber(p[0])) {
                currentBlock.push(`MOV rax, ${p}`);
                currentBlock.push("CALL _printRAX");
            } else {
                currentBlock.push(`MOV rax, [user${p}]`);
                currentBlock.push("CALL _printRAX");
            }
            i++;
        } else if (action === "IF") {
            statementOpen = true;
            const s = tokens[i + 1];
            const l = tokens[i + 2];
            const r = tokens[i + 3];
            if (isCharNumber(l[0])) {
                currentBlock.push(`MOV rax, ${l}`);
            } else {
                currentBlock.push(`MOV rax, [user${l}]`);
            }

            if (isCharNumber(r[0])) {
                currentBlock.push(`MOV rbx, ${r}`);
            } else {
                currentBlock.push(`MOV rbx, [user${r}]`);
            }

            currentBlock.push("CMP rax, rbx");

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
        }
        i++;
    }

    mainBlock.push(currentBlock.join("\n\t"));

    // for (let i = 0; i < rows.length; i++) {
    //     if (rows[i].startsWith('print ')) {
    //         const printString = rows[i].substring(6);

    //         mainCode.push('MOV rax, 0x1')
    //         mainCode.push('MOV rdi, 0x1')
    //         mainCode.push(`MOV rsi, print${printVariableIndex}`)
    //         mainCode.push(`MOV rdx, print${printVariableIndex}length`)
    //         mainCode.push('SYSCALL')

    //         printVariables.push(`print${printVariableIndex}: DB ${printString}, 0xA`)
    //         printVariables.push(`print${printVariableIndex}length: EQU $ - print${printVariableIndex}`)
    //         printVariableIndex++;
    //     }
    // }

    const assemblyCode = `
section .bss
    digitSpace resb 100
    digitSpacePos resb 8

section .text
    global _start


_start:
${"\t" + mainBlock.join("\n\t")}
    MOV rax, 60
    MOV rdi, 0
    SYSCALL

${labelBlock.join("\n\t")}

_printRAX:
    mov rcx, digitSpace
    mov rbx, 10
    mov [rcx], rbx
    inc rcx
    mov [digitSpacePos], rcx
 
_printRAXLoop:
    mov rdx, 0
    mov rbx, 10
    div rbx
    push rax
    add rdx, 48
 
    mov rcx, [digitSpacePos]
    mov [rcx], dl
    inc rcx
    mov [digitSpacePos], rcx
    
    pop rax
    cmp rax, 0
    jne _printRAXLoop
 
_printRAXLoop2:
    mov rcx, [digitSpacePos]
 
    mov rax, 1
    mov rdi, 1
    mov rsi, rcx
    mov rdx, 1
    syscall
 
    mov rcx, [digitSpacePos]
    dec rcx
    mov [digitSpacePos], rcx
 
    cmp rcx, digitSpace
    jge _printRAXLoop2
 
    ret

section .data
${"\t" + variables.join("\n\t")}


`;
    const filename = fullFileName.split(".")[0];
    const assemblyFileName = `${filename}.asm`;
    const oFileName = `${filename}.o`;

    fs.writeFileSync(assemblyFileName, assemblyCode);

    subProcess.exec(
        `nasm -felf64 ${assemblyFileName} && ld ${oFileName} -o ${filename} && ./${filename}`,
        (err, stdout, stderr) => {
            if (err) {
                console.error(err);
                process.exit(1);
            } else if (stderr) {
                console.log(`The stderr Buffer from shell: \n${stderr.toString()}`);
            } else {
                console.log(`${stdout.toString()}`);
            }
        }
    );
})();
